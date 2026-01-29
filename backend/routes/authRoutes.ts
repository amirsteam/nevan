/**
 * Auth Routes
 * Routes for authentication endpoints
 */
import express from "express";
import * as authController from "../controllers/authController";
import { protect } from "../middleware/auth";
import { registerValidator, loginValidator } from "../middleware/validate";

const router = express.Router();

// Public routes
router.post("/register", registerValidator, authController.register);
router.post("/login", loginValidator, authController.login);
router.post("/refresh-token", authController.refreshToken);

// Password reset routes (public)
router.post("/forgot-password", authController.forgotPassword);
router.post("/verify-reset-otp", authController.verifyResetOTP);
router.post("/reset-password", authController.resetPassword);

// Protected routes
router.use(protect); // All routes below require authentication
router.post("/logout", authController.logout);
router.get("/me", authController.getMe);
router.put("/change-password", authController.changePassword);

// Push notification token management
router.post("/push-token", authController.registerPushToken);
router.delete("/push-token", authController.unregisterPushToken);

export default router;
