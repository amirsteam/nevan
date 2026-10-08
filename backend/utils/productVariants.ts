/**
 * Product option rules shared by the Product model, the admin API and the
 * variant-media migration.
 *
 * - Prices vary by size (and optionally colour); photos belong to colours.
 *   A photo in `images` may carry a `color`; untagged photos are for every
 *   colour. Each variant's `image` is derived: the first photo of its colour.
 * - `price`, `comparePrice` and `stock` of a product with variants are derived
 *   from the variants (cheapest variant / total), so listings, filters and
 *   sorting see real prices.
 * - `sizes` and `colors` keep the admin's order (colours also a swatch hex);
 *   `ageGroups` follow the sizes when they are on the age scale.
 */
import crypto from "crypto";
import { Types } from "mongoose";
import { AGE_GROUPS, COLOR_PALETTE, SIZE_AGE_GROUPS, SIZE_ORDER, type AgeGroup } from "./constants";

const norm = (value: unknown): string => String(value ?? "").trim().toLowerCase();

/** Cloudinary public id from a delivery URL (null for other hosts) */
export const publicIdFromUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  const match = url.match(/^https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/(.+)$/);
  if (!match) return null;
  // Drop transformation segments ("c_limit,w_1200/") and the version ("v1712345/")
  const segments = match[1].split("/");
  while (segments.length > 1 && (/^v\d+$/.test(segments[0]) || /^[a-z]{1,3}_[^/]*$/.test(segments[0]))) {
    segments.shift();
  }
  const path = segments.join("/").replace(/\.[a-z0-9]+$/i, "");
  return path || null;
};

/** Sizes in display order: the age scale first, other sizes as given */
export const sortSizes = (sizes: string[]): string[] => {
  const rank = (size: string) => {
    const index = SIZE_ORDER.findIndex((s) => norm(s) === norm(size));
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  };
  return sizes
    .map((size, position) => ({ size, position, rank: rank(size) }))
    .sort((a, b) => a.rank - b.rank || a.position - b.position)
    .map((entry) => entry.size);
};

/** "Shop by Age" bands covered by these sizes (empty when none are on the scale) */
export const ageGroupsForSizes = (sizes: string[]): AgeGroup[] => {
  const covered = new Set<AgeGroup>();
  for (const size of sizes) {
    const key = Object.keys(SIZE_AGE_GROUPS).find((s) => norm(s) === norm(size));
    if (key) SIZE_AGE_GROUPS[key].forEach((group) => covered.add(group));
  }
  return AGE_GROUPS.filter((group) => covered.has(group));
};

export const paletteHex = (name: string): string | undefined =>
  COLOR_PALETTE.find((color) => norm(color.name) === norm(name))?.hex;

/**
 * Stable id for a photo adopted from a variant URL, so the admin editor (which
 * sees products adopted in memory) and a later save agree on photo ids.
 */
const adoptedImageId = (url: string): Types.ObjectId =>
  new Types.ObjectId(crypto.createHash("sha1").update(url).digest("hex").slice(0, 24));

/* eslint-disable @typescript-eslint/no-explicit-any */
type ProductDoc = any;

/**
 * Older products stored one photo URL per variant. Each variant photo becomes
 * a photo of the variant's colour: tagged if it's already in the gallery,
 * added otherwise. A photo used by several colours stays a photo for every
 * colour. Idempotent; returns how many photos were tagged or added.
 */
export const adoptVariantImages = (product: ProductDoc): number => {
  const images = product.images;
  // Once photos are tagged by colour, variant photos are derived from them
  // and a missing one means it was removed, not that it needs adopting
  if (images.some((img: any) => img.color)) return 0;

  // Colours each variant photo was used for, keeping the first spelling
  const byUrl = new Map<string, { color: string; keys: Set<string> }>();
  for (const variant of product.variants || []) {
    const url = variant.image;
    if (!url) continue;
    const entry = byUrl.get(url) || { color: String(variant.color).trim(), keys: new Set<string>() };
    entry.keys.add(norm(variant.color));
    byUrl.set(url, entry);
  }

  let changed = 0;
  for (const [url, { color, keys }] of byUrl) {
    const ownColor = keys.size === 1 ? color : null;
    const existing = images.find((img: any) => img.url === url);
    if (existing) {
      if (ownColor) {
        existing.color = ownColor;
        changed += 1;
      }
      continue;
    }
    images.push({
      _id: adoptedImageId(url),
      url,
      publicId: publicIdFromUrl(url) || undefined,
      color: ownColor,
      isPrimary: images.length === 0,
    });
    changed += 1;
  }
  return changed;
};

/** Drop variant references to photos that were removed from the gallery */
export const forgetRemovedPhotos = (product: ProductDoc, removedUrls: string[]): void => {
  if (!removedUrls.length) return;
  const removed = new Set(removedUrls);
  for (const variant of product.variants || []) {
    if (variant.image && removed.has(variant.image)) variant.image = null;
  }
};

/** Recompute every field derived from the variants and photos */
export const syncDerivedFields = (product: ProductDoc): void => {
  const variants: any[] = product.variants || [];
  const images: any[] = product.images || [];

  if (variants.length === 0) {
    // A single product: colour photos become general photos
    if (product.sizes?.length) product.sizes = [];
    if (product.colors?.length) product.colors = [];
    images.forEach((img) => {
      if (img.color) img.color = null;
    });
  } else {
    // Older data: one compare price for the whole product applied to every
    // variant cheaper than it. Kept on the variants so nothing changes for
    // shoppers until the admin sets compare prices per size.
    const productCompare = Number(product.comparePrice) || 0;
    if (productCompare > 0 && !variants.some((v) => v.comparePrice != null)) {
      variants.forEach((v) => {
        if (productCompare > v.price) v.comparePrice = productCompare;
      });
    }

    // Colours: the admin's order and swatches, then colours only on variants
    const canonical = new Map<string, { name: string; hex?: string }>();
    for (const color of product.colors || []) {
      const key = norm(color.name);
      if (key && !canonical.has(key)) {
        canonical.set(key, { name: String(color.name).trim(), hex: color.hex || paletteHex(color.name) });
      }
    }
    for (const variant of variants) {
      const key = norm(variant.color);
      if (!canonical.has(key)) canonical.set(key, { name: String(variant.color).trim(), hex: paletteHex(variant.color) });
    }
    // Keep colours that have variants or photos
    const used = new Set<string>([...variants.map((v) => norm(v.color)), ...images.map((img) => norm(img.color)).filter(Boolean)]);
    product.colors = [...canonical.entries()]
      .filter(([key]) => used.has(key))
      .map(([, color]) => (color.hex ? { name: color.name, hex: color.hex } : { name: color.name }));

    // One spelling per colour
    variants.forEach((v) => {
      v.color = canonical.get(norm(v.color))!.name;
    });
    images.forEach((img) => {
      if (!img.color) return;
      img.color = canonical.get(norm(img.color))?.name ?? null;
    });

    // Sizes: the admin's order (only sizes in use), then the rest by scale
    const usedSizes: string[] = [];
    for (const v of variants) {
      const size = String(v.size).trim();
      if (!usedSizes.some((s) => norm(s) === norm(size))) usedSizes.push(size);
    }
    const ordered: string[] = [];
    for (const size of product.sizes || []) {
      const match = usedSizes.find((s) => norm(s) === norm(size));
      if (match && !ordered.some((s) => norm(s) === norm(match))) ordered.push(String(size).trim());
    }
    const rest = sortSizes(usedSizes.filter((s) => !ordered.some((o) => norm(o) === norm(s))));
    product.sizes = [...ordered, ...rest];
    variants.forEach((v) => {
      v.size = product.sizes.find((s: string) => norm(s) === norm(v.size));
    });

    // Prices and stock come from the variants
    variants.forEach((v) => {
      if (v.comparePrice != null && !(v.comparePrice > v.price)) v.comparePrice = undefined;
    });
    const cheapest = variants.reduce((min, v) => (v.price < min.price ? v : min), variants[0]);
    product.price = cheapest.price;
    product.comparePrice = cheapest.comparePrice ?? undefined;
    product.stock = variants.reduce((sum, v) => sum + (v.stock || 0), 0);

    // Each variant shows its colour's first photo
    variants.forEach((v) => {
      v.image = images.find((img) => img.color && norm(img.color) === norm(v.color))?.url ?? null;
    });

    // Age groups follow the sizes when they're on the age scale
    const groups = ageGroupsForSizes(product.sizes);
    if (groups.length) product.ageGroups = groups;
  }

  // Exactly one primary photo
  if (images.length) {
    const primary = images.find((img) => img.isPrimary) || images[0];
    images.forEach((img) => {
      img.isPrimary = img === primary;
    });
  }
};
/* eslint-enable @typescript-eslint/no-explicit-any */
