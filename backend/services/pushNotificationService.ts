/**
 * Push Notification Service
 * Sends push notifications to users via Expo Push Notification Service
 */
import { getUserPushTokens } from "./authService";

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

/**
 * Send push notification to a specific user
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
  },
): Promise<ExpoPushTicket[]> {
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
  // For now, this is a simplified version
  const User = (await import("../models/User")).default;
  const usersWithTokens = await User.find({
    "pushTokens.0": { $exists: true },
    isActive: true,
  }).select("pushTokens");

  const allTokens: string[] = [];
  usersWithTokens.forEach((user) => {
    user.pushTokens.forEach((pt) => {
      allTokens.push(pt.token);
    });
  });

  if (allTokens.length === 0) {
    return [];
  }

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
 */
async function sendPushMessages(
  messages: ExpoPushMessage[],
): Promise<ExpoPushTicket[]> {
  // Expo recommends sending in batches of 100
  const BATCH_SIZE = 100;
  const tickets: ExpoPushTicket[] = [];

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
        tickets.push(...result.data);
      }
    } catch (error) {
      console.error("Error sending push notifications:", error);
      // Add error tickets for this batch
      batch.forEach(() => {
        tickets.push({
          status: "error",
          message: "Failed to send notification",
        });
      });
    }
  }

  // Log any errors
  tickets.forEach((ticket, index) => {
    if (ticket.status === "error") {
      console.error(
        `Push notification error for message ${index}:`,
        ticket.message,
        ticket.details?.error,
      );
    }
  });

  return tickets;
}

export default {
  sendPushNotification,
  sendPushNotificationToMany,
  sendOrderStatusNotification,
  sendPromotionalNotification,
};
