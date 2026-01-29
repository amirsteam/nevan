import React, { useEffect, useCallback, useRef } from "react";
import {
  NavigationContainer,
  NavigationContainerRef,
} from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Provider } from "react-redux";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import store from "./src/store";
import RootNavigator from "./src/navigation/RootNavigator";
import { useNotifications, getNotificationData } from "./src/hooks";
import type { RootStackParamList } from "./src/navigation/types";

// Inner app component that uses hooks
function AppContent(): JSX.Element {
  const navigationRef =
    useRef<NavigationContainerRef<RootStackParamList>>(null);

  // Handle notification tap - navigate to appropriate screen
  const handleNotificationResponse = useCallback(
    (response: Notifications.NotificationResponse) => {
      const data = getNotificationData(response.notification);

      if (!navigationRef.current) return;

      switch (data.type) {
        case "order_update":
          if (data.orderId) {
            // Navigate to order detail (requires implementing OrderDetail screen)
            console.log("Navigate to order:", data.orderId);
          }
          break;
        case "back_in_stock":
          if (data.productSlug) {
            navigationRef.current.navigate("App", {
              screen: "Main",
              params: {
                screen: "HomeTab",
                params: {
                  screen: "ProductDetail",
                  params: { slug: data.productSlug },
                },
              },
            });
          }
          break;
        case "promotion":
          // Navigate to promotions or home
          navigationRef.current.navigate("App", {
            screen: "Main",
            params: {
              screen: "HomeTab",
              params: {
                screen: "HomeScreen",
              },
            },
          });
          break;
        default:
          // Default: go to home
          break;
      }
    },
    [],
  );

  // Initialize notifications
  const { expoPushToken, notification, isLoading } = useNotifications({
    onNotificationResponse: handleNotificationResponse,
    onNotificationReceived: (notif) => {
      console.log("Notification received:", notif.request.content.title);
    },
  });

  useEffect(() => {
    if (expoPushToken) {
      console.log("App initialized with push token:", expoPushToken);
    }
  }, [expoPushToken]);

  return (
    <NavigationContainer ref={navigationRef}>
      <StatusBar style="auto" />
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App(): JSX.Element {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <AppContent />
      </SafeAreaProvider>
    </Provider>
  );
}
