import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Contact from "./Contact";

const sendMessage = vi.hoisted(() => vi.fn());
vi.mock("../api/contact", () => ({ contactAPI: { sendMessage } }));
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: null }) }));
const dispatch = vi.hoisted(() => vi.fn());
vi.mock("../store/hooks", () => ({ useAppDispatch: () => dispatch }));

const renderContact = () =>
  render(
    <MemoryRouter>
      <Contact />
    </MemoryRouter>,
  );
vi.mock("react-hot-toast", () => ({
  default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

describe("Contact form", () => {
  beforeEach(() => sendMessage.mockReset());

  it("sends the message to the API (not a simulated send)", async () => {
    sendMessage.mockResolvedValue({ status: "success", message: "Thanks!" });
    const user = userEvent.setup();
    renderContact();

    await user.type(screen.getByLabelText(/Your name/), "Asha");
    await user.type(screen.getByLabelText(/Email address/), "asha@example.com");
    await user.type(screen.getByLabelText(/Phone/), "98412 34567");
    await user.type(screen.getByLabelText(/^Message/), "Do you have this romper in 2-4 years?");
    await user.click(screen.getByRole("button", { name: /Send message/ }));

    await waitFor(() =>
      expect(sendMessage).toHaveBeenCalledWith({
        name: "Asha",
        email: "asha@example.com",
        phone: "9841234567",
        subject: undefined,
        message: "Do you have this romper in 2-4 years?",
      }),
    );
    expect(await screen.findByText(/Message sent/)).toBeInTheDocument();
  });

  it("sends the chosen topic and order number as the subject", async () => {
    sendMessage.mockResolvedValue({ status: "success", message: "Thanks!" });
    const user = userEvent.setup();
    renderContact();

    await user.click(screen.getByRole("radio", { name: "An order" }));
    await user.type(screen.getByLabelText(/Order number/), "ORD-20261015-AB12C");
    await user.type(screen.getByLabelText(/Your name/), "Asha");
    await user.type(screen.getByLabelText(/Email address/), "asha@example.com");
    await user.type(screen.getByLabelText(/^Message/), "Can I change the size to Medium?");
    await user.click(screen.getByRole("button", { name: /Send message/ }));

    await waitFor(() =>
      expect(sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ subject: "An order — ORD-20261015-AB12C" }),
      ),
    );
  });

  it("puts WhatsApp, call, chat and email first", async () => {
    const user = userEvent.setup();
    renderContact();
    expect(screen.getByRole("link", { name: /WhatsApp/ })).toHaveAttribute("href", expect.stringContaining("wa.me"));
    expect(screen.getByRole("link", { name: /Call us/ })).toHaveAttribute("href", expect.stringMatching(/^tel:/));
    expect(screen.getByRole("link", { name: /^Email/ })).toHaveAttribute("href", expect.stringMatching(/^mailto:/));
    await user.click(screen.getByRole("button", { name: /Live chat/ }));
    expect(dispatch).toHaveBeenCalled();
  });

  it("shows field errors and doesn't call the API for an invalid form", async () => {
    const user = userEvent.setup();
    renderContact();

    await user.type(screen.getByLabelText(/Email address/), "not-an-email");
    await user.type(screen.getByLabelText(/^Message/), "Hi");
    await user.click(screen.getByRole("button", { name: /Send message/ }));

    expect(screen.getByText("Please tell us your name")).toBeInTheDocument();
    expect(screen.getByText("Please enter a valid email address")).toBeInTheDocument();
    expect(screen.getByText("Please write at least 10 characters")).toBeInTheDocument();
    expect(screen.getByLabelText(/Your name/)).toHaveFocus();
    expect(sendMessage).not.toHaveBeenCalled();
  });
});
