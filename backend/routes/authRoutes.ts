/**
 * Auth Routes
 * Routes for authentication endpoints
 */
import express from "express";
import * as authController from "../controllers/authController";
import { protect, optionalAuth } from "../middleware/auth";
import {
  registerValidator,
  loginValidator,
  forgotPasswordValidator,
  verifyResetOtpValidator,
  resetPasswordValidator,
  changePasswordValidator,
} from "../middleware/validate";
import {
  loginLimiter,
  registerLimiter,
  forgotPasswordLimiter,
  resetCodeLimiter,
} from "../config/rateLimit";

const router = express.Router();

// Public routes
router.post("/register", registerLimiter, registerValidator, authController.register);
router.post("/login", loginLimiter, loginValidator, authController.login);
router.post("/refresh-token", authController.refreshToken);
router.post("/logout", optionalAuth, authController.logout);

// Password reset routes (public)
router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  forgotPasswordValidator,
  authController.forgotPassword,
);
router.post(
  "/verify-reset-otp",
  resetCodeLimiter,
  verifyResetOtpValidator,
  authController.verifyResetOTP,
);
router.post(
  "/reset-password",
  resetCodeLimiter,
  resetPasswordValidator,
  authController.resetPassword,
);

// Protected routes
router.use(protect); // All routes below require authentication
router.get("/me", authController.getMe);
router.put("/change-password", changePasswordValidator, authController.changePassword);

// Push notification token management
router.post("/push-token", authController.registerPushToken);
router.delete("/push-token", authController.unregisterPushToken);

export default router;
