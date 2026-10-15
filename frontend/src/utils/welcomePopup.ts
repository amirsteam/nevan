/**
 * Which welcome popup a visitor gets, and whether they've seen it.
 *
 * - While a campaign with a sale is live (and its "Show a sale popup" is on):
 *   the sale popup, once per visitor per campaign.
 * - Otherwise: the Featured products popup, once per visitor.
 * - At most one popup per visit, and never on pages where it would get in the
 *   way (cart, checkout, sign-in, account, payment results).
 *
 * "Seen" lives in localStorage (per browser); when storage is blocked the
 * popup simply isn't shown, rather than showing on every page.
 */
import type { IPublicCampaign } from "../types";

export type PopupPlan =
  | { kind: "campaign"; key: string; campaign: IPublicCampaign }
  | { kind: "featured"; key: string };

const SEEN_PREFIX = "nevan-popup-seen:";
const SHOWN_THIS_VISIT = "nevan-popup-shown";

// Pages where a popup would interrupt a task
const QUIET_PATHS = [
  "/cart",
  "/checkout",
  "/login",
  "/register",
  "/forgot-password",
  "/order-success",
  "/order-failed",
  "/orders",
  "/profile",
  "/wishlist",
  "/admin",
];

export const isQuietPage = (pathname: string): boolean =>
  QUIET_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));

export const popupPlan = (campaign: IPublicCampaign | null): PopupPlan => {
  if (campaign && campaign.state === "live" && campaign.sale.type !== "none" && campaign.showPopup !== false) {
    return { kind: "campaign", key: `campaign:${campaign._id}`, campaign };
  }
  return { kind: "featured", key: "featured" };
};

const read = (storage: () => Storage, key: string): string | null => {
  try {
    return storage().getItem(key);
  } catch {
    return null;
  }
};

const write = (storage: () => Storage, key: string): boolean => {
  try {
    storage().setItem(key, "1");
    return true;
  } catch {
    return false;
  }
};

const local = () => window.localStorage;
const session = () => window.sessionStorage;

/** True when this visitor may still see the popup (and storage works) */
export const canShowPopup = (plan: PopupPlan): boolean => {
  if (read(session, SHOWN_THIS_VISIT)) return false;
  if (read(local, SEEN_PREFIX + plan.key)) return false;
  // Remember-ability check: without storage the popup would come back on every page
  return write(session, `${SHOWN_THIS_VISIT}:probe`);
};

export const markPopupSeen = (plan: PopupPlan): void => {
  write(local, SEEN_PREFIX + plan.key);
  write(session, SHOWN_THIS_VISIT);
};
