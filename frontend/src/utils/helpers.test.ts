import { describe, it, expect } from "vitest";
import { calculateShippingCost, getErrorMessage, populated, getAvailableStock } from "./helpers";

describe("calculateShippingCost", () => {
  // Same cases as backend/tests/admin.test.ts ("Shipping cost") so the checkout
  // preview and the amount actually charged stay in sync
  it("matches the API's shipping rules", () => {
    expect(calculateShippingCost(1000, 3, "kathmandu ")).toBe(100);
    expect(calculateShippingCost(1000, 3, "Chitwan")).toBe(150);
    expect(calculateShippingCost(1000, 6, "Jumla")).toBe(300);
    expect(calculateShippingCost(5000, 6, "Jumla")).toBe(0);
  });
});

describe("getErrorMessage", () => {
  it("prefers the API message, then the error message, then the fallback", () => {
    expect(getErrorMessage({ response: { data: { message: "Out of stock" } } }, "x")).toBe("Out of stock");
    expect(getErrorMessage(new Error("Network Error"), "x")).toBe("Network Error");
    expect(getErrorMessage("nope", "fallback")).toBe("fallback");
  });
});

describe("populated", () => {
  it("returns populated objects and drops bare ids", () => {
    expect(populated({ _id: "1", name: "Cat" })).toEqual({ _id: "1", name: "Cat" });
    expect(populated("1")).toBeUndefined();
    expect(populated(null)).toBeUndefined();
  });
});

describe("getAvailableStock", () => {
  it("uses the variants' total for products with variants", () => {
    // Product-level stock is 0 for variant products saved by the web admin form
    expect(getAvailableStock({ stock: 0, variants: [{ stock: 2 }, { stock: 3 }] })).toBe(5);
    expect(getAvailableStock({ stock: 9, variants: [{ stock: 0 }] })).toBe(0);
    expect(getAvailableStock({ stock: 4, variants: [] })).toBe(4);
    expect(getAvailableStock({})).toBe(0);
  });
});
