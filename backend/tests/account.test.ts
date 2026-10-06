/**
 * Profile update and address book
 */
import request from "supertest";
import app from "../app";
import { createUser, shippingAddress } from "./helpers";

const address = { ...shippingAddress, label: "Home" };

describe("Profile update", () => {
  it("updates name and phone", async () => {
    const { accessToken } = await createUser();
    const res = await request(app)
      .put("/api/v1/auth/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Asha Gurung", phone: "984-123 4567" });

    expect(res.status).toBe(200);
    expect(res.body.data.user).toMatchObject({ name: "Asha Gurung", phone: "9841234567" });
  });

  it("rejects an invalid phone", async () => {
    const { accessToken } = await createUser();
    const res = await request(app)
      .put("/api/v1/auth/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ phone: "12345" });
    expect(res.status).toBe(400);
  });
});

describe("Address book", () => {
  it("makes the first address the default and keeps one default", async () => {
    const { accessToken } = await createUser();
    const auth = { Authorization: `Bearer ${accessToken}` };

    const first = await request(app).post("/api/v1/auth/addresses").set(auth).send(address);
    expect(first.status).toBe(201);
    expect(first.body.data.address.isDefault).toBe(true);

    const second = await request(app)
      .post("/api/v1/auth/addresses")
      .set(auth)
      .send({ ...address, label: "Work", city: "Lalitpur", isDefault: true });
    expect(second.body.data.addresses.filter((a: any) => a.isDefault)).toHaveLength(1);
    expect(second.body.data.addresses[0].label).toBe("Work");

    // Removing the default promotes another one
    const removed = await request(app)
      .delete(`/api/v1/auth/addresses/${second.body.data.address._id}`)
      .set(auth);
    expect(removed.body.data.addresses).toHaveLength(1);
    expect(removed.body.data.addresses[0].isDefault).toBe(true);
  });

  it("edits an address and validates input", async () => {
    const { accessToken } = await createUser();
    const auth = { Authorization: `Bearer ${accessToken}` };
    const created = await request(app).post("/api/v1/auth/addresses").set(auth).send(address);
    const id = created.body.data.address._id;

    const updated = await request(app).put(`/api/v1/auth/addresses/${id}`).set(auth).send({ street: "New Road" });
    expect(updated.status).toBe(200);
    expect(updated.body.data.address.street).toBe("New Road");

    const bad = await request(app).post("/api/v1/auth/addresses").set(auth).send({ ...address, province: 9 });
    expect(bad.status).toBe(400);
  });

  it("allows at most 5 addresses", async () => {
    const { accessToken } = await createUser();
    const auth = { Authorization: `Bearer ${accessToken}` };
    for (let i = 0; i < 5; i++) {
      await request(app).post("/api/v1/auth/addresses").set(auth).send({ ...address, label: `A${i}` });
    }
    const sixth = await request(app).post("/api/v1/auth/addresses").set(auth).send(address);
    expect(sixth.status).toBe(400);

    const list = await request(app).get("/api/v1/auth/addresses").set(auth);
    expect(list.body.data.addresses).toHaveLength(5);
  });

  it("only touches the caller's own addresses", async () => {
    const { accessToken: owner } = await createUser();
    const { accessToken: other } = await createUser();
    const created = await request(app).post("/api/v1/auth/addresses").set("Authorization", `Bearer ${owner}`).send(address);

    const res = await request(app)
      .delete(`/api/v1/auth/addresses/${created.body.data.address._id}`)
      .set("Authorization", `Bearer ${other}`);
    expect(res.status).toBe(404);
  });
});
