/**
 * Two-step login for admins: setup, codes, backup codes, remembered browsers,
 * lockout, enforcement on old sessions, Google, mobile, and admin resets.
 * An `otpauth` TOTP with the key from setup stands in for the phone.
 */
import request from "supertest";
import jwt from "jsonwebtoken";
import * as OTPAuth from "otpauth";
import app from "../app";
import User from "../models/User";
import AdminLog from "../models/AdminLog";
import { createUser } from "./helpers";

const mockVerifyIdToken = jest.fn();
jest.mock("google-auth-library", () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: (...args: unknown[]) => mockVerifyIdToken(...args),
  })),
}));

const ORIGIN = "http://localhost:5173";
const PASSWORD = "password123";

const cookiesOf = (res: request.Response): string[] => ([] as string[]).concat(res.headers["set-cookie"] || []);
const cookie = (res: request.Response, name: string) =>
  cookiesOf(res)
    .find((c) => c.startsWith(`${name}=`))
    ?.split(";")[0];

const login = (email: string, extra: { origin?: string | null; cookie?: string } = {}) => {
  const req = request(app).post("/api/v1/auth/login");
  if (extra.origin !== null) req.set("Origin", extra.origin || ORIGIN);
  if (extra.cookie) req.set("Cookie", extra.cookie);
  return req.send({ email, password: PASSWORD });
};

const post = (path: string, body: object, token?: string) => {
  const req = request(app).post(`/api/v1${path}`).set("Origin", ORIGIN);
  if (token) req.set("Authorization", `Bearer ${token}`);
  return req.send(body);
};

const phoneFor = (manualKey: string, email: string) =>
  new OTPAuth.TOTP({
    issuer: "Nevan Handicraft",
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(manualKey.replace(/\s+/g, "")),
  });

/** Codes are single-use per 30 s step; tests that need several in a row forget the last step */
const allowNextCode = (userId: { toString(): string }) => User.updateOne({ _id: String(userId) }, { $unset: { "twoFactor.lastUsedStep": 1 } });

/** An admin with two-step login set up: the phone, backup codes and the first session */
const adminWithTwoFactor = async (overrides: Record<string, unknown> = {}) => {
  const { user } = await createUser({ role: "admin", password: PASSWORD, ...overrides });
  const first = await login(user.email);
  expect(first.body.data.twoFactorSetupRequired).toBe(true);
  const setup = await post("/auth/2fa/setup", { challengeToken: first.body.data.challengeToken });
  const phone = phoneFor(setup.body.data.manualKey, user.email);
  const enabled = await post("/auth/2fa/enable", { challengeToken: first.body.data.challengeToken, code: phone.generate() });
  expect(enabled.status).toBe(200);
  await allowNextCode(user._id);
  return { user, phone, backupCodes: enabled.body.data.backupCodes as string[], session: enabled };
};

describe("Admin two-step login: first setup", () => {
  it("issues no session after the password until an authenticator is set up", async () => {
    const { user } = await createUser({ role: "admin", password: PASSWORD });
    const res = await login(user.email);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ twoFactorSetupRequired: true, challengeToken: expect.any(String) });
    expect(cookie(res, "refreshToken")).toBeUndefined();

    // The challenge is not an access token
    const badges = await request(app).get("/api/v1/admin/badges").set("Authorization", `Bearer ${res.body.data.challengeToken}`);
    expect(badges.status).toBe(401);
  });

  it("sets up with a QR code, refuses a wrong first code, then signs in with backup codes shown once", async () => {
    const { user } = await createUser({ role: "admin", password: PASSWORD });
    const { challengeToken } = (await login(user.email)).body.data;

    const setup = await post("/auth/2fa/setup", { challengeToken });
    expect(setup.status).toBe(200);
    expect(setup.body.data.qrCode).toMatch(/^data:image\/png;base64,/);
    expect(setup.body.data.otpauthUrl).toMatch(/^otpauth:\/\/totp\/Nevan%20Handicraft:/);
    const phone = phoneFor(setup.body.data.manualKey, user.email);

    const wrong = await post("/auth/2fa/enable", { challengeToken, code: "000000" });
    expect(wrong.status).toBe(400);

    const enabled = await post("/auth/2fa/enable", { challengeToken, code: phone.generate() });
    expect(enabled.status).toBe(200);
    expect(enabled.body.data.user.twoFactorEnabled).toBe(true);
    expect(enabled.body.data.user.twoFactor).toBeUndefined();
    expect(enabled.body.data.backupCodes).toHaveLength(10);
    expect(enabled.body.data.backupCodes[0]).toMatch(/^[2-9A-HJKMNP-Z]{5}-[2-9A-HJKMNP-Z]{5}$/);
    expect(cookie(enabled, "refreshToken")).toBeDefined();

    const badges = await request(app).get("/api/v1/admin/badges").set("Authorization", `Bearer ${enabled.body.data.accessToken}`);
    expect(badges.status).toBe(200);

    // The secret is stored encrypted, never as the key the phone shows
    const stored = await User.findById(user._id).select("+twoFactor").lean();
    expect(stored!.twoFactor!.secret).toMatch(/^v1\./);
    expect(stored!.twoFactor!.secret).not.toContain(setup.body.data.manualKey.replace(/\s+/g, ""));
    expect(stored!.twoFactor!.backupCodes).not.toContain(enabled.body.data.backupCodes[0]);

    // The same challenge can't set up a second authenticator
    const again = await post("/auth/2fa/setup", { challengeToken });
    expect(again.status).toBe(401);
  });
});

describe("Admin two-step login: signing in", () => {
  it("asks for a code, accepts it once, and refuses it again", async () => {
    const { user, phone } = await adminWithTwoFactor();

    const first = await login(user.email);
    expect(first.body.data).toEqual({ twoFactorRequired: true, challengeToken: expect.any(String) });

    const code = phone.generate();
    const ok = await post("/auth/2fa/verify", { challengeToken: first.body.data.challengeToken, code });
    expect(ok.status).toBe(200);
    expect(ok.body.data.accessToken).toBeDefined();
    expect(ok.body.data.backupCodes).toBeUndefined();
    expect(ok.body.data.backupCodesLeft).toBe(10);

    const second = await login(user.email);
    const replay = await post("/auth/2fa/verify", { challengeToken: second.body.data.challengeToken, code });
    expect(replay.status).toBe(400);
  });

  it("accepts each backup code once", async () => {
    const { user, backupCodes } = await adminWithTwoFactor();

    const first = await login(user.email);
    const used = await post("/auth/2fa/verify", {
      challengeToken: first.body.data.challengeToken,
      backupCode: backupCodes[0].toLowerCase().replace("-", " "),
    });
    expect(used.status).toBe(200);
    expect(used.body.data.backupCodesLeft).toBe(9);

    const second = await login(user.email);
    const reused = await post("/auth/2fa/verify", { challengeToken: second.body.data.challengeToken, backupCode: backupCodes[0] });
    expect(reused.status).toBe(400);
  });

  it("locks for 15 minutes after 10 wrong codes and ends the pending sign-in", async () => {
    const { user, phone } = await adminWithTwoFactor();
    const { challengeToken } = (await login(user.email)).body.data;

    for (let i = 0; i < 9; i++) {
      expect((await post("/auth/2fa/verify", { challengeToken, code: "000000" })).status).toBe(400);
    }
    const tenth = await post("/auth/2fa/verify", { challengeToken, code: "000000" });
    expect(tenth.status).toBe(429);
    expect(tenth.body.message).toMatch(/Try again in 15 minutes/);

    // Even the right code waits, and the old challenge is dead once the lock ends
    expect((await post("/auth/2fa/verify", { challengeToken, code: phone.generate() })).status).toBe(429);
    await User.updateOne({ _id: user._id }, { $unset: { "twoFactor.lockedUntil": 1 } });
    expect((await post("/auth/2fa/verify", { challengeToken, code: phone.generate() })).status).toBe(401);
  });

  it("refuses expired challenges and challenges for another purpose", async () => {
    const { user, phone } = await adminWithTwoFactor();
    const expired = jwt.sign(
      { userId: String(user._id), purpose: "verify", ver: 1, iat: Math.floor(Date.now() / 1000) - 3600, exp: Math.floor(Date.now() / 1000) - 60 },
      "anything",
    );
    expect((await post("/auth/2fa/verify", { challengeToken: expired, code: phone.generate() })).status).toBe(401);

    const { challengeToken } = (await login(user.email)).body.data;
    expect((await post("/auth/2fa/setup", { challengeToken })).status).toBe(401);
  });

  it("skips the code on a remembered browser until the password changes", async () => {
    const { user, phone } = await adminWithTwoFactor();
    const first = await login(user.email);
    const verified = await post("/auth/2fa/verify", {
      challengeToken: first.body.data.challengeToken,
      code: phone.generate(),
      rememberDevice: true,
    });
    const trusted = cookie(verified, "trustedDevice");
    expect(trusted).toBeDefined();
    expect(cookiesOf(verified).find((c) => c.startsWith("trustedDevice="))).toMatch(/HttpOnly/i);

    const remembered = await login(user.email, { cookie: trusted });
    expect(remembered.body.data.accessToken).toBeDefined();
    expect((await request(app).get("/api/v1/admin/badges").set("Authorization", `Bearer ${remembered.body.data.accessToken}`)).status).toBe(200);

    const changed = await request(app)
      .put("/api/v1/auth/change-password")
      .set("Origin", ORIGIN)
      .set("Authorization", `Bearer ${remembered.body.data.accessToken}`)
      .send({ currentPassword: PASSWORD, newPassword: "newpass456" });
    expect(changed.status).toBe(200);
    // The device that changed it stays signed in as an admin
    expect((await request(app).get("/api/v1/admin/badges").set("Authorization", `Bearer ${changed.body.data.accessToken}`)).status).toBe(200);

    const afterChange = await request(app)
      .post("/api/v1/auth/login")
      .set("Origin", ORIGIN)
      .set("Cookie", trusted!)
      .send({ email: user.email, password: "newpass456" });
    expect(afterChange.body.data.twoFactorRequired).toBe(true);
  });

  it("sends admins on the mobile app to the website", async () => {
    const { user } = await createUser({ role: "admin", password: PASSWORD });
    const res = await login(user.email, { origin: null });
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/Sign in on the website/);
  });

  it("asks a Google-linked admin for the code too", async () => {
    process.env.GOOGLE_CLIENT_IDS = "web-client.apps.googleusercontent.com";
    const { user } = await adminWithTwoFactor({ googleId: "google-sub-1", emailVerified: true });
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: "google-sub-1",
        email: user.email,
        email_verified: true,
        aud: "web-client.apps.googleusercontent.com",
      }),
    });
    const res = await request(app).post("/api/v1/auth/google").set("Origin", ORIGIN).send({ idToken: "id-token" });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ twoFactorRequired: true, challengeToken: expect.any(String) });
    delete process.env.GOOGLE_CLIENT_IDS;
  });

  it("leaves customers' sign-in unchanged", async () => {
    const { user } = await createUser({ password: PASSWORD });
    const res = await login(user.email, { origin: null });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
  });
});

describe("Admin sessions from before two-step login", () => {
  it("refuses an admin access token without two-step login", async () => {
    const { user } = await createUser({ role: "admin" });
    const oldToken = jwt.sign({ userId: String(user._id), role: "admin" }, process.env.JWT_ACCESS_SECRET as string);
    const res = await request(app).get("/api/v1/admin/badges").set("Authorization", `Bearer ${oldToken}`);
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/two-step login/);
  });

  it("ends an admin refresh session without two-step login, and a promoted customer's sessions", async () => {
    // A customer signs in on the app, then becomes an admin
    const { user } = await createUser({ password: PASSWORD });
    const customerLogin = await login(user.email, { origin: null });
    await User.updateOne({ _id: user._id }, { role: "admin" });

    const refreshed = await request(app).post("/api/v1/auth/refresh-token").send({ refreshToken: customerLogin.body.data.refreshToken });
    expect(refreshed.status).toBe(401);
    const stored = await User.findById(user._id).select("+refreshSessions");
    expect(stored!.refreshSessions).toHaveLength(0);

    const access = await request(app).get("/api/v1/admin/badges").set("Authorization", `Bearer ${customerLogin.body.data.accessToken}`);
    expect(access.status).toBe(401);
  });

  it("keeps two-step admin sessions through refresh", async () => {
    const { session } = await adminWithTwoFactor();
    const refreshed = await request(app)
      .post("/api/v1/auth/refresh-token")
      .set("Origin", ORIGIN)
      .set("Cookie", cookie(session, "refreshToken")!);
    expect(refreshed.status).toBe(200);
    const badges = await request(app).get("/api/v1/admin/badges").set("Authorization", `Bearer ${refreshed.body.data.accessToken}`);
    expect(badges.status).toBe(200);
  });
});

describe("Admin two-step settings", () => {
  it("shows status, regenerates backup codes with a current code and forgets remembered browsers", async () => {
    const { phone, session } = await adminWithTwoFactor();
    const token = session.body.data.accessToken;

    const status = await request(app).get("/api/v1/auth/2fa").set("Authorization", `Bearer ${token}`);
    expect(status.body.data).toMatchObject({ enabled: true, backupCodesLeft: 10, rememberedBrowsers: 0 });

    expect((await post("/auth/2fa/backup-codes", { code: "000000" }, token)).status).toBe(400);
    const fresh = await post("/auth/2fa/backup-codes", { code: phone.generate() }, token);
    expect(fresh.status).toBe(200);
    expect(fresh.body.data.backupCodes).toHaveLength(10);
    expect(fresh.body.data.backupCodes).not.toEqual(session.body.data.backupCodes);

    const forget = await request(app).delete("/api/v1/auth/2fa/devices").set("Authorization", `Bearer ${token}`);
    expect(forget.status).toBe(200);
  });

  it("moves to a new phone: the old phone's codes stop working", async () => {
    const { user, phone, session } = await adminWithTwoFactor();
    const token = session.body.data.accessToken;

    const started = await post("/auth/2fa/replace", { code: phone.generate() }, token);
    expect(started.status).toBe(200);
    const newPhone = phoneFor(started.body.data.manualKey, user.email);
    const done = await post("/auth/2fa/replace", { newCode: newPhone.generate() }, token);
    expect(done.status).toBe(200);

    await allowNextCode(user._id);
    const old = await post("/auth/2fa/verify", { challengeToken: (await login(user.email)).body.data.challengeToken, code: phone.generate() });
    // Same 30 s window: the two phones' codes differ, so the old one is refused
    if (phone.generate() !== newPhone.generate()) expect(old.status).toBe(400);
    await allowNextCode(user._id);
    const fresh = await post("/auth/2fa/verify", { challengeToken: (await login(user.email)).body.data.challengeToken, code: newPhone.generate() });
    expect(fresh.status).toBe(200);
  });

  it("lets another admin reset it (logged), never your own", async () => {
    const { user: target, session } = await adminWithTwoFactor();
    const { user: other, accessToken } = await createUser({ role: "admin" });

    const self = await request(app)
      .post(`/api/v1/admin/users/${other._id}/reset-two-factor`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(self.status).toBe(409);

    const reset = await request(app)
      .post(`/api/v1/admin/users/${target._id}/reset-two-factor`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(reset.status).toBe(200);
    expect(reset.body.data.user.twoFactorEnabled).toBe(false);
    expect(await AdminLog.countDocuments({ action: "user.two_factor_reset" })).toBe(1);

    // Signed out everywhere; the next sign-in sets up a new authenticator
    const refreshed = await request(app)
      .post("/api/v1/auth/refresh-token")
      .set("Origin", ORIGIN)
      .set("Cookie", cookie(session, "refreshToken")!);
    expect(refreshed.status).toBe(401);
    expect((await login(target.email)).body.data.twoFactorSetupRequired).toBe(true);
  });
});
