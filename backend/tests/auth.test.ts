/**
 * Auth API tests: sessions, refresh-token rotation/revocation, cookies, password reset
 */
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../app";
import User from "../models/User";
import { createUser } from "./helpers";

jest.mock("../utils/email", () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  sendEmail: jest.fn().mockResolvedValue(undefined),
  isEmailConfigured: () => false,
}));
import { sendPasswordResetEmail } from "../utils/email";

const BROWSER_ORIGIN = "http://localhost:5173";
const credentials = { email: "shopper@example.com", password: "password123" };

const register = () =>
  request(app)
    .post("/api/v1/auth/register")
    .send({ name: "Shopper", ...credentials });

const getRefreshCookie = (res: request.Response): string | undefined => {
  const cookies = ([] as string[]).concat(res.headers["set-cookie"] || []);
  return cookies.find((c) => c.startsWith("refreshToken="));
};

describe("Auth sessions", () => {
  it("native clients get the refresh token in the body and can refresh with it", async () => {
    await register();
    const login = await request(app).post("/api/v1/auth/login").send(credentials);

    expect(login.status).toBe(200);
    expect(login.body.data.accessToken).toBeDefined();
    const { refreshToken } = login.body.data;
    expect(refreshToken).toBeDefined();

    const refreshed = await request(app)
      .post("/api/v1/auth/refresh-token")
      .send({ refreshToken });

    expect(refreshed.status).toBe(200);
    expect(refreshed.body.data.accessToken).toBeDefined();
    expect(refreshed.body.data.refreshToken).not.toBe(refreshToken);
  });

  it("browsers get the refresh token only as an httpOnly cookie", async () => {
    await register();
    const login = await request(app)
      .post("/api/v1/auth/login")
      .set("Origin", BROWSER_ORIGIN)
      .send(credentials);

    expect(login.status).toBe(200);
    expect(login.body.data.refreshToken).toBeUndefined();

    const cookie = getRefreshCookie(login);
    expect(cookie).toBeDefined();
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Path=\/api\/v1\/auth/);

    const refreshed = await request(app)
      .post("/api/v1/auth/refresh-token")
      .set("Origin", BROWSER_ORIGIN)
      .set("Cookie", cookie!.split(";")[0]);

    expect(refreshed.status).toBe(200);
    expect(refreshed.body.data.accessToken).toBeDefined();
    expect(refreshed.body.data.refreshToken).toBeUndefined();
    expect(getRefreshCookie(refreshed)).toBeDefined();
  });

  it("stores only hashes of refresh tokens", async () => {
    await register();
    const login = await request(app).post("/api/v1/auth/login").send(credentials);

    const user = await User.findOne({ email: credentials.email }).select("+refreshSessions");
    expect(user!.refreshSessions.length).toBe(2); // register + login
    const hashes = user!.refreshSessions.map((s) => s.tokenHash);
    expect(hashes).not.toContain(login.body.data.refreshToken);
  });

  it("logout revokes the session's refresh token", async () => {
    await register();
    const login = await request(app).post("/api/v1/auth/login").send(credentials);
    const { refreshToken } = login.body.data;

    const logout = await request(app).post("/api/v1/auth/logout").send({ refreshToken });
    expect(logout.status).toBe(200);

    const refreshed = await request(app)
      .post("/api/v1/auth/refresh-token")
      .send({ refreshToken });
    expect(refreshed.status).toBe(401);
  });

  it("logging out one device keeps other devices signed in", async () => {
    await register();
    const phone = await request(app).post("/api/v1/auth/login").send(credentials);
    const laptop = await request(app).post("/api/v1/auth/login").send(credentials);

    await request(app)
      .post("/api/v1/auth/logout")
      .send({ refreshToken: phone.body.data.refreshToken });

    const refreshed = await request(app)
      .post("/api/v1/auth/refresh-token")
      .send({ refreshToken: laptop.body.data.refreshToken });
    expect(refreshed.status).toBe(200);
  });

  it("rejects refresh tokens that were never issued as a session", async () => {
    const res = await request(app)
      .post("/api/v1/auth/refresh-token")
      .send({ refreshToken: "not-a-jwt" });
    expect(res.status).toBe(401);
  });
});

describe("Register and login", () => {
  it("never returns secrets in the user", async () => {
    const res = await register();

    expect(res.status).toBe(201);
    const { user } = res.body.data;
    expect(user.hasPassword).toBe(true);
    expect(user.emailVerified).toBe(false);
    for (const field of ["password", "refreshSessions", "resetPasswordAttempts", "googleId"]) {
      expect(user[field]).toBeUndefined();
    }
  });

  it("requires a letter and a number in new passwords", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ name: "Shopper", email: credentials.email, password: "abcdefgh" });
    expect(res.status).toBe(400);
  });

  it("rejects password login for an account that only signs in with Google", async () => {
    await createUser({ email: "google-only@example.com", googleId: "g-1", password: undefined });

    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "google-only@example.com", password: "password123" });
    expect(res.status).toBe(401);
  });
});

describe("Change password", () => {
  it("answers 400, not 401, for a wrong current password", async () => {
    const { accessToken } = await createUser();

    const res = await request(app)
      .put("/api/v1/auth/change-password")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ currentPassword: "wrong-password1", newPassword: "newpass456" });
    expect(res.status).toBe(400);
  });

  it("ends earlier sessions and access tokens but keeps this device signed in", async () => {
    await register();
    const otherDevice = await request(app).post("/api/v1/auth/login").send(credentials);
    const user = await User.findOne({ email: credentials.email });
    const earlierToken = jwt.sign(
      { userId: String(user!._id), role: "customer", iat: Math.floor(Date.now() / 1000) - 10 },
      process.env.JWT_ACCESS_SECRET as string,
    );

    const res = await request(app)
      .put("/api/v1/auth/change-password")
      .set("Authorization", `Bearer ${otherDevice.body.data.accessToken}`)
      .send({ currentPassword: credentials.password, newPassword: "newpass456" });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();

    const stale = await request(app).get("/api/v1/auth/me").set("Authorization", `Bearer ${earlierToken}`);
    expect(stale.status).toBe(401);

    const oldRefresh = await request(app)
      .post("/api/v1/auth/refresh-token")
      .send({ refreshToken: otherDevice.body.data.refreshToken });
    expect(oldRefresh.status).toBe(401);

    const fresh = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${res.body.data.accessToken}`);
    expect(fresh.status).toBe(200);
    const refreshed = await request(app)
      .post("/api/v1/auth/refresh-token")
      .send({ refreshToken: res.body.data.refreshToken });
    expect(refreshed.status).toBe(200);
  });

  it("points Google-only accounts to Forgot password", async () => {
    const { accessToken } = await createUser({ googleId: "g-2", password: undefined });

    const res = await request(app)
      .put("/api/v1/auth/change-password")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ currentPassword: "anything1", newPassword: "newpass456" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Forgot password/);
  });
});

describe("Password reset", () => {
  const sentCode = (): string => {
    const mock = sendPasswordResetEmail as jest.Mock;
    return mock.mock.calls[mock.mock.calls.length - 1][2];
  };

  beforeEach(() => (sendPasswordResetEmail as jest.Mock).mockClear());

  it("emails a code that resets the password and ends all sessions", async () => {
    await register();
    const login = await request(app).post("/api/v1/auth/login").send(credentials);

    const forgot = await request(app)
      .post("/api/v1/auth/forgot-password")
      .send({ email: credentials.email });
    expect(forgot.status).toBe(200);
    expect(forgot.body.data?.otp).toBeUndefined(); // never returned outside development
    expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1);

    const reset = await request(app)
      .post("/api/v1/auth/reset-password")
      .send({ email: credentials.email, otp: sentCode(), newPassword: "newpass456" });
    expect(reset.status).toBe(200);

    const oldSession = await request(app)
      .post("/api/v1/auth/refresh-token")
      .send({ refreshToken: login.body.data.refreshToken });
    expect(oldSession.status).toBe(401);

    const relogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: credentials.email, password: "newpass456" });
    expect(relogin.status).toBe(200);
    // The emailed code proved ownership of the address
    expect(relogin.body.data.user.emailVerified).toBe(true);
  });

  it("lets a Google-only account set a password", async () => {
    await createUser({ email: "google-only@example.com", googleId: "g-3", password: undefined });
    await request(app).post("/api/v1/auth/forgot-password").send({ email: "google-only@example.com" });

    const reset = await request(app)
      .post("/api/v1/auth/reset-password")
      .send({ email: "google-only@example.com", otp: sentCode(), newPassword: "newpass456" });
    expect(reset.status).toBe(200);

    const login = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "google-only@example.com", password: "newpass456" });
    expect(login.status).toBe(200);
    expect(login.body.data.user.hasPassword).toBe(true);
  });

  it("does not reveal whether an email is registered", async () => {
    const res = await request(app)
      .post("/api/v1/auth/forgot-password")
      .send({ email: "nobody@example.com" });
    expect(res.status).toBe(200);
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("invalidates the code after 5 wrong guesses", async () => {
    await register();
    await request(app).post("/api/v1/auth/forgot-password").send({ email: credentials.email });
    const code = sentCode();
    const wrong = code === "111111" ? "222222" : "111111";

    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post("/api/v1/auth/verify-reset-otp")
        .send({ email: credentials.email, otp: wrong });
      expect(res.status).toBe(400);
    }

    // The correct code no longer works
    const res = await request(app)
      .post("/api/v1/auth/reset-password")
      .send({ email: credentials.email, otp: code, newPassword: "newpass456" });
    expect(res.status).toBe(400);
  });

  it("rejects malformed reset input", async () => {
    const res = await request(app)
      .post("/api/v1/auth/reset-password")
      .send({ email: credentials.email, otp: { $ne: "x" }, newPassword: "newpass456" });
    expect(res.status).toBe(400);
  });
});
