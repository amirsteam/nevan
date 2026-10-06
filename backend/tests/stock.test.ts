/**
 * Product stock totals for products with variants: `stock` must always equal the
 * variants' sum, because listings, cards and the mobile app read `stock`.
 */
import request from "supertest";
import app from "../app";
import Product from "../models/Product";
import Category from "../models/Category";
import * as orderService from "../services/orderService";
import { createUser, createProduct, fillCart, shippingAddress } from "./helpers";

describe("Stock totals for products with variants", () => {
  it("sets the product stock to the variants' total when created from the admin form", async () => {
    const admin = await createUser({ role: "admin" });
    const category = await Category.create({ name: "Rompers" });

    // The web form sends stock 0 for variant products (stock is managed per variant)
    const res = await request(app)
      .post("/api/v1/admin/products")
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({
        name: "Muslin Romper",
        description: "Soft",
        price: 1200,
        category: String(category._id),
        stock: 0,
        variants: [
          { size: "2T", color: "White", price: 1200, stock: 3 },
          { size: "3T", color: "White", price: 1200, stock: 4 },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.product.stock).toBe(7);

    // The public listing (what the thumbnails use) reports it in stock
    const list = await request(app).get("/api/v1/products");
    expect(list.body.data.products[0].stock).toBe(7);
  });

  it("keeps the total in step with orders and cancellations", async () => {
    const product = await createProduct({
      variants: [
        { size: "2T", color: "Red", price: 900, stock: 2 },
        { size: "3T", color: "Red", price: 900, stock: 5 },
      ],
    });
    expect(product.stock).toBe(7);

    const { user, accessToken } = await createUser();
    await fillCart(user._id, [{ product, quantity: 2, variantId: product.variants[0]._id }]);
    const order = await orderService.createOrder(String(user._id), { shippingAddress, paymentMethod: "cod" });

    let current = await Product.findById(product._id);
    expect(current!.variants[0].stock).toBe(0);
    expect(current!.stock).toBe(5);

    await request(app)
      .post(`/api/v1/orders/${order._id}/cancel`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ reason: "Changed my mind" });

    current = await Product.findById(product._id);
    expect(current!.variants[0].stock).toBe(2);
    expect(current!.stock).toBe(7);
  });

  it("is still out of stock when every variant is sold out", async () => {
    const product = await createProduct({
      stock: 10,
      variants: [{ size: "2T", color: "Red", price: 900, stock: 0 }],
    });
    expect(product.stock).toBe(0);
  });

  it("repairs products saved before totals were kept in sync", async () => {
    const product = await createProduct({
      variants: [{ size: "2T", color: "Red", price: 900, stock: 6 }],
    });
    // Simulate old data: variants in stock, product total 0
    await Product.collection.updateOne({ _id: product._id }, { $set: { stock: 0 } });
    const plain = await createProduct({ stock: 3 });

    const changed = await Product.syncVariantStock();

    expect(changed).toBe(1);
    expect((await Product.findById(product._id))!.stock).toBe(6);
    expect((await Product.findById(plain._id))!.stock).toBe(3); // no variants: untouched
  });
});
