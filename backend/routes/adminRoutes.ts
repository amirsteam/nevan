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
import * as shippingController from "../controllers/shippingController";
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
  shippingSettingsValidator,
  recordRefundValidator,
  codCollectedValidator,
  userStatusValidator,
  userRoleValidator,
  adminNoteValidator,
  updateCategoryValidator,
} from "../middleware/validate";
import User from "../models/User";
import Product from "../models/Product";
import { adoptVariantImages, syncDerivedFields } from "../utils/productVariants";
import Category from "../models/Category";
import { paginate, escapeRegex } from "../utils/helpers";
import { disconnectUserSockets } from "../config/socketRegistry";
import { LOW_STOCK_FILTER, SOLD_OUT_FILTER } from "../utils/stockFilters";
import * as dashboardService from "../services/dashboardService";
import { getAdminLog, logAdminAction } from "../services/adminLogService";
import Order from "../models/Order";
import * as orderService from "../services/orderService";
import AppError from "../utils/AppError";

const router = express.Router();

// All admin routes require authentication and admin role
router.use(protect);
router.use(adminOnly);

// ==================== DASHBOARD ====================
router.get(
  "/dashboard",
  asyncHandler(async (_req: Request, res: Response) => {
    res.status(200).json({ status: "success", data: await dashboardService.getDashboard() });
  }),
);

// Counts for the admin navigation badges — cheap enough to poll
router.get(
  "/badges",
  asyncHandler(async (_req: Request, res: Response) => {
    res.status(200).json({ status: "success", data: await dashboardService.getBadges() });
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
    const and: Record<string, unknown>[] = [];
    if (typeof search === "string" && search.trim()) {
      const pattern = new RegExp(escapeRegex(search.trim()), "i");
      and.push({ $or: [{ name: pattern }, { sku: pattern }] });
    }
    if (typeof category === "string" && mongoose.Types.ObjectId.isValid(category)) {
      filter.category = category;
    }
    if (isActive === "true" || isActive === "false") {
      filter.isActive = isActive === "true";
    }
    // Same filters the dashboard counts with
    if (stock === "low") and.push(LOW_STOCK_FILTER);
    else if (stock === "out") and.push(SOLD_OUT_FILTER);
    if (and.length) filter.$and = and;

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

// Before "/products/:id" so "sizes"/"options" aren't treated as ids
router.get("/products/sizes", productController.getSizeOptions);
router.get("/products/options", productController.getProductOptions);

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

    // Older products keep photos on variants: show them the way the editor
    // works (photos per colour). Not saved here; saving the form does that,
    // and adopted photos get the same ids then.
    adoptVariantImages(product);
    syncDerivedFields(product);

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
  updateCategoryValidator,
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
    if (!req.file) throw new AppError("Please choose an image", 400);
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
// Before "/orders/:id" so "export" isn't treated as an id
router.get("/orders/export", orderController.exportOrders);
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
router.post("/orders/:id/refund", mongoIdValidator("id"), recordRefundValidator, orderController.recordRefund);
router.put("/orders/:id/note", mongoIdValidator("id"), adminNoteValidator, orderController.updateAdminNote);

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
      .select("-password -refreshSessions")
      .lean();

    // Order history for the users on this page: orders placed, spent (sales only), last order
    const stats = await Order.aggregate([
      { $match: { user: { $in: users.map((u: any) => u._id) } } },
      {
        $group: {
          _id: "$user",
          orders: { $sum: 1 },
          spent: { $sum: { $cond: [{ $in: ["$status", dashboardService.REVENUE_STATUSES] }, "$pricing.total", 0] } },
          lastOrderAt: { $max: "$createdAt" },
        },
      },
    ]);
    const statsByUser = new Map(stats.map((row: any) => [String(row._id), row]));

    res.status(200).json({
      status: "success",
      results: users.length,
      pagination,
      data: {
        users: users.map((u: any) => {
          const row: any = statsByUser.get(String(u._id));
          return { ...u, orderStats: { orders: row?.orders || 0, spent: row?.spent || 0, lastOrderAt: row?.lastOrderAt || null } };
        }),
      },
    });
  }),
);

/** Admins can't deactivate or demote themselves (it would lock them out mid-session) */
const refuseOwnAccount = (req: Request): void => {
  if (String((req.user as any)._id) === String(req.params.id)) {
    throw new AppError("You can't change your own status or role. Ask another admin.", 409);
  }
};

router.put(
  "/users/:id/status",
  mongoIdValidator("id"),
  userStatusValidator,
  asyncHandler(async (req: Request, res: Response) => {
    refuseOwnAccount(req);
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
    await logAdminAction(req, isActive ? "user.activated" : "user.deactivated", {
      type: "user",
      id: user._id,
      label: `${user.name} (${user.email})`,
    });

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
  userRoleValidator,
  asyncHandler(async (req: Request, res: Response) => {
    refuseOwnAccount(req);
    const { role } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true },
    ).select("-password -refreshSessions");

    if (!user) {
      res.status(404).json({ status: "fail", message: "User not found" });
      return;
    }

    // Open chat connections still carry the old role; they reconnect with the new one
    disconnectUserSockets(String(user._id));
    await logAdminAction(req, "user.role", { type: "user", id: user._id, label: `${user.name} (${user.email})` }, `Now ${role}`);

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

// ==================== SHIPPING ====================
// Rates and free-delivery areas
router.get("/shipping", shippingController.getAdminSettings);
router.put("/shipping", shippingSettingsValidator, shippingController.updateSettings);

// ==================== ACTIVITY ====================
router.get(
  "/activity",
  paginationValidator,
  asyncHandler(async (req: Request, res: Response) => {
    const { entries, pagination } = await getAdminLog(Number(req.query.page) || 1, Number(req.query.limit) || 30);
    res.status(200).json({ status: "success", results: entries.length, pagination, data: { entries } });
  }),
);

// ==================== PAYMENTS ====================
router.post("/payments/cod-collected", codCollectedValidator, paymentController.markCODCollected);

export default router;
