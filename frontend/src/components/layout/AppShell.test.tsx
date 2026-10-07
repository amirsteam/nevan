/**
 * Regression: the chat widget must render inside the router. It used to be
 * mounted next to <RouterProvider>, so a signed-out visitor opening chat
 * crashed on the guest form's <Link> ("Cannot destructure property
 * 'basename' … as it is null").
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import chatReducer from "../../store/chatSlice";
import cartReducer from "../../store/cartSlice";
import AppShell from "./AppShell";
import { appRoutes } from "../../routes";

vi.mock("../../hooks/useChatConnection", () => ({ useChatConnection: () => undefined }));
vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, loading: false }),
}));
vi.mock("../../services/socketService", () => ({
  default: { request: vi.fn().mockResolvedValue({ success: false }), send: vi.fn(), connect: vi.fn() },
}));

describe("AppShell", () => {
  it("is the root of every route, so chat is always inside the router", () => {
    expect(appRoutes).toHaveLength(1);
    expect(appRoutes[0].element).toEqual(<AppShell />);
    const paths = appRoutes[0].children?.map((r) => r.path);
    expect(paths).toEqual(["/", "/admin"]);
  });

  it("lets a signed-out visitor open chat and see the guest form with its sign-in link", async () => {
    const store = configureStore({ reducer: { chat: chatReducer, cart: cartReducer } });
    const router = createMemoryRouter(
      [{ element: <AppShell />, children: [{ path: "/", element: <p>Home page</p> }] }],
      { initialEntries: ["/"] },
    );
    const user = userEvent.setup();
    render(
      <Provider store={store}>
        <RouterProvider router={router} />
      </Provider>,
    );

    expect(screen.getByText("Home page")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Open chat" }));

    expect(await screen.findByLabelText(/Your name/)).toBeInTheDocument();
    const signIn = screen.getByRole("link", { name: /sign in|log in/i });
    expect(signIn).toHaveAttribute("href", "/login");
  });
});
