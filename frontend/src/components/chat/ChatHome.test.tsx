import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import chatReducer from "../../store/chatSlice";
import ChatHome from "./ChatHome";

const auth = vi.hoisted(() => ({ value: { user: null as null | { name: string }, isAuthenticated: false } }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => auth.value }));

const api = vi.hoisted(() => ({ getFeatured: vi.fn(), getMyOrders: vi.fn() }));
vi.mock("../../api/products", () => ({ productsAPI: { getFeatured: api.getFeatured } }));
vi.mock("../../api/orders", () => ({ ordersAPI: { getMyOrders: api.getMyOrders } }));

const romper = {
  _id: "p1",
  name: "Muslin Romper",
  slug: "muslin-romper",
  price: 1200,
  images: [{ url: "https://example.com/romper.jpg", isPrimary: true }],
  variants: [],
};

const renderHome = (props: Partial<Parameters<typeof ChatHome>[0]> = {}) => {
  const onSend = vi.fn();
  const onAskTeam = vi.fn();
  const store = configureStore({ reducer: { chat: chatReducer } });
  render(
    <Provider store={store}>
      <MemoryRouter>
        <ChatHome onSend={onSend} onAskTeam={onAskTeam} unreadCount={0} {...props} />
      </MemoryRouter>
    </Provider>,
  );
  return { onSend, onAskTeam };
};

describe("ChatHome", () => {
  beforeEach(() => {
    auth.value = { user: null, isAuthenticated: false };
    api.getFeatured.mockReset().mockResolvedValue({ data: { products: [romper] } });
    api.getMyOrders.mockReset();
  });

  it("greets visitors with sign-in, popular pieces and suggested questions", async () => {
    renderHome();

    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
    const picks = await screen.findByRole("list", { name: "Popular right now" });
    expect(within(picks).getByRole("link", { name: /Muslin Romper/ })).toHaveAttribute("href", "/products/muslin-romper");
    expect(screen.getByRole("button", { name: "Which size fits my baby?" })).toBeInTheDocument();
  });

  it("answers a suggested question instantly and offers the team", async () => {
    const user = userEvent.setup();
    const { onAskTeam } = renderHome();

    await user.click(screen.getByRole("button", { name: "What are the payment options?" }));

    expect(screen.getByText(/cash on delivery or with eSewa/)).toBeInTheDocument();
    // Asked questions leave the suggestions
    expect(screen.queryByRole("button", { name: "What are the payment options?" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Ask our team" }));
    expect(onAskTeam).toHaveBeenCalledWith("What are the payment options? ");
  });

  it("asks visitors to sign in to track an order", async () => {
    const user = userEvent.setup();
    renderHome();

    await user.click(screen.getByRole("button", { name: "Track my order" }));

    expect(await screen.findByText(/Sign in to see your orders/)).toBeInTheDocument();
    expect(api.getMyOrders).not.toHaveBeenCalled();
  });

  it("shows a signed-in shopper's latest orders and their status", async () => {
    auth.value = { user: { name: "Asha Shrestha" }, isAuthenticated: true };
    api.getMyOrders.mockResolvedValue({
      data: {
        orders: [{ _id: "o1", orderNumber: "ORD-20261015-AB12C", orderStatus: "shipped", total: 2300, pricing: { total: 2300 } }],
      },
    });
    const user = userEvent.setup();
    renderHome();

    expect(screen.getByText(/Hi Asha, message us/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Sign in" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Track my order" }));

    const order = await screen.findByRole("link", { name: /#ORD-20261015-AB12C/ });
    expect(order).toHaveAttribute("href", "/orders/o1");
    expect(order).toHaveTextContent("On its way · NPR 2,300");
  });

  it("sends anything else to the team", async () => {
    const user = userEvent.setup();
    const { onSend } = renderHome();

    await user.type(screen.getByRole("textbox", { name: "Message the Nevan team" }), "Do you gift wrap?{Enter}");

    expect(onSend).toHaveBeenCalledWith("Do you gift wrap?");
  });

  it("links to an existing conversation with its unread replies", async () => {
    const user = userEvent.setup();
    const { onAskTeam } = renderHome({
      unreadCount: 2,
      lastMessage: {
        _id: "m1",
        roomId: "r1",
        senderId: "a1",
        senderRole: "admin",
        content: "Yes, we have it in Medium",
        status: "sent",
        createdAt: new Date().toISOString(),
      },
    });

    const card = screen.getByRole("button", { name: /Your conversation/ });
    expect(card).toHaveTextContent("2 new");
    expect(card).toHaveTextContent("Nevan: Yes, we have it in Medium");
    await user.click(card);
    expect(onAskTeam).toHaveBeenCalledWith();
  });
});
