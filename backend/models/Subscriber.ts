/**
 * Subscriber Model
 * Newsletter sign-ups from the storefront
 */
import mongoose, { Schema, Document } from "mongoose";

export interface ISubscriber extends Document {
  email: string;
  source: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const subscriberSchema = new Schema<ISubscriber>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    // Where the sign-up came from (e.g. "home", "footer")
    source: { type: String, trim: true, maxlength: 30, default: "website" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

subscriberSchema.index({ createdAt: -1 });

const Subscriber = mongoose.model<ISubscriber>("Subscriber", subscriberSchema);

export default Subscriber;
