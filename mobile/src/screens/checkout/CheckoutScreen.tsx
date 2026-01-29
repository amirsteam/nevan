import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { MapPin, CreditCard } from "lucide-react-native";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { resetCart } from "../../store/cartSlice";
import { ordersAPI, paymentsAPI } from "../../api/orders";
import type { CheckoutScreenProps } from "../../navigation/types";

type PaymentMethod = "cod" | "esewa" | "khalti";

interface ShippingAddress {
  name: string;
  street: string;
  city: string;
  district: string;
  province: string;
  phone: string;
}

const CheckoutScreen: React.FC<CheckoutScreenProps> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const { subtotal } = useAppSelector((state) => state.cart);
  const { user } = useAppSelector((state) => state.auth);

  const [shipping, setShipping] = useState<ShippingAddress>({
    name: user?.name || "",
    street: "",
    city: "",
    district: "",
    province: "3",
    phone: user?.phone || "",
  });

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [loading, setLoading] = useState(false);

  const handleChange = (key: keyof ShippingAddress, value: string): void => {
    setShipping((prev) => ({ ...prev, [key]: value }));
  };

  const handlePlaceOrder = async (): Promise<void> => {
    if (
      !shipping.name ||
      !shipping.city ||
      !shipping.district ||
      !shipping.phone
    ) {
      Alert.alert("Error", "Please fill in all shipping fields");
      return;
    }

    setLoading(true);

    try {
      // 1. Create Order
      const orderPayload = {
        shippingAddress: {
          name: shipping.name,
          street: shipping.street || "N/A",
          city: shipping.city,
          district: shipping.district,
          province: parseInt(shipping.province, 10),
          phone: shipping.phone,
        },
        paymentMethod,
      };

      const orderRes = await ordersAPI.createOrder(
        orderPayload as Parameters<typeof ordersAPI.createOrder>[0],
      );
      const orderId = orderRes?.data?.order?._id;

      if (!orderId) throw new Error("Failed to create order ID");

      // 2. Initiate Payment
      const paymentRes = await paymentsAPI.initiatePayment(
        orderId,
        paymentMethod,
      );
      const paymentData =
        (paymentRes as unknown as Record<string, unknown>).data || paymentRes;

      if (paymentMethod === "cod") {
        dispatch(resetCart());
        Alert.alert("Success", "Order placed successfully!", [
          {
            text: "OK",
            onPress: () => navigation.goBack(),
          },
        ]);
      } else if (paymentMethod === "esewa" || paymentMethod === "khalti") {
        // Navigate to Payment WebView
        navigation.navigate("Payment", {
          orderId,
          gateway: paymentMethod,
          paymentData: paymentData as {
            redirectUrl?: string;
            url?: string;
            payment_url?: string;
            formData?: Record<string, string>;
          },
        });
      }
    } catch (error: unknown) {
      console.error(error);
      const err = error as { response?: { data?: { message?: string } } };
      Alert.alert(
        "Checkout Failed",
        err.response?.data?.message || "Failed to place order",
      );
    } finally {
      setLoading(false);
    }
  };

  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: 100 }]}
        >
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MapPin size={20} color="#000" />
              <Text style={styles.sectionTitle}>Shipping Address</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              value={shipping.name}
              onChangeText={(t) => handleChange("name", t)}
            />
            <TextInput
              style={styles.input}
              placeholder="Phone Number"
              value={shipping.phone}
              onChangeText={(t) => handleChange("phone", t)}
              keyboardType="phone-pad"
            />
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="City"
                value={shipping.city}
                onChangeText={(t) => handleChange("city", t)}
              />
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="District"
                value={shipping.district}
                onChangeText={(t) => handleChange("district", t)}
              />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Province (1-7)"
              value={String(shipping.province)}
              onChangeText={(t) => handleChange("province", t)}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <CreditCard size={20} color="#000" />
              <Text style={styles.sectionTitle}>Payment Method</Text>
            </View>
            <View style={styles.paymentOptions}>
              <TouchableOpacity
                style={[
                  styles.paymentOption,
                  paymentMethod === "cod" && styles.selectedOption,
                ]}
                onPress={() => setPaymentMethod("cod")}
              >
                <Text
                  style={[
                    styles.paymentText,
                    paymentMethod === "cod" && styles.selectedText,
                  ]}
                >
                  COD
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.paymentOption,
                  paymentMethod === "esewa" && styles.selectedOption,
                ]}
                onPress={() => setPaymentMethod("esewa")}
              >
                <Text
                  style={[
                    styles.paymentText,
                    paymentMethod === "esewa" && styles.selectedText,
                  ]}
                >
                  eSewa
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.paymentOption,
                  paymentMethod === "khalti" && styles.selectedOption,
                ]}
                onPress={() => setPaymentMethod("khalti")}
              >
                <Text
                  style={[
                    styles.paymentText,
                    paymentMethod === "khalti" && styles.selectedText,
                  ]}
                >
                  Khalti
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>Order Summary</Text>
            <View style={styles.summaryRow}>
              <Text>Subtotal</Text>
              <Text>Rs. {subtotal}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text>Shipping</Text>
              <Text>Rs. 0</Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalText}>Total</Text>
              <Text style={styles.totalText}>Rs. {subtotal}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.placeOrderButton,
              { marginTop: 24, marginBottom: 40 },
            ]}
            onPress={handlePlaceOrder}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.placeOrderText}>
                Place Order - Rs. {subtotal}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FCFCFC",
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 8,
    color: "#4A4A4A",
  },
  input: {
    borderWidth: 1,
    borderColor: "#EFEFEF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    backgroundColor: "#FAFAFA",
    color: "#333",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  halfInput: {
    flex: 1,
    width: undefined,
  },
  paymentOptions: {
    flexDirection: "row",
    gap: 12,
  },
  paymentOption: {
    flex: 1,
    padding: 14,
    borderWidth: 1,
    borderColor: "#EFEFEF",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FAFAFA",
  },
  selectedOption: {
    borderColor: "#FF9999",
    backgroundColor: "#FFF0F0",
  },
  paymentText: {
    fontWeight: "600",
    color: "#666",
    fontSize: 14,
  },
  selectedText: {
    color: "#FF9999",
    fontWeight: "700",
  },
  summary: {
    backgroundColor: "#FAFAFA",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EFEFEF",
  },
  summaryTitle: {
    fontWeight: "600",
    marginBottom: 16,
    fontSize: 16,
    color: "#4A4A4A",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    paddingTop: 12,
    marginTop: 8,
  },
  totalText: {
    fontWeight: "700",
    fontSize: 18,
    color: "#4A4A4A",
  },
  placeOrderButton: {
    backgroundColor: "#FF9999",
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: "center",
    marginTop: 24,
    marginBottom: 40,
    shadowColor: "#FF9999",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  placeOrderText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 18,
    letterSpacing: 0.5,
  },
});

export default CheckoutScreen;
