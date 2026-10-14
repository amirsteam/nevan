/**
 * Shipping charge: one flat fee per order by destination — the Kathmandu
 * Valley rate, otherwise the province's rate — and nothing for free-delivery
 * areas or when the subtotal (after sale prices) reaches the threshold.
 * Admins edit the numbers (services/shippingService.ts); these defaults apply
 * until they do. Clients show the API's figures (GET /shipping/settings,
 * POST /orders/shipping-quote); the offline-preview copies in
 * frontend/src/utils/helpers.ts and mobile/src/theme/store.ts use the defaults.
 */
import AppError from "./AppError";
import { canonicalDistrict } from "./nepal";

export interface FreeArea {
  district: string;
  city?: string;
}

export interface ShippingSettings {
  freeShippingThreshold: number;
  valleyRate: number;
  /** Province 1–7 -> NPR */
  provinceRates: Record<number, number>;
  freeAreas: FreeArea[];
}

/** Kathmandu Valley districts (province 3) get the valley rate */
export const VALLEY_DISTRICTS: readonly string[] = ["Kathmandu", "Lalitpur", "Bhaktapur"];

export const DEFAULT_SHIPPING_SETTINGS: Readonly<ShippingSettings> = {
  freeShippingThreshold: 5000,
  valleyRate: 100,
  provinceRates: {
    1: 250, // Koshi
    2: 250, // Madhesh
    3: 150, // Bagmati (outside the valley)
    4: 200, // Gandaki
    5: 250, // Lumbini
    6: 300, // Karnali
    7: 300, // Sudurpashchim
  },
  // The shop is in Panauti, Kavre: local deliveries are free
  freeAreas: [{ district: "Kavrepalanchok" }],
};

export interface ShippingDestination {
  province: number;
  district: string;
  city?: string;
}

/** "Panauti-7, Kavre" -> " panauti kavre " (padded, for whole-word matching) */
const placeKey = (name: string): string =>
  ` ${String(name ?? "")
    .toLowerCase()
    .replace(/[^a-z]+/g, " ")
    .trim()} `;

/** Whether the address is in one of the free-delivery areas */
export const isFreeArea = (address: ShippingDestination, freeAreas: readonly FreeArea[]): boolean => {
  const district = canonicalDistrict(address.province, address.district);
  if (!district) return false;
  return freeAreas.some((area) => {
    if (area.district !== district) return false;
    if (!area.city?.trim()) return true;
    return placeKey(address.city ?? "").includes(placeKey(area.city));
  });
};

export const calculateShippingCost = (
  address: ShippingDestination,
  subtotal: number,
  settings: ShippingSettings = DEFAULT_SHIPPING_SETTINGS,
): number => {
  const rate = settings.provinceRates[address.province];
  if (rate === undefined) throw new AppError("Province must be between 1 and 7", 400);

  if (subtotal >= settings.freeShippingThreshold) return 0;
  if (isFreeArea(address, settings.freeAreas)) return 0;

  // Addresses are validated to a standard district name; older saved ones may not be
  const district = canonicalDistrict(address.province, address.district) ?? address.district;
  if (address.province === 3 && VALLEY_DISTRICTS.includes(district)) return settings.valleyRate;

  return rate;
};
