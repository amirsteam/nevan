/**
 * Product Controller
 * Handles HTTP requests for products
 */
const productService = require('../services/productService');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get all products with filters
 * @route   GET /api/v1/products
 * @access  Public
 */
const getProducts = asyncHandler(async (req, res) => {
    const { products, pagination } = await productService.getProducts(req.query);

    res.status(200).json({
        status: 'success',
        results: products.length,
        pagination,
        data: { products },
    });
});

/**
 * @desc    Get featured products
 * @route   GET /api/v1/products/featured
 * @access  Public
 */
const getFeaturedProducts = asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit) || 8;
    const products = await productService.getFeaturedProducts(limit);

    res.status(200).json({
        status: 'success',
        results: products.length,
        data: { products },
    });
});

/**
 * @desc    Get single product
 * @route   GET /api/v1/products/:slug
 * @access  Public
 */
const getProduct = asyncHandler(async (req, res) => {
    const product = await productService.getProductBySlug(req.params.slug);

    res.status(200).json({
        status: 'success',
        data: { product },
    });
});

/**
 * @desc    Create product (Admin)
 * @route   POST /api/v1/admin/products
 * @access  Private/Admin
 */
const createProduct = asyncHandler(async (req, res) => {
    const product = await productService.createProduct(req.body);

    res.status(201).json({
        status: 'success',
        message: 'Product created successfully',
        data: { product },
    });
});

/**
 * @desc    Update product (Admin)
 * @route   PUT /api/v1/admin/products/:id
 * @access  Private/Admin
 */
const updateProduct = asyncHandler(async (req, res) => {
    const product = await productService.updateProduct(req.params.id, req.body);

    res.status(200).json({
        status: 'success',
        message: 'Product updated successfully',
        data: { product },
    });
});

/**
 * @desc    Delete product (Admin)
 * @route   DELETE /api/v1/admin/products/:id
 * @access  Private/Admin
 */
const deleteProduct = asyncHandler(async (req, res) => {
    await productService.deleteProduct(req.params.id);

    res.status(200).json({
        status: 'success',
        message: 'Product deleted successfully',
    });
});

/**
 * @desc    Upload product images (Admin)
 * @route   POST /api/v1/admin/products/:id/images
 * @access  Private/Admin
 */
const uploadImages = asyncHandler(async (req, res) => {
    const product = await productService.addProductImages(req.params.id, req.files);

    res.status(200).json({
        status: 'success',
        message: 'Images uploaded successfully',
        data: { product },
    });
});

/**
 * @desc    Delete product image (Admin)
 * @route   DELETE /api/v1/admin/products/:id/images/:imageId
 * @access  Private/Admin
 */
const deleteImage = asyncHandler(async (req, res) => {
    const product = await productService.deleteProductImage(req.params.id, req.params.imageId);

    res.status(200).json({
        status: 'success',
        message: 'Image deleted successfully',
        data: { product },
    });
});

/**
 * @desc    Upload image for variant option (Admin)
 * @route   POST /api/v1/admin/products/:id/variants/:variantId/options/:optionId/image
 * @access  Private/Admin
 */
const uploadVariantImage = asyncHandler(async (req, res) => {
    const { id, variantId, optionId } = req.params;
    const product = await productService.uploadVariantImage(id, variantId, optionId, req.file);

    res.status(200).json({
        status: 'success',
        message: 'Variant image uploaded successfully',
        data: { product },
    });
});

module.exports = {
    getProducts,
    getFeaturedProducts,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct,
    uploadImages,
    deleteImage,
    uploadVariantImage,
};
