import React, { useState } from "react";
import { View, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { WebView } from "react-native-webview";
import { useAppDispatch } from "../../store/hooks";
import { resetCart } from "../../store/cartSlice";
import type { PaymentScreenProps } from "../../navigation/types";

interface WebViewNavState {
  url: string;
  title?: string;
  loading?: boolean;
  canGoBack?: boolean;
  canGoForward?: boolean;
}

const PaymentScreen: React.FC<PaymentScreenProps> = ({ route, navigation }) => {
  const { orderId, gateway, paymentData } = route.params;
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(true);

  let html = "";
  let uri = "";

  if (gateway === "esewa") {
    const url = paymentData.redirectUrl || paymentData.url || "";
    const formData = paymentData.formData || {};

    // Construct auto-submitting form for eSewa
    const inputs = Object.keys(formData)
      .map(
        (key) =>
          `<input type="hidden" name="${key}" value="${formData[key]}" />`,
      )
      .join("");

    html = `
      <html>
        <body onload="document.getElementById('esewaForm').submit()">
          <form id="esewaForm" method="POST" action="${url}">
            ${inputs}
          </form>
        </body>
      </html>
    `;
  } else if (gateway === "khalti") {
    uri =
      paymentData.redirectUrl ||
      paymentData.payment_url ||
      paymentData.url ||
      "";
  }

  const handleNavigationStateChange = (navState: WebViewNavState): void => {
    // Check for success/failure in URL
    const url = navState.url;

    // Adjust these checks based on actual backend success/fail redirect URLs
    if (url.includes("payment/success") || url.includes("success=true")) {
      dispatch(resetCart());
      Alert.alert("Success", "Payment Successful!", [
        { text: "OK", onPress: () => navigation.getParent()?.goBack() },
      ]);
    } else if (
      url.includes("payment/failure") ||
      url.includes("failure=true")
    ) {
      Alert.alert("Failed", "Payment Failed", [
        { text: "Try Again", onPress: () => navigation.goBack() },
      ]);
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        source={html ? { html } : { uri }}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onNavigationStateChange={handleNavigationStateChange}
        style={{ flex: 1 }}
      />
      {loading && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.8)",
  },
});

export default PaymentScreen;
