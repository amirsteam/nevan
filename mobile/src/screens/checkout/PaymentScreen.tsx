import React, { useRef, useState } from "react";
import { View, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { WebView } from "react-native-webview";
import type { ShouldStartLoadRequest } from "react-native-webview/lib/WebViewTypes";
import { useAppDispatch } from "../../store/hooks";
import { fetchCart } from "../../store/cartSlice";
import { baseApi } from "../../store/api";
import type { PaymentScreenProps } from "../../navigation/types";

interface WebViewNavState {
  url: string;
  title?: string;
  loading?: boolean;
  canGoBack?: boolean;
  canGoForward?: boolean;
}

// After the gateway, the API verifies the payment and redirects to the storefront's
// /order-success or /order-failed page. The app intercepts those URLs instead of
// showing the website inside the WebView.
const RESULT_URL = /\/order-(success|failed)(\?|$)/;

const getQueryParam = (url: string, name: string): string | undefined => {
  const match = url.match(new RegExp(`[?&]${name}=([^&#]*)`));
  return match ? decodeURIComponent(match[1].replace(/\+/g, " ")) : undefined;
};

const PaymentScreen: React.FC<PaymentScreenProps> = ({ route, navigation }) => {
  const { orderId, gateway, paymentData } = route.params;
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(true);
  const handledRef = useRef(false);

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

  const openOrder = (id: string) => {
    navigation.navigate("Main", {
      screen: "ProfileTab",
      params: { screen: "OrderDetail", params: { orderId: id } },
    });
  };

  /** Returns true when `url` is the payment result page (and handles it once) */
  const handleResultUrl = (url: string): boolean => {
    const match = url.match(RESULT_URL);
    if (!match) return false;
    if (handledRef.current) return true;
    handledRef.current = true;

    const resultOrderId = getQueryParam(url, "orderId") || orderId;
    // The API removes paid items from the cart; refresh cart and order lists either way
    dispatch(fetchCart());
    dispatch(baseApi.util.invalidateTags(["Cart", "Orders", "Order"]));

    const payment = getQueryParam(url, "payment");
    if (match[1] === "success" && payment === "pending") {
      // eSewa hasn't confirmed yet; the server keeps checking and updates the order
      Alert.alert(
        "Confirming your payment",
        "eSewa hasn't confirmed your payment yet. We'll update your order as soon as it does — please don't pay again.",
        [{ text: "View order", onPress: () => openOrder(resultOrderId) }],
      );
    } else if (match[1] === "success") {
      Alert.alert(
        "Payment successful",
        payment === "duplicate"
          ? "Your order has been placed. We received more than one payment for it and will refund the extra one."
          : "Your order has been placed.",
        [{ text: "View order", onPress: () => openOrder(resultOrderId) }],
      );
    } else if (getQueryParam(url, "status") === "refund_required") {
      // The money arrived for an order that had been cancelled meanwhile
      Alert.alert(
        "Payment received — order couldn't be completed",
        getQueryParam(url, "message") || "We received your payment but the items are no longer available. We will refund you.",
        [{ text: "View order", onPress: () => openOrder(resultOrderId) }],
      );
    } else {
      Alert.alert(
        "Payment not completed",
        getQueryParam(url, "message") ||
          "Your order is kept for 30 minutes. You can try paying again from the order.",
        [
          { text: "View order", onPress: () => openOrder(resultOrderId) },
          { text: "Back to checkout", onPress: () => navigation.goBack() },
        ],
      );
    }
    return true;
  };

  const handleShouldStartLoad = (request: ShouldStartLoadRequest): boolean =>
    !handleResultUrl(request.url);

  const handleNavigationStateChange = (navState: WebViewNavState): void => {
    // Fallback for platforms/redirects that bypass onShouldStartLoadWithRequest
    handleResultUrl(navState.url);
  };

  return (
    <View style={styles.container}>
      <WebView
        source={html ? { html } : { uri }}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onShouldStartLoadWithRequest={handleShouldStartLoad}
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
