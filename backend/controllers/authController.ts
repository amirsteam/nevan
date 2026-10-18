/**
 * Auth Controller
 * Handles HTTP requests for authentication
 * Delegates business logic to authService
 */
import { Request, Response, CookieOptions } from "express";
import * as authService from "../services/authService";
import asyncHandler from "../utils/asyncHandler";
import { getTokenExpiry } from "../utils/tokenUtils";

/*
 * Refresh-token transport
 * - Browsers get the refresh token only as an httpOnly cookie scoped to /api/v1/auth,
 *   so page scripts (and any XSS) can never read it.
 * - Native apps (React Native sends no Origin header) can't use cookies reliably,
 *   so they keep receiving it in the JSON body and send it back in the body.
 */
const REFRESH_COOKIE = "refreshToken";

const refreshCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/api/v1/auth",
});

const isBrowserRequest = (req: Request): boolean => !!req.headers.origin;

const sendAuthTokens = (
  req: Request,
  res: Response,
  tokens: { accessToken: string; refreshToken: string },
): { accessToken: string; refreshToken?: string } => {
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
    ...refreshCookieOptions(),
    expires: getTokenExpiry(tokens.refreshToken),
  });

  return isBrowserRequest(req)
    ? { accessToken: tokens.accessToken }
    : { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
};

/*
 * "Remember this browser" (admins' two-step login): a random token in an
 * httpOnly cookie, only ever sent to /api/v1/auth. Only its hash is stored.
 */
const TRUSTED_DEVICE_COOKIE = "trustedDevice";

const signInContext = (req: Request): authService.SignInContext => {
  const trusted = req.cookies?.[TRUSTED_DEVICE_COOKIE];
  return {
    browser: isBrowserRequest(req),
    trustedDeviceToken: typeof trusted === "string" ? trusted : undefined,
  };
};

/** Short browser label for the remembered-browsers list */
const deviceLabel = (req: Request): string | undefined => {
  const agent = req.headers["user-agent"] || "";
  const browser = /Edg\//.test(agent) ? "Edge" : /Firefox\//.test(agent) ? "Firefox" : /Chrome\//.test(agent) ? "Chrome" : /Safari\//.test(agent) ? "Safari" : "Browser";
  const system = /Android/.test(agent) ? "Android" : /iPhone|iPad/.test(agent) ? "iOS" : /Windows/.test(agent) ? "Windows" : /Mac OS X/.test(agent) ? "macOS" : /Linux/.test(agent) ? "Linux" : "";
  return system ? `${browser} on ${system}` : browser;
};

/** Answer for an admin who still has to finish two-step login (no tokens yet) */
const sendTwoFactorPending = (res: Response, pending: authService.TwoFactorPending) => {
  const setup = pending.twoFactor.purpose === "setup";
  res.status(200).json({
    status: "success",
    message: setup
      ? "Set up two-step login to continue"
      : "Enter the code from your authenticator app",
    data: {
      ...(setup ? { twoFactorSetupRequired: true } : { twoFactorRequired: true }),
      challengeToken: pending.twoFactor.challengeToken,
    },
  });
};

/** A finished two-step sign-in: session cookie, optional remembered-browser cookie */
const sendTwoFactorSignIn = (req: Request, res: Response, result: authService.TwoFactorSignIn) => {
  if (result.trustedDevice) {
    res.cookie(TRUSTED_DEVICE_COOKIE, result.trustedDevice.token, {
      ...refreshCookieOptions(),
      expires: result.trustedDevice.expiresAt,
    });
  }
  res.status(200).json({
    status: "success",
    message: "Login successful",
    data: {
      user: result.user,
      ...sendAuthTokens(req, res, result.tokens),
      backupCodesLeft: result.backupCodesLeft,
      ...(result.backupCodes && { backupCodes: result.backupCodes }),
    },
  });
};

const getRequestRefreshToken = (req: Request): string | undefined => {
  const fromBody = req.body?.refreshToken;
  if (typeof fromBody === "string" && fromBody) return fromBody;
  const fromCookie = req.cookies?.[REFRESH_COOKIE];
  return typeof fromCookie === "string" && fromCookie ? fromCookie : undefined;
};

/**
 * @desc    Register new user
 * @route   POST /api/v1/auth/register
 * @access  Public
 */
const register = asyncHandler(async (req: Request, res: Response) => {
  const { user, tokens } = await authService.registerUser(req.body);

  res.status(201).json({
    status: "success",
    message: "Registration successful",
    data: {
      user,
      ...sendAuthTokens(req, res, tokens),
    },
  });
});

/**
 * @desc    Login user
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const result = await authService.loginUser(email, password, signInContext(req));
  if ("twoFactor" in result) return sendTwoFactorPending(res, result);
  const { user, tokens } = result;

  res.status(200).json({
    status: "success",
    message: "Login successful",
    data: {
      user,
      ...sendAuthTokens(req, res, tokens),
    },
  });
});

/**
 * @desc    Sign in or sign up with a Google ID token (web and mobile)
 * @route   POST /api/v1/auth/google
 * @access  Public
 */
const googleAuth = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.googleSignIn(req.body.idToken, signInContext(req));
  if ("twoFactor" in result) return sendTwoFactorPending(res, result);
  const { user, tokens, isNewUser, passwordRemoved } = result;

  res.status(isNewUser ? 201 : 200).json({
    status: "success",
    message: isNewUser ? "Registration successful" : "Login successful",
    data: {
      user,
      ...sendAuthTokens(req, res, tokens),
      isNewUser,
      ...(passwordRemoved && { passwordRemoved: true }),
    },
  });
});

/**
 * @desc    Logout user (ends this device's session; { allDevices: true } ends all)
 * @route   POST /api/v1/auth/logout
 * @access  Public (uses the refresh token; access token optional)
 */
const logout = asyncHandler(async (req: Request, res: Response) => {
  const token = getRequestRefreshToken(req);

  if (req.user && req.body?.allDevices) {
    await authService.logoutUser((req.user as any)._id);
  } else if (token) {
    await authService.revokeRefreshToken(token);
  }

  res.clearCookie(REFRESH_COOKIE, refreshCookieOptions());
  res.status(200).json({
    status: "success",
    message: "Logout successful",
  });
});

/**
 * @desc    Refresh access token (cookie for browsers, body for native apps)
 * @route   POST /api/v1/auth/refresh-token
 * @access  Public (requires refresh token)
 */
const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  try {
    const tokens = await authService.refreshAccessToken(
      getRequestRefreshToken(req) as string,
    );

    res.status(200).json({
      status: "success",
      data: sendAuthTokens(req, res, tokens),
    });
  } catch (error) {
    res.clearCookie(REFRESH_COOKIE, refreshCookieOptions());
    throw error;
  }
});

/**
 * @desc    Get current user profile
 * @route   GET /api/v1/auth/me
 * @access  Private
 */
const getMe = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json({
    status: "success",
    data: {
      user: req.user,
    },
  });
});

/**
 * @desc    Change password (ends other sessions; returns a fresh session for this device)
 * @route   PUT /api/v1/auth/change-password
 * @access  Private
 */
const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  if (req.user) {
    const result = await authService.changePassword(
      (req.user as any)._id,
      currentPassword,
      newPassword,
    );

    res.status(200).json({
      status: "success",
      message: result.message,
      data: sendAuthTokens(req, res, result.tokens),
    });
  }
});

/**
 * @desc    Register push notification token
 * @route   POST /api/v1/auth/push-token
 * @access  Private
 */
const registerPushToken = asyncHandler(async (req: Request, res: Response) => {
  const { token, platform, deviceName } = req.body;

  if (!token || !platform) {
    res.status(400).json({
      status: "error",
      message: "Token and platform are required",
    });
    return;
  }

  // Validate token format (Expo push tokens)
  if (
    typeof token !== "string" ||
    !token.startsWith("ExponentPushToken[") ||
    !token.endsWith("]") ||
    token.length > 100
  ) {
    res.status(400).json({
      status: "error",
      message: "Invalid push token format",
    });
    return;
  }

  // Validate platform
  if (!["ios", "android", "web"].includes(platform)) {
    res.status(400).json({
      status: "error",
      message: "Platform must be ios, android, or web",
    });
    return;
  }

  if (req.user) {
    await authService.registerPushToken(
      (req.user as any)._id,
      token,
      platform,
      deviceName,
    );

    res.status(200).json({
      status: "success",
      message: "Push token registered successfully",
    });
  }
});

/**
 * @desc    Unregister push notification token
 * @route   DELETE /api/v1/auth/push-token
 * @access  Private
 */
const unregisterPushToken = asyncHandler(
  async (req: Request, res: Response) => {
    const { token } = req.body;

    if (!token) {
      res.status(400).json({
        status: "error",
        message: "Token is required",
      });
      return;
    }

    if (req.user) {
      await authService.unregisterPushToken((req.user as any)._id, token);

      res.status(200).json({
        status: "success",
        message: "Push token unregistered successfully",
      });
    }
  },
);

/**
 * @desc    Forgot password - request reset OTP
 * @route   POST /api/v1/auth/forgot-password
 * @access  Public
 */
const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  const result = await authService.forgotPassword(email);

  res.status(200).json({
    status: "success",
    message: result.message,
    // Only include OTP in development for testing
    ...(result.otp && { data: { otp: result.otp } }),
  });
});

/**
 * @desc    Verify reset OTP
 * @route   POST /api/v1/auth/verify-reset-otp
 * @access  Public
 */
const verifyResetOTP = asyncHandler(async (req: Request, res: Response) => {
  const { email, otp } = req.body;
  const result = await authService.verifyResetOTP(email, otp);

  res.status(200).json({
    status: "success",
    message: "OTP verified successfully",
    data: result,
  });
});

/**
 * @desc    Reset password with OTP
 * @route   POST /api/v1/auth/reset-password
 * @access  Public
 */
const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email, otp, newPassword } = req.body;
  const result = await authService.resetPassword(email, otp, newPassword);

  res.status(200).json({
    status: "success",
    message: result.message,
  });
});

// ==================== Two-step login (admins) ====================

/**
 * @desc    Finish an admin sign-in with an authenticator or backup code
 * @route   POST /api/v1/auth/2fa/verify
 * @access  Public (sign-in challenge)
 */
const verifyTwoFactor = asyncHandler(async (req: Request, res: Response) => {
  const { challengeToken, code, backupCode, rememberDevice } = req.body;
  const result = await authService.verifyTwoFactorSignIn({
    challengeToken,
    code,
    backupCode,
    rememberDevice: rememberDevice === true,
    deviceLabel: deviceLabel(req),
  });
  sendTwoFactorSignIn(req, res, result);
});

/**
 * @desc    First admin sign-in: a new authenticator to scan (QR code and key)
 * @route   POST /api/v1/auth/2fa/setup
 * @access  Public (sign-in challenge)
 */
const setupTwoFactor = asyncHandler(async (req: Request, res: Response) => {
  const setup = await authService.startTwoFactorSetup(req.body.challengeToken);
  res.status(200).json({ status: "success", data: setup });
});

/**
 * @desc    Confirm the new authenticator's first code: two-step login is on, signed in
 * @route   POST /api/v1/auth/2fa/enable
 * @access  Public (sign-in challenge)
 */
const enableTwoFactor = asyncHandler(async (req: Request, res: Response) => {
  const { challengeToken, code, rememberDevice } = req.body;
  const result = await authService.enableTwoFactor({
    challengeToken,
    code,
    rememberDevice: rememberDevice === true,
    deviceLabel: deviceLabel(req),
  });
  sendTwoFactorSignIn(req, res, result);
});

/**
 * @desc    Two-step login status of the signed-in admin
 * @route   GET /api/v1/auth/2fa
 * @access  Private
 */
const getTwoFactorStatus = asyncHandler(async (req: Request, res: Response) => {
  const status = await authService.getTwoFactorStatus((req.user as any)._id);
  res.status(200).json({ status: "success", data: status });
});

/**
 * @desc    New backup codes (old ones stop working); needs a current code
 * @route   POST /api/v1/auth/2fa/backup-codes
 * @access  Private (admin)
 */
const regenerateBackupCodes = asyncHandler(async (req: Request, res: Response) => {
  const backupCodes = await authService.regenerateBackupCodes((req.user as any)._id, req.body.code);
  res.status(200).json({ status: "success", data: { backupCodes } });
});

/**
 * @desc    Move to a new phone: { code } (current app) → QR code; { newCode } (new app) → done
 * @route   POST /api/v1/auth/2fa/replace
 * @access  Private (admin)
 */
const replaceTwoFactor = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req.user as any)._id;
  if (req.body.newCode) {
    await authService.confirmTwoFactorReplace(userId, req.body.newCode, getRequestRefreshToken(req));
    res.clearCookie(TRUSTED_DEVICE_COOKIE, refreshCookieOptions());
    res.status(200).json({ status: "success", message: "Your new authenticator app is set up" });
    return;
  }
  const setup = await authService.beginTwoFactorReplace(userId, req.body.code);
  res.status(200).json({ status: "success", data: setup });
});

/**
 * @desc    Forget every remembered browser (each asks for a code next time)
 * @route   DELETE /api/v1/auth/2fa/devices
 * @access  Private
 */
const forgetTrustedDevices = asyncHandler(async (req: Request, res: Response) => {
  await authService.forgetRememberedBrowsers((req.user as any)._id);
  res.clearCookie(TRUSTED_DEVICE_COOKIE, refreshCookieOptions());
  res.status(200).json({ status: "success", message: "Remembered browsers forgotten" });
});

export {
  verifyTwoFactor,
  setupTwoFactor,
  enableTwoFactor,
  getTwoFactorStatus,
  regenerateBackupCodes,
  replaceTwoFactor,
  forgetTrustedDevices,
};

export {
  register,
  login,
  googleAuth,
  logout,
  refreshToken,
  getMe,
  changePassword,
  registerPushToken,
  unregisterPushToken,
  forgotPassword,
  verifyResetOTP,
  resetPassword,
};
