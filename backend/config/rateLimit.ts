/**
 * Rate Limiters
 * Each limiter keeps its own per-IP counter. Many Nepali mobile users share
 * carrier NAT IPs, so the general limit is generous and the strict limits
 * only apply to brute-forceable endpoints.
 */
import rateLimit, { Options } from "express-rate-limit";

const MINUTE = 60 * 1000;

const message = (text: string) => ({ status: "fail", message: text }) as any;

const createLimiter = (options: Partial<Options>) =>
  rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    // Tests hit auth endpoints many times from one IP
    skip: () => process.env.NODE_ENV === "test",
    ...options,
  });

// All /api routes
export const apiLimiter = createLimiter({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || String(15 * MINUTE), 10),
  limit: parseInt(process.env.RATE_LIMIT_MAX || "1000", 10),
  message: message("Too many requests from this IP, please try again later"),
});

// Login: only failed attempts count, so shared IPs aren't locked out by normal use
export const loginLimiter = createLimiter({
  windowMs: 15 * MINUTE,
  limit: parseInt(process.env.AUTH_RATE_LIMIT_MAX || "10", 10),
  skipSuccessfulRequests: true,
  message: message("Too many failed login attempts, please try again in 15 minutes"),
});

export const registerLimiter = createLimiter({
  windowMs: 60 * MINUTE,
  limit: 20,
  message: message("Too many accounts created from this IP, please try again later"),
});

// Requesting reset codes sends email, so keep it tight
export const forgotPasswordLimiter = createLimiter({
  windowMs: 60 * MINUTE,
  limit: 5,
  message: message("Too many reset requests, please try again in an hour"),
});

// Guessing reset codes: failures only (codes are also locked after 5 wrong tries)
export const resetCodeLimiter = createLimiter({
  windowMs: 15 * MINUTE,
  limit: 10,
  skipSuccessfulRequests: true,
  message: message("Too many attempts, please try again in 15 minutes"),
});

// Payment verification calls third-party gateways
export const paymentLimiter = createLimiter({
  windowMs: 15 * MINUTE,
  limit: 30,
  message: message("Too many payment requests, please try again later"),
});

// Anonymous visitors starting a support chat (each session can open a conversation)
export const guestChatLimiter = createLimiter({
  windowMs: 60 * MINUTE,
  limit: 10,
  message: message("Too many chat sessions started from this network. Please try again later."),
});

// Chat image uploads (guests can upload too)
export const chatUploadLimiter = createLimiter({
  windowMs: 15 * MINUTE,
  limit: 30,
  message: message("Too many images uploaded. Please try again later."),
});

// Contact form: each message emails the store inbox
export const contactLimiter = createLimiter({
  windowMs: 60 * MINUTE,
  limit: 5,
  message: message("Too many messages sent from this network. Please try again later or chat with us."),
});

export const newsletterLimiter = createLimiter({
  windowMs: 60 * MINUTE,
  limit: 10,
  message: message("Too many sign-up attempts. Please try again later."),
});
