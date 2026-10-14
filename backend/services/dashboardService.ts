/**
 * Admin dashboard and navigation badges. Every "needs attention" count uses
 * the same filter as the list it links to (ORDER_QUEUE_FILTERS, the stock
 * filters), and revenue periods follow Nepal time.
 */
import Order from "../models/Order";
import User from "../models/User";
import Product from "../models/Product";
import ContactMessage from "../models/ContactMessage";
import { LOW_STOCK_THRESHOLD } from "../utils/constants";
import { LOW_STOCK_FILTER, SOLD_OUT_FILTER } from "../utils/stockFilters";
import { ORDER_QUEUE_FILTERS, REFUND_REQUIRED_FILTER } from "./orderService";
import { DAY_MS, nepalDayStart, nepalMonthStart } from "../utils/nepalTime";

/** Orders that count as sales (placed and not cancelled; COD counts once confirmed) */
export const REVENUE_STATUSES = ["confirmed", "processing", "shipped", "delivered"];

export interface PeriodTotals {
  /** Order totals, shipping included */
  sales: number;
  /** Products only (subtotal after sale prices) */
  products: number;
  shipping: number;
  orders: number;
}

export interface PeriodComparison {
  current: PeriodTotals;
  /** The same length of time just before (today vs yesterday up to now, etc.) */
  previous: PeriodTotals;
}

const EMPTY_TOTALS: PeriodTotals = { sales: 0, products: 0, shipping: 0, orders: 0 };

/** Sales for today, this month and the last 30 days, each against the period before */
const getRevenueSummary = async (now = new Date()) => {
  const today = nepalDayStart(now);
  const month = nepalMonthStart(now);
  const lastMonth = nepalMonthStart(now, 1);
  const sinceMonthStart = now.getTime() - month.getTime();
  const ranges: Record<string, [Date, Date]> = {
    today: [today, now],
    yesterday: [new Date(today.getTime() - DAY_MS), new Date(now.getTime() - DAY_MS)],
    month: [month, now],
    // Last month up to the same point (capped at its end)
    lastMonth: [lastMonth, new Date(Math.min(lastMonth.getTime() + sinceMonthStart, month.getTime()))],
    last30: [new Date(now.getTime() - 30 * DAY_MS), now],
    previous30: [new Date(now.getTime() - 60 * DAY_MS), new Date(now.getTime() - 30 * DAY_MS)],
  };
  const earliest = new Date(Math.min(...Object.values(ranges).map(([from]) => from.getTime())));

  const group = {
    _id: null,
    sales: { $sum: "$pricing.total" },
    products: { $sum: "$pricing.subtotal" },
    shipping: { $sum: "$pricing.shippingCost" },
    orders: { $sum: 1 },
  };
  const [facets] = await Order.aggregate([
    { $match: { createdAt: { $gte: earliest, $lt: now }, status: { $in: REVENUE_STATUSES } } },
    {
      $facet: Object.fromEntries(
        Object.entries(ranges).map(([key, [from, to]]) => [
          key,
          [{ $match: { createdAt: { $gte: from, $lt: to } } }, { $group: group }],
        ]),
      ),
    },
  ]);
  const totals = (key: string): PeriodTotals => {
    const row = facets?.[key]?.[0];
    return row ? { sales: row.sales, products: row.products, shipping: row.shipping, orders: row.orders } : { ...EMPTY_TOTALS };
  };
  return {
    today: { current: totals("today"), previous: totals("yesterday") },
    month: { current: totals("month"), previous: totals("lastMonth") },
    last30: { current: totals("last30"), previous: totals("previous30") },
  } satisfies Record<string, PeriodComparison>;
};

/** COD orders on their way whose cash isn't marked collected yet */
const getCashToCollect = async () => {
  const [row] = await Order.aggregate([
    { $match: ORDER_QUEUE_FILTERS.collect },
    { $group: { _id: null, amount: { $sum: "$pricing.total" }, orders: { $sum: 1 } } },
  ]);
  return { amount: row?.amount || 0, orders: row?.orders || 0 };
};

export const getDashboard = async () => {
  const since30Days = new Date(Date.now() - 30 * DAY_MS);
  const [
    orderStats,
    userCount,
    productCount,
    recentOrders,
    lowStockProducts,
    lowStockCount,
    soldOutCount,
    refundRequired,
    toConfirm,
    awaitingPayment,
    toShip,
    topProducts,
    unreadMessages,
    revenue,
    cashToCollect,
  ] = await Promise.all([
    (Order as any).getDashboardStats(),
    User.countDocuments({ isActive: true }),
    Product.countDocuments({ isActive: true }),
    Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("user", "name email")
      .select("orderNumber status payment pricing items shippingAddress createdAt user"),
    Product.find({ isActive: true, ...LOW_STOCK_FILTER })
      .sort({ stock: 1, name: 1 })
      .limit(8)
      .select("name slug stock images variants.size variants.color variants.stock"),
    Product.countDocuments({ isActive: true, ...LOW_STOCK_FILTER }),
    Product.countDocuments({ isActive: true, ...SOLD_OUT_FILTER }),
    Order.countDocuments(REFUND_REQUIRED_FILTER),
    Order.countDocuments(ORDER_QUEUE_FILTERS.confirm),
    Order.countDocuments(ORDER_QUEUE_FILTERS.awaiting),
    Order.countDocuments(ORDER_QUEUE_FILTERS.ship),
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
    getRevenueSummary(),
    getCashToCollect(),
  ]);

  return {
    ...orderStats,
    totalUsers: userCount,
    totalProducts: productCount,
    recentOrders: recentOrders.map((order: any) => ({
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
    })),
    revenue,
    cashToCollect,
    lowStockThreshold: LOW_STOCK_THRESHOLD,
    lowStockCount,
    lowStockProducts: lowStockProducts.map((p: any) => ({
      _id: p._id,
      name: p.name,
      slug: p.slug,
      stock: p.stock,
      image: p.images?.find((img: any) => img.isPrimary)?.url || p.images?.[0]?.url,
      // Sizes/colours that are low on their own, so admins know what to restock
      lowVariants: (p.variants || [])
        .filter((v: any) => v.stock <= LOW_STOCK_THRESHOLD)
        .map((v: any) => ({ size: v.size, color: v.color, stock: v.stock })),
    })),
    // Things an admin should act on, each counted like the list it links to
    needsAttention: {
      toConfirm,
      awaitingPayment,
      toShip,
      refundRequired,
      lowStock: lowStockCount,
      soldOut: soldOutCount,
      cashToCollect: cashToCollect.orders,
      unreadMessages,
      // All pending orders (older app versions show this)
      pendingOrders: orderStats.ordersByStatus?.pending || 0,
    },
    topProducts: topProducts.map((p: any) => ({
      _id: p._id,
      name: p.name,
      slug: p.slug,
      image: p.image,
      quantity: p.quantity,
      revenue: p.revenue,
    })),
  };
};

/** Counts for the admin navigation badges — cheap enough to poll */
export const getBadges = async () => {
  const [toConfirm, refundRequired, unreadMessages, pendingOrders] = await Promise.all([
    Order.countDocuments(ORDER_QUEUE_FILTERS.confirm),
    Order.countDocuments(REFUND_REQUIRED_FILTER),
    ContactMessage.countDocuments({ isRead: false }),
    Order.countDocuments({ status: "pending" }),
  ]);
  // pendingOrders (all pending, incl. online orders awaiting payment) is kept for older app versions
  return { toConfirm, refundRequired, unreadMessages, pendingOrders };
};
