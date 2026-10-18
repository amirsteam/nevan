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
  googleAuthValidator,
  twoFactorVerifyValidator,
  twoFactorSetupValidator,
  twoFactorEnableValidator,
  twoFactorCodeValidator,
  twoFactorReplaceValidator,
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
  googleLimiter,
  registerLimiter,
  forgotPasswordLimiter,
  resetCodeLimiter,
  twoFactorLimiter,
} from "../config/rateLimit";

const router = express.Router();

// Public routes
router.post("/register", registerLimiter, registerValidator, authController.register);
router.post("/login", loginLimiter, loginValidator, authController.login);
router.post("/google", googleLimiter, googleAuthValidator, authController.googleAuth);
router.post("/refresh-token", authController.refreshToken);
router.post("/logout", optionalAuth, authController.logout);

// Two-step login for admins: finishing a sign-in (public, needs the sign-in challenge)
router.post("/2fa/verify", twoFactorLimiter, twoFactorVerifyValidator, authController.verifyTwoFactor);
router.post("/2fa/setup", twoFactorLimiter, twoFactorSetupValidator, authController.setupTwoFactor);
router.post("/2fa/enable", twoFactorLimiter, twoFactorEnableValidator, authController.enableTwoFactor);

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

// Two-step login settings (signed-in admin)
router.get("/2fa", authController.getTwoFactorStatus);
router.post("/2fa/backup-codes", twoFactorLimiter, twoFactorCodeValidator, authController.regenerateBackupCodes);
router.post("/2fa/replace", twoFactorLimiter, twoFactorReplaceValidator, authController.replaceTwoFactor);
router.delete("/2fa/devices", authController.forgetTrustedDevices);

// Push notification token management
router.post("/push-token", authController.registerPushToken);
router.delete("/push-token", authController.unregisterPushToken);

export default router;
