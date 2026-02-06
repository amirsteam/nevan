/**
 * Help & Support Screen
 * FAQs and contact information
 */
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ChevronDown,
  ChevronUp,
  Mail,
  Phone,
  MessageCircle,
  MapPin,
  ExternalLink,
  Clock,
} from "lucide-react-native";
import type { HelpSupportScreenProps } from "../../navigation/types";

interface FAQ {
  id: string;
  question: string;
  answer: string;
}

const faqs: FAQ[] = [
  {
    id: "1",
    question: "How do I track my order?",
    answer:
      "You can track your order by going to My Orders section in your profile. Click on any order to see detailed tracking information including current status and estimated delivery date.",
  },
  {
    id: "2",
    question: "What payment methods do you accept?",
    answer:
      "We accept Cash on Delivery (COD) and eSewa digital wallet. All online payments are secure and encrypted.",
  },
  {
    id: "3",
    question: "How can I cancel my order?",
    answer:
      "You can cancel your order from the Order Details page if it hasn't been shipped yet. Go to My Orders, select the order, and tap 'Cancel Order'. Once shipped, cancellation is not possible.",
  },
  {
    id: "4",
    question: "What is your return policy?",
    answer:
      "We accept returns within 7 days of delivery for undamaged items in original packaging. Handcrafted items are final sale unless defective. Contact us to initiate a return.",
  },
  {
    id: "5",
    question: "How long does delivery take?",
    answer:
      "Delivery within Kathmandu Valley takes 2-3 business days. For other areas in Nepal, it takes 5-7 business days. International shipping typically takes 10-15 business days.",
  },
  {
    id: "6",
    question: "Do you ship internationally?",
    answer:
      "Yes, we ship to select countries. Shipping costs and delivery times vary by destination. Contact us for specific information about your country.",
  },
  {
    id: "7",
    question: "How do I change my delivery address?",
    answer:
      "You can manage your addresses in the Addresses section of your profile. To change address for an existing order, contact us before the order is shipped.",
  },
  {
    id: "8",
    question: "Are the products authentic handicrafts?",
    answer:
      "Yes! All our products are 100% authentic Nepalese handicrafts made by local artisans. Each piece is handcrafted with traditional techniques passed down through generations.",
  },
];

interface ContactOption {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  action: () => void;
}

const HelpSupportScreen: React.FC<HelpSupportScreenProps> = ({
  navigation,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleFAQ = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleCall = () => {
    const phoneNumber = "+977-1-4XXXXXX";
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {
      Alert.alert("Error", "Unable to make phone call");
    });
  };

  const handleEmail = () => {
    const email = "support@nevanhandicraft.com";
    const subject = "Support Request";
    Linking.openURL(`mailto:${email}?subject=${subject}`).catch(() => {
      Alert.alert("Error", "Unable to open email client");
    });
  };

  const handleWhatsApp = () => {
    const phoneNumber = "+9779XXXXXXXXX";
    const message = "Hi, I need help with my order";
    Linking.openURL(
      `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`,
    ).catch(() => {
      Alert.alert("Error", "WhatsApp is not installed");
    });
  };

  const handleMaps = () => {
    const address = "Thamel, Kathmandu, Nepal";
    Linking.openURL(
      `https://maps.google.com/?q=${encodeURIComponent(address)}`,
    ).catch(() => {
      Alert.alert("Error", "Unable to open maps");
    });
  };

  const handleSupportChat = () => {
    navigation.navigate("Chat");
  };

  const contactOptions: ContactOption[] = [
    {
      id: "chat",
      icon: <MessageCircle size={22} color="#6366F1" />,
      title: "Support Chat",
      subtitle: "Chat with our team",
      action: handleSupportChat,
    },
    {
      id: "phone",
      icon: <Phone size={22} color="#4CAF50" />,
      title: "Call Us",
      subtitle: "+977-1-4XXXXXX",
      action: handleCall,
    },
    {
      id: "email",
      icon: <Mail size={22} color="#2196F3" />,
      title: "Email Support",
      subtitle: "support@nevanhandicraft.com",
      action: handleEmail,
    },
    {
      id: "whatsapp",
      icon: <MessageCircle size={22} color="#25D366" />,
      title: "WhatsApp",
      subtitle: "Quick chat support",
      action: handleWhatsApp,
    },
    {
      id: "location",
      icon: <MapPin size={22} color="#F44336" />,
      title: "Visit Store",
      subtitle: "Thamel, Kathmandu",
      action: handleMaps,
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Business Hours */}
        <View style={styles.hoursCard}>
          <View style={styles.hoursHeader}>
            <Clock size={20} color="#666" />
            <Text style={styles.hoursTitle}>Business Hours</Text>
          </View>
          <Text style={styles.hoursText}>
            Sunday - Friday: 10:00 AM - 6:00 PM{"\n"}
            Saturday: 10:00 AM - 4:00 PM
          </Text>
        </View>

        {/* Contact Options */}
        <Text style={styles.sectionTitle}>Contact Us</Text>
        <View style={styles.contactGrid}>
          {contactOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={styles.contactCard}
              onPress={option.action}
              activeOpacity={0.7}
            >
              <View style={styles.contactIconContainer}>{option.icon}</View>
              <Text style={styles.contactTitle}>{option.title}</Text>
              <Text style={styles.contactSubtitle} numberOfLines={1}>
                {option.subtitle}
              </Text>
              <ExternalLink
                size={14}
                color="#999"
                style={styles.externalIcon}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* FAQs */}
        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
        <View style={styles.faqContainer}>
          {faqs.map((faq) => (
            <TouchableOpacity
              key={faq.id}
              style={styles.faqItem}
              onPress={() => toggleFAQ(faq.id)}
              activeOpacity={0.7}
            >
              <View style={styles.faqHeader}>
                <Text style={styles.faqQuestion}>{faq.question}</Text>
                {expandedId === faq.id ? (
                  <ChevronUp size={20} color="#666" />
                ) : (
                  <ChevronDown size={20} color="#666" />
                )}
              </View>
              {expandedId === faq.id && (
                <Text style={styles.faqAnswer}>{faq.answer}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Additional Help */}
        <View style={styles.additionalHelp}>
          <Text style={styles.additionalHelpTitle}>Need More Help?</Text>
          <Text style={styles.additionalHelpText}>
            Our customer support team is available during business hours to
            assist you with any questions or concerns.
          </Text>
          <TouchableOpacity style={styles.supportButton} onPress={handleEmail}>
            <Mail size={18} color="#fff" />
            <Text style={styles.supportButtonText}>Contact Support</Text>
          </TouchableOpacity>
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
  hoursCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  hoursHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  hoursTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  hoursText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 16,
  },
  contactGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  contactCard: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  contactIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  contactTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  contactSubtitle: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
  externalIcon: {
    position: "absolute",
    top: 12,
    right: 12,
  },
  faqContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  faqItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  faqHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  faqQuestion: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    paddingRight: 12,
  },
  faqAnswer: {
    fontSize: 14,
    color: "#666",
    lineHeight: 22,
    marginTop: 12,
  },
  additionalHelp: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  additionalHelpTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  additionalHelpText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 20,
  },
  supportButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#000",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  supportButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});

export default HelpSupportScreen;
