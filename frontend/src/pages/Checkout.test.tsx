import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import cartReducer from "../store/cartSlice";
import chatReducer from "../store/chatSlice";
import Checkout from "./Checkout";
import { ordersAPI, paymentsAPI } from "../api/orders";
import type { ICartItem } from "../types";

const navigate = vi.fn();
const toastError = vi.hoisted(() => vi.fn());

vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router-dom")>()),
  useNavigate: () => navigate,
}));
vi.mock("react-hot-toast", () => ({
  default: Object.assign(vi.fn(), { error: toastError, success: vi.fn() }),
}));
// Stable object, like the real AuthContext state (a new object per render would
// re-run Checkout's prefill effect forever)
const auth = vi.hoisted(() => ({ user: { name: "Asha", phone: "9841234567" } }));
vi.mock("../context/AuthContext", () => ({
  useAuth: () => auth,
}));
vi.mock("../api/auth", () => ({
  authAPI: { getAddresses: vi.fn().mockResolvedValue({ data: { addresses: [] } }), addAddress: vi.fn().mockResolvedValue({}) },
}));
vi.mock("../api/orders", () => ({
  ordersAPI: { createOrder: vi.fn() },
  paymentsAPI: { getMethods: vi.fn().mockResolvedValue({ data: { methods: [] } }), initiatePayment: vi.fn() },
}));

const item: ICartItem = {
  _id: "line1",
  quantity: 1,
  currentPrice: 1200,
  product: { _id: "p1", name: "Romper", slug: "romper", description: "", price: 1200, category: "c", images: [], stock: 3 },
};

const renderCheckout = (cart: { items: ICartItem[]; hasLoaded: boolean; loading?: boolean }) => {
  const store = configureStore({
    reducer: { cart: cartReducer, chat: chatReducer },
    preloadedState: {
      cart: { items: cart.items, subtotal: 1200, savings: 0, itemCount: cart.items.length, loading: !!cart.loading, hasLoaded: cart.hasLoaded, error: null },
    },
  });
  render(
    <Provider store={store}>
      <MemoryRouter>
        <Checkout />
      </MemoryRouter>
    </Provider>,
  );
  return store;
};

describe("Checkout after returning from eSewa (full page load)", () => {
  beforeEach(() => {
    navigate.mockReset();
    toastError.mockReset();
  });

  it("waits for the cart to load instead of reporting it empty", async () => {
    const store = renderCheckout({ items: [], hasLoaded: false });
    await act(async () => {});

    expect(toastError).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();

    // The cart arrives from the API with the items still in it (online orders keep the cart)
    await act(async () => {
      store.dispatch({ type: "cart/fetchCart/fulfilled", payload: { items: [item], subtotal: 1200, itemCount: 1 } });
    });
    // Listed in both the phone (collapsible) and desktop summaries
    expect((await screen.findAllByText("Romper")).length).toBeGreaterThan(0);
    expect(toastError).not.toHaveBeenCalled();
  });

  it("still redirects when the loaded cart really is empty", async () => {
    renderCheckout({ items: [], hasLoaded: true });
    await act(async () => {});

    expect(toastError).toHaveBeenCalledWith("Your cart is empty");
    expect(navigate).toHaveBeenCalledWith("/cart");
  });
});

describe("Placing a cash-on-delivery order", () => {
  beforeEach(() => {
    navigate.mockReset();
    toastError.mockReset();
  });

  it("is a single request: the API records the COD payment with the order", async () => {
    vi.mocked(ordersAPI.createOrder).mockResolvedValue({ data: { order: { _id: "order1" } } } as never);
    renderCheckout({ items: [item], hasLoaded: true });
    await act(async () => {});

    fireEvent.change(screen.getByLabelText(/District/), { target: { value: "Kathmandu" } });
    fireEvent.change(screen.getByLabelText(/City \/ municipality/), { target: { value: "Kathmandu" } });
    fireEvent.change(screen.getByLabelText(/Street, tole or ward/), { target: { value: "Ward 5" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Place order/ }));
    });

    expect(ordersAPI.createOrder).toHaveBeenCalledWith(expect.objectContaining({ paymentMethod: "cod" }));
    expect(paymentsAPI.initiatePayment).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith("/order-success?orderId=order1");
  });
});
