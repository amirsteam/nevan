/**
 * Push Notification Service
 * Sends push notifications to users via Expo Push Notification Service
 */
import { getUserPushTokens } from "./authService";
import User from "../models/User";
import Notification from "../models/Notification";

interface ExpoPushMessage {
  to: string;
  sound?: "default" | null;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channelId?: string;
  priority?: "default" | "normal" | "high";
  badge?: number;
}

interface ExpoPushTicket {
  id?: string;
  status: "ok" | "error";
  message?: string;
  details?: {
    error?: string;
  };
}

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_RECEIPTS_URL = "https://exp.host/--/api/v2/push/getReceipts";

/**
 * Send push notification to a specific user
 * Also persists the notification in the database for the in-app notification center
 */
export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
  options?: {
    channelId?: string;
    sound?: "default" | null;
    badge?: number;
    skipPersist?: boolean; // Set true for transient notifications (e.g. typing)
  },
): Promise<ExpoPushTicket[]> {
  // Persist notification to DB for the bell icon / notification center
  if (!options?.skipPersist) {
    try {
      await Notification.create({
        userId,
        type: (data?.type as string) || "general",
        title,
        body,
        data,
      });
    } catch (err) {
      console.error("Failed to persist notification:", err);
    }
  }

  const tokens = await getUserPushTokens(userId);

  if (tokens.length === 0) {
    console.log(`No push tokens found for user ${userId}`);
    return [];
  }

  const messages: ExpoPushMessage[] = tokens.map((t) => ({
    to: t.token,
    sound: options?.sound ?? "default",
    title,
    body,
    data,
    channelId: options?.channelId,
    priority: "high",
    badge: options?.badge,
  }));

  return sendPushMessages(messages);
}

/**
 * Send push notification to multiple users
 * Also persists notifications in the database for each user
 */
export async function sendPushNotificationToMany(
  userIds: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>,
  options?: {
    channelId?: string;
    sound?: "default" | null;
  },
): Promise<ExpoPushTicket[]> {
  // Persist notification for each user
  try {
    const notifDocs = userIds.map((userId) => ({
      userId,
      type: (data?.type as string) || "general",
      title,
      body,
      data,
    }));
    await Notification.insertMany(notifDocs);
  } catch (err) {
    console.error("Failed to persist notifications for multiple users:", err);
  }

  const allTokens: string[] = [];

  for (const userId of userIds) {
    const tokens = await getUserPushTokens(userId);
    allTokens.push(...tokens.map((t) => t.token));
  }

  if (allTokens.length === 0) {
    console.log("No push tokens found for any users");
    return [];
  }

  const messages: ExpoPushMessage[] = allTokens.map((token) => ({
    to: token,
    sound: options?.sound ?? "default",
    title,
    body,
    data,
    channelId: options?.channelId,
    priority: "high",
  }));

  return sendPushMessages(messages);
}

/**
 * Send order status update notification
 */
export async function sendOrderStatusNotification(
  userId: string,
  orderId: string,
  status: string,
  orderNumber?: string,
): Promise<ExpoPushTicket[]> {
  const statusMessages: Record<string, { title: string; body: string }> = {
    processing: {
      title: "Order Confirmed! 🎉",
      body: `Your order ${orderNumber || orderId} is being processed.`,
    },
    shipped: {
      title: "Order Shipped! 📦",
      body: `Your order ${orderNumber || orderId} is on its way!`,
    },
    delivered: {
      title: "Order Delivered! ✅",
      body: `Your order ${orderNumber || orderId} has been delivered.`,
    },
    cancelled: {
      title: "Order Cancelled",
      body: `Your order ${orderNumber || orderId} has been cancelled.`,
    },
  };

  const message = statusMessages[status] || {
    title: "Order Update",
    body: `Your order ${orderNumber || orderId} status: ${status}`,
  };

  return sendPushNotification(
    userId,
    message.title,
    message.body,
    {
      type: "order_update",
      orderId,
      status,
    },
    {
      channelId: "orders",
    },
  );
}

/**
 * Send promotional notification to all users with tokens
 */
export async function sendPromotionalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<ExpoPushTicket[]> {
  // In production, you'd want to batch this and handle pagination
  const usersWithTokens = await User.find({
    "pushTokens.0": { $exists: true },
    isActive: true,
  }).select("_id pushTokens");

  if (usersWithTokens.length === 0) {
    return [];
  }

  // Persist notification for all users with tokens
  try {
    const notifDocs = usersWithTokens.map((user) => ({
      userId: user._id,
      type: "promotion",
      title,
      body,
      data: { ...data, type: "promotion" },
    }));
    await Notification.insertMany(notifDocs);
  } catch (err) {
    console.error("Failed to persist promotional notifications:", err);
  }

  const allTokens: string[] = [];
  usersWithTokens.forEach((user) => {
    user.pushTokens.forEach((pt) => {
      allTokens.push(pt.token);
    });
  });

  const messages: ExpoPushMessage[] = allTokens.map((token) => ({
    to: token,
    sound: "default",
    title,
    body,
    data: { ...data, type: "promotion" },
    channelId: "promotions",
    priority: "default",
  }));

  return sendPushMessages(messages);
}

/**
 * Internal function to send messages to Expo Push API
 * Processes tickets and schedules receipt checking for cleanup
 */
async function sendPushMessages(
  messages: ExpoPushMessage[],
): Promise<ExpoPushTicket[]> {
  // Expo recommends sending in batches of 100
  const BATCH_SIZE = 100;
  const tickets: ExpoPushTicket[] = [];
  const tokenToTicketMap: Map<string, string> = new Map(); // ticketId -> token

  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);

    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(batch),
      });

      const result = (await response.json()) as { data?: ExpoPushTicket[] };

      if (result.data) {
        // Map ticket IDs to tokens for receipt checking
        result.data.forEach((ticket, idx) => {
          if (ticket.id) {
            tokenToTicketMap.set(ticket.id, batch[idx].to);
          }
        });
        tickets.push(...result.data);
      }
    } catch (error) {
      console.error("Error sending push notifications:", error);
      batch.forEach(() => {
        tickets.push({
          status: "error",
          message: "Failed to send notification",
        });
      });
    }
  }

  // Handle immediate errors (e.g., DeviceNotRegistered)
  const tokensToRemove: string[] = [];
  tickets.forEach((ticket, index) => {
    if (ticket.status === "error") {
      console.error(
        `Push notification error for message ${index}:`,
        ticket.message,
        ticket.details?.error,
      );
      // If device is not registered, mark token for removal
      if (ticket.details?.error === "DeviceNotRegistered") {
        const token = messages[index]?.to;
        if (token) tokensToRemove.push(token);
      }
    }
  });

  // Clean up invalid tokens immediately
  if (tokensToRemove.length > 0) {
    removeInvalidTokens(tokensToRemove).catch((err) =>
      console.error("Failed to clean up invalid tokens:", err),
    );
  }

  // Schedule receipt checking after 15 seconds (Expo recommendation)
  const ticketIds = tickets
    .filter((t) => t.status === "ok" && t.id)
    .map((t) => t.id!);

  if (ticketIds.length > 0) {
    setTimeout(() => {
      checkPushReceipts(ticketIds, tokenToTicketMap).catch((err) =>
        console.error("Failed to check push receipts:", err),
      );
    }, 15_000);
  }

  return tickets;
}

/**
 * Check push notification receipts from Expo
 * Handles DeviceNotRegistered errors by removing invalid tokens
 */
async function checkPushReceipts(
  ticketIds: string[],
  tokenMap: Map<string, string>,
): Promise<void> {
  const BATCH_SIZE = 300;
  const tokensToRemove: string[] = [];

  for (let i = 0; i < ticketIds.length; i += BATCH_SIZE) {
    const batch = ticketIds.slice(i, i + BATCH_SIZE);

    try {
      const response = await fetch(EXPO_RECEIPTS_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids: batch }),
      });

      const result = (await response.json()) as {
        data?: Record<
          string,
          { status: "ok" | "error"; details?: { error?: string } }
        >;
      };

      if (result.data) {
        for (const [ticketId, receipt] of Object.entries(result.data)) {
          if (
            receipt.status === "error" &&
            receipt.details?.error === "DeviceNotRegistered"
          ) {
            const token = tokenMap.get(ticketId);
            if (token) {
              tokensToRemove.push(token);
              console.log(
                `📱 Token ${token.substring(0, 20)}... is no longer registered`,
              );
            }
          }
        }
      }
    } catch (error) {
      console.error("Error checking push receipts:", error);
    }
  }

  if (tokensToRemove.length > 0) {
    await removeInvalidTokens(tokensToRemove);
  }
}

/**
 * Remove invalid push tokens from all users
 */
async function removeInvalidTokens(tokens: string[]): Promise<void> {
  try {
    const result = await User.updateMany(
      { "pushTokens.token": { $in: tokens } },
      { $pull: { pushTokens: { token: { $in: tokens } } } },
    );
    console.log(
      `🧹 Removed ${tokens.length} invalid push token(s) from ${result.modifiedCount} user(s)`,
    );
  } catch (error) {
    console.error("Error removing invalid push tokens:", error);
  }
}

export default {
  sendPushNotification,
  sendPushNotificationToMany,
  sendOrderStatusNotification,
  sendPromotionalNotification,
};
