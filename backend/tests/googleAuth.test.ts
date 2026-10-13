/**
 * Google sign-in: account creation, linking rules (incl. pre-registered unverified
 * accounts), token transport and failure cases. Google's verifier is mocked.
 */
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../app";
import User from "../models/User";
import { createUser } from "./helpers";

const mockVerifyIdToken = jest.fn();
jest.mock("google-auth-library", () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: (...args: unknown[]) => mockVerifyIdToken(...args),
  })),
}));

const BROWSER_ORIGIN = "http://localhost:5173";
const CLIENT_ID = "test-web-client.apps.googleusercontent.com";

const googleSays = (payload: Record<string, unknown>) =>
  mockVerifyIdToken.mockResolvedValue({
    getPayload: () => ({ email_verified: true, ...payload }),
  });

const signInWithGoogle = (idToken = "google-id-token") =>
  request(app).post("/api/v1/auth/google").send({ idToken });

// An access token issued before the current second (JWT iat has one-second precision)
const earlierAccessToken = (userId: string, role = "customer") =>
  jwt.sign(
    { userId, role, iat: Math.floor(Date.now() / 1000) - 10 },
    process.env.JWT_ACCESS_SECRET as string,
  );

beforeEach(() => {
  process.env.GOOGLE_CLIENT_IDS = CLIENT_ID;
  mockVerifyIdToken.mockReset();
});

afterAll(() => {
  delete process.env.GOOGLE_CLIENT_IDS;
});

describe("Google sign-in", () => {
  it("creates an account without a password for a new Google user", async () => {
    googleSays({ sub: "g-new", email: "new.shopper@example.com", name: "New Shopper" });

    const res = await signInWithGoogle();

    expect(res.status).toBe(201);
    expect(mockVerifyIdToken).toHaveBeenCalledWith({
      idToken: "google-id-token",
      audience: [CLIENT_ID],
    });
    expect(res.body.data.isNewUser).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined(); // native client (no Origin)

    const { user } = res.body.data;
    expect(user.name).toBe("New Shopper");
    expect(user.hasPassword).toBe(false);
    expect(user.emailVerified).toBe(true);
    expect(user.googleLinked).toBe(true);
    expect(user.googleId).toBeUndefined();
    expect(user.refreshSessions).toBeUndefined();

    const saved = await User.findById(user._id).select("+password");
    expect(saved!.googleId).toBe("g-new");
    expect(saved!.password).toBeUndefined();

    const me = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${res.body.data.accessToken}`);
    expect(me.status).toBe(200);
  });

  it("signs a returning user in by Google id, even if their Google email changed", async () => {
    googleSays({ sub: "g-returning", email: "first@example.com" });
    const first = await signInWithGoogle();

    googleSays({ sub: "g-returning", email: "renamed@example.com" });
    const second = await signInWithGoogle();

    expect(second.status).toBe(200);
    expect(second.body.data.isNewUser).toBe(false);
    expect(second.body.data.user._id).toBe(first.body.data.user._id);
    expect(await User.countDocuments()).toBe(1);
  });

  it("gives browsers the refresh token only as an httpOnly cookie", async () => {
    googleSays({ sub: "g-browser", email: "browser@example.com" });

    const res = await request(app)
      .post("/api/v1/auth/google")
      .set("Origin", BROWSER_ORIGIN)
      .send({ idToken: "google-id-token" });

    expect(res.status).toBe(201);
    expect(res.body.data.refreshToken).toBeUndefined();
    const cookies = ([] as string[]).concat(res.headers["set-cookie"] || []);
    expect(cookies.find((c) => c.startsWith("refreshToken="))).toMatch(/HttpOnly/i);
  });

  it("links a verified account and keeps its password", async () => {
    const { user } = await createUser({ email: "verified@example.com", emailVerified: true });
    googleSays({ sub: "g-verified", email: "verified@example.com" });

    const res = await signInWithGoogle();

    expect(res.status).toBe(200);
    expect(res.body.data.user._id).toBe(String(user._id));
    expect(res.body.data.passwordRemoved).toBeUndefined();

    const login = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "verified@example.com", password: "password123" });
    expect(login.status).toBe(200);
  });

  it("takes over an unverified account: its password, sessions and access tokens stop working", async () => {
    // Someone registers the address before its owner signs in with Google
    const registered = await request(app)
      .post("/api/v1/auth/register")
      .send({ name: "Squatter", email: "owner@example.com", password: "password123" });
    const squatterRefresh = registered.body.data.refreshToken;
    const squatterAccess = earlierAccessToken(registered.body.data.user._id);

    googleSays({ sub: "g-owner", email: "owner@example.com" });
    const res = await signInWithGoogle();

    expect(res.status).toBe(200);
    expect(res.body.data.passwordRemoved).toBe(true);
    expect(res.body.data.user._id).toBe(registered.body.data.user._id);
    expect(res.body.data.user.hasPassword).toBe(false);

    const refreshed = await request(app)
      .post("/api/v1/auth/refresh-token")
      .send({ refreshToken: squatterRefresh });
    expect(refreshed.status).toBe(401);

    const me = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${squatterAccess}`);
    expect(me.status).toBe(401);

    const login = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "owner@example.com", password: "password123" });
    expect(login.status).toBe(401);

    // The owner's own new session works
    const ownerMe = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${res.body.data.accessToken}`);
    expect(ownerMe.status).toBe(200);
  });

  it("matches Gmail addresses the way registration stores them", async () => {
    const registered = await request(app)
      .post("/api/v1/auth/register")
      .send({ name: "John", email: "john.doe@gmail.com", password: "password123" });
    expect(registered.status).toBe(201);

    googleSays({ sub: "g-gmail", email: "John.Doe@gmail.com" });
    const res = await signInWithGoogle();

    expect(res.status).toBe(200);
    expect(res.body.data.user._id).toBe(registered.body.data.user._id);
  });

  it("rejects Google accounts whose email Google hasn't verified", async () => {
    googleSays({ sub: "g-unverified", email: "unverified@example.com", email_verified: false });

    const res = await signInWithGoogle();

    expect(res.status).toBe(401);
    expect(await User.countDocuments()).toBe(0);
  });

  it("rejects tokens Google's verifier refuses", async () => {
    mockVerifyIdToken.mockRejectedValue(new Error("Wrong recipient, payload audience != requiredAudience"));

    const res = await signInWithGoogle();

    expect(res.status).toBe(401);
  });

  it("refuses deactivated accounts", async () => {
    await createUser({ email: "inactive@example.com", googleId: "g-inactive", isActive: false });
    googleSays({ sub: "g-inactive", email: "inactive@example.com" });

    const res = await signInWithGoogle();

    expect(res.status).toBe(401);
  });

  it("never links admin accounts", async () => {
    await createUser({ email: "admin@example.com", role: "admin" });
    googleSays({ sub: "g-admin", email: "admin@example.com" });

    const res = await signInWithGoogle();

    expect(res.status).toBe(409);
    const admin = await User.findOne({ email: "admin@example.com" });
    expect(admin!.googleId).toBeUndefined();
  });

  it("refuses an email already linked to a different Google account", async () => {
    await createUser({ email: "taken@example.com", googleId: "g-first" });
    googleSays({ sub: "g-second", email: "taken@example.com" });

    const res = await signInWithGoogle();

    expect(res.status).toBe(409);
  });

  it("answers 503 when Google sign-in isn't configured", async () => {
    delete process.env.GOOGLE_CLIENT_IDS;

    const res = await signInWithGoogle();

    expect(res.status).toBe(503);
    expect(mockVerifyIdToken).not.toHaveBeenCalled();
  });

  it("requires an ID token", async () => {
    const res = await request(app).post("/api/v1/auth/google").send({ idToken: { $ne: "" } });

    expect(res.status).toBe(400);
    expect(mockVerifyIdToken).not.toHaveBeenCalled();
  });
});
