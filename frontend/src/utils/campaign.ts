/**
 * Campaign display helpers (announcement bar, banners, badges)
 */
import type { IPublicCampaign } from "../types";

/** "15% off Rompers & Jhablas", "NPR 200 off everything", or null for look-only campaigns */
export const saleText = (campaign: Pick<IPublicCampaign, "sale">): string | null => {
  const { label, scope, categories } = campaign.sale;
  if (!label) return null;
  if (scope === "categories" && categories.length) {
    const names = categories.map((c) => c.name);
    const list = names.length > 2 ? `${names.slice(0, 2).join(", ")} and more` : names.join(" & ");
    return `${label} ${list}`;
  }
  if (scope === "products") return `${label} selected items`;
  return `${label} everything`;
};

/** "2d 4h left", "5h 12m left", "Ending soon" (under an hour) or "Ended" */
export const timeLeft = (endsAt: string | Date, now: number = Date.now()): string => {
  const ms = new Date(endsAt).getTime() - now;
  if (ms <= 0) return "Ended";
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return "Ending soon";
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  if (days > 0) return `${days}d ${hours}h left`;
  return `${hours}h ${minutes % 60}m left`;
};

/** "2d 4h", "5h 12m" or "a few minutes" until a moment (for "starts in …") */
export const timeUntil = (at: string | Date, now: number = Date.now()): string => {
  const minutes = Math.max(0, Math.floor((new Date(at).getTime() - now) / 60_000));
  if (minutes < 5) return "a few minutes";
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
};

/** "Ends 3 Nov" in Nepal time */
export const endsOn = (endsAt: string | Date): string =>
  `Ends ${new Date(endsAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Kathmandu" })}`;

export const salePath = (slug: string): string => `/sale/${encodeURIComponent(slug)}`;
