/**
 * Constants
 * Shared constants for the backend
 */

// Built-in sizes offered in the admin size picker, smallest first (baby
// clothes are sized by age). Variants may also use custom sizes (any text up
// to MAX_SIZE_LENGTH characters), so don't treat this list as exhaustive.
// Keep in sync with SIZE_SCALE in frontend/src/utils/constants.ts.
export const PRODUCT_SIZES = [
  "0-3 Months",
  "3-6 Months",
  "6-12 Months",
  "12-18 Months",
  "18-24 Months",
  "2-3 Years",
  "3-4 Years",
  "4-5 Years",
  "5-6 Years",
  "6-7 Years",
  "7-8 Years",
  "8-10 Years",
  "One Size",
] as const;

export type ProductSize = (typeof PRODUCT_SIZES)[number];

// Size names used before the age-based scale (still on older products)
export const LEGACY_SIZES = [
  "Small Size (0-1 yrs)",
  "Medium Size (1-4 yrs)",
  "Large Size (4-6 yrs)",
  "XL Size (6-8 yrs)",
  "XXL Size (8-10 yrs)",
  "Standard Size",
] as const;

// Display order for sizes on a product; unknown (custom) sizes come after
export const SIZE_ORDER: readonly string[] = [
  ...PRODUCT_SIZES.filter((size) => size !== "One Size"),
  ...LEGACY_SIZES,
  "One Size",
];

export const MAX_SIZE_LENGTH = 40;
export const MAX_COLOR_LENGTH = 30;

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

// "Shop by Age" bands each size covers: a product's age groups are worked out
// from its sizes (sizes not listed here leave the admin's own tags alone)
export const SIZE_AGE_GROUPS: Readonly<Record<string, readonly AgeGroup[]>> = {
  "0-3 Months": ["0-3 Months"],
  "3-6 Months": ["3-6 Months"],
  "6-12 Months": ["6-12 Months"],
  "12-18 Months": ["1-2 Years"],
  "18-24 Months": ["1-2 Years"],
  "2-3 Years": ["2-4 Years"],
  "3-4 Years": ["2-4 Years"],
  "4-5 Years": ["4-6 Years"],
  "5-6 Years": ["4-6 Years"],
  "6-7 Years": ["6-10 Years"],
  "7-8 Years": ["6-10 Years"],
  "8-10 Years": ["6-10 Years"],
  "Small Size (0-1 yrs)": ["0-3 Months", "3-6 Months", "6-12 Months"],
  "Medium Size (1-4 yrs)": ["1-2 Years", "2-4 Years"],
  "Large Size (4-6 yrs)": ["4-6 Years"],
  "XL Size (6-8 yrs)": ["6-10 Years"],
  "XXL Size (8-10 yrs)": ["6-10 Years"],
};

// Colour suggestions with swatches for the admin colour picker. Products keep
// their own colour list (name + hex), so admins can add any other colour.
// Keep in sync with COLOR_PALETTE in frontend/src/utils/constants.ts.
export const COLOR_PALETTE: readonly { name: string; hex: string }[] = [
  { name: "White", hex: "#ffffff" },
  { name: "Off White", hex: "#f7f3ea" },
  { name: "Cream", hex: "#f3e5c7" },
  { name: "Natural", hex: "#e8dcc4" },
  { name: "Beige", hex: "#d9c3a5" },
  { name: "Dusty Rose", hex: "#c1847b" },
  { name: "Baby Pink", hex: "#f4c2c2" },
  { name: "Peach", hex: "#f7b89b" },
  { name: "Red", hex: "#c62828" },
  { name: "Maroon", hex: "#7b1e2b" },
  { name: "Mustard", hex: "#d4a017" },
  { name: "Yellow", hex: "#f6d55c" },
  { name: "Mint", hex: "#a8e6cf" },
  { name: "Sage", hex: "#9caf88" },
  { name: "Green", hex: "#4e8b57" },
  { name: "Olive", hex: "#7a7f3a" },
  { name: "Baby Blue", hex: "#a7c7e7" },
  { name: "Blue", hex: "#3b6fb6" },
  { name: "Navy", hex: "#1f3a5f" },
  { name: "Lavender", hex: "#c3b1e1" },
  { name: "Grey", hex: "#9e9e9e" },
  { name: "Brown", hex: "#7b5e57" },
  { name: "Black", hex: "#222222" },
];

// "boy"/"girl" filters also match unisex products
export const PRODUCT_GENDERS = ["boy", "girl", "unisex"] as const;

export type ProductGender = (typeof PRODUCT_GENDERS)[number];

// Products at or below this total stock show in the admin "low stock" list
export const LOW_STOCK_THRESHOLD = 5;
