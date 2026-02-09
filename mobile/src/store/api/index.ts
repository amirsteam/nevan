/**
 * RTK Query API Index
 * Re-exports all API endpoints and hooks
 */
export { baseApi, tagTypes } from "./baseApi";
export {
  productsApi,
  useGetProductsQuery,
  useGetFeaturedProductsQuery,
  useGetProductQuery,
  useSearchProductsQuery,
  useGetCategoriesQuery,
  useGetCategoryQuery,
  useGetCategoryProductsQuery,
  useLazyGetProductsQuery,
  useLazySearchProductsQuery,
} from "./productsApi";
export type { ProductQueryParams } from "./productsApi";

export {
  ordersApi,
  useGetMyOrdersQuery,
  useGetOrderQuery,
  useCreateOrderMutation,
  useCancelOrderMutation,
  useGetPaymentMethodsQuery,
  useInitiatePaymentMutation,
  useVerifyPaymentMutation,
  useLazyGetMyOrdersQuery,
  useLazyGetOrderQuery,
} from "./ordersApi";

export {
  cartApi,
  useGetCartQuery,
  useAddToCartMutation,
  useUpdateCartItemMutation,
  useRemoveFromCartMutation,
  useClearCartMutation,
  useLazyGetCartQuery,
} from "./cartApi";

export {
  wishlistApi,
  useGetWishlistQuery,
  useAddToWishlistMutation,
  useRemoveFromWishlistMutation,
  useCheckWishlistItemQuery,
  useClearWishlistMutation,
} from "./wishlistApi";

export {
  notificationsApi,
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  useDeleteNotificationMutation,
} from "./notificationsApi";
export type { INotification } from "./notificationsApi";
