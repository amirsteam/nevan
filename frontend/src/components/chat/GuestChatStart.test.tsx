import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import chatReducer, { clearChat, roomDisplayName, setGuest } from "../../store/chatSlice";
import cartReducer from "../../store/cartSlice";
import GuestChatStart from "./GuestChatStart";
import { loadGuestSession, clearGuestSession } from "../../utils/guestChat";

const post = vi.hoisted(() => vi.fn());
vi.mock("../../api/axios", () => ({ default: { post } }));

const renderForm = () => {
    const store = configureStore({ reducer: { chat: chatReducer, cart: cartReducer } });
    render(
        <Provider store={store}>
            <MemoryRouter>
                <GuestChatStart />
            </MemoryRouter>
        </Provider>,
    );
    return store;
};

describe("Guest chat start", () => {
    beforeEach(() => {
        post.mockReset();
        clearGuestSession();
    });

    it("starts a guest chat with a name and optional email", async () => {
        post.mockResolvedValue({
            data: { data: { guestToken: "guest-token", guest: { id: "g1", name: "Asha" } } },
        });
        const user = userEvent.setup();
        const store = renderForm();

        await user.type(screen.getByLabelText(/Your name/), "Asha");
        await user.type(screen.getByLabelText(/Email/), "asha@example.com");
        await user.click(screen.getByRole("button", { name: /Start chat/ }));

        await waitFor(() => expect(store.getState().chat.guest).toEqual({ id: "g1", name: "Asha" }));
        expect(post).toHaveBeenCalledWith("/chat/guest-session", { name: "Asha", email: "asha@example.com" });
        expect(loadGuestSession()).toEqual({ token: "guest-token", id: "g1", name: "Asha" });
    });

    it("asks for a name before calling the API", async () => {
        const user = userEvent.setup();
        renderForm();
        await user.click(screen.getByRole("button", { name: /Start chat/ }));
        expect(await screen.findByText("Please tell us your name")).toBeInTheDocument();
        expect(post).not.toHaveBeenCalled();
    });

    it("shows the API's message when starting fails (e.g. rate limit)", async () => {
        post.mockRejectedValue({ response: { data: { message: "Too many chat sessions started from this network." } } });
        const user = userEvent.setup();
        renderForm();
        await user.type(screen.getByLabelText(/Your name/), "Asha");
        await user.click(screen.getByRole("button", { name: /Start chat/ }));
        expect(await screen.findByText(/Too many chat sessions/)).toBeInTheDocument();
        expect(loadGuestSession()).toBeNull();
    });
});

describe("chat store with guests", () => {
    it("keeps the guest identity when the conversation state is reset", () => {
        let state = chatReducer(undefined, setGuest({ id: "g1", name: "Asha" }));
        state = chatReducer(state, clearChat());
        expect(state.guest).toEqual({ id: "g1", name: "Asha" });
    });

    it("labels guest conversations in the admin inbox", () => {
        const base = { _id: "r", status: "open" as const, unreadCountAdmin: 0, unreadCountCustomer: 0 };
        expect(roomDisplayName({ ...base, customerId: { _id: "u", name: "Ram", email: "r@x.np" } })).toBe("Ram");
        expect(roomDisplayName({ ...base, customerId: null, guestName: "Maya" })).toBe("Maya (guest)");
    });
});
