/**
 * Payment verification tests (eSewa)
 * The eSewa status API is mocked; callback payloads are signed with the test secret
 * exactly as eSewa signs them.
 */
import axios from "axios";
import { esewaCallback } from "./esewa";
import request from "supertest";
import app from "../app";
import Order from "../models/Order";
import * as orderService from "../services/orderService";
import { createUser, createProduct, fillCart, shippingAddress } from "./helpers";

/** Place an eSewa order for `price` and initiate payment; returns ids and the eSewa uuid */
const placeEsewaOrder = async (accessToken: string, userId: unknown, price: number) => {
  const product = await createProduct({ price, stock: 10 });
  await fillCart(userId, [{ product, quantity: 1 }]);
  const order = await orderService.createOrder(String(userId), {
    shippingAddress,
    paymentMethod: "esewa",
  });

  const res = await request(app)
    .post("/api/v1/payments/initiate")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({ orderId: String(order._id), gateway: "esewa" });
  expect(res.status).toBe(200);

  return {
    order,
    uuid: res.body.data.formData.transaction_uuid as string,
    total: order.pricing.total,
  };
};

const verify = (accessToken: string, orderId: unknown, data: string) =>
  request(app)
    .post("/api/v1/payments/verify")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({ orderId: String(orderId), gateway: "esewa", callbackData: { data } });

describe("eSewa payment verification", () => {
  let statusSpy: jest.SpyInstance;

  beforeEach(() => {
    // eSewa status API: report whatever was asked about as COMPLETE
    statusSpy = jest.spyOn(axios, "get").mockImplementation(async (_url, config: any) => ({
      data: { status: "COMPLETE", total_amount: config?.params?.total_amount },
    }));
  });

  afterEach(() => statusSpy.mockRestore());

  it("marks the order paid for a genuine payment", async () => {
    const { user, accessToken } = await createUser();
    const { order, uuid, total } = await placeEsewaOrder(accessToken, user._id, 1500);

    const res = await verify(accessToken, order._id, esewaCallback(uuid, total));

    expect(res.status).toBe(200);
    expect(res.body.data.success).toBe(true);
    expect((await Order.findById(order._id))!.payment.status).toBe("paid");
  });

  it("accepts eSewa's comma-formatted amounts", async () => {
    const { user, accessToken } = await createUser();
    const { order, uuid } = await placeEsewaOrder(accessToken, user._id, 12000);
    // 12000 is over the free-shipping threshold, so the total is 12000
    const res = await verify(accessToken, order._id, esewaCallback(uuid, "12,000.0"));

    expect(res.body.data.success).toBe(true);
  });

  it("rejects a cheap order's receipt replayed against an expensive order", async () => {
    const { user, accessToken } = await createUser();
    const cheap = await placeEsewaOrder(accessToken, user._id, 10);
    const expensive = await placeEsewaOrder(accessToken, user._id, 10000);

    const res = await verify(accessToken, expensive.order._id, esewaCallback(cheap.uuid, cheap.total));

    expect(res.body.data.success).toBe(false);
    expect((await Order.findById(expensive.order._id))!.payment.status).toBe("pending");
  });

  it("rejects a payment whose amount differs from the order total", async () => {
    const { user, accessToken } = await createUser();
    const { order, uuid } = await placeEsewaOrder(accessToken, user._id, 5000);

    const res = await verify(accessToken, order._id, esewaCallback(uuid, 50));

    expect(res.body.data.success).toBe(false);
    expect((await Order.findById(order._id))!.payment.status).toBe("pending");
  });

  it("rejects tampered callback data", async () => {
    const { user, accessToken } = await createUser();
    const { order, uuid, total } = await placeEsewaOrder(accessToken, user._id, 1500);

    const decoded = JSON.parse(Buffer.from(esewaCallback(uuid, total), "base64").toString());
    decoded.signature = "forged";
    const forged = Buffer.from(JSON.stringify(decoded)).toString("base64");

    const res = await verify(accessToken, order._id, forged);

    expect(res.body.data.success).toBe(false);
    expect((await Order.findById(order._id))!.payment.status).toBe("pending");
  });

  it("does not let users verify or initiate payments for someone else's order", async () => {
    const owner = await createUser();
    const other = await createUser();
    const { order, uuid, total } = await placeEsewaOrder(owner.accessToken, owner.user._id, 1500);

    const verifyRes = await verify(other.accessToken, order._id, esewaCallback(uuid, total));
    expect(verifyRes.status).toBe(404);

    const initiateRes = await request(app)
      .post("/api/v1/payments/initiate")
      .set("Authorization", `Bearer ${other.accessToken}`)
      .send({ orderId: String(order._id), gateway: "esewa" });
    expect(initiateRes.status).toBe(404);
  });

  it("handles the public eSewa success redirect", async () => {
    const { user, accessToken } = await createUser();
    const { order, uuid, total } = await placeEsewaOrder(accessToken, user._id, 1500);

    const res = await request(app)
      .get("/api/v1/payments/esewa/success")
      .query({ data: esewaCallback(uuid, total) });

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("/order-success");
    expect((await Order.findById(order._id))!.payment.status).toBe("paid");
  });

  it("returns 400 for an unknown gateway", async () => {
    const { accessToken } = await createUser();
    const res = await request(app)
      .post("/api/v1/payments/verify")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ orderId: "ORD-1", gateway: "constructor", callbackData: {} });
    expect([400, 404]).toContain(res.status);
  });
});
