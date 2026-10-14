/**
 * Shipping rates and free-delivery areas as admins set them, fetched once per
 * visit and shared by every page; the defaults show until they arrive (or if
 * the API can't be reached). The API applies the same settings to orders.
 */
import { useEffect, useState } from "react";
import { shippingAPI } from "../api/shipping";
import { DEFAULT_SHIPPING_SETTINGS } from "../utils/helpers";
import type { IShippingSettings } from "../types";

let cached: IShippingSettings | null = null;
let pending: Promise<IShippingSettings> | null = null;
const listeners = new Set<(settings: IShippingSettings) => void>();

const loadSettings = (): Promise<IShippingSettings> => {
  if (!pending) {
    pending = shippingAPI
      .getSettings()
      .then((res) => (cached = res.data.settings))
      .catch(() => {
        pending = null;
        return DEFAULT_SHIPPING_SETTINGS;
      });
  }
  return pending;
};

/** After an admin saves, show the new numbers everywhere without a reload */
export const setShippingSettings = (settings: IShippingSettings): void => {
  cached = settings;
  pending = Promise.resolve(settings);
  listeners.forEach((listener) => listener(settings));
};

export const useShippingSettings = (): IShippingSettings => {
  const [settings, setSettings] = useState<IShippingSettings>(cached ?? DEFAULT_SHIPPING_SETTINGS);

  useEffect(() => {
    listeners.add(setSettings);
    let cancelled = false;
    if (!cached) loadSettings().then((loaded) => !cancelled && setSettings(loaded));
    return () => {
      cancelled = true;
      listeners.delete(setSettings);
    };
  }, []);

  return cached ?? settings;
};
