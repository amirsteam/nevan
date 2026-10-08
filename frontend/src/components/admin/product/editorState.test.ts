import { describe, it, expect, beforeAll, vi } from "vitest";
import {
  addColor,
  addPhotos,
  applyPriceToAll,
  applyStockToAll,
  buildPayload,
  cellKey,
  fromProduct,
  movePhoto,
  pendingUploads,
  photoOrder,
  removeColor,
  setCell,
  setMode,
  setSizePrice,
  snapshot,
  summarize,
  toggleSize,
  validate,
  type EditorState,
} from "./editorState";
import type { IProduct } from "../../../types";

beforeAll(() => {
  URL.createObjectURL = vi.fn(() => "blob:preview");
});

const savedProduct = (overrides: Partial<IProduct> = {}): IProduct =>
  ({
    _id: "p1",
    name: "Jhabla",
    slug: "jhabla",
    description: "Soft",
    price: 1200,
    category: { _id: "cat1", name: "Sets", slug: "sets" },
    stock: 5,
    sizes: ["0-3 Months", "3-6 Months"],
    colors: [{ name: "Dusty Rose", hex: "#c1847b" }, { name: "Sage" }],
    variants: [
      { _id: "v1", size: "0-3 Months", color: "Dusty Rose", price: 1200, comparePrice: 1500, stock: 2 },
      { _id: "v2", size: "3-6 Months", color: "Dusty Rose", price: 1300, stock: 1 },
      { _id: "v3", size: "0-3 Months", color: "Sage", price: 1200, comparePrice: 1500, stock: 2 },
    ],
    images: [
      { _id: "i1", url: "https://example.com/general.jpg", publicId: "g" },
      { _id: "i2", url: "https://example.com/rose.jpg", publicId: "r", color: "Dusty Rose", isPrimary: true },
    ],
    ...overrides,
  }) as IProduct;

const named = (state: EditorState, name: string) => state.colors.find((c) => c.name === name)!.key;

/** A filled-in new product with sizes and colours */
const newVariantProduct = () => {
  let state = fromProduct(null);
  state = { ...state, details: { ...state.details, name: "Romper", description: "Soft", category: "cat1" } };
  state = setMode(state, "variants");
  state = toggleSize(state, "6-12 Months");
  state = toggleSize(state, "0-3 Months");
  state = addColor(state, "white", "");
  state = addColor(state, "Mint", "");
  state = applyPriceToAll(state, "900");
  state = applyStockToAll(state, "3");
  return state;
};

describe("loading a product", () => {
  it("lays saved variants out as sizes × colours, keeping ids and per-size prices", () => {
    const state = fromProduct(savedProduct());
    expect(state.mode).toBe("variants");
    expect(state.sizes).toEqual(["0-3 Months", "3-6 Months"]);
    expect(state.colors.map((c) => [c.name, c.hex])).toEqual([
      ["Dusty Rose", "#c1847b"],
      ["Sage", "#9caf88"],
    ]);
    const rose = named(state, "Dusty Rose");
    const sage = named(state, "Sage");
    expect(state.cells[cellKey("0-3 Months", rose)]).toMatchObject({ id: "v1", offered: true, stock: "2" });
    // Not made: 3-6 Months in Sage
    expect(state.cells[cellKey("3-6 Months", sage)].offered).toBe(false);
    expect(state.priceByColour).toBe(false);
    expect(state.sizePrices["0-3_months"]).toEqual({ price: "1200", comparePrice: "1500" });
    expect(state.photos.map((p) => [p.id, p.colorKey])).toEqual([
      ["i1", null],
      ["i2", rose],
    ]);
    expect(state.primaryKey).toBe("i2");
  });

  it("switches to per-colour prices when a size's colours cost different amounts", () => {
    const product = savedProduct();
    product.variants![2].price = 1250;
    expect(fromProduct(product).priceByColour).toBe(true);
  });

  it("gives the same snapshot for the same product (unsaved-changes check)", () => {
    expect(snapshot(fromProduct(savedProduct()))).toBe(snapshot(fromProduct(savedProduct())));
  });
});

describe("editing options", () => {
  it("keeps sizes smallest first, custom sizes after, and starts new sizes at the last price", () => {
    let state = newVariantProduct();
    state = setSizePrice(state, "6-12 Months", { price: "1100" });
    state = toggleSize(state, "90 cm");
    state = toggleSize(state, "3-6 Months");
    expect(state.sizes).toEqual(["0-3 Months", "3-6 Months", "6-12 Months", "90 cm"]);
    expect(state.sizePrices["90_cm"].price).toBe("1100");
  });

  it("uses the palette swatch for known colours and ignores duplicates", () => {
    let state = newVariantProduct();
    state = addColor(state, "MINT", "#000000");
    expect(state.colors.map((c) => [c.name, c.hex])).toEqual([
      ["white", "#ffffff"],
      ["Mint", "#a8e6cf"],
    ]);
  });

  it("removes a colour's options and, if asked, its photos", () => {
    let state = newVariantProduct();
    const mint = named(state, "Mint");
    state = addPhotos(state, [new File(["x"], "m.jpg", { type: "image/jpeg" })], mint);
    state = removeColor(state, mint, true);
    expect(state.colors.map((c) => c.name)).toEqual(["white"]);
    expect(Object.keys(state.cells).some((k) => k.endsWith(mint))).toBe(false);
    expect(state.photos).toEqual([]);
  });

  it("moves photos only among photos of the same colour", () => {
    let state = fromProduct(savedProduct({ images: [] }));
    const rose = named(state, "Dusty Rose");
    const file = (name: string) => new File(["x"], name, { type: "image/jpeg" });
    state = addPhotos(state, [file("a.jpg")], rose);
    state = addPhotos(state, [file("general.jpg")], null);
    state = addPhotos(state, [file("b.jpg")], rose);
    const [a, general, b] = state.photos;
    state = movePhoto(state, b.key, -1);
    expect(state.photos.map((p) => p.key)).toEqual([b.key, general.key, a.key]);
    // Already first in its colour
    expect(movePhoto(state, b.key, -1)).toBe(state);
  });
});

describe("validation", () => {
  it("needs a price above 0 for every size that's made, and sensible stock", () => {
    let state = newVariantProduct();
    state = setSizePrice(state, "0-3 Months", { price: "0", comparePrice: "500" });
    state = setCell(state, "6-12 Months", named(state, "Mint"), { stock: "2.5" });
    const errors = validate(state);
    expect(errors["size-price-0-3_months"]).toMatch(/above 0/);
    expect(errors[`cell-stock-${cellKey("6-12 Months", named(state, "Mint"))}`]).toMatch(/Whole number/);
    expect(Object.keys(validate(newVariantProduct()))).toEqual([]);
  });

  it("asks for sizes, colours and at least one option", () => {
    let state = fromProduct(null);
    state = setMode({ ...state, details: { ...state.details, name: "x", description: "y", category: "c" } }, "variants");
    expect(Object.keys(validate(state))).toEqual(["product-sizes", "product-colors"]);
    state = toggleSize(addColor(state, "Red", ""), "One Size");
    state = setCell(state, "One Size", state.colors[0].key, { offered: false });
    expect(validate(state)["product-options"]).toBeTruthy();
  });

  it("checks a single product's price, compare-at price and stock", () => {
    let state = fromProduct(null);
    state = { ...state, details: { ...state.details, name: "Blanket", description: "Warm", category: "c", price: "800", comparePrice: "700" } };
    expect(validate(state)).toEqual({
      "product-compare-price": "Must be higher than the price",
      "product-stock": "How many are in stock?",
    });
  });
});

describe("the save request", () => {
  it("sends one variant per offered size/colour with the size's price", () => {
    let state = newVariantProduct();
    state = setSizePrice(state, "6-12 Months", { price: "1000", comparePrice: "1200" });
    state = setCell(state, "6-12 Months", named(state, "Mint"), { offered: false });
    const payload = buildPayload(state, false);

    expect(payload.sizes).toEqual(["0-3 Months", "6-12 Months"]);
    expect(payload.colors).toEqual([
      { name: "white", hex: "#ffffff" },
      { name: "Mint", hex: "#a8e6cf" },
    ]);
    expect(payload.variants).toEqual([
      { size: "0-3 Months", color: "white", price: 900, comparePrice: null, stock: 3, sku: null },
      { size: "0-3 Months", color: "Mint", price: 900, comparePrice: null, stock: 3, sku: null },
      { size: "6-12 Months", color: "white", price: 1000, comparePrice: 1200, stock: 3, sku: null },
    ]);
    // The API works these out from the sizes
    expect(payload.ageGroups).toEqual(["0-3 Months", "6-12 Months"]);
    expect(payload).not.toHaveProperty("price");
    expect(payload).not.toHaveProperty("images");
  });

  it("keeps variant ids, sends the photo list (removed photos left out) and clears empty fields on edit", () => {
    let state = fromProduct(savedProduct({ shortDescription: "Old" }));
    state = { ...state, details: { ...state.details, shortDescription: "" }, photos: state.photos.filter((p) => p.id !== "i1") };
    const payload = buildPayload(state, true);
    expect((payload.variants as { _id?: string }[]).map((v) => v._id)).toEqual(["v1", "v3", "v2"]);
    expect(payload.images).toEqual([{ _id: "i2", color: "Dusty Rose", isPrimary: true }]);
    expect(payload.shortDescription).toBeNull();
  });

  it("uploads new photos with their colour and puts them in order afterwards", () => {
    let state = fromProduct(savedProduct());
    const sage = named(state, "Sage");
    state = addPhotos(state, [new File(["x"], "s.jpg", { type: "image/jpeg" })], sage);
    const newKey = state.photos[2].key;
    state = { ...state, primaryKey: newKey };
    expect(pendingUploads(state).meta).toEqual([{ color: "Sage", isPrimary: true }]);
    expect(photoOrder(state, { [newKey]: "i3" })).toEqual([
      { _id: "i1", color: null, isPrimary: false },
      { _id: "i2", color: "Dusty Rose", isPrimary: false },
      { _id: "i3", color: "Sage", isPrimary: true },
    ]);
  });

  it("summarises options, stock, price range and gaps", () => {
    const summary = summarize(fromProduct(savedProduct()));
    expect(summary).toMatchObject({ options: 3, totalStock: 5, minPrice: 1200, maxPrice: 1300, photos: 2 });
    expect(summary.colorsWithoutPhotos).toEqual(["Sage"]);
  });
});
