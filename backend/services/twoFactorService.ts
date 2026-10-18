/**
 * Two-step login for admin accounts: authenticator-app codes (TOTP, RFC 6238),
 * one-time backup codes and "remember this browser". Pure helpers over a user
 * document; authService decides when they apply and saves the user.
 *
 * Secrets are stored encrypted (AES-256-GCM) with TWO_FACTOR_KEY: 32 random
 * bytes as 64 hex characters (or base64). Generate one with
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 * Changing the key makes every admin set up their authenticator again.
 */
import crypto from "crypto";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";
import type { ITwoFactor, IUser } from "../models/User";
import AppError from "../utils/AppError";
import { hashToken } from "../utils/tokenUtils";

const ISSUER = "Nevan Handicraft";
const PERIOD_SECONDS = 30;
const BACKUP_CODE_COUNT = 10;
const MAX_TRUSTED_DEVICES = 5;
export const TRUSTED_DEVICE_DAYS = 30;
const MAX_FAILED_ATTEMPTS = 10;
const LOCK_MINUTES = 15;
// Backup codes: no 0/O, 1/I/L, so they can be read off paper
const BACKUP_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

// ==================== Encryption ====================

const encryptionKey = (): Buffer | null => {
  const raw = (process.env.TWO_FACTOR_KEY || "").trim();
  if (!raw) {
    // Development only: a key derived from the JWT secret, so local admins can sign in
    if (process.env.NODE_ENV !== "production" && process.env.JWT_ACCESS_SECRET) {
      return crypto.createHash("sha256").update(`two-factor:${process.env.JWT_ACCESS_SECRET}`).digest();
    }
    return null;
  }
  const key = /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  return key.length === 32 ? key : null;
};

/** TWO_FACTOR_KEY is set and valid (admins can't sign in without it) */
export const isTwoFactorConfigured = (): boolean => encryptionKey() !== null;

const requireKey = (): Buffer => {
  const key = encryptionKey();
  if (!key) {
    throw new AppError(
      "Two-step login isn't set up on this server yet (TWO_FACTOR_KEY). Admin sign-in is paused until it is.",
      503,
    );
  }
  return key;
};

const encrypt = (plain: string): string => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", requireKey(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), data.toString("base64")].join(".");
};

const decrypt = (stored: string): string => {
  const [version, iv, tag, data] = stored.split(".");
  if (version !== "v1" || !iv || !tag || !data) throw new AppError("Two-step login data is unreadable", 500);
  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", requireKey(), Buffer.from(iv, "base64"));
    decipher.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
  } catch {
    // Wrong or changed TWO_FACTOR_KEY
    throw new AppError(
      "Two-step login can't be checked (the server's TWO_FACTOR_KEY changed). Another admin can reset it for you.",
      503,
    );
  }
};

// ==================== State ====================

/** The user's two-step state, created empty when missing (load with +twoFactor) */
export const stateOf = (user: IUser): ITwoFactor => {
  if (!user.twoFactor) {
    user.twoFactor = { backupCodes: [], trustedDevices: [], failedAttempts: 0, version: 0 };
  }
  return user.twoFactor;
};

const totpFor = (user: IUser, base32: string) =>
  new OTPAuth.TOTP({
    issuer: ISSUER,
    label: user.email,
    algorithm: "SHA1",
    digits: 6,
    period: PERIOD_SECONDS,
    secret: OTPAuth.Secret.fromBase32(base32),
  });

/** Turned away for a while after too many wrong codes */
export const assertNotLocked = (user: IUser): void => {
  const lockedUntil = user.twoFactor?.lockedUntil;
  if (lockedUntil && new Date(lockedUntil).getTime() > Date.now()) {
    const minutes = Math.ceil((new Date(lockedUntil).getTime() - Date.now()) / 60000);
    throw new AppError(`Too many wrong codes. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`, 429);
  }
};

/**
 * Count a wrong code. The tenth locks two-step login for 15 minutes and ends
 * every pending sign-in (the password must be entered again).
 */
export const recordFailure = (user: IUser): void => {
  const state = stateOf(user);
  state.failedAttempts = (state.failedAttempts || 0) + 1;
  if (state.failedAttempts >= MAX_FAILED_ATTEMPTS) {
    state.failedAttempts = 0;
    state.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
    state.version = (state.version || 0) + 1;
  }
};

const clearFailures = (user: IUser): void => {
  const state = stateOf(user);
  state.failedAttempts = 0;
  state.lockedUntil = undefined;
};

// ==================== Authenticator codes ====================

const normalizeCode = (code: unknown): string => String(code ?? "").replace(/\s+/g, "");

/**
 * Check a 6-digit code against a secret (±30 s for clock drift). A code is
 * accepted once: a step at or before the last one used is refused.
 */
const matchCode = (user: IUser, encryptedSecret: string | undefined, code: unknown): boolean => {
  const token = normalizeCode(code);
  if (!encryptedSecret || !/^\d{6}$/.test(token)) return false;
  const delta = totpFor(user, decrypt(encryptedSecret)).validate({ token, window: 1 });
  if (delta === null) return false;
  const step = Math.floor(Date.now() / 1000 / PERIOD_SECONDS) + delta;
  const state = stateOf(user);
  if (state.lastUsedStep !== undefined && step <= state.lastUsedStep) return false;
  state.lastUsedStep = step;
  return true;
};

/** A code from the authenticator app the account uses now */
export const checkCode = (user: IUser, code: unknown): boolean => {
  const ok = matchCode(user, stateOf(user).secret, code);
  if (ok) clearFailures(user);
  return ok;
};

/** A code from the app being set up (first setup or a new phone) */
export const checkPendingCode = (user: IUser, code: unknown): boolean => {
  const state = stateOf(user);
  // The new app's codes have their own clock: forget the old app's last step
  const previousStep = state.lastUsedStep;
  state.lastUsedStep = undefined;
  const ok = matchCode(user, state.pendingSecret, code);
  if (!ok) state.lastUsedStep = previousStep;
  else clearFailures(user);
  return ok;
};

/** Start setting up an authenticator: a new secret, waiting for its first code */
export const beginSetup = async (user: IUser) => {
  const state = stateOf(user);
  const secret = new OTPAuth.Secret({ size: 20 });
  state.pendingSecret = encrypt(secret.base32);
  const otpauthUrl = totpFor(user, secret.base32).toString();
  return {
    otpauthUrl,
    qrCode: await QRCode.toDataURL(otpauthUrl, { margin: 1, width: 240, errorCorrectionLevel: "M" }),
    // For typing into the app by hand, in groups of four
    manualKey: secret.base32.replace(/(.{4})/g, "$1 ").trim(),
  };
};

/** The pending authenticator becomes the account's one */
export const adoptPendingSecret = (user: IUser): void => {
  const state = stateOf(user);
  if (!state.pendingSecret) throw new AppError("Start the setup again", 400);
  state.secret = state.pendingSecret;
  state.pendingSecret = undefined;
  state.enabledAt = new Date();
  state.version = (state.version || 0) + 1;
  user.twoFactorEnabled = true;
};

// ==================== Backup codes ====================

const normalizeBackupCode = (code: unknown): string => String(code ?? "").toUpperCase().replace(/[^0-9A-Z]/g, "");

/** New backup codes (shown once; only hashes are kept) */
export const issueBackupCodes = (user: IUser): string[] => {
  const codes = Array.from({ length: BACKUP_CODE_COUNT }, () => {
    const chars = Array.from({ length: 10 }, () => BACKUP_ALPHABET[crypto.randomInt(BACKUP_ALPHABET.length)]).join("");
    return `${chars.slice(0, 5)}-${chars.slice(5)}`;
  });
  stateOf(user).backupCodes = codes.map((code) => hashToken(normalizeBackupCode(code)));
  return codes;
};

/** Use up one backup code */
export const useBackupCode = (user: IUser, code: unknown): boolean => {
  const normalized = normalizeBackupCode(code);
  if (normalized.length !== 10) return false;
  const state = stateOf(user);
  const hash = hashToken(normalized);
  const index = state.backupCodes.indexOf(hash);
  if (index === -1) return false;
  state.backupCodes.splice(index, 1);
  clearFailures(user);
  return true;
};

// ==================== Remembered browsers ====================

/** Remember this browser: the returned token goes into an httpOnly cookie */
export const trustDevice = (user: IUser, label?: string): { token: string; expiresAt: Date } => {
  const state = stateOf(user);
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + TRUSTED_DEVICE_DAYS * 24 * 60 * 60 * 1000);
  const now = Date.now();
  const kept = (state.trustedDevices || []).filter((d) => new Date(d.expiresAt).getTime() > now);
  kept.push({ tokenHash: hashToken(token), expiresAt, label: label?.slice(0, 120), createdAt: new Date() });
  state.trustedDevices = kept.slice(-MAX_TRUSTED_DEVICES);
  return { token, expiresAt };
};

export const isTrustedDevice = (user: IUser, token: unknown): boolean => {
  if (typeof token !== "string" || !token || !user.twoFactorEnabled) return false;
  const hash = hashToken(token);
  const now = Date.now();
  return (user.twoFactor?.trustedDevices || []).some((d) => d.tokenHash === hash && new Date(d.expiresAt).getTime() > now);
};

export const forgetDevices = (user: IUser): void => {
  stateOf(user).trustedDevices = [];
};

// ==================== Reset ====================

/** Turn two-step login off so the admin sets it up again at their next sign-in */
export const resetState = (user: IUser): void => {
  const version = (user.twoFactor?.version || 0) + 1;
  user.twoFactor = { backupCodes: [], trustedDevices: [], failedAttempts: 0, version };
  user.twoFactorEnabled = false;
};

/** What the admin's Security page shows */
export const statusOf = (user: IUser) => ({
  enabled: !!user.twoFactorEnabled,
  enabledAt: user.twoFactor?.enabledAt || null,
  backupCodesLeft: user.twoFactor?.backupCodes?.length || 0,
  rememberedBrowsers: (user.twoFactor?.trustedDevices || []).filter((d) => new Date(d.expiresAt).getTime() > Date.now())
    .length,
  replacing: !!user.twoFactor?.pendingSecret && !!user.twoFactorEnabled,
});
