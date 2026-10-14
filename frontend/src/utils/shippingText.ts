/**
 * Shipping figures for display (shipping page, FAQ, cart), worked out from the
 * settings admins saved so the pages always say what checkout will charge.
 */
import { deliveryEstimateFor } from "../config/store";
import { PROVINCE_NAMES } from "./nepal";
import { VALLEY_DISTRICTS } from "./helpers";
import type { IShippingSettings } from "../types";

const PROVINCES = Object.keys(PROVINCE_NAMES).map(Number);

/** Lowest and highest fee below the free-shipping threshold */
export const shippingRange = (settings: IShippingSettings): { min: number; max: number } => {
  const fees = [settings.valleyRate, ...PROVINCES.map((p) => settings.provinceRates[p] ?? 0)];
  return { min: Math.min(...fees), max: Math.max(...fees) };
};

/** ["Kavrepalanchok district", "Panauti (Kavrepalanchok)"] */
export const freeAreaNames = (settings: IShippingSettings): string[] =>
  settings.freeAreas.map((area) => (area.city ? `${area.city} (${area.district})` : `${area.district} district`));

export interface ShippingZoneRow {
  zone: string;
  delivery: string;
  cost: number;
}

/** Kathmandu Valley first, then every province */
export const shippingZoneRows = (settings: IShippingSettings): ShippingZoneRow[] => [
  {
    zone: `Kathmandu Valley (${(settings.valleyDistricts ?? VALLEY_DISTRICTS).join(", ")})`,
    delivery: deliveryEstimateFor(3),
    cost: settings.valleyRate,
  },
  ...PROVINCES.map((p) => ({
    zone: p === 3 ? `${PROVINCE_NAMES[p]} Province (outside the valley)` : `${PROVINCE_NAMES[p]} Province`,
    delivery: deliveryEstimateFor(p),
    cost: settings.provinceRates[p] ?? 0,
  })),
];
