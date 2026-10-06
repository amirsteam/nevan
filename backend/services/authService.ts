/**
 * Auth Service
 * Handles authentication business logic
 * Separates auth logic from HTTP handling
 */
import crypto from "crypto";
import User, { IUser, IRefreshSession } from "../models/User";
import {
  generateTokenPair,
  verifyRefreshToken,
  hashToken,
  getTokenExpiry,
} from "../utils/tokenUtils";
import AppError from "../utils/AppError";
import { sendPasswordResetEmail } from "../utils/email";
import { disconnectUserSockets } from "../config/socketRegistry";

// Max concurrent logged-in devices per user; the oldest session is dropped first
const MAX_SESSIONS = 5;
// A rotated refresh token stays valid briefly so parallel refresh calls don't log the user out
const ROTATION_GRACE_MS = 60 * 1000;
// Wrong reset codes allowed before the code is invalidated
const MAX_RESET_ATTEMPTS = 5;

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

/**
 * Issue a token pair and record its refresh session on the user (caller saves).
 * Expired sessions are pruned and only the newest MAX_SESSIONS are kept.
 */
const startSession = (user: IUser): TokenPair => {
  const tokens = generateTokenPair(user);
  const now = Date.now();

  const sessions: IRefreshSession[] = (user.refreshSessions || []).filter(
    (s) => new Date(s.expiresAt).getTime() > now,
  );
  sessions.push({
    tokenHash: hashToken(tokens.refreshToken),
    expiresAt: getTokenExpiry(tokens.refreshToken),
    createdAt: new Date(),
  });

  user.refreshSessions = sessions.slice(-MAX_SESSIONS);
  return tokens;
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

  // Generate tokens and record the session
  const tokens = startSession(user);
  await user.save({ validateBeforeSave: false });

  // Remove sensitive fields
  user.password = undefined;
  (user as any).refreshSessions = undefined;

  return { user, tokens };
};

/**
 * Login user
 */
const loginUser = async (
  email: string,
  password: string,
): Promise<AuthResult> => {
  // Find user with password field
  if (typeof email !== "string" || typeof password !== "string") {
    throw new AppError("Invalid email or password", 401);
  }

  const user = await User.findOne({ email }).select(
    "+password +refreshSessions",
  );

  if (!user || !(await user.comparePassword(password))) {
    throw new AppError("Invalid email or password", 401);
  }

  if (!user.isActive) {
    throw new AppError("Your account has been deactivated", 401);
  }

  // Generate new tokens, record the session and last login
  const tokens = startSession(user);
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  // Remove sensitive fields
  user.password = undefined;
  (user as any).refreshSessions = undefined;

  return { user, tokens };
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

    // Rotate: the old token expires after a short grace period
    const graceExpiry = new Date(now + ROTATION_GRACE_MS);
    if (new Date(session.expiresAt) > graceExpiry) {
      session.expiresAt = graceExpiry;
    }
    const tokens = startSession(user);
    await user.save({ validateBeforeSave: false });

    return tokens;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("Invalid refresh token", 401);
  }
};

/**
 * Change user password
 */
const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ message: string }> => {
  const user = await User.findById(userId).select("+password +refreshSessions");

  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (!(await user.comparePassword(currentPassword))) {
    throw new AppError("Current password is incorrect", 401);
  }

  user.password = newPassword;
  user.refreshSessions = []; // Invalidate all sessions
  await user.save();
  disconnectUserSockets(String(user._id));

  return { message: "Password changed successfully" };
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
  const user = await checkResetCode(email, otp, "+password +refreshSessions");

  // Update password
  user.password = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  user.resetPasswordAttempts = 0;
  user.refreshSessions = []; // Invalidate all sessions
  await user.save();
  disconnectUserSockets(String(user._id));

  return {
    message:
      "Password reset successfully. Please login with your new password.",
  };
};

export {
  registerUser,
  loginUser,
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
