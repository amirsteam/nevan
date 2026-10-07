import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import HeroCarousel from "./HeroCarousel";
import type { IProduct, IPublicCampaign } from "../../types";

const product = (n: number, overrides: Partial<IProduct> = {}): IProduct =>
  ({
    _id: `p${n}`,
    name: `Romper ${n}`,
    slug: `romper-${n}`,
    price: 1000 + n,
    category: { _id: "c1", name: "Rompers", slug: "rompers" },
    images: [{ url: `https://res.cloudinary.com/demo/image/upload/v1/romper-${n}.jpg`, isPrimary: true }],
    ...overrides,
  }) as IProduct;

const renderCarousel = (products: IProduct[]) =>
  render(
    <MemoryRouter>
      <HeroCarousel products={products} />
    </MemoryRouter>,
  );

const activeDot = () => screen.getAllByRole("button", { name: /Go to slide/ }).find((b) => b.getAttribute("aria-current") === "true");

describe("HeroCarousel", () => {
  afterEach(() => vi.useRealTimers());

  it("shows a brand slide plus one slide per featured product with an image", () => {
    renderCarousel([product(1), product(2), product(3, { images: [] })]);
    expect(screen.getAllByRole("group", { hidden: true })).toHaveLength(3);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/handmade clothing/);
    expect(activeDot()).toHaveAccessibleName("Go to slide 1");
  });

  it("moves with the arrows and dots, wrapping at both ends", () => {
    renderCarousel([product(1), product(2)]);
    fireEvent.click(screen.getByRole("button", { name: "Next slide" }));
    expect(activeDot()).toHaveAccessibleName("Go to slide 2");
    fireEvent.click(screen.getByRole("button", { name: "Go to slide 3" }));
    fireEvent.click(screen.getByRole("button", { name: "Next slide" }));
    expect(activeDot()).toHaveAccessibleName("Go to slide 1");
    fireEvent.click(screen.getByRole("button", { name: "Previous slide" }));
    expect(activeDot()).toHaveAccessibleName("Go to slide 3");
  });

  it("hides inactive slides from assistive tech and the tab order", () => {
    renderCarousel([product(1)]);
    const [brand, slide] = screen.getAllByRole("group", { hidden: true });
    expect(brand).toHaveAttribute("aria-hidden", "false");
    expect(slide).toHaveAttribute("aria-hidden", "true");
    expect(slide).toHaveAttribute("inert");
  });

  it("requests resized images and only for the current and next slide", () => {
    const { container } = renderCarousel([product(1), product(2), product(3)]);
    const images = container.querySelectorAll("img");
    expect(images).toHaveLength(1);
    expect(images[0].getAttribute("src")).toContain("/upload/f_auto,q_auto,c_limit,w_420/");
    expect(images[0].getAttribute("srcset")).toContain("w_840");
  });

  it("autoplays, and pauses while hovered", () => {
    vi.useFakeTimers();
    renderCarousel([product(1), product(2)]);
    act(() => vi.advanceTimersByTime(6000));
    expect(activeDot()).toHaveAccessibleName("Go to slide 2");

    fireEvent.mouseEnter(screen.getByRole("region", { name: "Featured" }));
    act(() => vi.advanceTimersByTime(20000));
    expect(activeDot()).toHaveAccessibleName("Go to slide 2");
  });

  it("supports arrow keys", () => {
    renderCarousel([product(1)]);
    fireEvent.keyDown(screen.getByRole("region", { name: "Featured" }), { key: "ArrowRight" });
    expect(activeDot()).toHaveAccessibleName("Go to slide 2");
  });

  it("puts a live campaign first, as a themed banner linking to its sale", () => {
    const campaign = {
      _id: "c1",
      name: "Dashain Sale",
      slug: "dashain-sale",
      festival: "dashain",
      headline: "Dashain Sale",
      subheadline: "",
      greeting: "Happy Bijaya Dashami",
      emoji: "🪁",
      ctaLabel: "Shop the sale",
      bannerDesktop: null,
      bannerMobile: null,
      startsAt: new Date().toISOString(),
      endsAt: new Date(Date.now() + 86400_000).toISOString(),
      state: "live",
      theme: { label: "Marigold", bg: "#fff4dc", text: "#5a1a0f", accent: "#b3261e", onAccent: "#ffffff", highlight: "#f2a30f" },
      sale: { type: "percent", value: 20, scope: "all", label: "20% off", categories: [] },
    } as IPublicCampaign;
    render(
      <MemoryRouter>
        <HeroCarousel products={[product(1)]} campaign={campaign} />
      </MemoryRouter>,
    );
    const [first] = screen.getAllByRole("group", { hidden: true });
    expect(first).toHaveAccessibleName("1 of 3: Dashain Sale");
    expect(screen.getByText("20% off everything")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Shop the sale/ })).toHaveAttribute("href", "/sale/dashain-sale");
  });
});
