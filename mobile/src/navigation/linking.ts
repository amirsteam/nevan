/**
 * Deep Linking Configuration
 * Handles navigation to specific screens from external URLs
 */
import { LinkingOptions } from "@react-navigation/native";
import Constants from "expo-constants";
import type { RootStackParamList } from "./types";

// Get the URL prefix for deep linking
const prefix = Constants.expoConfig?.scheme
  ? `${Constants.expoConfig.scheme}://`
  : "nevanhandicraft://";

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [
    prefix,
    "nevanhandicraft://",
    "https://nevanhandicraft.com.np",
    "https://www.nevanhandicraft.com.np",
  ],
  config: {
    screens: {
      App: {
        screens: {
          Main: {
            screens: {
              HomeTab: {
                screens: {
                  HomeScreen: "",
                  ProductList: "products",
                  ProductDetail: "product/:slug",
                  Search: "search",
                },
              },
              Cart: "cart",
              ProfileTab: {
                screens: {
                  ProfileScreen: "profile",
                  Orders: "orders",
                  OrderDetail: "order/:orderId",
                  Wishlist: "wishlist",
                  Chat: "chat",
                  Notifications: "notifications",
                },
              },
            },
          },
          Checkout: "checkout",
          Payment: "payment/:orderId",
        },
      },
      Auth: {
        screens: {
          Login: "login",
          Register: "register",
          ForgotPassword: "forgot-password",
        },
      },
    },
  },
};

/**
 * Parse a deep link URL to extract parameters
 */
export const parseDeepLink = (
  url: string,
): { screen: string; params: Record<string, string> } | null => {
  try {
    // Simple URL parsing
    const urlObj = new URL(url);
    const path = urlObj.pathname.replace(/^\//, "");

    if (path.startsWith("product/")) {
      const slug = path.replace("product/", "");
      return { screen: "ProductDetail", params: { slug } };
    }

    if (path.startsWith("order/")) {
      const orderId = path.replace("order/", "");
      return { screen: "OrderDetail", params: { orderId } };
    }

    if (path === "cart") {
      return { screen: "Cart", params: {} };
    }

    if (path === "wishlist") {
      return { screen: "Wishlist", params: {} };
    }

    return null;
  } catch {
    return null;
  }
};

/**
 * Generate a shareable URL for a product
 */
export const generateProductShareUrl = (slug: string): string => {
  return `https://nevanhandicraft.com.np/product/${slug}`;
};

/**
 * Generate a shareable URL for an order
 */
export const generateOrderShareUrl = (orderId: string): string => {
  return `https://nevanhandicraft.com.np/order/${orderId}`;
};

export default linking;
