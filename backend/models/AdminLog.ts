/**
 * Admin activity log: who changed what (roles, refunds, cash collected,
 * product archive/delete, shipping, campaigns, categories). Order status
 * changes are already kept in each order's statusHistory. Kept for a year.
 */
import mongoose, { Document, Schema, Types } from "mongoose";

export interface IAdminLog extends Document {
  admin: Types.ObjectId;
  adminName: string;
  action: string;
  target: { type: string; id?: string; label?: string };
  details?: string;
  createdAt: Date;
}

const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

const adminLogSchema = new Schema<IAdminLog>(
  {
    admin: { type: Schema.Types.ObjectId, ref: "User", required: true },
    adminName: { type: String, default: "" },
    action: { type: String, required: true },
    target: {
      type: { type: String, required: true },
      id: String,
      label: String,
    },
    details: { type: String, maxlength: 500 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

adminLogSchema.index({ createdAt: -1 });
adminLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: ONE_YEAR_SECONDS });

export default mongoose.model<IAdminLog>("AdminLog", adminLogSchema);
