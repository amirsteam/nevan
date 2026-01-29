/**
 * Push Notifications Hook
 * React hook for handling push notifications in components
 */
import { useEffect, useRef, useState, useCallback } from "react";
import * as Notifications from "expo-notifications";
import { useAppSelector } from "../store/hooks";
import {
  initializePushNotifications,
  registerPushToken,
  unregisterPushToken,
  NotificationData,
} from "../services/notificationService";

export interface UseNotificationsReturn {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  isLoading: boolean;
  error: Error | null;
}

export interface UseNotificationsOptions {
  onNotificationReceived?: (notification: Notifications.Notification) => void;
  onNotificationResponse?: (
    response: Notifications.NotificationResponse,
  ) => void;
}

/**
 * Hook to manage push notifications
 */
export function useNotifications(
  options: UseNotificationsOptions = {},
): UseNotificationsReturn {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] =
    useState<Notifications.Notification | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  const notificationListener = useRef<Notifications.EventSubscription | null>(
    null,
  );
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  const previousToken = useRef<string | null>(null);

  // Initialize notifications
  useEffect(() => {
    const init = async () => {
      try {
        setIsLoading(true);
        const token = await initializePushNotifications();
        setExpoPushToken(token);

        // Register token with backend if user is logged in
        if (token && isAuthenticated) {
          await registerPushToken(token);
          previousToken.current = token;
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error("Failed to initialize notifications"),
        );
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  // Handle auth state changes - register/unregister token
  useEffect(() => {
    const handleAuthChange = async () => {
      if (!expoPushToken) return;

      if (isAuthenticated && !previousToken.current) {
        // User logged in - register token
        await registerPushToken(expoPushToken);
        previousToken.current = expoPushToken;
      } else if (!isAuthenticated && previousToken.current) {
        // User logged out - unregister token
        await unregisterPushToken(previousToken.current);
        previousToken.current = null;
      }
    };

    handleAuthChange();
  }, [isAuthenticated, expoPushToken]);

  // Set up notification listeners
  useEffect(() => {
    // Listener for notifications received while app is foregrounded
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        setNotification(notification);
        options.onNotificationReceived?.(notification);
      });

    // Listener for when user taps on notification
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        options.onNotificationResponse?.(response);
      });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [options.onNotificationReceived, options.onNotificationResponse]);

  return {
    expoPushToken,
    notification,
    isLoading,
    error,
  };
}

/**
 * Get notification data with proper typing
 */
export function getNotificationData(
  notification: Notifications.Notification,
): NotificationData {
  return (notification.request.content.data as NotificationData) || {};
}

export default useNotifications;
