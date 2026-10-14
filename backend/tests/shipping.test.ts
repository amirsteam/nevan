/**
 * Shipping: the rate rule, district checking, the checkout quote, and that the
 * quote matches what placing the order charges.
 */
import request from "supertest";
import app from "../app";
import Campaign from "../models/Campaign";
import { clearCampaignCache } from "../services/campaignService";
import { calculateShippingCost, DEFAULT_SHIPPING_SETTINGS, ShippingSettings } from "../utils/shipping";
import { canonicalDistrict } from "../utils/nepal";
import { createUser, createProduct, fillCart, shippingAddress } from "./helpers";

const FREE_SHIPPING_THRESHOLD = DEFAULT_SHIPPING_SETTINGS.freeShippingThreshold;

beforeEach(() => clearCampaignCache());

describe("canonicalDistrict", () => {
  it("accepts any case, the word 'district' and common alternative spellings", () => {
    expect(canonicalDistrict(3, "  kathmandu ")).toBe("Kathmandu");
    expect(canonicalDistrict(3, "Kathmandu District")).toBe("Kathmandu");
    expect(canonicalDistrict(3, "KTM")).toBe("Kathmandu");
    expect(canonicalDistrict(3, "Patan")).toBe("Lalitpur");
    expect(canonicalDistrict(3, "kavre")).toBe("Kavrepalanchok");
    expect(canonicalDistrict(4, "Pokhara")).toBe("Kaski");
  });

  it("uses the province to pick between districts sharing a name", () => {
    expect(canonicalDistrict(5, "Rukum")).toBe("Rukum East");
    expect(canonicalDistrict(6, "Rukum")).toBe("Rukum West");
    expect(canonicalDistrict(4, "Nawalparasi")).toBe("Nawalpur");
    expect(canonicalDistrict(5, "Nawalparasi")).toBe("Parasi");
  });

  it("rejects districts outside the province and unknown names", () => {
    expect(canonicalDistrict(5, "Kathmandu")).toBeNull();
    expect(canonicalDistrict(3, "Baneshwor")).toBeNull();
    expect(canonicalDistrict(9, "Kathmandu")).toBeNull();
  });
});

describe("calculateShippingCost", () => {
  it("charges by destination below the threshold and nothing from it", () => {
    expect(calculateShippingCost({ province: 3, district: "KTM" }, 1000)).toBe(100);
    expect(calculateShippingCost({ province: 3, district: "Chitwan" }, 1000)).toBe(150);
    expect(calculateShippingCost({ province: 4, district: "Kaski" }, 1000)).toBe(200);
    expect(calculateShippingCost({ province: 7, district: "Kailali" }, FREE_SHIPPING_THRESHOLD - 1)).toBe(300);
    expect(calculateShippingCost({ province: 7, district: "Kailali" }, FREE_SHIPPING_THRESHOLD)).toBe(0);
  });

  it("delivers free anywhere in Kavre district (the shop's home district) by default", () => {
    expect(calculateShippingCost({ province: 3, district: "Kavre", city: "Panauti" }, 1000)).toBe(0);
    expect(calculateShippingCost({ province: 3, district: "Kavrepalanchok", city: "Banepa" }, 1000)).toBe(0);
    expect(calculateShippingCost({ province: 3, district: "Sindhupalchok", city: "Panauti" }, 1000)).toBe(150);
  });

  it("can limit a free area to one town", () => {
    const settings: ShippingSettings = { ...DEFAULT_SHIPPING_SETTINGS, freeAreas: [{ district: "Kaski", city: "Pokhara" }] };
    expect(calculateShippingCost({ province: 4, district: "Kaski", city: "Pokhara-8, Lakeside" }, 1000, settings)).toBe(0);
    expect(calculateShippingCost({ province: 4, district: "Kaski", city: "Lekhnath" }, 1000, settings)).toBe(200);
    expect(calculateShippingCost({ province: 3, district: "Kavre", city: "Panauti" }, 1000, settings)).toBe(150);
  });
});

describe("Order address district", () => {
  const placeOrder = async (address: Partial<typeof shippingAddress>) => {
    const { user, accessToken } = await createUser();
    const product = await createProduct({ price: 1000, stock: 5 });
    await fillCart(user._id, [{ product, quantity: 1 }]);
    return request(app)
      .post("/api/v1/orders")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ shippingAddress: { ...shippingAddress, ...address }, paymentMethod: "cod" });
  };

  it("stores the standard spelling and charges the valley rate for it", async () => {
    const res = await placeOrder({ province: 3, district: "ktm" });
    expect(res.status).toBe(201);
    expect(res.body.data.order.shippingAddress.district).toBe("Kathmandu");
    expect(res.body.data.order.pricing.shippingCost).toBe(100);
  });

  it("refuses a district that isn't in the chosen province", async () => {
    const res = await placeOrder({ province: 5, district: "Kathmandu" });
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toContain("isn't a district in Lumbini Province");
  });
});

describe("POST /orders/shipping-quote", () => {
  const setup = async (price: number, quantity = 1) => {
    const { user, accessToken } = await createUser();
    const product = await createProduct({ price, stock: 10 });
    await fillCart(user._id, [{ product, quantity }]);
    const auth = { Authorization: `Bearer ${accessToken}` };
    return { auth };
  };

  it("quotes the cart's shipping to an address", async () => {
    const { auth } = await setup(1200, 2);
    const res = await request(app).post("/api/v1/orders/shipping-quote").set(auth).send({ province: 6, district: "jumla" });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ subtotal: 2400, shippingCost: 300, freeShippingThreshold: FREE_SHIPPING_THRESHOLD });
  });

  it("matches what placing the order charges, sale prices included", async () => {
    // NPR 5,200 at 15% off is 4,420: below the threshold, so shipping applies
    await Campaign.create({
      name: "Tihar Sale",
      slug: "tihar-quote",
      festival: "tihar",
      headline: "Tihar Sale",
      palette: "diyo",
      status: "published",
      startsAt: new Date(Date.now() - 60 * 60 * 1000),
      endsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      sale: { type: "percent", value: 15, scope: "all" },
    });
    const { auth } = await setup(5200);

    const quote = await request(app).post("/api/v1/orders/shipping-quote").set(auth).send({ province: 3, district: "Lalitpur" });
    expect(quote.body.data.subtotal).toBe(4420);
    expect(quote.body.data.shippingCost).toBe(100);

    const order = await request(app)
      .post("/api/v1/orders")
      .set(auth)
      .send({ shippingAddress: { ...shippingAddress, province: 3, district: "Lalitpur" }, paymentMethod: "cod" });
    expect(order.status).toBe(201);
    expect(order.body.data.order.pricing.shippingCost).toBe(quote.body.data.shippingCost);
    expect(order.body.data.order.pricing.subtotal).toBe(quote.body.data.subtotal);
  });

  it("validates the address and needs a signed-in user", async () => {
    const { auth } = await setup(1000);
    const bad = await request(app).post("/api/v1/orders/shipping-quote").set(auth).send({ province: 2, district: "Kaski" });
    expect(bad.status).toBe(400);
    const anonymous = await request(app).post("/api/v1/orders/shipping-quote").send({ province: 3, district: "Kathmandu" });
    expect(anonymous.status).toBe(401);
  });
});

describe("Saved address district", () => {
  const address = { name: "Sita", phone: "9841234567", street: "Main Road", city: "Banepa", district: "kavre", province: 3 };

  it("stores the standard spelling", async () => {
    const { accessToken } = await createUser();
    const res = await request(app).post("/api/v1/auth/addresses").set("Authorization", `Bearer ${accessToken}`).send(address);
    expect(res.status).toBe(201);
    expect(res.body.data.address.district).toBe("Kavrepalanchok");
  });

  it("checks an edit of only the province against the saved district", async () => {
    const { accessToken } = await createUser();
    const auth = { Authorization: `Bearer ${accessToken}` };
    const created = await request(app).post("/api/v1/auth/addresses").set(auth).send(address);
    const id = created.body.data.address._id;

    const moved = await request(app).put(`/api/v1/auth/addresses/${id}`).set(auth).send({ province: 1 });
    expect(moved.status).toBe(400);

    const fixed = await request(app).put(`/api/v1/auth/addresses/${id}`).set(auth).send({ province: 1, district: "Jhapa" });
    expect(fixed.status).toBe(200);
    expect(fixed.body.data.address).toMatchObject({ province: 1, district: "Jhapa" });
  });
});

describe("Admin shipping settings", () => {
  const settingsBody = (overrides: Record<string, unknown> = {}) => ({
    freeShippingThreshold: 6000,
    valleyRate: 80,
    provinceRates: { 1: 260, 2: 260, 3: 160, 4: 210, 5: 260, 6: 320, 7: 320 },
    freeAreas: [{ district: "kavre", city: "Panauti" }],
    ...overrides,
  });

  it("serves the defaults publicly until an admin saves", async () => {
    const res = await request(app).get("/api/v1/shipping/settings");
    expect(res.status).toBe(200);
    expect(res.body.data.settings).toMatchObject({
      freeShippingThreshold: 5000,
      valleyRate: 100,
      provinceRates: { 3: 150, 6: 300 },
      freeAreas: [{ district: "Kavrepalanchok" }],
      valleyDistricts: ["Kathmandu", "Lalitpur", "Bhaktapur"],
    });
  });

  it("lets admins change rates and free areas, which new orders then use", async () => {
    const admin = await createUser({ role: "admin" });
    const saved = await request(app)
      .put("/api/v1/admin/shipping")
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send(settingsBody());
    expect(saved.status).toBe(200);
    expect(saved.body.data.settings.freeAreas).toEqual([{ district: "Kavrepalanchok", city: "Panauti" }]);

    const publicView = await request(app).get("/api/v1/shipping/settings");
    expect(publicView.body.data.settings).toMatchObject({ freeShippingThreshold: 6000, valleyRate: 80 });

    const { user, accessToken } = await createUser();
    const product = await createProduct({ price: 5500, stock: 5 });
    await fillCart(user._id, [{ product, quantity: 1 }]);
    const auth = { Authorization: `Bearer ${accessToken}` };
    const quote = (body: Record<string, unknown>) => request(app).post("/api/v1/orders/shipping-quote").set(auth).send(body);

    // 5,500 is now under the threshold
    expect((await quote({ province: 3, district: "Kathmandu" })).body.data.shippingCost).toBe(80);
    expect((await quote({ province: 6, district: "Jumla" })).body.data.shippingCost).toBe(320);
    // Only Panauti in Kavre is free now
    expect((await quote({ province: 3, district: "Kavre", city: "Panauti" })).body.data.shippingCost).toBe(0);
    expect((await quote({ province: 3, district: "Kavre", city: "Banepa" })).body.data.shippingCost).toBe(160);

    const order = await request(app)
      .post("/api/v1/orders")
      .set(auth)
      .send({ shippingAddress: { ...shippingAddress, city: "Panauti-7", district: "Kavrepalanchok", province: 3 }, paymentMethod: "cod" });
    expect(order.status).toBe(201);
    expect(order.body.data.order.pricing.shippingCost).toBe(0);
  });

  it("rejects missing province rates and unknown districts", async () => {
    const admin = await createUser({ role: "admin" });
    const auth = { Authorization: `Bearer ${admin.accessToken}` };
    const noRate = await request(app).put("/api/v1/admin/shipping").set(auth).send(settingsBody({ provinceRates: { 1: 100 } }));
    expect(noRate.status).toBe(400);
    const badArea = await request(app).put("/api/v1/admin/shipping").set(auth).send(settingsBody({ freeAreas: [{ district: "Atlantis" }] }));
    expect(badArea.status).toBe(400);
    const negative = await request(app).put("/api/v1/admin/shipping").set(auth).send(settingsBody({ valleyRate: -5 }));
    expect(negative.status).toBe(400);
  });

  it("is admin-only", async () => {
    const { accessToken } = await createUser();
    const res = await request(app).put("/api/v1/admin/shipping").set("Authorization", `Bearer ${accessToken}`).send(settingsBody());
    expect(res.status).toBe(403);
  });
});
