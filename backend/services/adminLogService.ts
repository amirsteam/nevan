/**
 * Records admin actions for the Activity page. Logging never fails the action
 * it describes.
 */
import { Request } from "express";
import AdminLog from "../models/AdminLog";
import { paginate, PaginationResult } from "../utils/helpers";

export type AdminAction =
  | "user.activated"
  | "user.deactivated"
  | "user.role"
  | "user.two_factor_reset"
  | "order.refund"
  | "order.cash_collected"
  | "product.deleted"
  | "product.archived"
  | "category.deleted"
  | "shipping.updated"
  | "campaign.created"
  | "campaign.updated"
  | "campaign.deleted"
  | "campaign.notified";

export const logAdminAction = async (
  req: Request,
  action: AdminAction,
  target: { type: string; id?: unknown; label?: string },
  details?: string,
): Promise<void> => {
  const admin = req.user as any;
  if (!admin?._id) return;
  try {
    await AdminLog.create({
      admin: admin._id,
      adminName: admin.name || admin.email || "",
      action,
      target: { type: target.type, id: target.id ? String(target.id) : undefined, label: target.label },
      details: details?.slice(0, 500),
    });
  } catch (error) {
    console.error("Could not record admin action:", error);
  }
};

export const getAdminLog = async (page = 1, limit = 30): Promise<{ entries: unknown[]; pagination: PaginationResult }> => {
  const total = await AdminLog.countDocuments();
  const pagination = paginate(page, limit, total);
  const entries = await AdminLog.find().sort({ createdAt: -1 }).skip(pagination.skip).limit(pagination.itemsPerPage).lean();
  return { entries, pagination };
};
