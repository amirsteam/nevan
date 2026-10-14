import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import OrderDetail from "./OrderDetail";
import type { IOrder } from "../../types";

const api = vi.hoisted(() => ({
  updateOrderStatus: vi.fn(),
  markCODCollected: vi.fn(),
  recordRefund: vi.fn(),
}));
vi.mock("../../api", () => ({ adminAPI: api }));

const order = (overrides: Partial<IOrder> = {}): IOrder =>
  ({
    _id: "o1",
    orderNumber: "NV-1001",
    user: { _id: "u1", name: "Sita", email: "sita@example.com" },
    items: [],
    shippingAddress: { name: "Sita", phone: "9841234567", street: "Main Road", city: "Banepa", district: "Kavrepalanchok", province: 3 },
    status: "pending",
    payment: { method: "cod", status: "pending" },
    pricing: { subtotal: 1000, shippingCost: 0, discount: 0, tax: 0, total: 1000 },
    statusHistory: [],
    createdAt: "2026-10-01T10:00:00Z",
    ...overrides,
  }) as unknown as IOrder;

describe("Admin OrderDetail", () => {
  beforeEach(() => vi.clearAllMocks());

  it("doesn't offer to confirm an unpaid eSewa order and says why", () => {
    render(<OrderDetail order={order({ payment: { method: "esewa", status: "pending" } })} onStatusUpdated={vi.fn()} />);
    expect(screen.getByText(/Waiting for the eSewa payment/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "confirmed" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "cancelled" })).toBeInTheDocument();
  });

  it("offers to confirm a COD order and to mark its cash collected", async () => {
    api.markCODCollected.mockResolvedValue({});
    const onStatusUpdated = vi.fn();
    render(<OrderDetail order={order()} onStatusUpdated={onStatusUpdated} />);
    expect(screen.getByRole("button", { name: "confirmed" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Mark cash collected/ }));
    await waitFor(() => expect(api.markCODCollected).toHaveBeenCalledWith("o1"));
    expect(onStatusUpdated).toHaveBeenCalled();
  });

  it("records a refund owed on a paid order that was cancelled", async () => {
    api.recordRefund.mockResolvedValue({});
    render(
      <OrderDetail
        order={order({ status: "cancelled", payment: { method: "esewa", status: "paid", transactionId: "TX1" } })}
        onStatusUpdated={vi.fn()}
      />,
    );
    expect(screen.getByText(/Refund owed/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Refund reference/), { target: { value: "ESW-9" } });
    fireEvent.click(screen.getByRole("button", { name: /Mark refund done/ }));
    await waitFor(() => expect(api.recordRefund).toHaveBeenCalledWith("o1", { reference: "ESW-9", note: "" }));
  });

  it("links the customer's phone for calls and WhatsApp", () => {
    render(<OrderDetail order={order()} onStatusUpdated={vi.fn()} />);
    expect(screen.getByRole("link", { name: /9841234567/ })).toHaveAttribute("href", "tel:9841234567");
    expect(screen.getByRole("link", { name: /WhatsApp/ })).toHaveAttribute("href", "https://wa.me/9779841234567");
  });
});
