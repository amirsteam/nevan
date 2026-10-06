/**
 * Contact, newsletter and storefront review highlights
 */
import api from "./axios";
import type { IApiResponse } from "../types";

export interface ContactMessageInput {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
}

export interface FeaturedReview {
  _id: string;
  rating: number;
  title?: string;
  comment: string;
  isVerifiedPurchase?: boolean;
  createdAt: string;
  reviewerName: string;
  product: { _id: string; name: string; slug: string } | null;
}

export const contactAPI = {
  sendMessage: async (input: ContactMessageInput): Promise<IApiResponse<Record<string, never>>> => {
    const response = await api.post("/contact", input);
    return response.data;
  },

  subscribe: async (email: string, source = "website"): Promise<IApiResponse<Record<string, never>>> => {
    const response = await api.post("/newsletter/subscribe", { email, source });
    return response.data;
  },
};

export const reviewsAPI = {
  getFeatured: async (limit = 3): Promise<IApiResponse<{ reviews: FeaturedReview[] }>> => {
    const response = await api.get("/reviews/featured", { params: { limit } });
    return response.data;
  },
};

export default contactAPI;
