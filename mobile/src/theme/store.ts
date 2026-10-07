/**
 * Store facts for the mobile app — a copy of the parts of shared/store.ts
 * (and frontend/src/utils/nepal.ts) the app needs. Kept as a copy because
 * Metro doesn't bundle files outside mobile/. Keep in sync with:
 *   - shared/store.ts (contact details, free-shipping threshold)
 *   - calculateShippingCost in backend/services/orderService.ts (what the
 *     customer is actually charged)
 */

export const CONTACT = {
  email: "anjanastha101@gmail.com",
  phoneDisplay: "+977 9844575932",
  phoneHref: "tel:+9779844575932",
  whatsappHref: "https://wa.me/9779844575932",
} as const;

export const FREE_SHIPPING_THRESHOLD = 5000;

export const PROVINCE_NAMES: Record<number, string> = {
  1: "Koshi",
  2: "Madhesh",
  3: "Bagmati",
  4: "Gandaki",
  5: "Lumbini",
  6: "Karnali",
  7: "Sudurpashchim",
};

const VALLEY_DISTRICTS = ["kathmandu", "lalitpur", "bhaktapur"];

const PROVINCE_RATES: Record<number, number> = {
  1: 250,
  2: 250,
  3: 150,
  4: 200,
  5: 250,
  6: 300,
  7: 300,
};

/** Shipping cost in NPR (preview; the API computes the real charge the same way) */
export const calculateShippingCost = (subtotal: number, province: number, district: string): number => {
  if (subtotal >= FREE_SHIPPING_THRESHOLD) return 0;
  if (province === 3 && VALLEY_DISTRICTS.includes(district.trim().toLowerCase())) return 100;
  return PROVINCE_RATES[province] || 200;
};

/** Mobile numbers: 98/97 + 8 digits, optionally prefixed with +977 */
export const NEPALI_MOBILE = /^(\+?977)?9[78]\d{8}$/;

export const normalizePhone = (phone: string): string => phone.replace(/[\s-]/g, "");

export const formatNPR = (amount: number): string => `Rs. ${Math.round(amount).toLocaleString("en-IN")}`;
