/**
 * Campaigns API
 * The festival/event campaign running now (home banner, sale list)
 */
import { baseApi } from "./baseApi";
import type { IApiResponse, IPublicCampaign } from "@shared/types";

export const campaignsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getLiveCampaign: builder.query<IPublicCampaign | null, void>({
      query: () => "/campaigns/live",
      transformResponse: (response: IApiResponse<{ campaign: IPublicCampaign | null }>) =>
        response.data.campaign,
      // Campaigns change rarely; refreshed on pull-to-refresh and app restart
      keepUnusedDataFor: 300,
    }),
  }),
});

export const { useGetLiveCampaignQuery } = campaignsApi;
