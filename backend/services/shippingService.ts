/**
 * Shipping settings: what admins saved, or the defaults until they do.
 * Cached for up to a minute (other server instances pick up a change within
 * that time); saving clears this instance's copy at once.
 */
import { Types } from "mongoose";
import ShippingSettingsModel from "../models/ShippingSettings";
import { cache } from "../utils/cache";
import { DEFAULT_SHIPPING_SETTINGS, ShippingSettings } from "../utils/shipping";

const CACHE_KEY = "shipping:settings";
const CACHE_TTL_SECONDS = 60;

export interface ShippingSettingsView extends ShippingSettings {
  updatedAt: Date | null;
}

const toView = (doc: any): ShippingSettingsView => {
  if (!doc) {
    const { freeShippingThreshold, valleyRate, provinceRates, freeAreas } = DEFAULT_SHIPPING_SETTINGS;
    return { freeShippingThreshold, valleyRate, provinceRates: { ...provinceRates }, freeAreas: freeAreas.map((a) => ({ ...a })), updatedAt: null };
  }
  // lean() returns the Map as a plain object with string keys
  const rates: Record<number, number> = {};
  for (const [province, rate] of Object.entries(doc.provinceRates ?? {})) rates[Number(province)] = Number(rate);
  return {
    freeShippingThreshold: doc.freeShippingThreshold,
    valleyRate: doc.valleyRate,
    provinceRates: { ...DEFAULT_SHIPPING_SETTINGS.provinceRates, ...rates },
    freeAreas: (doc.freeAreas ?? []).map((a: any) => ({ district: a.district, ...(a.city ? { city: a.city } : {}) })),
    updatedAt: doc.updatedAt ?? null,
  };
};

export const getShippingSettings = async (): Promise<ShippingSettingsView> => {
  const cached = cache.get<ShippingSettingsView>(CACHE_KEY);
  if (cached) return cached;
  const settings = toView(await ShippingSettingsModel.findOne({ key: "default" }).lean());
  cache.set(CACHE_KEY, settings, CACHE_TTL_SECONDS);
  return settings;
};

export const clearShippingCache = (): void => {
  cache.delete(CACHE_KEY);
};

/** Input is already validated (validate.ts shippingSettingsValidator) */
export const updateShippingSettings = async (
  input: ShippingSettings,
  adminId: string | Types.ObjectId,
): Promise<ShippingSettingsView> => {
  const doc = await ShippingSettingsModel.findOneAndUpdate(
    { key: "default" },
    {
      $set: {
        freeShippingThreshold: input.freeShippingThreshold,
        valleyRate: input.valleyRate,
        provinceRates: Object.fromEntries(Object.entries(input.provinceRates).map(([p, r]) => [String(p), r])),
        freeAreas: input.freeAreas,
        updatedBy: adminId,
      },
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  ).lean();
  clearShippingCache();
  return toView(doc);
};
