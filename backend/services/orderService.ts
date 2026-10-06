/**
 * Order Service
 * Handles order business logic
 */
import Order, { IOrder } from "../models/Order";
import Payment from "../models/Payment";
import Cart from "../models/Cart";
import Product from "../models/Product";
import User from "../models/User";
import { paginate, PaginationResult, escapeRegex } from "../utils/helpers";
import AppError from "../utils/AppError";
import { sendOrderStatusNotification } from "./pushNotificationService";

interface ShippingAddress {
  name: string;
  phone: string;
  street: string;
  city: string;
  district: string;
  province: number;
  postalCode?: string;
}

interface OrderData {
  shippingAddress: ShippingAddress;
  paymentMethod: "cod" | "esewa" | "khalti";
  customerNotes?: string;
}

interface OrdersResult {
  orders: IOrder[];
  pagination: PaginationResult;
}

interface GetOrdersOptions {
  page?: number;
  limit?: number;
  status?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  // Order number, customer name/phone on the address, or account email/name
  search?: string;
  // Cancelled but paid (payment arrived after cancellation): needs a manual refund
  refundRequired?: string | boolean;
}

const ORDER_STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];
const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded"];
const PAYMENT_METHODS = ["cod", "esewa", "khalti"];


/** Mongo filter for the admin order list; unknown values are ignored */
const buildAdminOrderFilter = async (options: GetOrdersOptions): Promise<Record<string, unknown>> => {
  const { status, paymentStatus, paymentMethod, search, refundRequired } = options;
  const filter: Record<string, unknown> = {};

  if (typeof status === "string" && ORDER_STATUSES.includes(status)) filter.status = status;
  if (typeof paymentStatus === "string" && PAYMENT_STATUSES.includes(paymentStatus)) {
    filter["payment.status"] = paymentStatus;
  }
  if (typeof paymentMethod === "string" && PAYMENT_METHODS.includes(paymentMethod)) {
    filter["payment.method"] = paymentMethod;
  }
  if (refundRequired === true || refundRequired === "true") {
    filter.status = "cancelled";
    filter["payment.status"] = "paid";
  }

  if (typeof search === "string" && search.trim()) {
    const pattern = new RegExp(escapeRegex(search.trim().slice(0, 100)), "i");
    const users = await User.find({ $or: [{ email: pattern }, { name: pattern }] })
      .limit(200)
      .distinct("_id");
    filter.$or = [
      { orderNumber: pattern },
      { "shippingAddress.name": pattern },
      { "shippingAddress.phone": pattern },
      ...(users.length ? [{ user: { $in: users } }] : []),
    ];
  }

  return filter;
};

/**
 * Create order from cart
 */
const createOrder = async (
  userId: string,
  orderData: OrderData,
): Promise<IOrder> => {
  const { shippingAddress, paymentMethod, customerNotes } = orderData;

  if (!(await Cart.exists({ user: userId, "items.0": { $exists: true } }))) {
    throw new AppError("Cart is empty", 400);
  }

  // An earlier online-payment order the customer never paid for (e.g. they went
  // back from eSewa and are checking out again) is replaced by the new one, so it
  // doesn't keep holding stock or linger as a duplicate. Done before reading
  // stock below so the released units count.
  await cancelUnpaidOnlineOrders(
    { user: userId },
    "Replaced by a newer order before payment was completed",
  );

  // Get user's cart
  const cart = await Cart.findOne({ user: userId }).populate({
    path: "items.product",
    select: "name slug price images stock variants isActive",
  });

  if (!cart || (cart as any).items.length === 0) {
    throw new AppError("Cart is empty", 400);
  }

  // Validate products and build order items
  const orderItems: any[] = [];
  let subtotal = 0;

  for (const item of (cart as any).items) {
    const product = item.product;

    if (!product || !product.isActive) {
      throw new AppError(
        `Product "${item.product?.name || "Unknown"}" is no longer available`,
        400,
      );
    }

    let itemPrice: number;
    let variantSnapshot: any = null;
    let variantImage: string | null = null;

    // If variantId exists, validate and get variant data
    if (item.variantId) {
      const variant = product.variants.id(item.variantId);
      if (!variant) {
        throw new AppError(`Variant not found for ${product.name}`, 400);
      }

      // Check variant stock
      if (variant.stock < item.quantity) {
        throw new AppError(
          `Only ${variant.stock} items available for ${product.name} (${variant.size} - ${variant.color})`,
          400,
        );
      }

      itemPrice = variant.price;
      variantImage = variant.image;
      variantSnapshot = {
        size: variant.size,
        color: variant.color,
      };
    } else {
      // No variant - use base price and stock
      if (product.stock < item.quantity) {
        throw new AppError(`Insufficient stock for ${product.name}`, 400);
      }
      itemPrice = product.price;
    }

    const itemSubtotal = itemPrice * item.quantity;
    subtotal += itemSubtotal;

    orderItems.push({
      product: product._id,
      variantId: item.variantId || null,
      name: product.name,
      slug: product.slug,
      image: variantImage || product.images[0]?.url,
      price: itemPrice,
      quantity: item.quantity,
      variant: variantSnapshot,
      subtotal: itemSubtotal,
    });
  }

  // Calculate totals
  const shippingCost = calculateShippingCost(shippingAddress, subtotal);
  const discount = 0; // Implement coupon logic here
  const tax = 0; // Nepal doesn't have sales tax for most products
  const total = subtotal + shippingCost - discount + tax;

  // Reserve stock before creating the order. The checks above are only a fast
  // path for friendly errors; reserveStock is what prevents overselling when
  // several orders for the same item are placed concurrently.
  const reserved = await reserveStock(orderItems);

  let order: IOrder;
  try {
    order = await Order.create({
      user: userId,
      items: orderItems,
      shippingAddress,
      payment: {
        method: paymentMethod,
        status: "pending",
      },
      pricing: {
        subtotal,
        shippingCost,
        discount,
        tax,
        total,
      },
      customerNotes,
      statusHistory: [
        {
          status: "pending",
          note: "Order placed",
        },
      ],
    });
  } catch (error) {
    await releaseStock(reserved);
    throw error;
  }

  // Clear cart only for COD (immediate checkout)
  // For online payments, cart is cleared after successful payment callback
  if (paymentMethod === "cod") {
    await (cart as any).clear();
  }

  return order;
};

interface StockItem {
  product: any;
  variantId?: any;
  name: string;
  quantity: number;
}

/**
 * Atomically decrement stock for each item. Each update only matches when
 * enough stock remains, so concurrent orders cannot drive stock negative.
 * If any item cannot be reserved, items reserved so far are released.
 */
const reserveStock = async (items: StockItem[]): Promise<StockItem[]> => {
  const reserved: StockItem[] = [];

  for (const item of items) {
    const filter: any = item.variantId
      ? {
          _id: item.product,
          isActive: true,
          variants: {
            $elemMatch: { _id: item.variantId, stock: { $gte: item.quantity } },
          },
        }
      : { _id: item.product, isActive: true, stock: { $gte: item.quantity } };

    // Variant orders also move the product total, which mirrors the variants' sum
    const inc: Record<string, number> = item.variantId
      ? { "variants.$.stock": -item.quantity, stock: -item.quantity }
      : { stock: -item.quantity };

    const result = await Product.updateOne(filter, {
      $inc: { ...inc, soldCount: item.quantity },
    });

    if (result.modifiedCount !== 1) {
      await releaseStock(reserved);
      throw new AppError(
        `Insufficient stock for ${item.name}. Please update your cart.`,
        400,
      );
    }

    reserved.push(item);
  }

  return reserved;
};

/**
 * Return stock reserved by reserveStock (used when order creation fails)
 */
const releaseStock = async (items: StockItem[]): Promise<void> => {
  if (items.length === 0) return;

  await Product.bulkWrite(
    items.map((item) => ({
      updateOne: {
        filter: item.variantId
          ? { _id: item.product, "variants._id": item.variantId }
          : { _id: item.product },
        update: {
          $inc: {
            ...(item.variantId
              ? { "variants.$.stock": item.quantity, stock: item.quantity }
              : { stock: item.quantity }),
            soldCount: -item.quantity,
          },
        },
      },
    })),
  );
};

const toStockItems = (order: IOrder): StockItem[] =>
  (order as any).items.map((item: any) => ({
    product: item.product,
    variantId: item.variantId || undefined,
    name: item.name,
    quantity: item.quantity,
  }));

/** Return an order's stock (cancelled orders) */
const releaseOrderStock = (order: IOrder): Promise<void> => releaseStock(toStockItems(order));

/** Reserve an order's stock again (late payment for an order that was cancelled) */
const reserveOrderStock = async (order: IOrder): Promise<void> => {
  await reserveStock(toStockItems(order));
};

const ONLINE_METHODS = ["esewa", "khalti"];

/**
 * Cancel pending, unpaid eSewa/Khalti orders matching `filter` and release their stock.
 * Each order is cancelled with a conditional update, so an order that gets paid
 * (or cancelled elsewhere) at the same moment is left alone and stock is never
 * released twice. Returns the number of orders cancelled.
 */
const cancelUnpaidOnlineOrders = async (
  filter: Record<string, unknown>,
  reason: string,
): Promise<number> => {
  const candidates = await Order.find({
    ...filter,
    status: "pending",
    "payment.method": { $in: ONLINE_METHODS },
    "payment.status": { $ne: "paid" },
  });

  let cancelled = 0;
  for (const order of candidates) {
    const now = new Date();
    const result = await Order.updateOne(
      { _id: order._id, status: "pending", "payment.status": { $ne: "paid" } },
      {
        $set: { status: "cancelled", cancelledAt: now, cancellationReason: reason },
        $push: { statusHistory: { status: "cancelled", note: reason, changedAt: now } },
      },
    );
    if (result.modifiedCount !== 1) continue;

    await releaseOrderStock(order);
    await Payment.updateMany(
      { order: order._id, status: { $in: ["initiated", "pending"] } },
      { $set: { status: "cancelled", failureReason: reason } },
    );
    cancelled++;
  }
  return cancelled;
};

/**
 * Cancel online-payment orders that stayed unpaid longer than the payment window
 * (abandoned or failed eSewa/Khalti checkouts), returning their stock to the shop.
 */
const expireUnpaidOrders = (maxAgeMinutes: number): Promise<number> =>
  cancelUnpaidOnlineOrders(
    { createdAt: { $lt: new Date(Date.now() - maxAgeMinutes * 60 * 1000) } },
    "Payment was not completed in time",
  );

/**
 * Calculate shipping cost based on location
 */
const calculateShippingCost = (
  address: ShippingAddress,
  subtotal: number,
): number => {
  // Free shipping for orders over NPR 5000
  if (subtotal >= 5000) return 0;

  // Kathmandu Valley (province 3): NPR 100. Keep in sync with
  // calculateShippingCost in frontend/src/utils/helpers.ts (checkout preview).
  if (
    address.province === 3 &&
    ["kathmandu", "lalitpur", "bhaktapur"].includes(
      String(address.district || "").trim().toLowerCase(),
    )
  ) {
    return 100;
  }

  // Other areas: NPR 150-300 based on province
  const shippingRates: Record<number, number> = {
    1: 250, // Province 1 (Eastern)
    2: 250, // Madhesh
    3: 150, // Bagmati
    4: 200, // Gandaki
    5: 250, // Lumbini
    6: 300, // Karnali
    7: 300, // Sudurpashchim
  };

  return shippingRates[address.province] || 200;
};

/**
 * Get user's orders
 */
const getUserOrders = async (
  userId: string,
  options: GetOrdersOptions = {},
): Promise<OrdersResult> => {
  const { page = 1, limit = 10, status } = options;

  const filter: any = { user: userId };
  if (status) filter.status = status;

  const total = await Order.countDocuments(filter);
  const pagination = paginate(page, limit, total);

  const orders = await Order.find(filter)
    .sort({ createdAt: -1 })
    .skip(pagination.skip)
    .limit(pagination.itemsPerPage)
    .select("-statusHistory");

  return { orders, pagination };
};

/**
 * Get order details
 */
const getOrderById = async (
  orderId: string,
  userId: string | null = null,
): Promise<IOrder> => {
  const filter: any = { _id: orderId };
  if (userId) filter.user = userId; // Ensure user owns the order

  const order = await Order.findOne(filter).populate(
    "user",
    "name email phone",
  );
  if (!order) {
    throw new AppError("Order not found", 404);
  }

  return order;
};

/**
 * Cancel order
 */
const cancelOrder = async (
  orderId: string,
  userId: string,
  reason: string,
): Promise<IOrder> => {
  const order = await Order.findOne({ _id: orderId, user: userId });
  if (!order) {
    throw new AppError("Order not found", 404);
  }

  if (!(order as any).canBeCancelled) {
    throw new AppError("Order cannot be cancelled at this stage", 400);
  }

  // Refunds for eSewa/Khalti are handled manually, so paid online orders are
  // cancelled by the shop, not by the customer
  if (order.payment.status === "paid" && order.payment.method !== "cod") {
    throw new AppError(
      "This order is already paid. Please contact us to cancel it and arrange a refund.",
      400,
    );
  }

  await (order as any).updateOrderStatus("cancelled", userId, reason);
  await releaseOrderStock(order);
  await Payment.updateMany(
    { order: order._id, status: { $in: ["initiated", "pending"] } },
    { $set: { status: "cancelled", failureReason: reason } },
  );

  return order;
};


/**
 * Get all orders (Admin)
 */
const getAllOrders = async (
  options: GetOrdersOptions = {},
): Promise<OrdersResult> => {
  const { page = 1, limit = 20 } = options;

  const filter = await buildAdminOrderFilter(options);

  const total = await Order.countDocuments(filter);
  const pagination = paginate(page, limit, total);

  const orders = await Order.find(filter)
    .sort({ createdAt: -1 })
    .skip(pagination.skip)
    .limit(pagination.itemsPerPage)
    .populate("user", "name email phone");

  return { orders, pagination };
};

/**
 * Update order status (Admin)
 */
const updateOrderStatus = async (
  orderId: string,
  status: string,
  adminId: string,
  note: string,
): Promise<IOrder> => {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new AppError("Order not found", 404);
  }

  await (order as any).updateOrderStatus(status, adminId, note);

  if (status === "cancelled") {
    await releaseOrderStock(order);
  }

  // Send push notification to user about status change
  try {
    await sendOrderStatusNotification(
      (order as any).user.toString(),
      orderId,
      status,
      (order as any).orderNumber,
    );
  } catch (error) {
    // Don't fail the order update if notification fails
    console.error("Failed to send order status notification:", error);
  }

  return order;
};

interface BulkStatusResult {
  updated: { _id: string; orderNumber: string }[];
  failed: { _id: string; orderNumber?: string; message: string }[];
}

/**
 * Change the status of several orders. Each order goes through
 * updateOrderStatus, so transition rules, stock release and notifications
 * are the same as for a single update; one failure doesn't stop the rest.
 */
const bulkUpdateOrderStatus = async (
  orderIds: string[],
  status: string,
  adminId: string,
  note: string = "",
): Promise<BulkStatusResult> => {
  const result: BulkStatusResult = { updated: [], failed: [] };

  for (const id of [...new Set(orderIds)]) {
    try {
      const order = await updateOrderStatus(id, status, adminId, note);
      result.updated.push({ _id: id, orderNumber: (order as any).orderNumber });
    } catch (error) {
      const existing = await Order.findById(id).select("orderNumber").lean();
      result.failed.push({
        _id: id,
        orderNumber: (existing as any)?.orderNumber,
        message: error instanceof Error ? error.message : "Update failed",
      });
    }
  }

  return result;
};

export {
  bulkUpdateOrderStatus,
  createOrder,
  getUserOrders,
  getOrderById,
  cancelOrder,
  expireUnpaidOrders,
  releaseOrderStock,
  reserveOrderStock,
  getAllOrders,
  updateOrderStatus,
};
