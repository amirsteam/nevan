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

describe("Admin navigation badges", () => {
  it("counts pending orders, refunds owed and unread contact messages", async () => {
    const { user } = await createUser();
    const product = await createProduct({ price: 1500, stock: 10 });
    await fillCart(user._id, [{ product, quantity: 1 }]);
    await orderService.createOrder(String(user._id), { shippingAddress, paymentMethod: "cod" });
    await fillCart(user._id, [{ product, quantity: 1 }]);
    const refund = await orderService.createOrder(String(user._id), { shippingAddress, paymentMethod: "cod" });
    await Order.updateOne({ _id: refund._id }, { status: "cancelled", "payment.status": "paid" });
    await request(app)
      .post("/api/v1/contact")
      .send({ name: "Asha", email: "asha@example.com", message: "Do you have this in 2-4 years?" });

    const res = await request(app)
      .get("/api/v1/admin/badges")
      .set("Authorization", `Bearer ${await asAdmin()}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ pendingOrders: 1, refundRequired: 1, unreadMessages: 1 });
  });

  it("is admin-only", async () => {
    const { accessToken } = await createUser();
    const res = await request(app).get("/api/v1/admin/badges").set("Authorization", `Bearer ${accessToken}`);
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

describe("Admin needs-attention data", () => {
  it("reports low stock, refunds owed and 30-day top products", async () => {
    const { user } = await createUser();
    const low = await createProduct({ name: "Low Stock Bib", stock: 2 });
    await createProduct({ name: "Plenty Socks", stock: 50 });
    const seller = await createProduct({ name: "Best Seller Romper", price: 1500, stock: 20 });

    await fillCart(user._id, [{ product: seller, quantity: 3 }]);
    const sold = await orderService.createOrder(String(user._id), { shippingAddress, paymentMethod: "cod" });
    await Order.updateOne({ _id: sold._id }, { status: "confirmed" });

    await fillCart(user._id, [{ product: seller, quantity: 1 }]);
    const refund = await orderService.createOrder(String(user._id), { shippingAddress, paymentMethod: "esewa" });
    await Order.updateOne({ _id: refund._id }, { status: "cancelled", "payment.status": "paid" });

    const res = await request(app)
      .get("/api/v1/admin/dashboard")
      .set("Authorization", `Bearer ${await asAdmin()}`);

    const stats = res.body.data;
    expect(stats.needsAttention).toMatchObject({ refundRequired: 1, toShip: 1, lowStock: 1 });
    expect(stats.lowStockProducts.map((p: any) => p._id)).toEqual([String(low._id)]);
    expect(stats.topProducts[0]).toMatchObject({ name: "Best Seller Romper", quantity: 3 });
  });
});

describe("Admin order filters and bulk status", () => {
  it("searches by order number and customer, and filters refunds owed", async () => {
    const { user } = await createUser({ name: "Maya Tamang" });
    const product = await createProduct({ stock: 10 });
    await fillCart(user._id, [{ product, quantity: 1 }]);
    const first = await orderService.createOrder(String(user._id), { shippingAddress, paymentMethod: "cod" });
    await fillCart(user._id, [{ product, quantity: 1 }]);
    const second = await orderService.createOrder(String(user._id), { shippingAddress, paymentMethod: "cod" });
    await Order.updateOne({ _id: second._id }, { status: "cancelled", "payment.status": "paid" });
    const token = await asAdmin();

    const byNumber = await request(app)
      .get("/api/v1/admin/orders")
      .query({ search: first.orderNumber })
      .set("Authorization", `Bearer ${token}`);
    expect(byNumber.body.data.orders.map((o: any) => o._id)).toEqual([String(first._id)]);

    const byCustomer = await request(app)
      .get("/api/v1/admin/orders")
      .query({ search: "maya" })
      .set("Authorization", `Bearer ${token}`);
    expect(byCustomer.body.data.orders).toHaveLength(2);

    const refunds = await request(app)
      .get("/api/v1/admin/orders")
      .query({ refundRequired: "true" })
      .set("Authorization", `Bearer ${token}`);
    expect(refunds.body.data.orders.map((o: any) => o._id)).toEqual([String(second._id)]);
  });

  it("updates several orders and reports the ones that can't change", async () => {
    const { user } = await createUser();
    const product = await createProduct({ stock: 10 });
    await fillCart(user._id, [{ product, quantity: 1 }]);
    const a = await orderService.createOrder(String(user._id), { shippingAddress, paymentMethod: "cod" });
    await fillCart(user._id, [{ product, quantity: 1 }]);
    const b = await orderService.createOrder(String(user._id), { shippingAddress, paymentMethod: "cod" });
    await Order.updateOne({ _id: b._id }, { status: "delivered" });

    const res = await request(app)
      .post("/api/v1/admin/orders/bulk-status")
      .set("Authorization", `Bearer ${await asAdmin()}`)
      .send({ orderIds: [String(a._id), String(b._id)], status: "confirmed" });

    expect(res.status).toBe(200);
    expect(res.body.data.updated.map((o: any) => o._id)).toEqual([String(a._id)]);
    expect(res.body.data.failed).toHaveLength(1);
    expect(res.body.data.failed[0]._id).toBe(String(b._id));
    expect((await Order.findById(a._id))?.status).toBe("confirmed");
  });

  it("rejects an invalid bulk request", async () => {
    const res = await request(app)
      .post("/api/v1/admin/orders/bulk-status")
      .set("Authorization", `Bearer ${await asAdmin()}`)
      .send({ orderIds: ["nope"], status: "confirmed" });
    expect(res.status).toBe(400);
  });
});

describe("Admin user search", () => {
  it("searches all users server-side by name, email or phone", async () => {
    await createUser({ name: "Sita Rai", phone: "9800000001" });
    await createUser({ name: "Gita Shrestha" });
    const token = await asAdmin();

    const byName = await request(app)
      .get("/api/v1/admin/users")
      .query({ search: "sita" })
      .set("Authorization", `Bearer ${token}`);
    expect(byName.body.data.users.map((u: any) => u.name)).toEqual(["Sita Rai"]);

    const byPhone = await request(app)
      .get("/api/v1/admin/users")
      .query({ search: "9800000001" })
      .set("Authorization", `Bearer ${token}`);
    expect(byPhone.body.data.users).toHaveLength(1);

    // Regex characters are matched literally
    const literal = await request(app)
      .get("/api/v1/admin/users")
      .query({ search: ".*" })
      .set("Authorization", `Bearer ${token}`);
    expect(literal.body.data.users).toHaveLength(0);
  });
});

describe("Image uploads without Cloudinary credentials", () => {
  it("answers 503 instead of crashing the server", async () => {
    const product = await createProduct();
    const token = await asAdmin();
    const saved = process.env.CLOUDINARY_API_SECRET;
    delete process.env.CLOUDINARY_API_SECRET;
    try {
      const res = await request(app)
        .post(`/api/v1/admin/products/${product._id}/images`)
        .set("Authorization", `Bearer ${token}`)
        .attach("images", Buffer.from("fake image"), { filename: "photo.jpg", contentType: "image/jpeg" });
      expect(res.status).toBe(503);
      expect(res.body.message).toMatch(/Image uploads aren't set up/);
    } finally {
      process.env.CLOUDINARY_API_SECRET = saved;
    }

    // The API keeps serving
    const list = await request(app).get("/api/v1/products");
    expect(list.status).toBe(200);
  });
});
