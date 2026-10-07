/**
 * Campaign Model
 * A scheduled festival/event campaign: festive look (banners, palette,
 * greeting) and an optional automatic sale. Sale prices are never written to
 * products; they're computed while the campaign is live
 * (utils/campaignPricing.ts), so a sale starts and ends exactly on schedule.
 */
import mongoose, { Schema, Document, Types } from "mongoose";
import { FESTIVAL_KEYS, PALETTE_KEYS } from "../utils/festivals";

export type SaleType = "none" | "percent" | "fixed";
export type SaleScope = "all" | "categories" | "products";
export type CampaignState = "draft" | "scheduled" | "live" | "ended";

export interface ICampaignImage {
  url: string;
  publicId?: string;
}

export interface ICampaignSale {
  type: SaleType;
  value: number;
  scope: SaleScope;
  categories: Types.ObjectId[];
  products: Types.ObjectId[];
  excludeProducts: Types.ObjectId[];
}

export interface ICampaign extends Document {
  name: string;
  slug: string;
  festival: string;
  headline: string;
  subheadline?: string;
  greeting?: string;
  emoji?: string;
  palette: string;
  ctaLabel: string;
  bannerDesktop?: ICampaignImage;
  bannerMobile?: ICampaignImage;
  startsAt: Date;
  endsAt: Date;
  status: "draft" | "published";
  sale: ICampaignSale;
  notify: { pushOnLaunch: boolean; sentAt?: Date | null };
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const imageSchema = new Schema<ICampaignImage>(
  { url: { type: String, required: true }, publicId: String },
  { _id: false },
);

const campaignSchema = new Schema<ICampaign>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    festival: { type: String, enum: FESTIVAL_KEYS, default: "custom" },
    headline: { type: String, required: true, trim: true, maxlength: 80 },
    subheadline: { type: String, trim: true, maxlength: 160 },
    greeting: { type: String, trim: true, maxlength: 80 },
    emoji: { type: String, trim: true, maxlength: 16 },
    palette: { type: String, enum: PALETTE_KEYS, default: "brand" },
    ctaLabel: { type: String, trim: true, maxlength: 30, default: "Shop the sale" },
    bannerDesktop: imageSchema,
    bannerMobile: imageSchema,
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    status: { type: String, enum: ["draft", "published"], default: "draft" },
    sale: {
      type: { type: String, enum: ["none", "percent", "fixed"], default: "none" },
      value: { type: Number, default: 0, min: 0 },
      scope: { type: String, enum: ["all", "categories", "products"], default: "all" },
      categories: [{ type: Schema.Types.ObjectId, ref: "Category" }],
      products: [{ type: Schema.Types.ObjectId, ref: "Product" }],
      excludeProducts: [{ type: Schema.Types.ObjectId, ref: "Product" }],
    },
    notify: {
      pushOnLaunch: { type: Boolean, default: false },
      sentAt: { type: Date, default: null },
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

campaignSchema.index({ status: 1, startsAt: 1, endsAt: 1 });

/** Draft / scheduled / live / ended, from status and dates (never stored) */
export const campaignState = (
  campaign: Pick<ICampaign, "status" | "startsAt" | "endsAt">,
  now: Date = new Date(),
): CampaignState => {
  if (campaign.status !== "published") return "draft";
  if (now < new Date(campaign.startsAt)) return "scheduled";
  if (now >= new Date(campaign.endsAt)) return "ended";
  return "live";
};

const Campaign = mongoose.model<ICampaign>("Campaign", campaignSchema);

export default Campaign;
