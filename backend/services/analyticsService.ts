/**
 * Website visitor analytics: records the events the storefront sends
 * (POST /analytics/events) and builds the admin Visitors page reports.
 *
 * Visitors are anonymous random ids kept by the browser; a visit is named only
 * when the shopper is signed in. No IP addresses are stored. Admins and bots
 * are never recorded. Events and visits expire after VISIT_RETENTION_DAYS.
 * Orders in the totals come from the Orders collection (all channels); the
 * funnel and conversion use the website's own "order placed" events.
 */
import mongoose from "mongoose";
import VisitEvent, { VISIT_EVENT_TYPES, VISIT_RETENTION_DAYS, type VisitEventType } from "../models/VisitEvent";
import VisitSession from "../models/VisitSession";
import Product from "../models/Product";
import Order from "../models/Order";
import { classifyDevice, classifySource, isBot } from "../utils/visitSource";
import { DAY_MS, nepalDayStart } from "../utils/nepalTime";

export const STATS_RANGES = ["today", "7d", "30d", "90d"] as const;
export type StatsRange = (typeof STATS_RANGES)[number];

/** A visit counts as "online" while it sent something in the last 5 minutes */
const ONLINE_WINDOW_MS = 5 * 60 * 1000;
const NEPAL_TZ = "+05:45";
const RECENT_VISITS = 20;
const TOP_LIMIT = 15;
/** Many views and no orders: flagged on the top products list */
const NOT_SELLING_MIN_VIEWS = 10;

/** Orders that were really placed: confirmed onwards, or cash on delivery waiting to be confirmed */
export const PLACED_ORDER_FILTER = {
  $or: [
    { status: { $in: ["confirmed", "processing", "shipped", "delivered"] } },
    { status: "pending", "payment.method": "cod" },
  ],
};

// ==================== Recording ====================

export interface IncomingEvent {
  type: VisitEventType;
  path?: string;
  product?: string;
  query?: string;
  results?: number;
  order?: string;
}

export interface IncomingBatch {
  visitor: string;
  session: string;
  /** Sent with the first batch of a visit */
  referrer?: string;
  utm?: { source?: string; medium?: string; campaign?: string };
  clickIds?: string[];
  events: IncomingEvent[];
}

interface Sender {
  user?: { _id: unknown; role?: string } | null;
  userAgent?: string;
}

const isObjectId = (value: unknown): value is string =>
  typeof value === "string" && mongoose.Types.ObjectId.isValid(value) && /^[a-f\d]{24}$/i.test(value);

const normalizeQuery = (query?: string) => (query || "").trim().replace(/\s+/g, " ").toLowerCase().slice(0, 100);

const cleanUtm = (utm: IncomingBatch["utm"]) => {
  const out: Record<string, string> = {};
  for (const key of ["source", "medium", "campaign"] as const) {
    const value = typeof utm?.[key] === "string" ? utm[key]!.trim().slice(0, 100) : "";
    if (value) out[key] = value;
  }
  return Object.keys(out).length ? out : undefined;
};

/** Record a batch of events; returns how many were kept */
export const recordEvents = async (batch: IncomingBatch, sender: Sender): Promise<number> => {
  if (isBot(sender.userAgent) || sender.user?.role === "admin") return 0;

  const events = (batch.events || []).filter(
    (e) => VISIT_EVENT_TYPES.includes(e.type) && !String(e.path || "").startsWith("/admin"),
  );
  if (events.length === 0) return 0;

  // Only products and orders that exist (ids come from the browser)
  const productIds = [...new Set(events.map((e) => e.product).filter(isObjectId))];
  const orderIds = [...new Set(events.map((e) => e.order).filter(isObjectId))];
  const [products, orders, recordedOrders] = await Promise.all([
    productIds.length ? Product.find({ _id: { $in: productIds } }).select("_id").lean() : [],
    orderIds.length ? Order.find({ _id: { $in: orderIds } }).select("_id").lean() : [],
    orderIds.length ? VisitEvent.distinct("order", { order: { $in: orderIds } }) : [],
  ]);
  const knownProducts = new Set(products.map((p: any) => String(p._id)));
  const knownOrders = new Set(orders.map((o: any) => String(o._id)));
  const seenOrders = new Set(recordedOrders.map(String));

  const now = new Date();
  const userId = sender.user?._id;
  const docs: Record<string, unknown>[] = [];
  for (const event of events) {
    const doc: Record<string, unknown> = {
      visitor: batch.visitor,
      session: batch.session,
      type: event.type,
      path: String(event.path || "/").slice(0, 300),
      at: now,
    };
    if (userId) doc.user = userId;
    if (event.type === "product_view" || event.type === "add_to_cart") {
      if (!event.product || !knownProducts.has(event.product)) continue;
      doc.product = event.product;
    }
    if (event.type === "search") {
      const query = normalizeQuery(event.query);
      if (!query) continue;
      doc.query = query;
      if (Number.isInteger(event.results) && event.results! >= 0) doc.results = Math.min(event.results!, 100000);
    }
    if (event.type === "order_placed") {
      // Once per order, however often the success page is opened
      if (!event.order || !knownOrders.has(event.order) || seenOrders.has(event.order)) continue;
      doc.order = event.order;
      seenOrders.add(event.order);
    }
    docs.push(doc);
  }
  if (docs.length === 0) return 0;

  await VisitEvent.insertMany(docs, { ordered: false });

  const count = (type: VisitEventType) => docs.filter((d) => d.type === type).length;
  const { source, referrerHost } = classifySource({
    referrer: batch.referrer,
    utm: batch.utm,
    clickIds: batch.clickIds,
    userAgent: sender.userAgent,
  });
  const onInsert: Record<string, unknown> = {
    visitor: batch.visitor,
    startedAt: now,
    landingPath: docs[0].path,
    source,
    device: classifyDevice(sender.userAgent),
  };
  if (referrerHost) onInsert.referrerHost = referrerHost;
  const utm = cleanUtm(batch.utm);
  if (utm) onInsert.utm = utm;

  const set: Record<string, unknown> = { lastSeenAt: now };
  if (userId) set.user = userId;
  if (count("order_placed") > 0) set.ordered = true;

  const update = {
    $setOnInsert: onInsert,
    $set: set,
    $inc: {
      pageViews: count("page_view"),
      productViews: count("product_view"),
      searches: count("search"),
      addToCarts: count("add_to_cart"),
      checkouts: count("checkout_start"),
    },
  };
  try {
    await VisitSession.updateOne({ session: batch.session }, update, { upsert: true });
  } catch (error: any) {
    // Two first batches of one visit raced to create it: the other one won
    if (error?.code !== 11000) throw error;
    await VisitSession.updateOne({ session: batch.session }, update);
  }
  return docs.length;
};

// ==================== Reports ====================

interface Bounds {
  from: Date;
  to: Date;
  prevFrom: Date;
  prevTo: Date;
  /** Hourly points for "today", daily otherwise */
  granularity: "hour" | "day";
  /** Is the period before still within the kept records? */
  comparable: boolean;
}

/** The range so far, and the same length of time just before it (Nepal days) */
export const rangeBounds = (range: StatsRange, now = new Date()): Bounds => {
  const todayStart = nepalDayStart(now);
  const days = range === "today" ? 1 : parseInt(range, 10);
  const from = new Date(todayStart.getTime() - (days - 1) * DAY_MS);
  const shift = days * DAY_MS;
  return {
    from,
    to: now,
    prevFrom: new Date(from.getTime() - shift),
    prevTo: new Date(now.getTime() - shift),
    granularity: range === "today" ? "hour" : "day",
    comparable: days * 2 <= VISIT_RETENTION_DAYS,
  };
};

export interface VisitTotals {
  visitors: number;
  visits: number;
  pageViews: number;
  productViews: number;
  searches: number;
  addToCarts: number;
  checkouts: number;
  /** Website visitors who placed an order */
  orderingVisitors: number;
  /** All orders placed (website and app) */
  ordersPlaced: number;
  /** orderingVisitors / visitors */
  conversion: number;
}

const between = (from: Date, to: Date) => ({ $gte: from, $lt: to });

/** Distinct visitors, from a $match on events (two-stage group: no big arrays in memory) */
const distinctVisitorsStages = [{ $group: { _id: "$visitor" } }, { $count: "n" }];

const getTotals = async (from: Date, to: Date): Promise<VisitTotals> => {
  const [facets] = await VisitEvent.aggregate([
    { $match: { at: between(from, to) } },
    {
      $facet: {
        visitors: distinctVisitorsStages,
        visits: [{ $group: { _id: "$session" } }, { $count: "n" }],
        byType: [{ $group: { _id: "$type", n: { $sum: 1 } } }],
        ordering: [{ $match: { type: "order_placed" } }, ...distinctVisitorsStages],
      },
    },
  ]);
  const byType: Record<string, number> = {};
  for (const row of facets?.byType || []) byType[row._id] = row.n;
  const visitors = facets?.visitors?.[0]?.n || 0;
  const orderingVisitors = facets?.ordering?.[0]?.n || 0;
  const ordersPlaced = await Order.countDocuments({ createdAt: between(from, to), ...PLACED_ORDER_FILTER });
  return {
    visitors,
    visits: facets?.visits?.[0]?.n || 0,
    pageViews: byType.page_view || 0,
    productViews: byType.product_view || 0,
    searches: byType.search || 0,
    addToCarts: byType.add_to_cart || 0,
    checkouts: byType.checkout_start || 0,
    orderingVisitors,
    ordersPlaced,
    conversion: visitors ? orderingVisitors / visitors : 0,
  };
};

/** Points for the chart: every hour of today, or every Nepal day of the range */
const seriesKeys = (bounds: Bounds): string[] => {
  if (bounds.granularity === "hour") return Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0"));
  const keys: string[] = [];
  for (let t = bounds.from.getTime(); t <= bounds.to.getTime(); t += DAY_MS) {
    // A Nepal day start as "YYYY-MM-DD"
    keys.push(new Date(t + (5 * 60 + 45) * 60 * 1000).toISOString().slice(0, 10));
  }
  return keys;
};

const getSeries = async (bounds: Bounds) => {
  const format = bounds.granularity === "hour" ? "%H" : "%Y-%m-%d";
  const bucket = (field: string) => ({ $dateToString: { format, date: field, timezone: NEPAL_TZ } });
  const [visitors, views, orders] = await Promise.all([
    VisitEvent.aggregate([
      { $match: { at: between(bounds.from, bounds.to) } },
      { $group: { _id: { key: bucket("$at"), visitor: "$visitor" } } },
      { $group: { _id: "$_id.key", n: { $sum: 1 } } },
    ]),
    VisitEvent.aggregate([
      { $match: { at: between(bounds.from, bounds.to), type: "product_view" } },
      { $group: { _id: bucket("$at"), n: { $sum: 1 } } },
    ]),
    Order.aggregate([
      { $match: { createdAt: between(bounds.from, bounds.to), ...PLACED_ORDER_FILTER } },
      { $group: { _id: bucket("$createdAt"), n: { $sum: 1 } } },
    ]),
  ]);
  const toMap = (rows: { _id: string; n: number }[]) => new Map(rows.map((r) => [r._id, r.n]));
  const [v, p, o] = [toMap(visitors), toMap(views), toMap(orders)];
  return seriesKeys(bounds).map((key) => ({
    key,
    visitors: v.get(key) || 0,
    productViews: p.get(key) || 0,
    orders: o.get(key) || 0,
  }));
};

const FUNNEL_STEPS: { type: VisitEventType | "visit"; label: string }[] = [
  { type: "visit", label: "Visited" },
  { type: "product_view", label: "Viewed a product" },
  { type: "add_to_cart", label: "Added to cart" },
  { type: "checkout_start", label: "Started checkout" },
  { type: "order_placed", label: "Placed an order" },
];

const getFunnel = async (from: Date, to: Date, visitors: number) => {
  const rows = await VisitEvent.aggregate([
    { $match: { at: between(from, to), type: { $in: ["product_view", "add_to_cart", "checkout_start", "order_placed"] } } },
    { $group: { _id: { type: "$type", visitor: "$visitor" } } },
    { $group: { _id: "$_id.type", n: { $sum: 1 } } },
  ]);
  const counts = new Map(rows.map((r: any) => [r._id, r.n]));
  return FUNNEL_STEPS.map((step) => ({
    step: step.type,
    label: step.label,
    visitors: step.type === "visit" ? visitors : counts.get(step.type) || 0,
  }));
};

const getSourcesAndDevices = async (from: Date, to: Date) => {
  const [sources, devices] = await Promise.all([
    VisitSession.aggregate([
      { $match: { startedAt: between(from, to) } },
      { $group: { _id: "$source", visits: { $sum: 1 }, orders: { $sum: { $cond: ["$ordered", 1, 0] } } } },
      { $sort: { visits: -1 } },
    ]),
    VisitSession.aggregate([
      { $match: { startedAt: between(from, to) } },
      { $group: { _id: "$device", visits: { $sum: 1 } } },
      { $sort: { visits: -1 } },
    ]),
  ]);
  return {
    sources: sources.map((s: any) => ({ source: s._id, visits: s.visits, orders: s.orders })),
    devices: devices.map((d: any) => ({ device: d._id, visits: d.visits })),
  };
};

const getBusyHours = async (from: Date, to: Date) => {
  const rows = await VisitEvent.aggregate([
    { $match: { at: between(from, to), type: "page_view" } },
    { $group: { _id: { $hour: { date: "$at", timezone: NEPAL_TZ } }, n: { $sum: 1 } } },
  ]);
  const counts = new Map(rows.map((r: any) => [r._id, r.n]));
  return Array.from({ length: 24 }, (_, hour) => ({ hour, pageViews: counts.get(hour) || 0 }));
};

const primaryImage = (product: any): string | undefined =>
  product?.images?.find((img: any) => img.isPrimary)?.url || product?.images?.[0]?.url;

const getTopProducts = async (from: Date, to: Date) => {
  const viewed = await VisitEvent.aggregate([
    { $match: { at: between(from, to), type: { $in: ["product_view", "add_to_cart"] } } },
    {
      $group: {
        _id: "$product",
        views: { $sum: { $cond: [{ $eq: ["$type", "product_view"] }, 1, 0] } },
        carts: { $sum: { $cond: [{ $eq: ["$type", "add_to_cart"] }, 1, 0] } },
      },
    },
    { $sort: { views: -1, carts: -1 } },
    { $limit: TOP_LIMIT },
  ]);
  const ids = viewed.map((row: any) => row._id);
  if (ids.length === 0) return [];
  const [orders, products] = await Promise.all([
    Order.aggregate([
      { $match: { createdAt: between(from, to), ...PLACED_ORDER_FILTER } },
      { $unwind: "$items" },
      { $match: { "items.product": { $in: ids } } },
      { $group: { _id: { product: "$items.product", order: "$_id" }, quantity: { $sum: "$items.quantity" } } },
      { $group: { _id: "$_id.product", orders: { $sum: 1 }, quantity: { $sum: "$quantity" } } },
    ]),
    Product.find({ _id: { $in: ids } }).select("name slug images isActive").lean(),
  ]);
  const ordersBy = new Map(orders.map((o: any) => [String(o._id), o]));
  const productsBy = new Map(products.map((p: any) => [String(p._id), p]));
  return viewed
    .filter((row: any) => productsBy.has(String(row._id)))
    .map((row: any) => {
      const product: any = productsBy.get(String(row._id));
      const ordered: any = ordersBy.get(String(row._id));
      const orderCount = ordered?.orders || 0;
      return {
        _id: String(row._id),
        name: product.name,
        slug: product.slug,
        image: primaryImage(product),
        isActive: product.isActive !== false,
        views: row.views,
        carts: row.carts,
        orders: orderCount,
        quantity: ordered?.quantity || 0,
        conversion: row.views ? orderCount / row.views : 0,
        notSelling: row.views >= NOT_SELLING_MIN_VIEWS && orderCount === 0,
      };
    });
};

const getSearches = async (from: Date, to: Date) => {
  const [top, noResults] = await Promise.all([
    VisitEvent.aggregate([
      { $match: { at: between(from, to), type: "search" } },
      { $group: { _id: "$query", searches: { $sum: 1 }, results: { $last: "$results" } } },
      { $sort: { searches: -1, _id: 1 } },
      { $limit: 10 },
    ]),
    VisitEvent.aggregate([
      { $match: { at: between(from, to), type: "search", results: 0 } },
      { $group: { _id: "$query", searches: { $sum: 1 } } },
      { $sort: { searches: -1, _id: 1 } },
      { $limit: 10 },
    ]),
  ]);
  return {
    top: top.map((s: any) => ({ query: s._id, searches: s.searches, results: s.results ?? null })),
    noResults: noResults.map((s: any) => ({ query: s._id, searches: s.searches })),
  };
};

const getTopPages = async (from: Date, to: Date) => {
  const rows = await VisitEvent.aggregate([
    { $match: { at: between(from, to), type: "page_view" } },
    { $group: { _id: "$path", views: { $sum: 1 } } },
    { $sort: { views: -1, _id: 1 } },
    { $limit: 10 },
  ]);
  return rows.map((r: any) => ({ path: r._id, views: r.views }));
};

/** Everything on the admin Visitors page for one range */
export const getVisitorStats = async (range: StatsRange, now = new Date()) => {
  const bounds = rangeBounds(range, now);
  const [current, previous] = await Promise.all([
    getTotals(bounds.from, bounds.to),
    getTotals(bounds.prevFrom, bounds.prevTo),
  ]);
  const [series, funnel, { sources, devices }, hours, topProducts, searches, topPages] = await Promise.all([
    getSeries(bounds),
    getFunnel(bounds.from, bounds.to, current.visitors),
    getSourcesAndDevices(bounds.from, bounds.to),
    getBusyHours(bounds.from, bounds.to),
    getTopProducts(bounds.from, bounds.to),
    getSearches(bounds.from, bounds.to),
    getTopPages(bounds.from, bounds.to),
  ]);
  return {
    range,
    from: bounds.from,
    to: bounds.to,
    granularity: bounds.granularity,
    comparable: bounds.comparable,
    retentionDays: VISIT_RETENTION_DAYS,
    totals: { current, previous },
    series,
    funnel,
    sources,
    devices,
    hours,
    topProducts,
    searches,
    topPages,
  };
};

/** Online now, today's visitors and the most recent visits (polled by the admin) */
export const getLiveVisitors = async (now = new Date()) => {
  const onlineSince = new Date(now.getTime() - ONLINE_WINDOW_MS);
  const [onlineNow, today, visits] = await Promise.all([
    VisitSession.countDocuments({ lastSeenAt: { $gte: onlineSince } }),
    VisitEvent.aggregate([{ $match: { at: { $gte: nepalDayStart(now) } } }, ...distinctVisitorsStages]),
    VisitSession.find().sort({ lastSeenAt: -1 }).limit(RECENT_VISITS).populate("user", "name").lean(),
  ]);

  const sessionIds = visits.map((v: any) => v.session);
  const visitorIds = [...new Set(visits.map((v: any) => v.visitor))];
  const [viewed, visitCounts] = await Promise.all([
    VisitEvent.find({ session: { $in: sessionIds }, type: "product_view" })
      .sort({ at: 1 })
      .select("session product")
      .lean(),
    // Which visit of this visitor's it is ("returning")
    VisitSession.aggregate([{ $match: { visitor: { $in: visitorIds } } }, { $group: { _id: "$visitor", visits: { $sum: 1 } } }]),
  ]);
  const productIds = [...new Set(viewed.map((e: any) => String(e.product)))];
  const products = productIds.length
    ? await Product.find({ _id: { $in: productIds } }).select("name slug images").lean()
    : [];
  const productsBy = new Map(products.map((p: any) => [String(p._id), p]));
  const viewedBy = new Map<string, string[]>();
  for (const event of viewed as any[]) {
    const list = viewedBy.get(event.session) || [];
    const id = String(event.product);
    if (!list.includes(id)) list.push(id);
    viewedBy.set(event.session, list);
  }
  const visitsBy = new Map(visitCounts.map((v: any) => [v._id, v.visits]));

  return {
    onlineNow,
    todayVisitors: today?.[0]?.n || 0,
    recent: visits.map((visit: any) => {
      const ids = viewedBy.get(visit.session) || [];
      return {
        session: visit.session,
        // Named only when the shopper was signed in
        name: visit.user?.name || null,
        visitorLabel: `Visitor ${String(visit.visitor).slice(0, 4)}`,
        returning: (visitsBy.get(visit.visitor) || 1) > 1,
        device: visit.device,
        source: visit.source,
        referrerHost: visit.referrerHost || null,
        campaign: visit.utm?.campaign || null,
        landingPath: visit.landingPath,
        startedAt: visit.startedAt,
        lastSeenAt: visit.lastSeenAt,
        online: new Date(visit.lastSeenAt) >= onlineSince,
        pageViews: visit.pageViews,
        productViews: visit.productViews,
        addToCarts: visit.addToCarts,
        ordered: Boolean(visit.ordered),
        productsViewed: ids.length,
        products: ids
          .slice(0, 4)
          .map((id) => productsBy.get(id))
          .filter(Boolean)
          .map((p: any) => ({ _id: String(p._id), name: p.name, slug: p.slug, image: primaryImage(p) })),
      };
    }),
  };
};

/** One visit, step by step (the admin's timeline drawer) */
export const getVisitTimeline = async (session: string) => {
  const visit: any = await VisitSession.findOne({ session }).populate("user", "name").lean();
  if (!visit) return null;
  const events = await VisitEvent.find({ session })
    .sort({ at: 1 })
    .limit(300)
    .populate("product", "name slug images")
    .populate("order", "orderNumber pricing.total")
    .lean();
  return {
    session: visit.session,
    name: visit.user?.name || null,
    visitorLabel: `Visitor ${String(visit.visitor).slice(0, 4)}`,
    device: visit.device,
    source: visit.source,
    referrerHost: visit.referrerHost || null,
    campaign: visit.utm?.campaign || null,
    startedAt: visit.startedAt,
    lastSeenAt: visit.lastSeenAt,
    events: events.map((event: any) => ({
      type: event.type,
      at: event.at,
      path: event.path,
      query: event.query ?? null,
      results: event.results ?? null,
      product: event.product
        ? { _id: String(event.product._id), name: event.product.name, slug: event.product.slug, image: primaryImage(event.product) }
        : null,
      order: event.order
        ? { _id: String(event.order._id), orderNumber: event.order.orderNumber, total: event.order.pricing?.total ?? null }
        : null,
    })),
  };
};
