import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import toast from "react-hot-toast";
import ProductForm from "./ProductForm";
import type { IProduct, ICategory } from "../../types";

const api = vi.hoisted(() => ({
  getProductOptions: vi.fn(),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  uploadProductImages: vi.fn(),
  deleteProductImage: vi.fn(),
}));

vi.mock("../../api", () => ({ adminAPI: api }));
vi.mock("react-hot-toast", () => ({
  default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), loading: vi.fn(), dismiss: vi.fn() }),
}));

beforeAll(() => {
  URL.createObjectURL = vi.fn(() => "blob:preview");
  URL.revokeObjectURL = vi.fn();
});

const categories: ICategory[] = [{ _id: "cat1", name: "Rompers", slug: "rompers" }];

const response = (product: Partial<IProduct>) => ({
  data: { data: { product: { _id: "p1", variants: [], images: [], ...product } } },
});

const renderForm = (props: Partial<Parameters<typeof ProductForm>[0]> = {}) => {
  const onSaved = vi.fn();
  const onDirtyChange = vi.fn();
  render(
    <ProductForm categories={categories} onSaved={onSaved} onCancel={vi.fn()} onDirtyChange={onDirtyChange} {...props} />,
  );
  return { onSaved, onDirtyChange };
};

const fillDetails = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByLabelText(/Product name/), "Muslin Romper");
  await user.type(screen.getByLabelText(/^Description/), "Soft and breathable");
  await user.selectOptions(screen.getByLabelText(/Category/), "cat1");
};

const savedProduct = (): IProduct =>
  ({
    _id: "p1",
    name: "Jhabla",
    slug: "jhabla",
    description: "Soft",
    price: 1200,
    category: "cat1",
    stock: 3,
    isActive: true,
    sizes: ["0-3 Months"],
    colors: [{ name: "Red", hex: "#c62828" }],
    variants: [{ _id: "v1", size: "0-3 Months", color: "Red", price: 1200, stock: 3 }],
    images: [
      { _id: "i1", url: "https://example.com/general.jpg", publicId: "g", isPrimary: true },
      { _id: "i2", url: "https://example.com/red.jpg", publicId: "r", color: "Red" },
    ],
  }) as IProduct;

describe("ProductForm", () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset());
    vi.mocked(toast.error).mockClear();
    api.getProductOptions.mockResolvedValue({
      data: { data: { sizes: { builtIn: [], custom: ["90 cm"] }, colors: { palette: [], used: [{ name: "Marigold", hex: "#f2a30f" }] } } },
    });
    api.createProduct.mockImplementation(async (data) => response(data));
    api.updateProduct.mockImplementation(async (_id, data) => response(data));
  });

  it("creates a one-version product", async () => {
    const user = userEvent.setup();
    const { onSaved } = renderForm();
    await fillDetails(user);
    await user.type(screen.getByLabelText(/Price \(NPR\)/), "1200");
    await user.type(screen.getByLabelText(/In stock/), "4");
    await user.click(screen.getByRole("button", { name: "Create product" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ _id: "p1" }), { reopen: false }));
    expect(api.createProduct).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Muslin Romper", price: 1200, stock: 4, variants: [], isActive: true, category: "cat1" }),
    );
  });

  it("builds sizes × colours with one price per size and a stock grid", async () => {
    const user = userEvent.setup();
    renderForm();
    await fillDetails(user);
    await user.click(screen.getByLabelText(/Sizes & colours/));

    await user.click(screen.getByRole("button", { name: "0-3 Months" }));
    await user.click(screen.getByRole("button", { name: "3-6 Months" }));
    // Custom sizes used on other products are offered too
    expect(await screen.findByRole("button", { name: "90 cm" })).toHaveAttribute("aria-pressed", "false");

    await user.click(screen.getByRole("button", { name: "Add colour" }));
    const suggested = screen.getByRole("group", { name: "Suggested colours" });
    await user.click(within(suggested).getByRole("button", { name: "Mint" }));
    await user.click(within(suggested).getByRole("button", { name: "White" }));
    expect(within(suggested).getByRole("button", { name: /Mint/ })).toBeDisabled();

    await user.type(screen.getByLabelText("Same price for every size (NPR)"), "900");
    await user.click(screen.getAllByRole("button", { name: "Apply" })[0]);
    await user.clear(screen.getByLabelText("Price for 3-6 Months"));
    await user.type(screen.getByLabelText("Price for 3-6 Months"), "950");
    await user.type(screen.getByLabelText("Same stock for every option"), "2");
    await user.click(screen.getAllByRole("button", { name: "Apply" })[1]);
    await user.click(screen.getByRole("button", { name: "Not made: 3-6 Months, White" }));

    await user.click(screen.getByRole("button", { name: "Create product" }));
    await waitFor(() => expect(api.createProduct).toHaveBeenCalled());
    const payload = api.createProduct.mock.calls[0][0];
    expect(payload.sizes).toEqual(["0-3 Months", "3-6 Months"]);
    expect(payload.colors).toEqual([
      { name: "Mint", hex: "#a8e6cf" },
      { name: "White", hex: "#ffffff" },
    ]);
    expect(payload.variants).toEqual([
      { size: "0-3 Months", color: "Mint", price: 900, comparePrice: null, stock: 2, sku: null },
      { size: "0-3 Months", color: "White", price: 900, comparePrice: null, stock: 2, sku: null },
      { size: "3-6 Months", color: "Mint", price: 950, comparePrice: null, stock: 2, sku: null },
    ]);
    expect(payload.ageGroups).toEqual(["0-3 Months", "3-6 Months"]);
  });

  it("keeps a new product hidden until its photos have uploaded, then shows it", async () => {
    const user = userEvent.setup();
    api.uploadProductImages.mockResolvedValue(response({ images: [{ _id: "img1", url: "https://example.com/1.jpg", publicId: "1" }] }));
    const { onSaved } = renderForm();
    await fillDetails(user);
    await user.type(screen.getByLabelText(/Price \(NPR\)/), "800");
    await user.type(screen.getByLabelText(/In stock/), "1");
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    await user.upload(input, new File(["x"], "front.jpg", { type: "image/jpeg" }));
    expect(screen.getByRole("img", { name: "this product photo 1" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Create product" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(expect.anything(), { reopen: false }));
    expect(api.createProduct.mock.calls[0][0].isActive).toBe(false);
    const form: FormData = api.uploadProductImages.mock.calls[0][1];
    expect(JSON.parse(String(form.get("meta")))).toEqual([{ color: null, isPrimary: true }]);
    expect(api.updateProduct).toHaveBeenCalledWith("p1", { isActive: true });
  });

  it("reopens a new product that saved without its photos instead of creating it again", async () => {
    const user = userEvent.setup();
    api.uploadProductImages.mockRejectedValue(new Error("offline"));
    const { onSaved } = renderForm();
    await fillDetails(user);
    await user.type(screen.getByLabelText(/Price \(NPR\)/), "800");
    await user.type(screen.getByLabelText(/In stock/), "1");
    await user.upload(document.querySelector<HTMLInputElement>('input[type="file"]')!, new File(["x"], "a.png", { type: "image/png" }));
    await user.click(screen.getByRole("button", { name: "Create product" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ _id: "p1" }), { reopen: true }));
    expect(api.updateProduct).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/Saved as hidden/), expect.anything());
  });

  it("points at what's missing and doesn't save", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole("button", { name: "Create product" }));

    expect(toast.error).toHaveBeenCalledWith("Please fix the highlighted fields");
    expect(screen.getByLabelText(/Product name/)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Give the product a name")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText(/Product name/)).toHaveFocus());
    expect(api.createProduct).not.toHaveBeenCalled();

    // Errors clear as they're fixed
    await user.type(screen.getByLabelText(/Product name/), "Bib");
    expect(screen.queryByText("Give the product a name")).toBeNull();
  });

  it("removes photos only when the product is saved, and keeps variant ids", async () => {
    const user = userEvent.setup();
    const { onDirtyChange } = renderForm({ product: savedProduct() });
    expect(screen.getByRole("img", { name: "Red photo 1" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Remove every colour photo 1" }));
    expect(api.deleteProductImage).not.toHaveBeenCalled();
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);

    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(api.updateProduct).toHaveBeenCalled());
    const [id, payload] = api.updateProduct.mock.calls[0];
    expect(id).toBe("p1");
    // The remaining photo becomes the main one
    expect(payload.images).toEqual([{ _id: "i2", color: "Red", isPrimary: true }]);
    expect(payload.variants).toEqual([{ _id: "v1", size: "0-3 Months", color: "Red", price: 1200, comparePrice: null, stock: 3, sku: null }]);
  });

  it("asks before turning a product with saved sizes into one version", async () => {
    const user = userEvent.setup();
    renderForm({ product: savedProduct() });
    await user.click(screen.getByLabelText(/One version/));

    const dialog = await screen.findByRole("dialog", { name: "Remove the sizes and colours?" });
    await user.click(within(dialog).getByRole("button", { name: "Keep it" }));
    expect(screen.getByLabelText(/Sizes & colours/)).toBeChecked();

    await user.click(screen.getByLabelText(/One version/));
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Use one version" }));
    expect(screen.getByLabelText(/One version/)).toBeChecked();
    expect(screen.getByLabelText(/Price \(NPR\)/)).toHaveValue(1200);
  });
});
