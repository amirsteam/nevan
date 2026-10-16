/**
 * Visitor analytics (public)
 * POST /api/v1/analytics/events: a batch of storefront events (utils/analytics.ts
 * in the frontend). Signed-in shoppers send their access token so the visit is
 * linked to them; when the page is closing the browser sends the batch with
 * navigator.sendBeacon as text/plain (no CORS preflight), which can't set
 * headers, so a signed-in shopper's token comes as `auth` in the body.
 */
import express, { Request, Response, NextFunction } from "express";
import asyncHandler from "../utils/asyncHandler";
import { optionalAuth } from "../middleware/auth";
import { analyticsEventsValidator } from "../middleware/validate";
import { analyticsLimiter } from "../config/rateLimit";
import { recordEvents } from "../services/analyticsService";

const router = express.Router();

/** sendBeacon bodies arrive as text/plain JSON */
const parseBeaconBody = (req: Request, _res: Response, next: NextFunction) => {
  if (typeof req.body === "string") {
    try {
      req.body = JSON.parse(req.body);
    } catch {
      req.body = {};
    }
  }
  next();
};

/** A beacon's token (body `auth`) is used like the Authorization header, then dropped */
const tokenFromBody = (req: Request, _res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === "object" && "auth" in req.body) {
    const { auth, ...rest } = req.body;
    if (!req.headers.authorization && typeof auth === "string" && auth.length < 2000) {
      req.headers.authorization = `Bearer ${auth}`;
    }
    req.body = rest;
  }
  next();
};

router.post(
  "/events",
  analyticsLimiter,
  express.text({ type: "text/plain", limit: "16kb" }),
  parseBeaconBody,
  tokenFromBody,
  optionalAuth,
  analyticsEventsValidator,
  asyncHandler(async (req: Request, res: Response) => {
    await recordEvents(req.body, { user: req.user as any, userAgent: req.get("user-agent") });
    res.status(204).end();
  }),
);

export default router;
