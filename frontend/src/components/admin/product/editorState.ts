/**
 * Product editor state and the pure functions around it: loading a product,
 * editing options, validating, and building the API request.
 *
 * Model (see backend/utils/productVariants.ts): sizes × colours make the
 * variants ("cells"; a cell can be "not offered"). Prices are set per size
 * (or per cell when they differ by colour); stock per cell. Photos are one
 * ordered list, each tagged with a colour or none (shown for every colour).
 */
import type { IProduct } from "../../../types";
import {
  ageGroupsForSizes,
  paletteHex,
  productColors,
  productSizes,
  sameName,
  sortSizes,
} from "../../../utils/productOptions";
import { MAX_COLOR_LENGTH, MAX_SIZE_LENGTH } from "../../../utils/constants";
import { populated } from "../../../utils/helpers";

export interface PhotoItem {
  key: string;
  /** Saved photo id (absent for new uploads) */
  id?: string;
  /** Saved URL or a local preview (blob:) */
  url: string;
  file?: File;
  /** Colour this photo shows; null = every colour */
  colorKey: string | null;
}

export interface ColorOption {
  key: string;
  name: string;
  /** "#rrggbb" or "" when no swatch */
  hex: string;
}

export interface Cell {
  /** Saved variant id: kept so shoppers' carts survive edits */
  id?: string;
  offered: boolean;
  price: string;
  comparePrice: string;
  stock: string;
  sku: string;
}

export interface SizePrice {
  price: string;
  comparePrice: string;
}

export interface Details {
  name: string;
  shortDescription: string;
  description: string;
  material: string;
  careInstructions: string;
  ageRecommendation: string;
  category: string;
  gender: string;
  ageGroups: string[];
  isFeatured: boolean;
  isActive: boolean;
  metaTitle: string;
  metaDescription: string;
  // Products without sizes/colours
  price: string;
  comparePrice: string;
  stock: string;
  sku: string;
}

export type Mode = "single" | "variants";

export interface EditorState {
  details: Details;
  mode: Mode;
  sizes: string[];
  colors: ColorOption[];
  cells: Record<string, Cell>;
  sizePrices: Record<string, SizePrice>;
  /** Prices set per size and colour instead of per size */
  priceByColour: boolean;
  showSkus: boolean;
  photos: PhotoItem[];
  primaryKey: string | null;
}

export type Errors = Record<string, string>;

/** Photo types the API accepts (Cloudinary is set up for these) */
export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

let sequence = 0;
export const newKey = (prefix: string): string => `${prefix}-${Date.now().toString(36)}-${++sequence}`;

/** Key for a size in state and in field ids (no spaces: ids can't contain them) */
export const sizeId = (size: string): string => size.trim().toLowerCase().replace(/\s+/g, "_");
export const cellKey = (size: string, colorKey: string): string => `${sizeId(size)}::${colorKey}`;
const str = (value: number | null | undefined) => (value == null || Number.isNaN(value) ? "" : String(value));
const num = (value: string) => (value.trim() === "" ? NaN : Number(value));

const emptyCell = (price = "", comparePrice = ""): Cell => ({ offered: true, price, comparePrice, stock: "", sku: "" });

// ============================================
// Loading
// ============================================

export const fromProduct = (product?: IProduct | null): EditorState => {
  const variants = product?.variants || [];
  const sizes = product ? productSizes(product) : [];
  const colors: ColorOption[] = (product ? productColors(product) : []).map((c, i) => ({
    key: `color-${i}`,
    name: c.name,
    hex: c.hex || paletteHex(c.name) || "",
  }));

  const cells: Record<string, Cell> = {};
  const sizePrices: Record<string, SizePrice> = {};
  let priceByColour = false;
  for (const size of sizes) {
    const ofSize = variants.filter((v) => sameName(v.size, size));
    const first = ofSize[0];
    sizePrices[sizeId(size)] = { price: str(first?.price), comparePrice: str(first?.comparePrice) };
    if (ofSize.some((v) => v.price !== first.price || (v.comparePrice ?? null) !== (first.comparePrice ?? null))) {
      priceByColour = true;
    }
    for (const color of colors) {
      const variant = ofSize.find((v) => sameName(v.color, color.name));
      cells[cellKey(size, color.key)] = variant
        ? {
            id: variant._id,
            offered: true,
            price: str(variant.price),
            comparePrice: str(variant.comparePrice),
            stock: str(variant.stock),
            sku: variant.sku || "",
          }
        : { ...emptyCell(str(first?.price), str(first?.comparePrice)), offered: false };
    }
  }

  const photos: PhotoItem[] = (product?.images || []).map((img, i) => ({
    key: img._id || `photo-${i}`,
    id: img._id,
    url: img.url,
    colorKey: img.color ? colors.find((c) => sameName(c.name, img.color))?.key ?? null : null,
  }));
  const primary = (product?.images || []).findIndex((img) => img.isPrimary);

  const category = product ? populated(product.category)?._id || (typeof product.category === "string" ? product.category : "") : "";

  return {
    details: {
      name: product?.name || "",
      shortDescription: product?.shortDescription || "",
      description: product?.description || "",
      material: product?.material || "",
      careInstructions: product?.careInstructions || "",
      ageRecommendation: product?.ageRecommendation || "",
      category,
      gender: product?.gender || "",
      ageGroups: product?.ageGroups || [],
      isFeatured: product?.isFeatured || false,
      isActive: product ? product.isActive !== false : true,
      metaTitle: product?.metaTitle || "",
      metaDescription: product?.metaDescription || "",
      price: str(product?.price),
      comparePrice: variants.length ? "" : str(product?.comparePrice),
      stock: variants.length ? "" : str(product?.stock),
      sku: product?.sku || "",
    },
    mode: variants.length ? "variants" : "single",
    sizes,
    colors,
    cells,
    sizePrices,
    priceByColour,
    showSkus: variants.some((v) => !!v.sku),
    photos,
    primaryKey: photos[primary >= 0 ? primary : 0]?.key ?? null,
  };
};

/** Comparable form of the state, for "unsaved changes" */
export const snapshot = (state: EditorState): string =>
  JSON.stringify({ ...state, photos: state.photos.map(({ key, id, colorKey }) => ({ key, id, colorKey })) });

// ============================================
// Editing options
// ============================================

/** Price a new size/colour starts with: the last size's, or the single price */
const defaultSizePrice = (state: EditorState): SizePrice => {
  const last = state.sizes[state.sizes.length - 1];
  return (last && state.sizePrices[sizeId(last)]) || { price: state.details.price, comparePrice: state.details.comparePrice };
};

export const toggleSize = (state: EditorState, size: string): EditorState => {
  const value = size.trim();
  if (!value) return state;
  if (state.sizes.some((s) => sameName(s, value))) {
    const sizes = state.sizes.filter((s) => !sameName(s, value));
    const cells = { ...state.cells };
    state.colors.forEach((color) => delete cells[cellKey(value, color.key)]);
    return { ...state, sizes, cells };
  }
  const base = defaultSizePrice(state);
  const cells = { ...state.cells };
  state.colors.forEach((color) => {
    cells[cellKey(value, color.key)] = emptyCell(base.price, base.comparePrice);
  });
  // Scale sizes keep scale order; custom sizes go after them in the order added
  return { ...state, sizes: sortSizes([...state.sizes, value]), cells, sizePrices: { ...state.sizePrices, [sizeId(value)]: { ...base } } };
};

export const addColor = (state: EditorState, name: string, hex: string): EditorState => {
  const value = name.trim();
  if (!value || state.colors.some((c) => sameName(c.name, value))) return state;
  const color: ColorOption = { key: newKey("color"), name: value, hex: hex || paletteHex(value) || "" };
  const cells = { ...state.cells };
  state.sizes.forEach((size) => {
    const price = state.sizePrices[sizeId(size)] || defaultSizePrice(state);
    cells[cellKey(size, color.key)] = emptyCell(price.price, price.comparePrice);
  });
  return { ...state, colors: [...state.colors, color], cells };
};

export const updateColor = (state: EditorState, key: string, patch: Partial<Omit<ColorOption, "key">>): EditorState => ({
  ...state,
  colors: state.colors.map((c) => (c.key === key ? { ...c, ...patch } : c)),
});

/** Remove a colour with its options; its photos become photos for every colour unless removed too */
export const removeColor = (state: EditorState, key: string, removePhotos: boolean): EditorState => {
  const cells = { ...state.cells };
  state.sizes.forEach((size) => delete cells[cellKey(size, key)]);
  const photos = removePhotos
    ? state.photos.filter((p) => p.colorKey !== key)
    : state.photos.map((p) => (p.colorKey === key ? { ...p, colorKey: null } : p));
  return withPrimary({ ...state, colors: state.colors.filter((c) => c.key !== key), cells, photos });
};

export const moveColor = (state: EditorState, key: string, direction: -1 | 1): EditorState => {
  const index = state.colors.findIndex((c) => c.key === key);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= state.colors.length) return state;
  const colors = [...state.colors];
  [colors[index], colors[target]] = [colors[target], colors[index]];
  return { ...state, colors };
};

export const setCell = (state: EditorState, size: string, colorKey: string, patch: Partial<Cell>): EditorState => {
  const key = cellKey(size, colorKey);
  const current = state.cells[key] || emptyCell();
  return { ...state, cells: { ...state.cells, [key]: { ...current, ...patch } } };
};

export const setSizePrice = (state: EditorState, size: string, patch: Partial<SizePrice>): EditorState => {
  const id = sizeId(size);
  return { ...state, sizePrices: { ...state.sizePrices, [id]: { ...(state.sizePrices[id] || { price: "", comparePrice: "" }), ...patch } } };
};

/** "Same price for all sizes" (and every colour when prices differ by colour) */
export const applyPriceToAll = (state: EditorState, price: string, comparePrice?: string): EditorState => {
  const sizePrices = { ...state.sizePrices };
  state.sizes.forEach((size) => {
    const current = sizePrices[sizeId(size)] || { price: "", comparePrice: "" };
    sizePrices[sizeId(size)] = { price, comparePrice: comparePrice ?? current.comparePrice };
  });
  const cells = { ...state.cells };
  Object.keys(cells).forEach((key) => {
    cells[key] = { ...cells[key], price, ...(comparePrice !== undefined ? { comparePrice } : {}) };
  });
  return { ...state, sizePrices, cells };
};

export const applyStockToAll = (state: EditorState, stock: string): EditorState => {
  const cells = { ...state.cells };
  Object.keys(cells).forEach((key) => {
    if (cells[key].offered) cells[key] = { ...cells[key], stock };
  });
  return { ...state, cells };
};

/** Switching per-colour pricing on copies each size's price into its colours */
export const setPriceByColour = (state: EditorState, on: boolean): EditorState => {
  if (!on) return { ...state, priceByColour: false };
  const cells = { ...state.cells };
  state.sizes.forEach((size) => {
    const price = state.sizePrices[sizeId(size)];
    state.colors.forEach((color) => {
      const key = cellKey(size, color.key);
      if (cells[key] && price) cells[key] = { ...cells[key], price: price.price, comparePrice: price.comparePrice };
    });
  });
  return { ...state, priceByColour: true, cells };
};

/** Saved options that switching to a single product would delete */
export const savedVariantCount = (state: EditorState): number =>
  Object.values(state.cells).filter((cell) => cell.offered && cell.id).length;

export const setMode = (state: EditorState, mode: Mode): EditorState => {
  if (mode === state.mode) return state;
  if (mode === "single") {
    // Keep the cheapest size price as the single price if none was set
    const prices = state.sizes.map((s) => num(state.sizePrices[sizeId(s)]?.price || "")).filter((p) => p > 0);
    const price = state.details.price || (prices.length ? String(Math.min(...prices)) : "");
    return { ...state, mode, details: { ...state.details, price } };
  }
  return { ...state, mode };
};

// ============================================
// Photos
// ============================================

const withPrimary = (state: EditorState): EditorState =>
  state.photos.some((p) => p.key === state.primaryKey) ? state : { ...state, primaryKey: state.photos[0]?.key ?? null };

export const addPhotos = (state: EditorState, files: File[], colorKey: string | null): EditorState => {
  const added = files.map((file) => ({ key: newKey("new"), url: URL.createObjectURL(file), file, colorKey }));
  return withPrimary({ ...state, photos: [...state.photos, ...added] });
};

export const removePhoto = (state: EditorState, key: string): EditorState =>
  withPrimary({ ...state, photos: state.photos.filter((p) => p.key !== key) });

/** Move a photo before/after its neighbour in the same group */
export const movePhoto = (state: EditorState, key: string, direction: -1 | 1): EditorState => {
  const photos = [...state.photos];
  const index = photos.findIndex((p) => p.key === key);
  if (index < 0) return state;
  let target = index + direction;
  while (target >= 0 && target < photos.length && photos[target].colorKey !== photos[index].colorKey) target += direction;
  if (target < 0 || target >= photos.length) return state;
  [photos[index], photos[target]] = [photos[target], photos[index]];
  return { ...state, photos };
};

export const photosOf = (state: EditorState, colorKey: string | null): PhotoItem[] =>
  state.photos.filter((p) => p.colorKey === colorKey);

// ============================================
// Validation and the API request
// ============================================

export const derivedAgeGroups = (state: EditorState): string[] =>
  state.mode === "variants" ? ageGroupsForSizes(state.sizes) : [];

const effectivePrice = (state: EditorState, size: string, cell: Cell): SizePrice =>
  state.priceByColour ? { price: cell.price, comparePrice: cell.comparePrice } : state.sizePrices[sizeId(size)] || { price: "", comparePrice: "" };

const priceError = (price: string): string | null => (num(price) > 0 ? null : "Enter a price above 0");
const compareError = (price: string, compare: string): string | null =>
  compare.trim() === "" || num(compare) === 0 || num(compare) > num(price) ? null : "Must be higher than the price";
const stockError = (stock: string): string | null =>
  stock.trim() === "" || (Number.isInteger(num(stock)) && num(stock) >= 0) ? null : "Whole number, 0 or more";

/** Errors keyed by the id of the field they belong to (in page order) */
export const validate = (state: EditorState): Errors => {
  const errors: Errors = {};
  const d = state.details;
  if (!d.name.trim()) errors["product-name"] = "Give the product a name";
  if (!d.description.trim()) errors["product-description"] = "Add a description";

  if (state.mode === "single") {
    const price = priceError(d.price);
    if (price) errors["product-price"] = price;
    const compare = compareError(d.price, d.comparePrice);
    if (compare) errors["product-compare-price"] = compare;
    if (d.stock.trim() === "") errors["product-stock"] = "How many are in stock?";
    else if (stockError(d.stock)) errors["product-stock"] = stockError(d.stock)!;
  } else {
    if (!state.sizes.length) errors["product-sizes"] = "Choose at least one size";
    if (state.sizes.some((s) => s.trim().length > MAX_SIZE_LENGTH)) errors["product-sizes"] = `Sizes can be at most ${MAX_SIZE_LENGTH} characters`;
    if (!state.colors.length) errors["product-colors"] = "Add at least one colour";
    const seen = new Set<string>();
    for (const color of state.colors) {
      const name = color.name.trim();
      if (!name) errors[`color-name-${color.key}`] = "Name this colour";
      else if (name.length > MAX_COLOR_LENGTH) errors[`color-name-${color.key}`] = `At most ${MAX_COLOR_LENGTH} characters`;
      else if (seen.has(name.toLowerCase())) errors[`color-name-${color.key}`] = "Another colour has this name";
      seen.add(name.toLowerCase());
    }
    let offered = 0;
    for (const size of state.sizes) {
      if (!state.priceByColour) {
        const sizePrice = state.sizePrices[sizeId(size)] || { price: "", comparePrice: "" };
        const usedBySize = state.colors.some((c) => state.cells[cellKey(size, c.key)]?.offered);
        if (usedBySize) {
          const price = priceError(sizePrice.price);
          if (price) errors[`size-price-${sizeId(size)}`] = price;
          const compare = compareError(sizePrice.price, sizePrice.comparePrice);
          if (compare) errors[`size-compare-${sizeId(size)}`] = compare;
        }
      }
      for (const color of state.colors) {
        const key = cellKey(size, color.key);
        const cell = state.cells[key];
        if (!cell?.offered) continue;
        offered += 1;
        if (state.priceByColour) {
          const price = priceError(cell.price);
          if (price) errors[`cell-price-${key}`] = price;
          const compare = compareError(cell.price, cell.comparePrice);
          if (compare) errors[`cell-compare-${key}`] = compare;
        }
        const stock = stockError(cell.stock);
        if (stock) errors[`cell-stock-${key}`] = stock;
      }
    }
    if (state.sizes.length && state.colors.length && offered === 0) errors["product-options"] = "Offer at least one size and colour";
  }

  if (!d.category) errors["product-category"] = "Choose a category";
  return errors;
};

const colorName = (state: EditorState, colorKey: string | null): string | null =>
  state.mode === "variants" && colorKey ? state.colors.find((c) => c.key === colorKey)?.name.trim() ?? null : null;

/** The create/update request (photos are uploaded separately) */
export const buildPayload = (state: EditorState, isEdit: boolean): Record<string, unknown> => {
  const d = state.details;
  const derived = derivedAgeGroups(state);
  const payload: Record<string, unknown> = {
    name: d.name.trim(),
    description: d.description.trim(),
    category: d.category,
    isFeatured: d.isFeatured,
    isActive: d.isActive,
    // Always sent so clearing a field clears it on the product
    material: d.material.trim(),
    careInstructions: d.careInstructions.trim(),
    ageRecommendation: d.ageRecommendation.trim(),
    ageGroups: derived.length ? derived : d.ageGroups,
    metaTitle: d.metaTitle.trim(),
    metaDescription: d.metaDescription.trim(),
  };
  // Optional fields: on edit, null clears a value removed in the form
  const optional: Record<string, unknown> = {
    shortDescription: d.shortDescription.trim() || null,
    sku: d.sku.trim() || null,
    gender: d.gender || null,
  };

  if (state.mode === "single") {
    payload.price = num(d.price);
    payload.stock = Number.parseInt(d.stock, 10) || 0;
    optional.comparePrice = num(d.comparePrice) > 0 ? num(d.comparePrice) : null;
    payload.variants = [];
    payload.sizes = [];
    payload.colors = [];
  } else {
    payload.sizes = state.sizes.map((s) => s.trim());
    payload.colors = state.colors.map((c) => (c.hex ? { name: c.name.trim(), hex: c.hex } : { name: c.name.trim() }));
    const variants: Record<string, unknown>[] = [];
    for (const size of state.sizes) {
      for (const color of state.colors) {
        const cell = state.cells[cellKey(size, color.key)];
        if (!cell?.offered) continue;
        const price = effectivePrice(state, size, cell);
        variants.push({
          ...(cell.id ? { _id: cell.id } : {}),
          size: size.trim(),
          color: color.name.trim(),
          price: num(price.price),
          comparePrice: num(price.comparePrice) > num(price.price) ? num(price.comparePrice) : null,
          stock: Number.parseInt(cell.stock, 10) || 0,
          sku: cell.sku.trim() || null,
        });
      }
    }
    payload.variants = variants;
    // Worked out from the sizes by the API
    payload.comparePrice = null;
  }

  for (const [key, value] of Object.entries(optional)) {
    if (value !== null || isEdit) payload[key] = value;
  }

  if (isEdit) {
    payload.images = state.photos
      .filter((p) => p.id)
      .map((p) => ({ _id: p.id, color: colorName(state, p.colorKey), isPrimary: p.key === state.primaryKey }));
  }
  return payload;
};

/** New photos to upload, with their colour and primary flag (same order) */
export const pendingUploads = (state: EditorState): { files: File[]; meta: { color: string | null; isPrimary: boolean }[]; keys: string[] } => {
  const pending = state.photos.filter((p) => p.file);
  return {
    files: pending.map((p) => p.file!),
    meta: pending.map((p) => ({ color: colorName(state, p.colorKey), isPrimary: p.key === state.primaryKey })),
    keys: pending.map((p) => p.key),
  };
};

/** Full photo list for a follow-up request, once uploaded photos have ids */
export const photoOrder = (state: EditorState, idsByKey: Record<string, string>) =>
  state.photos
    .map((p) => ({ id: p.id ?? idsByKey[p.key], photo: p }))
    .filter((entry): entry is { id: string; photo: PhotoItem } => !!entry.id)
    .map(({ id, photo }) => ({ _id: id, color: colorName(state, photo.colorKey), isPrimary: photo.key === state.primaryKey }));

// ============================================
// Summary
// ============================================

export interface Summary {
  options: number;
  totalStock: number;
  minPrice: number | null;
  maxPrice: number | null;
  photos: number;
  outOfStock: string[];
  colorsWithoutPhotos: string[];
}

export const summarize = (state: EditorState): Summary => {
  if (state.mode === "single") {
    const price = num(state.details.price);
    return {
      options: 1,
      totalStock: Number.parseInt(state.details.stock, 10) || 0,
      minPrice: price > 0 ? price : null,
      maxPrice: price > 0 ? price : null,
      photos: state.photos.length,
      outOfStock: [],
      colorsWithoutPhotos: [],
    };
  }
  const prices: number[] = [];
  const outOfStock: string[] = [];
  let options = 0;
  let totalStock = 0;
  for (const size of state.sizes) {
    for (const color of state.colors) {
      const cell = state.cells[cellKey(size, color.key)];
      if (!cell?.offered) continue;
      options += 1;
      const stock = Number.parseInt(cell.stock, 10) || 0;
      totalStock += stock;
      if (stock <= 0) outOfStock.push(`${size} / ${color.name || "unnamed colour"}`);
      const price = num(effectivePrice(state, size, cell).price);
      if (price > 0) prices.push(price);
    }
  }
  return {
    options,
    totalStock,
    minPrice: prices.length ? Math.min(...prices) : null,
    maxPrice: prices.length ? Math.max(...prices) : null,
    photos: state.photos.length,
    outOfStock,
    colorsWithoutPhotos: state.colors.filter((c) => !state.photos.some((p) => p.colorKey === c.key)).map((c) => c.name || "unnamed colour"),
  };
};
