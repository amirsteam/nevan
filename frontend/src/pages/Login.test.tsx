import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AuthContext from "../context/AuthContext";
import Login from "./Login";

vi.mock("../assets/logo.png", () => ({ default: "test-logo" }));

const renderLogin = (login = vi.fn(), state?: unknown) => {
  const auth = {
    user: null,
    loading: false,
    isAuthenticated: false,
    isAdmin: false,
    register: vi.fn(),
    login,
    loginWithGoogle: vi.fn(),
    logout: vi.fn(),
    updateUser: vi.fn(),
  };
  render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={[{ pathname: "/login", state }]}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/checkout" element={<p>Checkout page</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
  return login;
};

describe("Login page", () => {
  it("points to missing fields and focuses the first one", async () => {
    const user = userEvent.setup();
    const login = renderLogin();

    await user.click(screen.getByRole("button", { name: "Sign in" }));

    const email = screen.getByLabelText("Email");
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveAccessibleDescription(/Enter your email address/);
    expect(email).toHaveFocus();
    expect(screen.getByLabelText("Password")).toHaveAccessibleDescription(/Enter your password/);
    expect(login).not.toHaveBeenCalled();
  });

  it("shows and hides the password", async () => {
    const user = userEvent.setup();
    renderLogin();
    const password = screen.getByLabelText("Password");
    const toggle = screen.getByRole("button", { name: "Show password" });

    expect(password).toHaveAttribute("type", "password");
    await user.click(toggle);
    expect(password).toHaveAttribute("type", "text");
    expect(toggle).toHaveAttribute("aria-pressed", "true");
  });

  it("announces a failed sign-in", async () => {
    const user = userEvent.setup();
    renderLogin(vi.fn().mockResolvedValue({ success: false, status: 401, error: "Invalid email or password" }));

    await user.type(screen.getByLabelText("Email"), "anjana@example.com");
    await user.type(screen.getByLabelText("Password"), "wrong-pass1");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password");
  });

  it("starts with a known email and returns to where the shopper was", async () => {
    const user = userEvent.setup();
    const login = renderLogin(vi.fn().mockResolvedValue({ success: true }), {
      email: "anjana@example.com",
      from: { pathname: "/checkout" },
    });

    expect(screen.getByLabelText("Email")).toHaveValue("anjana@example.com");
    expect(screen.getByRole("link", { name: "Forgot password?" })).toHaveAttribute("href", "/forgot-password");

    await user.type(screen.getByLabelText("Password"), "secret12");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(login).toHaveBeenCalledWith("anjana@example.com", "secret12");
    expect(await screen.findByText("Checkout page")).toBeInTheDocument();
  });
});
