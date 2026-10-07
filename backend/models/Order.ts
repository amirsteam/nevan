import mongoose, { Schema, Document, Model, Types } from "mongoose";
import { generateOrderNumber } from "../utils/helpers";
import AppError from "../utils/AppError";

export interface IOrderItem {
  product: Types.ObjectId;
  variantId?: Types.ObjectId | null;
  name: string;
  slug?: string;
  image?: string;
  price: number;
  // Price before a campaign sale (absent on orders without one)
  originalPrice?: number;
  campaign?: Types.ObjectId | null;
  quantity: number;
  variant?: {
    size?: string;
    color?: string;
  };
  subtotal: number;
}

export interface IShippingAddress {
  name: string;
  phone: string;
  street: string;
  city: string;
  district: string;
  province: number;
  landmark?: string;
}

export interface IStatusHistory {
  status: string;
  changedAt: Date;
  changedBy?: Types.ObjectId;
  note?: string;
}

export interface IOrderMethods {
  updateOrderStatus(
    newStatus: string,
    userId: string | Types.ObjectId,
    note?: string,
  ): Promise<IOrder>;
  markPaymentComplete(transactionId: string): Promise<IOrder>;
}

export interface IOrder extends Document, IOrderMethods {
  orderNumber: string;
  user: Types.ObjectId;
  items: IOrderItem[];
  shippingAddress: IShippingAddress;
  payment: {
    method: "cod" | "esewa" | "khalti" | "stripe";
    status: "pending" | "paid" | "failed" | "refunded";
    transactionId?: string;
    paidAt?: Date;
  };
  pricing: {
    subtotal: number;
    shippingCost: number;
    discount: number;
    // Saved by campaign sale prices (already reflected in subtotal)
    savings?: number;
    tax: number;
    total: number;
  };
  status:
    | "pending"
    | "confirmed"
    | "processing"
    | "shipped"
    | "delivered"
    | "cancelled";
  statusHistory: IStatusHistory[];
  notes?: string;
  customerNotes?: string;
  deliveredAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  canBeCancelled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface IOrderModel extends Model<IOrder> {
  getDashboardStats(): Promise<any>;
  getUserOrders(userId: string | Types.ObjectId, options?: any): any;
}

const orderItemSchema = new Schema<IOrderItem>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    variantId: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    name: {
      type: String,
      required: true,
    },
    slug: String,
    image: String,
    price: {
      type: Number,
      required: true,
    },
    originalPrice: Number,
    campaign: {
      type: Schema.Types.ObjectId,
      ref: "Campaign",
      default: undefined,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    variant: {
      size: String,
      color: String,
    },
    subtotal: {
      type: Number,
      required: true,
    },
  },
  { _id: true },
);

const shippingAddressSchema = new Schema<IShippingAddress>(
  {
    name: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    street: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    district: {
      type: String,
      required: true,
    },
    province: {
      type: Number,
      required: true,
      min: 1,
      max: 7,
    },
    landmark: String,
  },
  { _id: false },
);

const statusHistorySchema = new Schema<IStatusHistory>(
  {
    status: {
      type: String,
      required: true,
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
    changedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    note: String,
  },
  { _id: true },
);

const orderSchema = new Schema<IOrder, IOrderModel>(
  {
    orderNumber: {
      type: String,
      unique: true,
      required: true,
      default: generateOrderNumber,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: {
      type: [orderItemSchema],
      validate: {
        validator: function (v: IOrderItem[]) {
          return v.length > 0;
        },
        message: "Order must have at least one item",
      },
    },
    shippingAddress: {
      type: shippingAddressSchema,
      required: true,
    },
    payment: {
      method: {
        type: String,
        enum: ["cod", "esewa", "khalti", "stripe"],
        required: true,
      },
      status: {
        type: String,
        enum: ["pending", "paid", "failed", "refunded"],
        default: "pending",
      },
      transactionId: String,
      paidAt: Date,
    },
    pricing: {
      subtotal: {
        type: Number,
        required: true,
      },
      shippingCost: {
        type: Number,
        default: 0,
      },
      discount: {
        type: Number,
        default: 0,
      },
      savings: {
        type: Number,
        default: 0,
      },
      tax: {
        type: Number,
        default: 0,
      },
      total: {
        type: Number,
        required: true,
      },
    },
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ],
      default: "pending",
    },
    statusHistory: [statusHistorySchema],
    notes: String,
    customerNotes: String,
    deliveredAt: Date,
    cancelledAt: Date,
    cancellationReason: String,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes
orderSchema.index({ "items.campaign": 1 }, { sparse: true });
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ "payment.status": 1 });
orderSchema.index({ createdAt: -1 });

// Virtuals
orderSchema.virtual("canBeCancelled").get(function (this: IOrder) {
  return ["pending", "confirmed"].includes(this.status);
});

// Expose flat pricing properties for convenience
orderSchema.virtual("subtotal").get(function (this: IOrder) {
  return this.pricing?.subtotal ?? 0;
});

orderSchema.virtual("shippingCost").get(function (this: IOrder) {
  return this.pricing?.shippingCost ?? 0;
});

orderSchema.virtual("discount").get(function (this: IOrder) {
  return this.pricing?.discount ?? 0;
});

orderSchema.virtual("total").get(function (this: IOrder) {
  return this.pricing?.total ?? 0;
});

// Instance methods
orderSchema.methods.updateOrderStatus = async function (
  this: IOrder,
  newStatus: string,
  userId: string | Types.ObjectId,
  note: string = "",
) {
  const validTransitions: Record<string, string[]> = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["processing", "cancelled"],
    processing: ["shipped", "cancelled"],
    shipped: ["delivered"],
    delivered: [],
    cancelled: [],
  };

  if (!validTransitions[this.status].includes(newStatus)) {
    throw new AppError(`Cannot change order status from ${this.status} to ${newStatus}`, 400);
  }

  this.status = newStatus as any;
  this.statusHistory.push({
    status: newStatus,
    changedBy: userId as any,
    note,
    changedAt: new Date(),
  });

  if (newStatus === "delivered") {
    this.deliveredAt = new Date();
    if (this.payment.method === "cod") {
      this.payment.status = "paid";
      this.payment.paidAt = new Date();
    }
  }

  if (newStatus === "cancelled") {
    this.cancelledAt = new Date();
    this.cancellationReason = note;
  }

  await this.save();
  return this;
};

orderSchema.methods.markPaymentComplete = async function (
  this: IOrder,
  transactionId: string,
) {
  this.payment.status = "paid";
  this.payment.paidAt = new Date();
  this.payment.transactionId = transactionId;

  if (this.status === "pending") {
    this.status = "confirmed";
    this.statusHistory.push({
      status: "confirmed",
      note: "Auto-confirmed after payment",
      changedAt: new Date(),
    });
  }

  await this.save();
  return this;
};

// Statics
orderSchema.statics.getDashboardStats = async function () {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totalOrders, todayOrders, pendingOrders, revenue] = await Promise.all([
    this.countDocuments(),
    this.countDocuments({ createdAt: { $gte: today } }),
    this.countDocuments({ status: "pending" }),
    this.aggregate([
      {
        $match: {
          status: { $in: ["confirmed", "processing", "shipped", "delivered"] },
        },
      },
      { $group: { _id: null, total: { $sum: "$pricing.total" } } },
    ]),
  ]);

  // Last 7 days (Nepal time) of revenue/orders, counted the same way as totalRevenue
  const TIMEZONE = "Asia/Kathmandu";
  const DAYS = 7;
  const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000);
  const [byStatus, byDay] = await Promise.all([
    this.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    this.aggregate([
      {
        $match: {
          createdAt: { $gte: since },
          status: { $in: ["confirmed", "processing", "shipped", "delivered"] },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: TIMEZONE },
          },
          revenue: { $sum: "$pricing.total" },
          orders: { $sum: 1 },
        },
      },
    ]),
  ]);

  const ordersByStatus: Record<string, number> = {};
  for (const row of byStatus) ordersByStatus[row._id] = row.count;

  // One entry per day, oldest first, including days without sales
  const dayFormat = new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE });
  const totalsByDay = new Map<string, { revenue: number; orders: number }>(
    byDay.map((row: any) => [row._id, { revenue: row.revenue, orders: row.orders }]),
  );
  const salesByDay = Array.from({ length: DAYS }, (_, i) => {
    const date = dayFormat.format(new Date(Date.now() - (DAYS - 1 - i) * 24 * 60 * 60 * 1000));
    return { date, ...(totalsByDay.get(date) || { revenue: 0, orders: 0 }) };
  });

  return {
    totalOrders,
    todayOrders,
    pendingOrders,
    totalRevenue: revenue[0]?.total || 0,
    ordersByStatus,
    salesByDay,
  };
};

orderSchema.statics.getUserOrders = function (
  userId: string | Types.ObjectId,
  options: any = {},
) {
  const { limit = 10, page = 1, status } = options;

  const query: any = { user: userId };
  if (status) query.status = status;

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .select("-statusHistory");
};

const Order = mongoose.model<IOrder, IOrderModel>("Order", orderSchema);

export default Order;
