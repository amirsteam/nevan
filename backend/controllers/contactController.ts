/**
 * Contact Controller
 * Contact form and newsletter sign-up (public), message/subscriber lists (admin)
 */
import { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler";
import AppError from "../utils/AppError";
import * as contactService from "../services/contactService";

/**
 * @desc    Send a message from the contact form
 * @route   POST /api/v1/contact
 * @access  Public
 */
const submitContact = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, phone, subject, message } = req.body;
  await contactService.submitContactMessage({ name, email, phone, subject, message });

  res.status(201).json({
    status: "success",
    message: "Thanks! We've received your message and will reply within 24 hours.",
    data: {},
  });
});

/**
 * @desc    Subscribe to the newsletter
 * @route   POST /api/v1/newsletter/subscribe
 * @access  Public
 */
const subscribe = asyncHandler(async (req: Request, res: Response) => {
  await contactService.subscribe(req.body.email, req.body.source);

  res.status(200).json({
    status: "success",
    message: "You're subscribed! Watch your inbox for new arrivals and offers.",
    data: {},
  });
});

/**
 * @desc    Contact-form messages
 * @route   GET /api/v1/admin/contact-messages
 * @access  Private/Admin
 */
const getContactMessages = asyncHandler(async (req: Request, res: Response) => {
  const { messages, pagination, unreadCount } = await contactService.listContactMessages({
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 20,
    unread: req.query.unread === "true",
  });

  res.status(200).json({
    status: "success",
    results: messages.length,
    pagination,
    data: { messages, unreadCount },
  });
});

/**
 * @desc    Mark a contact message read/unread
 * @route   PUT /api/v1/admin/contact-messages/:id
 * @access  Private/Admin
 */
const updateContactMessage = asyncHandler(async (req: Request, res: Response) => {
  const message = await contactService.setContactMessageRead(
    req.params.id as string,
    req.body.isRead !== false,
  );
  if (!message) throw new AppError("Message not found", 404);

  res.status(200).json({ status: "success", data: { message } });
});

/**
 * @desc    Newsletter subscribers
 * @route   GET /api/v1/admin/subscribers
 * @access  Private/Admin
 */
const getSubscribers = asyncHandler(async (req: Request, res: Response) => {
  const { subscribers, pagination } = await contactService.listSubscribers({
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 50,
  });

  res.status(200).json({
    status: "success",
    results: subscribers.length,
    pagination,
    data: { subscribers },
  });
});

export { submitContact, subscribe, getContactMessages, updateContactMessage, getSubscribers };
