/**
 * Notification Controller
 * Handles CRUD operations for in-app notifications
 */
import { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler";
import Notification from "../models/Notification";

/**
 * @desc    Get current user's notifications (paginated)
 * @route   GET /api/v1/notifications
 * @access  Private
 */
const getNotifications = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req.user as any)._id;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments({ userId }),
    Notification.countDocuments({ userId, isRead: false }),
  ]);

  res.status(200).json({
    status: "success",
    data: {
      notifications,
      unreadCount,
    },
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

/**
 * @desc    Get unread notification count
 * @route   GET /api/v1/notifications/unread-count
 * @access  Private
 */
const getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req.user as any)._id;
  const unreadCount = await Notification.countDocuments({ userId, isRead: false });

  res.status(200).json({
    status: "success",
    data: { unreadCount },
  });
});

/**
 * @desc    Mark a notification as read
 * @route   PATCH /api/v1/notifications/:id/read
 * @access  Private
 */
const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req.user as any)._id;

  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId },
    { isRead: true, readAt: new Date() },
    { new: true },
  );

  if (!notification) {
    res.status(404).json({ status: "fail", message: "Notification not found" });
    return;
  }

  res.status(200).json({
    status: "success",
    data: { notification },
  });
});

/**
 * @desc    Mark all notifications as read
 * @route   PATCH /api/v1/notifications/read-all
 * @access  Private
 */
const markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req.user as any)._id;

  await Notification.updateMany(
    { userId, isRead: false },
    { isRead: true, readAt: new Date() },
  );

  res.status(200).json({
    status: "success",
    message: "All notifications marked as read",
  });
});

/**
 * @desc    Delete a notification
 * @route   DELETE /api/v1/notifications/:id
 * @access  Private
 */
const deleteNotification = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req.user as any)._id;

  const notification = await Notification.findOneAndDelete({
    _id: req.params.id,
    userId,
  });

  if (!notification) {
    res.status(404).json({ status: "fail", message: "Notification not found" });
    return;
  }

  res.status(200).json({
    status: "success",
    message: "Notification deleted",
  });
});

export {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
