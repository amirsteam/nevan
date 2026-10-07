/**
 * Admin Routes
 * Protected routes for admin operations
 */
import express, { Request, Response } from "express";
import mongoose from "mongoose";
import * as productController from "../controllers/productController";
import * as categoryController from "../controllers/categoryController";
import * as orderController from "../controllers/orderController";
import * as paymentController from "../controllers/paymentController";
import * as contactController from "../controllers/contactController";
import * as campaignController from "../controllers/campaignController";
import asyncHandler from "../utils/asyncHandler";
import { protect } from "../middleware/auth";
import { adminOnly } from "../middleware/role";
import { uploadProductImages, uploadCategoryImage, uploadCampaignBanner } from "../config/cloudinary";
import {
  campaignValidator,
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
import { paginate, escapeRegex } from "../utils/helpers";
import { disconnectUserSockets } from "../config/socketRegistry";
import { LOW_STOCK_THRESHOLD } from "../utils/constants";
import * as orderService from "../services/orderService";
import AppError from "../utils/AppError";
import ContactMessage from "../models/ContactMessage";

const REVENUE_STATUSES = ["confirmed", "processing", "shipped", "delivered"];

const router = express.Router();

// All admin routes require authentication and admin role
router.use(protect);
router.use(adminOnly);

// ==================== DASHBOARD ====================
router.get(
  "/dashboard",
  asyncHandler(async (req: Request, res: Response) => {
    const since30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [
      orderStats,
      userCount,
      productCount,
      recentOrders,
      lowStockProducts,
      lowStockCount,
      refundRequired,
      topProducts,
      unreadMessages,
    ] = await Promise.all([
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
        Product.find({ isActive: true, stock: { $lte: LOW_STOCK_THRESHOLD } })
          .sort({ stock: 1, name: 1 })
          .limit(8)
          .select("name slug stock images variants.size variants.color variants.stock"),
        Product.countDocuments({ isActive: true, stock: { $lte: LOW_STOCK_THRESHOLD } }),
        Order.countDocuments({ status: "cancelled", "payment.status": "paid" }),
        Order.aggregate([
          { $match: { createdAt: { $gte: since30Days }, status: { $in: REVENUE_STATUSES } } },
          { $unwind: "$items" },
          {
            $group: {
              _id: "$items.product",
              name: { $first: "$items.name" },
              slug: { $first: "$items.slug" },
              image: { $first: "$items.image" },
              quantity: { $sum: "$items.quantity" },
              revenue: { $sum: "$items.subtotal" },
            },
          },
          { $sort: { quantity: -1, revenue: -1 } },
          { $limit: 5 },
        ]),
        ContactMessage.countDocuments({ isRead: false }),
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
        lowStockThreshold: LOW_STOCK_THRESHOLD,
        lowStockCount,
        lowStockProducts: lowStockProducts.map((p: any) => ({
          _id: p._id,
          name: p.name,
          slug: p.slug,
          stock: p.stock,
          image: p.images?.find((img: any) => img.isPrimary)?.url || p.images?.[0]?.url,
          // Variants that are low on their own, so admins know what to restock
          lowVariants: (p.variants || [])
            .filter((v: any) => v.stock <= LOW_STOCK_THRESHOLD)
            .map((v: any) => ({ size: v.size, color: v.color, stock: v.stock })),
        })),
        // Things an admin should act on, each linked to a filtered list
        needsAttention: {
          pendingOrders: orderStats.ordersByStatus?.pending || 0,
          toShip:
            (orderStats.ordersByStatus?.confirmed || 0) +
            (orderStats.ordersByStatus?.processing || 0),
          refundRequired,
          lowStock: lowStockCount,
          unreadMessages,
        },
        topProducts: topProducts.map((p: any) => ({
          _id: p._id,
          name: p.name,
          slug: p.slug,
          image: p.image,
          quantity: p.quantity,
          revenue: p.revenue,
        })),
      },
    });
  }),
);

// Counts for the admin navigation badges — cheap enough to poll
router.get(
  "/badges",
  asyncHandler(async (_req: Request, res: Response) => {
    const [pendingOrders, refundRequired, unreadMessages] = await Promise.all([
      Order.countDocuments({ status: "pending" }),
      Order.countDocuments({ status: "cancelled", "payment.status": "paid" }),
      ContactMessage.countDocuments({ isRead: false }),
    ]);
    res.status(200).json({
      status: "success",
      data: { pendingOrders, refundRequired, unreadMessages },
    });
  }),
);

// ==================== PRODUCTS ====================
router.get(
  "/products",
  paginationValidator,
  asyncHandler(async (req: Request, res: Response) => {
    // Get all products including inactive for admin
    const { page = 1, limit = 20, search, category, isActive, stock } = req.query;

    const filter: Record<string, unknown> = {};
    if (typeof search === "string" && search.trim()) {
      const pattern = new RegExp(escapeRegex(search.trim()), "i");
      filter.$or = [{ name: pattern }, { sku: pattern }];
    }
    if (typeof category === "string" && mongoose.Types.ObjectId.isValid(category)) {
      filter.category = category;
    }
    if (isActive === "true" || isActive === "false") {
      filter.isActive = isActive === "true";
    }
    if (stock === "low") {
      filter.stock = { $gt: 0, $lte: LOW_STOCK_THRESHOLD };
    } else if (stock === "out") {
      filter.stock = { $lte: 0 };
    }

    const total = await Product.countDocuments(filter);
    const pagination = paginate(Number(page), Number(limit), total);

    const products = await Product.find(filter)
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

// Before "/products/:id" so "sizes" isn't treated as an id
router.get("/products/sizes", productController.getSizeOptions);

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
// Before "/orders/:id" routes
router.post(
  "/orders/bulk-status",
  asyncHandler(async (req: Request, res: Response) => {
    const { orderIds, status, note } = req.body;
    if (
      !Array.isArray(orderIds) ||
      orderIds.length === 0 ||
      orderIds.length > 100 ||
      !orderIds.every((id: unknown) => typeof id === "string" && mongoose.Types.ObjectId.isValid(id))
    ) {
      throw new AppError("orderIds must be a list of 1-100 order ids", 400);
    }
    if (!["confirmed", "processing", "shipped", "delivered", "cancelled"].includes(status)) {
      throw new AppError("Invalid status", 400);
    }

    const result = await orderService.bulkUpdateOrderStatus(
      orderIds,
      status,
      String((req.user as any)._id),
      typeof note === "string" ? note.slice(0, 500) : "",
    );

    res.status(200).json({
      status: "success",
      message: `${result.updated.length} updated, ${result.failed.length} failed`,
      data: result,
    });
  }),
);
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
    const { page = 1, limit = 20, role, search, isActive } = req.query;
    const filter: any = {};
    if (role === "customer" || role === "admin") filter.role = role;
    if (isActive === "true" || isActive === "false") filter.isActive = isActive === "true";
    if (typeof search === "string" && search.trim()) {
      const pattern = new RegExp(escapeRegex(search.trim().slice(0, 100)), "i");
      filter.$or = [{ name: pattern }, { email: pattern }, { phone: pattern }];
    }

    const total = await User.countDocuments(filter);
    const pagination = paginate(Number(page), Number(limit), total);

    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.itemsPerPage)
      .select("-password -refreshSessions");

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
    ).select("-password -refreshSessions");

    if (!user) {
      res.status(404).json({ status: "fail", message: "User not found" });
      return;
    }

    // A deactivated user's open chat connections end immediately
    if (!isActive) {
      disconnectUserSockets(String(user._id));
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
    ).select("-password -refreshSessions");

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

// ==================== CONTACT / NEWSLETTER ====================
router.get("/contact-messages", paginationValidator, contactController.getContactMessages);
router.put(
  "/contact-messages/:id",
  mongoIdValidator("id"),
  contactController.updateContactMessage,
);
router.get("/subscribers", paginationValidator, contactController.getSubscribers);

// ==================== CAMPAIGNS ====================
// "presets" before "/:id" so it is not treated as an id
router.get("/campaigns/presets", campaignController.presets);
router.get("/campaigns", campaignController.list);
router.post("/campaigns", campaignValidator(true), campaignController.create);
router.get("/campaigns/:id", mongoIdValidator("id"), campaignController.getOne);
router.put("/campaigns/:id", mongoIdValidator("id"), campaignValidator(false), campaignController.update);
router.delete("/campaigns/:id", mongoIdValidator("id"), campaignController.remove);
router.post("/campaigns/:id/duplicate", mongoIdValidator("id"), campaignController.duplicate);
router.post(
  "/campaigns/:id/banner",
  mongoIdValidator("id"),
  uploadCampaignBanner.single("image"),
  campaignController.uploadBanner,
);
router.delete("/campaigns/:id/banner", mongoIdValidator("id"), campaignController.deleteBanner);
router.post("/campaigns/:id/notify", mongoIdValidator("id"), campaignController.notify);
router.get("/campaigns/:id/stats", mongoIdValidator("id"), campaignController.stats);

// ==================== PAYMENTS ====================
router.post("/payments/cod-collected", paymentController.markCODCollected);

export default router;
