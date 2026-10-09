/**
 * Payments the shopper never came back from (reconciliation with the gateway),
 * "can't tell yet" vs "failed", duplicate payments, races between confirming and
 * cancelling, and COD orders placed in one request.
 * eSewa's status API is mocked per transaction.
 */
import axios from "axios";
import request from "supertest";
import app from "../app";
import Order from "../models/Order";
import Product from "../models/Product";
import Payment from "../models/Payment";
import Cart from "../models/Cart";
import * as orderService from "../services/orderService";
import { PaymentService } from "../services/payment";
import { createUser, createProduct, fillCart, shippingAddress } from "./helpers";
import { esewaCallback } from "./esewa";

const placeOrder = (userId: unknown, paymentMethod: "cod" | "esewa" = "esewa") =>
  orderService.createOrder(String(userId), { shippingAddress, paymentMethod });

const initiate = (token: string, orderId: unknown, gateway = "esewa") =>
  request(app)
    .post("/api/v1/payments/initiate")
    .set("Authorization", `Bearer ${token}`)
    .send({ orderId: String(orderId), gateway });

const startPayment = async (token: string, orderId: unknown): Promise<string> => {
  const res = await initiate(token, orderId);
  expect(res.status).toBe(200);
  return res.body.data.formData.transaction_uuid;
};

const returnFromEsewa = (uuid: string, amount: number) =>
  request(app).get("/api/v1/payments/esewa/success").query({ data: esewaCallback(uuid, amount) });

// Age an order and its payment attempts (createdAt is immutable through Mongoose)
const backdate = async (orderId: unknown, minutesAgo: number) => {
  const at = new Date(Date.now() - minutesAgo * 60 * 1000);
  await Order.collection.updateOne({ _id: orderId as any }, { $set: { createdAt: at } });
  await Payment.collection.updateMany({ order: orderId as any }, { $set: { initiatedAt: at } });
};

const stockOf = async (productId: unknown) => (await Product.findById(productId))!.stock;

/** eSewa's status API: `statuses[transaction_uuid]`, NOT_FOUND for anything else */
let statuses: Record<string, string | Error> = {};
let statusSpy: jest.SpyInstance;
beforeEach(() => {
  statuses = {};
  statusSpy = jest.spyOn(axios, "get").mockImplementation(async (_url, config: any) => {
    const answer = statuses[config?.params?.transaction_uuid] ?? "NOT_FOUND";
    if (answer instanceof Error) throw answer;
    return { data: { status: answer, total_amount: config?.params?.total_amount, ref_id: "REF123" } };
  });
});
afterEach(() => statusSpy.mockRestore());

describe("Payments the shopper never came back from", () => {
  it("marks an expired order paid instead of cancelling it when eSewa says it was paid", async () => {
    const { user, accessToken } = await createUser();
    const product = await createProduct({ stock: 3 });
    await fillCart(user._id, [{ product, quantity: 1 }]);
    const order = await placeOrder(user._id);
    const uuid = await startPayment(accessToken, order._id);

    // Paid on eSewa, then the tab closed before the redirect
    statuses[uuid] = "COMPLETE";
    await backdate(order._id, 31);

    const result = await PaymentService.settleOnlinePayments(30);
    expect(result.expired).toBe(0);

    const saved = await Order.findById(order._id);
    expect(saved!.payment.status).toBe("paid");
    expect(saved!.status).toBe("confirmed");
    expect(await stockOf(product._id)).toBe(2);
    expect((await Payment.findOne({ order: order._id }))!.status).toBe("completed");
    expect((await Cart.findOne({ user: user._id }))!.items).toHaveLength(0);
  });

  it("keeps an order eSewa is still processing, and cancels one eSewa has no payment for", async () => {
    const { user, accessToken } = await createUser();
    const other = await createUser();
    const product = await createProduct({ stock: 5 });

    await fillCart(user._id, [{ product, quantity: 1 }]);
    const processing = await placeOrder(user._id);
    statuses[await startPayment(accessToken, processing._id)] = "PENDING";

    await fillCart(other.user._id, [{ product, quantity: 1 }]);
    const abandoned = await placeOrder(other.user._id);
    await startPayment(other.accessToken, abandoned._id); // NOT_FOUND

    await backdate(processing._id, 31);
    await backdate(abandoned._id, 31);
    expect((await PaymentService.settleOnlinePayments(30)).expired).toBe(1);

    expect((await Order.findById(processing._id))!.status).toBe("pending");
    expect((await Order.findById(abandoned._id))!.status).toBe("cancelled");
    expect(await stockOf(product._id)).toBe(4);
  });

  it("counts the payment window from the latest attempt, not from when the order was placed", async () => {
    const { user, accessToken } = await createUser();
    const product = await createProduct({ stock: 2 });
    await fillCart(user._id, [{ product, quantity: 1 }]);
    const order = await placeOrder(user._id);
    await backdate(order._id, 40);

    await startPayment(accessToken, order._id); // retry just now
    expect(await orderService.expireUnpaidOrders(30)).toBe(0);
    expect((await Order.findById(order._id))!.status).toBe("pending");
  });

  it("finds money paid for an order that was replaced by a newer one", async () => {
    const { user, accessToken } = await createUser();
    const product = await createProduct({ stock: 5 });
    await fillCart(user._id, [{ product, quantity: 1 }]);
    const first = await placeOrder(user._id);
    const uuid = await startPayment(accessToken, first._id);

    // The shopper paid, the redirect got lost, and they placed the order again
    await placeOrder(user._id);
    expect((await Order.findById(first._id))!.status).toBe("cancelled");
    // The gateway attempt stays open so late money can still be found
    expect((await Payment.findOne({ order: first._id }))!.status).toBe("pending");

    statuses[uuid] = "COMPLETE";
    await Payment.collection.updateMany({ order: first._id }, { $set: { initiatedAt: new Date(Date.now() - 5 * 60 * 1000) } });
    expect((await PaymentService.settleOnlinePayments(30)).paid).toBe(1);

    const reopened = await Order.findById(first._id);
    expect(reopened!.status).toBe("confirmed");
    expect(reopened!.payment.status).toBe("paid");
  });

  it("leaves attempts made by the live site alone when running against the sandbox (shared database)", async () => {
    const { user, accessToken } = await createUser();
    const product = await createProduct({ stock: 2 });
    await fillCart(user._id, [{ product, quantity: 1 }]);
    const order = await placeOrder(user._id);
    await startPayment(accessToken, order._id);
    // As if production had started this payment
    await Payment.collection.updateMany(
      { order: order._id },
      { $set: { "metadata.live": true, initiatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000) } },
    );

    await backdate(order._id, 120);
    await Payment.collection.updateMany({ order: order._id }, { $set: { "metadata.live": true } });

    expect((await PaymentService.settleOnlinePayments(30)).expired).toBe(0);
    expect(statusSpy).not.toHaveBeenCalled();
    expect((await Payment.findOne({ order: order._id }))!.status).toBe("pending");
    // Expiring it is the live site's call, after it has asked eSewa
    expect((await Order.findById(order._id))!.status).toBe("pending");
  });

  it("settles an attempt as failed only after the shopper can't still be paying", async () => {
    const { user, accessToken } = await createUser();
    const product = await createProduct({ stock: 2 });
    await fillCart(user._id, [{ product, quantity: 1 }]);
    const order = await placeOrder(user._id);
    await startPayment(accessToken, order._id);

    await Payment.collection.updateMany({ order: order._id }, { $set: { initiatedAt: new Date(Date.now() - 10 * 60 * 1000) } });
    await PaymentService.settleOnlinePayments(30);
    expect((await Payment.findOne({ order: order._id }))!.status).toBe("pending");

    await Payment.collection.updateMany({ order: order._id }, { $set: { initiatedAt: new Date(Date.now() - 61 * 60 * 1000) } });
    await PaymentService.settleOnlinePayments(30);
    expect((await Payment.findOne({ order: order._id }))!.status).toBe("failed");
  });
});

describe("Retrying a payment", () => {
  it("doesn't take a second payment when the first one went through", async () => {
    const { user, accessToken } = await createUser();
    const product = await createProduct({ stock: 2 });
    await fillCart(user._id, [{ product, quantity: 1 }]);
    const order = await placeOrder(user._id);
    statuses[await startPayment(accessToken, order._id)] = "COMPLETE";

    const retry = await initiate(accessToken, order._id);
    expect(retry.status).toBe(200);
    expect(retry.body.data.alreadyPaid).toBe(true);
    expect(retry.body.data.formData).toBeUndefined();
    expect(await Payment.countDocuments({ order: order._id })).toBe(1);
    expect((await Order.findById(order._id))!.payment.status).toBe("paid");
  });

  it("asks the shopper to wait while eSewa is still confirming the last payment", async () => {
    const { user, accessToken } = await createUser();
    const product = await createProduct({ stock: 2 });
    await fillCart(user._id, [{ product, quantity: 1 }]);
    const order = await placeOrder(user._id);
    statuses[await startPayment(accessToken, order._id)] = "AMBIGUOUS";

    const retry = await initiate(accessToken, order._id);
    expect(retry.status).toBe(409);
    expect(retry.body.message).toMatch(/still being confirmed/);
  });

  it("lets the shopper retry after going back from eSewa without paying", async () => {
    const { user, accessToken } = await createUser();
    const product = await createProduct({ stock: 2 });
    await fillCart(user._id, [{ product, quantity: 1 }]);
    const order = await placeOrder(user._id);
    await startPayment(accessToken, order._id); // NOT_FOUND

    const retry = await initiate(accessToken, order._id);
    expect(retry.status).toBe(200);
    expect(retry.body.data.formData.transaction_uuid).toBeDefined();
  });

  it("reports the order paid from check-status once the gateway confirms it", async () => {
    const { user, accessToken } = await createUser();
    const product = await createProduct({ stock: 2 });
    await fillCart(user._id, [{ product, quantity: 1 }]);
    const order = await placeOrder(user._id);
    const uuid = await startPayment(accessToken, order._id);

    const check = () =>
      request(app)
        .post("/api/v1/payments/check-status")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ orderId: String(order._id) });

    statuses[uuid] = "PENDING";
    const waiting = await check();
    expect(waiting.status).toBe(200);
    expect(waiting.body.data).toMatchObject({ paymentStatus: "pending", processing: true });

    statuses[uuid] = "COMPLETE";
    const paid = await check();
    expect(paid.body.data).toMatchObject({ paymentStatus: "paid", status: "confirmed", processing: false });

    const someoneElse = await createUser();
    const denied = await request(app)
      .post("/api/v1/payments/check-status")
      .set("Authorization", `Bearer ${someoneElse.accessToken}`)
      .send({ orderId: String(order._id) });
    expect(denied.status).toBe(404);
  });
});

describe("Coming back while the payment can't be confirmed yet", () => {
  it("shows 'confirming' (not 'failed') and keeps the attempt open when eSewa can't be reached", async () => {
    const { user, accessToken } = await createUser();
    const product = await createProduct({ stock: 2 });
    await fillCart(user._id, [{ product, quantity: 1 }]);
    const order = await placeOrder(user._id);
    const uuid = await startPayment(accessToken, order._id);
    statuses[uuid] = new Error("timeout of 15000ms exceeded");

    const res = await returnFromEsewa(uuid, order.pricing.total);
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("/order-success?");
    expect(res.headers.location).toContain("payment=pending");
    expect((await Payment.findOne({ order: order._id }))!.status).toBe("pending");

    // eSewa answers later: the next upkeep run confirms it
    statuses[uuid] = "COMPLETE";
    await Payment.collection.updateMany({ order: order._id }, { $set: { initiatedAt: new Date(Date.now() - 3 * 60 * 1000) } });
    await PaymentService.settleOnlinePayments(30);
    expect((await Order.findById(order._id))!.payment.status).toBe("paid");
  });

  it("tells the shopper a refund is coming when late money can't be matched to stock", async () => {
    const { user, accessToken } = await createUser();
    const product = await createProduct({ stock: 1 });
    await fillCart(user._id, [{ product, quantity: 1 }]);
    const order = await placeOrder(user._id);
    const uuid = await startPayment(accessToken, order._id);
    await backdate(order._id, 31);
    await orderService.expireUnpaidOrders(30);
    await Product.updateOne({ _id: product._id }, { stock: 0 });

    statuses[uuid] = "COMPLETE";
    const res = await returnFromEsewa(uuid, order.pricing.total);
    expect(res.headers.location).toContain("/order-failed?");
    expect(res.headers.location).toContain("status=refund_required");
  });
});

describe("Paying twice", () => {
  it("keeps the order and flags the second payment for a refund", async () => {
    const { user, accessToken } = await createUser();
    const admin = await createUser({ role: "admin" });
    const product = await createProduct({ stock: 2 });
    await fillCart(user._id, [{ product, quantity: 1 }]);
    const order = await placeOrder(user._id);

    // Two tabs: two attempts, both paid
    const first = await startPayment(accessToken, order._id);
    const second = await startPayment(accessToken, order._id);
    statuses[first] = "COMPLETE";
    statuses[second] = "COMPLETE";

    expect((await returnFromEsewa(first, order.pricing.total)).headers.location).not.toContain("payment=");
    const again = await returnFromEsewa(second, order.pricing.total);
    expect(again.headers.location).toContain("/order-success?");
    expect(again.headers.location).toContain("payment=duplicate");

    const saved = await Order.findById(order._id);
    expect(saved!.status).toBe("confirmed");
    expect(saved!.payment.refundRequired).toBe(true);
    expect(saved!.statusHistory.at(-1)!.note).toMatch(/Second payment .* refund required/);
    expect(await stockOf(product._id)).toBe(1); // stock taken once

    const badges = await request(app).get("/api/v1/admin/badges").set("Authorization", `Bearer ${admin.accessToken}`);
    expect(badges.body.data.refundRequired).toBe(1);
    const list = await request(app)
      .get("/api/v1/admin/orders")
      .query({ refundRequired: "true", search: order.orderNumber })
      .set("Authorization", `Bearer ${admin.accessToken}`);
    expect(list.status).toBe(200);
    expect(list.body.data.orders.map((o: any) => o.orderNumber)).toEqual([order.orderNumber]);
  });

  it("treats the same payment confirmed twice (page reload) as one payment", async () => {
    const { user, accessToken } = await createUser();
    const product = await createProduct({ stock: 2 });
    await fillCart(user._id, [{ product, quantity: 1 }]);
    const order = await placeOrder(user._id);
    const uuid = await startPayment(accessToken, order._id);
    statuses[uuid] = "COMPLETE";
    const data = esewaCallback(uuid, order.pricing.total);

    await request(app).get("/api/v1/payments/esewa/success").query({ data });
    const reload = await request(app).get("/api/v1/payments/esewa/success").query({ data });
    expect(reload.headers.location).not.toContain("payment=duplicate");
    expect((await Order.findById(order._id))!.payment.refundRequired).toBeUndefined();
  });
});

describe("Confirming and cancelling at the same moment", () => {
  it("takes the stock exactly once when a payment lands while the order expires", async () => {
    const { user, accessToken } = await createUser();
    const product = await createProduct({ stock: 2 });
    await fillCart(user._id, [{ product, quantity: 1 }]);
    const order = await placeOrder(user._id);
    const uuid = await startPayment(accessToken, order._id);
    statuses[uuid] = "COMPLETE";
    await backdate(order._id, 31);

    await Promise.all([returnFromEsewa(uuid, order.pricing.total), orderService.expireUnpaidOrders(30)]);

    const saved = await Order.findById(order._id);
    expect(saved!.payment.status).toBe("paid");
    expect(saved!.status).toBe("confirmed");
    expect(await stockOf(product._id)).toBe(1);
  });

  it("reopens a cancelled order only once when its payment is confirmed twice at the same time", async () => {
    const { user, accessToken } = await createUser();
    const product = await createProduct({ stock: 3 });
    await fillCart(user._id, [{ product, quantity: 1 }]);
    const order = await placeOrder(user._id);
    const uuid = await startPayment(accessToken, order._id);
    await backdate(order._id, 31);
    await orderService.expireUnpaidOrders(30);
    expect(await stockOf(product._id)).toBe(3);

    statuses[uuid] = "COMPLETE";
    const data = esewaCallback(uuid, order.pricing.total);
    await Promise.all([
      request(app).get("/api/v1/payments/esewa/success").query({ data }),
      request(app).get("/api/v1/payments/esewa/success").query({ data }),
    ]);

    expect(await stockOf(product._id)).toBe(2);
    expect((await Order.findById(order._id))!.status).toBe("confirmed");
  });

  it("returns the stock once when the customer cancels while the order expires", async () => {
    const { user, accessToken } = await createUser();
    const product = await createProduct({ stock: 3 });
    await fillCart(user._id, [{ product, quantity: 2 }]);
    const order = await placeOrder(user._id);
    await backdate(order._id, 31);

    await Promise.all([
      request(app)
        .post(`/api/v1/orders/${order._id}/cancel`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ reason: "Changed my mind" }),
      orderService.expireUnpaidOrders(30),
    ]);

    expect(await stockOf(product._id)).toBe(3);
    expect((await Order.findById(order._id))!.status).toBe("cancelled");
  });

  it("returns the stock once when two admins cancel the same order", async () => {
    const { user } = await createUser();
    const admin = await createUser({ role: "admin" });
    const product = await createProduct({ stock: 4 });
    await fillCart(user._id, [{ product, quantity: 3 }]);
    const order = await placeOrder(user._id, "cod");

    const cancel = () =>
      request(app)
        .put(`/api/v1/admin/orders/${order._id}/status`)
        .set("Authorization", `Bearer ${admin.accessToken}`)
        .send({ status: "cancelled", note: "Out of fabric" });
    const results = await Promise.all([cancel(), cancel()]);

    expect(results.map((r) => r.status).sort()).toEqual([200, expect.any(Number)]);
    expect(await stockOf(product._id)).toBe(4);
  });

  it("won't confirm an order from a stale copy after it was cancelled", async () => {
    const { user } = await createUser();
    const admin = await createUser({ role: "admin" });
    const product = await createProduct({ stock: 2 });
    await fillCart(user._id, [{ product, quantity: 1 }]);
    const order = await placeOrder(user._id, "cod");

    const stale = await Order.findById(order._id);
    await orderService.updateOrderStatus(String(order._id), "cancelled", String(admin.user._id), "Out of fabric");

    await expect((stale as any).updateOrderStatus("confirmed", admin.user._id, "")).rejects.toMatchObject({
      statusCode: 409,
    });
    expect((await Order.findById(order._id))!.status).toBe("cancelled");
  });
});

describe("Cash on delivery", () => {
  it("records the payment when the order is placed, and initiating again adds nothing", async () => {
    const { user, accessToken } = await createUser();
    const product = await createProduct({ stock: 2 });
    await fillCart(user._id, [{ product, quantity: 1 }]);
    const order = await placeOrder(user._id, "cod");

    const payments = await Payment.find({ order: order._id });
    expect(payments).toHaveLength(1);
    expect(payments[0]).toMatchObject({ gateway: "cod", status: "pending", amount: order.pricing.total });

    // Older app versions still call initiate after placing a COD order
    const res = await initiate(accessToken, order._id, "cod");
    expect(res.status).toBe(200);
    expect(res.body.data.requiresRedirect).toBe(false);
    expect(await Payment.countDocuments({ order: order._id })).toBe(1);
  });

  it("won't mark a cancelled COD order as paid", async () => {
    const { user } = await createUser();
    const admin = await createUser({ role: "admin" });
    const product = await createProduct({ stock: 2 });
    await fillCart(user._id, [{ product, quantity: 1 }]);
    const order = await placeOrder(user._id, "cod");
    await orderService.updateOrderStatus(String(order._id), "cancelled", String(admin.user._id), "");

    const res = await request(app)
      .post("/api/v1/admin/payments/cod-collected")
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ orderId: String(order._id) });
    expect(res.status).toBe(400);
    expect((await Order.findById(order._id))!.payment.status).toBe("pending");
  });
});

describe("Checkout input", () => {
  it("charges the Kathmandu Valley rate when the province arrives as text", async () => {
    const { user, accessToken } = await createUser();
    const product = await createProduct({ stock: 2, price: 1000 });
    await fillCart(user._id, [{ product, quantity: 1 }]);

    const res = await request(app)
      .post("/api/v1/orders")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ shippingAddress: { ...shippingAddress, province: "3" }, paymentMethod: "cod" });
    expect(res.status).toBe(201);
    expect(res.body.data.order.pricing.shippingCost).toBe(100);
  });

  it("rejects order notes longer than 500 characters", async () => {
    const { user, accessToken } = await createUser();
    const product = await createProduct({ stock: 2 });
    await fillCart(user._id, [{ product, quantity: 1 }]);

    const res = await request(app)
      .post("/api/v1/orders")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ shippingAddress, paymentMethod: "cod", customerNotes: "x".repeat(501) });
    expect(res.status).toBe(400);
  });

  it("doesn't let the cart hold more than is in stock across several adds", async () => {
    const { accessToken } = await createUser();
    const product = await createProduct({ stock: 3 });
    const add = (quantity: number) =>
      request(app)
        .post("/api/v1/cart/items")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ productId: String(product._id), quantity });

    expect((await add(2)).status).toBe(200);
    const tooMany = await add(2);
    expect(tooMany.status).toBe(400);
    expect(tooMany.body.message).toMatch(/already have 2/);
  });
});
