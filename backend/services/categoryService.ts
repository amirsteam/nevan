/**
 * Category Service
 * Handles category business logic
 */
import Category, { ICategory } from "../models/Category";
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

  // If parent is specified, verify it exists
  if (updateData.parent) {
    const parent = await Category.findById(updateData.parent);
    if (!parent) {
      throw new AppError("Parent category not found", 404);
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
): Promise<{ message: string }> => {
  const category = await Category.findById(categoryId);
  if (!category) {
    throw new AppError("Category not found", 404);
  }

  // Delete image from Cloudinary
  if ((category as any).image?.publicId) {
    await deleteImage((category as any).image.publicId);
  }

  await category.deleteOne();

  // Invalidate category cache
  cache.delete(CACHE_KEYS.CATEGORY_TREE);
  cache.delete(CACHE_KEYS.CATEGORIES);

  return { message: "Category deleted successfully" };
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
