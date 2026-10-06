/**
 * Shared access-token refresh for the mobile app (axios, RTK Query, chat socket).
 * Single-flight: concurrent callers share one /auth/refresh-token request, since
 * the API rotates refresh tokens on every refresh.
 */
import axios from "axios";
import { getItem, setItem, deleteItem } from "../utils/storage";
import { getApiUrl } from "../utils/config";

let inFlight: Promise<string | null> | null = null;

/** Exchange the stored refresh token for new tokens; null if the session is over */
export const refreshTokens = (): Promise<string | null> => {
  if (!inFlight) {
    inFlight = (async () => {
      const refreshToken = await getItem("refreshToken");
      if (!refreshToken) return null;
      try {
        // Native requests send no Origin header, so the API returns the new
        // refresh token in the body (response envelope: { status, data })
        const response = await axios.post(`${getApiUrl()}/auth/refresh-token`, { refreshToken });
        const { accessToken, refreshToken: newRefreshToken } = response.data?.data ?? {};
        if (!accessToken || !newRefreshToken) throw new Error("Malformed refresh response");
        await setItem("accessToken", accessToken);
        await setItem("refreshToken", newRefreshToken);
        return accessToken as string;
      } catch {
        await deleteItem("accessToken");
        await deleteItem("refreshToken");
        return null;
      }
    })().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
};

/** Seconds until a JWT expires (negative when expired); null if unreadable */
const secondsUntilExpiry = (token: string): number | null => {
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = globalThis.atob ? globalThis.atob(payload) : null;
    if (!json) return null;
    const { exp } = JSON.parse(json) as { exp?: number };
    return typeof exp === "number" ? exp - Date.now() / 1000 : null;
  } catch {
    return null;
  }
};

/** Stored access token, refreshed first if it is expired or about to expire */
export const getValidAccessToken = async (): Promise<string | null> => {
  const token = await getItem("accessToken");
  if (!token) return refreshTokens();
  const remaining = secondsUntilExpiry(token);
  if (remaining !== null && remaining < 30) return refreshTokens();
  return token;
};
