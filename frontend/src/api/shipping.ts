/**
 * Shipping API: current rates and free-delivery areas (public)
 */
import api from "./axios";
import type { IApiResponse, IShippingSettings } from "../types";

export const shippingAPI = {
  getSettings: async (): Promise<IApiResponse<{ settings: IShippingSettings }>> => {
    const response = await api.get("/shipping/settings");
    return response.data;
  },
};
