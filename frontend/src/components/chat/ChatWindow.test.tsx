/**
 * Regression: opening a conversation must show its existing messages.
 * The server used to send the history as a separate "chat-history" event
 * before acknowledging the join; it arrived before the room was active and was
 * dropped, so admins saw "No messages yet". History now comes with the ack.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import chatReducer, { setConnectionStatus, setIsOpen, setRooms, type ChatRoomSummary } from "../../store/chatSlice";
import cartReducer from "../../store/cartSlice";
import ChatWindow from "./ChatWindow";

const auth = vi.hoisted(() => ({ value: { user: { _id: "admin1", role: "admin", name: "Sita" }, isAuthenticated: true, loading: false } }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => auth.value }));

const socket = vi.hoisted(() => ({ request: vi.fn(), send: vi.fn(), connect: vi.fn() }));
vi.mock("../../services/socketService", () => ({ default: socket }));
vi.mock("../../hooks/useChatConnection", () => ({ refreshRooms: vi.fn() }));
vi.mock("react-hot-toast", () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

const guestRoom: ChatRoomSummary = {
  _id: "room1",
  customerId: null,
  guestName: "Sita Guest",
  status: "open",
  lastMessageAt: new Date().toISOString(),
  lastMessagePreview: "Do you have the muslin romper?",
  unreadCountAdmin: 1,
  unreadCountCustomer: 0,
};

const history = [
  {
    _id: "m1",
    roomId: "room1",
    senderId: "guest1",
    senderRole: "customer" as const,
    content: "Do you have the muslin romper in 6-12 months?",
    status: "sent" as const,
    createdAt: new Date().toISOString(),
  },
];

const renderWindow = (props: { embedded?: boolean } = {}) => {
  const store = configureStore({ reducer: { chat: chatReducer, cart: cartReducer } });
  store.dispatch(setIsOpen(true));
  store.dispatch(setConnectionStatus("connected"));
  store.dispatch(setRooms([guestRoom]));
  render(
    <Provider store={store}>
      <MemoryRouter>
        <ChatWindow {...props} />
      </MemoryRouter>
    </Provider>,
  );
  return store;
};

describe("ChatWindow", () => {
  beforeEach(() => {
    socket.request.mockReset();
    socket.send.mockReset();
    auth.value = { user: { _id: "admin1", role: "admin", name: "Sita" }, isAuthenticated: true, loading: false };
  });

  it("shows a conversation's existing messages when an admin opens it", async () => {
    socket.request.mockImplementation(async (event: string) =>
      event === "join-chat" ? { success: true, roomId: "room1", status: "open", messages: history, hasMore: false } : { success: true },
    );
    const user = userEvent.setup();
    renderWindow();

    await user.click(screen.getByRole("button", { name: /Sita Guest \(guest\)/ }));

    expect(await screen.findByText("Do you have the muslin romper in 6-12 months?")).toBeInTheDocument();
    expect(screen.queryByText(/No messages yet/)).toBeNull();
    expect(socket.send).toHaveBeenCalledWith("message-read", { roomId: "room1" });
  });

  it("shows a returning customer their earlier messages", async () => {
    auth.value = { user: { _id: "c1", role: "customer", name: "Asha" }, isAuthenticated: true, loading: false };
    socket.request.mockImplementation(async (event: string) =>
      event === "join-chat" ? { success: true, roomId: "room1", status: "open", messages: history, hasMore: false } : { success: true },
    );
    renderWindow();

    expect(await screen.findByText("Do you have the muslin romper in 6-12 months?")).toBeInTheDocument();
  });

  it("renders inside the admin Live chat page without a close button", () => {
    socket.request.mockResolvedValue({ success: true });
    renderWindow({ embedded: true });
    expect(screen.getByRole("region", { name: "Support chat" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Close chat window" })).toBeNull();
  });
});
