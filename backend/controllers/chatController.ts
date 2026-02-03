/**
 * Chat Controller
 * Handles HTTP requests for chat features (file uploads, etc.)
 */
import { Request, Response, NextFunction } from "express";
// @ts-ignore
import AppError from "../middleware/errorHandler";

/**
 * Upload chat attachment
 * @route POST /api/v1/chat/upload
 * @access Private
 */
export const uploadChatAttachment = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        if (!req.file) {
            if (req.body.error) {
                // Error passed from multer filter
                return next(new AppError(req.body.error, 400));
            }
            return next(new AppError("No file uploaded", 400));
        }

        // Cloudinary storage automatically provided the URL in req.file.path
        res.status(200).json({
            success: true,
            url: (req.file as any).path, // Cloudinary adds path
            filename: req.file.filename,
            type: "image",
        });
    } catch (error) {
        next(error);
    }
};
