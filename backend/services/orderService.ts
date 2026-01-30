/**
 * Order Service
 * Handles order business logic
 */
import Order, { IOrder } from "../models/Order";
import Cart from "../models/Cart";
import Product from "../models/Product";
import { PaymentService } from "./payment";
import { paginate, PaginationResult } from "../utils/helpers";
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
}

/**
 * Create order from cart
 */
const createOrder = async (
  userId: string,
  orderData: OrderData,
): Promise<IOrder> => {
  const { shippingAddress, paymentMethod, customerNotes } = orderData;

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

  // Create order
  const order = await Order.create({
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

  // Reduce stock using bulkWrite for better performance (avoids N+1 queries)
  const stockUpdates = (cart as any).items.map((item: any) => {
    const productId = item.product._id || item.product;
    if (item.variantId) {
      // Update variant stock
      return {
        updateOne: {
          filter: { _id: productId, "variants._id": item.variantId },
          update: {
            $inc: {
              "variants.$.stock": -item.quantity,
              soldCount: item.quantity,
            },
          },
        },
      };
    } else {
      // Update base product stock
      return {
        updateOne: {
          filter: { _id: productId },
          update: {
            $inc: {
              stock: -item.quantity,
              soldCount: item.quantity,
            },
          },
        },
      };
    }
  });

  if (stockUpdates.length > 0) {
    await Product.bulkWrite(stockUpdates);
  }

  // Clear cart only for COD (immediate checkout)
  // For online payments, cart is cleared after successful payment callback
  if (paymentMethod === "cod") {
    await (cart as any).clear();
  }

  return order;
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

  // Kathmandu Valley (provinces 3): NPR 100
  if (
    address.province === 3 &&
    ["Kathmandu", "Lalitpur", "Bhaktapur"].includes(address.district)
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

  await (order as any).updateOrderStatus("cancelled", userId, reason);

  // Restore stock using bulkWrite for better performance (avoids N+1 queries)
  const stockRestoreUpdates = (order as any).items.map((item: any) => {
    if (item.variantId) {
      // Restore variant stock
      return {
        updateOne: {
          filter: { _id: item.product, "variants._id": item.variantId },
          update: {
            $inc: {
              "variants.$.stock": item.quantity,
              soldCount: -item.quantity,
            },
          },
        },
      };
    } else {
      // Restore base product stock
      return {
        updateOne: {
          filter: { _id: item.product },
          update: {
            $inc: {
              stock: item.quantity,
              soldCount: -item.quantity,
            },
          },
        },
      };
    }
  });

  if (stockRestoreUpdates.length > 0) {
    await Product.bulkWrite(stockRestoreUpdates);
  }

  return order;
};

/**
 * Get all orders (Admin)
 */
const getAllOrders = async (
  options: GetOrdersOptions = {},
): Promise<OrdersResult> => {
  const { page = 1, limit = 20, status, paymentStatus } = options;

  const filter: any = {};
  if (status) filter.status = status;
  if (paymentStatus) filter["payment.status"] = paymentStatus;

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

export {
  createOrder,
  getUserOrders,
  getOrderById,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
};
