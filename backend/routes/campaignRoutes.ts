/**
 * Campaign Routes (public)
 * Admin management lives in adminRoutes.ts under /admin/campaigns
 */
import express from "express";
import * as campaignController from "../controllers/campaignController";
import { optionalAuth } from "../middleware/auth";

const router = express.Router();

router.get("/live", optionalAuth, campaignController.getLive);
router.get("/:slug", campaignController.getBySlug);

export default router;
