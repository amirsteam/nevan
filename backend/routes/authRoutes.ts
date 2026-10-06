/**
 * Auth Routes
 * Routes for authentication endpoints
 */
import express from "express";
import * as authController from "../controllers/authController";
import * as accountController from "../controllers/accountController";
import { protect, optionalAuth } from "../middleware/auth";
import {
  registerValidator,
  loginValidator,
  forgotPasswordValidator,
  verifyResetOtpValidator,
  resetPasswordValidator,
  changePasswordValidator,
  updateProfileValidator,
  createAddressValidator,
  updateAddressValidator,
  mongoIdValidator,
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
router.put("/me", updateProfileValidator, accountController.updateProfile);

// Address book
router.get("/addresses", accountController.getAddresses);
router.post("/addresses", createAddressValidator, accountController.addAddress);
router.put("/addresses/:addressId", mongoIdValidator("addressId"), updateAddressValidator, accountController.updateAddress);
router.delete("/addresses/:addressId", mongoIdValidator("addressId"), accountController.deleteAddress);
router.put("/change-password", changePasswordValidator, authController.changePassword);

// Push notification token management
router.post("/push-token", authController.registerPushToken);
router.delete("/push-token", authController.unregisterPushToken);

export default router;
