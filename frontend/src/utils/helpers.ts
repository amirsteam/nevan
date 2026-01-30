/**
 * Utility Functions
 * Common helper functions for the frontend
 */

import type { OrderStatus, PaymentStatus } from "../types";

/**
 * Format price in NPR
 */
export const formatPrice = (amount: number): string => {
  return new Intl.NumberFormat("en-NP", {
    style: "currency",
    currency: "NPR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
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
  originalPrice: number,
  salePrice: number,
): number => {
  if (!originalPrice || originalPrice <= salePrice) return 0;
  return Math.round(((originalPrice - salePrice) / originalPrice) * 100);
};

/**
 * Debounce function
 */
export const debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number = 300,
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>): void => {
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
