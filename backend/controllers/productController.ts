/**
 * Product Controller
 * Handles HTTP requests for products
 */
import { Request, Response } from "express";
import * as productService from "../services/productService";
import asyncHandler from "../utils/asyncHandler";
import { decorateProducts } from "../services/campaignService";

interface MulterRequest extends Request {
  file?: any;
  files?: any;
}

/**
 * @desc    Get all products with filters
 * @route   GET /api/v1/products
 * @access  Public
 */
const getProducts = asyncHandler(async (req: Request, res: Response) => {
  const { products, pagination } = await productService.getProducts(req.query);

  res.status(200).json({
    status: "success",
    results: products.length,
    pagination,
    // Live campaign sale prices are added on the way out (never stored/cached)
    data: { products: await decorateProducts(products) },
  });
});

/**
 * @desc    Get featured products
 * @route   GET /api/v1/products/featured
 * @access  Public
 */
const getFeaturedProducts = asyncHandler(
  async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 8;
    const products = await productService.getFeaturedProducts(limit);

    res.status(200).json({
      status: "success",
      results: products.length,
      data: { products: await decorateProducts(products) },
    });
  },
);

/**
 * @desc    Get single product
 * @route   GET /api/v1/products/:slug
 * @access  Public
 */
const getProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.getProductBySlug(
    req.params.slug as string,
  );
  const [decorated] = await decorateProducts([product]);

  res.status(200).json({
    status: "success",
    data: { product: decorated },
  });
});

/**
 * @desc    Create product (Admin)
 * @route   POST /api/v1/admin/products
 * @access  Private/Admin
 */
const createProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.createProduct(req.body);

  res.status(201).json({
    status: "success",
    message: "Product created successfully",
    data: { product },
  });
});

/**
 * @desc    Size options for the product form (built-in + custom sizes in use)
 * @route   GET /api/v1/admin/products/sizes
 * @access  Private/Admin
 */
const getSizeOptions = asyncHandler(async (_req: Request, res: Response) => {
  const sizes = await productService.getSizeOptions();

  res.status(200).json({
    status: "success",
    data: { sizes },
  });
});

/**
 * @desc    Update product (Admin)
 * @route   PUT /api/v1/admin/products/:id
 * @access  Private/Admin
 */
const updateProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.updateProduct(
    req.params.id as string,
    req.body,
  );

  res.status(200).json({
    status: "success",
    message: "Product updated successfully",
    data: { product },
  });
});

/**
 * @desc    Delete product (Admin)
 * @route   DELETE /api/v1/admin/products/:id
 * @access  Private/Admin
 */
const deleteProduct = asyncHandler(async (req: Request, res: Response) => {
  await productService.deleteProduct(req.params.id as string);

  res.status(200).json({
    status: "success",
    message: "Product deleted successfully",
  });
});

/**
 * @desc    Upload product images (Admin)
 * @route   POST /api/v1/admin/products/:id/images
 * @access  Private/Admin
 */
const uploadImages = asyncHandler(async (req: Request, res: Response) => {
  const primaryIndex =
    req.body?.primaryIndex !== undefined ? Number(req.body.primaryIndex) : undefined;
  const product = await productService.addProductImages(
    req.params.id as string,
    (req as MulterRequest).files,
    Number.isInteger(primaryIndex) ? primaryIndex : undefined,
  );

  res.status(200).json({
    status: "success",
    message: "Images uploaded successfully",
    data: { product },
  });
});

/**
 * @desc    Delete product image (Admin)
 * @route   DELETE /api/v1/admin/products/:id/images/:imageId
 * @access  Private/Admin
 */
const deleteImage = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.deleteProductImage(
    req.params.id as string,
    req.params.imageId as string,
  );

  res.status(200).json({
    status: "success",
    message: "Image deleted successfully",
    data: { product },
  });
});

/**
 * @desc    Upload image for variant (Admin)
 * @route   POST /api/v1/admin/products/:id/variants/:variantId/image
 * @access  Private/Admin
 */
const uploadVariantImage = asyncHandler(async (req: Request, res: Response) => {
  const { id, variantId } = req.params;
  const product = await productService.uploadVariantImage(
    id as string,
    variantId as string,
    (req as MulterRequest).file,
  );

  res.status(200).json({
    status: "success",
    message: "Variant image uploaded successfully",
    data: { product },
  });
});

export {
  getProducts,
  getFeaturedProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getSizeOptions,
  uploadImages,
  deleteImage,
  uploadVariantImage,
};
