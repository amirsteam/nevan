/**
 * Product Service
 * Handles product business logic
 */
const { Product, Category } = require('../models');
const { paginate } = require('../utils/helpers');
const AppError = require('../utils/AppError');
const { deleteImage } = require('../config/cloudinary');
const mongoose = require('mongoose');

/**
 * Get all products with filters and pagination
 */
const getProducts = async (options = {}) => {
    const {
        page = 1,
        limit = 12,
        category,
        search,
        minPrice,
        maxPrice,
        isFeatured,
        sort = '-createdAt',
    } = options;

    // Build filter
    const filter = { isActive: true };

    if (category) {
        // Find category by slug or ID
        let catQuery = { slug: category };
        if (mongoose.Types.ObjectId.isValid(category)) {
            catQuery = { $or: [{ slug: category }, { _id: category }] };
        }

        const cat = await Category.findOne(catQuery);
        if (cat) {
            // Find all subcategories to include their products too
            const subCategories = await Category.find({ parent: cat._id }).distinct('_id');
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
        filter.isFeatured = isFeatured === 'true' || isFeatured === true;
    }

    // Count total
    const total = await Product.countDocuments(filter);
    const pagination = paginate(page, limit, total);

    // Get products
    const products = await Product.find(filter)
        .sort(sort)
        .skip(pagination.skip)
        .limit(pagination.itemsPerPage)
        .populate('category', 'name slug')
        .lean();

    return { products, pagination };
};

/**
 * Get single product by slug or ID
 */
const getProductBySlug = async (slugOrId) => {
    const mongoose = require('mongoose');
    const isId = mongoose.Types.ObjectId.isValid(slugOrId);

    const query = { isActive: true };
    if (isId) {
        query.$or = [{ slug: slugOrId }, { _id: slugOrId }];
    } else {
        query.slug = slugOrId;
    }

    const product = await Product.findOne(query).populate('category', 'name slug');

    if (!product) {
        throw new AppError('Product not found', 404);
    }

    return product;
};

/**
 * Get featured products
 */
const getFeaturedProducts = async (limit = 8) => {
    return Product.getFeatured(limit);
};

/**
 * Create product (Admin)
 */
const createProduct = async (productData) => {
    // Verify category exists
    const category = await Category.findById(productData.category);
    if (!category) {
        throw new AppError('Category not found', 404);
    }

    const product = await Product.create(productData);
    return product;
};

/**
 * Update product (Admin)
 */
const updateProduct = async (productId, updateData) => {
    const product = await Product.findById(productId);
    if (!product) {
        throw new AppError('Product not found', 404);
    }

    // If category is being updated, verify it exists
    if (updateData.category) {
        const category = await Category.findById(updateData.category);
        if (!category) {
            throw new AppError('Category not found', 404);
        }
    }

    Object.assign(product, updateData);
    await product.save();

    return product;
};

/**
 * Delete product (Admin)
 */
const deleteProduct = async (productId) => {
    const product = await Product.findById(productId);
    if (!product) {
        throw new AppError('Product not found', 404);
    }

    // Delete images from Cloudinary
    for (const image of product.images) {
        if (image.publicId) {
            await deleteImage(image.publicId);
        }
    }

    await product.deleteOne();
    return { message: 'Product deleted successfully' };
};

/**
 * Add images to product (Admin)
 */
const addProductImages = async (productId, files) => {
    const product = await Product.findById(productId);
    if (!product) {
        throw new AppError('Product not found', 404);
    }

    const newImages = files.map((file, index) => ({
        url: file.path,
        publicId: file.filename,
        isPrimary: product.images.length === 0 && index === 0,
    }));

    product.images.push(...newImages);
    await product.save();

    return product;
};

/**
 * Delete product image (Admin)
 */
const deleteProductImage = async (productId, imageId) => {
    const product = await Product.findById(productId);
    if (!product) {
        throw new AppError('Product not found', 404);
    }

    const image = product.images.id(imageId);
    if (!image) {
        throw new AppError('Image not found', 404);
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
 * Upload image for a specific variant option (Admin)
 */
const uploadVariantImage = async (productId, variantId, optionId, file) => {
    const product = await Product.findById(productId);
    if (!product) {
        throw new AppError('Product not found', 404);
    }

    const variant = product.variants.id(variantId);
    if (!variant) {
        throw new AppError('Variant not found', 404);
    }

    const option = variant.options.id(optionId);
    if (!option) {
        throw new AppError('Variant option not found', 404);
    }

    // If there was a previous image, we could delete it from Cloudinary here
    // For now, just overwrite the URL
    option.image = file.path; // Cloudinary URL
    await product.save();

    return product;
};

module.exports = {
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
