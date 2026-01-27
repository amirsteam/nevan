/**
 * Cart API
 * API calls for cart operations
 */
import api from "./axios";
import type { IApiResponse, ICart } from "@shared/types";

interface VariantDetails {
  size: string;
  color: string;
}

export const cartAPI = {
  getCart: async (): Promise<IApiResponse<{ cart: ICart }>> => {
    const response = await api.get("/cart");
    return response.data;
  },

  addToCart: async (
    productId: string,
    quantity: number = 1,
    variantId: string | null = null,
    variantDetails: VariantDetails | null = null,
  ): Promise<IApiResponse<{ cart: ICart }>> => {
    const response = await api.post("/cart/items", {
      productId,
      quantity,
      variantId,
      variantDetails,
    });
    return response.data;
  },

  updateCartItem: async (
    itemId: string,
    quantity: number,
  ): Promise<IApiResponse<{ cart: ICart }>> => {
    const response = await api.put(`/cart/items/${itemId}`, { quantity });
    return response.data;
  },

  removeFromCart: async (
    itemId: string,
  ): Promise<IApiResponse<{ cart: ICart }>> => {
    const response = await api.delete(`/cart/items/${itemId}`);
    return response.data;
  },

  clearCart: async (): Promise<IApiResponse<{ cart: ICart }>> => {
    const response = await api.delete("/cart");
    return response.data;
  },
};

export default cartAPI;
