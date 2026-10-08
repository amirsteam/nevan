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
    renderCarousel([product(1), product(2), product(3)]);
    const [, ...productSlides] = screen.getAllByRole("group", { hidden: true });
    const images = productSlides.flatMap((slide) => [...slide.querySelectorAll("img")]);
    expect(images).toHaveLength(1);
    expect(images[0].getAttribute("src")).toContain("/upload/f_auto,q_auto,c_limit,w_720/");
    // Width descriptors: the browser picks a file for the layout (capped at 1080px)
    expect(images[0].getAttribute("srcset")).toBe(
      ["480w", "720w", "1080w"].map((w) => `https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_${parseInt(w)}/v1/romper-1.jpg ${w}`).join(", "),
    );
    expect(images[0].getAttribute("sizes")).toBeTruthy();
    // Fills the slide's height instead of sitting on a white card
    expect(images[0]).toHaveClass("object-cover", "h-full", "w-full");
  });

  it("fans the first three product photos out beside the brand pitch", () => {
    renderCarousel([product(1), product(2), product(3), product(4)]);
    const [brand] = screen.getAllByRole("group", { hidden: true });
    const images = [...brand.querySelectorAll("img")];
    expect(images).toHaveLength(3);
    expect(images[0].getAttribute("src")).toContain("w_420/v1/romper-1.jpg");
    expect(images.every((img) => img.getAttribute("loading") === "lazy")).toBe(true);
    const collageLinks = [...brand.querySelectorAll('a[href^="/products/"]')];
    expect(collageLinks.map((a) => a.getAttribute("href"))).toEqual(["/products/romper-1", "/products/romper-2", "/products/romper-3"]);
    expect(collageLinks.every((a) => a.getAttribute("tabindex") === "-1")).toBe(true);
  });

  it("leaves the collage out when no featured product has a photo", () => {
    renderCarousel([product(1, { images: [] })]);
    const [brand] = screen.getAllByRole("group", { hidden: true });
    expect(brand.querySelectorAll("img")).toHaveLength(0);
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
