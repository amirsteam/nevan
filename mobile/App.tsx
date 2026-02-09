import React, { useEffect, useCallback, useRef, useState } from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import {
  NavigationContainer,
  NavigationContainerRef,
} from "@react-navigation/native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { Provider } from "react-redux";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import { MessageCircle } from "lucide-react-native";
import store from "./src/store";
import RootNavigator from "./src/navigation/RootNavigator";
import linking from "./src/navigation/linking";
import { ToastProvider, NetworkStatus, SplashScreen } from "./src/components";
import { useNotifications, getNotificationData } from "./src/hooks";
import { useAppSelector } from "./src/store/hooks";
import type { RootStackParamList } from "./src/navigation/types";

// Inner app component that uses hooks
function AppContent(): React.ReactElement {
  const [showSplash, setShowSplash] = useState(true);
  const [currentRouteName, setCurrentRouteName] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const navigationRef =
    useRef<NavigationContainerRef<RootStackParamList>>(null);
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  // Handle notification tap - navigate to appropriate screen
  const handleNotificationResponse = useCallback(
    (response: Notifications.NotificationResponse) => {
      const data = getNotificationData(response.notification);

      if (!navigationRef.current) return;

      switch (data.type) {
        case "order_update":
          if (data.orderId) {
            navigationRef.current.navigate("App", {
              screen: "Main",
              params: {
                screen: "ProfileTab",
                params: {
                  screen: "OrderDetail",
                  params: { orderId: data.orderId },
                },
              },
            });
          }
          break;
        case "chat_message":
          // Navigate to chat screen
          navigationRef.current.navigate("App", {
            screen: "Main",
            params: {
              screen: "ProfileTab",
              params: {
                screen: "Chat",
              },
            },
          });
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

  // Handle foreground notification received
  const handleNotificationReceived = useCallback(
    (notif: Notifications.Notification) => {
      console.log("Notification received:", notif.request.content.title);
    },
    [],
  );

  // Initialize notifications
  const { expoPushToken, notification, isLoading } = useNotifications({
    onNotificationResponse: handleNotificationResponse,
    onNotificationReceived: handleNotificationReceived,
  });

  useEffect(() => {
    if (expoPushToken) {
      console.log("App initialized with push token:", expoPushToken);
    }
  }, [expoPushToken]);

  const handleStateChange = useCallback(() => {
    const route = navigationRef.current?.getCurrentRoute();
    setCurrentRouteName(route?.name ?? null);
  }, []);

  return (
    <NavigationContainer
      ref={navigationRef}
      linking={linking}
      onReady={handleStateChange}
      onStateChange={handleStateChange}
    >
      <StatusBar style="auto" />
      <NetworkStatus />
      <RootNavigator />
      {!showSplash && user?.role !== "admin" && currentRouteName !== "Chat" && (
        <TouchableOpacity
          style={[
            styles.chatBubble,
            { bottom: Math.max(insets.bottom, 12) + 70 },
          ]}
          onPress={() => {
            if (!navigationRef.current) return;
            if (!isAuthenticated) {
              navigationRef.current.navigate("Auth", { screen: "Login" });
              return;
            }
            navigationRef.current.navigate("App", {
              screen: "Main",
              params: {
                screen: "ProfileTab",
                params: { screen: "Chat" },
              },
            });
          }}
          activeOpacity={0.85}
        >
          <MessageCircle size={24} color="#fff" />
        </TouchableOpacity>
      )}
      {showSplash && (
        <SplashScreen
          duration={2500}
          onAnimationComplete={() => setShowSplash(false)}
        />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  chatBubble: {
    position: "absolute",
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#6366F1",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 999,
  },
});

export default function App(): React.ReactElement {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </SafeAreaProvider>
    </Provider>
  );
}
