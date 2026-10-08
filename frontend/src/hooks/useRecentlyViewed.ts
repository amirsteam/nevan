/**
 * Ids of recently viewed products (newest first), updated live; see
 * utils/recentlyViewed.ts
 */
import { useSyncExternalStore } from "react";
import { getRecentlyViewed, getServerRecentlyViewed, subscribeRecentlyViewed } from "../utils/recentlyViewed";

export const useRecentlyViewed = (): string[] =>
  useSyncExternalStore(subscribeRecentlyViewed, getRecentlyViewed, getServerRecentlyViewed);
