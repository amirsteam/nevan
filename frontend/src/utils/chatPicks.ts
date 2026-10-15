/**
 * The two popular pieces on the chat home. Requested once per page visit and
 * started as soon as the shopper reaches for the chat button, so the photos
 * are usually there by the time the window opens.
 */
import { productsAPI } from "../api/products";
import { imageUrl } from "./image";
import type { IProduct } from "../types";

export const CHAT_PICK_COUNT = 2;
/** Card photo width in CSS px (requested at 2x for sharp screens) */
export const CHAT_PICK_IMAGE_WIDTH = 160;

let request: Promise<IProduct[]> | null = null;

export const chatPickPhoto = (product: IProduct) =>
  product.images?.find((img) => img.isPrimary) || product.images?.[0];

export const loadChatPicks = (): Promise<IProduct[]> => {
  request ??= productsAPI
    .getFeatured(CHAT_PICK_COUNT)
    .then((res) => {
      const picks = (res.data.products || []).slice(0, CHAT_PICK_COUNT);
      // Warm the browser cache with the card photos
      picks.forEach((product) => {
        const url = chatPickPhoto(product)?.url;
        if (url) new Image().src = imageUrl(url, CHAT_PICK_IMAGE_WIDTH);
      });
      return picks;
    })
    .catch(() => {
      request = null;
      return [];
    });
  return request;
};
