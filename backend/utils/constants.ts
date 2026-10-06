/**
 * Constants
 * Shared constants for the backend
 */

// Built-in size suggestions. Variants may also use custom sizes (any text up to
// MAX_SIZE_LENGTH characters), so don't treat this list as exhaustive.
export const PRODUCT_SIZES = [
  "Small Size (0-1 yrs)",
  "Medium Size (1-4 yrs)",
  "Large Size (4-6 yrs)",
  "XL Size (6-8 yrs)",
  "XXL Size (8-10 yrs)",
  "Standard Size",
  "One Size",
] as const;

export type ProductSize = (typeof PRODUCT_SIZES)[number];

export const MAX_SIZE_LENGTH = 40;

// Age bands shoppers filter by ("Shop by Age"). Keep in sync with AGE_GROUPS in
// shared/types.ts (storefront, admin form and mobile).
export const AGE_GROUPS = [
  "0-3 Months",
  "3-6 Months",
  "6-12 Months",
  "1-2 Years",
  "2-4 Years",
  "4-6 Years",
  "6-10 Years",
] as const;

export type AgeGroup = (typeof AGE_GROUPS)[number];

// "boy"/"girl" filters also match unisex products
export const PRODUCT_GENDERS = ["boy", "girl", "unisex"] as const;

export type ProductGender = (typeof PRODUCT_GENDERS)[number];

// Products at or below this total stock show in the admin "low stock" list
export const LOW_STOCK_THRESHOLD = 5;
