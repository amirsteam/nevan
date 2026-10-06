/**
 * Contact Service
 * Contact-form messages and newsletter sign-ups
 */
import ContactMessage, { IContactMessage } from "../models/ContactMessage";
import Subscriber from "../models/Subscriber";
import { sendEmail, escapeHtml } from "../utils/email";
import { paginate, PaginationResult } from "../utils/helpers";

interface ContactInput {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
}

/** Inbox that receives contact-form copies */
const getStoreInbox = (): string | undefined =>
  process.env.CONTACT_EMAIL || process.env.SMTP_USER || undefined;

/**
 * Store the message, then email a copy to the store inbox. A failed email
 * doesn't fail the request: the message is already saved for the admin panel.
 */
const submitContactMessage = async (input: ContactInput): Promise<IContactMessage> => {
  const message = await ContactMessage.create(input);

  const inbox = getStoreInbox();
  if (inbox) {
    try {
      await sendEmail({
        to: inbox,
        replyTo: input.email,
        subject: `Contact form: ${input.subject || "New message"} — ${input.name}`,
        text: [
          `From: ${input.name} <${input.email}>`,
          input.phone ? `Phone: ${input.phone}` : null,
          input.subject ? `Subject: ${input.subject}` : null,
          "",
          input.message,
        ]
          .filter((line) => line !== null)
          .join("\n"),
        html: `<p><strong>From:</strong> ${escapeHtml(input.name)} &lt;${escapeHtml(input.email)}&gt;</p>${
          input.phone ? `<p><strong>Phone:</strong> ${escapeHtml(input.phone)}</p>` : ""
        }${input.subject ? `<p><strong>Subject:</strong> ${escapeHtml(input.subject)}</p>` : ""}<p style="white-space:pre-wrap">${escapeHtml(
          input.message,
        )}</p>`,
      });
      message.emailed = true;
      await message.save();
    } catch (error) {
      console.error("Failed to email contact message:", error);
    }
  }

  return message;
};

/** Idempotent: subscribing twice (or re-subscribing) just succeeds */
const subscribe = async (email: string, source = "website"): Promise<void> => {
  await Subscriber.updateOne(
    { email },
    { $set: { isActive: true }, $setOnInsert: { email, source } },
    { upsert: true },
  );
};

const listContactMessages = async (
  options: { page?: number; limit?: number; unread?: boolean } = {},
): Promise<{ messages: IContactMessage[]; pagination: PaginationResult; unreadCount: number }> => {
  const { page = 1, limit = 20, unread } = options;
  const filter = unread ? { isRead: false } : {};

  const [total, unreadCount] = await Promise.all([
    ContactMessage.countDocuments(filter),
    ContactMessage.countDocuments({ isRead: false }),
  ]);
  const pagination = paginate(page, limit, total);
  const messages = await ContactMessage.find(filter)
    .sort({ createdAt: -1 })
    .skip(pagination.skip)
    .limit(pagination.itemsPerPage);

  return { messages, pagination, unreadCount };
};

const setContactMessageRead = async (id: string, isRead: boolean): Promise<IContactMessage | null> =>
  ContactMessage.findByIdAndUpdate(id, { isRead }, { new: true });

const listSubscribers = async (options: { page?: number; limit?: number } = {}) => {
  const { page = 1, limit = 50 } = options;
  const filter = { isActive: true };
  const total = await Subscriber.countDocuments(filter);
  const pagination = paginate(page, limit, total);
  const subscribers = await Subscriber.find(filter)
    .sort({ createdAt: -1 })
    .skip(pagination.skip)
    .limit(pagination.itemsPerPage)
    .select("email source createdAt");
  return { subscribers, pagination };
};

export {
  submitContactMessage,
  subscribe,
  listContactMessages,
  setContactMessageRead,
  listSubscribers,
};
