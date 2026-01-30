import mongoose, { Schema, Document, Model, Types } from "mongoose";
import bcrypt from "bcrypt";
import crypto from "crypto";

// Push token interface for device notifications
export interface IPushToken {
  token: string;
  platform: "ios" | "android" | "web";
  deviceName?: string;
  createdAt: Date;
}

export interface IUser extends Document {
  name: string;
  email: string;
  phone?: string;
  password?: string;
  role: "customer" | "admin";
  isActive: boolean;
  refreshToken?: string;
  lastLogin?: Date;
  pushTokens: IPushToken[];
  wishlist: Types.ObjectId[];
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  createPasswordResetToken(): string;
}

const pushTokenSchema = new Schema<IPushToken>(
  {
    token: { type: String, required: true },
    platform: { type: String, enum: ["ios", "android", "web"], required: true },
    deviceName: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ["customer", "admin"], default: "customer" },
    isActive: { type: Boolean, default: true },
    pushTokens: { type: [pushTokenSchema], default: [] },
    wishlist: [{ type: Schema.Types.ObjectId, ref: "Product" }],
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
  },
  { timestamps: true },
);

userSchema.pre("save", async function (this: any) {
  if (!this.isModified("password")) return;
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (err: any) {
    throw new Error(err);
  }
});

userSchema.methods.comparePassword = async function (
  this: any,
  candidatePassword: string,
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Generate password reset token (6-digit OTP for mobile)
userSchema.methods.createPasswordResetToken = function (): string {
  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Hash the OTP before storing
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(otp)
    .digest("hex");

  // Token expires in 10 minutes
  this.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000);

  return otp;
};

// Add indexes for frequently queried fields
userSchema.index({ email: 1 }); // Fast email lookups (login, registration check)
userSchema.index({ isActive: 1 }); // Filter active users
userSchema.index({ resetPasswordToken: 1, resetPasswordExpires: 1 }); // Password reset queries

const User = mongoose.model<IUser>("User", userSchema);
export default User;
