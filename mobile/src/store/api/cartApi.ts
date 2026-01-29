/**
 * Cart API Endpoints
 * RTK Query endpoints for shopping cart operations
 */
import { baseApi } from "./baseApi";
import type { IApiResponse, ICart } from "@shared/types";

interface VariantDetails {
  size: string;
  color: string;
}

interface AddToCartParams {
  productId: string;
  quantity?: number;
  variantId?: string | null;
  variantDetails?: VariantDetails | null;
}

interface UpdateCartItemParams {
  itemId: string;
  quantity: number;
}

export const cartApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get current cart
    getCart: builder.query<ICart, void>({
      query: () => "/cart",
      transformResponse: (response: IApiResponse<{ cart: ICart }>) =>
        response.data.cart,
      providesTags: ["Cart"],
    }),

    // Add item to cart
    addToCart: builder.mutation<ICart, AddToCartParams>({
      query: ({ productId, quantity = 1, variantId, variantDetails }) => ({
        url: "/cart/items",
        method: "POST",
        body: { productId, quantity, variantId, variantDetails },
      }),
      transformResponse: (response: IApiResponse<{ cart: ICart }>) =>
        response.data.cart,
      invalidatesTags: ["Cart"],
    }),

    // Update cart item quantity
    updateCartItem: builder.mutation<ICart, UpdateCartItemParams>({
      query: ({ itemId, quantity }) => ({
        url: `/cart/items/${itemId}`,
        method: "PUT",
        body: { quantity },
      }),
      transformResponse: (response: IApiResponse<{ cart: ICart }>) =>
        response.data.cart,
      invalidatesTags: ["Cart"],
    }),

    // Remove item from cart
    removeFromCart: builder.mutation<ICart, string>({
      query: (itemId) => ({
        url: `/cart/items/${itemId}`,
        method: "DELETE",
      }),
      transformResponse: (response: IApiResponse<{ cart: ICart }>) =>
        response.data.cart,
      invalidatesTags: ["Cart"],
    }),

    // Clear entire cart
    clearCart: builder.mutation<ICart, void>({
      query: () => ({
        url: "/cart",
        method: "DELETE",
      }),
      transformResponse: (response: IApiResponse<{ cart: ICart }>) =>
        response.data.cart,
      invalidatesTags: ["Cart"],
    }),
  }),
  overrideExisting: false,
});

// Export hooks
export const {
  useGetCartQuery,
  useAddToCartMutation,
  useUpdateCartItemMutation,
  useRemoveFromCartMutation,
  useClearCartMutation,
  // Lazy query
  useLazyGetCartQuery,
} = cartApi;
