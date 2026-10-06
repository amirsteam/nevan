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

// One entry per logged-in device/browser. Only a SHA-256 hash of the refresh JWT is stored.
export interface IRefreshSession {
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface IUser extends Document {
  name: string;
  email: string;
  phone?: string;
  password?: string;
  role: "customer" | "admin";
  isActive: boolean;
  refreshSessions: IRefreshSession[];
  lastLogin?: Date;
  pushTokens: IPushToken[];
  wishlist: Types.ObjectId[];
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  resetPasswordAttempts?: number;
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
    refreshSessions: {
      type: [
        new Schema<IRefreshSession>(
          {
            tokenHash: { type: String, required: true },
            expiresAt: { type: Date, required: true },
            createdAt: { type: Date, default: Date.now },
          },
          { _id: false },
        ),
      ],
      default: [],
      select: false,
    },
    lastLogin: { type: Date },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
    resetPasswordAttempts: { type: Number, default: 0, select: false },
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
  // Generate 6-digit OTP (cryptographically secure)
  const otp = crypto.randomInt(100000, 1000000).toString();

  // Hash the OTP before storing
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(otp)
    .digest("hex");

  // Token expires in 10 minutes; a new code resets the wrong-guess counter
  this.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000);
  this.resetPasswordAttempts = 0;

  return otp;
};

// Add indexes for frequently queried fields
userSchema.index({ isActive: 1 }); // Filter active users
userSchema.index({ resetPasswordToken: 1, resetPasswordExpires: 1 }); // Password reset queries

const User = mongoose.model<IUser>("User", userSchema);
export default User;
