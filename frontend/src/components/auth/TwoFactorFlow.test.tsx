import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import AuthContext from "../../context/AuthContext";
import TwoFactorFlow from "./TwoFactorFlow";
import Login from "../../pages/Login";

vi.mock("../../assets/nevan-handicraft-logo.webp", () => ({ default: "test-logo" }));

const SETUP = {
  otpauthUrl: "otpauth://totp/Nevan%20Handicraft:owner%40example.com?secret=ABC",
  qrCode: "data:image/png;base64,iVBORw0KGgo=",
  manualKey: "ABCD EFGH IJKL MNOP",
};

const renderWith = (overrides: Record<string, unknown>, ui = <TwoFactorFlow onSuccess={vi.fn()} />) => {
  const auth = {
    user: null,
    loading: false,
    isAuthenticated: false,
    isAdmin: false,
    register: vi.fn(),
    login: vi.fn(),
    loginWithGoogle: vi.fn(),
    logout: vi.fn(),
    updateUser: vi.fn(),
    twoFactorChallenge: { purpose: "verify" as const, challengeToken: "challenge" },
    cancelTwoFactor: vi.fn(),
    verifyTwoFactor: vi.fn().mockResolvedValue({ success: true }),
    startTwoFactorSetup: vi.fn().mockResolvedValue(SETUP),
    enableTwoFactor: vi.fn(),
    ...overrides,
  };
  render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter>{ui}</MemoryRouter>
    </AuthContext.Provider>,
  );
  return auth;
};

describe("Two-step sign-in", () => {
  it("signs in as soon as six digits are typed", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const auth = renderWith({}, <TwoFactorFlow onSuccess={onSuccess} />);

    const field = screen.getByLabelText("6-digit code");
    expect(field).toHaveFocus();
    await user.type(field, "12 34a56");

    expect(auth.verifyTwoFactor).toHaveBeenCalledWith({ code: "123456", rememberDevice: false });
    expect(onSuccess).toHaveBeenCalled();
  });

  it("explains a wrong code on the field and clears it", async () => {
    const user = userEvent.setup();
    renderWith({
      verifyTwoFactor: vi.fn().mockResolvedValue({ success: false, error: "That code didn't work." }),
    });

    const field = screen.getByLabelText("6-digit code");
    await user.type(field, "000000");

    expect(await screen.findByRole("alert")).toHaveTextContent("That code didn't work.");
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveAccessibleDescription(/That code didn't work/);
    expect(field).toHaveValue("");
  });

  it("takes a backup code and remembers the browser when asked", async () => {
    const user = userEvent.setup();
    const auth = renderWith({});

    await user.click(screen.getByRole("button", { name: /Use a backup code/ }));
    await user.click(screen.getByLabelText(/Remember this browser/));
    await user.type(screen.getByLabelText("Backup code"), "abcde-23456");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(auth.verifyTwoFactor).toHaveBeenCalledWith({ backupCode: "abcde-23456", rememberDevice: true });
  });
});

describe("Two-step setup at first sign-in", () => {
  it("scans, confirms the first code, and signs in only after the backup codes are saved", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const finish = vi.fn();
    const auth = renderWith(
      {
        twoFactorChallenge: { purpose: "setup" as const, challengeToken: "challenge" },
        enableTwoFactor: vi.fn().mockResolvedValue({ backupCodes: ["ABCDE-23456", "FGHJK-78923"], finish }),
      },
      <TwoFactorFlow onSuccess={onSuccess} />,
    );

    await user.click(screen.getByRole("button", { name: /I have the app/ }));
    expect(auth.startTwoFactorSetup).toHaveBeenCalled();
    expect(screen.getByAltText("QR code for your authenticator app")).toHaveAttribute("src", SETUP.qrCode);

    // Too short: explained, nothing sent
    await user.type(screen.getByLabelText("6-digit code"), "123");
    await user.click(screen.getByRole("button", { name: "Turn on two-step login" }));
    expect(screen.getByLabelText("6-digit code")).toHaveAccessibleDescription(/6-digit code/);
    expect(auth.enableTwoFactor).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText("6-digit code"), "456");
    await user.click(screen.getByRole("button", { name: "Turn on two-step login" }));
    expect(auth.enableTwoFactor).toHaveBeenCalledWith("123456", false);

    expect(screen.getByRole("list", { name: "Backup codes" })).toHaveTextContent("ABCDE-23456");
    const enter = screen.getByRole("button", { name: "Continue to the admin panel" });
    await user.click(enter);
    expect(screen.getByRole("alert")).toHaveTextContent(/tick the box/);
    expect(finish).not.toHaveBeenCalled();

    await user.click(screen.getByLabelText(/I've saved these codes/));
    await user.click(enter);
    expect(finish).toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalled();
  });
});

describe("Sign-in page", () => {
  it("shows the authenticator step instead of the form while it is pending", () => {
    renderWith({}, <Login />);
    expect(screen.getByRole("heading", { name: "Two-step login" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
  });
});
