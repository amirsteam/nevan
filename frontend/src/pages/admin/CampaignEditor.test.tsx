import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import CampaignEditor from "./CampaignEditor";

const api = vi.hoisted(() => ({
  getCampaignPresets: vi.fn(),
  getCategories: vi.fn(),
  getCampaign: vi.fn(),
  createCampaign: vi.fn(),
  updateCampaign: vi.fn(),
  getProducts: vi.fn(),
  getProductById: vi.fn(),
  getCampaignStats: vi.fn(),
}));
vi.mock("../../api", () => ({ adminAPI: api }));
vi.mock("react-hot-toast", () => ({
  default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

const palette = { label: "Diyo", bg: "#2b1036", text: "#fff3d6", accent: "#f5b301", onAccent: "#2b1036", highlight: "#ff8a3d" };
const presets = {
  festivals: {
    tihar: { label: "Tihar", emoji: "🪔", palette: "diyo", name: "Tihar Sale", headline: "Tihar Sale", greeting: "Happy Tihar!", monthHint: "Kartik" },
    custom: { label: "Other", emoji: "✨", palette: "brand", name: "Special Sale", headline: "Special Sale", greeting: "", monthHint: "Any" },
  },
  palettes: { diyo: palette, brand: { ...palette, label: "Brand", bg: "#f6ebe9" } },
  maxPercent: 70,
};

const renderEditor = (path = "/admin/campaigns/new?festival=tihar") => {
  const router = createMemoryRouter(
    [
      { path: "/admin/campaigns/new", element: <CampaignEditor /> },
      { path: "/admin/campaigns/:id/edit", element: <CampaignEditor /> },
      { path: "/admin/campaigns", element: <p>List</p> },
    ],
    { initialEntries: [path] },
  );
  render(<RouterProvider router={router} />);
  return router;
};

const fillDates = async (user: ReturnType<typeof userEvent.setup>) => {
  const start = screen.getByLabelText("Starts (Nepal time)");
  const end = screen.getByLabelText("Ends (Nepal time)");
  await user.clear(start);
  await user.type(start, "2026-11-01T06:00");
  await user.clear(end);
  await user.type(end, "2026-11-05T23:00");
};

describe("CampaignEditor", () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset());
    api.getCampaignPresets.mockResolvedValue({ data: { data: presets } });
    api.getCategories.mockResolvedValue({ data: { data: { categories: [{ _id: "cat1", name: "Rompers", slug: "rompers" }] } } });
    api.getCampaignStats.mockResolvedValue({ data: { data: { stats: { orders: 0, units: 0, revenue: 0, savings: 0 } } } });
  });

  it("pre-fills the festival look and publishes with Nepal times converted to UTC", async () => {
    api.createCampaign.mockImplementation(async (payload) => ({
      data: { data: { campaign: { _id: "c1", ...payload, state: "scheduled", theme: palette, sale: { ...payload.sale }, notify: payload.notify } } },
    }));
    const user = userEvent.setup();
    const router = renderEditor();

    expect(await screen.findByLabelText("Campaign name")).toHaveValue("Tihar Sale");
    expect(screen.getByLabelText("Greeting")).toHaveValue("Happy Tihar!");
    await fillDates(user);
    await user.clear(screen.getByLabelText("Percentage off"));
    await user.type(screen.getByLabelText("Percentage off"), "15");
    expect(screen.getByText(/Example:/)).toHaveTextContent("NPR 1,020");

    await user.click(screen.getByRole("button", { name: "Publish" }));

    await waitFor(() => expect(api.createCampaign).toHaveBeenCalled());
    expect(api.createCampaign.mock.calls[0][0]).toMatchObject({
      name: "Tihar Sale",
      festival: "tihar",
      palette: "diyo",
      status: "published",
      // 06:00 Nepal time (UTC+05:45) is 00:15 UTC
      startsAt: "2026-11-01T00:15:00.000Z",
      endsAt: "2026-11-05T17:15:00.000Z",
      sale: { type: "percent", value: 15, scope: "all" },
      notify: { pushOnLaunch: true },
    });
    await waitFor(() => expect(router.state.location.pathname).toBe("/admin/campaigns/c1/edit"));
  });

  it("shows an overlap error next to the schedule", async () => {
    api.createCampaign.mockRejectedValue({
      response: { data: { message: 'These dates overlap "Dashain Sale" (Oct 20–Oct 30). Only one campaign can run at a time.' } },
    });
    const user = userEvent.setup();
    renderEditor();
    await screen.findByLabelText("Campaign name");
    await fillDates(user);
    await user.click(screen.getByRole("button", { name: "Publish" }));

    expect(await screen.findByText(/overlap "Dashain Sale"/, { selector: "#schedule-error" })).toBeInTheDocument();
  });

  it("requires categories when the sale is limited to categories", async () => {
    const user = userEvent.setup();
    renderEditor();
    await screen.findByLabelText("Campaign name");
    await fillDates(user);
    await user.click(screen.getByText("Categories", { selector: "label" }));
    await user.click(screen.getByRole("button", { name: "Save draft" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Choose at least one category");
    expect(api.createCampaign).not.toHaveBeenCalled();
  });

  it("starts new campaigns now, so publishing shows them on the website at once", async () => {
    renderEditor();
    const start = (await screen.findByLabelText("Starts (Nepal time)")) as HTMLInputElement;
    const startUtc = Date.parse(`${start.value}:00Z`) - (5 * 60 + 45) * 60_000;
    expect(Math.abs(startUtc - Date.now())).toBeLessThan(2 * 60_000);
    expect(screen.getByText("Shows on the website as soon as you publish.")).toBeInTheDocument();
  });

  it("says a published future campaign isn't on the website yet, and can start it now", async () => {
    const startsAt = new Date(Date.now() + 15 * 3600_000).toISOString();
    const scheduled = {
      _id: "c9",
      name: "Dashain Sale",
      slug: "dashain-sale",
      festival: "custom",
      headline: "Dashain Sale",
      greeting: "",
      emoji: "🪁",
      palette: "diyo",
      ctaLabel: "Shop the sale",
      startsAt,
      endsAt: new Date(Date.now() + 8 * 86400_000).toISOString(),
      status: "published",
      sale: { type: "percent", value: 10, scope: "all", categories: [], products: [], excludeProducts: [] },
      notify: { pushOnLaunch: false, sentAt: null },
      state: "scheduled",
      theme: palette,
      saleLabel: "10% off",
    };
    api.getCampaign.mockResolvedValue({ data: { data: { campaign: scheduled } } });
    api.updateCampaign.mockImplementation(async (_id, payload) => ({
      data: { data: { campaign: { ...scheduled, ...payload, state: "live" } } },
    }));
    const user = userEvent.setup();
    renderEditor("/admin/campaigns/c9/edit");

    expect(await screen.findByText("Scheduled — not on the website yet.")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/in 1[45]h/);

    const banner = screen.getByRole("status");
    await user.click(within(banner).getByRole("button", { name: "Start now" }));

    await waitFor(() => expect(api.updateCampaign).toHaveBeenCalled());
    const [id, payload] = api.updateCampaign.mock.calls[0];
    expect(id).toBe("c9");
    expect(payload.status).toBe("published");
    expect(Math.abs(Date.parse(payload.startsAt) - Date.now())).toBeLessThan(2 * 60_000);
    expect(await screen.findByText("Live on the website now.")).toBeInTheDocument();
  });
});
