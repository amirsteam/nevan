/**
 * Admin actions that touch money or data integrity: confirming orders,
 * collecting COD, recording refunds, changing users, deleting categories and
 * products.
 */
import request from "supertest";
import app from "../app";
import Order from "../models/Order";
import Payment from "../models/Payment";
import Product from "../models/Product";
import Category from "../models/Category";
import User from "../models/User";
import * as orderService from "../services/orderService";
import { createUser, createProduct, fillCart, shippingAddress } from "./helpers";

const asAdmin = async () => {
  const { user, accessToken } = await createUser({ role: "admin" });
  return { admin: user, auth: { Authorization: `Bearer ${accessToken}` } };
};

const placeOrder = async (paymentMethod: "cod" | "esewa", price = 1000) => {
  const { user } = await createUser();
  const product = await createProduct({ price, stock: 10 });
  await fillCart(user._id, [{ product, quantity: 1 }]);
  const order = await orderService.createOrder(String(user._id), { shippingAddress, paymentMethod });
  return { order, product };
};

const setStatus = (auth: Record<string, string>, id: unknown, status: string) =>
  request(app).put(`/api/v1/admin/orders/${id}/status`).set(auth).send({ status });

describe("Confirming orders", () => {
  it("refuses to confirm an online order that hasn't been paid", async () => {
    const { auth } = await asAdmin();
    const { order } = await placeOrder("esewa");

    const single = await setStatus(auth, order._id, "confirmed");
    expect(single.status).toBe(400);
    expect(single.body.message).toMatch(/Waiting for the eSewa payment/);

    const bulk = await request(app)
      .post("/api/v1/admin/orders/bulk-status")
      .set(auth)
      .send({ orderIds: [String(order._id)], status: "confirmed" });
    expect(bulk.body.data.failed).toHaveLength(1);
    expect((await Order.findById(order._id))!.status).toBe("pending");
  });

  it("confirms COD orders and paid online orders", async () => {
    const { auth } = await asAdmin();
    const { order: cod } = await placeOrder("cod");
    expect((await setStatus(auth, cod._id, "confirmed")).status).toBe(200);

    const { order: esewa } = await placeOrder("esewa");
    await Order.updateOne({ _id: esewa._id }, { "payment.status": "paid" });
    expect((await setStatus(auth, esewa._id, "confirmed")).status).toBe(200);
  });
});

describe("Cash on delivery", () => {
  it("completes the COD payment record when the order is delivered", async () => {
    const { auth } = await asAdmin();
    const { order } = await placeOrder("cod");
    for (const status of ["confirmed", "processing", "shipped", "delivered"]) {
      expect((await setStatus(auth, order._id, status)).status).toBe(200);
    }
    const saved = await Order.findById(order._id);
    expect(saved!.payment.status).toBe("paid");
    expect((await Payment.findOne({ order: order._id, gateway: "cod" }))!.status).toBe("completed");
  });

  it("marks cash collected once, notes it in the history, and is safe to repeat", async () => {
    const { auth } = await asAdmin();
    const { order } = await placeOrder("cod");

    const first = await request(app).post("/api/v1/admin/payments/cod-collected").set(auth).send({ orderId: String(order._id) });
    expect(first.status).toBe(200);
    const again = await request(app).post("/api/v1/admin/payments/cod-collected").set(auth).send({ orderId: String(order._id) });
    expect(again.status).toBe(200);
    expect(again.body.message).toMatch(/already/);

    const saved = await Order.findById(order._id);
    expect(saved!.payment.status).toBe("paid");
    expect(saved!.statusHistory.filter((h) => h.note === "Cash on delivery collected")).toHaveLength(1);
    expect((await Payment.findOne({ order: order._id, gateway: "cod" }))!.status).toBe("completed");

    const bad = await request(app).post("/api/v1/admin/payments/cod-collected").set(auth).send({ orderId: "nope" });
    expect(bad.status).toBe(400);
  });
});

describe("Recording refunds", () => {
  it("refunds a paid order that was cancelled, once, and clears the refund counters", async () => {
    const { auth } = await asAdmin();
    const { order } = await placeOrder("esewa");
    await Order.updateOne({ _id: order._id }, { status: "cancelled", "payment.status": "paid", "payment.transactionId": "TX1" });
    await Payment.create({ order: order._id, user: order.user, gateway: "esewa", amount: order.pricing.total, status: "completed" });

    let badges = await request(app).get("/api/v1/admin/badges").set(auth);
    expect(badges.body.data.refundRequired).toBe(1);

    const res = await request(app).post(`/api/v1/admin/orders/${order._id}/refund`).set(auth).send({ reference: "ESW-REF-9", note: "Sent back via eSewa" });
    expect(res.status).toBe(200);
    const saved = await Order.findById(order._id);
    expect(saved!.payment).toMatchObject({ status: "refunded", refundRequired: false, refundReference: "ESW-REF-9" });
    expect((await Payment.findOne({ order: order._id }))!.status).toBe("refunded");

    badges = await request(app).get("/api/v1/admin/badges").set(auth);
    expect(badges.body.data.refundRequired).toBe(0);

    const again = await request(app).post(`/api/v1/admin/orders/${order._id}/refund`).set(auth).send({});
    expect(again.status).toBe(409);
  });

  it("refunds only the extra payment on an order paid twice, which stays paid", async () => {
    const { auth } = await asAdmin();
    const { order } = await placeOrder("esewa");
    await Order.updateOne(
      { _id: order._id },
      { status: "confirmed", "payment.status": "paid", "payment.transactionId": "TX1", "payment.refundRequired": true },
    );
    const first = await Payment.create({ order: order._id, user: order.user, gateway: "esewa", amount: 100, status: "completed", gatewayResponse: { transactionId: "TX1" } });
    const second = await Payment.create({ order: order._id, user: order.user, gateway: "esewa", amount: 100, status: "completed", gatewayResponse: { transactionId: "TX2" } });

    const res = await request(app).post(`/api/v1/admin/orders/${order._id}/refund`).set(auth).send({ reference: "R2" });
    expect(res.status).toBe(200);
    const saved = await Order.findById(order._id);
    expect(saved!.status).toBe("confirmed");
    expect(saved!.payment).toMatchObject({ status: "paid", refundRequired: false });
    expect((await Payment.findById(first._id))!.status).toBe("completed");
    expect((await Payment.findById(second._id))!.status).toBe("refunded");
  });
});

describe("Changing users", () => {
  it("doesn't let admins deactivate or demote themselves", async () => {
    const { admin, auth } = await asAdmin();
    const status = await request(app).put(`/api/v1/admin/users/${admin._id}/status`).set(auth).send({ isActive: false });
    expect(status.status).toBe(409);
    const role = await request(app).put(`/api/v1/admin/users/${admin._id}/role`).set(auth).send({ role: "customer" });
    expect(role.status).toBe(409);
    expect(await User.findById(admin._id)).toMatchObject({ role: "admin", isActive: true });
  });

  it("changes other users and validates the input", async () => {
    const { auth } = await asAdmin();
    const { user } = await createUser();
    const missing = await request(app).put(`/api/v1/admin/users/${user._id}/status`).set(auth).send({});
    expect(missing.status).toBe(400);
    const off = await request(app).put(`/api/v1/admin/users/${user._id}/status`).set(auth).send({ isActive: false });
    expect(off.status).toBe(200);
    expect((await User.findById(user._id))!.isActive).toBe(false);
    const promoted = await request(app).put(`/api/v1/admin/users/${user._id}/role`).set(auth).send({ role: "admin" });
    expect(promoted.status).toBe(200);
    const badRole = await request(app).put(`/api/v1/admin/users/${user._id}/role`).set(auth).send({ role: "owner" });
    expect(badRole.status).toBe(400);
  });
});

describe("Deleting categories and products", () => {
  it("refuses to delete a category that products or subcategories still use", async () => {
    const { auth } = await asAdmin();
    const product = await createProduct();
    const res = await request(app).delete(`/api/v1/admin/categories/${product.category}`).set(auth);
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/1 product/);
    expect(await Category.exists({ _id: product.category })).toBeTruthy();

    const parent = await Category.create({ name: "Parent only" });
    await Category.create({ name: "Child", parent: parent._id });
    expect((await request(app).delete(`/api/v1/admin/categories/${parent._id}`).set(auth)).status).toBe(409);

    const unused = await Category.create({ name: "Unused" });
    expect((await request(app).delete(`/api/v1/admin/categories/${unused._id}`).set(auth)).status).toBe(200);
  });

  it("hides a product that has orders instead of deleting it, and deletes one that has none", async () => {
    const { auth } = await asAdmin();
    const { product: ordered } = await placeOrder("cod");
    const archived = await request(app).delete(`/api/v1/admin/products/${ordered._id}`).set(auth);
    expect(archived.status).toBe(200);
    expect(archived.body.data.archived).toBe(true);
    expect(await Product.findById(ordered._id)).toMatchObject({ isActive: false });

    const fresh = await createProduct();
    const deleted = await request(app).delete(`/api/v1/admin/products/${fresh._id}`).set(auth);
    expect(deleted.body.data.archived).toBe(false);
    expect(await Product.exists({ _id: fresh._id })).toBeNull();
  });
});

describe("Dashboard counts", () => {
  it("match the lists each card links to, and split sales into products and shipping", async () => {
    const { auth } = await asAdmin();
    await placeOrder("cod"); // to confirm
    await placeOrder("esewa"); // awaiting payment
    const { order: confirmed } = await placeOrder("cod");
    await Order.updateOne({ _id: confirmed._id }, { status: "confirmed" });
    const { order: shipped } = await placeOrder("cod");
    await Order.updateOne({ _id: shipped._id }, { status: "shipped" });
    await createProduct({ stock: 2 }); // low
    await createProduct({ stock: 0 }); // sold out

    const dash = (await request(app).get("/api/v1/admin/dashboard").set(auth)).body.data;
    const ordersIn = async (queue: string) =>
      (await request(app).get(`/api/v1/admin/orders?queue=${queue}`).set(auth)).body.pagination.totalItems;
    const productsWith = async (stock: string) =>
      (await request(app).get(`/api/v1/admin/products?stock=${stock}&isActive=true`).set(auth)).body.pagination.totalItems;

    expect(dash.needsAttention).toMatchObject({ toConfirm: 1, awaitingPayment: 1, toShip: 1, cashToCollect: 2 });
    expect(await ordersIn("confirm")).toBe(dash.needsAttention.toConfirm);
    expect(await ordersIn("awaiting")).toBe(dash.needsAttention.awaitingPayment);
    expect(await ordersIn("ship")).toBe(dash.needsAttention.toShip);
    expect(await ordersIn("collect")).toBe(dash.needsAttention.cashToCollect);
    expect(await productsWith("low")).toBe(dash.needsAttention.lowStock);
    expect(await productsWith("out")).toBe(dash.needsAttention.soldOut);
    expect(dash.needsAttention.soldOut).toBeGreaterThanOrEqual(1);

    // Confirmed and shipped orders placed today are sales; pending ones aren't yet
    const today = dash.revenue.today.current;
    expect(today.orders).toBe(2);
    expect(today.sales).toBe(today.products + today.shipping);
    expect(dash.cashToCollect.orders).toBe(2);
  });
});

describe("Order operations", () => {
  it("exports every matching order, not just one page", async () => {
    const { auth } = await asAdmin();
    const { user } = await createUser();
    const product = await createProduct({ price: 500, stock: 100 });
    for (let i = 0; i < 22; i++) {
      await fillCart(user._id, [{ product, quantity: 1 }]);
      await orderService.createOrder(String(user._id), { shippingAddress, paymentMethod: "cod" });
    }
    const page = await request(app).get("/api/v1/admin/orders?paymentMethod=cod").set(auth);
    expect(page.body.data.orders).toHaveLength(20);
    const all = await request(app).get("/api/v1/admin/orders/export?paymentMethod=cod").set(auth);
    expect(all.status).toBe(200);
    expect(all.body.data.orders).toHaveLength(22);
  });

  it("filters by Nepal calendar dates and saves an internal note", async () => {
    const { auth } = await asAdmin();
    const { order } = await placeOrder("cod");
    // 2026-03-01 00:10 in Nepal is 2026-02-28 18:25 UTC
    // createdAt is immutable through Mongoose, so set it on the collection directly
    await Order.collection.updateOne({ _id: order._id }, { $set: { createdAt: new Date("2026-02-28T18:25:00Z") } });
    const count = async (query: string) =>
      (await request(app).get(`/api/v1/admin/orders?${query}`).set(auth)).body.pagination.totalItems;
    expect(await count("from=2026-03-01&to=2026-03-01")).toBe(1);
    expect(await count("to=2026-02-28")).toBe(0);

    const note = await request(app).put(`/api/v1/admin/orders/${order._id}/note`).set(auth).send({ note: "Customer asked for evening delivery" });
    expect(note.status).toBe(200);
    expect((await Order.findById(order._id))!.notes).toBe("Customer asked for evening delivery");
  });
});

describe("Customers and activity", () => {
  it("lists each customer's orders, spend and last order", async () => {
    const { auth } = await asAdmin();
    const { order } = await placeOrder("cod", 1200);
    await Order.updateOne({ _id: order._id }, { status: "delivered" });
    const res = await request(app).get("/api/v1/admin/users?role=customer").set(auth);
    const buyer = res.body.data.users.find((u: any) => u._id === String(order.user));
    expect(buyer.orderStats).toMatchObject({ orders: 1, spent: order.pricing.total });
    expect(buyer.orderStats.lastOrderAt).toBeTruthy();
  });

  it("records admin actions on the activity log", async () => {
    const { auth } = await asAdmin();
    const { user } = await createUser({ name: "Gita" });
    await request(app).put(`/api/v1/admin/users/${user._id}/role`).set(auth).send({ role: "admin" });
    const res = await request(app).get("/api/v1/admin/activity").set(auth);
    expect(res.status).toBe(200);
    expect(res.body.data.entries[0]).toMatchObject({ action: "user.role", details: "Now admin", target: { type: "user" } });
    expect(res.body.data.entries[0].target.label).toMatch(/Gita/);
  });
});

describe("Category edits", () => {
  it("only accepts category fields and refuses parent loops", async () => {
    const { auth } = await asAdmin();
    const top = await Category.create({ name: "Top" });
    const child = await Category.create({ name: "Child", parent: top._id });
    const extra = await request(app).put(`/api/v1/admin/categories/${top._id}`).set(auth).send({ name: "Top", slug: "hijack" });
    expect(extra.status).toBe(400);
    const loop = await request(app).put(`/api/v1/admin/categories/${top._id}`).set(auth).send({ parent: String(child._id) });
    expect(loop.status).toBe(400);
    const ok = await request(app).put(`/api/v1/admin/categories/${child._id}`).set(auth).send({ name: "Renamed", order: 2 });
    expect(ok.status).toBe(200);
    const noFile = await request(app).post(`/api/v1/admin/categories/${top._id}/image`).set(auth);
    expect(noFile.status).toBe(400);
  });
});
