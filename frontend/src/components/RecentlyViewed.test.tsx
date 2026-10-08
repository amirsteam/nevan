import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, within, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RecentlyViewed from "./RecentlyViewed";
import { getRecentlyViewed, recordProductView, resetRecentlyViewedCache } from "../utils/recentlyViewed";
import type { IProduct } from "../types";

const getProducts = vi.hoisted(() => vi.fn());
vi.mock("../api", () => ({ productsAPI: { getProducts } }));
// The card has its own tests and needs auth/cart context; a stand-in is enough here
vi.mock("./ProductCard", () => ({ default: ({ product }: { product: IProduct }) => <article>{product.name}</article> }));

const product = (id: string) => ({ _id: id, name: `Product ${id}`, slug: id }) as IProduct;

const renderRail = (props: { excludeId?: string } = {}) =>
  render(
    <MemoryRouter>
      <RecentlyViewed {...props} />
    </MemoryRouter>,
  );

describe("RecentlyViewed", () => {
  beforeEach(() => {
    localStorage.clear();
    resetRecentlyViewedCache();
    getProducts.mockReset();
  });

  it("renders nothing (and fetches nothing) before anything was viewed", () => {
    const { container } = renderRail();
    expect(container).toBeEmptyDOMElement();
    expect(getProducts).not.toHaveBeenCalled();
  });

  it("fetches the viewed products fresh and shows them in viewing order", async () => {
    ["a", "b", "c"].forEach(recordProductView); // c viewed last
    // The API returns its own order
    getProducts.mockResolvedValue({ data: { products: [product("a"), product("b"), product("c")] } });
    renderRail();

    expect(screen.getByRole("status")).toHaveTextContent("Loading products");
    const section = await screen.findByRole("region", { name: "Recently viewed" });
    expect(within(section).getAllByRole("article").map((a) => a.textContent)).toEqual(["Product c", "Product b", "Product a"]);
    expect(getProducts).toHaveBeenCalledWith({ ids: "c,b,a", limit: 3 });
  });

  it("leaves out the product on screen and ones no longer available", async () => {
    ["a", "b", "gone"].forEach(recordProductView);
    getProducts.mockResolvedValue({ data: { products: [product("a")] } });
    renderRail({ excludeId: "b" });

    const section = await screen.findByRole("region", { name: "Recently viewed" });
    expect(within(section).getAllByRole("article").map((a) => a.textContent)).toEqual(["Product a"]);
    expect(getProducts).toHaveBeenCalledWith({ ids: "gone,a", limit: 2 });
  });

  it("only fetches newly viewed products, and Clear forgets the list", async () => {
    recordProductView("a");
    getProducts.mockResolvedValueOnce({ data: { products: [product("a")] } });
    renderRail();
    await screen.findByText("Product a");

    getProducts.mockResolvedValueOnce({ data: { products: [product("b")] } });
    recordProductView("b");
    await screen.findByText("Product b");
    expect(getProducts).toHaveBeenLastCalledWith({ ids: "b", limit: 1 });

    fireEvent.click(screen.getByRole("button", { name: "Clear recently viewed" }));
    await waitFor(() => expect(screen.queryByRole("region")).toBeNull());
    expect(getRecentlyViewed()).toEqual([]);
  });

  it("hides quietly when the products can't be loaded", async () => {
    recordProductView("a");
    getProducts.mockRejectedValue(new Error("offline"));
    const { container } = renderRail();
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });
});
