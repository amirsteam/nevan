/**
 * Admin product create/update: custom sizes, variant identity, clearing fields,
 * primary image, size suggestions and cache invalidation
 */
import request from "supertest";
import app from "../app";
import Product from "../models/Product";
import Cart from "../models/Cart";
import Category from "../models/Category";
import { createUser, createProduct, fillCart } from "./helpers";

const adminToken = async () => (await createUser({ role: "admin" })).accessToken;

const baseProduct = async () => {
  const category = await Category.create({ name: `Cat ${Date.now()}-${Math.random()}` });
  return {
    name: "Muslin Romper",
    description: "Soft romper",
    price: 1200,
    category: String(category._id),
  };
};

describe("Custom variant sizes", () => {
  it("accepts custom sizes alongside built-in ones and trims them", async () => {
    const token = await adminToken();
    const res = await request(app)
      .post("/api/v1/admin/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        ...(await baseProduct()),
        variants: [
          { size: "Small Size (0-1 yrs)", color: "White", price: 1200, stock: 3 },
          { size: "  3-6 Months  ", color: "White", price: 1300, stock: 2 },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.product.variants.map((v: any) => v.size)).toEqual([
      "Small Size (0-1 yrs)",
      "3-6 Months",
    ]);
  });

  it("rejects sizes longer than 40 characters", async () => {
    const res = await request(app)
      .post("/api/v1/admin/products")
      .set("Authorization", `Bearer ${await adminToken()}`)
      .send({
        ...(await baseProduct()),
        variants: [{ size: "x".repeat(41), color: "Blue", price: 1, stock: 1 }],
      });
    expect(res.status).toBe(400);
  });

  it("rejects duplicate size/color combinations (case-insensitive)", async () => {
    const res = await request(app)
      .post("/api/v1/admin/products")
      .set("Authorization", `Bearer ${await adminToken()}`)
      .send({
        ...(await baseProduct()),
        variants: [
          { size: "2T", color: "Red", price: 1, stock: 1 },
          { size: "2t ", color: "red", price: 1, stock: 1 },
        ],
      });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Duplicate variant/);
  });

  it("lists built-in sizes plus custom sizes already in use", async () => {
    await createProduct({ variants: [{ size: "90 cm", color: "Grey", price: 900, stock: 1 }] });

    const res = await request(app)
      .get("/api/v1/admin/products/sizes")
      .set("Authorization", `Bearer ${await adminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data.sizes.builtIn).toContain("One Size");
    expect(res.body.data.sizes.custom).toEqual(["90 cm"]);
  });
});

describe("Editing a product", () => {
  it("keeps existing variant ids so shoppers' carts survive the edit", async () => {
    const product = await createProduct({
      variants: [
        { size: "2T", color: "Red", price: 900, stock: 5 },
        { size: "3T", color: "Red", price: 950, stock: 5 },
      ],
    });
    const [keep, remove] = product.variants;
    const { user } = await createUser();
    await fillCart(user._id, [
      { product, quantity: 1, variantId: keep._id },
      { product, quantity: 1, variantId: remove._id },
    ]);

    const res = await request(app)
      .put(`/api/v1/admin/products/${product._id}`)
      .set("Authorization", `Bearer ${await adminToken()}`)
      .send({
        variants: [
          { _id: String(keep._id), size: "2T", color: "Red", price: 999, stock: 4 },
          { size: "4T", color: "Red", price: 1000, stock: 2 },
        ],
      });

    expect(res.status).toBe(200);
    const updated = await Product.findById(product._id);
    expect(String(updated!.variants[0]._id)).toBe(String(keep._id));
    expect(updated!.variants[0].price).toBe(999);
    expect(updated!.variants.map((v) => v.size)).toEqual(["2T", "4T"]);

    // Only the cart line for the removed variant is dropped
    const cart = await Cart.findOne({ user: user._id });
    expect(cart!.items.map((i: any) => String(i.variantId))).toEqual([String(keep._id)]);
  });

  it("treats a variant id from another product as a new variant", async () => {
    const other = await createProduct({ variants: [{ size: "2T", color: "Red", price: 1, stock: 1 }] });
    const product = await createProduct({ variants: [{ size: "2T", color: "Blue", price: 1, stock: 1 }] });

    await request(app)
      .put(`/api/v1/admin/products/${product._id}`)
      .set("Authorization", `Bearer ${await adminToken()}`)
      .send({ variants: [{ _id: String(other.variants[0]._id), size: "5T", color: "Blue", price: 1, stock: 1 }] });

    const updated = await Product.findById(product._id);
    expect(String(updated!.variants[0]._id)).not.toBe(String(other.variants[0]._id));
  });

  it("can clear compare price, SKU and short description", async () => {
    const product = await createProduct({ comparePrice: 1500, sku: "ROMP-1", shortDescription: "Sale!" });

    const res = await request(app)
      .put(`/api/v1/admin/products/${product._id}`)
      .set("Authorization", `Bearer ${await adminToken()}`)
      .send({ comparePrice: null, sku: null, shortDescription: null });

    expect(res.status).toBe(200);
    const updated = await Product.findById(product._id).lean();
    expect(updated!.comparePrice).toBeUndefined();
    expect(updated!.sku).toBeUndefined();
    expect(updated!.shortDescription).toBeUndefined();
  });

  it("sets the primary image chosen in the form", async () => {
    const product = await createProduct({
      images: [
        { url: "https://example.com/a.jpg", isPrimary: true },
        { url: "https://example.com/b.jpg" },
      ],
    });
    const second = product.images[1];

    await request(app)
      .put(`/api/v1/admin/products/${product._id}`)
      .set("Authorization", `Bearer ${await adminToken()}`)
      .send({ primaryImageId: String(second._id) });

    const updated = await Product.findById(product._id);
    expect(updated!.images.map((img) => img.isPrimary)).toEqual([false, true]);
  });
});

describe("Featured products cache", () => {
  it("shows a newly featured product immediately", async () => {
    const first = await request(app).get("/api/v1/products/featured");
    expect(first.status).toBe(200);

    const product = await createProduct({ name: "Plain" });
    await request(app)
      .put(`/api/v1/admin/products/${product._id}`)
      .set("Authorization", `Bearer ${await adminToken()}`)
      .send({ isFeatured: true });

    const after = await request(app).get("/api/v1/products/featured");
    const ids = (after.body.data.products || []).map((p: any) => String(p._id));
    expect(ids).toContain(String(product._id));
  });
});
