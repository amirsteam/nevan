/**
 * Auth Service
 * Handles authentication business logic
 * Separates auth logic from HTTP handling
 */
import crypto from "crypto";
import bcrypt from "bcrypt";
import validator from "validator";
import User, { IUser, IRefreshSession } from "../models/User";
import {
  generateTokenPair,
  verifyRefreshToken,
  hashToken,
  getTokenExpiry,
  generateTwoFactorChallenge,
  verifyTwoFactorChallenge,
  SIGN_IN_WITH_TWO_FACTOR,
  type TwoFactorPurpose,
} from "../utils/tokenUtils";
import * as twoFactor from "./twoFactorService";
import AppError from "../utils/AppError";
import { sendPasswordResetEmail } from "../utils/email";
import { verifyGoogleIdToken } from "../utils/googleAuth";
import { disconnectUserSockets } from "../config/socketRegistry";

// Max concurrent logged-in devices per user; the oldest session is dropped first
const MAX_SESSIONS = 5;
// A rotated refresh token stays valid briefly so parallel refresh calls don't log the user out
const ROTATION_GRACE_MS = 60 * 1000;
// Wrong reset codes allowed before the code is invalidated
const MAX_RESET_ATTEMPTS = 5;
// Compared against when no password exists, so response time doesn't reveal registered emails
const DUMMY_PASSWORD_HASH = bcrypt.hashSync(crypto.randomBytes(16).toString("hex"), 10);
const MAX_NAME_LENGTH = 100;

interface UserRegistrationData {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface AuthResult {
  user: IUser;
  tokens: TokenPair;
}

interface GoogleAuthResult extends AuthResult {
  isNewUser: boolean;
  // The account's unverified password was removed when Google was linked
  passwordRemoved: boolean;
}

/** Password (or Google) accepted; an admin must still finish two-step login */
export interface TwoFactorPending {
  twoFactor: { purpose: TwoFactorPurpose; challengeToken: string };
}

/** Where a sign-in comes from (the controller knows) */
export interface SignInContext {
  // Browsers send an Origin header; the mobile app doesn't
  browser: boolean;
  // "Remember this browser" cookie, when present
  trustedDeviceToken?: string;
}

/** A finished two-step sign-in, plus a remembered-browser cookie when asked for */
export interface TwoFactorSignIn extends AuthResult {
  trustedDevice?: { token: string; expiresAt: Date };
  // Only right after setup (shown once)
  backupCodes?: string[];
  backupCodesLeft: number;
}

const MOBILE_ADMIN_MESSAGE =
  "Admin accounts use two-step login. Sign in on the website (nevanhandicraft.com.np) for admin work.";

/**
 * Issue a token pair and record its refresh session on the user (caller saves).
 * Expired sessions are pruned and only the newest MAX_SESSIONS are kept.
 * `mfa` marks a session that passed two-step login (required for admins).
 */
const startSession = (user: IUser, { mfa = false }: { mfa?: boolean } = {}): TokenPair => {
  const tokens = generateTokenPair(user, { mfa });
  const now = Date.now();

  const sessions: IRefreshSession[] = (user.refreshSessions || []).filter(
    (s) => new Date(s.expiresAt).getTime() > now,
  );
  sessions.push({
    tokenHash: hashToken(tokens.refreshToken),
    expiresAt: getTokenExpiry(tokens.refreshToken),
    createdAt: new Date(),
    ...(mfa && { mfa: true }),
  });

  user.refreshSessions = sessions.slice(-MAX_SESSIONS);
  return tokens;
};

/**
 * After the password (or Google): customers get their session; admins finish
 * two-step login first (a remembered browser skips the code). The mobile app
 * has no two-step screens yet, so admins are sent to the website.
 */
const secondStep = async (user: IUser, ctx: SignInContext): Promise<AuthResult | TwoFactorPending> => {
  if (user.role !== "admin") {
    const tokens = startSession(user);
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });
    return { user, tokens };
  }

  if (!ctx.browser) throw new AppError(MOBILE_ADMIN_MESSAGE, 403);
  if (!twoFactor.isTwoFactorConfigured()) {
    throw new AppError(
      "Two-step login isn't set up on this server yet (TWO_FACTOR_KEY). Admin sign-in is paused until it is.",
      503,
    );
  }

  if (twoFactor.isTrustedDevice(user, ctx.trustedDeviceToken)) {
    const tokens = startSession(user, { mfa: true });
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });
    return { user, tokens };
  }

  const purpose: TwoFactorPurpose = user.twoFactorEnabled ? "verify" : "setup";
  return {
    twoFactor: {
      purpose,
      challengeToken: generateTwoFactorChallenge({
        userId: String(user._id),
        purpose,
        ver: user.twoFactor?.version || 0,
      }),
    },
  };
};

/**
 * Register a new user
 */
const registerUser = async (
  userData: UserRegistrationData,
): Promise<AuthResult> => {
  const { name, email, password, phone } = userData;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError("Email already registered", 400);
  }

  // Create user
  const user = await User.create({
    name,
    email,
    password,
    phone,
  });

  // Generate tokens and record the session (secrets are left out of the JSON by the model)
  const tokens = startSession(user);
  await user.save({ validateBeforeSave: false });

  return { user, tokens };
};

/**
 * Login user
 */
const loginUser = async (
  email: string,
  password: string,
  ctx: SignInContext = { browser: true },
): Promise<AuthResult | TwoFactorPending> => {
  // Find user with password field
  if (typeof email !== "string" || typeof password !== "string") {
    throw new AppError("Invalid email or password", 401);
  }

  const user = await User.findOne({ email }).select(
    "+password +refreshSessions +twoFactor",
  );

  // Unknown emails and Google-only accounts still pay for a bcrypt comparison
  const passwordMatches = user?.password
    ? await user.comparePassword(password)
    : (await bcrypt.compare(password, DUMMY_PASSWORD_HASH), false);

  if (!user || !passwordMatches) {
    throw new AppError("Invalid email or password", 401);
  }

  if (!user.isActive) {
    throw new AppError("Your account has been deactivated", 401);
  }

  // Tokens, session and last login (admins: after two-step login)
  return secondStep(user, ctx);
};

/**
 * Find the account for a Google identity, linking or creating it as needed.
 *
 * Registration doesn't verify emails, so someone may have registered this
 * address before its owner signs in with Google. Linking such an unverified
 * account removes its password and ends its sessions, so whoever set that
 * password loses access. Admin accounts are never linked automatically.
 */
const findOrCreateGoogleUser = async (profile: {
  sub: string;
  email: string;
  name?: string;
}): Promise<{
  user: IUser;
  isNewUser: boolean;
  passwordRemoved: boolean;
  sessionsRevoked: boolean;
}> => {
  // Same normalization express-validator applies on register/login
  const email = validator.normalizeEmail(profile.email) || profile.email.toLowerCase();

  const byGoogleId = await User.findOne({ googleId: profile.sub }).select("+refreshSessions +twoFactor");
  if (byGoogleId) {
    return { user: byGoogleId, isNewUser: false, passwordRemoved: false, sessionsRevoked: false };
  }

  const byEmail = await User.findOne({ email }).select(
    "+password +refreshSessions +resetPasswordToken +resetPasswordExpires",
  );

  if (byEmail) {
    if (byEmail.role === "admin") {
      throw new AppError("Admin accounts sign in with email and password", 409);
    }
    if (byEmail.googleId) {
      // Linked to a different Google account with the same address
      throw new AppError("This email is linked to another Google account", 409);
    }

    byEmail.googleId = profile.sub;
    if (byEmail.emailVerified) {
      return { user: byEmail, isNewUser: false, passwordRemoved: false, sessionsRevoked: false };
    }

    const passwordRemoved = !!byEmail.password;
    byEmail.password = undefined;
    byEmail.resetPasswordToken = undefined;
    byEmail.resetPasswordExpires = undefined;
    byEmail.refreshSessions = [];
    byEmail.emailVerified = true;
    return { user: byEmail, isNewUser: false, passwordRemoved, sessionsRevoked: true };
  }

  const name = (profile.name?.trim() || email.split("@")[0]).slice(0, MAX_NAME_LENGTH);
  const user = new User({ name, email, googleId: profile.sub, emailVerified: true });
  return { user, isNewUser: true, passwordRemoved: false, sessionsRevoked: false };
};

/**
 * Sign in (or sign up) with a Google ID token from the web or mobile app
 */
const googleSignIn = async (
  idToken: string,
  ctx: SignInContext = { browser: true },
): Promise<GoogleAuthResult | TwoFactorPending> => {
  const profile = await verifyGoogleIdToken(idToken);

  const attempt = async (): Promise<GoogleAuthResult | TwoFactorPending> => {
    const { user, isNewUser, passwordRemoved, sessionsRevoked } =
      await findOrCreateGoogleUser(profile);

    if (!user.isActive) {
      throw new AppError("Your account has been deactivated", 401);
    }

    // An admin linked to Google (before becoming admin) still needs two-step login
    if (user.role === "admin") {
      const result = await secondStep(user, ctx);
      return "twoFactor" in result ? result : { ...result, isNewUser: false, passwordRemoved: false };
    }

    const tokens = startSession(user);
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: isNewUser });
    if (sessionsRevoked) disconnectUserSockets(String(user._id));

    return { user, tokens, isNewUser, passwordRemoved };
  };

  try {
    return await attempt();
  } catch (error: any) {
    // Two first-time sign-ins raced on the unique email/googleId index: the account exists now
    if (error?.code === 11000) return attempt();
    throw error;
  }
};

/**
 * Logout user - ends the session of the given refresh token,
 * or every session when no token is provided
 */
const logoutUser = async (
  userId: string,
  refreshToken?: string,
): Promise<void> => {
  if (refreshToken) {
    await User.findByIdAndUpdate(userId, {
      $pull: { refreshSessions: { tokenHash: hashToken(refreshToken) } },
    });
  } else {
    await User.findByIdAndUpdate(userId, { refreshSessions: [] });
    // "Sign out everywhere" also forgets remembered browsers
    await User.updateOne(
      { _id: userId, twoFactor: { $exists: true } },
      { $set: { "twoFactor.trustedDevices": [] } },
    );
    disconnectUserSockets(String(userId));
  }
};

/**
 * End the session belonging to a refresh token (no-op for invalid tokens)
 */
const revokeRefreshToken = async (refreshToken: string): Promise<void> => {
  let decoded: any;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    return;
  }
  await logoutUser(decoded.userId, refreshToken);
};

/**
 * Refresh access token using refresh token (rotates the refresh token)
 */
const refreshAccessToken = async (refreshToken: string): Promise<TokenPair> => {
  if (!refreshToken || typeof refreshToken !== "string") {
    throw new AppError("Refresh token is required", 401);
  }

  try {
    // Verify refresh token signature and expiry
    const decoded = verifyRefreshToken(refreshToken);

    const user = await User.findById(decoded.userId).select("+refreshSessions");

    if (!user) {
      throw new AppError("User not found", 401);
    }

    if (!user.isActive) {
      throw new AppError("Your account has been deactivated", 401);
    }

    // The token must belong to a live session (revoked by logout / password change otherwise)
    const tokenHash = hashToken(refreshToken);
    const now = Date.now();
    const session = (user.refreshSessions || []).find(
      (s) => s.tokenHash === tokenHash && new Date(s.expiresAt).getTime() > now,
    );

    if (!session) {
      throw new AppError("Invalid refresh token", 401);
    }

    // Admin sessions from before two-step login (or from before becoming admin) end here
    if (user.role === "admin" && !session.mfa) {
      user.refreshSessions = (user.refreshSessions || []).filter((s) => s.tokenHash !== tokenHash);
      await user.save({ validateBeforeSave: false });
      throw new AppError(SIGN_IN_WITH_TWO_FACTOR, 401);
    }

    // Rotate: the old token expires after a short grace period
    const graceExpiry = new Date(now + ROTATION_GRACE_MS);
    if (new Date(session.expiresAt) > graceExpiry) {
      session.expiresAt = graceExpiry;
    }
    const tokens = startSession(user, { mfa: !!session.mfa });
    await user.save({ validateBeforeSave: false });

    return tokens;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("Invalid refresh token", 401);
  }
};

/**
 * Change user password. Every other session ends; the device that made the
 * change gets a fresh session (its old access token stops working).
 */
const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ message: string; tokens: TokenPair }> => {
  const user = await User.findById(userId).select("+password +refreshSessions +twoFactor");

  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (!user.password) {
    throw new AppError(
      "Your account doesn't have a password yet. Use Forgot password to set one.",
      400,
    );
  }

  // 400, not 401: a 401 would make clients treat it as an expired session and refresh
  if (!(await user.comparePassword(currentPassword))) {
    throw new AppError("Current password is incorrect", 400);
  }

  user.password = newPassword;
  user.refreshSessions = []; // Invalidate all sessions
  if (user.twoFactor) twoFactor.forgetDevices(user);
  // This device passed two-step login to get here (protect refuses admins without it)
  const tokens = startSession(user, { mfa: user.role === "admin" });
  await user.save();
  disconnectUserSockets(String(user._id));

  return { message: "Password changed successfully", tokens };
};

/**
 * Register push notification token for a user
 * Limits to 5 tokens per user (oldest removed first)
 */
const registerPushToken = async (
  userId: string,
  token: string,
  platform: "ios" | "android" | "web",
  deviceName?: string,
): Promise<void> => {
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  // Check if token already exists for this user
  const existingTokenIndex = user.pushTokens.findIndex(
    (pt) => pt.token === token,
  );

  if (existingTokenIndex >= 0) {
    // Update existing token
    user.pushTokens[existingTokenIndex] = {
      token,
      platform,
      deviceName,
      createdAt: new Date(),
    };
  } else {
    // Enforce max 5 tokens per user — remove oldest if at limit
    const MAX_TOKENS = 5;
    if (user.pushTokens.length >= MAX_TOKENS) {
      // Sort by createdAt ascending and remove the oldest
      user.pushTokens.sort(
        (a, b) => (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0),
      );
      user.pushTokens.splice(0, user.pushTokens.length - MAX_TOKENS + 1);
    }

    // Add new token
    user.pushTokens.push({
      token,
      platform,
      deviceName,
      createdAt: new Date(),
    });
  }

  await user.save({ validateBeforeSave: false });
};

/**
 * Unregister push notification token for a user
 */
const unregisterPushToken = async (
  userId: string,
  token: string,
): Promise<void> => {
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  // Remove token
  user.pushTokens = user.pushTokens.filter((pt) => pt.token !== token);
  await user.save({ validateBeforeSave: false });
};

/**
 * Get all push tokens for a user (useful for sending notifications)
 */
const getUserPushTokens = async (
  userId: string,
): Promise<Array<{ token: string; platform: string }>> => {
  const user = await User.findById(userId);

  if (!user) {
    return [];
  }

  return user.pushTokens.map((pt) => ({
    token: pt.token,
    platform: pt.platform,
  }));
};

const RESET_SENT_MESSAGE =
  "If an account with that email exists, we've sent a reset code.";

/**
 * Forgot password - generate a 6-digit code and email it.
 * The response is the same whether or not the account exists.
 * Outside production the code is also returned to ease local testing.
 */
const forgotPassword = async (
  email: string,
): Promise<{ message: string; otp?: string }> => {
  const user = await User.findOne({ email });

  if (!user || !user.isActive) {
    return { message: RESET_SENT_MESSAGE };
  }

  const otp = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  try {
    await sendPasswordResetEmail(user.email, user.name, otp);
  } catch (error) {
    // Don't leave a code that was never delivered
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save({ validateBeforeSave: false });
    console.error("Password reset email failed:", error);
    throw new AppError(
      "Could not send the reset code right now. Please try again later.",
      503,
    );
  }

  return {
    message: RESET_SENT_MESSAGE,
    otp: process.env.NODE_ENV === "development" ? otp : undefined,
  };
};

/**
 * Check a reset code for a user. Wrong guesses are counted; after
 * MAX_RESET_ATTEMPTS the code is invalidated and a new one must be requested.
 */
const checkResetCode = async (
  email: string,
  otp: string,
  extraFields = "",
): Promise<IUser> => {
  if (typeof email !== "string" || typeof otp !== "string") {
    throw new AppError("Invalid or expired reset code", 400);
  }

  const user = await User.findOne({ email }).select(
    `+resetPasswordToken +resetPasswordExpires +resetPasswordAttempts ${extraFields}`,
  );

  if (
    !user ||
    !user.resetPasswordToken ||
    !user.resetPasswordExpires ||
    user.resetPasswordExpires.getTime() <= Date.now()
  ) {
    throw new AppError("Invalid or expired reset code", 400);
  }

  const expected = Buffer.from(user.resetPasswordToken, "hex");
  const actual = crypto.createHash("sha256").update(otp.trim()).digest();
  const matches =
    expected.length === actual.length && crypto.timingSafeEqual(expected, actual);

  if (!matches) {
    const attempts = (user.resetPasswordAttempts || 0) + 1;
    if (attempts >= MAX_RESET_ATTEMPTS) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      user.resetPasswordAttempts = 0;
      await user.save({ validateBeforeSave: false });
      throw new AppError(
        "Too many incorrect attempts. Please request a new reset code.",
        400,
      );
    }
    user.resetPasswordAttempts = attempts;
    await user.save({ validateBeforeSave: false });
    throw new AppError("Invalid or expired reset code", 400);
  }

  return user;
};

/**
 * Verify reset OTP
 */
const verifyResetOTP = async (
  email: string,
  otp: string,
): Promise<{ valid: boolean }> => {
  await checkResetCode(email, otp);
  return { valid: true };
};

/**
 * Reset password with OTP
 */
const resetPassword = async (
  email: string,
  otp: string,
  newPassword: string,
): Promise<{ message: string }> => {
  const user = await checkResetCode(email, otp, "+password +refreshSessions +twoFactor");

  // Update password; the emailed code proves the user owns the address
  user.password = newPassword;
  user.emailVerified = true;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  user.resetPasswordAttempts = 0;
  user.refreshSessions = []; // Invalidate all sessions
  // Two-step login stays on (the email alone must not be enough); remembered browsers are forgotten
  if (user.twoFactor) twoFactor.forgetDevices(user);
  await user.save();
  disconnectUserSockets(String(user._id));

  return {
    message:
      "Password reset successfully. Please login with your new password.",
  };
};

// ==================== Two-step login (admins) ====================

const TWO_FACTOR_FIELDS = "+refreshSessions +twoFactor";
const WRONG_CODE = "That code didn't work. Check the time on your phone and try the newest code.";

/** The admin a sign-in challenge belongs to, if it is still current */
const challengedUser = async (challengeToken: unknown, purpose: TwoFactorPurpose): Promise<IUser> => {
  let challenge;
  try {
    challenge = verifyTwoFactorChallenge(String(challengeToken || ""));
  } catch {
    throw new AppError("This sign-in has expired. Enter your email and password again.", 401);
  }
  if (challenge.purpose !== purpose) throw new AppError("Enter your email and password again.", 401);

  const user = await User.findById(challenge.userId).select(TWO_FACTOR_FIELDS);
  if (!user || !user.isActive || user.role !== "admin") {
    throw new AppError("This sign-in has expired. Enter your email and password again.", 401);
  }
  // Say "locked" before "expired": a lock also retires the challenges issued before it
  twoFactor.assertNotLocked(user);
  if ((user.twoFactor?.version || 0) !== challenge.ver) {
    throw new AppError("This sign-in has expired. Enter your email and password again.", 401);
  }
  // Setup only while two-step login is off; verification only while it is on
  if ((purpose === "setup") === !!user.twoFactorEnabled) {
    throw new AppError("Enter your email and password again.", 401);
  }
  return user;
};

/** Count a wrong code, save, and answer (400, not 401: a 401 makes clients refresh) */
const wrongCode = async (user: IUser): Promise<never> => {
  twoFactor.recordFailure(user);
  await user.save({ validateBeforeSave: false });
  twoFactor.assertNotLocked(user);
  throw new AppError(WRONG_CODE, 400);
};

const finishTwoFactorSignIn = async (
  user: IUser,
  options: { rememberDevice?: boolean; deviceLabel?: string; backupCodes?: string[] },
): Promise<TwoFactorSignIn> => {
  const tokens = startSession(user, { mfa: true });
  const trustedDevice = options.rememberDevice ? twoFactor.trustDevice(user, options.deviceLabel) : undefined;
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });
  return {
    user,
    tokens,
    trustedDevice,
    backupCodes: options.backupCodes,
    backupCodesLeft: user.twoFactor?.backupCodes.length || 0,
  };
};

/** Second step of an admin sign-in: an authenticator code or a backup code */
const verifyTwoFactorSignIn = async (input: {
  challengeToken: string;
  code?: string;
  backupCode?: string;
  rememberDevice?: boolean;
  deviceLabel?: string;
}): Promise<TwoFactorSignIn> => {
  const user = await challengedUser(input.challengeToken, "verify");
  const ok = input.backupCode
    ? twoFactor.useBackupCode(user, input.backupCode)
    : twoFactor.checkCode(user, input.code);
  if (!ok) return wrongCode(user);
  return finishTwoFactorSignIn(user, input);
};

/** First sign-in of an admin without two-step login: a new authenticator to scan */
const startTwoFactorSetup = async (challengeToken: string) => {
  const user = await challengedUser(challengeToken, "setup");
  const setup = await twoFactor.beginSetup(user);
  await user.save({ validateBeforeSave: false });
  return setup;
};

/** Confirm the new authenticator with its first code: two-step login is on, signed in */
const enableTwoFactor = async (input: {
  challengeToken: string;
  code: string;
  rememberDevice?: boolean;
  deviceLabel?: string;
}): Promise<TwoFactorSignIn> => {
  const user = await challengedUser(input.challengeToken, "setup");
  if (!user.twoFactor?.pendingSecret) throw new AppError("Scan the QR code first", 400);
  if (!twoFactor.checkPendingCode(user, input.code)) return wrongCode(user);
  twoFactor.adoptPendingSecret(user);
  const backupCodes = twoFactor.issueBackupCodes(user);
  return finishTwoFactorSignIn(user, { ...input, backupCodes });
};

/** A signed-in admin's own account, with its two-step details */
const signedInAdmin = async (userId: string): Promise<IUser> => {
  const user = await User.findById(userId).select(TWO_FACTOR_FIELDS);
  if (!user) throw new AppError("User not found", 404);
  if (user.role !== "admin" || !user.twoFactorEnabled) {
    throw new AppError("Two-step login is for admin accounts", 403);
  }
  twoFactor.assertNotLocked(user);
  return user;
};

/** Admin Security page: confirm with a current code first */
const requireCurrentCode = async (user: IUser, code: unknown): Promise<void> => {
  if (!twoFactor.checkCode(user, code)) await wrongCode(user);
};

const getTwoFactorStatus = async (userId: string) => {
  const user = await User.findById(userId).select("+twoFactor");
  if (!user) throw new AppError("User not found", 404);
  return twoFactor.statusOf(user);
};

const regenerateBackupCodes = async (userId: string, code: string): Promise<string[]> => {
  const user = await signedInAdmin(userId);
  await requireCurrentCode(user, code);
  const codes = twoFactor.issueBackupCodes(user);
  await user.save({ validateBeforeSave: false });
  return codes;
};

/** Moving to a new phone, step 1: a current code, then a new QR code */
const beginTwoFactorReplace = async (userId: string, code: string) => {
  const user = await signedInAdmin(userId);
  await requireCurrentCode(user, code);
  const setup = await twoFactor.beginSetup(user);
  await user.save({ validateBeforeSave: false });
  return setup;
};

/** Step 2: the new app's first code. Other sessions and remembered browsers end. */
const confirmTwoFactorReplace = async (
  userId: string,
  code: string,
  currentRefreshToken?: string,
): Promise<void> => {
  const user = await signedInAdmin(userId);
  if (!user.twoFactor?.pendingSecret) throw new AppError("Start again: scan the new QR code first", 400);
  if (!twoFactor.checkPendingCode(user, code)) await wrongCode(user);
  twoFactor.adoptPendingSecret(user);
  twoFactor.forgetDevices(user);
  // Keep only this browser's session: whoever had the old phone is signed out
  const keep = currentRefreshToken ? hashToken(currentRefreshToken) : null;
  user.refreshSessions = (user.refreshSessions || []).filter((s) => s.tokenHash === keep);
  await user.save({ validateBeforeSave: false });
};

const forgetRememberedBrowsers = async (userId: string): Promise<void> => {
  const user = await User.findById(userId).select("+twoFactor");
  if (!user) throw new AppError("User not found", 404);
  if (user.twoFactor) {
    twoFactor.forgetDevices(user);
    await user.save({ validateBeforeSave: false });
  }
};

/**
 * Another admin lost their phone and backup codes: turn their two-step login
 * off and sign them out; they set it up again at their next sign-in.
 */
const resetTwoFactorFor = async (actingAdminId: string, targetId: string): Promise<IUser> => {
  if (String(actingAdminId) === String(targetId)) {
    throw new AppError("Ask another admin to reset your two-step login", 409);
  }
  const user = await User.findById(targetId).select(TWO_FACTOR_FIELDS);
  if (!user) throw new AppError("User not found", 404);
  twoFactor.resetState(user);
  user.refreshSessions = [];
  await user.save({ validateBeforeSave: false });
  disconnectUserSockets(String(user._id));
  return user;
};

export {
  verifyTwoFactorSignIn,
  startTwoFactorSetup,
  enableTwoFactor,
  getTwoFactorStatus,
  regenerateBackupCodes,
  beginTwoFactorReplace,
  confirmTwoFactorReplace,
  forgetRememberedBrowsers,
  resetTwoFactorFor,
};

export {
  registerUser,
  loginUser,
  googleSignIn,
  logoutUser,
  revokeRefreshToken,
  refreshAccessToken,
  changePassword,
  registerPushToken,
  unregisterPushToken,
  getUserPushTokens,
  forgotPassword,
  verifyResetOTP,
  resetPassword,
};
