/**
 * Checkout: shipping address, payment method and an order summary whose
 * shipping cost matches what the API will charge.
 * COD orders finish here; eSewa continues in PaymentScreen (WebView).
 */
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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { MapPin, CreditCard, Banknote, Wallet, Check } from "lucide-react-native";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { fetchCart } from "../../store/cartSlice";
import { baseApi } from "../../store/api";
import { ordersAPI, paymentsAPI } from "../../api/orders";
import { colors, radius } from "../../theme";
import {
  FREE_SHIPPING_THRESHOLD,
  NEPALI_MOBILE,
  PROVINCE_NAMES,
  calculateShippingCost,
  formatNPR,
  normalizePhone,
} from "../../theme/store";
import type { CheckoutScreenProps } from "../../navigation/types";

type PaymentMethod = "cod" | "esewa";

interface ShippingAddress {
  name: string;
  street: string;
  city: string;
  district: string;
  province: number;
  phone: string;
}

type FieldErrors = Partial<Record<keyof ShippingAddress, string>>;

const PAYMENT_OPTIONS: { value: PaymentMethod; title: string; note: string; Icon: typeof Banknote }[] = [
  { value: "cod", title: "Cash on delivery", note: "Pay in cash when your order arrives", Icon: Banknote },
  { value: "esewa", title: "eSewa", note: "Pay now with your eSewa wallet", Icon: Wallet },
];

const validate = (s: ShippingAddress): FieldErrors => {
  const errors: FieldErrors = {};
  if (!s.name.trim()) errors.name = "Enter the receiver's name";
  if (!NEPALI_MOBILE.test(normalizePhone(s.phone))) errors.phone = "Enter a mobile number like 98XXXXXXXX";
  if (!s.city.trim()) errors.city = "Enter the city or town";
  if (!s.district.trim()) errors.district = "Enter the district";
  if (!s.street.trim()) errors.street = "Enter the street, tole or a landmark";
  return errors;
};

const CheckoutScreen: React.FC<CheckoutScreenProps> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const { subtotal } = useAppSelector((state) => state.cart);
  const { user } = useAppSelector((state) => state.auth);

  const [shipping, setShipping] = useState<ShippingAddress>({
    name: user?.name || "",
    street: "",
    city: "",
    district: "",
    province: 3,
    phone: user?.phone || "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [loading, setLoading] = useState(false);

  const shippingCost = calculateShippingCost(subtotal, shipping.province, shipping.district);
  const total = subtotal + shippingCost;
  const toFreeShipping = FREE_SHIPPING_THRESHOLD - subtotal;

  const handleChange = <K extends keyof ShippingAddress>(key: K, value: ShippingAddress[K]): void => {
    setShipping((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const openOrder = (orderId: string) => {
    navigation.navigate("Main", {
      screen: "ProfileTab",
      params: { screen: "OrderDetail", params: { orderId } },
    });
  };

  const handlePlaceOrder = async (): Promise<void> => {
    const found = validate(shipping);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      Alert.alert("Check your address", "Please fix the highlighted fields.");
      return;
    }

    setLoading(true);
    try {
      const orderRes = await ordersAPI.createOrder({
        shippingAddress: {
          name: shipping.name.trim(),
          street: shipping.street.trim(),
          city: shipping.city.trim(),
          district: shipping.district.trim(),
          province: shipping.province,
          phone: normalizePhone(shipping.phone),
        },
        paymentMethod,
      } as Parameters<typeof ordersAPI.createOrder>[0]);
      const order = orderRes?.data?.order;
      if (!order?._id) throw new Error("Failed to create order");

      const paymentRes = await paymentsAPI.initiatePayment(order._id, paymentMethod);
      const paymentData = (paymentRes as unknown as Record<string, unknown>).data || paymentRes;

      if (paymentMethod === "cod") {
        // The API already emptied the cart for COD orders; sync the app with it
        dispatch(fetchCart());
        dispatch(baseApi.util.invalidateTags(["Cart", "Orders", "Order"]));
        Alert.alert(
          "Order placed",
          `Order #${order.orderNumber} is confirmed. Please keep ${formatNPR(
            order.pricing?.total ?? total,
          )} in cash ready for the delivery person.`,
          [{ text: "View order", onPress: () => openOrder(order._id) }],
        );
      } else {
        navigation.navigate("Payment", {
          orderId: order._id,
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
      const err = error as { response?: { data?: { message?: string } } };
      Alert.alert("Checkout failed", err.response?.data?.message || "Failed to place order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const field = (
    key: "name" | "phone" | "city" | "district" | "street",
    label: string,
    props: Partial<React.ComponentProps<typeof TextInput>> = {},
  ) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, errors[key] && styles.inputError]}
        value={shipping[key]}
        onChangeText={(t) => handleChange(key, t)}
        placeholderTextColor={colors.textMuted}
        accessibilityLabel={label}
        {...props}
      />
      {!!errors[key] && <Text style={styles.errorText}>{errors[key]}</Text>}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: 24 + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MapPin size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>Shipping address</Text>
            </View>
            {field("name", "Full name", { autoComplete: "name", textContentType: "name" })}
            {field("phone", "Mobile number", {
              keyboardType: "phone-pad",
              autoComplete: "tel",
              textContentType: "telephoneNumber",
              placeholder: "98XXXXXXXX",
            })}

            <Text style={styles.label}>Province</Text>
            <View style={styles.chips} accessibilityRole="radiogroup">
              {Object.entries(PROVINCE_NAMES).map(([num, name]) => {
                const selected = shipping.province === Number(num);
                return (
                  <TouchableOpacity
                    key={num}
                    onPress={() => handleChange("province", Number(num))}
                    style={[styles.chip, selected && styles.chipSelected]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.row}>
              <View style={styles.half}>{field("district", "District", { placeholder: "e.g. Kathmandu" })}</View>
              <View style={styles.half}>{field("city", "City / town", { placeholder: "e.g. Baneshwor" })}</View>
            </View>
            {field("street", "Street, tole or landmark", { placeholder: "e.g. Near Shanti Chowk" })}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <CreditCard size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>Payment method</Text>
            </View>
            <View style={styles.paymentOptions} accessibilityRole="radiogroup">
              {PAYMENT_OPTIONS.map(({ value, title, note, Icon }) => {
                const selected = paymentMethod === value;
                return (
                  <TouchableOpacity
                    key={value}
                    style={[styles.paymentOption, selected && styles.selectedOption]}
                    onPress={() => setPaymentMethod(value)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                  >
                    <Icon size={22} color={selected ? colors.primary : colors.textMuted} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.paymentText, selected && styles.selectedText]}>{title}</Text>
                      <Text style={styles.paymentNote}>{note}</Text>
                    </View>
                    {selected && <Check size={20} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>Order summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryText}>Subtotal</Text>
              <Text style={styles.summaryText}>{formatNPR(subtotal)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryText}>Shipping</Text>
              <Text style={[styles.summaryText, shippingCost === 0 && { color: colors.success, fontWeight: "600" }]}>
                {shippingCost === 0 ? "Free" : formatNPR(shippingCost)}
              </Text>
            </View>
            {toFreeShipping > 0 && (
              <Text style={styles.freeHint}>
                Add {formatNPR(toFreeShipping)} more for free shipping
              </Text>
            )}
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalText}>Total</Text>
              <Text style={styles.totalText}>{formatNPR(total)}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.placeOrderButton, loading && { opacity: 0.7 }]}
            onPress={handlePlaceOrder}
            disabled={loading}
            accessibilityRole="button"
            accessibilityState={{ busy: loading, disabled: loading }}
          >
            {loading ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={styles.placeOrderText}>
                {paymentMethod === "cod" ? `Place order · ${formatNPR(total)}` : `Pay ${formatNPR(total)} with eSewa`}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16 },
  section: {
    marginBottom: 16,
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 8 },
  sectionTitle: { fontSize: 18, fontWeight: "600", color: colors.text },
  field: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: "600", color: colors.text, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 16,
  },
  inputError: { borderColor: colors.error },
  errorText: { color: colors.error, fontSize: 12, marginTop: 4 },
  row: { flexDirection: "row", gap: 12 },
  half: { flex: 1 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  chipSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  chipText: { color: colors.text, fontSize: 14 },
  chipTextSelected: { color: colors.primary, fontWeight: "600" },
  paymentOptions: { gap: 10 },
  paymentOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  selectedOption: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  paymentText: { fontWeight: "600", color: colors.text, fontSize: 15 },
  selectedText: { color: colors.primary },
  paymentNote: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  summary: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryTitle: { fontWeight: "600", marginBottom: 12, fontSize: 16, color: colors.text },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  summaryText: { color: colors.text, fontSize: 15 },
  freeHint: {
    color: colors.accentStrong,
    fontSize: 13,
    marginBottom: 8,
    backgroundColor: "rgba(143, 174, 139, 0.15)",
    padding: 8,
    borderRadius: radius.sm,
  },
  totalRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, marginTop: 4 },
  totalText: { fontWeight: "700", fontSize: 18, color: colors.text },
  placeOrderButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: radius.pill,
    alignItems: "center",
    marginTop: 20,
  },
  placeOrderText: { color: colors.onPrimary, fontWeight: "700", fontSize: 17 },
});

export default CheckoutScreen;
