import { describe, it, expect, vi } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import chatReducer from "../../store/chatSlice";
import ShopByAge from "./ShopByAge";
import CategoryShowcase from "./CategoryShowcase";
import ProductRail from "./ProductRail";
import HelpBand from "./HelpBand";
import type { ICategory, IProduct } from "../../types";

// The card has its own tests and needs auth/cart context; a stand-in is enough here
vi.mock("../ProductCard", () => ({ default: ({ product }: { product: IProduct }) => <article>{product.name}</article> }));

const category = (n: number, overrides: Partial<ICategory> = {}): ICategory => ({
  _id: `c${n}`,
  name: `Category ${n}`,
  slug: `category-${n}`,
  image: { url: `https://res.cloudinary.com/demo/image/upload/v1/cat-${n}.jpg`, publicId: `cat-${n}` },
  productCount: n,
  ...overrides,
});

const withRouter = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe("ShopByAge", () => {
  it("links every age band and gender to the filtered shop", () => {
    withRouter(<ShopByAge />);
    const newborn = screen.getByRole("link", { name: /0–3\s*months\s*Newborn/ });
    expect(newborn).toHaveAttribute("href", "/products?age=0-3%20Months");
    expect(screen.getByRole("link", { name: /6–10\s*years\s*Junior/ })).toHaveAttribute("href", "/products?age=6-10%20Years");

    const genders = within(screen.getByRole("navigation", { name: "Shop by gender" })).getAllByRole("link");
    expect(genders.map((a) => a.getAttribute("href"))).toEqual([
      "/products?gender=girl",
      "/products?gender=boy",
      "/products?gender=unisex",
    ]);
  });
});

describe("CategoryShowcase", () => {
  it("shows the first five categories, the first as a large feature tile", () => {
    withRouter(<CategoryShowcase categories={[1, 2, 3, 4, 5, 6].map((n) => category(n))} />);
    const tiles = within(screen.getByRole("list")).getAllByRole("link");
    expect(tiles).toHaveLength(5);
    expect(tiles[0]).toHaveAttribute("href", "/products?category=category-1");
    expect(tiles[0].closest("li")).toHaveClass("col-span-2", "lg:row-span-2");
    // The feature tile asks Cloudinary for a wider image than the others
    expect(tiles[0].querySelector("img")?.getAttribute("src")).toContain("w_720");
    expect(tiles[1].querySelector("img")?.getAttribute("src")).toContain("w_400");
    expect(within(tiles[1]).getByText("2 products")).toBeInTheDocument();
    expect(within(tiles[0]).getByText("1 product")).toBeInTheDocument();
  });

  it("uses an even grid for fewer categories, and a letter when there's no image", () => {
    withRouter(<CategoryShowcase categories={[category(1, { image: undefined }), category(2)]} />);
    const list = screen.getByRole("list");
    expect(list).toHaveClass("md:grid-cols-2");
    expect(list).not.toHaveClass("lg:grid-cols-4");
    const [first] = within(list).getAllByRole("link");
    expect(first.querySelector("img")).toBeNull();
    expect(within(first).getByText("C")).toHaveAttribute("aria-hidden", "true");
  });

  it("shows placeholders while loading and nothing once there are none", () => {
    const { rerender } = withRouter(<CategoryShowcase categories={[]} loading />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading categories");
    rerender(
      <MemoryRouter>
        <CategoryShowcase categories={[]} />
      </MemoryRouter>,
    );
    expect(screen.queryByRole("heading", { name: "Shop by category" })).toBeNull();
  });
});

describe("ProductRail", () => {
  const products = [1, 2, 3].map((n) => ({ _id: `p${n}`, name: `Romper ${n}`, slug: `romper-${n}` }) as IProduct);

  it("renders one scroll-snapping item per product under a labelled heading", () => {
    withRouter(<ProductRail id="rail" title="New arrivals" action={{ to: "/products", label: "See all" }} products={products} />);
    const section = screen.getByRole("region", { name: "New arrivals" });
    const items = within(section).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveClass("snap-start");
    expect(within(section).getByRole("link", { name: "See all" })).toHaveAttribute("href", "/products");
  });

  it("shows skeletons while loading and hides when there are no products", () => {
    const { rerender } = withRouter(<ProductRail id="rail" title="New arrivals" products={[]} loading />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading products");
    rerender(
      <MemoryRouter>
        <ProductRail id="rail" title="New arrivals" products={[]} />
      </MemoryRouter>,
    );
    expect(screen.queryByRole("region")).toBeNull();
  });
});

describe("HelpBand", () => {
  const renderBand = () => {
    const store = configureStore({ reducer: { chat: chatReducer } });
    render(
      <Provider store={store}>
        <HelpBand />
      </Provider>,
    );
    return store;
  };

  it("opens live chat with a size question ready to send", () => {
    const store = renderBand();
    fireEvent.click(screen.getByRole("button", { name: "Chat with us" }));
    expect(store.getState().chat.isOpen).toBe(true);
    expect(store.getState().chat.draft).toMatch(/choose the right size/);
  });

  it("opens the size guide and links to WhatsApp in a new tab", () => {
    renderBand();
    fireEvent.click(screen.getByRole("button", { name: "Size guide" }));
    expect(screen.getByRole("dialog", { name: "Size guide" })).toBeInTheDocument();
    const whatsapp = screen.getByRole("link", { name: /WhatsApp/ });
    expect(whatsapp).toHaveAttribute("target", "_blank");
    expect(whatsapp.getAttribute("href")).toMatch(/^https:\/\/wa\.me\//);
  });
});
