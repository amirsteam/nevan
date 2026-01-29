/**
 * Preferences Screen
 * User settings for notifications, language, and app preferences
 */
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Bell,
  Mail,
  ShoppingBag,
  Tag,
  Truck,
  Globe,
  Moon,
  ChevronRight,
  Check,
} from "lucide-react-native";
import type { PreferencesScreenProps } from "../../navigation/types";

interface NotificationSetting {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  enabled: boolean;
}

interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
}

const languages: LanguageOption[] = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "ne", name: "Nepali", nativeName: "नेपाली" },
];

const PreferencesScreen: React.FC<PreferencesScreenProps> = ({
  navigation,
}) => {
  // Notification settings
  const [notifications, setNotifications] = useState<NotificationSetting[]>([
    {
      id: "push",
      icon: <Bell size={20} color="#333" />,
      title: "Push Notifications",
      description: "Receive notifications on your device",
      enabled: true,
    },
    {
      id: "email",
      icon: <Mail size={20} color="#333" />,
      title: "Email Notifications",
      description: "Receive updates via email",
      enabled: true,
    },
    {
      id: "orders",
      icon: <ShoppingBag size={20} color="#333" />,
      title: "Order Updates",
      description: "Notifications about your orders",
      enabled: true,
    },
    {
      id: "promotions",
      icon: <Tag size={20} color="#333" />,
      title: "Promotions & Offers",
      description: "Discounts and special offers",
      enabled: false,
    },
    {
      id: "shipping",
      icon: <Truck size={20} color="#333" />,
      title: "Shipping Updates",
      description: "Delivery status notifications",
      enabled: true,
    },
  ]);

  // Language and theme
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [darkMode, setDarkMode] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  const toggleNotification = (id: string) => {
    setNotifications((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, enabled: !item.enabled } : item,
      ),
    );
  };

  const handleLanguageChange = (code: string) => {
    setSelectedLanguage(code);
    setShowLanguageModal(false);
    // In a real app, this would trigger a language change
    Alert.alert(
      "Language Changed",
      `Language will be changed to ${languages.find((l) => l.code === code)?.name}. Please restart the app for changes to take effect.`,
    );
  };

  const handleDarkModeToggle = (value: boolean) => {
    setDarkMode(value);
    // In a real app, this would trigger theme change
    Alert.alert(
      "Coming Soon",
      "Dark mode will be available in a future update.",
    );
  };

  const handleClearCache = () => {
    Alert.alert(
      "Clear Cache",
      "This will clear cached data and images. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            Alert.alert("Success", "Cache cleared successfully");
          },
        },
      ],
    );
  };

  const getCurrentLanguageName = () => {
    return (
      languages.find((l) => l.code === selectedLanguage)?.name || "English"
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Notifications Section */}
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.card}>
          {notifications.map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.settingItem,
                index < notifications.length - 1 && styles.settingItemBorder,
              ]}
            >
              <View style={styles.settingIconContainer}>{item.icon}</View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>{item.title}</Text>
                <Text style={styles.settingDescription}>
                  {item.description}
                </Text>
              </View>
              <Switch
                value={item.enabled}
                onValueChange={() => toggleNotification(item.id)}
                trackColor={{ false: "#ddd", true: "#000" }}
                thumbColor="#fff"
              />
            </View>
          ))}
        </View>

        {/* Appearance Section */}
        <Text style={styles.sectionTitle}>Appearance</Text>
        <View style={styles.card}>
          {/* Language */}
          <TouchableOpacity
            style={[styles.settingItem, styles.settingItemBorder]}
            onPress={() => setShowLanguageModal(!showLanguageModal)}
          >
            <View style={styles.settingIconContainer}>
              <Globe size={20} color="#333" />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Language</Text>
              <Text style={styles.settingDescription}>
                {getCurrentLanguageName()}
              </Text>
            </View>
            <ChevronRight size={20} color="#999" />
          </TouchableOpacity>

          {/* Language Options (expandable) */}
          {showLanguageModal && (
            <View style={styles.languageOptions}>
              {languages.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.languageOption,
                    selectedLanguage === lang.code &&
                      styles.languageOptionActive,
                  ]}
                  onPress={() => handleLanguageChange(lang.code)}
                >
                  <View>
                    <Text style={styles.languageName}>{lang.name}</Text>
                    <Text style={styles.languageNative}>{lang.nativeName}</Text>
                  </View>
                  {selectedLanguage === lang.code && (
                    <Check size={20} color="#4CAF50" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Dark Mode */}
          <View style={styles.settingItem}>
            <View style={styles.settingIconContainer}>
              <Moon size={20} color="#333" />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Dark Mode</Text>
              <Text style={styles.settingDescription}>
                {darkMode ? "Enabled" : "Disabled"}
              </Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={handleDarkModeToggle}
              trackColor={{ false: "#ddd", true: "#000" }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Data Section */}
        <Text style={styles.sectionTitle}>Data & Storage</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={handleClearCache}
          >
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Clear Cache</Text>
              <Text style={styles.settingDescription}>
                Free up storage by clearing cached data
              </Text>
            </View>
            <ChevronRight size={20} color="#999" />
          </TouchableOpacity>
        </View>

        {/* About Section */}
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.card}>
          <View style={[styles.settingItem, styles.settingItemBorder]}>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>App Version</Text>
              <Text style={styles.settingDescription}>1.0.0</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.settingItem, styles.settingItemBorder]}
            onPress={() => {
              Alert.alert(
                "Terms of Service",
                "Terms of Service content would be displayed here.",
              );
            }}
          >
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Terms of Service</Text>
            </View>
            <ChevronRight size={20} color="#999" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => {
              Alert.alert(
                "Privacy Policy",
                "Privacy Policy content would be displayed here.",
              );
            }}
          >
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Privacy Policy</Text>
            </View>
            <ChevronRight size={20} color="#999" />
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
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 12,
    marginTop: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  settingItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: "#666",
  },
  languageOptions: {
    backgroundColor: "#f9f9f9",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  languageOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingLeft: 68,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  languageOptionActive: {
    backgroundColor: "#f0f0f0",
  },
  languageName: {
    fontSize: 15,
    fontWeight: "500",
    color: "#333",
  },
  languageNative: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
});

export default PreferencesScreen;
