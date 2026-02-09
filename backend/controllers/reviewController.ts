/**
 * Review Controller
 * Handles CRUD for product reviews
 */
import { Request, Response, NextFunction, RequestHandler } from "express";
import Review from "../models/Review";
import Product from "../models/Product";
import Order from "../models/Order";
import AppError from "../utils/AppError";
import asyncHandler from "../utils/asyncHandler";

/**
 * GET /api/v1/products/:productId/reviews
 * Get approved reviews for a product (public)
 */
export const getProductReviews: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { productId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const total = await Review.countDocuments({
      product: productId,
      isApproved: true,
    });

    const reviews = await Review.find({
      product: productId,
      isApproved: true,
    })
      .sort("-createdAt")
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("user", "name");

    res.status(200).json({
      status: "success",
      data: { reviews },
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
      },
    });
  },
);

/**
 * POST /api/v1/products/:productId/reviews
 * Create a review (authenticated)
 */
export const createReview: RequestHandler = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { productId } = req.params;
    const userId = req.user?._id;

    // Check product exists
    const product = await Product.findById(productId);
    if (!product) {
      return next(new AppError("Product not found", 404));
    }

    // Check if user already reviewed this product
    const existingReview = await Review.findOne({
      product: productId,
      user: userId,
    });
    if (existingReview) {
      return next(new AppError("You have already reviewed this product", 400));
    }

    // Check if user has purchased this product (verified purchase)
    const hasOrdered = await Order.exists({
      user: userId,
      "items.product": productId,
      status: { $in: ["delivered", "completed"] },
    });

    const review = await Review.create({
      product: productId,
      user: userId,
      rating: req.body.rating,
      title: req.body.title,
      comment: req.body.comment,
      isVerifiedPurchase: !!hasOrdered,
      isApproved: true, // Auto-approve; change to false for moderation
    });

    res.status(201).json({
      status: "success",
      data: { review },
    });
  },
);

/**
 * DELETE /api/v1/products/:productId/reviews/:reviewId
 * Delete own review (authenticated)
 */
export const deleteReview: RequestHandler = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { reviewId } = req.params;
    const userId = req.user?._id;

    const review = await Review.findById(reviewId);
    if (!review) {
      return next(new AppError("Review not found", 404));
    }

    // Only the review author or admin can delete
    if (
      review.user.toString() !== userId?.toString() &&
      req.user?.role !== "admin"
    ) {
      return next(
        new AppError("You are not authorized to delete this review", 403),
      );
    }

    await review.deleteOne();

    res.status(200).json({
      status: "success",
      message: "Review deleted",
    });
  },
);
