/**
 * Chat Controller
 * Handles HTTP requests for chat features (file uploads, etc.)
 */
import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import AppError from "../utils/AppError";
import User from "../models/User";
import { generateGuestToken, verifyAccessToken, verifyGuestToken } from "../utils/tokenUtils";

/**
 * Start an anonymous support-chat session for a website visitor
 * @route POST /api/v1/chat/guest-session
 * @access Public (rate limited)
 */
export const createGuestSession = (req: Request, res: Response) => {
    const name = String(req.body.name).trim();
    const email = req.body.email ? String(req.body.email).trim().toLowerCase() : undefined;
    const guestId = new Types.ObjectId().toString();

    res.status(201).json({
        status: "success",
        data: {
            guestToken: generateGuestToken({ guestId, name, ...(email && { email }) }),
            guest: { id: guestId, name, email },
        },
    });
};

/**
 * Allow chat uploads from signed-in users (Bearer access token) or chat guests
 * (X-Chat-Guest-Token header)
 */
export const chatUploadAuth = async (req: Request, _res: Response, next: NextFunction) => {
    const bearer = req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.slice(7)
        : undefined;
    const guestToken = req.headers["x-chat-guest-token"];

    try {
        if (bearer) {
            const decoded = verifyAccessToken(bearer);
            const user = await User.findById(decoded.userId).select("isActive");
            if (user?.isActive) return next();
        } else if (typeof guestToken === "string") {
            verifyGuestToken(guestToken);
            return next();
        }
    } catch {
        // fall through to 401
    }
    next(new AppError("Please sign in or start a chat first", 401));
};

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
