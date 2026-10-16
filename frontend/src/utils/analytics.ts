/**
 * Website visitor analytics (first-party): pages and products viewed, searches,
 * add to cart, checkout started and orders placed, sent in small batches to
 * POST /analytics/events and shown to admins on /admin/visitors.
 *
 * - The visitor is an anonymous random id in localStorage and a visit rotates
 *   after 30 minutes idle (sessionStorage). Nothing is sent when storage is
 *   blocked, when the browser asks not to be tracked (Do Not Track / Global
 *   Privacy Control), on /admin pages, or on a device an admin signed in on.
 * - Signed-in shoppers send their access token so the visit is linked to them:
 *   as a header normally, inside the body when the page is closing (beacons
 *   can't set headers; the server reads it and drops it before storing).
 * - Tracking must never break a page: every failure is swallowed.
 */
import { API_BASE_URL, getAccessToken } from "../api/axios";

export type AnalyticsEventType =
  | "page_view"
  | "product_view"
  | "search"
  | "add_to_cart"
  | "checkout_start"
  | "order_placed";

export interface AnalyticsEvent {
  type: AnalyticsEventType;
  path: string;
  product?: string;
  query?: string;
  results?: number;
  order?: string;
}

interface VisitState {
  id: string;
  lastActive: number;
  /** Where the visit came from; sent with its first batch */
  context?: { referrer?: string; utm?: Record<string, string>; clickIds?: string[] };
}

const VISITOR_KEY = "nevan-visitor";
const VISIT_KEY = "nevan-visit";
/** Set on devices an admin signed in on: their browsing isn't counted */
export const OPT_OUT_KEY = "nevan-no-track";
const ORDERS_KEY = "nevan-tracked-orders";

const IDLE_MS = 30 * 60 * 1000;
const FLUSH_DELAY_MS = 8000;
const FLUSH_AT = 10;
/** The server accepts at most this many events per request */
const MAX_BATCH = 25;
/** The same event twice within this time is one event (React re-renders, double effects) */
const DEDUPE_MS = 2000;

/** Read when sending (not at import), so modules that mock the API client still load */
const endpoint = () => `${API_BASE_URL}/analytics/events`;

let queue: { session: string; event: AnalyticsEvent }[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let listening = false;
let lastEvent = { key: "", at: 0 };
let testing = false;

/** Tests turn tracking on (it is off under the test runner so other tests never send anything) */
export const setAnalyticsTesting = (on: boolean): void => {
  testing = on;
  queue = [];
  lastEvent = { key: "", at: 0 };
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = null;
};

const newId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

export const isTrackingEnabled = (): boolean => {
  if (typeof window === "undefined") return false;
  if (import.meta.env.MODE === "test" && !testing) return false;
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  if (nav.doNotTrack === "1" || (window as Window & { doNotTrack?: string }).doNotTrack === "1") return false;
  if (nav.globalPrivacyControl) return false;
  // Automated browsers (our own checks, crawlers that run scripts) in production
  if (import.meta.env.PROD && nav.webdriver) return false;
  if (window.location.pathname.startsWith("/admin")) return false;
  try {
    return localStorage.getItem(OPT_OUT_KEY) !== "1";
  } catch {
    return false;
  }
};

/** Called when the signed-in user changes: an admin's device stops being counted */
export const setAnalyticsUser = (user: { role?: string } | null): void => {
  if (user?.role !== "admin") return;
  try {
    localStorage.setItem(OPT_OUT_KEY, "1");
  } catch {
    // storage blocked: nothing is tracked anyway
  }
};

/** Count this device again (offered to admins on the Visitors page) */
export const countThisDevice = (): void => {
  try {
    localStorage.removeItem(OPT_OUT_KEY);
  } catch {
    // ignore
  }
};

export const isThisDeviceCounted = (): boolean => {
  try {
    return localStorage.getItem(OPT_OUT_KEY) !== "1";
  } catch {
    return false;
  }
};

const visitorId = (): string | null => {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = newId();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
};

/** Where this visit came from: the referrer, utm_* tags and ad/social click ids on the landing page */
const landingContext = (): VisitState["context"] => {
  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  for (const key of ["source", "medium", "campaign"]) {
    const value = params.get(`utm_${key}`);
    if (value) utm[key] = value.slice(0, 100);
  }
  const clickIds = ["fbclid", "igshid", "gclid"].filter((key) => params.has(key));
  const context: NonNullable<VisitState["context"]> = {};
  if (document.referrer) context.referrer = document.referrer.slice(0, 500);
  if (Object.keys(utm).length) context.utm = utm;
  if (clickIds.length) context.clickIds = clickIds;
  return context;
};

/** The current visit, starting a new one after 30 minutes without activity */
const currentVisit = (now = Date.now()): VisitState | null => {
  try {
    const stored = sessionStorage.getItem(VISIT_KEY);
    let visit: VisitState | null = stored ? (JSON.parse(stored) as VisitState) : null;
    if (!visit || typeof visit.id !== "string" || now - visit.lastActive > IDLE_MS) {
      visit = { id: newId(), lastActive: now, context: landingContext() };
    }
    visit.lastActive = now;
    sessionStorage.setItem(VISIT_KEY, JSON.stringify(visit));
    return visit;
  } catch {
    return null;
  }
};

/** Take the landing context once: it goes with the visit's first batch only */
const takeContext = (sessionId: string): VisitState["context"] => {
  try {
    const visit = JSON.parse(sessionStorage.getItem(VISIT_KEY) || "null") as VisitState | null;
    if (!visit || visit.id !== sessionId || !visit.context) return undefined;
    const { context } = visit;
    delete visit.context;
    sessionStorage.setItem(VISIT_KEY, JSON.stringify(visit));
    return context;
  } catch {
    return undefined;
  }
};

const send = (body: Record<string, unknown>, closing: boolean): void => {
  try {
    const json = JSON.stringify(body);
    const ENDPOINT = endpoint();
    const token = getAccessToken();
    if (token && !closing) {
      // A JSON request with the token links the visit to the signed-in shopper
      void fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: json,
        keepalive: true,
        credentials: "omit",
      }).catch(() => undefined);
      return;
    }
    // text/plain needs no CORS preflight, so it also works while the page closes
    const beaconJson = token ? JSON.stringify({ ...body, auth: token }) : json;
    if (typeof navigator.sendBeacon === "function" && navigator.sendBeacon(ENDPOINT, new Blob([beaconJson], { type: "text/plain" }))) {
      return;
    }
    void fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: beaconJson,
      keepalive: true,
      credentials: "omit",
    }).catch(() => undefined);
  } catch {
    // never let tracking break the page
  }
};

/** Send everything queued (grouped by visit, at most MAX_BATCH events per request) */
export const flushAnalytics = (closing = false): void => {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = null;
  if (queue.length === 0) return;
  const visitor = visitorId();
  const pending = queue;
  queue = [];
  if (!visitor) return;

  const bySession = new Map<string, AnalyticsEvent[]>();
  for (const { session, event } of pending) {
    bySession.set(session, [...(bySession.get(session) || []), event]);
  }
  for (const [session, events] of bySession) {
    const context = takeContext(session);
    for (let i = 0; i < events.length; i += MAX_BATCH) {
      send({ visitor, session, ...(i === 0 ? context : {}), events: events.slice(i, i + MAX_BATCH) }, closing);
    }
  }
};

const listenForPageClose = () => {
  if (listening) return;
  listening = true;
  window.addEventListener("pagehide", () => flushAnalytics(true));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushAnalytics(true);
  });
};

/** Queue one event; batches go out every few seconds, sooner when there are many */
export const track = (type: AnalyticsEventType, data: Omit<AnalyticsEvent, "type" | "path"> & { path?: string } = {}): void => {
  try {
    if (!isTrackingEnabled()) return;
    const path = (data.path ?? window.location.pathname).slice(0, 300);
    const now = Date.now();
    const key = [type, path, data.product, data.query, data.order].join("|");
    if (key === lastEvent.key && now - lastEvent.at < DEDUPE_MS) return;
    lastEvent = { key, at: now };

    if (type === "order_placed" && data.order) {
      // Once per order on this device, however often the success page opens
      const sent: string[] = JSON.parse(sessionStorage.getItem(ORDERS_KEY) || "[]");
      if (sent.includes(data.order)) return;
      sessionStorage.setItem(ORDERS_KEY, JSON.stringify([...sent, data.order].slice(-20)));
    }

    const visit = currentVisit(now);
    if (!visit) return;
    const event: AnalyticsEvent = { type, path };
    if (data.product) event.product = data.product;
    if (data.query) event.query = data.query.slice(0, 100);
    if (typeof data.results === "number" && Number.isFinite(data.results)) event.results = Math.max(0, Math.round(data.results));
    if (data.order) event.order = data.order;
    queue.push({ session: visit.id, event });

    listenForPageClose();
    if (queue.length >= FLUSH_AT) flushAnalytics();
    else if (!flushTimer) flushTimer = setTimeout(() => flushAnalytics(), FLUSH_DELAY_MS);
  } catch {
    // never let tracking break the page
  }
};
