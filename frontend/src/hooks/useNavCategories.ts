/**
 * Top-level categories for the header's shop menu and the mobile menu.
 * Fetched the first time a menu opens (not on every page load) and shared by
 * both menus for the rest of the visit.
 */
import { useEffect, useState } from "react";
import { categoriesAPI } from "../api";
import type { ICategory } from "../types";

let cached: ICategory[] | null = null;
let pending: Promise<ICategory[]> | null = null;

const loadCategories = (): Promise<ICategory[]> => {
  if (!pending) {
    pending = categoriesAPI
      .getCategories()
      .then((res) => (cached = res.data?.categories || []))
      .catch(() => {
        // Try again next time a menu opens
        pending = null;
        return [];
      });
  }
  return pending;
};

export const useNavCategories = (enabled: boolean): ICategory[] => {
  const [categories, setCategories] = useState<ICategory[]>([]);

  useEffect(() => {
    if (!enabled || cached) return;
    let cancelled = false;
    loadCategories().then((list) => !cancelled && setCategories(list));
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return cached ?? categories;
};
