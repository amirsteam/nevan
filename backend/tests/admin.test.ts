/**
 * Admin API, catalog sorting, shipping rules and API docs
 */
import request from "supertest";
import app from "../app";
import Order from "../models/Order";
import * as orderService from "../services/orderService";
import { createUser, createProduct, fillCart, shippingAddress } from "./helpers";

const asAdmin = async () => (await createUser({ role: "admin" })).accessToken;

describe("Admin dashboard", () => {
  it("returns real order-status counts and 7 days of sales", async () => {
    const { user } = await createUser();
    const product = await createProduct({ price: 2000, stock: 10 });

    await fillCart(user._id, [{ product, quantity: 1 }]);
    const confirmed = await orderService.createOrder(String(user._id), { shippingAddress, paymentMethod: "cod" });
    await Order.updateOne({ _id: confirmed._id }, { status: "confirmed" });

    await fillCart(user._id, [{ product, quantity: 1 }]);
    await orderService.createOrder(String(user._id), { shippingAddress, paymentMethod: "cod" });

    const res = await request(app)
      .get("/api/v1/admin/dashboard")
      .set("Authorization", `Bearer ${await asAdmin()}`);

    expect(res.status).toBe(200);
    const stats = res.body.data;
    expect(stats.ordersByStatus).toEqual({ confirmed: 1, pending: 1 });
    expect(stats.salesByDay).toHaveLength(7);
    // Only confirmed+ orders count as revenue
    const today = stats.salesByDay[6];
    expect(today.orders).toBe(1);
    expect(today.revenue).toBe(confirmed.pricing.total);
    expect(stats.totalRevenue).toBe(confirmed.pricing.total);
  });

  it("is admin-only", async () => {
    const { accessToken } = await createUser();
    const res = await request(app)
      .get("/api/v1/admin/dashboard")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(403);
  });
});

describe("Admin product filters", () => {
  it("filters by search text, category and active status", async () => {
    const blanket = await createProduct({ name: "Muslin Swaddle Blanket" });
    const romper = await createProduct({ name: "Cotton Romper", isActive: false });
    await createProduct({ name: "Knitted Cap" });
    const token = await asAdmin();

    const bySearch = await request(app)
      .get("/api/v1/admin/products")
      .query({ search: "swaddle" })
      .set("Authorization", `Bearer ${token}`);
    expect(bySearch.body.data.products.map((p: any) => p._id)).toEqual([String(blanket._id)]);

    const inactive = await request(app)
      .get("/api/v1/admin/products")
      .query({ isActive: "false" })
      .set("Authorization", `Bearer ${token}`);
    expect(inactive.body.data.products.map((p: any) => p._id)).toEqual([String(romper._id)]);

    const byCategory = await request(app)
      .get("/api/v1/admin/products")
      .query({ category: String(blanket.category) })
      .set("Authorization", `Bearer ${token}`);
    expect(byCategory.body.pagination.totalItems).toBe(1);

    // Regex characters in search are treated literally
    const special = await request(app)
      .get("/api/v1/admin/products")
      .query({ search: "(.*" })
      .set("Authorization", `Bearer ${token}`);
    expect(special.status).toBe(200);
    expect(special.body.data.products).toHaveLength(0);
  });
});

describe("Product listing sort", () => {
  it("supports 'newest' and ignores unknown sort fields", async () => {
    const older = await createProduct({ name: "Older" });
    await new Promise((r) => setTimeout(r, 10));
    const newer = await createProduct({ name: "Newer" });

    const newest = await request(app).get("/api/v1/products").query({ sort: "newest" });
    expect(newest.body.data.products[0]._id).toBe(String(newer._id));

    const bogus = await request(app).get("/api/v1/products").query({ sort: "constructor" });
    expect(bogus.status).toBe(200);
    expect(bogus.body.data.products.map((p: any) => p._id)).toEqual([String(newer._id), String(older._id)]);
  });
});

describe("Shipping cost", () => {
  const place = async (address: Partial<typeof shippingAddress>, price: number) => {
    const { user } = await createUser();
    const product = await createProduct({ price, stock: 5 });
    await fillCart(user._id, [{ product, quantity: 1 }]);
    const order = await orderService.createOrder(String(user._id), {
      shippingAddress: { ...shippingAddress, ...address },
      paymentMethod: "cod",
    });
    return order.pricing.shippingCost;
  };

  it("charges the valley rate regardless of district capitalisation", async () => {
    expect(await place({ province: 3, district: "kathmandu " }, 1000)).toBe(100);
    expect(await place({ province: 3, district: "Chitwan" }, 1000)).toBe(150);
    expect(await place({ province: 6, district: "Jumla" }, 1000)).toBe(300);
    expect(await place({ province: 6, district: "Jumla" }, 5000)).toBe(0);
  });
});

describe("API docs", () => {
  it("serves the OpenAPI spec outside production", async () => {
    const res = await request(app).get("/api/v1/docs.json");
    expect(res.status).toBe(200);
    expect(res.body.openapi).toMatch(/^3\./);
    expect(Object.keys(res.body.paths)).toEqual(
      expect.arrayContaining(["/auth/login", "/orders", "/payments/verify", "/admin/dashboard"]),
    );
  });
});
