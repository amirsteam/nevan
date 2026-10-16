/**
 * VisitEvent Model
 * One thing a shopper did on the website (a page or product viewed, a search,
 * an add to cart, checkout started, an order placed). Written in batches by
 * POST /analytics/events and read by the admin Visitors page. Kept 90 days.
 */
import mongoose, { Schema, Document, Types } from "mongoose";

export const VISIT_EVENT_TYPES = [
  "page_view",
  "product_view",
  "search",
  "add_to_cart",
  "checkout_start",
  "order_placed",
] as const;

export type VisitEventType = (typeof VISIT_EVENT_TYPES)[number];

/** How long visit records are kept */
export const VISIT_RETENTION_DAYS = 90;

export interface IVisitEvent extends Document {
  /** Anonymous id kept by the browser */
  visitor: string;
  /** One visit (rotates after 30 minutes idle) */
  session: string;
  /** Signed-in customer, if any */
  user?: Types.ObjectId;
  type: VisitEventType;
  path: string;
  product?: Types.ObjectId;
  query?: string;
  /** Results shown for a search */
  results?: number;
  order?: Types.ObjectId;
  at: Date;
}

const visitEventSchema = new Schema<IVisitEvent>(
  {
    visitor: { type: String, required: true, maxlength: 64 },
    session: { type: String, required: true, maxlength: 64 },
    user: { type: Schema.Types.ObjectId, ref: "User" },
    type: { type: String, enum: VISIT_EVENT_TYPES, required: true },
    path: { type: String, default: "/", maxlength: 300 },
    product: { type: Schema.Types.ObjectId, ref: "Product" },
    query: { type: String, maxlength: 100 },
    results: { type: Number, min: 0 },
    order: { type: Schema.Types.ObjectId, ref: "Order" },
    at: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

visitEventSchema.index({ at: 1 }, { expireAfterSeconds: VISIT_RETENTION_DAYS * 24 * 60 * 60 });
visitEventSchema.index({ type: 1, at: -1 });
visitEventSchema.index({ product: 1, at: -1 }, { partialFilterExpression: { product: { $exists: true } } });
visitEventSchema.index({ session: 1, at: 1 });
visitEventSchema.index({ order: 1 }, { partialFilterExpression: { order: { $exists: true } } });

const VisitEvent = mongoose.model<IVisitEvent>("VisitEvent", visitEventSchema);

export default VisitEvent;
