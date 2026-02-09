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
import { Platform } from "react-native";
import { getItem, setItem, deleteItem } from "../../utils/storage";
import { NGROK_URL, LOCAL_IP } from "../../utils/config";
import type { RootState } from "../index";

// Get base URL based on environment
// For tunnel mode, set NGROK_URL in src/utils/config.ts
const getBaseUrl = (): string => {
  // @ts-ignore - __DEV__ is a React Native global
  if (!__DEV__) {
    return "https://backend.nevanhandicraft.com.np/api/v1";
  }

  // Use ngrok URL if configured (set in config.ts)
  if (NGROK_URL) {
    return `${NGROK_URL}/api/v1`;
  }

  if (Platform.OS === "web") return "http://localhost:5000/api/v1";
  if (Platform.OS === "android") return `http://${LOCAL_IP}:5000/api/v1`;
  return `http://${LOCAL_IP}:5000/api/v1`; // iOS
};

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
    // Try to refresh the token
    const refreshToken = await getItem("refreshToken");

    if (refreshToken) {
      const refreshResult = await baseQuery(
        {
          url: "/auth/refresh-token",
          method: "POST",
          body: { refreshToken },
        },
        api,
        extraOptions,
      );

      if (refreshResult.data) {
        const data = refreshResult.data as {
          accessToken: string;
          refreshToken: string;
        };
        // Store new tokens
        await setItem("accessToken", data.accessToken);
        await setItem("refreshToken", data.refreshToken);

        // Retry the original request
        result = await baseQuery(args, api, extraOptions);
      } else {
        // Refresh failed - clear tokens
        await deleteItem("accessToken");
        await deleteItem("refreshToken");
      }
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
