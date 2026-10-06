/**
 * RTK Query Base API
 * Centralized API configuration with caching and automatic refetching
 */
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query";
import { getItem } from "../../utils/storage";
import { refreshTokens } from "../../api/tokenRefresh";
import { getApiUrl } from "../../utils/config";
import type { RootState } from "../index";

// Get base URL based on environment
// Dev server address comes from EXPO_PUBLIC_* env vars (see src/utils/config.ts)
const getBaseUrl = (): string => getApiUrl();

// Custom base query with auth header injection
const baseQuery = fetchBaseQuery({
  baseUrl: getBaseUrl(),
  prepareHeaders: async (headers, { getState }) => {
    // Try to get token from storage
    try {
      const token = await getItem("accessToken");
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
    } catch (error) {
      console.error("Error retrieving token for RTK Query", error);
    }
    return headers;
  },
});

// Base query with re-auth logic
const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    // Shared single-flight refresh (also used by axios and the chat socket)
    if (await refreshTokens()) {
      result = await baseQuery(args, api, extraOptions);
    }
  }

  return result;
};

// Define tag types for cache invalidation
export const tagTypes = [
  "Product",
  "Products",
  "Category",
  "Categories",
  "Cart",
  "Order",
  "Orders",
  "User",
  "Wishlist",
  "Notifications",
  "NotificationCount",
] as const;

// Create the base API
export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes,
  endpoints: () => ({}),
});

export default baseApi;
