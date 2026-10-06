import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import cartReducer from "../store/cartSlice";
import chatReducer from "../store/chatSlice";
import Checkout from "./Checkout";
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
      cart: { items: cart.items, subtotal: 1200, itemCount: cart.items.length, loading: !!cart.loading, hasLoaded: cart.hasLoaded, error: null },
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
    expect(await screen.findByText("Romper")).toBeInTheDocument();
    expect(toastError).not.toHaveBeenCalled();
  });

  it("still redirects when the loaded cart really is empty", async () => {
    renderCheckout({ items: [], hasLoaded: true });
    await act(async () => {});

    expect(toastError).toHaveBeenCalledWith("Your cart is empty");
    expect(navigate).toHaveBeenCalledWith("/cart");
  });
});
