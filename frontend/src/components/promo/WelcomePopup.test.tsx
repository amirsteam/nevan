import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import WelcomePopup from "./WelcomePopup";
import type { IProduct, IPublicCampaign } from "../../types";

const mocks = vi.hoisted(() => ({
  campaign: null as IPublicCampaign | null,
  getProducts: vi.fn(),
  getFeatured: vi.fn(),
}));

vi.mock("../../context/CampaignContext", () => ({
  useCampaign: () => ({ campaign: mocks.campaign, loading: false, isPreview: false }),
}));
vi.mock("../../context/PendingCartContext", () => ({ usePendingCart: () => ({ isModalOpen: false }) }));
vi.mock("../../api/products", () => ({
  productsAPI: { getProducts: mocks.getProducts, getFeatured: mocks.getFeatured },
}));

const product = (n: number, extra: Partial<IProduct> = {}): IProduct =>
  ({
    _id: `p${n}`,
    name: `Product ${n}`,
    slug: `product-${n}`,
    price: 1000 + n,
    images: [{ url: `https://example.com/${n}.jpg`, publicId: "x", isPrimary: true }],
    variants: [],
    ...extra,
  }) as unknown as IProduct;

const saleCampaign = {
  _id: "c1",
  name: "Dashain Sale",
  slug: "dashain-sale",
  emoji: "🪁",
  headline: "Dashain Sale",
  subheadline: "",
  greeting: "",
  ctaLabel: "Shop the sale",
  state: "live",
  showPopup: true,
  endsAt: new Date(Date.now() + 86_400_000).toISOString(),
  theme: { label: "", bg: "#123456", text: "#ffffff", accent: "#ffcc00", onAccent: "#000000", highlight: "#ffcc00" },
  sale: { type: "percent", value: 10, scope: "all", label: "10% off", categories: [] },
} as unknown as IPublicCampaign;

const renderAt = (path = "/") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <WelcomePopup />
    </MemoryRouter>,
  );

// Let the product requests resolve and the popup render (it opens as soon as they do)
const waitForPopup = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
  await act(async () => {
    vi.advanceTimersByTime(3000);
  });
};

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  sessionStorage.clear();
  mocks.campaign = null;
  mocks.getFeatured.mockResolvedValue({ data: { products: [product(1), product(2), product(3), product(4), product(5)] } });
  mocks.getProducts.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("WelcomePopup", () => {
  it("shows four Featured products once per visitor when no sale is on", async () => {
    const { unmount } = renderAt();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await waitForPopup();
    const dialog = screen.getByRole("dialog", { name: "Featured products" });
    expect(dialog).toHaveTextContent("Our favourites");
    expect(screen.getAllByRole("link", { name: /Product \d/ })).toHaveLength(4);
    unmount();

    // Next visit: not again
    sessionStorage.clear();
    renderAt();
    await waitForPopup();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the live sale with Featured sale products first, then best sellers", async () => {
    mocks.campaign = saleCampaign;
    mocks.getProducts.mockImplementation(async (params: { isFeatured?: boolean }) => ({
      data: { products: params.isFeatured ? [product(7)] : [product(1), product(7), product(2), product(3), product(4)] },
    }));

    renderAt();
    await waitForPopup();

    const dialog = screen.getByRole("dialog", { name: /Dashain Sale/ });
    expect(dialog).toHaveTextContent("10% off");
    expect(screen.getByRole("link", { name: /Shop the sale/ })).toHaveAttribute("href", "/sale/dashain-sale");
    expect(screen.getAllByRole("link", { name: /Product \d/ }).map((a) => a.getAttribute("href"))).toEqual([
      "/products/product-7",
      "/products/product-1",
      "/products/product-2",
      "/products/product-3",
    ]);
    expect(localStorage.getItem("nevan-popup-seen:campaign:c1")).toBe("1");
  });

  it("waits while the visitor is on a task page such as checkout", async () => {
    renderAt("/checkout");
    await waitForPopup();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(localStorage.getItem("nevan-popup-seen:featured")).toBeNull();
  });
});
