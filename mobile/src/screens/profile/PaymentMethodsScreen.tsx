/**
 * Payment Methods Screen
 * Displays available payment options
 */
import React from "react";
import { View, Text, StyleSheet, ScrollView, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  CreditCard,
  Smartphone,
  Wallet,
  Truck,
  Shield,
  CheckCircle,
} from "lucide-react-native";
import type { PaymentMethodsScreenProps } from "../../navigation/types";

interface PaymentOption {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  color: string;
}

const paymentOptions: PaymentOption[] = [
  {
    id: "cod",
    name: "Cash on Delivery",
    description: "Pay when your order arrives at your doorstep",
    icon: <Truck size={28} color="#4CAF50" />,
    features: [
      "No advance payment required",
      "Pay in cash when delivered",
      "Available for all products",
    ],
    color: "#4CAF50",
  },
  {
    id: "esewa",
    name: "eSewa",
    description: "Nepal's leading digital wallet",
    icon: <Smartphone size={28} color="#60BB46" />,
    features: [
      "Instant payment confirmation",
      "Secure & encrypted transactions",
      "Cashback offers available",
    ],
    color: "#60BB46",
  },
  {
    id: "khalti",
    name: "Khalti",
    description: "Fast and secure digital payments",
    icon: <Wallet size={28} color="#5D2E8C" />,
    features: [
      "Quick checkout process",
      "Bank transfer support",
      "Loyalty rewards",
    ],
    color: "#5D2E8C",
  },
];

const PaymentMethodsScreen: React.FC<PaymentMethodsScreenProps> = ({
  navigation,
}) => {
  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Security Banner */}
        <View style={styles.securityBanner}>
          <Shield size={24} color="#4CAF50" />
          <View style={styles.securityText}>
            <Text style={styles.securityTitle}>Secure Payments</Text>
            <Text style={styles.securityDescription}>
              All transactions are secured and encrypted
            </Text>
          </View>
        </View>

        {/* Info Text */}
        <Text style={styles.infoText}>
          We accept the following payment methods for your convenience. Choose
          your preferred option at checkout.
        </Text>

        {/* Payment Options */}
        {paymentOptions.map((option) => (
          <View key={option.id} style={styles.paymentCard}>
            <View style={styles.paymentHeader}>
              <View
                style={[
                  styles.paymentIconContainer,
                  { backgroundColor: option.color + "15" },
                ]}
              >
                {option.icon}
              </View>
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentName}>{option.name}</Text>
                <Text style={styles.paymentDescription}>
                  {option.description}
                </Text>
              </View>
            </View>

            <View style={styles.featuresContainer}>
              {option.features.map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <CheckCircle size={16} color={option.color} />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* Note */}
        <View style={styles.noteContainer}>
          <Text style={styles.noteTitle}>Note</Text>
          <Text style={styles.noteText}>
            • Payment methods are selected during checkout{"\n"}• COD may have
            additional charges for remote areas{"\n"}• Digital wallet balance
            must be sufficient for payment{"\n"}• Refunds are processed to the
            original payment method
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  securityBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4CAF5015",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  securityText: {
    flex: 1,
  },
  securityTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4CAF50",
    marginBottom: 2,
  },
  securityDescription: {
    fontSize: 13,
    color: "#666",
  },
  infoText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 22,
    marginBottom: 20,
  },
  paymentCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  paymentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  paymentIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  paymentDescription: {
    fontSize: 13,
    color: "#666",
  },
  featuresContainer: {
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 12,
    gap: 8,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    color: "#333",
  },
  noteContainer: {
    backgroundColor: "#FFF9E6",
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  noteTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#B8860B",
    marginBottom: 8,
  },
  noteText: {
    fontSize: 13,
    color: "#666",
    lineHeight: 22,
  },
});

export default PaymentMethodsScreen;
