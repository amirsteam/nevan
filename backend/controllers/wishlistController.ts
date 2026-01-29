/**
 * Wishlist Controller
 * Handles user wishlist operations
 */
import { Request, Response, NextFunction, RequestHandler } from "express";
import User from "../models/User";
import Product from "../models/Product";
import AppError from "../utils/AppError";
import asyncHandler from "../utils/asyncHandler";
import type { IProduct } from "@shared/types";

// Get user's wishlist
export const getWishlist: RequestHandler = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?._id;

    const user = await User.findById(userId).populate({
      path: "wishlist",
      select: "name slug price images stock status variants",
    });

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    res.status(200).json({
      success: true,
      data: {
        wishlist: user.wishlist || [],
      },
    });
  },
);

// Add product to wishlist
export const addToWishlist: RequestHandler = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?._id;
    const { productId } = req.params;

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return next(new AppError("Product not found", 404));
    }

    const user = await User.findById(userId);
    if (!user) {
      return next(new AppError("User not found", 404));
    }

    // Check if already in wishlist
    const isInWishlist = user.wishlist?.some(
      (id) => id.toString() === productId,
    );

    if (isInWishlist) {
      return res.status(200).json({
        success: true,
        message: "Product already in wishlist",
        data: { wishlist: user.wishlist },
      });
    }

    // Add to wishlist
    user.wishlist = user.wishlist || [];
    user.wishlist.push(product._id);
    await user.save();

    // Populate the wishlist for response
    await user.populate({
      path: "wishlist",
      select: "name slug price images stock status variants",
    });

    res.status(200).json({
      success: true,
      message: "Product added to wishlist",
      data: {
        wishlist: user.wishlist,
      },
    });
  },
);

// Remove product from wishlist
export const removeFromWishlist: RequestHandler = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?._id;
    const { productId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return next(new AppError("User not found", 404));
    }

    // Filter out the product
    user.wishlist = (user.wishlist || []).filter(
      (id) => id.toString() !== productId,
    );
    await user.save();

    // Populate the wishlist for response
    await user.populate({
      path: "wishlist",
      select: "name slug price images stock status variants",
    });

    res.status(200).json({
      success: true,
      message: "Product removed from wishlist",
      data: {
        wishlist: user.wishlist,
      },
    });
  },
);

// Check if product is in wishlist
export const checkWishlist: RequestHandler = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?._id;
    const { productId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return next(new AppError("User not found", 404));
    }

    const isInWishlist = (user.wishlist || []).some(
      (id) => id.toString() === productId,
    );

    res.status(200).json({
      success: true,
      data: {
        isInWishlist,
      },
    });
  },
);

// Clear entire wishlist
export const clearWishlist: RequestHandler = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?._id;

    const user = await User.findById(userId);
    if (!user) {
      return next(new AppError("User not found", 404));
    }

    user.wishlist = [];
    await user.save();

    res.status(200).json({
      success: true,
      message: "Wishlist cleared",
      data: {
        wishlist: [],
      },
    });
  },
);
