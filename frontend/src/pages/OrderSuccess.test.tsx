import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import cartReducer from "../store/cartSlice";
import OrderSuccess from "./OrderSuccess";
import { ordersAPI, paymentsAPI } from "../api/orders";
import type { IOrder } from "../types";

vi.mock("react-hot-toast", () => ({
  default: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }),
}));
vi.mock("../api", () => ({
  cartAPI: { getCart: vi.fn().mockResolvedValue({ data: { cart: { items: [], subtotal: 0, itemCount: 0 } } }) },
}));
vi.mock("../api/orders", () => ({
  ordersAPI: { getOrder: vi.fn() },
  paymentsAPI: { checkStatus: vi.fn(), initiatePayment: vi.fn() },
}));

const esewaOrder = (paymentStatus: "pending" | "paid", status: "pending" | "confirmed" = "pending") =>
  ({
    _id: "o1",
    orderNumber: "ORD-1",
    items: [],
    status,
    payment: { method: "esewa", status: paymentStatus },
    pricing: { subtotal: 1000, shippingCost: 100, discount: 0, tax: 0, total: 1100 },
  }) as unknown as IOrder;

const renderAt = async (url: string) => {
  const store = configureStore({ reducer: { cart: cartReducer } });
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[url]}>
        <OrderSuccess />
      </MemoryRouter>
    </Provider>,
  );
  await act(async () => {});
};

describe("Order success page for an eSewa order", () => {
  beforeEach(() => {
    vi.mocked(ordersAPI.getOrder).mockReset();
    vi.mocked(paymentsAPI.checkStatus).mockReset();
  });

  it("says the payment is being confirmed and offers no Pay now while eSewa is still processing", async () => {
    vi.mocked(ordersAPI.getOrder).mockResolvedValue({ data: { order: esewaOrder("pending") } } as never);
    vi.mocked(paymentsAPI.checkStatus).mockResolvedValue({
      data: { paymentStatus: "pending", status: "pending", processing: true },
    } as never);

    await renderAt("/order-success?orderId=o1&payment=pending");

    expect(await screen.findByText(/Confirming your payment/)).toBeTruthy();
    expect(screen.getByText(/please don't pay again/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Pay now/ })).toBeNull();
  });

  it("shows the order as placed once the gateway confirms the payment", async () => {
    vi.mocked(ordersAPI.getOrder)
      .mockResolvedValueOnce({ data: { order: esewaOrder("pending") } } as never)
      .mockResolvedValue({ data: { order: esewaOrder("paid", "confirmed") } } as never);
    vi.mocked(paymentsAPI.checkStatus).mockResolvedValue({
      data: { paymentStatus: "paid", status: "confirmed", processing: false },
    } as never);

    await renderAt("/order-success?orderId=o1&payment=pending");

    expect(await screen.findByText("Order Placed Successfully!")).toBeTruthy();
  });

  it("offers Pay now when eSewa has no payment for the order", async () => {
    vi.mocked(ordersAPI.getOrder).mockResolvedValue({ data: { order: esewaOrder("pending") } } as never);
    vi.mocked(paymentsAPI.checkStatus).mockResolvedValue({
      data: { paymentStatus: "pending", status: "pending", processing: false },
    } as never);

    await renderAt("/order-success?orderId=o1");

    expect(await screen.findByText("Payment not completed")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Pay now with eSewa/ })).toBeTruthy();
  });
});
