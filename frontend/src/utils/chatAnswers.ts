/**
 * Instant answers for the chat window's suggested questions. Built from the
 * same store facts and shipping settings as the shop's pages, so the chat
 * never says something checkout or the policy pages contradict. "Track my
 * order" needs the shopper's orders and is answered by the chat home itself.
 */
import { CONTACT, OPENING_HOURS, RETURN_WINDOW_DAYS, deliveryEstimateFor } from "../config/store";
import { PRODUCT_SIZES } from "./constants";
import { formatPrice } from "./helpers";
import { freeAreaNames, shippingRange } from "./shippingText";
import { openStatus } from "./openingHours";
import type { IShippingSettings, OrderStatus } from "../types";

export type QuickQuestionId = "track" | "payment" | "delivery" | "size" | "returns" | "visit";

export interface QuickQuestion {
  id: QuickQuestionId;
  /** Chip text, also shown as the shopper's question */
  label: string;
}

export const QUICK_QUESTIONS: readonly QuickQuestion[] = [
  { id: "track", label: "Track my order" },
  { id: "size", label: "Which size fits my baby?" },
  { id: "delivery", label: "How much is delivery?" },
  { id: "payment", label: "What are the payment options?" },
  { id: "returns", label: "Can I return or exchange?" },
  { id: "visit", label: "Where are you and when are you open?" },
];

export interface AnswerLink {
  label: string;
  to: string;
  /** Opens in a new tab (outside the shop) */
  external?: boolean;
}

export interface QuickAnswer {
  lines: string[];
  links: AnswerLink[];
}

/** Order status in the shopper's words (for "Track my order") */
export const ORDER_STATUS_TEXT: Record<OrderStatus, string> = {
  pending: "Waiting for confirmation",
  confirmed: "Confirmed",
  processing: "Being prepared",
  shipped: "On its way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const MAP_LINK = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CONTACT.address)}`;

/** "Small (0-12 months)" -> "Small: 0–12 months" */
const sizeLine = (size: string): string => {
  const match = size.match(/^(.+?) \((.+)\)$/);
  return match ? `${match[1]}: ${match[2].replace("-", "–")}` : size;
};

export const quickAnswer = (
  id: Exclude<QuickQuestionId, "track">,
  settings: IShippingSettings,
  now: Date = new Date(),
): QuickAnswer => {
  switch (id) {
    case "payment":
      return {
        lines: [
          "You can pay cash on delivery or with eSewa at checkout.",
          "eSewa orders are confirmed as soon as the payment goes through.",
        ],
        links: [{ label: "Payment FAQs", to: "/faq" }],
      };
    case "delivery": {
      const { min, max } = shippingRange(settings);
      const free = freeAreaNames(settings);
      const fee = min === max ? formatPrice(min) : `${formatPrice(min)}–${formatPrice(max).replace(/^NPR\s*/, "")}`;
      return {
        lines: [
          `Delivery is free on orders of ${formatPrice(settings.freeShippingThreshold)} or more${
            free.length ? `, and always free to ${free.join(", ")}` : ""
          }.`,
          `Otherwise it's one flat fee of ${fee} per order, depending on where you are.`,
          `Kathmandu Valley: ${deliveryEstimateFor(3)}. Elsewhere: ${deliveryEstimateFor(1)} (far west: ${deliveryEstimateFor(7)}).`,
        ],
        links: [{ label: "Shipping rates by area", to: "/shipping" }],
      };
    }
    case "size":
      return {
        lines: [
          `Our sizes go by age: ${PRODUCT_SIZES.filter((s) => s.includes("(")).map(sizeLine).join(", ")}.`,
          "Between sizes? Choose the larger one — little ones grow fast. Every product page has a size chart with measurements.",
        ],
        links: [{ label: "Shop by age", to: "/products" }],
      };
    case "returns":
      return {
        lines: [
          `Yes — within ${RETURN_WINDOW_DAYS} days of delivery, if the item is unworn and unwashed with its tags on. A wrong size or a damaged item is always fine to return.`,
          "Refunds are made 3–5 business days after we receive the item.",
        ],
        links: [{ label: "Returns policy", to: "/returns" }],
      };
    case "visit":
      return {
        lines: [
          `Our workshop is in ${CONTACT.address}.`,
          `We answer ${OPENING_HOURS.label} (${OPENING_HOURS.closedLabel}). Right now: ${openStatus(now).label}.`,
        ],
        links: [
          { label: "Open in Google Maps", to: MAP_LINK, external: true },
          { label: "Contact page", to: "/contact" },
        ],
      };
  }
};
