/**
 * Wishlist API
 * Frontend API module for wishlist operations
 */
import api from "./axios";

export const wishlistAPI = {
  /**
   * Get user's wishlist
   */
  getWishlist: async () => {
    const response = await api.get("/wishlist");
    return response.data;
  },

  /**
   * Add a product to the wishlist
   */
  addToWishlist: async (productId) => {
    const response = await api.post(`/wishlist/${productId}`);
    return response.data;
  },

  /**
   * Remove a product from the wishlist
   */
  removeFromWishlist: async (productId) => {
    const response = await api.delete(`/wishlist/${productId}`);
    return response.data;
  },

  /**
   * Check if a product is in the wishlist
   */
  checkWishlist: async (productId) => {
    const response = await api.get(`/wishlist/${productId}/check`);
    return response.data;
  },

  /**
   * Clear entire wishlist
   */
  clearWishlist: async () => {
    const response = await api.delete("/wishlist");
    return response.data;
  },
};

export default wishlistAPI;
