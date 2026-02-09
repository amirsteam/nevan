/**
 * Auth Controller
 * Handles HTTP requests for authentication
 * Delegates business logic to authService
 */
import { Request, Response } from "express";
import * as authService from "../services/authService";
import asyncHandler from "../utils/asyncHandler";

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
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
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
  const { user, tokens } = await authService.loginUser(email, password);

  res.status(200).json({
    status: "success",
    message: "Login successful",
    data: {
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    },
  });
});

/**
 * @desc    Logout user
 * @route   POST /api/v1/auth/logout
 * @access  Private
 */
const logout = asyncHandler(async (req: Request, res: Response) => {
  if (req.user) {
    await authService.logoutUser((req.user as any)._id);
  }

  res.status(200).json({
    status: "success",
    message: "Logout successful",
  });
});

/**
 * @desc    Refresh access token
 * @route   POST /api/v1/auth/refresh-token
 * @access  Public (requires refresh token)
 */
const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  const tokens = await authService.refreshAccessToken(refreshToken);

  res.status(200).json({
    status: "success",
    data: {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    },
  });
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
 * @desc    Change password
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

  if (!email) {
    res.status(400).json({
      status: "error",
      message: "Email is required",
    });
    return;
  }

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

  if (!email || !otp) {
    res.status(400).json({
      status: "error",
      message: "Email and OTP are required",
    });
    return;
  }

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

  if (!email || !otp || !newPassword) {
    res.status(400).json({
      status: "error",
      message: "Email, OTP, and new password are required",
    });
    return;
  }

  const result = await authService.resetPassword(email, otp, newPassword);

  res.status(200).json({
    status: "success",
    message: result.message,
  });
});

export {
  register,
  login,
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
