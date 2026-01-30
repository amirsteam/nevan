/**
 * Admin Routes
 * Protected routes for admin operations
 */
import express, { Request, Response } from "express";
import * as productController from "../controllers/productController";
import * as categoryController from "../controllers/categoryController";
import * as orderController from "../controllers/orderController";
import * as paymentController from "../controllers/paymentController";
import asyncHandler from "../utils/asyncHandler";
import { protect } from "../middleware/auth";
import { adminOnly } from "../middleware/role";
import { uploadProductImages, uploadCategoryImage } from "../config/cloudinary";
import {
  createProductValidator,
  updateProductValidator,
  createCategoryValidator,
  mongoIdValidator,
  paginationValidator,
} from "../middleware/validate";
import Order from "../models/Order";
import User from "../models/User";
import Product from "../models/Product";
import Category from "../models/Category";
import { paginate } from "../utils/helpers";

const router = express.Router();

// All admin routes require authentication and admin role
router.use(protect);
router.use(adminOnly);

// ==================== DASHBOARD ====================
router.get(
  "/dashboard",
  asyncHandler(async (req: Request, res: Response) => {
    const [orderStats, userCount, productCount, recentOrders] =
      await Promise.all([
        (Order as any).getDashboardStats(),
        User.countDocuments({ isActive: true }),
        Product.countDocuments({ isActive: true }),
        Order.find()
          .sort({ createdAt: -1 })
          .limit(5)
          .populate("user", "name email")
          .select(
            "orderNumber status payment pricing items shippingAddress createdAt user",
          ),
      ]);

    // Map recentOrders to include flattened fields for frontend compatibility
    const mappedOrders = recentOrders.map((order: any) => ({
      _id: order._id,
      orderNumber: order.orderNumber,
      user: order.user,
      items: order.items,
      shippingAddress: order.shippingAddress,
      orderStatus: order.status,
      paymentMethod: order.payment?.method,
      paymentStatus: order.payment?.status,
      total: order.pricing?.total,
      createdAt: order.createdAt,
    }));

    res.status(200).json({
      status: "success",
      data: {
        ...orderStats,
        totalUsers: userCount,
        totalProducts: productCount,
        recentOrders: mappedOrders,
      },
    });
  }),
);

// ==================== PRODUCTS ====================
router.get(
  "/products",
  paginationValidator,
  asyncHandler(async (req: Request, res: Response) => {
    // Get all products including inactive for admin
    const { page = 1, limit = 20 } = req.query;
    const total = await Product.countDocuments();
    const pagination = paginate(Number(page), Number(limit), total);

    const products = await Product.find()
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.itemsPerPage)
      .populate("category", "name slug");

    res.status(200).json({
      status: "success",
      results: products.length,
      pagination,
      data: { products },
    });
  }),
);

// Get single product by ID for admin
router.get(
  "/products/:id",
  mongoIdValidator("id"),
  asyncHandler(async (req: Request, res: Response) => {
    const product = await Product.findById(req.params.id).populate(
      "category",
      "name slug",
    );

    if (!product) {
      res.status(404).json({ status: "fail", message: "Product not found" });
      return;
    }

    res.status(200).json({
      status: "success",
      data: { product },
    });
  }),
);

router.post(
  "/products",
  createProductValidator,
  productController.createProduct,
);
router.put(
  "/products/:id",
  mongoIdValidator("id"),
  updateProductValidator,
  productController.updateProduct,
);
router.delete(
  "/products/:id",
  mongoIdValidator("id"),
  productController.deleteProduct,
);
router.post(
  "/products/:id/images",
  mongoIdValidator("id"),
  uploadProductImages.array("images", 10),
  productController.uploadImages,
);
router.delete("/products/:id/images/:imageId", productController.deleteImage);
router.post(
  "/products/:id/variants/:variantId/image",
  mongoIdValidator("id"),
  uploadProductImages.single("image"),
  productController.uploadVariantImage,
);

// ==================== CATEGORIES ====================
router.get("/categories", categoryController.getAdminCategories);
router.post(
  "/categories",
  createCategoryValidator,
  categoryController.createCategory,
);
router.put(
  "/categories/:id",
  mongoIdValidator("id"),
  categoryController.updateCategory,
);
router.delete(
  "/categories/:id",
  mongoIdValidator("id"),
  categoryController.deleteCategory,
);
router.post(
  "/categories/:id/image",
  mongoIdValidator("id"),
  uploadCategoryImage.single("image"),
  asyncHandler(async (req: any, res: Response) => {
    const category = await Category.findById(req.params.id);

    if (!category) {
      res.status(404).json({ status: "fail", message: "Category not found" });
      return;
    }

    (category as any).image = {
      url: req.file.path,
      publicId: req.file.filename,
    };
    await category.save();

    res.status(200).json({
      status: "success",
      message: "Category image uploaded",
      data: { category },
    });
  }),
);

// ==================== ORDERS ====================
router.get("/orders", paginationValidator, orderController.getAllOrders);
router.get("/orders/:id", mongoIdValidator("id"), orderController.getOrder);
router.put(
  "/orders/:id/status",
  mongoIdValidator("id"),
  orderController.updateOrderStatus,
);

// ==================== USERS ====================
router.get(
  "/users",
  paginationValidator,
  asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20, role } = req.query;
    const filter: any = {};
    if (role) filter.role = role;

    const total = await User.countDocuments(filter);
    const pagination = paginate(Number(page), Number(limit), total);

    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.itemsPerPage)
      .select("-password -refreshToken");

    res.status(200).json({
      status: "success",
      results: users.length,
      pagination,
      data: { users },
    });
  }),
);

router.put(
  "/users/:id/status",
  mongoIdValidator("id"),
  asyncHandler(async (req: Request, res: Response) => {
    const { isActive } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true },
    ).select("-password -refreshToken");

    if (!user) {
      res.status(404).json({ status: "fail", message: "User not found" });
      return;
    }

    res.status(200).json({
      status: "success",
      message: `User ${isActive ? "activated" : "deactivated"}`,
      data: { user },
    });
  }),
);

router.put(
  "/users/:id/role",
  mongoIdValidator("id"),
  asyncHandler(async (req: Request, res: Response) => {
    const { role } = req.body;

    if (!["customer", "admin"].includes(role)) {
      res.status(400).json({ status: "fail", message: "Invalid role" });
      return;
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true },
    ).select("-password -refreshToken");

    if (!user) {
      res.status(404).json({ status: "fail", message: "User not found" });
      return;
    }

    res.status(200).json({
      status: "success",
      message: `User role updated to ${role}`,
      data: { user },
    });
  }),
);

// ==================== PAYMENTS ====================
router.post("/payments/cod-collected", paymentController.markCODCollected);

export default router;
