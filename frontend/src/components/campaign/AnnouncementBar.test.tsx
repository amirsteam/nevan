import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AnnouncementBar from "./AnnouncementBar";
import type { IPublicCampaign } from "../../types";

const state = vi.hoisted(() => ({ value: { campaign: null as unknown, loading: false, isPreview: false } }));
vi.mock("../../context/CampaignContext", () => ({ useCampaign: () => state.value }));

const campaign = (overrides: Partial<IPublicCampaign> = {}): IPublicCampaign => ({
  _id: "c1",
  name: "Tihar Sale",
  slug: "tihar-sale",
  festival: "tihar",
  headline: "Tihar Sale",
  subheadline: "",
  greeting: "Happy Tihar",
  emoji: "🪔",
  ctaLabel: "Shop the sale",
  bannerDesktop: null,
  bannerMobile: null,
  startsAt: new Date(Date.now() - 3600_000).toISOString(),
  endsAt: new Date(Date.now() + 2 * 86400_000 + 3.5 * 3600_000).toISOString(),
  state: "live",
  theme: { label: "Diyo", bg: "#2b1036", text: "#fff3d6", accent: "#f5b301", onAccent: "#2b1036", highlight: "#ff8a3d" },
  sale: { type: "percent", value: 15, scope: "all", label: "15% off", categories: [] },
  ...overrides,
});

const renderBar = () =>
  render(
    <MemoryRouter>
      <AnnouncementBar />
    </MemoryRouter>,
  );

describe("AnnouncementBar", () => {
  beforeEach(() => sessionStorage.clear());

  it("announces a live campaign with its offer, countdown and sale link", () => {
    state.value = { campaign: campaign(), loading: false, isPreview: false };
    renderBar();
    expect(screen.getByText(/15% off everything/)).toBeInTheDocument();
    expect(screen.getByText("2d 3h left")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Shop the sale/ })).toHaveAttribute("href", "/sale/tihar-sale");
  });

  it("stays hidden for scheduled campaigns and after being dismissed", () => {
    state.value = { campaign: campaign({ state: "scheduled" }), loading: false, isPreview: false };
    const { unmount } = renderBar();
    expect(screen.queryByRole("region")).toBeNull();
    unmount();

    state.value = { campaign: campaign(), loading: false, isPreview: false };
    renderBar();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss announcement" }));
    expect(screen.queryByRole("region")).toBeNull();
    expect(sessionStorage.getItem("campaign-bar-dismissed:tihar-sale")).toBe("1");
  });

  it("shows scheduled campaigns to admins previewing them", () => {
    state.value = { campaign: campaign({ state: "scheduled" }), loading: false, isPreview: true };
    renderBar();
    expect(screen.getByText("Preview")).toBeInTheDocument();
  });
});
