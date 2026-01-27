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

interface ProductData {
  name: string;
  description: string;
  price: number;
  comparePrice?: number;
  category: string;
  stock?: number;
  sku?: string;
  images?: any[];
  variants?: any[];
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
    .sort(sort)
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
 * Get featured products
 */
const getFeaturedProducts = async (limit: number = 8): Promise<IProduct[]> => {
  return (Product as any).getFeatured(limit);
};

/**
 * Create product (Admin)
 */
const createProduct = async (productData: ProductData): Promise<IProduct> => {
  // Verify category exists
  const category = await Category.findById(productData.category);
  if (!category) {
    throw new AppError("Category not found", 404);
  }

  const product = await Product.create(productData);
  return product;
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

  // Check for removed variants and clean up carts
  if (updateData.variants) {
    const currentVariantIds = new Set(
      (product as any).variants.map((v: any) => v._id.toString()),
    );
    const newVariantIds = new Set(
      updateData.variants
        .filter((v: any) => v._id) // Only existing variants have _id
        .map((v: any) => v._id.toString()),
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

  Object.assign(product, updateData);
  await product.save();

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

  // Delete images from Cloudinary
  for (const image of (product as any).images) {
    if (image.publicId) {
      await deleteImage(image.publicId);
    }
  }

  await product.deleteOne();
  return { message: "Product deleted successfully" };
};

/**
 * Add images to product (Admin)
 */
const addProductImages = async (
  productId: string,
  files: MulterFile[],
): Promise<IProduct> => {
  const product = await Product.findById(productId);
  if (!product) {
    throw new AppError("Product not found", 404);
  }

  const newImages = files.map((file, index) => ({
    url: file.path,
    publicId: file.filename,
    isPrimary: (product as any).images.length === 0 && index === 0,
  }));

  (product as any).images.push(...newImages);
  await product.save();

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
  addProductImages,
  deleteProductImage,
  uploadVariantImage,
};
