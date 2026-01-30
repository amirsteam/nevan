/**
 * Frontend Constants
 * Local constants to avoid shared import issues in production builds
 */

// Product size options
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
