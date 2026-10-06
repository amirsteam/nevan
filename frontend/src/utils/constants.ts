/**
 * Frontend Constants
 * Local constants to avoid shared import issues in production builds
 */

// Built-in size suggestions. Admins can also enter custom sizes (up to
// MAX_SIZE_LENGTH characters), so sizes on products aren't limited to this list.
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
