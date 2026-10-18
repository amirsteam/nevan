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
  // Signed in with two-step login (admins: sessions without it are refused)
  mfa?: boolean;
}

// A browser that may skip the two-step code for a while ("Remember this browser")
export interface ITrustedDevice {
  tokenHash: string;
  expiresAt: Date;
  label?: string;
  createdAt: Date;
}

// Two-step login (authenticator app); see services/twoFactorService.ts
export interface ITwoFactor {
  // Encrypted (AES-256-GCM, TWO_FACTOR_KEY); pendingSecret waits for its first code
  secret?: string;
  pendingSecret?: string;
  enabledAt?: Date;
  // Last accepted 30-second step, so a code can't be used twice
  lastUsedStep?: number;
  // SHA-256 hashes of unused backup codes
  backupCodes: string[];
  trustedDevices: ITrustedDevice[];
  failedAttempts: number;
  lockedUntil?: Date;
  // Bumped on reset, replace or lock: older sign-in challenges stop working
  version: number;
}

// Saved delivery address (address book, max MAX_ADDRESSES)
export interface IAddress {
  _id: Types.ObjectId;
  label?: string;
  name: string;
  phone: string;
  street: string;
  city: string;
  district: string;
  province: number;
  landmark?: string;
  isDefault: boolean;
}

export const MAX_ADDRESSES = 5;

export interface IUser extends Document {
  name: string;
  email: string;
  phone?: string;
  password?: string;
  // Accounts created with Google have no password until one is set via Forgot password
  hasPassword: boolean;
  googleId?: string;
  // Proven by Google sign-in or by a completed password reset (registration doesn't verify)
  emailVerified: boolean;
  passwordChangedAt?: Date;
  role: "customer" | "admin";
  // Two-step login is on (admins need it); details live in twoFactor (never sent)
  twoFactorEnabled: boolean;
  twoFactor?: ITwoFactor;
  isActive: boolean;
  refreshSessions: IRefreshSession[];
  lastLogin?: Date;
  pushTokens: IPushToken[];
  wishlist: Types.ObjectId[];
  addresses: Types.DocumentArray<IAddress & Types.Subdocument>;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  resetPasswordAttempts?: number;
  comparePassword(candidatePassword: string): Promise<boolean>;
  createPasswordResetToken(): string;
  changedPasswordAfter(tokenIssuedAt: number): boolean;
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

const addressSchema = new Schema<IAddress>(
  {
    label: { type: String, trim: true, maxlength: 30 },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    street: { type: String, required: true, trim: true, maxlength: 200 },
    city: { type: String, required: true, trim: true, maxlength: 100 },
    district: { type: String, required: true, trim: true, maxlength: 100 },
    province: { type: Number, required: true, min: 1, max: 7 },
    landmark: { type: String, trim: true, maxlength: 200 },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true },
);

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String },
    password: {
      type: String,
      required: function (this: any) {
        return !this.googleId;
      },
      select: false,
    },
    // Defaults to true so accounts saved before Google sign-in read correctly
    hasPassword: { type: Boolean, default: true },
    googleId: { type: String, unique: true, sparse: true },
    emailVerified: { type: Boolean, default: false },
    passwordChangedAt: { type: Date, select: false },
    role: { type: String, enum: ["customer", "admin"], default: "customer" },
    isActive: { type: Boolean, default: true },
    pushTokens: { type: [pushTokenSchema], default: [] },
    wishlist: [{ type: Schema.Types.ObjectId, ref: "Product" }],
    addresses: { type: [addressSchema], default: [] },
    refreshSessions: {
      type: [
        new Schema<IRefreshSession>(
          {
            tokenHash: { type: String, required: true },
            expiresAt: { type: Date, required: true },
            createdAt: { type: Date, default: Date.now },
            mfa: { type: Boolean },
          },
          { _id: false },
        ),
      ],
      default: [],
      select: false,
    },
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactor: {
      type: new Schema<ITwoFactor>(
        {
          secret: { type: String },
          pendingSecret: { type: String },
          enabledAt: { type: Date },
          lastUsedStep: { type: Number },
          backupCodes: { type: [String], default: [] },
          trustedDevices: {
            type: [
              new Schema<ITrustedDevice>(
                {
                  tokenHash: { type: String, required: true },
                  expiresAt: { type: Date, required: true },
                  label: { type: String, maxlength: 120 },
                  createdAt: { type: Date, default: Date.now },
                },
                { _id: false },
              ),
            ],
            default: [],
          },
          failedAttempts: { type: Number, default: 0 },
          lockedUntil: { type: Date },
          version: { type: Number, default: 0 },
        },
        { _id: false },
      ),
      select: false,
    },
    lastLogin: { type: Date },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
    resetPasswordAttempts: { type: Number, default: 0, select: false },
  },
  {
    timestamps: true,
    toJSON: {
      // Responses never carry secrets, even from documents fresh from create()
      transform: (_doc, ret: any) => {
        if (ret.googleId) ret.googleLinked = true;
        delete ret.googleId;
        delete ret.password;
        delete ret.refreshSessions;
        delete ret.resetPasswordToken;
        delete ret.resetPasswordExpires;
        delete ret.resetPasswordAttempts;
        delete ret.passwordChangedAt;
        delete ret.twoFactor;
        return ret;
      },
    },
  },
);

userSchema.pre("save", async function (this: any) {
  if (this.isNew) this.hasPassword = !!this.password;
  if (!this.isModified("password")) return;

  // Access tokens issued before a password change or removal stop working
  if (!this.isNew) this.passwordChangedAt = new Date();

  if (!this.password) {
    this.hasPassword = false;
    return;
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    this.hasPassword = true;
  } catch (err: any) {
    throw new Error(err);
  }
});

userSchema.methods.comparePassword = async function (
  this: any,
  candidatePassword: string,
): Promise<boolean> {
  // Google-only accounts have no password to match
  if (!this.password || typeof candidatePassword !== "string") return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// JWT `iat` has one-second precision, so tokens issued in the same second as the
// change stay valid (the session that made the change keeps working)
userSchema.methods.changedPasswordAfter = function (
  this: any,
  tokenIssuedAt: number,
): boolean {
  if (!this.passwordChangedAt) return false;
  return tokenIssuedAt < Math.floor(this.passwordChangedAt.getTime() / 1000);
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
