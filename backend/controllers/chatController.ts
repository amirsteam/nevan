/**
 * Chat Controller
 * Handles HTTP requests for chat features (file uploads, etc.)
 */
import { Request, Response, NextFunction } from "express";
import AppError from "../utils/AppError";

/**
 * Upload chat attachment (the image URL is then sent in a chat message)
 * @route POST /api/v1/chat/upload
 * @access Private
 */
export const uploadChatAttachment = (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) {
        return next(new AppError("No image uploaded", 400));
    }

    // Cloudinary storage puts the hosted URL in req.file.path
    const url = (req.file as any).path as string;

    res.status(200).json({
        status: "success",
        data: { url, type: "image" },
        // Kept for older app versions that read these top-level fields
        success: true,
        url,
        type: "image",
    });
};
