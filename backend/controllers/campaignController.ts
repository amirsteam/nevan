/**
 * Campaign Controller
 * Public: the live campaign and campaign sale pages.
 * Admin: manage festival/event campaigns.
 */
import { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler";
import AppError from "../utils/AppError";
import * as campaignService from "../services/campaignService";

/**
 * @desc    The campaign running now (null when none). Admins can pass
 *          ?preview=<id> to see any campaign before it goes live.
 * @route   GET /api/v1/campaigns/live
 * @access  Public
 */
const getLive = asyncHandler(async (req: Request, res: Response) => {
  const previewId = typeof req.query.preview === "string" ? req.query.preview : "";
  const isAdmin = (req.user as any)?.role === "admin";
  const campaign =
    previewId && isAdmin
      ? await campaignService.getPreviewCampaign(previewId)
      : await campaignService.getLivePublicCampaign();

  // Not cached by browsers: when an admin publishes or presses "Start now",
  // the next page load must show it (the server-side cache is cleared on save)
  res.set("Cache-Control", "no-store");
  res.status(200).json({ status: "success", data: { campaign } });
});

/**
 * @desc    A published campaign by slug (sale page; includes ended ones)
 * @route   GET /api/v1/campaigns/:slug
 * @access  Public
 */
const getBySlug = asyncHandler(async (req: Request, res: Response) => {
  const campaign = await campaignService.getPublicCampaignBySlug(String(req.params.slug).toLowerCase());
  res.status(200).json({ status: "success", data: { campaign } });
});

// ----------------------------- Admin -----------------------------

const adminId = (req: Request) => String((req.user as any)?._id || "");

const presets = asyncHandler(async (_req: Request, res: Response) => {
  res.status(200).json({ status: "success", data: campaignService.getPresets() });
});

const list = asyncHandler(async (_req: Request, res: Response) => {
  const campaigns = await campaignService.listCampaigns();
  res.status(200).json({ status: "success", results: campaigns.length, data: { campaigns } });
});

const getOne = asyncHandler(async (req: Request, res: Response) => {
  const campaign = await campaignService.getCampaign(String(req.params.id));
  res.status(200).json({ status: "success", data: { campaign: campaignService.toAdminCampaign(campaign) } });
});

const create = asyncHandler(async (req: Request, res: Response) => {
  const campaign = await campaignService.createCampaign(req.body, adminId(req));
  res.status(201).json({
    status: "success",
    message: "Campaign created",
    data: { campaign: campaignService.toAdminCampaign(campaign) },
  });
});

const update = asyncHandler(async (req: Request, res: Response) => {
  const campaign = await campaignService.updateCampaign(String(req.params.id), req.body);
  res.status(200).json({
    status: "success",
    message: "Campaign saved",
    data: { campaign: campaignService.toAdminCampaign(campaign) },
  });
});

const remove = asyncHandler(async (req: Request, res: Response) => {
  await campaignService.deleteCampaign(String(req.params.id));
  res.status(200).json({ status: "success", message: "Campaign deleted", data: null });
});

const duplicate = asyncHandler(async (req: Request, res: Response) => {
  const campaign = await campaignService.duplicateCampaign(String(req.params.id), adminId(req));
  res.status(201).json({
    status: "success",
    message: "Campaign duplicated as a draft",
    data: { campaign: campaignService.toAdminCampaign(campaign) },
  });
});

const bannerVariant = (req: Request): "desktop" | "mobile" =>
  req.query.variant === "mobile" ? "mobile" : "desktop";

const uploadBanner = asyncHandler(async (req: Request & { file?: any }, res: Response) => {
  if (!req.file) throw new AppError("Please choose an image", 400);
  const campaign = await campaignService.setBanner(String(req.params.id), bannerVariant(req), req.file);
  res.status(200).json({ status: "success", data: { campaign: campaignService.toAdminCampaign(campaign) } });
});

const deleteBanner = asyncHandler(async (req: Request, res: Response) => {
  const campaign = await campaignService.removeBanner(String(req.params.id), bannerVariant(req));
  res.status(200).json({ status: "success", data: { campaign: campaignService.toAdminCampaign(campaign) } });
});

const notify = asyncHandler(async (req: Request, res: Response) => {
  const campaign = await campaignService.notifyNow(String(req.params.id));
  res.status(200).json({
    status: "success",
    message: "Notification sent",
    data: { campaign: campaignService.toAdminCampaign(campaign) },
  });
});

const stats = asyncHandler(async (req: Request, res: Response) => {
  const data = await campaignService.campaignStats(String(req.params.id));
  res.status(200).json({ status: "success", data: { stats: data } });
});

export {
  getLive,
  getBySlug,
  presets,
  list,
  getOne,
  create,
  update,
  remove,
  duplicate,
  uploadBanner,
  deleteBanner,
  notify,
  stats,
};
