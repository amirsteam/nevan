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
import { PRODUCT_SIZES } from "../utils/constants";

interface ProductsOptions {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  isFeatured?: boolean | string;
  sort?: string;
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
  stock?: number;
  image?: string | null;
  sku?: string;
}

interface ProductData {
  name: string;
  description: string;
  shortDescription?: string;
  material?: string;
  careInstructions?: string;
  ageRecommendation?: string;
  price: number;
  comparePrice?: number;
  category: string;
  stock?: number;
  sku?: string;
  images?: any[];
  variants?: VariantData[];
  // Not stored: selects which existing image is primary
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
  } = options;

  // Build filter
  const filter: any = { isActive: true };

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
const CLEARABLE_FIELDS = ["comparePrice", "sku", "shortDescription"] as const;

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
    normalized.variants = normalized.variants.map((v: VariantData) => ({
      ...v,
      size: String(v.size).trim(),
      color: String(v.color).trim(),
    }));
  }
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
  const data = normalizeProductInput(updateData);

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

  if (primaryImageId) {
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

  // Delete images from Cloudinary in parallel for better performance
  const imageDeletions = (product as any).images
    .filter((image: any) => image.publicId)
    .map((image: any) => deleteImage(image.publicId));

  await Promise.all(imageDeletions);

  await product.deleteOne();

  invalidateProductCaches();

  return { message: "Product deleted successfully" };
};

/**
 * Add images to product (Admin)
 */
const addProductImages = async (
  productId: string,
  files: MulterFile[],
  primaryIndex?: number,
): Promise<IProduct> => {
  const product = await Product.findById(productId);
  if (!product) {
    throw new AppError("Product not found", 404);
  }

  const images = (product as any).images;
  // An explicit primaryIndex (chosen in the admin form) wins; otherwise the
  // first image becomes primary only if the product has none yet
  const explicitPrimary =
    primaryIndex !== undefined && primaryIndex >= 0 && primaryIndex < files.length;

  if (explicitPrimary) {
    images.forEach((img: any) => {
      img.isPrimary = false;
    });
  }

  const newImages = files.map((file, index) => ({
    url: file.path,
    publicId: file.filename,
    isPrimary: explicitPrimary
      ? index === primaryIndex
      : images.length === 0 && index === 0,
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

  const image = (product as any).images.id(imageId);
  if (!image) {
    throw new AppError("Image not found", 404);
  }

  // Delete from Cloudinary
  if (image.publicId) {
    await deleteImage(image.publicId);
  }

  image.deleteOne();
  await product.save();

  return product;
};

/**
 * Upload image for a specific variant (Admin)
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

  // If there was a previous image, we could delete it from Cloudinary here
  // For now, just overwrite the URL
  variant.image = file.path; // Cloudinary URL
  await product.save();

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
  addProductImages,
  deleteProductImage,
  uploadVariantImage,
};
