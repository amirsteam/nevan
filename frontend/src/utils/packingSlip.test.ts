import { describe, it, expect } from "vitest";
import { buildPackingSlipHtml } from "./packingSlip";
import type { IOrder } from "../types";

const order = (overrides: Partial<IOrder> = {}): IOrder =>
  ({
    _id: "o1",
    orderNumber: "NV-1001",
    createdAt: "2026-10-01T10:00:00.000Z",
    user: { _id: "u1", name: "Asha", email: "asha@example.com" },
    items: [{ product: "p1", name: "Muslin <b>Romper</b>", price: 1200, quantity: 2, variant: { size: "0-3M", color: "White" } }],
    shippingAddress: { name: "Asha", phone: "9841234567", street: "Shanti Chowk", city: "Baneshwor", district: "Kathmandu", province: 3 },
    paymentMethod: "cod",
    payment: { method: "cod", status: "pending" },
    pricing: { subtotal: 2400, shippingCost: 100, total: 2500 },
    ...overrides,
  }) as unknown as IOrder;

describe("packing slip", () => {
  it("lists the address, items and the cash to collect for unpaid COD orders", () => {
    const html = buildPackingSlipHtml(order());
    expect(html).toContain("Order #NV-1001");
    expect(html).toContain("Shanti Chowk, Baneshwor");
    expect(html).toContain("Kathmandu, Province 3 (Bagmati)");
    expect(html).toContain("0-3M / White");
    expect(html).toMatch(/Collect .*2,500.* in cash/);
  });

  it("escapes customer-entered text", () => {
    const html = buildPackingSlipHtml(order({ customerNotes: '<img src=x onerror="alert(1)">' }));
    expect(html).not.toContain("<b>Romper</b>");
    expect(html).toContain("Muslin &lt;b&gt;Romper&lt;/b&gt;");
    expect(html).not.toContain("<img src=x");
  });

  it("doesn't ask the courier to collect cash for paid orders", () => {
    const html = buildPackingSlipHtml(
      order({ paymentMethod: "esewa", payment: { method: "esewa", status: "paid" } } as Partial<IOrder>),
    );
    expect(html).not.toContain("in cash");
    expect(html).toContain("Paid");
  });
});
