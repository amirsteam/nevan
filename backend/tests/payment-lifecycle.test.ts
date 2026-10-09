/**
 * Online-payment order lifecycle: going back from eSewa and retrying, abandoned
 * payments, late payments, cart cleanup, cancellations and gateway redirects.
 */
import request from "supertest";
import app from "../app";
import Order from "../models/Order";
import Product from "../models/Product";
import Payment from "../models/Payment";
import Cart from "../models/Cart";
import * as orderService from "../services/orderService";
import { createUser, createProduct, fillCart, shippingAddress } from "./helpers";
import { esewaCallback, mockEsewaStatusApi } from "./esewa";

const placeOrder = (userId: unknown, paymentMethod: "cod" | "esewa" = "esewa") =>
  orderService.createOrder(String(userId), { shippingAddress, paymentMethod });

const initiate = (token: string, orderId: unknown, gateway = "esewa") =>
  request(app)
    .post("/api/v1/payments/initiate")
    .set("Authorization", `Bearer ${token}`)
    .send({ orderId: String(orderId), gateway });

// Mongoose treats createdAt as immutable, so age orders (and their payment attempts:
// the payment window counts from the latest one) through the raw collections
const backdate = async (orderId: unknown, createdAt: Date) => {
  await Order.collection.updateOne({ _id: orderId as any }, { $set: { createdAt } });
  await Payment.collection.updateMany({ order: orderId as any }, { $set: { initiatedAt: createdAt } });
};

const stockOf = async (productId: unknown) => (await Product.findById(productId))!.stock;

describe("Going back from eSewa and checking out again", () => {
  it("replaces the unpaid order instead of duplicating it, even for the last item", async () => {
    const { user } = await createUser();
    const product = await createProduct({ stock: 1 });
    await fillCart(user._id, [{ product, quantity: 1 }]);

    const first = await placeOrder(user._id);
    expect(await stockOf(product._id)).toBe(0);

    // Cart is kept for online payments, so the shopper can simply place it again
    const second = await placeOrder(user._id);

    expect((await Order.findById(first._id))!.status).toBe("cancelled");
    expect((await Order.findById(second._id))!.status).toBe("pending");
    expect(await stockOf(product._id)).toBe(0);
    expect(await Order.countDocuments({ status: "pending" })).toBe(1);
  });

  it("does not touch paid or COD orders when a new order is placed", async () => {
    const { user } = await createUser();
    const product = await createProduct({ stock: 5 });

    await fillCart(user._id, [{ product, quantity: 1 }]);
    const cod = await placeOrder(user._id, "cod");

    await fillCart(user._id, [{ product, quantity: 1 }]);
    const paid = await placeOrder(user._id);
    await Order.updateOne({ _id: paid._id }, { "payment.status": "paid" });

    await fillCart(user._id, [{ product, quantity: 1 }]);
    await placeOrder(user._id);

    expect((await Order.findById(cod._id))!.status).toBe("pending");
    expect((await Order.findById(paid._id))!.status).toBe("pending");
  });
});

describe("Abandoned online payments", () => {
  it("cancels unpaid eSewa orders after the payment window and returns their stock", async () => {
    const { user } = await createUser();
    const product = await createProduct({ stock: 3 });
    await fillCart(user._id, [{ product, quantity: 2 }]);
    const order = await placeOrder(user._id);
    await Payment.create({ order: order._id, user: user._id, gateway: "esewa", amount: 1, status: "pending" });

    expect(await orderService.expireUnpaidOrders(30)).toBe(0); // still inside the window

    await backdate(order._id, new Date(Date.now() - 31 * 60 * 1000));
    expect(await orderService.expireUnpaidOrders(30)).toBe(1);

    const expired = await Order.findById(order._id);
    expect(expired!.status).toBe("cancelled");
    expect(await stockOf(product._id)).toBe(3);
    expect((await Payment.findOne({ order: order._id }))!.status).toBe("cancelled");

    // Running again doesn't release the stock twice
    expect(await orderService.expireUnpaidOrders(30)).toBe(0);
    expect(await stockOf(product._id)).toBe(3);
  });

  it("refuses to start a payment for a cancelled order or with another method", async () => {
    const { user, accessToken } = await createUser();
    const product = await createProduct({ stock: 3 });
    await fillCart(user._id, [{ product, quantity: 1 }]);
    const order = await placeOrder(user._id);

    const wrongMethod = await initiate(accessToken, order._id, "khalti");
    expect(wrongMethod.status).toBe(400);

    await Order.updateOne({ _id: order._id }, { status: "cancelled" });
    const cancelled = await initiate(accessToken, order._id);
    expect(cancelled.status).toBe(400);
    expect(cancelled.body.message).toMatch(/place a new order/);
  });
});

describe("Payment confirmation", () => {
  let statusSpy: jest.SpyInstance;
  beforeEach(() => {
    statusSpy = mockEsewaStatusApi();
  });
  afterEach(() => statusSpy.mockRestore());

  const payFor = async (token: string, order: any) => {
    const init = await initiate(token, order._id);
    const uuid = init.body.data.formData.transaction_uuid;
    return request(app)
      .get("/api/v1/payments/esewa/success")
      .query({ data: esewaCallback(uuid, order.pricing.total) });
  };

  it("removes only the purchased items from the cart", async () => {
    const { user, accessToken } = await createUser();
    const bought = await createProduct({ stock: 5 });
    const later = await createProduct({ stock: 5 });
    await fillCart(user._id, [{ product: bought, quantity: 1 }]);
    const order = await placeOrder(user._id);

    // Shopper adds something else to the cart while paying
    await fillCart(user._id, [
      { product: bought, quantity: 1 },
      { product: later, quantity: 2 },
    ]);

    const res = await payFor(accessToken, order);
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("/order-success");

    const cart = await Cart.findOne({ user: user._id });
    expect(cart!.items.map((i: any) => String(i.product))).toEqual([String(later._id)]);
  });

  it("reopens an order whose payment arrives after it expired, if stock allows", async () => {
    const { user, accessToken } = await createUser();
    const product = await createProduct({ stock: 2 });
    await fillCart(user._id, [{ product, quantity: 1 }]);
    const order = await placeOrder(user._id);
    const init = await initiate(accessToken, order._id);
    const uuid = init.body.data.formData.transaction_uuid;

    await backdate(order._id, new Date(Date.now() - 60 * 60 * 1000));
    await orderService.expireUnpaidOrders(30);
    expect(await stockOf(product._id)).toBe(2);

    const res = await request(app)
      .get("/api/v1/payments/esewa/success")
      .query({ data: esewaCallback(uuid, order.pricing.total) });

    expect(res.headers.location).toContain("/order-success");
    const reopened = await Order.findById(order._id);
    expect(reopened!.status).toBe("confirmed");
    expect(reopened!.payment.status).toBe("paid");
    expect(await stockOf(product._id)).toBe(1);
  });

  it("flags a refund when a late payment arrives and the stock is gone", async () => {
    const { user, accessToken } = await createUser();
    const product = await createProduct({ stock: 1 });
    await fillCart(user._id, [{ product, quantity: 1 }]);
    const order = await placeOrder(user._id);
    const init = await initiate(accessToken, order._id);
    const uuid = init.body.data.formData.transaction_uuid;

    await backdate(order._id, new Date(Date.now() - 60 * 60 * 1000));
    await orderService.expireUnpaidOrders(30);
    await Product.updateOne({ _id: product._id }, { stock: 0 }); // someone else bought it

    const res = await request(app)
      .get("/api/v1/payments/esewa/success")
      .query({ data: esewaCallback(uuid, order.pricing.total) });

    expect(res.headers.location).toContain("/order-failed");
    expect(decodeURIComponent(res.headers.location)).toMatch(/refund/);
    const flagged = await Order.findById(order._id);
    expect(flagged!.status).toBe("cancelled");
    expect(flagged!.payment.status).toBe("paid");
    expect(flagged!.statusHistory.at(-1)!.note).toMatch(/refund required/);
  });
});

describe("Cancelling orders", () => {
  it("returns stock when an admin cancels an order", async () => {
    const { user } = await createUser();
    const admin = await createUser({ role: "admin" });
    const product = await createProduct({ stock: 4 });
    await fillCart(user._id, [{ product, quantity: 3 }]);
    const order = await placeOrder(user._id, "cod");
    expect(await stockOf(product._id)).toBe(1);

    const res = await request(app)
      .put(`/api/v1/admin/orders/${order._id}/status`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ status: "cancelled", note: "Out of fabric" });

    expect(res.status).toBe(200);
    expect(await stockOf(product._id)).toBe(4);
  });

  it("rejects impossible status changes with 400, not 500", async () => {
    const { user } = await createUser();
    const admin = await createUser({ role: "admin" });
    const product = await createProduct({ stock: 4 });
    await fillCart(user._id, [{ product, quantity: 1 }]);
    const order = await placeOrder(user._id, "cod");

    const res = await request(app)
      .put(`/api/v1/admin/orders/${order._id}/status`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ status: "delivered" });
    expect(res.status).toBe(400);
  });

  it("lets customers cancel unpaid orders (stock returned) but not paid eSewa orders", async () => {
    const { user, accessToken } = await createUser();
    const product = await createProduct({ stock: 2 });
    await fillCart(user._id, [{ product, quantity: 1 }]);
    const unpaid = await placeOrder(user._id);

    const cancel = await request(app)
      .post(`/api/v1/orders/${unpaid._id}/cancel`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ reason: "Changed my mind" });
    expect(cancel.status).toBe(200);
    expect(await stockOf(product._id)).toBe(2);

    await fillCart(user._id, [{ product, quantity: 1 }]);
    const paid = await placeOrder(user._id);
    await Order.updateOne({ _id: paid._id }, { "payment.status": "paid", status: "confirmed" });

    const refused = await request(app)
      .post(`/api/v1/orders/${paid._id}/cancel`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ reason: "Changed my mind" });
    expect(refused.status).toBe(400);
    expect(refused.body.message).toMatch(/refund/);
  });
});

describe("Gateway redirects", () => {
  const original = process.env.FRONTEND_URL;
  afterEach(() => {
    process.env.FRONTEND_URL = original;
  });

  it("uses the first FRONTEND_URL when several origins are configured", async () => {
    process.env.FRONTEND_URL = "https://shop.example.com, https://www.shop.example.com";
    const res = await request(app).get("/api/v1/payments/esewa/failure/0123456789abcdef01234567");
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/^https:\/\/shop\.example\.com\/order-failed\?/);
    expect(res.headers.location).toContain("orderId=0123456789abcdef01234567");
  });

  it("redirects instead of returning JSON when the callback data is broken", async () => {
    const res = await request(app).get("/api/v1/payments/esewa/success").query({ data: "not-base64-json" });
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("/order-failed");
  });

  it("puts the order id in eSewa's failure URL", async () => {
    const { user, accessToken } = await createUser();
    const product = await createProduct({ stock: 2 });
    await fillCart(user._id, [{ product, quantity: 1 }]);
    const order = await placeOrder(user._id);

    const res = await initiate(accessToken, order._id);
    expect(res.body.data.formData.failure_url).toMatch(new RegExp(`/payments/esewa/failure/${order._id}$`));
  });
});
