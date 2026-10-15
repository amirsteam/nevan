/**
 * Constants
 * Shared constants for the backend
 */

// The store's sizes (the client's scale, up to 7 years), smallest first. These
// are the only sizes the admin picker offers; variants may also use a custom
// size (any text up to MAX_SIZE_LENGTH characters).
// Keep in sync with frontend/src/utils/constants.ts.
export const PRODUCT_SIZES = [
  "Small (0-12 months)",
  "Medium (1-3 years)",
  "Large (3-5 years)",
  "XL (5-7 years)",
  "One Size",
] as const;

export type ProductSize = (typeof PRODUCT_SIZES)[number];

// Older size names that may still be stored on products. They keep working and
// sorting but are never offered again; `npm run migrate-size-scale` renames the
// ones with a matching new size (SIZE_RENAMES). XXL (8-10 yrs) is past the
// 7-year limit and stays only until its stock is sold.
export const LEGACY_SIZES = [
  "Small Size (0-1 yrs)",
  "Medium Size (1-4 yrs)",
  "Large Size (4-6 yrs)",
  "XL Size (6-8 yrs)",
  "XXL Size (8-10 yrs)",
  "Standard Size",
  // Finer age scale used briefly during development
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
] as const;

// Old name → new name, applied by the size-scale migration
export const SIZE_RENAMES: Readonly<Record<string, ProductSize>> = {
  "Small Size (0-1 yrs)": "Small (0-12 months)",
  "Medium Size (1-4 yrs)": "Medium (1-3 years)",
  "Large Size (4-6 yrs)": "Large (3-5 years)",
  "XL Size (6-8 yrs)": "XL (5-7 years)",
  "Standard Size": "One Size",
};

// Display order for sizes on a product: the scale, older names (XXL after XL),
// then One Size; unknown (custom) sizes come after
export const SIZE_ORDER: readonly string[] = [
  "0-3 Months",
  "3-6 Months",
  "6-12 Months",
  "Small Size (0-1 yrs)",
  "Small (0-12 months)",
  "12-18 Months",
  "18-24 Months",
  "2-3 Years",
  "Medium Size (1-4 yrs)",
  "Medium (1-3 years)",
  "3-4 Years",
  "4-5 Years",
  "Large Size (4-6 yrs)",
  "Large (3-5 years)",
  "5-6 Years",
  "6-7 Years",
  "XL Size (6-8 yrs)",
  "XL (5-7 years)",
  "7-8 Years",
  "8-10 Years",
  "XXL Size (8-10 yrs)",
  "Standard Size",
  "One Size",
];

export const MAX_SIZE_LENGTH = 40;
export const MAX_COLOR_LENGTH = 30;

// Age bands shoppers filter by ("Shop by Age"): one per size, up to 7 years.
// Keep in sync with AGE_GROUPS in shared/store.ts (storefront and admin form).
export const AGE_GROUPS = ["0-12 Months", "1-3 Years", "3-5 Years", "5-7 Years"] as const;

export type AgeGroup = (typeof AGE_GROUPS)[number];

// Bands used before the client's scale → the new bands they overlap. Used to
// move stored tags (migration) and to keep old "?age=" links working.
export const LEGACY_AGE_GROUPS: Readonly<Record<string, readonly AgeGroup[]>> = {
  "0-3 Months": ["0-12 Months"],
  "3-6 Months": ["0-12 Months"],
  "6-12 Months": ["0-12 Months"],
  "1-2 Years": ["1-3 Years"],
  "2-4 Years": ["1-3 Years", "3-5 Years"],
  "4-6 Years": ["3-5 Years", "5-7 Years"],
  "6-10 Years": ["5-7 Years"],
};

// "Shop by Age" band each size covers: a product's age groups are worked out
// from its sizes (sizes not listed here — custom sizes, One Size and XXL, which
// is past the 7-year limit — leave the admin's own tags alone)
export const SIZE_AGE_GROUPS: Readonly<Record<string, readonly AgeGroup[]>> = {
  "Small (0-12 months)": ["0-12 Months"],
  "Medium (1-3 years)": ["1-3 Years"],
  "Large (3-5 years)": ["3-5 Years"],
  "XL (5-7 years)": ["5-7 Years"],
  // Older names
  "Small Size (0-1 yrs)": ["0-12 Months"],
  "Medium Size (1-4 yrs)": ["1-3 Years"],
  "Large Size (4-6 yrs)": ["3-5 Years"],
  "XL Size (6-8 yrs)": ["5-7 Years"],
  "0-3 Months": ["0-12 Months"],
  "3-6 Months": ["0-12 Months"],
  "6-12 Months": ["0-12 Months"],
  "12-18 Months": ["1-3 Years"],
  "18-24 Months": ["1-3 Years"],
  "2-3 Years": ["1-3 Years"],
  "3-4 Years": ["3-5 Years"],
  "4-5 Years": ["3-5 Years"],
  "5-6 Years": ["5-7 Years"],
  "6-7 Years": ["5-7 Years"],
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
