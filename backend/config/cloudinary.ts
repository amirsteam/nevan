/**
 * Cloudinary Configuration
 * Handles image upload, optimization, and delivery
 *
 * Features used:
 * - Automatic format optimization (f_auto)
 * - Quality optimization (q_auto)
 * - Responsive transformations
 */
import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
// @ts-ignore
import multer from "multer";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // Use HTTPS
});

/**
 * Storage configuration for product images
 * - Stored in 'bivanhandicraft/products' folder
 * - Automatically optimized for web delivery
 */
const productStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "bivanhandicraft/products",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [
      { width: 1200, height: 1200, crop: "limit" }, // Max dimensions
      { quality: "auto", fetch_format: "auto" }, // Auto optimize
    ],
  } as any,
});

/**
 * Storage configuration for user avatars
 * - Stored in 'bivanhandicraft/avatars' folder
 * - Cropped to square with face detection
 */
const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "bivanhandicraft/avatars",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [
      { width: 300, height: 300, crop: "fill", gravity: "face" },
      { quality: "auto", fetch_format: "auto" },
    ],
  } as any,
});

/**
 * Storage configuration for category images
 */
const categoryStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "bivanhandicraft/categories",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [
      { width: 800, height: 600, crop: "fill" },
      { quality: "auto", fetch_format: "auto" },
    ],
  } as any,
});

/**
 * Storage configuration for chat images
 */
const chatStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "bivanhandicraft/chat",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [
      { width: 1000, height: 1000, crop: "limit" },
      { quality: "auto", fetch_format: "auto" },
    ],
  } as any,
});

// Multer upload instances
const uploadProductImages = multer({
  storage: productStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req: any, file: any, cb: any) => {
    // Check file type
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"), false);
    }
    cb(null, true);
  },
});

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
});

const uploadCategoryImage = multer({
  storage: categoryStorage,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB limit
});

const uploadChatImage = multer({
  storage: chatStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req: any, file: any, cb: any) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"), false);
    }
    cb(null, true);
  },
});

/**
 * Delete image from Cloudinary by public ID
 * @param publicId - The public ID of the image
 */
const deleteImage = async (publicId: string): Promise<UploadApiResponse> => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    throw error;
  }
};

interface OptimizationOptions {
  quality?: string;
  fetch_format?: string;
  [key: string]: any;
}

/**
 * Get optimized URL for an image
 * Uses Cloudinary's automatic optimization features
 * @param publicId - The public ID of the image
 * @param options - Transformation options
 */
const getOptimizedUrl = (
  publicId: string,
  options: OptimizationOptions = {},
): string => {
  const defaultOptions: OptimizationOptions = {
    quality: "auto",
    fetch_format: "auto",
    ...options,
  };
  return cloudinary.url(publicId, defaultOptions);
};

export {
  cloudinary,
  uploadProductImages,
  uploadAvatar,
  uploadCategoryImage,
  uploadChatImage,
  deleteImage,
  getOptimizedUrl,
};
