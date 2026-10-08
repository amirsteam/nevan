/**
 * Storefront features: age/gender filters, contact form, newsletter,
 * featured reviews
 */
import request from "supertest";
import app from "../app";
import ContactMessage from "../models/ContactMessage";
import Subscriber from "../models/Subscriber";
import Review from "../models/Review";
import { createUser, createProduct } from "./helpers";

describe("Product age and gender filters", () => {
  it("returns only products tagged with the age band", async () => {
    const newborn = await createProduct({ name: "Newborn Romper", ageGroups: ["0-3 Months", "3-6 Months"] });
    await createProduct({ name: "Toddler Jacket", ageGroups: ["1-2 Years"] });
    await createProduct({ name: "Untagged Cap" });

    const res = await request(app).get("/api/v1/products").query({ age: "3-6 Months" });

    expect(res.status).toBe(200);
    expect(res.body.data.products.map((p: any) => p._id)).toEqual([String(newborn._id)]);
  });

  it("includes unisex products for boy/girl, and only unisex for unisex", async () => {
    const boy = await createProduct({ name: "Boy Vest", gender: "boy" });
    const unisex = await createProduct({ name: "Unisex Blanket", gender: "unisex" });
    await createProduct({ name: "Girl Frock", gender: "girl" });

    const boys = await request(app).get("/api/v1/products").query({ gender: "boy" });
    expect(boys.body.data.products.map((p: any) => p._id).sort()).toEqual(
      [String(boy._id), String(unisex._id)].sort(),
    );

    const unisexOnly = await request(app).get("/api/v1/products").query({ gender: "unisex" });
    expect(unisexOnly.body.data.products.map((p: any) => p._id)).toEqual([String(unisex._id)]);
  });

  it("returns just the requested ids (recently viewed), skipping hidden and malformed ones", async () => {
    const romper = await createProduct({ name: "Romper" });
    const jhabla = await createProduct({ name: "Jhabla" });
    const hidden = await createProduct({ name: "Hidden", isActive: false });
    await createProduct({ name: "Not asked for" });

    const res = await request(app)
      .get("/api/v1/products")
      .query({ ids: [romper._id, hidden._id, "nonsense", jhabla._id, romper._id].join(",") });

    expect(res.status).toBe(200);
    expect(res.body.data.products.map((p: any) => p._id).sort()).toEqual([String(romper._id), String(jhabla._id)].sort());

    // Nothing valid asked for: nothing back, not the whole catalogue
    const none = await request(app).get("/api/v1/products").query({ ids: "nonsense" });
    expect(none.body.data.products).toEqual([]);
  });

  it("ignores unknown filter values instead of returning nothing", async () => {
    await createProduct();
    const res = await request(app).get("/api/v1/products").query({ age: "99 Years", gender: "x" });
    expect(res.body.data.products).toHaveLength(1);
  });

  it("validates age groups and gender when an admin saves a product", async () => {
    const { accessToken } = await createUser({ role: "admin" });
    const product = await createProduct();

    const bad = await request(app)
      .put(`/api/v1/admin/products/${product._id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ ageGroups: ["Teen"], gender: "other" });
    expect(bad.status).toBe(400);

    const good = await request(app)
      .put(`/api/v1/admin/products/${product._id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ ageGroups: ["0-3 Months"], gender: "girl" });
    expect(good.status).toBe(200);
    expect(good.body.data.product.ageGroups).toEqual(["0-3 Months"]);
    expect(good.body.data.product.gender).toBe("girl");

    // Clearing gender unsets it
    const cleared = await request(app)
      .put(`/api/v1/admin/products/${product._id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ gender: "" });
    expect(cleared.status).toBe(200);
    expect(cleared.body.data.product.gender).toBeUndefined();
  });
});

describe("Contact form", () => {
  it("stores the message", async () => {
    const res = await request(app).post("/api/v1/contact").send({
      name: "Asha Gurung",
      email: "Asha@Example.com",
      subject: "Sizing",
      message: "Does the romper run small for a 6 month old?",
    });

    expect(res.status).toBe(201);
    const saved = await ContactMessage.findOne();
    expect(saved?.email).toBe("asha@example.com");
    expect(saved?.isRead).toBe(false);
  });

  it("rejects short messages and bad emails", async () => {
    const res = await request(app)
      .post("/api/v1/contact")
      .send({ name: "A", email: "not-an-email", message: "hi" });
    expect(res.status).toBe(400);
    expect(await ContactMessage.countDocuments()).toBe(0);
  });

  it("lets admins list messages and mark them read", async () => {
    await ContactMessage.create({ name: "A", email: "a@example.com", message: "Hello there, a question" });
    const { accessToken } = await createUser({ role: "admin" });

    const list = await request(app)
      .get("/api/v1/admin/contact-messages")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(list.status).toBe(200);
    expect(list.body.data.unreadCount).toBe(1);

    const id = list.body.data.messages[0]._id;
    const read = await request(app)
      .put(`/api/v1/admin/contact-messages/${id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ isRead: true });
    expect(read.body.data.message.isRead).toBe(true);
  });
});

describe("Newsletter", () => {
  it("subscribes once even when submitted twice", async () => {
    const first = await request(app).post("/api/v1/newsletter/subscribe").send({ email: "parent@example.com" });
    const again = await request(app).post("/api/v1/newsletter/subscribe").send({ email: "Parent@example.com" });

    expect(first.status).toBe(200);
    expect(again.status).toBe(200);
    expect(await Subscriber.countDocuments()).toBe(1);
  });

  it("rejects invalid emails", async () => {
    const res = await request(app).post("/api/v1/newsletter/subscribe").send({ email: "nope" });
    expect(res.status).toBe(400);
  });
});

describe("Featured reviews", () => {
  it("returns approved 4-5 star reviews with a comment and a short reviewer name", async () => {
    const { user } = await createUser({ name: "Srijana Maharjan" });
    const { user: other } = await createUser({ name: "Ram" });
    const product = await createProduct({ name: "Soft Romper" });
    await Review.create({ product: product._id, user: user._id, rating: 5, comment: "So soft!", isApproved: true });
    await Review.create({ product: product._id, user: other._id, rating: 2, comment: "Too small", isApproved: true });

    const res = await request(app).get("/api/v1/reviews/featured");

    expect(res.status).toBe(200);
    expect(res.body.data.reviews).toHaveLength(1);
    expect(res.body.data.reviews[0]).toMatchObject({
      rating: 5,
      comment: "So soft!",
      reviewerName: "Srijana M.",
      product: { name: "Soft Romper" },
    });
  });
});
