/**
 * What to show for a product's price (mirrors frontend/src/utils/pricing.ts).
 * The API adds `sale` / `salePrice` while a campaign is live; the app never
 * computes discounts itself.
 */
import type { IProduct, IProductVariant } from "@shared/types";

export interface DisplayPrice {
  price: number;
  /** Struck-through "was" price, when higher than `price` */
  was: number | null;
  percentOff: number;
  /** Campaign name when a festival/event sale lowered the price */
  campaignName: string | null;
}

export const displayPrice = (product: IProduct, variant?: IProductVariant | null): DisplayPrice => {
  const base = variant ? variant.price : product.price;
  const salePrice = variant ? variant.salePrice : product.sale?.price;
  const price = typeof salePrice === "number" && salePrice < base ? salePrice : base;
  const compareAt = variant?.comparePrice ?? product.comparePrice ?? 0;
  const reference = Math.max(base, compareAt);
  const was = reference > price ? reference : null;
  return {
    price,
    was,
    percentOff: was ? Math.round(((was - price) / was) * 100) : 0,
    campaignName: price < base ? product.sale?.campaign.name ?? null : null,
  };
};

/** Lowest current price across variants (for cards) */
export const cardPrice = (product: IProduct): DisplayPrice => {
  const variants = product.variants || [];
  if (variants.length === 0) return displayPrice(product);
  return variants
    .map((v) => displayPrice(product, v))
    .reduce((min, p) => (p.price < min.price ? p : min));
};
