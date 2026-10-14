/**
 * Order Controller
 * Handles HTTP requests for orders
 */
import { Request, Response } from "express";
import * as orderService from "../services/orderService";
import asyncHandler from "../utils/asyncHandler";
import { logAdminAction } from "../services/adminLogService";
import Order from "../models/Order";

/**
 * Maps order document to include flattened fields for frontend compatibility
 */
const mapOrderForResponse = (order: any) => ({
  _id: order._id,
  orderNumber: order.orderNumber,
  user: order.user,
  items: order.items,
  shippingAddress: order.shippingAddress,
  // Flattened fields for frontend
  orderStatus: order.status,
  paymentMethod: order.payment?.method,
  paymentStatus: order.payment?.status,
  total: order.pricing?.total,
  subtotal: order.pricing?.subtotal,
  shippingCost: order.pricing?.shippingCost,
  discount: order.pricing?.discount,
  // Keep original nested fields too
  status: order.status,
  payment: order.payment,
  pricing: order.pricing,
  statusHistory: order.statusHistory,
  notes: order.notes,
  customerNotes: order.customerNotes,
  deliveredAt: order.deliveredAt,
  cancelledAt: order.cancelledAt,
  cancellationReason: order.cancellationReason,
  canBeCancelled: order.canBeCancelled,
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
});

/**
 * @desc    Create order from cart
 * @route   POST /api/v1/orders
 * @access  Private
 */
const createOrder = asyncHandler(async (req: Request, res: Response) => {
  if (req.user) {
    const order = await orderService.createOrder(
      (req.user as any)._id,
      req.body,
    );

    res.status(201).json({
      status: "success",
      message: "Order placed successfully",
      data: { order: mapOrderForResponse(order) },
    });
  }
});

/**
 * @desc    Shipping cost of the current cart to an address (checkout preview)
 * @route   POST /api/v1/orders/shipping-quote
 * @access  Private
 */
const getShippingQuote = asyncHandler(async (req: Request, res: Response) => {
  const quote = await orderService.getShippingQuote(String((req.user as any)._id), {
    province: req.body.province,
    district: req.body.district,
    city: req.body.city,
  });
  res.status(200).json({ status: "success", data: quote });
});

/**
 * @desc    Get user's orders
 * @route   GET /api/v1/orders
 * @access  Private
 */
const getMyOrders = asyncHandler(async (req: Request, res: Response) => {
  if (req.user) {
    const { orders, pagination } = await orderService.getUserOrders(
      (req.user as any)._id,
      req.query,
    );

    res.status(200).json({
      status: "success",
      results: orders.length,
      pagination,
      data: { orders: orders.map(mapOrderForResponse) },
    });
  }
});

/**
 * @desc    Get order details
 * @route   GET /api/v1/orders/:id
 * @access  Private
 */
const getOrder = asyncHandler(async (req: Request, res: Response) => {
  if (req.user) {
    // User can only see their own orders (unless admin)
    const userId = req.user.role === "admin" ? null : (req.user as any)._id;
    const order = await orderService.getOrderById(
      req.params.id as string,
      userId,
    );

    res.status(200).json({
      status: "success",
      data: { order: mapOrderForResponse(order) },
    });
  }
});

/**
 * @desc    Cancel order
 * @route   POST /api/v1/orders/:id/cancel
 * @access  Private
 */
const cancelOrder = asyncHandler(async (req: Request, res: Response) => {
  const { reason } = req.body;
  if (req.user) {
    const order = await orderService.cancelOrder(
      req.params.id as string,
      (req.user as any)._id,
      reason || "Cancelled by customer",
    );

    res.status(200).json({
      status: "success",
      message: "Order cancelled successfully",
      data: { order: mapOrderForResponse(order) },
    });
  }
});

/**
 * @desc    Get all orders (Admin)
 * @route   GET /api/v1/admin/orders
 * @access  Private/Admin
 */
const getAllOrders = asyncHandler(async (req: Request, res: Response) => {
  // Get orders with pagination
  const { orders, pagination } = await orderService.getAllOrders(req.query);

  // Get status counts for stats cards (run in parallel with orders query would be better in service)
  const statusCounts = await Order.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  // Transform to object format
  const stats = {
    pending: 0,
    confirmed: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
  };
  statusCounts.forEach((item) => {
    if (item._id in stats) {
      stats[item._id as keyof typeof stats] = item.count;
    }
  });

  res.status(200).json({
    status: "success",
    results: orders.length,
    pagination,
    stats, // Add stats to response
    data: { orders: orders.map(mapOrderForResponse) },
  });
});

/**
 * @desc    Update order status (Admin)
 * @route   PUT /api/v1/admin/orders/:id/status
 * @access  Private/Admin
 */
const updateOrderStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status, note } = req.body;
  if (req.user) {
    const order = await orderService.updateOrderStatus(
      req.params.id as string,
      status,
      (req.user as any)._id,
      note,
    );

    res.status(200).json({
      status: "success",
      message: `Order status updated to ${status}`,
      data: { order: mapOrderForResponse(order) },
    });
  }
});

/**
 * @desc    Record that the money owed on an order was refunded
 * @route   POST /api/v1/admin/orders/:id/refund
 * @access  Admin
 */
const recordRefund = asyncHandler(async (req: Request, res: Response) => {
  const order = await orderService.recordRefund(
    req.params.id as string,
    String((req.user as any)._id),
    req.body.reference || "",
    req.body.note || "",
  );
  await logAdminAction(
    req,
    "order.refund",
    { type: "order", id: order._id, label: `#${(order as any).orderNumber}` },
    [req.body.reference && `Ref ${req.body.reference}`, req.body.note].filter(Boolean).join(" — "),
  );
  res.status(200).json({
    status: "success",
    message: "Refund recorded",
    data: { order: mapOrderForResponse(order) },
  });
});

/**
 * @desc    Every order matching the list filters (for CSV export)
 * @route   GET /api/v1/admin/orders/export
 * @access  Admin
 */
const exportOrders = asyncHandler(async (req: Request, res: Response) => {
  const orders = await orderService.exportOrders(req.query);
  res.status(200).json({ status: "success", results: orders.length, data: { orders: orders.map(mapOrderForResponse) } });
});

/**
 * @desc    Internal admin note on an order
 * @route   PUT /api/v1/admin/orders/:id/note
 * @access  Admin
 */
const updateAdminNote = asyncHandler(async (req: Request, res: Response) => {
  const order = await orderService.updateAdminNote(req.params.id as string, req.body.note || "");
  res.status(200).json({ status: "success", message: "Note saved", data: { order: mapOrderForResponse(order) } });
});

export {
  createOrder,
  recordRefund,
  exportOrders,
  updateAdminNote,
  getShippingQuote,
  getMyOrders,
  getOrder,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
};
