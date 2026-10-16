import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Visitors from "./Visitors";
import type { ILiveVisitors, IVisitorStats, IVisitTotals } from "../../types";

const api = vi.hoisted(() => ({ getVisitorStats: vi.fn(), getLiveVisitors: vi.fn(), getVisitTimeline: vi.fn() }));
vi.mock("../../api", () => ({ adminAPI: api }));

const totals = (overrides: Partial<IVisitTotals> = {}): IVisitTotals => ({
  visitors: 0,
  visits: 0,
  pageViews: 0,
  productViews: 0,
  searches: 0,
  addToCarts: 0,
  checkouts: 0,
  orderingVisitors: 0,
  ordersPlaced: 0,
  conversion: 0,
  ...overrides,
});

const stats = (overrides: Partial<IVisitorStats> = {}): IVisitorStats => ({
  range: "7d",
  from: "2026-10-09T18:15:00.000Z",
  to: "2026-10-16T08:00:00.000Z",
  granularity: "day",
  comparable: true,
  retentionDays: 90,
  totals: {
    current: totals({ visitors: 120, visits: 150, productViews: 340, addToCarts: 25, ordersPlaced: 6, orderingVisitors: 6, conversion: 0.05 }),
    previous: totals({ visitors: 100, productViews: 300, addToCarts: 20, ordersPlaced: 4, conversion: 0.04 }),
  },
  series: [
    { key: "2026-10-15", visitors: 50, productViews: 120, orders: 2 },
    { key: "2026-10-16", visitors: 70, productViews: 220, orders: 4 },
  ],
  funnel: [
    { step: "visit", label: "Visited", visitors: 120 },
    { step: "product_view", label: "Viewed a product", visitors: 80 },
    { step: "add_to_cart", label: "Added to cart", visitors: 20 },
    { step: "checkout_start", label: "Started checkout", visitors: 10 },
    { step: "order_placed", label: "Placed an order", visitors: 6 },
  ],
  sources: [
    { source: "Facebook", visits: 90, orders: 4 },
    { source: "Direct", visits: 60, orders: 2 },
  ],
  devices: [{ device: "mobile", visits: 130 }, { device: "desktop", visits: 20 }],
  hours: Array.from({ length: 24 }, (_, hour) => ({ hour, pageViews: hour === 20 ? 40 : 2 })),
  topProducts: [
    {
      _id: "p1",
      name: "Muslin Romper",
      slug: "muslin-romper",
      isActive: true,
      views: 90,
      carts: 12,
      orders: 4,
      quantity: 5,
      conversion: 4 / 90,
      notSelling: false,
    },
    {
      _id: "p2",
      name: "Pink Flannel Frock",
      slug: "pink-flannel-frock",
      isActive: true,
      views: 40,
      carts: 3,
      orders: 0,
      quantity: 0,
      conversion: 0,
      notSelling: true,
    },
  ],
  searches: { top: [{ query: "romper", searches: 12, results: 4 }], noResults: [{ query: "woollen cap", searches: 3 }] },
  topPages: [{ path: "/", views: 200 }],
  ...overrides,
});

const live: ILiveVisitors = {
  onlineNow: 3,
  todayVisitors: 70,
  recent: [
    {
      session: "11111111-1111-4111-8111-111111111111",
      name: "Asha Shrestha",
      visitorLabel: "Visitor 1a2b",
      returning: true,
      device: "mobile",
      source: "Facebook",
      referrerHost: null,
      campaign: "dashain",
      landingPath: "/",
      startedAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      online: true,
      pageViews: 4,
      productViews: 2,
      addToCarts: 1,
      ordered: false,
      productsViewed: 2,
      products: [{ _id: "p1", name: "Muslin Romper", slug: "muslin-romper" }],
    },
    {
      session: "22222222-2222-4222-8222-222222222222",
      name: null,
      visitorLabel: "Visitor 9f3c",
      returning: false,
      device: "desktop",
      source: "Google",
      referrerHost: null,
      campaign: null,
      landingPath: "/about",
      startedAt: new Date(Date.now() - 3600_000).toISOString(),
      lastSeenAt: new Date(Date.now() - 3600_000).toISOString(),
      online: false,
      pageViews: 1,
      productViews: 0,
      addToCarts: 0,
      ordered: false,
      productsViewed: 0,
      products: [],
    },
  ],
};

const renderPage = (path = "/admin/visitors") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Visitors />
    </MemoryRouter>,
  );

describe("Admin Visitors", () => {
  beforeEach(() => {
    api.getVisitorStats.mockReset().mockResolvedValue({ data: { data: stats() } });
    api.getLiveVisitors.mockReset().mockResolvedValue({ data: { data: live } });
    api.getVisitTimeline.mockReset();
  });

  it("shows the key numbers against the period before, and the funnel", async () => {
    renderPage();

    const kpis = (await screen.findByRole("heading", { name: "Key numbers" })).closest("section")!;
    expect(api.getVisitorStats).toHaveBeenCalledWith("7d");
    const visitorsCard = within(kpis).getByText("Visitors").closest(".stat-card")!;
    expect(visitorsCard).toHaveTextContent("120");
    expect(visitorsCard).toHaveTextContent("+20%"); // 120 vs 100
    expect(visitorsCard).toHaveTextContent("150 visits");
    expect(within(kpis).getByText("Conversion").closest(".stat-card")).toHaveTextContent("5%");
    // The header pill (the latest-visits list also says "Online now" per visit)
    expect(await screen.findByText((_, el) => el?.tagName === "SPAN" && el.textContent === "3 online now")).toBeInTheDocument();

    const funnel = screen.getByRole("heading", { name: "From visit to order" }).closest("section")!;
    expect(within(funnel).getByText("Placed an order")).toBeInTheDocument();
    expect(within(funnel).getByText(/40% stopped before this step/)).toBeInTheDocument(); // 6 of 10 checkouts
  });

  it("lists where visitors came from, top products, searches with no results and busy hours", async () => {
    renderPage();
    await screen.findByText("Muslin Romper", { selector: "span" });

    const sources = screen.getByRole("heading", { name: "Where visitors come from" }).closest("section")!;
    expect(within(sources).getByText("Facebook")).toBeInTheDocument();
    expect(within(sources).getByText(/4 ordered/)).toBeInTheDocument();

    const products = screen.getByRole("heading", { name: "Most viewed products" }).closest("section")!;
    expect(within(products).getByRole("link", { name: /Muslin Romper/ })).toHaveAttribute("href", "/admin/products/p1/edit");
    expect(within(products).getByText("Viewed a lot, not ordered")).toBeInTheDocument();

    expect(screen.getByText("woollen cap · 3")).toBeInTheDocument();
    expect(screen.getByText(/Most browsing around 8pm–9pm/)).toBeInTheDocument();
  });

  it("names signed-in visitors only and opens a visit's timeline", async () => {
    api.getVisitTimeline.mockResolvedValue({
      data: {
        data: {
          visit: {
            session: live.recent[0].session,
            name: "Asha Shrestha",
            visitorLabel: "Visitor 1a2b",
            device: "mobile",
            source: "Facebook",
            referrerHost: null,
            campaign: "dashain",
            startedAt: live.recent[0].startedAt,
            lastSeenAt: live.recent[0].lastSeenAt,
            events: [
              { type: "product_view", at: live.recent[0].startedAt, path: "/products/muslin-romper", query: null, results: null, product: { _id: "p1", name: "Muslin Romper", slug: "muslin-romper" }, order: null },
              { type: "search", at: live.recent[0].startedAt, path: "/products", query: "woollen cap", results: 0, product: null, order: null },
            ],
          },
        },
      },
    });
    renderPage();

    const asha = await screen.findByRole("button", { name: /Asha Shrestha/ });
    expect(asha).toHaveTextContent("Facebook (dashain)");
    expect(asha).toHaveTextContent("In cart");
    expect(screen.getByRole("button", { name: /Visitor 9f3c/ })).toHaveTextContent("landed on /about");

    fireEvent.click(asha);
    const drawer = await screen.findByRole("dialog");
    expect(await within(drawer).findByText(/nothing found/)).toBeInTheDocument();
    expect(within(drawer).getByRole("link", { name: /Muslin Romper/ })).toHaveAttribute("href", "/admin/products/p1/edit");
  });

  it("reads the range from the address and explains an empty period", async () => {
    api.getVisitorStats.mockResolvedValue({
      data: { data: stats({ range: "today", granularity: "hour", totals: { current: totals(), previous: totals() }, topProducts: [] }) },
    });
    renderPage("/admin/visitors?range=today");

    expect(await screen.findByText(/No visits recorded for this period yet/)).toBeInTheDocument();
    expect(api.getVisitorStats).toHaveBeenCalledWith("today");
    expect(screen.getByRole("button", { name: "Today" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("No product views in this period yet.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "30 days" }));
    expect(api.getVisitorStats).toHaveBeenLastCalledWith("30d");
  });
});
