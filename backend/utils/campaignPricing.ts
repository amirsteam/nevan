/**
 * Campaign sale pricing — the single rule for what a shopper pays during a
 * campaign. Used by product responses, the cart summary and order creation,
 * so the price shown is always the price charged. Pure (no database access).
 */

/** The parts of a live campaign pricing needs (built by campaignService) */
export interface PricingCampaign {
  id: string;
  slug: string;
  name: string;
  endsAt: Date;
  type: "none" | "percent" | "fixed";
  value: number;
  scope: "all" | "categories" | "products";
  /** Campaign categories plus their subcategories */
  categoryIds: Set<string>;
  productIds: Set<string>;
  excludeIds: Set<string>;
}

export interface PriceResult {
  price: number;
  originalPrice: number;
  /** Set only when the campaign actually lowered the price */
  campaignId: string | null;
}

interface PricedProduct {
  _id: unknown;
  price: number;
  category?: unknown;
}

const idOf = (value: unknown): string => {
  if (value && typeof value === "object" && "_id" in value) return String((value as { _id: unknown })._id);
  return String(value ?? "");
};

export const isEligible = (product: PricedProduct, campaign: PricingCampaign | null): boolean => {
  if (!campaign || campaign.type === "none") return false;
  const productId = idOf(product._id);
  if (campaign.excludeIds.has(productId)) return false;
  if (campaign.scope === "all") return true;
  if (campaign.scope === "products") return campaign.productIds.has(productId);
  return campaign.categoryIds.has(idOf(product.category));
};

/** Sale price for an amount, rounded to whole rupees, never below NPR 1 */
export const discountedAmount = (base: number, campaign: Pick<PricingCampaign, "type" | "value">): number => {
  let price = base;
  if (campaign.type === "percent") price = base * (1 - campaign.value / 100);
  else if (campaign.type === "fixed") price = base - campaign.value;
  return Math.max(1, Math.min(base, Math.round(price)));
};

/** What one unit costs right now (variant price when a variant is given) */
export const priceFor = (
  product: PricedProduct,
  variant: { price?: number } | null | undefined,
  campaign: PricingCampaign | null,
): PriceResult => {
  const base = typeof variant?.price === "number" ? variant.price : product.price;
  if (!isEligible(product, campaign)) return { price: base, originalPrice: base, campaignId: null };
  const price = discountedAmount(base, campaign as PricingCampaign);
  return price < base
    ? { price, originalPrice: base, campaignId: (campaign as PricingCampaign).id }
    : { price: base, originalPrice: base, campaignId: null };
};
