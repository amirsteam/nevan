/**
 * Auth Service
 * Handles authentication business logic
 * Separates auth logic from HTTP handling
 */
import crypto from "crypto";
import User, { IUser } from "../models/User";
import { generateTokenPair, verifyRefreshToken } from "../utils/tokenUtils";
import AppError from "../utils/AppError";

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

  // Generate tokens
  const tokens = generateTokenPair(user);

  // Save refresh token to user
  (user as any).refreshToken = tokens.refreshToken;
  await (user as any).save({ validateBeforeSave: false });

  // Remove sensitive fields
  (user as any).password = undefined;
  (user as any).refreshToken = undefined;

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
  const user = await User.findOne({ email }).select("+password +refreshToken");

  if (!user || !(await user.comparePassword(password))) {
    throw new AppError("Invalid email or password", 401);
  }

  if (!user.isActive) {
    throw new AppError("Your account has been deactivated", 401);
  }

  // Generate new tokens
  const tokens = generateTokenPair(user);

  // Update refresh token and last login
  (user as any).refreshToken = tokens.refreshToken;
  (user as any).lastLogin = new Date();
  await (user as any).save({ validateBeforeSave: false });

  // Remove sensitive fields
  (user as any).password = undefined;
  (user as any).refreshToken = undefined;

  return { user, tokens };
};

/**
 * Logout user - Invalidates refresh token
 */
const logoutUser = async (userId: string): Promise<void> => {
  await User.findByIdAndUpdate(userId, { refreshToken: null });
};

/**
 * Refresh access token using refresh token
 */
const refreshAccessToken = async (refreshToken: string): Promise<TokenPair> => {
  if (!refreshToken) {
    throw new AppError("Refresh token is required", 400);
  }

  try {
    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Find user with stored refresh token
    const user = await User.findById(decoded.userId).select("+refreshToken");

    if (!user) {
      throw new AppError("User not found", 401);
    }

    if (!user.isActive) {
      throw new AppError("Your account has been deactivated", 401);
    }

    // Verify stored refresh token matches
    if ((user as any).refreshToken !== refreshToken) {
      throw new AppError("Invalid refresh token", 401);
    }

    // Generate new token pair (rotate refresh token for security)
    const tokens = generateTokenPair(user);

    // Update stored refresh token
    (user as any).refreshToken = tokens.refreshToken;
    await (user as any).save({ validateBeforeSave: false });

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
  const user = await User.findById(userId).select("+password");

  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (!(await user.comparePassword(currentPassword))) {
    throw new AppError("Current password is incorrect", 401);
  }

  (user as any).password = newPassword;
  (user as any).refreshToken = null; // Invalidate all sessions
  await user.save();

  return { message: "Password changed successfully" };
};

/**
 * Register push notification token for a user
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

/**
 * Forgot password - Generate and return OTP
 * In production, this would send an email/SMS with the OTP
 */
const forgotPassword = async (
  email: string,
): Promise<{ message: string; otp?: string }> => {
  const user = await User.findOne({ email });

  if (!user) {
    // Don't reveal if email exists for security
    throw new AppError(
      "If an account with that email exists, we've sent a reset code.",
      200,
    );
  }

  if (!user.isActive) {
    throw new AppError("Your account has been deactivated", 401);
  }

  // Generate OTP
  const otp = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // In production, you would send this via email/SMS
  // For development/testing, we return the OTP
  // TODO: Integrate with email service (nodemailer, sendgrid, etc.)

  return {
    message: "Password reset code sent to your email",
    otp: process.env.NODE_ENV === "development" ? otp : undefined,
  };
};

/**
 * Verify reset OTP
 */
const verifyResetOTP = async (
  email: string,
  otp: string,
): Promise<{ valid: boolean }> => {
  const hashedOTP = crypto.createHash("sha256").update(otp).digest("hex");

  const user = await User.findOne({
    email,
    resetPasswordToken: hashedOTP,
    resetPasswordExpires: { $gt: Date.now() },
  }).select("+resetPasswordToken +resetPasswordExpires");

  if (!user) {
    throw new AppError("Invalid or expired reset code", 400);
  }

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
  const hashedOTP = crypto.createHash("sha256").update(otp).digest("hex");

  const user = await User.findOne({
    email,
    resetPasswordToken: hashedOTP,
    resetPasswordExpires: { $gt: Date.now() },
  }).select("+resetPasswordToken +resetPasswordExpires +password");

  if (!user) {
    throw new AppError("Invalid or expired reset code", 400);
  }

  // Update password
  (user as any).password = newPassword;
  (user as any).resetPasswordToken = undefined;
  (user as any).resetPasswordExpires = undefined;
  (user as any).refreshToken = null; // Invalidate all sessions
  await user.save();

  return {
    message:
      "Password reset successfully. Please login with your new password.",
  };
};

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changePassword,
  registerPushToken,
  unregisterPushToken,
  getUserPushTokens,
  forgotPassword,
  verifyResetOTP,
  resetPassword,
};
