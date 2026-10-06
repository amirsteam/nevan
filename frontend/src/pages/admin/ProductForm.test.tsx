import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProductForm from "./ProductForm";
import type { IProduct, ICategory } from "../../types";

const api = vi.hoisted(() => ({
  getProductSizeOptions: vi.fn(),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  uploadProductImages: vi.fn(),
  uploadVariantImage: vi.fn(),
  deleteProductImage: vi.fn(),
}));

vi.mock("../../api", () => ({ adminAPI: api }));
vi.mock("react-hot-toast", () => ({
  default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), loading: vi.fn(), dismiss: vi.fn() }),
}));

const categories: ICategory[] = [{ _id: "cat1", name: "Rompers", slug: "rompers" }];

const savedResponse = (product: Partial<IProduct>) => ({
  data: { data: { product: { _id: "p1", variants: [], ...product } } },
});

const fillBasics = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByPlaceholderText("Enter product name"), "Muslin Romper");
  await user.type(screen.getByPlaceholderText("Detailed product description"), "Soft");
  const price = screen.getAllByPlaceholderText("0")[0];
  await user.clear(price);
  await user.type(price, "1200");
  await user.selectOptions(screen.getByDisplayValue("Select category"), "cat1");
};

describe("ProductForm sizes", () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset());
    api.getProductSizeOptions.mockResolvedValue({
      data: { data: { sizes: { builtIn: [], custom: ["90 cm"] } } },
    });
    api.createProduct.mockImplementation(async (data) => savedResponse(data));
    api.updateProduct.mockImplementation(async (_id, data) => savedResponse(data));
  });

  it("offers built-in sizes, saved custom sizes and a custom size option", async () => {
    const user = userEvent.setup();
    render(<ProductForm categories={categories} onSuccess={vi.fn()} onCancel={vi.fn()} />);

    await user.click(screen.getByLabelText("Enable Variants"));
    const sizeSelect = await screen.findByDisplayValue("Select Size...");

    await waitFor(() =>
      expect(within(sizeSelect).getByRole("option", { name: "90 cm" })).toBeInTheDocument(),
    );
    expect(within(sizeSelect).getByRole("option", { name: "One Size" })).toBeInTheDocument();
    expect(within(sizeSelect).getByRole("option", { name: "+ Custom size…" })).toBeInTheDocument();
  });

  it("creates a product with a custom size typed by the admin", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    render(<ProductForm categories={categories} onSuccess={onSuccess} onCancel={vi.fn()} />);

    await fillBasics(user);
    await user.click(screen.getByLabelText("Enable Variants"));
    await user.selectOptions(screen.getByDisplayValue("Select Size..."), "+ Custom size…");
    await user.type(screen.getByLabelText("Custom size"), "3-6 Months");
    await user.type(screen.getByPlaceholderText("Color (e.g. Red)"), "White");
    await user.click(screen.getByRole("button", { name: "Create Product" }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    const payload = api.createProduct.mock.calls[0][0];
    expect(payload.variants).toEqual([
      expect.objectContaining({ size: "3-6 Months", color: "White" }),
    ]);
    expect(payload.variants[0]).not.toHaveProperty("_id");
  });

  it("blocks duplicate size/color variants before saving", async () => {
    const user = userEvent.setup();
    render(<ProductForm categories={categories} onSuccess={vi.fn()} onCancel={vi.fn()} />);

    await fillBasics(user);
    await user.click(screen.getByLabelText("Enable Variants"));
    await user.selectOptions(screen.getByDisplayValue("Select Size..."), "One Size");
    await user.type(screen.getByPlaceholderText("Color (e.g. Red)"), "Red");
    await user.click(screen.getByTitle("Duplicate Variant"));
    await user.click(screen.getByRole("button", { name: "Create Product" }));

    expect(await screen.findByText(/Duplicate variant: One Size \/ Red/)).toBeInTheDocument();
    expect(api.createProduct).not.toHaveBeenCalled();
  });

  it("keeps variant ids, shows existing custom sizes and clears removed fields on edit", async () => {
    const user = userEvent.setup();
    const product: IProduct = {
      _id: "p1",
      name: "Romper",
      slug: "romper",
      description: "Soft",
      price: 1200,
      comparePrice: 1500,
      category: "cat1",
      images: [],
      stock: 0,
      variants: [{ _id: "v1", size: "18-24 Months", color: "Blue", price: 1200, stock: 4 }],
    };
    render(<ProductForm product={product} categories={categories} onSuccess={vi.fn()} onCancel={vi.fn()} />);

    // A custom size that isn't in the suggestions still shows as an editable value
    expect(await screen.findByDisplayValue("18-24 Months")).toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText("Original price (optional)"));
    await user.click(screen.getByRole("button", { name: "Update Product" }));

    await waitFor(() => expect(api.updateProduct).toHaveBeenCalled());
    const payload = api.updateProduct.mock.calls[0][1];
    expect(payload.variants[0]).toMatchObject({ _id: "v1", size: "18-24 Months" });
    expect(payload.comparePrice).toBeNull();
  });
});
