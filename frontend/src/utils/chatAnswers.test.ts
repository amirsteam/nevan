import { describe, it, expect } from "vitest";
import { QUICK_QUESTIONS, quickAnswer } from "./chatAnswers";
import { DEFAULT_SHIPPING_SETTINGS } from "./helpers";
import type { IShippingSettings } from "../types";

const settings: IShippingSettings = {
  ...DEFAULT_SHIPPING_SETTINGS,
  freeShippingThreshold: 4000,
  valleyRate: 100,
  provinceRates: { 1: 150, 2: 150, 3: 120, 4: 150, 5: 150, 6: 200, 7: 200 },
  freeAreas: [{ district: "Kavrepalanchok" }],
};

describe("chat quick answers", () => {
  it("offers track, size, delivery, payment, returns and visit questions", () => {
    expect(QUICK_QUESTIONS.map((q) => q.id)).toEqual(["track", "size", "delivery", "payment", "returns", "visit"]);
  });

  it("answers delivery from the admin's shipping settings", () => {
    const answer = quickAnswer("delivery", settings);
    const text = answer.lines.join(" ");
    expect(text).toMatch(/free on orders of NPR\s4,000 or more/);
    expect(text).toContain("Kavrepalanchok district");
    expect(text).toMatch(/flat fee of NPR\s100–200 per order/);
    expect(answer.links).toContainEqual({ label: "Shipping rates by area", to: "/shipping" });
  });

  it("only mentions cash on delivery and eSewa as payment options", () => {
    const text = quickAnswer("payment", settings).lines.join(" ");
    expect(text).toContain("cash on delivery");
    expect(text).toContain("eSewa");
    expect(text).not.toMatch(/khalti/i);
  });

  it("lists the client's size scale up to 7 years", () => {
    const text = quickAnswer("size", settings).lines.join(" ");
    expect(text).toContain("Small: 0–12 months, Medium: 1–3 years, Large: 3–5 years, XL: 5–7 years");
    expect(text).not.toMatch(/8|10 y/);
  });

  it("says whether the shop is answering right now (Nepal time)", () => {
    // Thursday 11:00 in Kathmandu
    const open = quickAnswer("visit", settings, new Date("2026-10-15T11:00:00+05:45"));
    expect(open.lines.join(" ")).toContain("Right now: Open now · until 7pm");
    // Saturday
    const closed = quickAnswer("visit", settings, new Date("2026-10-17T11:00:00+05:45"));
    expect(closed.lines.join(" ")).toContain("Closed · opens tomorrow at 10am");
    expect(open.links[0]).toMatchObject({ label: "Open in Google Maps", external: true });
  });

  it("points to the returns policy", () => {
    const answer = quickAnswer("returns", settings);
    expect(answer.lines[0]).toContain("within 7 days of delivery");
    expect(answer.links).toEqual([{ label: "Returns policy", to: "/returns" }]);
  });
});
