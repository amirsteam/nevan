import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import ForgotPassword from "./ForgotPassword";

const forgotPassword = vi.hoisted(() => vi.fn());
vi.mock("../api/auth", () => ({ authAPI: { forgotPassword, verifyResetOTP: vi.fn(), resetPassword: vi.fn() } }));
vi.mock("react-hot-toast", () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

const requestCode = async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <ForgotPassword />
    </MemoryRouter>,
  );
  await user.type(screen.getByRole("textbox"), "asha@example.com");
  await user.click(screen.getByRole("button", { name: /send|code|otp/i }));
};

describe("Forgot password", () => {
  beforeEach(() => forgotPassword.mockReset());

  it("doesn't claim an email was sent to a specific inbox", async () => {
    forgotPassword.mockResolvedValue({ status: "success", message: "…" });
    await requestCode();
    expect(await screen.findByText(/has an account, we've emailed it a/)).toBeInTheDocument();
    expect(screen.getByText(/check Spam and Promotions/)).toBeInTheDocument();
    expect(screen.queryByRole("note")).toBeNull();
  });

  it("shows the code on screen when a development server can't email it", async () => {
    forgotPassword.mockResolvedValue({ status: "success", message: "…", data: { otp: "482913" } });
    await requestCode();
    expect(await screen.findByRole("note")).toHaveTextContent("email isn't set up, so nothing was sent. Your code is 482913");
  });
});
