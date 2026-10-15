import { describe, it, expect, beforeEach } from "vitest";
import { canShowPopup, isQuietPage, markPopupSeen, popupPlan } from "./welcomePopup";
import type { IPublicCampaign } from "../types";

const campaign = (overrides: Partial<IPublicCampaign> = {}): IPublicCampaign =>
  ({
    _id: "c1",
    name: "Dashain Sale",
    slug: "dashain-sale",
    state: "live",
    showPopup: true,
    sale: { type: "percent", value: 10, scope: "all", label: "10% off", categories: [] },
    ...overrides,
  }) as IPublicCampaign;

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe("popupPlan", () => {
  it("shows the live sale, once per campaign", () => {
    expect(popupPlan(campaign())).toMatchObject({ kind: "campaign", key: "campaign:c1" });
  });

  it("falls back to Featured products without a live sale or with the popup switched off", () => {
    expect(popupPlan(null)).toEqual({ kind: "featured", key: "featured" });
    expect(popupPlan(campaign({ state: "scheduled" })).kind).toBe("featured");
    expect(popupPlan(campaign({ showPopup: false })).kind).toBe("featured");
    expect(popupPlan(campaign({ sale: { type: "none", value: 0, scope: "all", label: null, categories: [] } })).kind).toBe(
      "featured",
    );
  });
});

describe("once per visitor", () => {
  it("is shown once, and only one popup per visit", () => {
    const featured = popupPlan(null);
    const sale = popupPlan(campaign());
    expect(canShowPopup(featured)).toBe(true);

    markPopupSeen(featured);
    expect(canShowPopup(featured)).toBe(false);
    // Same visit: no second popup even for a sale
    expect(canShowPopup(sale)).toBe(false);

    // A later visit: the sale popup is new, the featured one stays seen
    sessionStorage.clear();
    expect(canShowPopup(sale)).toBe(true);
    expect(canShowPopup(featured)).toBe(false);
  });

  it("stays out of the way on task pages", () => {
    for (const path of ["/cart", "/checkout", "/login", "/order-success", "/orders/123", "/admin/products"]) {
      expect(isQuietPage(path)).toBe(true);
    }
    for (const path of ["/", "/products", "/products/romper", "/sale/dashain-sale", "/about"]) {
      expect(isQuietPage(path)).toBe(false);
    }
  });
});
