/**
 * Product Service
 * Handles product business logic
 */
import mongoose, { Types } from "mongoose";
import Product, { IProduct } from "../models/Product";
import Category from "../models/Category";
import Cart from "../models/Cart";
import { paginate, PaginationResult } from "../utils/helpers";
import AppError from "../utils/AppError";
import { deleteImage } from "../config/cloudinary";
import { cache, CACHE_KEYS } from "../utils/cache";
import { PRODUCT_SIZES, AGE_GROUPS, PRODUCT_GENDERS, COLOR_PALETTE } from "../utils/constants";
import { adoptVariantImages, forgetRemovedPhotos } from "../utils/productVariants";
import { campaignProductFilter } from "./campaignService";

interface ProductsOptions {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  isFeatured?: boolean | string;
  sort?: string;
  age?: string;
  gender?: string;
  // Campaign slug: only the products its sale/collection covers
  campaign?: string;
  // Comma-separated product ids (recently viewed): just those products
  ids?: string | string[];
}

interface ProductsResult {
  products: IProduct[];
  pagination: PaginationResult;
}

interface VariantData {
  _id?: string;
  size: string;
  color: string;
  price?: number;
  comparePrice?: number | null;
  stock?: number;
  // Ignored: a variant's photo is derived from its colour's photos
  image?: string | null;
  sku?: string | null;
}

/** Existing photo in the order the admin wants, with its colour and alt text */
interface ImageUpdate {
  _id: string;
  color?: string | null;
  alt?: string | null;
  isPrimary?: boolean;
}

/** Per-file details for uploaded photos (same order as the files) */
export interface UploadMeta {
  color?: string | null;
  alt?: string | null;
  isPrimary?: boolean;
}

interface ProductData {
  name: string;
  description: string;
  shortDescription?: string;
  material?: string;
  careInstructions?: string;
  ageRecommendation?: string;
  ageGroups?: string[];
  gender?: string | null;
  price: number;
  comparePrice?: number;
  category: string;
  stock?: number;
  sku?: string;
  images?: any[];
  variants?: VariantData[];
  // Option order and colour swatches (products with variants)
  sizes?: string[];
  colors?: { name: string; hex?: string | null }[];
  // Not stored: selects which existing image is primary (older clients)
  primaryImageId?: string;
  isFeatured?: boolean;
  isActive?: boolean;
}

interface MulterFile {
  path: string;
  filename: string;
}

/**
 * Clean up cart items that reference deleted variants
 * This is called when variants are removed from a product
 */
const cleanupCartsForVariants = async (
  productId: string,
  variantIds: Types.ObjectId[],
): Promise<void> => {
  if (variantIds.length === 0) return;

  // Use updateMany to remove affected cart items efficiently
  await Cart.updateMany(
    {
      "items.product": new Types.ObjectId(productId),
      "items.variantId": { $in: variantIds },
    },
    {
      $pull: {
        items: {
          product: new Types.ObjectId(productId),
          variantId: { $in: variantIds },
        },
      },
    },
  );
};

/**
 * Clean up all cart items for a product (when product is deleted)
 */
const cleanupCartsForProduct = async (productId: string): Promise<void> => {
  await Cart.updateMany(
    { "items.product": new Types.ObjectId(productId) },
    { $pull: { items: { product: new Types.ObjectId(productId) } } },
  );
};

// Sort options the storefront offers ("newest" kept as an alias); anything else
// falls back to newest so clients can't sort on arbitrary fields
const SORT_OPTIONS: Record<string, string> = {
  "-createdAt": "-createdAt",
  newest: "-createdAt",
  createdAt: "createdAt",
  price: "price",
  "-price": "-price",
  "-ratings.average": "-ratings.average",
  "-soldCount": "-soldCount",
};

const MAX_IDS = 24;

/**
 * "id1,id2" (or a repeated ?ids= array) -> unique ObjectIds, at most MAX_IDS;
 * malformed ids are dropped. null when the parameter wasn't sent.
 */
const parseIds = (ids: unknown): Types.ObjectId[] | null => {
  if (ids === undefined) return null;
  const raw = (Array.isArray(ids) ? ids : [ids]).flatMap((value) => String(value).split(","));
  const valid = raw.map((id) => id.trim()).filter((id) => /^[a-f\d]{24}$/i.test(id));
  return [...new Set(valid)].slice(0, MAX_IDS).map((id) => new Types.ObjectId(id));
};

const resolveSort = (sort: unknown): string =>
  typeof sort === "string" && Object.prototype.hasOwnProperty.call(SORT_OPTIONS, sort)
    ? SORT_OPTIONS[sort]
    : "-createdAt";

/**
 * Get all products with filters and pagination
 */
const getProducts = async (
  options: ProductsOptions = {},
): Promise<ProductsResult> => {
  const {
    page = 1,
    limit = 12,
    category,
    search,
    minPrice,
    maxPrice,
    isFeatured,
    sort = "-createdAt",
    age,
    gender,
    campaign,
    ids,
  } = options;

  // Build filter
  const filter: any = { isActive: true };

  if (typeof campaign === "string" && campaign.trim()) {
    const scope = await campaignProductFilter(campaign.trim().toLowerCase());
    if (scope._id) filter._id = scope._id;
    // Intersected with any category filter below via $and
    if (scope.category) filter.$and = [{ category: scope.category }];
  }

  // Specific products (inactive or deleted ones simply don't come back; no
  // valid ids at all means no results, not the whole catalogue)
  const idList = parseIds(ids);
  if (idList) {
    filter.$and = [...(filter.$and || []), { _id: { $in: idList } }];
  }

  if (category) {
    // Find category by slug or ID
    let catQuery: any = { slug: category };
    if (mongoose.Types.ObjectId.isValid(category)) {
      catQuery = { $or: [{ slug: category }, { _id: category }] };
    }

    const cat = await Category.findOne(catQuery);
    if (cat) {
      // Find all subcategories to include their products too
      const subCategories = await Category.find({ parent: cat._id }).distinct(
        "_id",
      );
      filter.category = { $in: [cat._id, ...subCategories] };
    }
  }

  if (search) {
    filter.$text = { $search: search };
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {};
    if (minPrice !== undefined) filter.price.$gte = Number(minPrice);
    if (maxPrice !== undefined) filter.price.$lte = Number(maxPrice);
  }

  if (isFeatured !== undefined) {
    filter.isFeatured = isFeatured === "true" || isFeatured === true;
  }

  // Unknown values are ignored rather than returning nothing
  if (typeof age === "string" && (AGE_GROUPS as readonly string[]).includes(age)) {
    filter.ageGroups = age;
  }

  if (typeof gender === "string" && (PRODUCT_GENDERS as readonly string[]).includes(gender)) {
    filter.gender = gender === "unisex" ? "unisex" : { $in: [gender, "unisex"] };
  }

  // Count total
  const total = await Product.countDocuments(filter);
  const pagination = paginate(page, limit, total);

  // Get products
  const products = await Product.find(filter)
    .sort(resolveSort(sort))
    .skip(pagination.skip)
    .limit(pagination.itemsPerPage)
    .populate("category", "name slug")
    .lean();

  return { products: products as IProduct[], pagination };
};

/**
 * Get single product by slug or ID
 */
const getProductBySlug = async (slugOrId: string): Promise<IProduct> => {
  const isId = mongoose.Types.ObjectId.isValid(slugOrId);

  const query: any = { isActive: true };
  if (isId) {
    query.$or = [{ slug: slugOrId }, { _id: slugOrId }];
  } else {
    query.slug = slugOrId;
  }

  const product = await Product.findOne(query).populate(
    "category",
    "name slug",
  );

  if (!product) {
    throw new AppError("Product not found", 404);
  }

  return product;
};

/**
 * Get featured products with caching
 */
const getFeaturedProducts = async (limit: number = 8): Promise<IProduct[]> => {
  // Check cache first
  const cacheKey = CACHE_KEYS.FEATURED_PRODUCTS(limit);
  const cached = cache.get<IProduct[]>(cacheKey);
  if (cached) return cached;

  // Fetch from database
  const products = await (Product as any).getFeatured(limit);

  // Cache for 5 minutes
  cache.set(cacheKey, products, 300);

  return products;
};

/**
 * Create product (Admin)
 */
// Optional fields an admin can clear by sending null or ""
const CLEARABLE_FIELDS = ["comparePrice", "sku", "shortDescription", "gender"] as const;

/**
 * Normalize admin product input: cleared optional fields become undefined
 * (so Mongoose unsets them) and variant sizes/colors are trimmed.
 */
const normalizeProductInput = <T extends Partial<ProductData>>(data: T): T => {
  const normalized: any = { ...data };
  for (const field of CLEARABLE_FIELDS) {
    if (normalized[field] === null || normalized[field] === "") {
      normalized[field] = undefined;
    }
  }
  if (Array.isArray(normalized.variants)) {
    normalized.variants = normalized.variants.map(({ image: _derived, ...v }: VariantData) => ({
      ...v,
      size: String(v.size).trim(),
      color: String(v.color).trim(),
      comparePrice: v.comparePrice == null || Number(v.comparePrice) <= 0 ? undefined : Number(v.comparePrice),
      sku: v.sku ? String(v.sku).trim() : undefined,
    }));
  }
  if (Array.isArray(normalized.colors)) {
    normalized.colors = normalized.colors.map((c: { name: string; hex?: string | null }) =>
      c.hex ? { name: String(c.name).trim(), hex: String(c.hex).toLowerCase() } : { name: String(c.name).trim() },
    );
  }
  if (Array.isArray(normalized.sizes)) {
    normalized.sizes = normalized.sizes.map((size: string) => String(size).trim());
  }
  // Photos change through image updates (edit) and uploads, never wholesale
  delete normalized.images;
  delete normalized.primaryImageId;
  return normalized;
};

/** Featured products are cached; any create/update/delete may change them */
const invalidateProductCaches = (): void => {
  cache.deletePattern("featured_products_");
};

const createProduct = async (productData: ProductData): Promise<IProduct> => {
  // Verify category exists
  const category = await Category.findById(productData.category);
  if (!category) {
    throw new AppError("Category not found", 404);
  }

  const data = normalizeProductInput(productData);
  // New products can't reference existing variant ids
  data.variants = data.variants?.map(({ _id, ...variant }) => variant);

  // Variant _id is a string here; Mongoose casts it
  const product = await Product.create(data as unknown as Partial<IProduct>);
  invalidateProductCaches();
  return product;
};

/**
 * Size options for the admin product form: the built-in sizes plus custom
 * sizes already used on other products (so admins reuse the same spelling).
 */
const getSizeOptions = async (): Promise<{ builtIn: string[]; custom: string[] }> => {
  const used: string[] = await Product.distinct("variants.size");
  const builtIn = [...PRODUCT_SIZES] as string[];
  const custom = used
    .filter((size) => size && !builtIn.includes(size))
    .sort((a, b) => a.localeCompare(b));
  return { builtIn, custom };
};

/**
 * Colour suggestions for the admin form: the built-in palette plus colours
 * already used on other products (with their swatches), so spellings match.
 */
const getColorOptions = async (): Promise<{
  palette: { name: string; hex: string }[];
  used: { name: string; hex?: string }[];
}> => {
  const [withSwatches, variantColors] = await Promise.all([
    Product.aggregate<{ _id: string; hex?: string }>([
      { $unwind: "$colors" },
      { $group: { _id: { $toLower: "$colors.name" }, name: { $first: "$colors.name" }, hex: { $first: "$colors.hex" } } },
      { $project: { _id: "$name", hex: 1 } },
    ]),
    Product.distinct("variants.color") as Promise<string[]>,
  ]);
  const inPalette = (name: string) =>
    COLOR_PALETTE.some((c) => c.name.toLowerCase() === String(name).trim().toLowerCase());
  const used = new Map<string, { name: string; hex?: string }>();
  for (const color of withSwatches) {
    if (color._id && !inPalette(color._id)) {
      used.set(color._id.toLowerCase(), { name: color._id, hex: color.hex || undefined });
    }
  }
  for (const name of variantColors) {
    const key = String(name).trim().toLowerCase();
    if (key && !inPalette(name) && !used.has(key)) used.set(key, { name: String(name).trim() });
  }
  return {
    palette: [...COLOR_PALETTE],
    used: [...used.values()].sort((a, b) => a.name.localeCompare(b.name)),
  };
};

/**
 * Apply the admin's photo list (edit form): order, colour, alt text and the
 * primary photo for existing photos. Photos left out are removed; their
 * Cloudinary public ids are returned so they're deleted after the save.
 */
const applyImageUpdates = (product: any, updates: ImageUpdate[]): string[] => {
  const current: any[] = [...product.images];
  const byId = new Map(current.map((img) => [String(img._id), img]));
  const kept: any[] = [];
  for (const update of updates) {
    const image = byId.get(String(update._id));
    if (!image) {
      throw new AppError("A photo in this update isn't on the product any more. Reload the page and try again.", 400);
    }
    if (kept.includes(image)) continue;
    if (update.color !== undefined) image.color = update.color ? String(update.color).trim() : null;
    if (update.alt !== undefined) image.alt = update.alt ? String(update.alt).trim() : undefined;
    kept.push(image);
  }
  const primary = updates.find((u) => u.isPrimary);
  const removed = current.filter((img) => !kept.includes(img));
  forgetRemovedPhotos(product, removed.map((img) => img.url));
  product.images = kept.map((img) => ({
    ...img.toObject(),
    isPrimary: primary ? String(img._id) === String(primary._id) : img.isPrimary,
  }));
  return removed.map((img) => img.publicId).filter(Boolean);
};

/** Delete photos from Cloudinary; a failure only leaves an unused file behind */
const destroyImages = async (publicIds: string[]): Promise<void> => {
  await Promise.all(
    publicIds.map((publicId) =>
      deleteImage(publicId).catch((error: unknown) => console.error(`Could not delete image ${publicId}:`, error)),
    ),
  );
};

/**
 * Update product (Admin)
 */
const updateProduct = async (
  productId: string,
  updateData: Partial<ProductData>,
): Promise<IProduct> => {
  const product = await Product.findById(productId);
  if (!product) {
    throw new AppError("Product not found", 404);
  }

  // If category is being updated, verify it exists
  if (updateData.category) {
    const category = await Category.findById(updateData.category);
    if (!category) {
      throw new AppError("Category not found", 404);
    }
  }

  const { primaryImageId } = updateData;
  const imageUpdates = (updateData as { images?: ImageUpdate[] }).images;
  const data = normalizeProductInput(updateData);

  // Older products keep photos on their variants: move them into the gallery
  // before the variants are replaced (clients don't send variant photos back)
  adoptVariantImages(product);

  // Check for removed variants and clean up carts
  if (data.variants) {
    const currentVariantIds = new Set<string>(
      (product as any).variants.map((v: any) => v._id.toString()),
    );
    // Existing variants are matched by _id so their ids (referenced by carts) are
    // kept; ids that don't belong to this product are treated as new variants.
    data.variants = data.variants.map(({ _id, ...variant }) =>
      _id && currentVariantIds.has(String(_id)) ? { _id, ...variant } : variant,
    );
    const newVariantIds = new Set(
      data.variants
        .filter((v) => v._id)
        .map((v) => String(v._id)),
    );

    // Find variants that are being removed
    const removedVariantIds: Types.ObjectId[] = [];
    for (const variantId of currentVariantIds) {
      if (!newVariantIds.has(variantId as string)) {
        removedVariantIds.push(new Types.ObjectId(variantId as string));
      }
    }

    // Remove cart items that reference deleted variants
    if (removedVariantIds.length > 0) {
      await cleanupCartsForVariants(productId, removedVariantIds);
    }
  }

  Object.assign(product, data);

  let removedPublicIds: string[] = [];
  if (Array.isArray(imageUpdates)) {
    removedPublicIds = applyImageUpdates(product, imageUpdates);
  } else if (primaryImageId) {
    const images = (product as any).images;
    if (!images.id(primaryImageId)) {
      throw new AppError("Primary image not found on this product", 400);
    }
    images.forEach((img: any) => {
      img.isPrimary = img._id.toString() === String(primaryImageId);
    });
  }

  await product.save();
  invalidateProductCaches();
  // Only once the product no longer points at them
  await destroyImages(removedPublicIds);

  return product;
};

/**
 * Delete product (Admin)
 */
const deleteProduct = async (
  productId: string,
): Promise<{ message: string }> => {
  const product = await Product.findById(productId);
  if (!product) {
    throw new AppError("Product not found", 404);
  }

  // Clean up cart items referencing this product
  await cleanupCartsForProduct(productId);

  // Older products keep some photos only on variants; include those
  adoptVariantImages(product);
  const publicIds: string[] = (product as any).images.map((image: any) => image.publicId).filter(Boolean);

  await product.deleteOne();
  await destroyImages(publicIds);

  invalidateProductCaches();

  return { message: "Product deleted successfully" };
};

/**
 * Add photos to a product (Admin). `meta` (same order as the files) can tag a
 * photo with a colour, give it alt text or make it the primary photo; older
 * clients send `primaryIndex` instead.
 */
const addProductImages = async (
  productId: string,
  files: MulterFile[],
  primaryIndex?: number,
  meta: UploadMeta[] = [],
): Promise<IProduct> => {
  const product = await Product.findById(productId);
  if (!product) {
    throw new AppError("Product not found", 404);
  }

  adoptVariantImages(product);
  const images = (product as any).images;
  const primaryAt = meta.findIndex((m) => m?.isPrimary);
  const chosenPrimary =
    primaryAt >= 0
      ? primaryAt
      : primaryIndex !== undefined && primaryIndex >= 0 && primaryIndex < files.length
        ? primaryIndex
        : -1;

  if (chosenPrimary >= 0) {
    images.forEach((img: any) => {
      img.isPrimary = false;
    });
  }

  const newImages = files.map((file, index) => ({
    url: file.path,
    publicId: file.filename,
    // Unknown colours are dropped when the product is saved
    color: meta[index]?.color ? String(meta[index].color).trim() : null,
    alt: meta[index]?.alt ? String(meta[index].alt).trim() : undefined,
    isPrimary: chosenPrimary >= 0 ? index === chosenPrimary : images.length === 0 && index === 0,
  }));

  images.push(...newImages);
  await product.save();
  invalidateProductCaches();

  return product;
};

/**
 * Delete product image (Admin)
 */
const deleteProductImage = async (
  productId: string,
  imageId: string,
): Promise<IProduct> => {
  const product = await Product.findById(productId);
  if (!product) {
    throw new AppError("Product not found", 404);
  }

  adoptVariantImages(product);
  const image = (product as any).images.id(imageId);
  if (!image) {
    throw new AppError("Image not found", 404);
  }

  const { publicId, url } = image;
  forgetRemovedPhotos(product, [url]);
  image.deleteOne();
  await product.save();
  invalidateProductCaches();
  if (publicId) await destroyImages([publicId]);

  return product;
};

/**
 * Photo for one variant (Admin; older clients). Photos belong to colours, so
 * this adds the photo to the variant's colour, first in line so it becomes
 * the photo of every size in that colour.
 */
const uploadVariantImage = async (
  productId: string,
  variantId: string,
  file: MulterFile,
): Promise<IProduct> => {
  const product = await Product.findById(productId);
  if (!product) {
    throw new AppError("Product not found", 404);
  }

  const variant = (product as any).variants.id(variantId);
  if (!variant) {
    throw new AppError("Variant not found", 404);
  }

  adoptVariantImages(product);
  const images = (product as any).images;
  const color = String(variant.color).trim().toLowerCase();
  const firstOfColor = images.findIndex((img: any) => String(img.color || "").trim().toLowerCase() === color);
  const photo = { url: file.path, publicId: file.filename, color: variant.color, isPrimary: images.length === 0 };
  if (firstOfColor === -1) images.push(photo);
  else images.splice(firstOfColor, 0, photo);

  await product.save();
  invalidateProductCaches();

  return product;
};

export {
  getProducts,
  getProductBySlug,
  getFeaturedProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getSizeOptions,
  getColorOptions,
  addProductImages,
  deleteProductImage,
  uploadVariantImage,
};
