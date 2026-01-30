/**
 * Network Status Component
 * Displays an indicator when the device is offline
 */
import React, { useEffect, useState, useRef } from "react";
import { View, Text, StyleSheet, Animated, Platform } from "react-native";
import { WifiOff, Wifi } from "lucide-react-native";

// Note: For production, install @react-native-community/netinfo
// This is a simplified version using fetch-based connectivity check

interface NetworkStatusProps {
  /**
   * URL to ping for connectivity check (should be a fast, reliable endpoint)
   */
  checkUrl?: string;
  /**
   * Interval in milliseconds between connectivity checks
   */
  checkInterval?: number;
  /**
   * Whether to show the connected status briefly when reconnecting
   */
  showReconnected?: boolean;
}

const NetworkStatus: React.FC<NetworkStatusProps> = ({
  checkUrl = "https://www.google.com/generate_204",
  checkInterval = 10000,
  showReconnected = true,
}) => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [showStatus, setShowStatus] = useState(false);
  const slideAnim = useRef(new Animated.Value(-50)).current;
  const wasDisconnected = useRef(false);

  const checkConnectivity = async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(checkUrl, {
        method: "HEAD",
        cache: "no-store",
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const connected = response.ok || response.status === 204;

      if (
        !isConnected &&
        connected &&
        wasDisconnected.current &&
        showReconnected
      ) {
        // Show reconnected message briefly
        setIsConnected(true);
        setShowStatus(true);
        setTimeout(() => {
          hideStatus();
        }, 2000);
      } else if (!connected) {
        wasDisconnected.current = true;
        setIsConnected(false);
        setShowStatus(true);
        showStatusBar();
      }

      setIsConnected(connected);
    } catch (error) {
      wasDisconnected.current = true;
      setIsConnected(false);
      setShowStatus(true);
      showStatusBar();
    }
  };

  const showStatusBar = () => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      friction: 8,
    }).start();
  };

  const hideStatus = () => {
    Animated.timing(slideAnim, {
      toValue: -50,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowStatus(false);
      wasDisconnected.current = false;
    });
  };

  useEffect(() => {
    // Initial check
    checkConnectivity();

    // Periodic checks
    const interval = setInterval(checkConnectivity, checkInterval);

    return () => clearInterval(interval);
  }, [checkInterval]);

  // Don't render anything if connected and not showing reconnected status
  if (!showStatus) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        isConnected ? styles.connected : styles.disconnected,
        { transform: [{ translateY: slideAnim }] },
      ]}
    >
      {isConnected ? (
        <>
          <Wifi size={16} color="#FFFFFF" />
          <Text style={styles.text}>Back online</Text>
        </>
      ) : (
        <>
          <WifiOff size={16} color="#FFFFFF" />
          <Text style={styles.text}>No internet connection</Text>
        </>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 30,
    left: 0,
    right: 0,
    zIndex: 9999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  disconnected: {
    backgroundColor: "#F44336",
  },
  connected: {
    backgroundColor: "#4CAF50",
  },
  text: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
});

export default NetworkStatus;
