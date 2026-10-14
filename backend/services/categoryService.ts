/**
 * Category Service
 * Handles category business logic
 */
import Category, { ICategory } from "../models/Category";
import Product from "../models/Product";
import Campaign from "../models/Campaign";
import AppError from "../utils/AppError";
import { deleteImage } from "../config/cloudinary";
import { cache, CACHE_KEYS } from "../utils/cache";

interface CategoryData {
  name: string;
  description?: string;
  parent?: string;
  image?: {
    url: string;
    publicId: string;
  };
  isActive?: boolean;
  order?: number;
}

/**
 * Get all categories (tree structure) with caching
 */
const getCategories = async (): Promise<ICategory[]> => {
  // Check cache first
  const cached = cache.get<ICategory[]>(CACHE_KEYS.CATEGORY_TREE);
  if (cached) return cached;

  // Fetch from database
  const categories = await (Category as any).getTree();

  // Cache for 5 minutes
  cache.set(CACHE_KEYS.CATEGORY_TREE, categories, 300);

  return categories;
};

/**
 * Get all categories (flat list)
 */
const getAllCategoriesFlat = async (): Promise<ICategory[]> => {
  return Category.find({ isActive: true })
    .sort({ order: 1, name: 1 })
    .populate("parent", "name slug");
};

/**
 * Get all categories for admin (flat list, include inactive)
 */
const getAdminCategories = async (): Promise<ICategory[]> => {
  return Category.find()
    .sort({ order: 1, name: 1 })
    .populate("parent", "name slug");
};

/**
 * Get single category by slug
 */
const getCategoryBySlug = async (slug: string): Promise<ICategory> => {
  const category = await (Category as any).findBySlug(slug);
  if (!category) {
    throw new AppError("Category not found", 404);
  }
  return category;
};

/**
 * Create category (Admin)
 */
const createCategory = async (
  categoryData: CategoryData,
): Promise<ICategory> => {
  // If parent is specified, verify it exists
  if (categoryData.parent) {
    const parent = await Category.findById(categoryData.parent);
    if (!parent) {
      throw new AppError("Parent category not found", 404);
    }
  }

  const category = await Category.create(categoryData);
  return category;
};

/**
 * Update category (Admin)
 */
const updateCategory = async (
  categoryId: string,
  updateData: Partial<CategoryData>,
): Promise<ICategory> => {
  const category = await Category.findById(categoryId);
  if (!category) {
    throw new AppError("Category not found", 404);
  }

  // Prevent setting parent to self
  if (updateData.parent && updateData.parent === categoryId) {
    throw new AppError("Category cannot be its own parent", 400);
  }

  // If parent is specified, verify it exists and isn't one of this category's own subcategories
  if (updateData.parent) {
    const parent = await Category.findById(updateData.parent);
    if (!parent) {
      throw new AppError("Parent category not found", 404);
    }
    let ancestor: any = parent;
    for (let depth = 0; ancestor?.parent && depth < 20; depth++) {
      if (String(ancestor.parent) === categoryId) {
        throw new AppError("A category can't be moved under one of its own subcategories", 400);
      }
      ancestor = await Category.findById(ancestor.parent).select("parent");
    }
  }

  Object.assign(category, updateData);
  await category.save();

  // Invalidate category cache
  cache.delete(CACHE_KEYS.CATEGORY_TREE);
  cache.delete(CACHE_KEYS.CATEGORIES);

  return category;
};

/**
 * Delete category (Admin)
 */
const deleteCategory = async (
  categoryId: string,
): Promise<{ message: string; name: string }> => {
  const category = await Category.findById(categoryId);
  if (!category) {
    throw new AppError("Category not found", 404);
  }

  // Deleting a category that is still used would leave products, subcategories
  // and sale campaigns pointing at nothing
  const [products, subcategories, campaigns] = await Promise.all([
    Product.countDocuments({ category: categoryId }),
    Category.countDocuments({ parent: categoryId }),
    Campaign.countDocuments({ "sale.categories": categoryId }),
  ]);
  if (products || subcategories || campaigns) {
    const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
    const uses = [
      products && count(products, "product", "products"),
      subcategories && count(subcategories, "subcategory", "subcategories"),
      campaigns && count(campaigns, "campaign", "campaigns"),
    ].filter(Boolean);
    throw new AppError(
      `"${(category as any).name}" is still used by ${uses.join(", ")}. Move or remove them first, or hide the category instead.`,
      409,
    );
  }

  // Delete image from Cloudinary
  if ((category as any).image?.publicId) {
    await deleteImage((category as any).image.publicId);
  }

  await category.deleteOne();

  // Invalidate category cache
  cache.delete(CACHE_KEYS.CATEGORY_TREE);
  cache.delete(CACHE_KEYS.CATEGORIES);

  return { message: "Category deleted successfully", name: (category as any).name };
};

export {
  getCategories,
  getAllCategoriesFlat,
  getAdminCategories,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
};
