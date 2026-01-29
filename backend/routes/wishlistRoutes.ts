/**
 * Wishlist Routes
 * API endpoints for user wishlist management
 */
import { Router } from "express";
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  checkWishlist,
  clearWishlist,
} from "../controllers/wishlistController";
import { protect } from "../middleware/auth";

const router = Router();

// All routes require authentication
router.use(protect);

// GET /api/v1/wishlist - Get user's wishlist
router.get("/", getWishlist);

// POST /api/v1/wishlist/:productId - Add product to wishlist
router.post("/:productId", addToWishlist);

// DELETE /api/v1/wishlist/:productId - Remove product from wishlist
router.delete("/:productId", removeFromWishlist);

// GET /api/v1/wishlist/:productId/check - Check if product is in wishlist
router.get("/:productId/check", checkWishlist);

// DELETE /api/v1/wishlist - Clear entire wishlist
router.delete("/", clearWishlist);

export default router;
