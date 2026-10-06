/**
 * Chat Routes
 * API endpoints for chat features (realtime messaging is Socket.IO, see config/socket.ts)
 */
import express from "express";
import { body } from "express-validator";
import { uploadChatImage } from "../config/cloudinary";
import { uploadChatAttachment, createGuestSession, chatUploadAuth } from "../controllers/chatController";
import { handleValidationErrors } from "../middleware/validate";
import { guestChatLimiter, chatUploadLimiter } from "../config/rateLimit";

const router = express.Router();

// Anonymous visitors: get a guest token to chat without an account
router.post(
    "/guest-session",
    guestChatLimiter,
    body("name")
        .isString()
        .withMessage("Please tell us your name")
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage("Name must be 1-50 characters"),
    body("email")
        .optional({ values: "falsy" })
        .trim()
        .isEmail()
        .withMessage("Please enter a valid email address")
        .normalizeEmail(),
    handleValidationErrors,
    createGuestSession,
);

// Upload image attachment (signed-in users and chat guests)
router.post(
    "/upload",
    chatUploadLimiter,
    chatUploadAuth,
    uploadChatImage.single("image"),
    uploadChatAttachment,
);

export default router;
