/**
 * Review Routes (nested under products)
 * GET  /api/v1/products/:productId/reviews       - public
 * POST /api/v1/products/:productId/reviews       - auth required
 * DELETE /api/v1/products/:productId/reviews/:reviewId - auth required
 */
import { Router } from "express";
import {
  getProductReviews,
  createReview,
  deleteReview,
} from "../controllers/reviewController";
import { protect } from "../middleware/auth";
import { createReviewValidator } from "../middleware/validate";

const router = Router({ mergeParams: true });

// Public
router.get("/", getProductReviews);

// Protected
router.post("/", protect, createReviewValidator, createReview);
router.delete("/:reviewId", protect, deleteReview);

export default router;
