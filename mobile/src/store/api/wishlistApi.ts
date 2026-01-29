/**
 * Wishlist API Endpoints
 * RTK Query endpoints for wishlist management
 */
import { baseApi } from "./baseApi";
import type { IApiResponse, IProduct } from "@shared/types";

interface WishlistResponse {
  wishlist: IProduct[];
}

interface WishlistCheckResponse {
  isInWishlist: boolean;
}

export const wishlistApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get user's wishlist
    getWishlist: builder.query<IProduct[], void>({
      query: () => "/wishlist",
      transformResponse: (response: IApiResponse<WishlistResponse>) =>
        response.data.wishlist,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ _id }) => ({
                type: "Wishlist" as const,
                id: _id,
              })),
              { type: "Wishlist", id: "LIST" },
            ]
          : [{ type: "Wishlist", id: "LIST" }],
    }),

    // Add product to wishlist
    addToWishlist: builder.mutation<WishlistResponse, string>({
      query: (productId) => ({
        url: `/wishlist/${productId}`,
        method: "POST",
      }),
      transformResponse: (response: IApiResponse<WishlistResponse>) =>
        response.data,
      invalidatesTags: [{ type: "Wishlist", id: "LIST" }],
    }),

    // Remove product from wishlist
    removeFromWishlist: builder.mutation<WishlistResponse, string>({
      query: (productId) => ({
        url: `/wishlist/${productId}`,
        method: "DELETE",
      }),
      transformResponse: (response: IApiResponse<WishlistResponse>) =>
        response.data,
      invalidatesTags: [{ type: "Wishlist", id: "LIST" }],
    }),

    // Check if product is in wishlist
    checkWishlistItem: builder.query<boolean, string>({
      query: (productId) => `/wishlist/${productId}/check`,
      transformResponse: (response: IApiResponse<WishlistCheckResponse>) =>
        response.data.isInWishlist,
      providesTags: (result, error, productId) => [
        { type: "Wishlist", id: productId },
      ],
    }),

    // Clear entire wishlist
    clearWishlist: builder.mutation<void, void>({
      query: () => ({
        url: "/wishlist",
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Wishlist", id: "LIST" }],
    }),
  }),
});

export const {
  useGetWishlistQuery,
  useAddToWishlistMutation,
  useRemoveFromWishlistMutation,
  useCheckWishlistItemQuery,
  useClearWishlistMutation,
} = wishlistApi;
