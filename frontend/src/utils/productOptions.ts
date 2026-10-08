/**
 * Sizes and colours of a product, for the storefront and the admin editor.
 * Same rules as backend/utils/productVariants.ts.
 */
import { AGE_GROUPS } from "../config/store";
import { COLOR_PALETTE, SIZE_AGE_GROUPS, SIZE_ORDER } from "./constants";
import type { IImage, IProduct } from "../types";

export const sameName = (a: string | null | undefined, b: string | null | undefined): boolean =>
  String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase();

/** Sizes in display order: the age scale first, other sizes as given */
export const sortSizes = (sizes: string[]): string[] => {
  const rank = (size: string) => {
    const index = SIZE_ORDER.findIndex((s) => sameName(s, size));
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  };
  return sizes
    .map((size, position) => ({ size, position, rank: rank(size) }))
    .sort((a, b) => a.rank - b.rank || a.position - b.position)
    .map((entry) => entry.size);
};

/** "Shop by Age" bands covered by these sizes (empty when none are on the scale) */
export const ageGroupsForSizes = (sizes: string[]): string[] => {
  const covered = new Set<string>();
  for (const size of sizes) {
    const key = Object.keys(SIZE_AGE_GROUPS).find((s) => sameName(s, size));
    if (key) SIZE_AGE_GROUPS[key].forEach((group) => covered.add(group));
  }
  return AGE_GROUPS.filter((group) => covered.has(group));
};

export const paletteHex = (name: string): string | undefined =>
  COLOR_PALETTE.find((color) => sameName(color.name, name))?.hex;

/** A product's sizes in display order (older products: from the variants) */
export const productSizes = (product: Pick<IProduct, "sizes" | "variants">): string[] => {
  const used = [...new Set((product.variants || []).map((v) => v.size))];
  const listed = (product.sizes || []).filter((size) => used.some((u) => sameName(u, size)));
  return [...listed, ...sortSizes(used.filter((u) => !listed.some((size) => sameName(size, u))))];
};

/** A product's colours with swatches, in display order (only colours on variants) */
export const productColors = (product: Pick<IProduct, "colors" | "variants">): { name: string; hex?: string }[] => {
  const used = [...new Set((product.variants || []).map((v) => v.color))];
  const listed = (product.colors || []).filter((color) => used.some((u) => sameName(u, color.name)));
  const missing = used
    .filter((u) => !listed.some((color) => sameName(color.name, u)))
    .map((name) => ({ name, hex: paletteHex(name) }));
  return [...listed, ...missing];
};

/** Photos to show for a colour: that colour's photos, then photos for every colour */
export const photosForColor = (images: IImage[], color: string | null | undefined): IImage[] => {
  if (!color || !images.some((img) => img.color)) return images;
  const own = images.filter((img) => sameName(img.color, color));
  const general = images.filter((img) => !img.color);
  return own.length || general.length ? [...own, ...general] : images;
};

/** Light swatches (white, cream…) need an outline to be visible */
export const isLightSwatch = (hex: string | undefined): boolean => {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return false;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b > 215;
};
