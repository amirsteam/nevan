/**
 * Contact Routes
 * Public contact form and newsletter sign-up
 */
import { Router } from "express";
import * as contactController from "../controllers/contactController";
import { contactValidator, subscribeValidator } from "../middleware/validate";
import { contactLimiter, newsletterLimiter } from "../config/rateLimit";

const contactRouter = Router();
// POST /api/v1/contact
contactRouter.post("/", contactLimiter, contactValidator, contactController.submitContact);

const newsletterRouter = Router();
// POST /api/v1/newsletter/subscribe
newsletterRouter.post("/subscribe", newsletterLimiter, subscribeValidator, contactController.subscribe);

export { contactRouter, newsletterRouter };
