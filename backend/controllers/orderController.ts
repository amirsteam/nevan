/**
 * Order Controller
 * Handles HTTP requests for orders
 */
import { Request, Response } from "express";
import * as orderService from "../services/orderService";
import asyncHandler from "../utils/asyncHandler";
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

export {
  createOrder,
  getMyOrders,
  getOrder,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
};
