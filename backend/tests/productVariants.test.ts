/**
 * Products with sizes and colours: derived price/stock/options/age groups,
 * photos per colour, adopting older per-variant photos, and photo edits
 */
import request from "supertest";
import mongoose from "mongoose";
import app from "../app";
import Product from "../models/Product";
import Category from "../models/Category";
import * as productService from "../services/productService";
import { publicIdFromUrl, sortSizes, ageGroupsForSizes } from "../utils/productVariants";
import { createUser, createProduct } from "./helpers";

jest.mock("../config/cloudinary", () => ({
  ...jest.requireActual("../config/cloudinary"),
  deleteImage: jest.fn().mockResolvedValue({ result: "ok" }),
}));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { deleteImage } = require("../config/cloudinary") as { deleteImage: jest.Mock };

const cloud = (name: string) => `https://res.cloudinary.com/demo/image/upload/v1712/bivanhandicraft/products/${name}.jpg`;
const adminToken = async () => (await createUser({ role: "admin" })).accessToken;
const newCategory = async () => String((await Category.create({ name: `Cat ${Date.now()}-${Math.random()}` }))._id);

/** A product saved the old way (photo URL per variant), skipping the model hooks */
const insertLegacyProduct = async (overrides: Record<string, unknown> = {}) => {
  const _id = new mongoose.Types.ObjectId();
  await Product.collection.insertOne({
    _id,
    name: "Old Romper",
    slug: `old-romper-${_id}`,
    description: "Saved before photos per colour",
    price: 1000,
    comparePrice: 1600,
    category: new mongoose.Types.ObjectId(await newCategory()),
    stock: 6,
    isActive: true,
    images: [],
    variants: [
      { _id: new mongoose.Types.ObjectId(), size: "Small Size (0-1 yrs)", color: "Red", price: 1000, stock: 2, image: cloud("red-a") },
      { _id: new mongoose.Types.ObjectId(), size: "Medium Size (1-4 yrs)", color: "Red", price: 1200, stock: 2, image: cloud("red-b") },
      { _id: new mongoose.Types.ObjectId(), size: "Small Size (0-1 yrs)", color: "Blue", price: 1000, stock: 2, image: cloud("blue") },
    ],
    ...overrides,
  });
  return _id;
};

beforeEach(() => deleteImage.mockClear());

describe("helpers", () => {
  it("reads Cloudinary public ids from delivery URLs", () => {
    expect(publicIdFromUrl(cloud("abc"))).toBe("bivanhandicraft/products/abc");
    expect(publicIdFromUrl("https://res.cloudinary.com/demo/image/upload/c_limit,w_1200/v9/a/b.webp")).toBe("a/b");
    expect(publicIdFromUrl("https://images.unsplash.com/photo-1?w=600")).toBeNull();
  });

  it("orders sizes by age and maps them to Shop by Age bands", () => {
    expect(sortSizes(["2-3 Years", "90 cm", "0-3 Months", "One Size", "12-18 Months"])).toEqual([
      "0-3 Months",
      "12-18 Months",
      "2-3 Years",
      "One Size",
      "90 cm",
    ]);
    expect(ageGroupsForSizes(["12-18 Months", "18-24 Months", "2-3 Years"])).toEqual(["1-2 Years", "2-4 Years"]);
    expect(ageGroupsForSizes(["90 cm"])).toEqual([]);
  });
});

describe("creating a product with sizes and colours", () => {
  it("derives price, compare price, stock, option order, swatches and age groups", async () => {
    const res = await request(app)
      .post("/api/v1/admin/products")
      .set("Authorization", `Bearer ${await adminToken()}`)
      .send({
        name: "Muslin Jhabla",
        description: "Soft muslin",
        category: await newCategory(),
        // No base price: it comes from the sizes
        colors: [{ name: "Dusty Rose", hex: "#C1847B" }, { name: "Sage" }],
        variants: [
          { size: "6-12 Months", color: "dusty rose", price: 1400, comparePrice: 1800, stock: 2 },
          { size: "0-3 Months", color: "Dusty Rose", price: 1200, comparePrice: 1500, stock: 3 },
          { size: "0-3 Months", color: "sage", price: 1200, stock: 0 },
          // A compare price that isn't higher is ignored
          { size: "6-12 Months", color: "Sage", price: 1400, comparePrice: 1400, stock: 4 },
        ],
      });

    expect(res.status).toBe(201);
    const product = res.body.data.product;
    expect(product.price).toBe(1200);
    expect(product.comparePrice).toBe(1500);
    expect(product.stock).toBe(9);
    expect(product.sizes).toEqual(["0-3 Months", "6-12 Months"]);
    expect(product.colors).toEqual([
      { name: "Dusty Rose", hex: "#c1847b" },
      { name: "Sage", hex: "#9caf88" },
    ]);
    expect(product.variants.map((v: any) => v.color)).toEqual(["Dusty Rose", "Dusty Rose", "Sage", "Sage"]);
    expect(product.variants[3].comparePrice).toBeUndefined();
    expect(product.ageGroups).toEqual(["0-3 Months", "6-12 Months"]);
  });

  it("rejects a size priced at 0 and a single product without a price", async () => {
    const token = await adminToken();
    const category = await newCategory();
    const free = await request(app)
      .post("/api/v1/admin/products")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Bib", description: "Cotton bib", category, variants: [{ size: "One Size", color: "White", price: 0, stock: 1 }] });
    expect(free.status).toBe(400);
    expect(free.body.message).toMatch(/more than 0/);

    const noPrice = await request(app)
      .post("/api/v1/admin/products")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Bib", description: "Cotton bib", category, stock: 3 });
    expect(noPrice.status).toBe(400);
    expect(noPrice.body.message).toMatch(/Price is required/);
  });
});

describe("older products with a photo per variant", () => {
  it("are shown to the editor with photos per colour, with stable photo ids", async () => {
    const id = await insertLegacyProduct();
    const token = await adminToken();
    const get = () => request(app).get(`/api/v1/admin/products/${id}`).set("Authorization", `Bearer ${token}`);

    const first = await get();
    const images = first.body.data.product.images;
    expect(images.map((img: any) => [img.url, img.color, img.publicId])).toEqual([
      [cloud("red-a"), "Red", "bivanhandicraft/products/red-a"],
      [cloud("red-b"), "Red", "bivanhandicraft/products/red-b"],
      [cloud("blue"), "Blue", "bivanhandicraft/products/blue"],
    ]);
    expect((await get()).body.data.product.images.map((img: any) => img._id)).toEqual(images.map((img: any) => img._id));
    // Nothing is written by viewing
    expect((await Product.collection.findOne({ _id: id }))!.images).toEqual([]);
  });

  it("keep their photos when an app saves variants without them (mobile bug)", async () => {
    const id = await insertLegacyProduct();
    const legacy = await Product.collection.findOne({ _id: id });
    const res = await request(app)
      .put(`/api/v1/admin/products/${id}`)
      .set("Authorization", `Bearer ${await adminToken()}`)
      .send({
        variants: legacy!.variants.map((v: any) => ({ _id: String(v._id), size: v.size, color: v.color, price: v.price + 50, stock: v.stock })),
      });

    expect(res.status).toBe(200);
    const saved = await Product.findById(id);
    expect(saved!.images.map((img) => img.url)).toEqual([cloud("red-a"), cloud("red-b"), cloud("blue")]);
    // Every size of a colour shows that colour's first photo
    expect(saved!.variants.map((v) => v.image)).toEqual([cloud("red-a"), cloud("red-a"), cloud("blue")]);
    // The old product-wide compare price now sits on each size it was higher than
    expect(saved!.variants.map((v) => v.comparePrice)).toEqual([1600, 1600, 1600]);
    expect(saved!.ageGroups).toEqual(["0-3 Months", "3-6 Months", "6-12 Months", "1-2 Years", "2-4 Years"]);
  });

  it("get photos already in the gallery tagged with their colour; photos shared by colours stay general", async () => {
    const id = await insertLegacyProduct({
      images: [
        { _id: new mongoose.Types.ObjectId(), url: cloud("red-a"), isPrimary: true },
        { _id: new mongoose.Types.ObjectId(), url: cloud("both") },
      ],
      variants: [
        { _id: new mongoose.Types.ObjectId(), size: "0-3 Months", color: "Red", price: 900, stock: 1, image: cloud("red-a") },
        { _id: new mongoose.Types.ObjectId(), size: "3-6 Months", color: "red", price: 900, stock: 1, image: cloud("red-a") },
        { _id: new mongoose.Types.ObjectId(), size: "0-3 Months", color: "Blue", price: 900, stock: 1, image: cloud("both") },
        { _id: new mongoose.Types.ObjectId(), size: "3-6 Months", color: "Red", price: 950, stock: 1, image: cloud("both") },
      ],
    });
    await request(app)
      .put(`/api/v1/admin/products/${id}`)
      .set("Authorization", `Bearer ${await adminToken()}`)
      .send({ isFeatured: true });

    const saved = await Product.findById(id);
    expect(saved!.images.map((img) => [img.url, img.color])).toEqual([
      [cloud("red-a"), "Red"],
      [cloud("both"), null],
    ]);
    expect(saved!.variants.map((v) => v.image)).toEqual([cloud("red-a"), cloud("red-a"), null, cloud("red-a")]);
  });

  it("have every photo removed from Cloudinary when deleted", async () => {
    const id = await insertLegacyProduct();
    await request(app).delete(`/api/v1/admin/products/${id}`).set("Authorization", `Bearer ${await adminToken()}`);
    expect(deleteImage.mock.calls.map(([publicId]) => publicId).sort()).toEqual([
      "bivanhandicraft/products/blue",
      "bivanhandicraft/products/red-a",
      "bivanhandicraft/products/red-b",
    ]);
  });
});

describe("editing photos", () => {
  it("reorders, recolours and removes photos, deleting removed ones from Cloudinary after saving", async () => {
    const product = await createProduct({
      colors: [{ name: "Red" }, { name: "Blue" }],
      variants: [
        { size: "0-3 Months", color: "Red", price: 900, stock: 1 },
        { size: "0-3 Months", color: "Blue", price: 900, stock: 1 },
      ],
      images: [
        { url: cloud("a"), publicId: "p/a", isPrimary: true },
        { url: cloud("b"), publicId: "p/b", color: "Red" },
        { url: cloud("c"), publicId: "p/c", color: "Blue" },
      ],
    });
    const [a, b, c] = product.images;

    const res = await request(app)
      .put(`/api/v1/admin/products/${product._id}`)
      .set("Authorization", `Bearer ${await adminToken()}`)
      .send({
        images: [
          { _id: String(c._id), color: "Blue", isPrimary: true },
          { _id: String(a._id), color: "red" },
        ],
      });

    expect(res.status).toBe(200);
    const saved = await Product.findById(product._id);
    expect(saved!.images.map((img) => [img.url, img.color, img.isPrimary])).toEqual([
      [cloud("c"), "Blue", true],
      [cloud("a"), "Red", false],
    ]);
    expect(saved!.variants.map((v) => v.image)).toEqual([cloud("a"), cloud("c")]);
    expect(deleteImage).toHaveBeenCalledTimes(1);
    expect(deleteImage).toHaveBeenCalledWith("p/b");
    expect(String(b._id)).not.toBe(String(a._id));
  });

  it("doesn't bring back colour photos after all of them are removed", async () => {
    const product = await createProduct({
      variants: [{ size: "0-3 Months", color: "Red", price: 900, stock: 1 }],
      images: [
        { url: cloud("general"), publicId: "p/general" },
        { url: cloud("red"), publicId: "p/red", color: "Red" },
      ],
    });
    expect(product.variants[0].image).toBe(cloud("red"));

    await request(app)
      .put(`/api/v1/admin/products/${product._id}`)
      .set("Authorization", `Bearer ${await adminToken()}`)
      .send({ images: [{ _id: String(product.images[0]._id) }] });

    const saved = await Product.findById(product._id);
    expect(saved!.images.map((img) => img.url)).toEqual([cloud("general")]);
    expect(saved!.variants[0].image).toBeNull();
  });

  it("rejects photo ids that aren't on the product", async () => {
    const product = await createProduct();
    const res = await request(app)
      .put(`/api/v1/admin/products/${product._id}`)
      .set("Authorization", `Bearer ${await adminToken()}`)
      .send({ images: [{ _id: String(new mongoose.Types.ObjectId()) }] });
    expect(res.status).toBe(400);
  });

  it("tags uploaded photos with a colour and can make one primary", async () => {
    const product = await createProduct({
      variants: [{ size: "0-3 Months", color: "Mint", price: 800, stock: 1 }],
    });
    const saved = await productService.addProductImages(
      String(product._id),
      [
        { path: cloud("m1"), filename: "p/m1" },
        { path: cloud("m2"), filename: "p/m2" },
      ],
      undefined,
      [{ color: "mint" }, { color: "Nope", isPrimary: true }],
    );
    expect(saved.images.map((img) => [img.publicId, img.color, img.isPrimary])).toEqual([
      // The test helper's default photo
      [undefined, null, false],
      ["p/m1", "Mint", false],
      ["p/m2", null, true],
    ]);
    expect(saved.variants[0].image).toBe(cloud("m1"));
  });

  it("puts a photo uploaded for one variant first in its colour (older apps)", async () => {
    const product = await createProduct({
      variants: [
        { size: "0-3 Months", color: "Mint", price: 800, stock: 1 },
        { size: "3-6 Months", color: "Mint", price: 850, stock: 1 },
      ],
      images: [{ url: cloud("old-mint"), publicId: "p/old", color: "Mint" }],
    });
    const saved = await productService.uploadVariantImage(String(product._id), String(product.variants[1]._id), {
      path: cloud("new-mint"),
      filename: "p/new",
    });
    expect(saved.images.map((img) => img.url)).toEqual([cloud("new-mint"), cloud("old-mint")]);
    expect(saved.variants.map((v) => v.image)).toEqual([cloud("new-mint"), cloud("new-mint")]);
  });

  it("turns colour photos into general photos when variants are switched off", async () => {
    const product = await createProduct({
      variants: [{ size: "0-3 Months", color: "Mint", price: 800, stock: 1 }],
      images: [{ url: cloud("mint"), color: "Mint" }],
    });
    const res = await request(app)
      .put(`/api/v1/admin/products/${product._id}`)
      .set("Authorization", `Bearer ${await adminToken()}`)
      .send({ variants: [], price: 750, stock: 4 });

    expect(res.status).toBe(200);
    const saved = await Product.findById(product._id);
    expect(saved!.images[0].color).toBeNull();
    expect(saved!.colors).toEqual([]);
    expect(saved!.sizes).toEqual([]);
    expect([saved!.price, saved!.stock]).toEqual([750, 4]);
  });
});

describe("product form options", () => {
  it("offers the size scale, the colour palette and colours used on other products", async () => {
    await createProduct({
      colors: [{ name: "Marigold", hex: "#f2a30f" }],
      variants: [
        { size: "90 cm", color: "Marigold", price: 900, stock: 1 },
        { size: "90 cm", color: "Red", price: 900, stock: 1 },
      ],
    });
    const res = await request(app)
      .get("/api/v1/admin/products/options")
      .set("Authorization", `Bearer ${await adminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data.sizes.builtIn[0]).toBe("0-3 Months");
    expect(res.body.data.sizes.custom).toEqual(["90 cm"]);
    expect(res.body.data.colors.palette).toContainEqual({ name: "Red", hex: "#c62828" });
    // Red is already in the palette, so only Marigold is listed as used
    expect(res.body.data.colors.used).toEqual([{ name: "Marigold", hex: "#f2a30f" }]);
  });
});
