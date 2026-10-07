/**
 * Festival/event campaigns (public)
 * Admin endpoints are in api/admin.ts
 */
import api from "./axios";
import type { IApiResponse, IPublicCampaign } from "../types";

export const campaignsAPI = {
  /** The campaign running now (null when none); admins can preview any by id */
  getLive: async (previewId?: string | null): Promise<IPublicCampaign | null> => {
    const response = await api.get<IApiResponse<{ campaign: IPublicCampaign | null }>>("/campaigns/live", {
      params: previewId ? { preview: previewId } : undefined,
    });
    return response.data.data.campaign;
  },

  getBySlug: async (slug: string): Promise<IPublicCampaign> => {
    const response = await api.get<IApiResponse<{ campaign: IPublicCampaign }>>(`/campaigns/${encodeURIComponent(slug)}`);
    return response.data.data.campaign;
  },
};

export default campaignsAPI;
