/**
 * Push Notification Service
 * Handles notification permissions, token registration, and notification scheduling
 */
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import api from "../api/axios";

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationData {
  type?: "order_update" | "promotion" | "back_in_stock" | "chat_message" | "general";
  orderId?: string;
  productSlug?: string;
  roomId?: string;
  senderId?: string;
  senderRole?: "customer" | "admin";
  [key: string]: unknown;
}

export interface NotificationPayload {
  title: string;
  body: string;
  data?: NotificationData;
}

/**
 * Request notification permissions from the user
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    console.log("Push notifications require a physical device");
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Notification permission not granted");
    return false;
  }

  return true;
}

/**
 * Get the Expo push token for this device
 */
export async function getExpoPushToken(): Promise<string | null> {
  try {
    if (!Device.isDevice) {
      console.log("Push tokens require a physical device");
      return null;
    }

    // Get project ID from app config
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    if (!projectId) {
      console.log("No project ID found for push notifications");
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    return tokenData.data;
  } catch (error) {
    console.error("Error getting push token:", error);
    return null;
  }
}

/**
 * Register push token with the backend
 */
export async function registerPushToken(token: string): Promise<boolean> {
  try {
    await api.post("/auth/push-token", {
      token,
      platform: Platform.OS,
      deviceName: Device.deviceName || "Unknown",
    });
    console.log("Push token registered with backend");
    return true;
  } catch (error) {
    console.error("Failed to register push token:", error);
    return false;
  }
}

/**
 * Unregister push token from the backend (e.g., on logout)
 */
export async function unregisterPushToken(token: string): Promise<boolean> {
  try {
    await api.delete("/auth/push-token", {
      data: { token },
    });
    console.log("Push token unregistered from backend");
    return true;
  } catch (error) {
    console.error("Failed to unregister push token:", error);
    return false;
  }
}

/**
 * Initialize push notifications - call this on app startup
 */
export async function initializePushNotifications(): Promise<string | null> {
  const hasPermission = await requestNotificationPermissions();

  if (!hasPermission) {
    return null;
  }

  const token = await getExpoPushToken();

  if (token) {
    // Register with backend (if user is logged in, this should be called after login)
    // For now, just return the token
    console.log("Push token:", token);
  }

  // Set up Android notification channel
  if (Platform.OS === "android") {
    await setupAndroidChannel();
  }

  return token;
}

/**
 * Set up Android notification channel
 */
async function setupAndroidChannel(): Promise<void> {
  await Notifications.setNotificationChannelAsync("orders", {
    name: "Order Updates",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#FF9999",
    sound: "default",
  });

  await Notifications.setNotificationChannelAsync("chat", {
    name: "Chat Messages",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 100, 100, 100],
    lightColor: "#6366F1",
    sound: "default",
  });

  await Notifications.setNotificationChannelAsync("promotions", {
    name: "Promotions & Offers",
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: "default",
  });

  await Notifications.setNotificationChannelAsync("general", {
    name: "General",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/**
 * Schedule a local notification
 */
export async function scheduleLocalNotification(
  payload: NotificationPayload,
  triggerSeconds: number = 1,
): Promise<string> {
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: payload.title,
      body: payload.body,
      data: payload.data || {},
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: triggerSeconds,
    },
  });

  return id;
}

/**
 * Cancel a scheduled notification
 */
export async function cancelNotification(
  notificationId: string,
): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Get the badge count
 */
export async function getBadgeCount(): Promise<number> {
  return await Notifications.getBadgeCountAsync();
}

/**
 * Set the badge count
 */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Clear the badge count
 */
export async function clearBadge(): Promise<void> {
  await Notifications.setBadgeCountAsync(0);
}

export default {
  requestNotificationPermissions,
  getExpoPushToken,
  registerPushToken,
  unregisterPushToken,
  initializePushNotifications,
  scheduleLocalNotification,
  cancelNotification,
  cancelAllNotifications,
  getBadgeCount,
  setBadgeCount,
  clearBadge,
};
