import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AuthContext from "../context/AuthContext";
import Register from "./Register";

vi.mock("../assets/nevan-handicraft-logo.webp", () => ({ default: "test-logo" }));

const renderRegister = (register = vi.fn()) => {
  const auth = {
    user: null,
    loading: false,
    isAuthenticated: false,
    isAdmin: false,
    register,
    login: vi.fn(),
    loginWithGoogle: vi.fn(),
    logout: vi.fn(),
    updateUser: vi.fn(),
    twoFactorChallenge: null,
    cancelTwoFactor: vi.fn(),
    verifyTwoFactor: vi.fn(),
    startTwoFactorSetup: vi.fn(),
    enableTwoFactor: vi.fn(),
  };
  render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<p>Home page</p>} />
          <Route path="/login" element={<p>Sign-in page</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
  return register;
};

const fillValidForm = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByLabelText("Full name"), "Anjana Shrestha");
  await user.type(screen.getByLabelText("Email"), "anjana@example.com");
  await user.type(screen.getByLabelText("Password"), "secret12");
};

describe("Register page", () => {
  it("asks only for name, email and password", () => {
    renderRegister();
    expect(screen.getByLabelText("Full name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.queryByLabelText(/phone/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/confirm/i)).not.toBeInTheDocument();
  });

  it("explains problems on submit and focuses the first one", async () => {
    const user = userEvent.setup();
    const register = renderRegister();

    await user.click(screen.getByRole("button", { name: "Create account" }));

    const name = screen.getByLabelText("Full name");
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(name).toHaveAccessibleDescription(/Enter your full name/);
    expect(name).toHaveFocus();
    expect(screen.getByLabelText("Email")).toHaveAccessibleDescription(/Enter your email address/);
    expect(register).not.toHaveBeenCalled();
  });

  it("ticks the password rules off as they are met", async () => {
    const user = userEvent.setup();
    renderRegister();

    await user.type(screen.getByLabelText("Password"), "abcdef");
    const rules = within(screen.getByRole("list", { name: "Password needs" }));
    expect(rules.getByText("6+ characters")).toHaveTextContent("(done)");
    expect(rules.getByText("A letter")).toHaveTextContent("(done)");
    expect(rules.getByText("A number")).toHaveTextContent("(needed)");

    await user.type(screen.getByLabelText("Password"), "1");
    expect(rules.getByText("A number")).toHaveTextContent("(done)");
  });

  it("suggests a fix for a mistyped email domain", async () => {
    const user = userEvent.setup();
    renderRegister();

    await user.type(screen.getByLabelText("Email"), "anjana@gmial.com");
    await user.tab();
    await user.click(screen.getByRole("button", { name: "anjana@gmail.com" }));

    expect(screen.getByLabelText("Email")).toHaveValue("anjana@gmail.com");
  });

  it("offers sign-in or a reset when the email already has an account", async () => {
    const user = userEvent.setup();
    renderRegister(
      vi.fn().mockResolvedValue({ success: false, status: 400, error: "Email already registered" }),
    );

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Create account" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("An account already exists for anjana@example.com");
    expect(within(alert).getByRole("link", { name: "reset your password" })).toHaveAttribute(
      "href",
      "/forgot-password",
    );

    await user.click(within(alert).getByRole("button", { name: "Sign in" }));
    expect(screen.getByText("Sign-in page")).toBeInTheDocument();
  });

  it("creates the account and returns to the shop", async () => {
    const user = userEvent.setup();
    const register = renderRegister(vi.fn().mockResolvedValue({ success: true }));

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(register).toHaveBeenCalledWith({
      name: "Anjana Shrestha",
      email: "anjana@example.com",
      password: "secret12",
    });
    expect(await screen.findByText("Home page")).toBeInTheDocument();
  });
});
