/**
 * Store facts shown to shoppers (web; mobile keeps a copy in
 * mobile/src/theme/store.ts). Anything the site promises — shipping cost,
 * delivery times, contact details — should come from here so pages can't
 * disagree with each other or with the API.
 */

export const STORE_NAME = "Nevan Handicraft";

export const CONTACT = {
  email: "anjanastha101@gmail.com",
  phoneDisplay: "+977 9844575932",
  phoneHref: "tel:+9779844575932",
  whatsappHref: "https://wa.me/9779844575932",
  address: "Panauti, Kavre, Nepal",
  facebook: "https://www.facebook.com/nevancollections",
  instagram: "https://www.instagram.com/nevancollection/",
  // Shown in the chat widget and on the contact page
  replyTime: "We usually reply within a few hours (10am–7pm, Sun–Fri)",
} as const;

/**
 * Must match calculateShippingCost in backend/services/orderService.ts — the
 * API is what actually charges the customer.
 */
export const FREE_SHIPPING_THRESHOLD = 5000;

export interface ShippingZone {
  zone: string;
  cost: number;
  delivery: string;
}

export const SHIPPING_ZONES: ShippingZone[] = [
  { zone: "Kathmandu Valley (Kathmandu, Lalitpur, Bhaktapur)", cost: 100, delivery: "3–5 business days" },
  { zone: "Rest of Bagmati Province", cost: 150, delivery: "3–5 business days" },
  { zone: "Gandaki Province", cost: 200, delivery: "5–7 business days" },
  { zone: "Koshi, Madhesh and Lumbini Provinces", cost: 250, delivery: "5–7 business days" },
  { zone: "Karnali and Sudurpashchim Provinces", cost: 300, delivery: "7–10 business days" },
];

export const DELIVERY_ESTIMATE = "3–5 business days in Kathmandu Valley, 5–10 days elsewhere";

/** Short delivery estimate for a province (checkout); matches SHIPPING_ZONES */
export const deliveryEstimateFor = (province?: number): string => {
  if (!province) return DELIVERY_ESTIMATE;
  if (province === 3) return "3–5 business days";
  if (province === 6 || province === 7) return "7–10 business days";
  return "5–7 business days";
};

export const RETURN_WINDOW_DAYS = 7;

// Age bands for "Shop by Age" and the shop filter. Must match AGE_GROUPS in
// backend/utils/constants.ts (the API rejects other values).
export const AGE_GROUPS = [
  "0-3 Months",
  "3-6 Months",
  "6-12 Months",
  "1-2 Years",
  "2-4 Years",
  "4-6 Years",
  "6-10 Years",
] as const;

export type AgeGroup = (typeof AGE_GROUPS)[number];

/** "0-3 Months" -> "0–3 months" */
export const formatAgeGroup = (age: string): string => age.replace("-", "–").replace(/Months|Years/, (w) => w.toLowerCase());

export const PRODUCT_GENDERS = ["boy", "girl", "unisex"] as const;

export type ProductGender = (typeof PRODUCT_GENDERS)[number];

export const GENDER_LABELS: Record<ProductGender, string> = {
  boy: "Boy",
  girl: "Girl",
  unisex: "Unisex",
};

/** Few-left threshold shown on product cards and pages */
export const LOW_STOCK_DISPLAY = 5;
