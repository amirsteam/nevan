/**
 * Shipping settings edited by admins (one document, key "default"): the
 * free-shipping threshold, the Kathmandu Valley rate, a flat rate per province
 * and free-delivery areas. Read through services/shippingService.ts, which
 * falls back to DEFAULT_SHIPPING_SETTINGS until an admin saves.
 */
import mongoose, { Document, Schema, Types } from "mongoose";

export interface IFreeArea {
  /** Standard district name (utils/nepal.ts) */
  district: string;
  /** Optional town within the district; empty = the whole district */
  city?: string;
}

export interface IShippingSettings extends Document {
  key: string;
  freeShippingThreshold: number;
  valleyRate: number;
  /** Province number ("1"–"7") -> NPR */
  provinceRates: Map<string, number>;
  freeAreas: IFreeArea[];
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const freeAreaSchema = new Schema<IFreeArea>(
  {
    district: { type: String, required: true, trim: true, maxlength: 100 },
    city: { type: String, trim: true, maxlength: 100 },
  },
  { _id: false },
);

const shippingSettingsSchema = new Schema<IShippingSettings>(
  {
    key: { type: String, required: true, unique: true, default: "default" },
    freeShippingThreshold: { type: Number, required: true, min: 0 },
    valleyRate: { type: Number, required: true, min: 0 },
    provinceRates: { type: Map, of: Number, required: true },
    freeAreas: { type: [freeAreaSchema], default: [] },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export default mongoose.model<IShippingSettings>("ShippingSettings", shippingSettingsSchema);
