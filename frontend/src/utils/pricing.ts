/**
 * What to show for a product's price. The API adds `sale` / `salePrice` while
 * a campaign is live, so the storefront never computes discounts itself.
 */
import { calculateDiscount } from "./helpers";
import type { IProduct, IProductVariant } from "../types";

export interface DisplayPrice {
  /** What the shopper pays now */
  price: number;
  /** Struck-through "was" price, when higher than `price` */
  was: number | null;
  percentOff: number;
  /** Set when a festival/event sale lowered the price */
  campaign: IProduct["sale"] extends infer S ? (S extends { campaign: infer C } ? C : never) | null : never;
}

/** Price for the product, or for one of its variants */
export const displayPrice = (product: IProduct, variant?: IProductVariant | null): DisplayPrice => {
  const base = variant ? variant.price : product.price;
  const salePrice = variant ? variant.salePrice : product.sale?.price;
  const price = typeof salePrice === "number" && salePrice < base ? salePrice : base;
  // During a sale the pre-sale price is the "was" price, unless the product
  // already had a higher compare-at price
  const reference = Math.max(base, product.comparePrice ?? 0);
  const was = reference > price ? reference : null;
  return {
    price,
    was,
    percentOff: was ? calculateDiscount(was, price) : 0,
    campaign: price < base ? product.sale?.campaign ?? null : null,
  };
};

/** Lowest current price across variants ("From NPR …" when prices differ) */
export const cardPrice = (product: IProduct): DisplayPrice & { from: boolean } => {
  const variants = product.variants || [];
  if (variants.length === 0) return { ...displayPrice(product), from: false };
  const prices = variants.map((v) => displayPrice(product, v));
  const cheapest = prices.reduce((min, p) => (p.price < min.price ? p : min), prices[0]);
  return { ...cheapest, from: prices.some((p) => p.price > cheapest.price) };
};
