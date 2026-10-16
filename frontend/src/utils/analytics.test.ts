import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const auth = vi.hoisted(() => ({ token: null as string | null }));
vi.mock("../api/axios", () => ({ API_BASE_URL: "/api/v1", getAccessToken: () => auth.token }));

import {
  countThisDevice,
  flushAnalytics,
  isThisDeviceCounted,
  setAnalyticsTesting,
  setAnalyticsUser,
  track,
} from "./analytics";

type Sent = { visitor: string; session: string; referrer?: string; utm?: Record<string, string>; clickIds?: string[]; events: { type: string; path: string; product?: string; order?: string }[] };

const beacon = vi.fn((_url: string, _body: Blob) => true);
const fetchMock = vi.fn((_url: string, _init: RequestInit) => Promise.resolve(new Response(null, { status: 204 })));

/** Stand-in Blob that keeps its text (jsdom's Blob can't be read synchronously) */
class TextBlob {
  constructor(public parts: string[]) {}
}

/** Everything sent so far, parsed */
const sent = async (): Promise<Sent[]> => {
  const fromBeacon = beacon.mock.calls.map(([, blob]) => (blob as unknown as TextBlob).parts.join(""));
  const fromFetch = fetchMock.mock.calls.map(([, init]) => String(init.body));
  return [...fromBeacon, ...fromFetch].map((json) => JSON.parse(json));
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("visitor analytics tracker", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    sessionStorage.clear();
    beacon.mockClear();
    fetchMock.mockClear();
    auth.token = null;
    Object.defineProperty(navigator, "sendBeacon", { value: beacon, configurable: true });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("Blob", TextBlob);
    window.history.replaceState(null, "", "/");
    setAnalyticsTesting(true);
  });

  afterEach(() => {
    setAnalyticsTesting(false);
    vi.useRealTimers();
    vi.unstubAllGlobals();
    Object.defineProperty(navigator, "doNotTrack", { value: null, configurable: true });
  });

  it("batches events and sends them a few seconds later, with anonymous ids", async () => {
    track("page_view", { path: "/" });
    track("product_view", { path: "/products/romper", product: "p1" });
    expect(beacon).not.toHaveBeenCalled();

    vi.advanceTimersByTime(8000);
    const [batch] = await sent();
    expect(beacon).toHaveBeenCalledTimes(1);
    expect(beacon.mock.calls[0][0]).toBe("/api/v1/analytics/events");
    expect(batch.visitor).toMatch(UUID);
    expect(batch.session).toMatch(UUID);
    expect(batch.events).toEqual([
      { type: "page_view", path: "/" },
      { type: "product_view", path: "/products/romper", product: "p1" },
    ]);
  });

  it("sends where the visit came from with its first batch only", async () => {
    window.history.replaceState(null, "", "/products?utm_source=facebook&utm_campaign=dashain&fbclid=abc");
    track("page_view");
    flushAnalytics();
    track("page_view", { path: "/about" });
    flushAnalytics();

    const [first, second] = await sent();
    expect(first).toMatchObject({ utm: { source: "facebook", campaign: "dashain" }, clickIds: ["fbclid"] });
    expect(first.events[0].path).toBe("/products");
    expect(second.utm).toBeUndefined();
    expect(second.session).toBe(first.session);
  });

  it("sends signed-in shoppers' batches with their token, and closing pages with a beacon", async () => {
    auth.token = "access-token";
    track("page_view", { path: "/" });
    flushAnalytics();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const init = fetchMock.mock.calls[0][1];
    expect(init.headers).toMatchObject({ Authorization: "Bearer access-token", "Content-Type": "application/json" });
    expect(init.keepalive).toBe(true);

    // A closing page can't set headers: the token goes in the beacon's body
    track("page_view", { path: "/cart" });
    flushAnalytics(true);
    expect(beacon).toHaveBeenCalledTimes(1);
    const closing = (await sent()).find((batch) => batch.events[0].path === "/cart") as Sent & { auth?: string };
    expect(closing.auth).toBe("access-token");
  });

  it("sends right away once 10 events are waiting", () => {
    for (let i = 0; i < 10; i++) track("page_view", { path: `/page-${i}` });
    expect(beacon).toHaveBeenCalledTimes(1);
  });

  it("counts a repeated event once (re-renders, double effects)", async () => {
    track("product_view", { path: "/products/romper", product: "p1" });
    track("product_view", { path: "/products/romper", product: "p1" });
    vi.advanceTimersByTime(2500);
    track("product_view", { path: "/products/romper", product: "p1" });
    flushAnalytics();
    expect((await sent())[0].events).toHaveLength(2);
  });

  it("counts an order once on this device, however often its page opens", async () => {
    track("order_placed", { path: "/order-success", order: "o1" });
    vi.advanceTimersByTime(3000);
    track("order_placed", { path: "/order-success", order: "o1" });
    flushAnalytics();
    expect((await sent())[0].events).toEqual([{ type: "order_placed", path: "/order-success", order: "o1" }]);
  });

  it("starts a new visit after 30 minutes without activity", async () => {
    track("page_view", { path: "/" });
    flushAnalytics();
    vi.setSystemTime(Date.now() + 31 * 60 * 1000);
    track("page_view", { path: "/" });
    flushAnalytics();
    const [first, second] = await sent();
    expect(second.visitor).toBe(first.visitor);
    expect(second.session).not.toBe(first.session);
  });

  it("sends nothing when the browser asks not to be tracked", () => {
    Object.defineProperty(navigator, "doNotTrack", { value: "1", configurable: true });
    track("page_view", { path: "/" });
    flushAnalytics();
    expect(beacon).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("never counts admin pages, or a device an admin signed in on until asked", () => {
    window.history.replaceState(null, "", "/admin/orders");
    track("page_view");
    flushAnalytics();
    expect(beacon).not.toHaveBeenCalled();

    window.history.replaceState(null, "", "/");
    setAnalyticsUser({ role: "customer" });
    expect(isThisDeviceCounted()).toBe(true);
    setAnalyticsUser({ role: "admin" });
    expect(isThisDeviceCounted()).toBe(false);
    track("page_view", { path: "/" });
    flushAnalytics();
    expect(beacon).not.toHaveBeenCalled();

    countThisDevice();
    track("page_view", { path: "/products" });
    flushAnalytics();
    expect(beacon).toHaveBeenCalledTimes(1);
  });
});
