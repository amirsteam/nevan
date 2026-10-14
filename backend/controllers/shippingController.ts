/**
 * Shipping Controller
 * Shipping rates and free-delivery areas: public for display, editable by admins
 */
import { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler";
import { getShippingSettings, updateShippingSettings } from "../services/shippingService";
import { VALLEY_DISTRICTS } from "../utils/shipping";
import { logAdminAction } from "../services/adminLogService";

/**
 * @desc    Current shipping rates (shipping page, cart, checkout)
 * @route   GET /api/v1/shipping/settings
 * @access  Public
 */
export const getPublicSettings = asyncHandler(async (_req: Request, res: Response) => {
  const { updatedAt: _updatedAt, ...settings } = await getShippingSettings();
  res.status(200).json({ status: "success", data: { settings: { ...settings, valleyDistricts: VALLEY_DISTRICTS } } });
});

/**
 * @desc    Shipping settings for editing
 * @route   GET /api/v1/admin/shipping
 * @access  Admin
 */
export const getAdminSettings = asyncHandler(async (_req: Request, res: Response) => {
  const settings = await getShippingSettings();
  res.status(200).json({ status: "success", data: { settings: { ...settings, valleyDistricts: VALLEY_DISTRICTS } } });
});

/**
 * @desc    Save shipping rates and free-delivery areas (applies to new orders)
 * @route   PUT /api/v1/admin/shipping
 * @access  Admin
 */
export const updateSettings = asyncHandler(async (req: Request, res: Response) => {
  const { freeShippingThreshold, valleyRate, provinceRates, freeAreas } = req.body;
  const settings = await updateShippingSettings(
    { freeShippingThreshold, valleyRate, provinceRates, freeAreas },
    (req.user as any)._id,
  );
  await logAdminAction(
    req,
    "shipping.updated",
    { type: "shipping", label: "Shipping settings" },
    `Free from NPR ${settings.freeShippingThreshold}; valley NPR ${settings.valleyRate}; ${settings.freeAreas.length} free area(s)`,
  );
  res.status(200).json({
    status: "success",
    message: "Shipping settings saved",
    data: { settings: { ...settings, valleyDistricts: VALLEY_DISTRICTS } },
  });
});
