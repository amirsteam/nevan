import { describe, it, expect } from "vitest";
import { displayPrice, cardPrice } from "./pricing";
import { saleText, timeLeft } from "./campaign";
import type { IProduct, IPublicCampaign } from "../types";

const campaign = { slug: "tihar", name: "Tihar Sale", endsAt: "2026-11-03T00:00:00.000Z" };
const base = { _id: "p1", name: "Romper", slug: "romper", description: "", category: "c", images: [], stock: 5 };

describe("displayPrice", () => {
  it("shows the sale price with the pre-sale price struck through", () => {
    const product = { ...base, price: 2000, sale: { price: 1700, originalPrice: 2000, percentOff: 15, campaign } } as IProduct;
    expect(displayPrice(product)).toEqual({ price: 1700, was: 2000, percentOff: 15, campaign });
  });

  it("keeps a higher compare-at price as the 'was' price", () => {
    const product = { ...base, price: 2000, comparePrice: 2500, sale: { price: 1700, originalPrice: 2000, percentOff: 15, campaign } } as IProduct;
    expect(displayPrice(product)).toMatchObject({ price: 1700, was: 2500, percentOff: 32 });
  });

  it("uses variant sale prices, and plain prices when nothing is on sale", () => {
    const product = {
      ...base,
      price: 1000,
      variants: [
        { _id: "v1", size: "S", color: "Red", price: 1000, stock: 2, salePrice: 850 },
        { _id: "v2", size: "M", color: "Red", price: 1200, stock: 2 },
      ],
    } as IProduct;
    expect(displayPrice(product, product.variants![0]).price).toBe(850);
    expect(displayPrice(product, product.variants![1])).toMatchObject({ price: 1200, was: null, campaign: null });
    expect(cardPrice(product)).toMatchObject({ price: 850, from: true });
  });
});

describe("campaign text", () => {
  const sale = (overrides: Partial<IPublicCampaign["sale"]>) =>
    ({ sale: { type: "percent", value: 15, scope: "all", label: "15% off", categories: [], ...overrides } }) as IPublicCampaign;

  it("describes the offer", () => {
    expect(saleText(sale({}))).toBe("15% off everything");
    expect(saleText(sale({ scope: "categories", categories: [{ _id: "1", name: "Rompers", slug: "r" }, { _id: "2", name: "Jhablas", slug: "j" }] }))).toBe(
      "15% off Rompers & Jhablas",
    );
    expect(saleText(sale({ scope: "products" }))).toBe("15% off selected items");
    expect(saleText(sale({ label: null }))).toBeNull();
  });

  it("formats time left", () => {
    const now = Date.parse("2026-11-01T00:00:00Z");
    expect(timeLeft("2026-11-03T04:00:00Z", now)).toBe("2d 4h left");
    expect(timeLeft("2026-11-01T05:30:00Z", now)).toBe("5h 30m left");
    expect(timeLeft("2026-11-01T00:30:00Z", now)).toBe("Ending soon");
    expect(timeLeft("2026-10-31T00:00:00Z", now)).toBe("Ended");
  });
});
