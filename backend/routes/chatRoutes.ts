/**
 * Chat Routes
 * API endpoints for chat features
 */
import express from "express";
import { protect } from "../middleware/auth";
import { uploadChatImage } from "../config/cloudinary";
import { uploadChatAttachment } from "../controllers/chatController";

const router = express.Router();

// Upload image attachment
router.post(
    "/upload",
    protect,
    uploadChatImage.single("image"),
    uploadChatAttachment
);

export default router;
