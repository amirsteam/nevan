/**
 * Utility Functions
 * Common helper functions for the frontend
 */

import type { IShippingSettings, OrderStatus, PaymentStatus } from "../types";
import { FREE_SHIPPING_THRESHOLD } from "@shared/store";

/**
 * Format price in NPR
 */
export const formatPrice = (amount: number | null | undefined): string => {
  return new Intl.NumberFormat("en-NP", {
    style: "currency",
    currency: "NPR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount ?? 0);
};

/**
 * Format date
 */
export const formatDate = (date: string | Date): string => {
  return new Intl.DateTimeFormat("en-NP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
};

/**
 * Format date with time
 */
export const formatDateTime = (date: string | Date): string => {
  return new Intl.DateTimeFormat("en-NP", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
};

/**
 * Truncate text to a maximum length
 */
export const truncate = (
  text: string | undefined | null,
  maxLength: number = 100,
): string => {
  if (!text || text.length <= maxLength) return text || "";
  return text.slice(0, maxLength).trim() + "...";
};

/**
 * Get order status badge color
 */
export const getStatusColor = (status: OrderStatus): string => {
  const colors: Record<OrderStatus, string> = {
    pending: "badge-warning",
    confirmed: "badge-info",
    processing: "badge-info",
    shipped: "badge-info",
    delivered: "badge-success",
    cancelled: "badge-error",
  };
  return colors[status] || "badge-secondary";
};

/**
 * Get payment status badge color
 */
export const getPaymentStatusColor = (status: PaymentStatus): string => {
  const colors: Record<PaymentStatus, string> = {
    pending: "badge-warning",
    paid: "badge-success",
    failed: "badge-error",
    refunded: "badge-info",
  };
  return colors[status] || "badge-secondary";
};

/**
 * Calculate discount percentage
 */
export const calculateDiscount = (
  originalPrice: number | null | undefined,
  salePrice: number,
): number => {
  if (!originalPrice || originalPrice <= salePrice) return 0;
  return Math.round(((originalPrice - salePrice) / originalPrice) * 100);
};

/**
 * Debounce function
 */
export const debounce = <A extends unknown[]>(
  func: (...args: A) => unknown,
  wait: number = 300,
): ((...args: A) => void) => {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: A): void => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Nepal provinces
 */
export interface Province {
  id: number;
  name: string;
}

export const PROVINCES: Province[] = [
  { id: 1, name: "Province 1 (Koshi)" },
  { id: 2, name: "Province 2 (Madhesh)" },
  { id: 3, name: "Province 3 (Bagmati)" },
  { id: 4, name: "Province 4 (Gandaki)" },
  { id: 5, name: "Province 5 (Lumbini)" },
  { id: 6, name: "Province 6 (Karnali)" },
  { id: 7, name: "Province 7 (Sudurpashchim)" },
];

/**
 * Best-effort user-facing message from a failed API call (axios error) or any thrown value
 */
export const getErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === "object" && error !== null) {
    const response = (error as { response?: { data?: { message?: unknown } } }).response;
    if (typeof response?.data?.message === "string" && response.data.message) {
      return response.data.message;
    }
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message) return message;
  }
  return fallback;
};

/**
 * Narrow a reference that the API may return either populated or as a bare id
 */
export const populated = <T extends object>(ref: T | string | null | undefined): T | undefined =>
  typeof ref === "object" && ref !== null ? ref : undefined;

/**
 * Shipping settings until the API's arrive (GET /shipping/settings, edited by
 * admins). Mirrors DEFAULT_SHIPPING_SETTINGS in backend/utils/shipping.ts.
 */
export { FREE_SHIPPING_THRESHOLD };

export const VALLEY_DISTRICTS = ["Kathmandu", "Lalitpur", "Bhaktapur"];

export const DEFAULT_SHIPPING_SETTINGS: IShippingSettings = {
  freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
  valleyRate: 100,
  provinceRates: { 1: 250, 2: 250, 3: 150, 4: 200, 5: 250, 6: 300, 7: 300 },
  freeAreas: [{ district: "Kavrepalanchok" }],
  valleyDistricts: VALLEY_DISTRICTS,
};

/** "Panauti-7, Kavre" -> " panauti kavre " (padded, for whole-word matching) */
const placeKey = (name: string): string => ` ${name.toLowerCase().replace(/[^a-z]+/g, " ").trim()} `;

/** Whether an address is in one of the free-delivery areas */
export const isFreeShippingArea = (district: string, city: string, settings: IShippingSettings): boolean =>
  settings.freeAreas.some(
    (area) =>
      area.district.toLowerCase() === district.trim().toLowerCase() &&
      (!area.city?.trim() || placeKey(city).includes(placeKey(area.city))),
  );

/**
 * Shipping cost in NPR, shown at checkout only until POST /orders/shipping-quote
 * answers (or if it can't be reached). Same rule as calculateShippingCost in
 * backend/utils/shipping.ts, which is what the customer is charged.
 */
export const calculateShippingCost = (
  subtotal: number,
  province: number,
  district: string,
  settings: IShippingSettings = DEFAULT_SHIPPING_SETTINGS,
  city = "",
): number => {
  if (subtotal >= settings.freeShippingThreshold) return 0;
  if (isFreeShippingArea(district, city, settings)) return 0;
  const valley = (settings.valleyDistricts ?? VALLEY_DISTRICTS).map((d) => d.toLowerCase());
  if (province === 3 && valley.includes(district.trim().toLowerCase())) return settings.valleyRate;
  return settings.provinceRates[province] ?? 0;
};

/**
 * Units available to buy: the variants' total for products with variants,
 * otherwise the product's own stock
 */
export const getAvailableStock = (product: {
  stock?: number;
  variants?: { stock?: number }[];
}): number =>
  product.variants?.length
    ? product.variants.reduce((sum, v) => sum + (v.stock || 0), 0)
    : product.stock || 0;
