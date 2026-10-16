/**
 * VisitSession Model
 * One visit to the website: where it came from, on which device, who (only
 * when signed in) and running counts of what happened. Upserted with every
 * batch of events; feeds "online now" and the admin's recent visitors list.
 * Kept as long as its events (90 days after the visit was last active).
 */
import mongoose, { Schema, Document, Types } from "mongoose";
import { VISIT_RETENTION_DAYS } from "./VisitEvent";

export const VISIT_SOURCES = [
  "Facebook",
  "Instagram",
  "Google",
  "WhatsApp",
  "TikTok",
  "Other search",
  "Other sites",
  "Direct",
] as const;

export type VisitSource = (typeof VISIT_SOURCES)[number];
export type VisitDevice = "mobile" | "tablet" | "desktop";

export interface IVisitSession extends Document {
  session: string;
  visitor: string;
  user?: Types.ObjectId;
  startedAt: Date;
  lastSeenAt: Date;
  landingPath: string;
  source: VisitSource;
  /** Website that linked here (for "Other sites") */
  referrerHost?: string;
  utm?: { source?: string; medium?: string; campaign?: string };
  device: VisitDevice;
  pageViews: number;
  productViews: number;
  searches: number;
  addToCarts: number;
  checkouts: number;
  ordered: boolean;
}

const visitSessionSchema = new Schema<IVisitSession>(
  {
    session: { type: String, required: true, unique: true, maxlength: 64 },
    visitor: { type: String, required: true, maxlength: 64 },
    user: { type: Schema.Types.ObjectId, ref: "User" },
    startedAt: { type: Date, required: true },
    lastSeenAt: { type: Date, required: true },
    landingPath: { type: String, default: "/", maxlength: 300 },
    source: { type: String, enum: VISIT_SOURCES, default: "Direct" },
    referrerHost: { type: String, maxlength: 120 },
    utm: {
      source: { type: String, maxlength: 100 },
      medium: { type: String, maxlength: 100 },
      campaign: { type: String, maxlength: 100 },
    },
    device: { type: String, enum: ["mobile", "tablet", "desktop"], default: "desktop" },
    pageViews: { type: Number, default: 0 },
    productViews: { type: Number, default: 0 },
    searches: { type: Number, default: 0 },
    addToCarts: { type: Number, default: 0 },
    checkouts: { type: Number, default: 0 },
    ordered: { type: Boolean, default: false },
  },
  { versionKey: false },
);

visitSessionSchema.index({ lastSeenAt: 1 }, { expireAfterSeconds: VISIT_RETENTION_DAYS * 24 * 60 * 60 });
visitSessionSchema.index({ startedAt: -1 });

const VisitSession = mongoose.model<IVisitSession>("VisitSession", visitSessionSchema);

export default VisitSession;
