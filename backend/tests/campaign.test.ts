/**
 * Festival/event campaigns: sale pricing rules, scheduling, products/cart/
 * order prices, eSewa during a sale, launch notifications and admin access.
 */
import axios from "axios";
import request from "supertest";
import app from "../app";
import Campaign from "../models/Campaign";
import Category from "../models/Category";
import Order from "../models/Order";
import * as orderService from "../services/orderService";
import * as pushService from "../services/pushNotificationService";
import { clearCampaignCache, launchDueCampaigns } from "../services/campaignService";
import { priceFor, PricingCampaign } from "../utils/campaignPricing";
import { esewaCallback } from "./esewa";
import { createUser, createProduct, fillCart, shippingAddress } from "./helpers";

const HOUR = 60 * 60 * 1000;
const asAdmin = async () => (await createUser({ role: "admin" })).accessToken;

/** A published campaign that is live now (unless dates are overridden) */
const liveCampaign = (overrides: Record<string, unknown> = {}) =>
  Campaign.create({
    name: "Tihar Sale",
    slug: `tihar-${Math.random().toString(36).slice(2, 8)}`,
    festival: "tihar",
    headline: "Tihar Sale",
    palette: "diyo",
    status: "published",
    startsAt: new Date(Date.now() - HOUR),
    endsAt: new Date(Date.now() + 24 * HOUR),
    sale: { type: "percent", value: 15, scope: "all" },
    ...overrides,
  });

const pricing = (overrides: Partial<PricingCampaign> = {}): PricingCampaign => ({
  id: "c1",
  slug: "tihar",
  name: "Tihar Sale",
  endsAt: new Date(),
  type: "percent",
  value: 15,
  scope: "all",
  categoryIds: new Set(),
  productIds: new Set(),
  excludeIds: new Set(),
  ...overrides,
});

beforeEach(() => clearCampaignCache());

describe("Sale pricing rules", () => {
  const product = { _id: "p1", price: 1199, category: { _id: "cat1" } };

  it("rounds percentage discounts to whole rupees", () => {
    expect(priceFor(product, null, pricing())).toEqual({ price: 1019, originalPrice: 1199, campaignId: "c1" });
  });

  it("uses the variant price and never goes below NPR 1", () => {
    expect(priceFor(product, { price: 500 }, pricing({ type: "fixed", value: 200 })).price).toBe(300);
    expect(priceFor(product, { price: 150 }, pricing({ type: "fixed", value: 200 })).price).toBe(1);
  });

  it("respects category, product and exclusion scope", () => {
    expect(priceFor(product, null, pricing({ scope: "categories", categoryIds: new Set(["cat1"]) })).campaignId).toBe("c1");
    expect(priceFor(product, null, pricing({ scope: "categories", categoryIds: new Set(["cat2"]) })).campaignId).toBeNull();
    expect(priceFor(product, null, pricing({ scope: "products", productIds: new Set(["p1"]) })).price).toBe(1019);
    expect(priceFor(product, null, pricing({ excludeIds: new Set(["p1"]) })).price).toBe(1199);
  });

  it("charges full price when no campaign or a look-only campaign is live", () => {
    expect(priceFor(product, null, null).price).toBe(1199);
    expect(priceFor(product, null, pricing({ type: "none" })).price).toBe(1199);
  });
});

describe("Campaign admin", () => {
  const body = (overrides: Record<string, unknown> = {}) => ({
    festival: "dashain",
    startsAt: new Date(Date.now() + 24 * HOUR).toISOString(),
    endsAt: new Date(Date.now() + 10 * 24 * HOUR).toISOString(),
    status: "published",
    sale: { type: "percent", value: 10, scope: "all" },
    ...overrides,
  });

  it("creates a campaign from a festival preset", async () => {
    const res = await request(app)
      .post("/api/v1/admin/campaigns")
      .set("Authorization", `Bearer ${await asAdmin()}`)
      .send(body());
    expect(res.status).toBe(201);
    expect(res.body.data.campaign).toMatchObject({
      name: "Dashain Sale",
      slug: "dashain-sale",
      emoji: "🪁",
      palette: "marigold",
      state: "scheduled",
    });
    expect(res.body.data.campaign.theme.bg).toMatch(/^#/);
  });

  it("rejects overlapping published campaigns but allows overlapping drafts", async () => {
    const token = await asAdmin();
    await request(app).post("/api/v1/admin/campaigns").set("Authorization", `Bearer ${token}`).send(body());

    const clash = await request(app)
      .post("/api/v1/admin/campaigns")
      .set("Authorization", `Bearer ${token}`)
      .send(body({ festival: "tihar" }));
    expect(clash.status).toBe(409);
    expect(clash.body.message).toMatch(/overlap "Dashain Sale"/);

    const draft = await request(app)
      .post("/api/v1/admin/campaigns")
      .set("Authorization", `Bearer ${token}`)
      .send(body({ festival: "tihar", status: "draft" }));
    expect(draft.status).toBe(201);
  });

  it("rejects discounts above 70%, scopes without targets and too-short campaigns", async () => {
    const token = await asAdmin();
    const send = (b: Record<string, unknown>) =>
      request(app).post("/api/v1/admin/campaigns").set("Authorization", `Bearer ${token}`).send(body(b));

    expect((await send({ sale: { type: "percent", value: 80, scope: "all" } })).status).toBe(400);
    expect((await send({ sale: { type: "percent", value: 10, scope: "categories", categories: [] } })).status).toBe(400);
    const start = new Date(Date.now() + HOUR);
    expect(
      (await send({ startsAt: start.toISOString(), endsAt: new Date(start.getTime() + 10 * 60 * 1000).toISOString() }))
        .status,
    ).toBe(400);
  });

  it("duplicates a campaign as a draft a year later", async () => {
    const token = await asAdmin();
    const campaign = await liveCampaign();
    const res = await request(app)
      .post(`/api/v1/admin/campaigns/${campaign._id}/duplicate`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(201);
    expect(res.body.data.campaign.status).toBe("draft");
    expect(new Date(res.body.data.campaign.startsAt).getFullYear()).toBe(campaign.startsAt.getFullYear() + 1);
    expect(res.body.data.campaign.sale).toMatchObject({ type: "percent", value: 15 });
  });

  it("is admin-only, and only admins can preview unpublished campaigns", async () => {
    const { accessToken } = await createUser();
    const list = await request(app).get("/api/v1/admin/campaigns").set("Authorization", `Bearer ${accessToken}`);
    expect(list.status).toBe(403);

    const draft = await liveCampaign({ status: "draft" });
    const asCustomer = await request(app)
      .get(`/api/v1/campaigns/live?preview=${draft._id}`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(asCustomer.body.data.campaign).toBeNull();

    const asAdminRes = await request(app)
      .get(`/api/v1/campaigns/live?preview=${draft._id}`)
      .set("Authorization", `Bearer ${await asAdmin()}`);
    expect(asAdminRes.body.data.campaign.slug).toBe(draft.slug);
  });
});

describe("Live campaign on the storefront", () => {
  it("is returned with its theme and sale summary while live, and not after it ends", async () => {
    const campaign = await liveCampaign();
    const live = await request(app).get("/api/v1/campaigns/live");
    expect(live.body.data.campaign).toMatchObject({ slug: campaign.slug, state: "live", sale: { label: "15% off" } });
    expect(live.body.data.campaign.theme).toHaveProperty("accent");

    await Campaign.updateOne({ _id: campaign._id }, { endsAt: new Date(Date.now() - 1000) });
    clearCampaignCache();
    const after = await request(app).get("/api/v1/campaigns/live");
    expect(after.body.data.campaign).toBeNull();
  });

  it("adds sale prices to eligible products only and filters the sale page", async () => {
    const onSale = await createProduct({ price: 2000 });
    const other = await createProduct({ price: 900 });
    const sub = await Category.create({ name: "Rompers sub", parent: onSale.category });
    const inSub = await createProduct({ price: 1000, category: sub._id });
    const campaign = await liveCampaign({
      sale: { type: "percent", value: 20, scope: "categories", categories: [onSale.category] },
    });

    const list = await request(app).get("/api/v1/products");
    const byId = Object.fromEntries(list.body.data.products.map((p: any) => [p._id, p]));
    expect(byId[String(onSale._id)].sale).toMatchObject({ price: 1600, originalPrice: 2000, percentOff: 20 });
    expect(byId[String(inSub._id)].sale.price).toBe(800);
    expect(byId[String(other._id)].sale).toBeUndefined();

    const detail = await request(app).get(`/api/v1/products/${onSale.slug}`);
    expect(detail.body.data.product.sale.campaign.slug).toBe(campaign.slug);

    const salePage = await request(app).get(`/api/v1/products?campaign=${campaign.slug}`);
    const ids = salePage.body.data.products.map((p: any) => p._id).sort();
    expect(ids).toEqual([String(onSale._id), String(inSub._id)].sort());
  });
});

describe("Cart and orders during a sale", () => {
  it("charges the sale price shown in the cart and records the campaign", async () => {
    const { user, accessToken } = await createUser();
    const product = await createProduct({ price: 2000, stock: 5 });
    const campaign = await liveCampaign();
    await fillCart(user._id, [{ product, quantity: 2 }]);

    const cart = await request(app).get("/api/v1/cart").set("Authorization", `Bearer ${accessToken}`);
    expect(cart.body.data.cart).toMatchObject({ subtotal: 3400, savings: 600 });
    expect(cart.body.data.cart.items[0]).toMatchObject({ currentPrice: 1700, originalPrice: 2000, onSale: true });

    const order = await orderService.createOrder(String(user._id), { shippingAddress, paymentMethod: "cod" });
    expect(order.pricing).toMatchObject({ subtotal: 3400, savings: 600 });
    expect(order.items[0]).toMatchObject({ price: 1700, originalPrice: 2000, subtotal: 3400 });
    expect(String(order.items[0].campaign)).toBe(String(campaign._id));

    const stats = await request(app)
      .get(`/api/v1/admin/campaigns/${campaign._id}/stats`)
      .set("Authorization", `Bearer ${await asAdmin()}`);
    expect(stats.body.data.stats).toEqual({ orders: 1, units: 2, revenue: 3400, savings: 600 });
  });

  it("charges full price once the sale has ended", async () => {
    const { user } = await createUser();
    const product = await createProduct({ price: 2000, stock: 5 });
    await liveCampaign({ startsAt: new Date(Date.now() - 48 * HOUR), endsAt: new Date(Date.now() - HOUR) });
    await fillCart(user._id, [{ product, quantity: 1 }]);

    const order = await orderService.createOrder(String(user._id), { shippingAddress, paymentMethod: "cod" });
    expect(order.items[0].price).toBe(2000);
    expect(order.items[0].campaign).toBeUndefined();
    expect(order.pricing.savings).toBe(0);
  });

  it("accepts an eSewa payment for the sale total even if the sale ended meanwhile", async () => {
    const statusSpy = jest.spyOn(axios, "get").mockImplementation(async (_url, config: any) => ({
      data: { status: "COMPLETE", total_amount: config?.params?.total_amount },
    }));
    const { user, accessToken } = await createUser();
    const product = await createProduct({ price: 2000, stock: 5 });
    const campaign = await liveCampaign();
    await fillCart(user._id, [{ product, quantity: 1 }]);
    const order = await orderService.createOrder(String(user._id), { shippingAddress, paymentMethod: "esewa" });
    const init = await request(app)
      .post("/api/v1/payments/initiate")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ orderId: String(order._id), gateway: "esewa" });

    await Campaign.updateOne({ _id: campaign._id }, { endsAt: new Date(Date.now() - 1000) });
    clearCampaignCache();

    const res = await request(app)
      .post("/api/v1/payments/verify")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        orderId: String(order._id),
        gateway: "esewa",
        callbackData: { data: esewaCallback(init.body.data.formData.transaction_uuid, order.pricing.total) },
      });
    statusSpy.mockRestore();

    expect(res.status).toBe(200);
    const saved = await Order.findById(order._id);
    expect(saved?.payment.status).toBe("paid");
    expect(saved?.pricing.total).toBe(1700 + saved!.pricing.shippingCost);
  });
});

describe("Launch notifications", () => {
  it("are sent once per campaign even when the job runs concurrently", async () => {
    const push = jest.spyOn(pushService, "sendPromotionalNotification").mockResolvedValue([]);
    await liveCampaign({ notify: { pushOnLaunch: true, sentAt: null }, emoji: "🪔", greeting: "Happy Tihar!" });
    await liveCampaign({
      startsAt: new Date(Date.now() + 48 * HOUR),
      endsAt: new Date(Date.now() + 72 * HOUR),
      notify: { pushOnLaunch: true, sentAt: null },
    });

    const counts = await Promise.all([launchDueCampaigns(), launchDueCampaigns(), launchDueCampaigns()]);

    expect(counts.reduce((a, b) => a + b, 0)).toBe(1);
    expect(push).toHaveBeenCalledTimes(1);
    expect(push.mock.calls[0][0]).toBe("🪔 Tihar Sale");
    expect(push.mock.calls[0][1]).toMatch(/Happy Tihar! 15% off — until/);
    push.mockRestore();
  });
});
