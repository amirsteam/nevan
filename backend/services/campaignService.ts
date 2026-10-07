/**
 * Campaign Service
 * Festival/event campaigns: the live-campaign lookup used for sale pricing,
 * public campaign data, admin management, launch push notifications and
 * campaign sales stats.
 */
import mongoose, { Types } from "mongoose";
import Campaign, { ICampaign, campaignState } from "../models/Campaign";
import Category from "../models/Category";
import Order from "../models/Order";
import AppError from "../utils/AppError";
import { cache } from "../utils/cache";
import { createSlug } from "../utils/helpers";
import { deleteImage } from "../config/cloudinary";
import { FESTIVALS, PALETTES, resolvePalette } from "../utils/festivals";
import { priceFor, PricingCampaign } from "../utils/campaignPricing";
import { sendPromotionalNotification } from "./pushNotificationService";

const LIVE_CACHE_KEY = "campaign_live";
const LIVE_CACHE_MAX_SECONDS = 60;
const MIN_DURATION_MS = 60 * 60 * 1000;
const MAX_PERCENT = 70;

type LeanCampaign = ICampaign & { _id: Types.ObjectId };

export interface CampaignInput {
  name?: string;
  festival?: string;
  headline?: string;
  subheadline?: string;
  greeting?: string;
  emoji?: string;
  palette?: string;
  ctaLabel?: string;
  startsAt?: string | Date;
  endsAt?: string | Date;
  status?: "draft" | "published";
  sale?: {
    type?: "none" | "percent" | "fixed";
    value?: number;
    scope?: "all" | "categories" | "products";
    categories?: string[];
    products?: string[];
    excludeProducts?: string[];
  };
  notify?: { pushOnLaunch?: boolean };
}

// ---------------------------------------------------------------------------
// Live campaign (pricing)
// ---------------------------------------------------------------------------

export interface LiveCampaign {
  campaign: LeanCampaign;
  pricing: PricingCampaign;
}

/** Campaign categories plus all their descendants */
const expandCategories = async (ids: Types.ObjectId[]): Promise<Set<string>> => {
  const result = new Set(ids.map(String));
  let frontier = [...ids];
  // Category trees are shallow; the loop also guards against cycles
  for (let depth = 0; depth < 5 && frontier.length; depth++) {
    const children = await Category.find({ parent: { $in: frontier } }).distinct("_id");
    frontier = (children as Types.ObjectId[]).filter((id) => !result.has(String(id)));
    frontier.forEach((id) => result.add(String(id)));
  }
  return result;
};

export const buildPricing = async (campaign: LeanCampaign): Promise<PricingCampaign> => ({
  id: String(campaign._id),
  slug: campaign.slug,
  name: campaign.name,
  endsAt: campaign.endsAt,
  type: campaign.sale?.type || "none",
  value: campaign.sale?.value || 0,
  scope: campaign.sale?.scope || "all",
  categoryIds:
    campaign.sale?.scope === "categories" ? await expandCategories(campaign.sale.categories || []) : new Set(),
  productIds: new Set((campaign.sale?.products || []).map(String)),
  excludeIds: new Set((campaign.sale?.excludeProducts || []).map(String)),
});

/**
 * The published campaign running now, if any. Cached briefly, and never past
 * the moment it ends or the next one starts, so sales switch on and off on time.
 */
export const getLiveCampaign = async (): Promise<LiveCampaign | null> => {
  const cached = cache.get<{ live: LiveCampaign | null }>(LIVE_CACHE_KEY);
  if (cached) return cached.live;

  const now = new Date();
  const [campaign, next] = await Promise.all([
    Campaign.findOne({ status: "published", startsAt: { $lte: now }, endsAt: { $gt: now } })
      .sort({ startsAt: -1 })
      .lean<LeanCampaign>(),
    Campaign.findOne({ status: "published", startsAt: { $gt: now } })
      .sort({ startsAt: 1 })
      .select("startsAt")
      .lean<{ startsAt: Date }>(),
  ]);

  const live = campaign ? { campaign, pricing: await buildPricing(campaign) } : null;

  const boundaries = [campaign?.endsAt, next?.startsAt]
    .filter((d): d is Date => Boolean(d))
    .map((d) => (new Date(d).getTime() - now.getTime()) / 1000);
  const ttl = Math.max(1, Math.min(LIVE_CACHE_MAX_SECONDS, ...boundaries));
  cache.set(LIVE_CACHE_KEY, { live }, ttl);
  return live;
};

export const clearCampaignCache = (): void => {
  cache.delete(LIVE_CACHE_KEY);
};

// ---------------------------------------------------------------------------
// Public shapes
// ---------------------------------------------------------------------------

const saleLabel = (campaign: Pick<ICampaign, "sale">): string | null => {
  const { type, value } = campaign.sale || ({} as ICampaign["sale"]);
  if (type === "percent" && value > 0) return `${value}% off`;
  if (type === "fixed" && value > 0) return `NPR ${value.toLocaleString("en-IN")} off`;
  return null;
};

/** What storefronts and the app need to render a campaign */
export const toPublicCampaign = async (campaign: LeanCampaign) => {
  const categories =
    campaign.sale?.scope === "categories" && campaign.sale.categories?.length
      ? await Category.find({ _id: { $in: campaign.sale.categories } })
          .select("name slug")
          .lean()
      : [];
  return {
    _id: campaign._id,
    name: campaign.name,
    slug: campaign.slug,
    festival: campaign.festival,
    headline: campaign.headline,
    subheadline: campaign.subheadline || "",
    greeting: campaign.greeting || "",
    emoji: campaign.emoji || "",
    ctaLabel: campaign.ctaLabel || "Shop the sale",
    bannerDesktop: campaign.bannerDesktop?.url || null,
    bannerMobile: campaign.bannerMobile?.url || null,
    startsAt: campaign.startsAt,
    endsAt: campaign.endsAt,
    state: campaignState(campaign),
    theme: resolvePalette(campaign.palette),
    sale: {
      type: campaign.sale?.type || "none",
      value: campaign.sale?.value || 0,
      scope: campaign.sale?.scope || "all",
      label: saleLabel(campaign),
      categories: categories.map((c: any) => ({ _id: c._id, name: c.name, slug: c.slug })),
    },
  };
};

export const getLivePublicCampaign = async () => {
  const live = await getLiveCampaign();
  return live ? toPublicCampaign(live.campaign) : null;
};

/** A campaign by slug for its sale page (published only; drafts via admin preview) */
export const getPublicCampaignBySlug = async (slug: string) => {
  const campaign = await Campaign.findOne({ slug, status: "published" }).lean<LeanCampaign>();
  if (!campaign) throw new AppError("Campaign not found", 404);
  return toPublicCampaign(campaign);
};

/** Admin preview of any campaign (drafts and scheduled ones too) */
export const getPreviewCampaign = async (id: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError("Campaign not found", 404);
  const campaign = await Campaign.findById(id).lean<LeanCampaign>();
  if (!campaign) throw new AppError("Campaign not found", 404);
  return toPublicCampaign(campaign);
};

/**
 * Product list filter for a campaign's sale page: the products its sale (or
 * collection, for look-only campaigns) covers. Unknown slug → matches nothing.
 */
export const campaignProductFilter = async (slug: string): Promise<Record<string, unknown>> => {
  const campaign = await Campaign.findOne({ slug, status: "published" }).lean<LeanCampaign>();
  if (!campaign) return { _id: { $in: [] } };
  const pricing = await buildPricing(campaign);
  const filter: Record<string, unknown> = {};
  if (pricing.scope === "categories") {
    filter.category = { $in: [...pricing.categoryIds].map((id) => new Types.ObjectId(id)) };
  } else if (pricing.scope === "products") {
    filter._id = { $in: [...pricing.productIds].map((id) => new Types.ObjectId(id)) };
  }
  if (pricing.excludeIds.size) {
    const exclude = [...pricing.excludeIds].map((id) => new Types.ObjectId(id));
    filter._id = { ...((filter._id as object) || {}), $nin: exclude };
  }
  return filter;
};

// ---------------------------------------------------------------------------
// Sale prices on product responses
// ---------------------------------------------------------------------------

const toPlain = (product: any): any =>
  product && typeof product.toJSON === "function" ? product.toJSON() : { ...product };

/**
 * Adds `sale` (and `salePrice` on variants) to a product for the storefront.
 * Products the live campaign doesn't discount are returned unchanged.
 */
export const decorateProduct = (product: any, live: LiveCampaign | null): any => {
  const plain = toPlain(product);
  if (!live) return plain;

  const base = priceFor(plain, null, live.pricing);
  const variants = Array.isArray(plain.variants)
    ? plain.variants.map((v: any) => {
        const p = priceFor(plain, v, live.pricing);
        return p.campaignId ? { ...v, salePrice: p.price } : v;
      })
    : plain.variants;
  const discounted = base.campaignId || variants?.some((v: any) => v.salePrice !== undefined);
  if (!discounted) return plain;

  return {
    ...plain,
    variants,
    sale: {
      price: base.price,
      originalPrice: base.originalPrice,
      percentOff: Math.round(((base.originalPrice - base.price) / base.originalPrice) * 100),
      campaign: { slug: live.pricing.slug, name: live.campaign.name, endsAt: live.campaign.endsAt },
    },
  };
};

export const decorateProducts = async (products: any[]): Promise<any[]> => {
  const live = await getLiveCampaign();
  return products.map((p) => decorateProduct(p, live));
};

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

const toObjectIds = (ids: unknown): Types.ObjectId[] =>
  Array.isArray(ids)
    ? [...new Set(ids.map(String))]
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new Types.ObjectId(id))
    : [];

const uniqueSlug = async (name: string, excludeId?: Types.ObjectId): Promise<string> => {
  const base = createSlug(name) || "campaign";
  let slug = base;
  const taken = async (candidate: string) =>
    Campaign.exists(excludeId ? { slug: candidate, _id: { $ne: excludeId } } : { slug: candidate });
  for (let n = 2; await taken(slug); n++) slug = `${base}-${n}`;
  return slug;
};

const formatRange = (c: Pick<ICampaign, "startsAt" | "endsAt">) => {
  const fmt = (d: Date) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "Asia/Kathmandu" });
  return `${fmt(c.startsAt)}–${fmt(c.endsAt)}`;
};

/** Validates dates and sale rules, and that published campaigns don't overlap */
const assertValid = async (campaign: ICampaign): Promise<void> => {
  const start = new Date(campaign.startsAt).getTime();
  const end = new Date(campaign.endsAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) throw new AppError("Start and end dates are required", 400);
  if (end - start < MIN_DURATION_MS) throw new AppError("A campaign must run for at least an hour", 400);

  const sale = campaign.sale;
  if (sale.type === "percent" && (sale.value < 1 || sale.value > MAX_PERCENT)) {
    throw new AppError(`Percentage discount must be between 1 and ${MAX_PERCENT}`, 400);
  }
  if (sale.type === "fixed" && !(sale.value > 0)) throw new AppError("Discount amount must be more than 0", 400);
  if (sale.scope === "categories" && !sale.categories.length) throw new AppError("Choose at least one category", 400);
  if (sale.scope === "products" && !sale.products.length) throw new AppError("Choose at least one product", 400);

  if (campaign.status === "published") {
    const clash = await Campaign.findOne({
      _id: { $ne: campaign._id },
      status: "published",
      startsAt: { $lt: campaign.endsAt },
      endsAt: { $gt: campaign.startsAt },
    }).lean<LeanCampaign>();
    if (clash) {
      throw new AppError(
        `These dates overlap "${clash.name}" (${formatRange(clash)}). Only one campaign can run at a time.`,
        409,
      );
    }
  }
};

const applyInput = (campaign: ICampaign, input: CampaignInput): void => {
  const textFields = ["name", "festival", "headline", "subheadline", "greeting", "emoji", "palette", "ctaLabel"] as const;
  for (const field of textFields) {
    if (input[field] !== undefined) (campaign as any)[field] = input[field];
  }
  if (input.startsAt !== undefined) campaign.startsAt = new Date(input.startsAt);
  if (input.endsAt !== undefined) campaign.endsAt = new Date(input.endsAt);
  if (input.status !== undefined) campaign.status = input.status;
  if (input.sale) {
    const sale = input.sale;
    if (sale.type !== undefined) campaign.sale.type = sale.type;
    if (sale.value !== undefined) campaign.sale.value = Number(sale.value) || 0;
    if (sale.scope !== undefined) campaign.sale.scope = sale.scope;
    if (sale.categories !== undefined) campaign.sale.categories = toObjectIds(sale.categories);
    if (sale.products !== undefined) campaign.sale.products = toObjectIds(sale.products);
    if (sale.excludeProducts !== undefined) campaign.sale.excludeProducts = toObjectIds(sale.excludeProducts);
    if (campaign.sale.type === "none") campaign.sale.value = 0;
  }
  if (input.notify?.pushOnLaunch !== undefined) campaign.notify.pushOnLaunch = Boolean(input.notify.pushOnLaunch);
};

/** Admin list row / detail (includes the state and resolved theme) */
export const toAdminCampaign = (campaign: any) => {
  const plain = toPlain(campaign);
  return { ...plain, state: campaignState(plain), theme: resolvePalette(plain.palette), saleLabel: saleLabel(plain) };
};

export const listCampaigns = async () => {
  const campaigns = await Campaign.find().sort({ startsAt: -1 }).lean();
  return campaigns.map(toAdminCampaign);
};

export const getCampaign = async (id: string) => {
  const campaign = await Campaign.findById(id);
  if (!campaign) throw new AppError("Campaign not found", 404);
  return campaign;
};

export const createCampaign = async (input: CampaignInput, adminId?: string) => {
  const preset = FESTIVALS[(input.festival as keyof typeof FESTIVALS) || "custom"] || FESTIVALS.custom;
  const campaign = new Campaign({
    name: input.name || preset.name,
    slug: "pending",
    festival: input.festival || "custom",
    headline: input.headline || preset.headline,
    greeting: input.greeting ?? preset.greeting,
    emoji: input.emoji ?? preset.emoji,
    palette: input.palette || preset.palette,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    createdBy: adminId,
  });
  applyInput(campaign, input);
  campaign.slug = await uniqueSlug(campaign.name);
  await assertValid(campaign);
  await campaign.save();
  clearCampaignCache();
  return campaign;
};

export const updateCampaign = async (id: string, input: CampaignInput) => {
  const campaign = await getCampaign(id);
  const previousName = campaign.name;
  applyInput(campaign, input);
  if (campaign.name !== previousName) campaign.slug = await uniqueSlug(campaign.name, campaign._id as Types.ObjectId);
  // Moving the start into the future re-arms the launch notification
  if (input.startsAt !== undefined && campaign.startsAt > new Date()) campaign.notify.sentAt = null;
  await assertValid(campaign);
  await campaign.save();
  clearCampaignCache();
  return campaign;
};

export const deleteCampaign = async (id: string): Promise<void> => {
  const campaign = await getCampaign(id);
  for (const image of [campaign.bannerDesktop, campaign.bannerMobile]) {
    if (image?.publicId) await deleteImage(image.publicId).catch(() => undefined);
  }
  await campaign.deleteOne();
  clearCampaignCache();
};

/** Copy as a draft with the same look and sale; dates move forward a year */
export const duplicateCampaign = async (id: string, adminId?: string) => {
  const source = await getCampaign(id);
  const nextYear = (d: Date) => {
    const copy = new Date(d);
    copy.setFullYear(copy.getFullYear() + 1);
    return copy;
  };
  // Banners are not copied: they'd share Cloudinary images, and deleting one
  // campaign would remove the other's banner
  const copy = new Campaign({
    name: `${source.name} (copy)`,
    slug: await uniqueSlug(`${source.name} copy`),
    festival: source.festival,
    headline: source.headline,
    subheadline: source.subheadline,
    greeting: source.greeting,
    emoji: source.emoji,
    palette: source.palette,
    ctaLabel: source.ctaLabel,
    status: "draft",
    startsAt: nextYear(source.startsAt),
    endsAt: nextYear(source.endsAt),
    sale: {
      type: source.sale.type,
      value: source.sale.value,
      scope: source.sale.scope,
      categories: source.sale.categories,
      products: source.sale.products,
      excludeProducts: source.sale.excludeProducts,
    },
    notify: { pushOnLaunch: source.notify?.pushOnLaunch || false, sentAt: null },
    createdBy: adminId,
  });
  await copy.save();
  return copy;
};

export const setBanner = async (
  id: string,
  variant: "desktop" | "mobile",
  file: { path: string; filename: string },
) => {
  const campaign = await getCampaign(id);
  const field = variant === "mobile" ? "bannerMobile" : "bannerDesktop";
  const previous = campaign[field];
  campaign[field] = { url: file.path, publicId: file.filename };
  await campaign.save();
  if (previous?.publicId) await deleteImage(previous.publicId).catch(() => undefined);
  clearCampaignCache();
  return campaign;
};

export const removeBanner = async (id: string, variant: "desktop" | "mobile") => {
  const campaign = await getCampaign(id);
  const field = variant === "mobile" ? "bannerMobile" : "bannerDesktop";
  const previous = campaign[field];
  campaign[field] = undefined;
  await campaign.save();
  if (previous?.publicId) await deleteImage(previous.publicId).catch(() => undefined);
  clearCampaignCache();
  return campaign;
};

// ---------------------------------------------------------------------------
// Launch notifications
// ---------------------------------------------------------------------------

const pushText = (campaign: ICampaign) => {
  const label = saleLabel(campaign);
  const ends = new Date(campaign.endsAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "Asia/Kathmandu",
  });
  return {
    title: [campaign.emoji, campaign.headline].filter(Boolean).join(" "),
    body: [campaign.greeting, label ? `${label} — until ${ends}.` : `Shop now until ${ends}.`]
      .filter(Boolean)
      .join(" "),
  };
};

const sendLaunchPush = async (campaign: ICampaign): Promise<void> => {
  const { title, body } = pushText(campaign);
  await sendPromotionalNotification(title, body, { campaign: campaign.slug, screen: "sale" });
};

/**
 * Push for live campaigns that asked for one. Each campaign is claimed with a
 * conditional update first, so concurrent runs never notify twice.
 */
export const launchDueCampaigns = async (): Promise<number> => {
  const now = new Date();
  let sent = 0;
  for (;;) {
    const campaign = await Campaign.findOneAndUpdate(
      {
        status: "published",
        startsAt: { $lte: now },
        endsAt: { $gt: now },
        "notify.pushOnLaunch": true,
        "notify.sentAt": null,
      },
      { $set: { "notify.sentAt": now } },
      { new: true },
    );
    if (!campaign) return sent;
    await sendLaunchPush(campaign);
    sent++;
  }
};

/** Admin "send now" (also marks it sent so it isn't repeated at launch) */
export const notifyNow = async (id: string): Promise<ICampaign> => {
  const campaign = await getCampaign(id);
  if (campaign.status !== "published") throw new AppError("Publish the campaign before notifying customers", 400);
  campaign.notify.sentAt = new Date();
  await campaign.save();
  await sendLaunchPush(campaign);
  return campaign;
};

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export const campaignStats = async (id: string) => {
  const campaignId = new Types.ObjectId(String((await getCampaign(id))._id));
  const [row] = await Order.aggregate([
    { $match: { "items.campaign": campaignId, status: { $ne: "cancelled" } } },
    { $unwind: "$items" },
    { $match: { "items.campaign": campaignId } },
    {
      $group: {
        _id: null,
        orders: { $addToSet: "$_id" },
        units: { $sum: "$items.quantity" },
        revenue: { $sum: "$items.subtotal" },
        savings: {
          $sum: {
            $multiply: [{ $subtract: [{ $ifNull: ["$items.originalPrice", "$items.price"] }, "$items.price"] }, "$items.quantity"],
          },
        },
      },
    },
  ]);
  return {
    orders: row ? row.orders.length : 0,
    units: row?.units || 0,
    revenue: row?.revenue || 0,
    savings: row?.savings || 0,
  };
};

export const getPresets = () => ({ festivals: FESTIVALS, palettes: PALETTES, maxPercent: MAX_PERCENT });
