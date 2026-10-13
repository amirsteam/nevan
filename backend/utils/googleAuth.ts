/**
 * Google Sign-In
 * Verifies Google ID tokens from the web (Google Identity Services) and the
 * mobile app (native Google Sign-In). Both send the token to POST /auth/google.
 */
import { OAuth2Client } from "google-auth-library";
import AppError from "./AppError";

export interface GoogleProfile {
  sub: string;
  email: string;
  name?: string;
}

const client = new OAuth2Client();

/** OAuth client IDs whose tokens are accepted (web, Android, iOS) */
const getClientIds = (): string[] =>
  (process.env.GOOGLE_CLIENT_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

export const isGoogleSignInConfigured = (): boolean => getClientIds().length > 0;

/**
 * Check the token's signature, issuer, audience and expiry, and that Google has
 * verified the email. Throws a 401 AppError for any invalid token.
 */
export const verifyGoogleIdToken = async (idToken: string): Promise<GoogleProfile> => {
  const audience = getClientIds();
  if (!audience.length) {
    throw new AppError("Google sign-in is not configured", 503);
  }

  let payload;
  try {
    const ticket = await client.verifyIdToken({ idToken, audience });
    payload = ticket.getPayload();
  } catch {
    throw new AppError("Google sign-in failed. Please try again.", 401);
  }

  if (!payload?.sub || !payload.email || payload.email_verified !== true) {
    throw new AppError("Google sign-in failed. Please try again.", 401);
  }

  return { sub: payload.sub, email: payload.email, name: payload.name };
};
