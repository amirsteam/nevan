/**
 * Utility Functions
 * Common helper functions for the frontend
 */

import type { OrderStatus, PaymentStatus } from "../types";
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
 * Shipping cost in NPR. Mirrors calculateShippingCost in backend/services/orderService.ts,
 * which is what the customer is actually charged — keep the two in sync.
 */
export { FREE_SHIPPING_THRESHOLD };

export const calculateShippingCost = (
  subtotal: number,
  province: number,
  district: string,
): number => {
  if (subtotal >= FREE_SHIPPING_THRESHOLD) return 0;

  if (
    province === 3 &&
    ["kathmandu", "lalitpur", "bhaktapur"].includes(district.trim().toLowerCase())
  ) {
    return 100;
  }

  const shippingRates: Record<number, number> = {
    1: 250,
    2: 250,
    3: 150,
    4: 200,
    5: 250,
    6: 300,
    7: 300,
  };

  return shippingRates[province] || 200;
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
