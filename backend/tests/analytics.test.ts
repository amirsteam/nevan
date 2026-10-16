/**
 * Website visitor analytics: recording events (who is and isn't counted,
 * sources, devices, sessions) and the admin Visitors page reports.
 */
import request from "supertest";
import { randomUUID } from "crypto";
import app from "../app";
import VisitEvent from "../models/VisitEvent";
import VisitSession from "../models/VisitSession";
import * as orderService from "../services/orderService";
import { classifyDevice, classifySource, isBot } from "../utils/visitSource";
import { createUser, createProduct, fillCart, shippingAddress } from "./helpers";

const PHONE =
  "Mozilla/5.0 (Linux; Android 13; SM-A135F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36";
const DESKTOP = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36";
const FACEBOOK_APP = `${PHONE} [FB_IAB/FB4A;FBAV/480.0.0.40.109;]`;

const visit = () => ({ visitor: randomUUID(), session: randomUUID() });

const send = (body: Record<string, unknown>, { ua = PHONE, token }: { ua?: string; token?: string } = {}) => {
  const req = request(app).post("/api/v1/analytics/events").set("User-Agent", ua);
  if (token) req.set("Authorization", `Bearer ${token}`);
  return req.send(body);
};

describe("Where a visit comes from", () => {
  it("names the shop's channels from tagged links, click ids, referrers and in-app browsers", () => {
    expect(classifySource({ utm: { source: "facebook" } }).source).toBe("Facebook");
    expect(classifySource({ utm: { source: "ig" } }).source).toBe("Instagram");
    expect(classifySource({ utm: { source: "newsletter" } }).source).toBe("Other sites");
    expect(classifySource({ clickIds: ["fbclid"], userAgent: PHONE }).source).toBe("Facebook");
    expect(classifySource({ referrer: "https://l.facebook.com/l.php?u=x" }).source).toBe("Facebook");
    expect(classifySource({ referrer: "https://www.instagram.com/" }).source).toBe("Instagram");
    expect(classifySource({ referrer: "https://www.google.com.np/" }).source).toBe("Google");
    expect(classifySource({ referrer: "https://wa.me/977" }).source).toBe("WhatsApp");
    expect(classifySource({ referrer: "https://www.bing.com/" }).source).toBe("Other search");
    expect(classifySource({ referrer: "https://blog.example.org/post" })).toEqual({
      source: "Other sites",
      referrerHost: "blog.example.org",
    });
    // Facebook's in-app browser often sends no referrer
    expect(classifySource({ userAgent: FACEBOOK_APP }).source).toBe("Facebook");
    // Coming back from the shop's own pages (a new visit after a break) is direct
    expect(classifySource({ referrer: "https://nevanhandicraft.com.np/products" }).source).toBe("Direct");
    expect(classifySource({}).source).toBe("Direct");
  });

  it("tells phones, tablets, computers and bots apart", () => {
    expect(classifyDevice(PHONE)).toBe("mobile");
    expect(classifyDevice("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15")).toBe("tablet");
    expect(classifyDevice(DESKTOP)).toBe("desktop");
    expect(isBot("facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)")).toBe(true);
    expect(isBot("Mozilla/5.0 (compatible; Googlebot/2.1)")).toBe(true);
    expect(isBot("")).toBe(true);
    expect(isBot(PHONE)).toBe(false);
  });
});

describe("POST /analytics/events", () => {
  it("records a visit: its pages and products, source, device and counts", async () => {
    const product = await createProduct();
    const ids = visit();
    const res = await send({
      ...ids,
      referrer: "https://m.facebook.com/",
      utm: { campaign: "dashain-sale" },
      events: [
        { type: "page_view", path: "/" },
        { type: "page_view", path: `/products/${product.slug}` },
        { type: "product_view", path: `/products/${product.slug}`, product: String(product._id) },
      ],
    });
    expect(res.status).toBe(204);

    expect(await VisitEvent.countDocuments({ session: ids.session })).toBe(3);
    const session = await VisitSession.findOne({ session: ids.session }).lean();
    expect(session).toMatchObject({
      visitor: ids.visitor,
      source: "Facebook",
      device: "mobile",
      landingPath: "/",
      pageViews: 2,
      productViews: 1,
      utm: { campaign: "dashain-sale" },
    });
    expect(session!.user).toBeUndefined();

    // A later batch of the same visit adds to its counts and keeps where it came from
    await send({ ...ids, events: [{ type: "add_to_cart", path: "/cart", product: String(product._id) }] });
    expect(await VisitSession.findOne({ session: ids.session }).lean()).toMatchObject({
      source: "Facebook",
      addToCarts: 1,
      pageViews: 2,
    });
  });

  it("links a signed-in shopper's visit to their account", async () => {
    const { user, accessToken } = await createUser({ name: "Asha Shrestha" });
    const ids = visit();
    await send({ ...ids, events: [{ type: "page_view", path: "/" }] }, { token: accessToken });

    expect(String((await VisitSession.findOne({ session: ids.session }))!.user)).toBe(String(user._id));
    expect(String((await VisitEvent.findOne({ session: ids.session }))!.user)).toBe(String(user._id));
  });

  it("accepts the text/plain bodies browsers send while a page is closing", async () => {
    const ids = visit();
    const res = await request(app)
      .post("/api/v1/analytics/events")
      .set("User-Agent", DESKTOP)
      .set("Content-Type", "text/plain")
      .send(JSON.stringify({ ...ids, events: [{ type: "page_view", path: "/about" }] }));
    expect(res.status).toBe(204);
    expect(await VisitSession.findOne({ session: ids.session }).lean()).toMatchObject({ device: "desktop", landingPath: "/about" });
  });

  it("links a closing page's beacon to the shopper through the token in its body, and never stores the token", async () => {
    const { user, accessToken } = await createUser();
    const ids = visit();
    const res = await request(app)
      .post("/api/v1/analytics/events")
      .set("User-Agent", PHONE)
      .set("Content-Type", "text/plain")
      .send(JSON.stringify({ ...ids, auth: accessToken, events: [{ type: "page_view", path: "/cart" }] }));
    expect(res.status).toBe(204);
    expect(String((await VisitSession.findOne({ session: ids.session }))!.user)).toBe(String(user._id));
    const stored = await VisitEvent.findOne({ session: ids.session }).lean();
    expect(JSON.stringify(stored)).not.toContain(accessToken);

    // An admin's token in a beacon is still an admin
    const { accessToken: adminToken } = await createUser({ role: "admin" });
    const adminVisit = visit();
    await request(app)
      .post("/api/v1/analytics/events")
      .set("User-Agent", PHONE)
      .set("Content-Type", "text/plain")
      .send(JSON.stringify({ ...adminVisit, auth: adminToken, events: [{ type: "page_view", path: "/" }] }));
    expect(await VisitSession.countDocuments({ session: adminVisit.session })).toBe(0);
  });

  it("never counts admins, bots, admin pages or unknown products", async () => {
    const { accessToken: adminToken } = await createUser({ role: "admin" });
    await send({ ...visit(), events: [{ type: "page_view", path: "/" }] }, { token: adminToken });
    await send({ ...visit(), events: [{ type: "page_view", path: "/" }] }, { ua: "Googlebot/2.1 (+http://www.google.com/bot.html)" });
    await send({ ...visit(), events: [{ type: "page_view", path: "/admin/orders" }] });
    await send({ ...visit(), events: [{ type: "product_view", path: "/products/x", product: "507f1f77bcf86cd799439011" }] });

    expect(await VisitEvent.countDocuments()).toBe(0);
    expect(await VisitSession.countDocuments()).toBe(0);
  });

  it("rejects malformed batches", async () => {
    const bad = await send({ visitor: "not-a-uuid", session: randomUUID(), events: [{ type: "page_view" }] });
    expect(bad.status).toBe(400);
    const tooMany = await send({ ...visit(), events: Array.from({ length: 26 }, () => ({ type: "page_view", path: "/" })) });
    expect(tooMany.status).toBe(400);
    const unknownType = await send({ ...visit(), events: [{ type: "purchase", path: "/" }] });
    expect(unknownType.status).toBe(400);
    expect(await VisitEvent.countDocuments()).toBe(0);
  });

  it("records an order once, however often its success page is opened", async () => {
    const { user, accessToken } = await createUser();
    const product = await createProduct();
    await fillCart(user._id, [{ product, quantity: 1 }]);
    const order = await orderService.createOrder(String(user._id), { shippingAddress, paymentMethod: "cod" });
    const ids = visit();

    for (let i = 0; i < 2; i++) {
      await send({ ...ids, events: [{ type: "order_placed", path: "/order-success", order: String(order._id) }] }, { token: accessToken });
    }
    expect(await VisitEvent.countDocuments({ type: "order_placed" })).toBe(1);
    expect((await VisitSession.findOne({ session: ids.session }))!.ordered).toBe(true);
  });
});

describe("Admin Visitors reports", () => {
  it("are for admins only", async () => {
    const { accessToken } = await createUser();
    expect((await request(app).get("/api/v1/admin/analytics")).status).toBe(401);
    expect((await request(app).get("/api/v1/admin/analytics").set("Authorization", `Bearer ${accessToken}`)).status).toBe(403);
  });

  it("add up visitors, the funnel, sources, top products and searches", async () => {
    const { accessToken: adminToken } = await createUser({ role: "admin" });
    const romper = await createProduct({ name: "Muslin Romper" });
    const frock = await createProduct({ name: "Flannel Frock" });
    const { user: buyer, accessToken: buyerToken } = await createUser({ name: "Asha Shrestha" });

    // Visitor 1 (Facebook, phone): looks at the romper and buys it
    const first = visit();
    await send(
      {
        ...first,
        utm: { source: "facebook" },
        events: [
          { type: "page_view", path: "/" },
          { type: "product_view", path: `/products/${romper.slug}`, product: String(romper._id) },
          { type: "add_to_cart", path: `/products/${romper.slug}`, product: String(romper._id) },
          { type: "checkout_start", path: "/checkout" },
        ],
      },
      { token: buyerToken },
    );
    await fillCart(buyer._id, [{ product: romper, quantity: 2 }]);
    const order = await orderService.createOrder(String(buyer._id), { shippingAddress, paymentMethod: "cod" });
    await send({ ...first, events: [{ type: "order_placed", path: "/order-success", order: String(order._id) }] }, { token: buyerToken });

    // Visitor 2 (direct, computer): looks at both, searches, buys nothing
    const second = visit();
    await send(
      {
        ...second,
        events: [
          { type: "page_view", path: "/" },
          { type: "product_view", path: `/products/${romper.slug}`, product: String(romper._id) },
          { type: "product_view", path: `/products/${frock.slug}`, product: String(frock._id) },
          { type: "search", path: "/products", query: "  Woollen  CAP ", results: 0 },
          { type: "search", path: "/products", query: "romper", results: 3 },
        ],
      },
      { ua: DESKTOP },
    );

    const res = await request(app).get("/api/v1/admin/analytics?range=7d").set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const stats = res.body.data;

    expect(stats.totals.current).toMatchObject({
      visitors: 2,
      visits: 2,
      pageViews: 2,
      productViews: 3,
      addToCarts: 1,
      checkouts: 1,
      searches: 2,
      orderingVisitors: 1,
      ordersPlaced: 1,
      conversion: 0.5,
    });
    expect(stats.funnel.map((s: any) => s.visitors)).toEqual([2, 2, 1, 1, 1]);
    expect(stats.series).toHaveLength(7);
    expect(stats.series.at(-1)).toMatchObject({ visitors: 2, productViews: 3, orders: 1 });
    expect(stats.sources).toEqual(
      expect.arrayContaining([
        { source: "Facebook", visits: 1, orders: 1 },
        { source: "Direct", visits: 1, orders: 0 },
      ]),
    );
    expect(stats.devices).toEqual(expect.arrayContaining([{ device: "mobile", visits: 1 }, { device: "desktop", visits: 1 }]));

    expect(stats.topProducts[0]).toMatchObject({ name: "Muslin Romper", views: 2, carts: 1, orders: 1, quantity: 2 });
    expect(stats.topProducts[1]).toMatchObject({ name: "Flannel Frock", views: 1, orders: 0 });
    expect(stats.searches.noResults).toEqual([{ query: "woollen cap", searches: 1 }]);
    expect(stats.searches.top).toHaveLength(2);
    expect(stats.topPages[0]).toEqual({ path: "/", views: 2 });
  });

  it("shows who is online now, naming only signed-in shoppers, and a visit's timeline", async () => {
    const { accessToken: adminToken } = await createUser({ role: "admin" });
    const { accessToken } = await createUser({ name: "Asha Shrestha" });
    const product = await createProduct({ name: "Muslin Romper" });

    const named = visit();
    await send({ ...named, events: [{ type: "product_view", path: "/products/x", product: String(product._id) }] }, { token: accessToken });
    const anonymous = visit();
    await send({ ...anonymous, events: [{ type: "page_view", path: "/" }] });

    const live = await request(app).get("/api/v1/admin/analytics/live").set("Authorization", `Bearer ${adminToken}`);
    expect(live.status).toBe(200);
    expect(live.body.data).toMatchObject({ onlineNow: 2, todayVisitors: 2 });
    const rows = live.body.data.recent;
    const asha = rows.find((r: any) => r.session === named.session);
    expect(asha).toMatchObject({ name: "Asha Shrestha", online: true, productViews: 1 });
    expect(asha.products[0]).toMatchObject({ name: "Muslin Romper" });
    const stranger = rows.find((r: any) => r.session === anonymous.session);
    expect(stranger.name).toBeNull();
    expect(stranger.visitorLabel).toMatch(/^Visitor [0-9a-f]{4}$/);

    const timeline = await request(app)
      .get(`/api/v1/admin/analytics/sessions/${named.session}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(timeline.status).toBe(200);
    expect(timeline.body.data.visit.events[0]).toMatchObject({ type: "product_view", product: { name: "Muslin Romper" } });

    const missing = await request(app)
      .get(`/api/v1/admin/analytics/sessions/${randomUUID()}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(missing.status).toBe(404);
  });
});
