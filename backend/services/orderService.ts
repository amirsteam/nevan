/**
 * Order Service
 * Handles order business logic
 */
import { Types } from "mongoose";
import Order, { IOrder, ORDER_TRANSITIONS } from "../models/Order";
import Payment from "../models/Payment";
import Cart from "../models/Cart";
import Product from "../models/Product";
import User from "../models/User";
import { paginate, PaginationResult, escapeRegex } from "../utils/helpers";
import AppError from "../utils/AppError";
import { sendOrderStatusNotification } from "./pushNotificationService";
import { getLiveCampaign } from "./campaignService";
import { priceFor } from "../utils/campaignPricing";

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

/**
 * Orders holding money the shop has to give back by hand: paid but cancelled
 * (payment arrived too late, or cancelled by the shop), or paid twice.
 */
const REFUND_REQUIRED_FILTER = {
  $or: [{ status: "cancelled", "payment.status": "paid" }, { "payment.refundRequired": true }],
};

/** Mongo filter for the admin order list; unknown values are ignored */
const buildAdminOrderFilter = async (options: GetOrdersOptions): Promise<Record<string, unknown>> => {
  const { status, paymentStatus, paymentMethod, search, refundRequired } = options;
  const filter: Record<string, unknown> = {};
  const and: Record<string, unknown>[] = [];

  if (typeof status === "string" && ORDER_STATUSES.includes(status)) filter.status = status;
  if (typeof paymentStatus === "string" && PAYMENT_STATUSES.includes(paymentStatus)) {
    filter["payment.status"] = paymentStatus;
  }
  if (typeof paymentMethod === "string" && PAYMENT_METHODS.includes(paymentMethod)) {
    filter["payment.method"] = paymentMethod;
  }
  if (refundRequired === true || refundRequired === "true") {
    and.push(REFUND_REQUIRED_FILTER);
  }

  if (typeof search === "string" && search.trim()) {
    const pattern = new RegExp(escapeRegex(search.trim().slice(0, 100)), "i");
    const users = await User.find({ $or: [{ email: pattern }, { name: pattern }] })
      .limit(200)
      .distinct("_id");
    and.push({
      $or: [
        { orderNumber: pattern },
        { "shippingAddress.name": pattern },
        { "shippingAddress.phone": pattern },
        ...(users.length ? [{ user: { $in: users } }] : []),
      ],
    });
  }

  if (and.length) filter.$and = and;
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
    select: "name slug price images stock variants isActive category",
  });

  if (!cart || (cart as any).items.length === 0) {
    throw new AppError("Cart is empty", 400);
  }

  // Campaign sale prices apply to orders placed while the campaign is live;
  // the order total is fixed here, so a sale ending mid-payment can't change it
  const campaign = (await getLiveCampaign())?.pricing ?? null;

  // Validate products and build order items
  const orderItems: any[] = [];
  let subtotal = 0;
  let savings = 0;

  for (const item of (cart as any).items) {
    const product = item.product;

    if (!product || !product.isActive) {
      throw new AppError(
        `Product "${item.product?.name || "Unknown"}" is no longer available`,
        400,
      );
    }

    let variantSnapshot: any = null;
    let variantDoc: any = null;
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

      variantDoc = variant;
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
    }

    const { price: itemPrice, originalPrice, campaignId } = priceFor(product, variantDoc, campaign);
    const itemSubtotal = itemPrice * item.quantity;
    subtotal += itemSubtotal;
    savings += (originalPrice - itemPrice) * item.quantity;

    orderItems.push({
      product: product._id,
      variantId: item.variantId || null,
      name: product.name,
      slug: product.slug,
      image: variantImage || product.images[0]?.url,
      price: itemPrice,
      ...(campaignId ? { originalPrice, campaign: campaignId } : {}),
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
        savings,
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
    // Cash is collected on delivery; record the payment here so placing a COD
    // order is a single request (the order stands even if this record fails)
    await Payment.create({
      order: order._id,
      user: userId,
      gateway: "cod",
      amount: total,
      status: "pending",
      gatewayResponse: { referenceId: `COD-${order.orderNumber}` },
    }).catch((error) => console.error(`Failed to record COD payment for ${order.orderNumber}:`, error));
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

// An eSewa/Khalti order whose money hasn't arrived (yet)
const UNPAID_ONLINE = { "payment.method": { $in: ONLINE_METHODS }, "payment.status": { $ne: "paid" } };

interface CancelOptions {
  // Statuses the order may be cancelled from
  from: string[];
  // Further conditions the order must still meet at the moment of cancelling
  filter?: Record<string, unknown>;
  by?: string | Types.ObjectId;
  reason: string;
}

/**
 * Cancel an order exactly once and return its stock. The cancellation is a single
 * conditional update, so concurrent cancellations (customer, admin, payment
 * expiry) can't release the stock twice, and a payment landing at the same moment
 * isn't overwritten. Returns the cancelled order, or null when it no longer
 * matched (already cancelled, shipped, paid meanwhile...).
 *
 * eSewa/Khalti attempts that reached the gateway stay open: PaymentService keeps
 * checking them, so money that still arrives reopens the order or flags a refund.
 */
const cancelOrderOnce = async (
  orderId: string | Types.ObjectId,
  { from, filter = {}, by, reason }: CancelOptions,
): Promise<IOrder | null> => {
  const now = new Date();
  const order = await Order.findOneAndUpdate(
    { _id: orderId, status: { $in: from }, ...filter },
    {
      $set: { status: "cancelled", cancelledAt: now, cancellationReason: reason },
      $push: {
        statusHistory: { status: "cancelled", note: reason, changedAt: now, ...(by ? { changedBy: by } : {}) },
      },
    },
    { new: true },
  );
  if (!order) return null;

  await releaseOrderStock(order);
  await Payment.updateMany(
    {
      order: order._id,
      status: { $in: ["initiated", "pending"] },
      $or: [{ gateway: "cod" }, { "gatewayResponse.referenceId": { $in: [null, ""] } }],
    },
    { $set: { status: "cancelled", failureReason: reason } },
  );
  return order;
};

/**
 * Cancel pending, unpaid eSewa/Khalti orders matching `filter` and release their
 * stock (each exactly once, see cancelOrderOnce). Returns how many were cancelled.
 */
const cancelUnpaidOnlineOrders = async (
  filter: Record<string, unknown>,
  reason: string,
): Promise<number> => {
  const candidates = await Order.find({ ...filter, status: "pending", ...UNPAID_ONLINE }).select("_id");

  let cancelled = 0;
  for (const { _id } of candidates) {
    if (await cancelOrderOnce(_id, { from: ["pending"], filter: UNPAID_ONLINE, reason })) cancelled++;
  }
  return cancelled;
};

/**
 * Cancel online-payment orders that stayed unpaid longer than the payment window
 * (abandoned or failed eSewa/Khalti checkouts), returning their stock to the shop.
 * The window counts from the latest payment attempt, so a retry isn't cut off
 * while the shopper is on the gateway's page. `keep` may spare an order:
 * PaymentService first asks the gateway whether it was paid after all.
 */
const expireUnpaidOrders = async (
  maxAgeMinutes: number,
  keep?: (order: IOrder) => Promise<boolean>,
): Promise<number> => {
  const cutoff = new Date(Date.now() - maxAgeMinutes * 60 * 1000);
  const candidates = await Order.find({ createdAt: { $lt: cutoff }, status: "pending", ...UNPAID_ONLINE });

  let cancelled = 0;
  for (const order of candidates) {
    if (await Payment.exists({ order: order._id, initiatedAt: { $gte: cutoff } })) continue;
    if (keep) {
      try {
        if (await keep(order)) continue;
      } catch (error) {
        // Not sure whether it was paid: leave it for the next run
        console.error(`Could not check payment for order ${order.orderNumber}:`, error);
        continue;
      }
    }
    const done = await cancelOrderOnce(order._id, {
      from: ["pending"],
      filter: UNPAID_ONLINE,
      reason: "Payment was not completed in time",
    });
    if (done) cancelled++;
  }
  return cancelled;
};

/** What claimPayment did with a verified payment */
type PaymentClaim =
  | "paid" // pending (or already confirmed by the shop) → paid
  | "reopened" // had been cancelled, stock taken again → paid and confirmed
  | "refund_required" // had been cancelled and the stock is gone → stays cancelled, paid
  | "already_paid"; // another payment got there first

/**
 * Record a verified online payment on its order — exactly once. The payment is
 * claimed with one conditional update, so concurrent confirmations (gateway
 * redirect, the shopper's verify call, reconciliation) and the expiry job can't
 * act on stale copies: whichever update lands first wins and the other sees it.
 */
const claimPayment = async (
  orderId: string | Types.ObjectId,
  transactionId: string,
): Promise<{ outcome: PaymentClaim; order: IOrder | null }> => {
  const now = new Date();
  const before = await Order.findOneAndUpdate(
    { _id: orderId, "payment.status": { $ne: "paid" } },
    { $set: { "payment.status": "paid", "payment.paidAt": now, "payment.transactionId": transactionId } },
    { new: false },
  );
  if (!before) return { outcome: "already_paid", order: await Order.findById(orderId) };

  if (before.status === "cancelled") {
    // Paid after the order was cancelled (payment window expired or the order was
    // replaced): reopen it if the stock is still there, else keep the money on
    // record and flag the order for a refund
    try {
      await reserveOrderStock(before);
    } catch {
      const order = await Order.findByIdAndUpdate(
        orderId,
        {
          $push: {
            statusHistory: {
              status: "cancelled",
              note: "Payment received after cancellation and items are out of stock - refund required",
              changedAt: now,
            },
          },
        },
        { new: true },
      );
      console.warn(`⚠️ Order ${before.orderNumber} paid after cancellation; refund required`);
      return { outcome: "refund_required", order };
    }

    // Cancelled is final for everyone else, so this always matches
    const order = await Order.findOneAndUpdate(
      { _id: orderId, status: "cancelled" },
      {
        $set: { status: "confirmed" },
        $unset: { cancelledAt: 1, cancellationReason: 1 },
        $push: {
          statusHistory: {
            $each: [
              { status: "pending", note: "Reopened: payment arrived after the order was cancelled", changedAt: now },
              { status: "confirmed", note: "Auto-confirmed after payment", changedAt: now },
            ],
          },
        },
      },
      { new: true },
    );
    return { outcome: "reopened", order };
  }

  if (before.status === "pending") {
    // Conditional: the shop may have confirmed it meanwhile
    await Order.updateOne(
      { _id: orderId, status: "pending" },
      {
        $set: { status: "confirmed" },
        $push: { statusHistory: { status: "confirmed", note: "Auto-confirmed after payment", changedAt: now } },
      },
    );
  }
  return { outcome: "paid", order: await Order.findById(orderId) };
};

/**
 * A second payment arrived for an order that was already paid (two tabs, or a
 * retry after an unconfirmed payment): keep the order, flag the money for a refund.
 */
const flagDuplicatePayment = async (order: IOrder, transactionId: string): Promise<void> => {
  await Order.updateOne(
    { _id: order._id },
    {
      $set: { "payment.refundRequired": true },
      $push: {
        statusHistory: {
          status: order.status,
          note: `Second payment ${transactionId} received for an already paid order - refund required`,
          changedAt: new Date(),
        },
      },
    },
  );
  console.warn(`⚠️ Order ${order.orderNumber} was paid twice (${transactionId}); refund required`);
};

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
  const paidOnlineMessage = "This order is already paid. Please contact us to cancel it and arrange a refund.";
  if (order.payment.status === "paid" && order.payment.method !== "cod") {
    throw new AppError(paidOnlineMessage, 400);
  }

  const cancelled = await cancelOrderOnce(order._id, {
    from: ["pending", "confirmed"],
    // A payment landing meanwhile turns it into a paid online order
    filter: { $or: [{ "payment.method": "cod" }, { "payment.status": { $ne: "paid" } }] },
    by: userId,
    reason,
  });
  if (!cancelled) {
    const current = await Order.findById(order._id).select("payment status");
    throw new AppError(
      current?.payment.status === "paid" && current.payment.method !== "cod"
        ? paidOnlineMessage
        : "Order cannot be cancelled at this stage",
      400,
    );
  }

  return cancelled;
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
  let order: IOrder | null = await Order.findById(orderId);
  if (!order) {
    throw new AppError("Order not found", 404);
  }

  if (status === "cancelled") {
    const from = Object.keys(ORDER_TRANSITIONS).filter((s) => ORDER_TRANSITIONS[s].includes("cancelled"));
    if (!from.includes(order.status)) {
      throw new AppError(`Cannot change order status from ${order.status} to cancelled`, 400);
    }
    order = await cancelOrderOnce(order._id, { from, by: adminId, reason: note });
    if (!order) {
      throw new AppError("This order was just updated by someone else. Please refresh and try again.", 409);
    }
  } else {
    await (order as any).updateOrderStatus(status, adminId, note);
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
  REFUND_REQUIRED_FILTER,
  bulkUpdateOrderStatus,
  createOrder,
  getUserOrders,
  getOrderById,
  cancelOrder,
  claimPayment,
  expireUnpaidOrders,
  flagDuplicatePayment,
  releaseOrderStock,
  reserveOrderStock,
  getAllOrders,
  updateOrderStatus,
};
