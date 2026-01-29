import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { ShoppingBag } from "lucide-react-native";
import Button from "./Button";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  containerStyle?: ViewStyle;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = ShoppingBag,
  title,
  message,
  actionLabel,
  onAction,
  containerStyle,
}) => {
  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.iconContainer}>
        <Icon color="#FF9999" size={64} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {message && <Text style={styles.message}>{message}</Text>}
      {actionLabel && onAction && (
        <Button
          title={actionLabel}
          onPress={onAction}
          variant="primary"
          size="medium"
          style={styles.button}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#FFF5F5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#4A4A4A",
    marginBottom: 8,
    textAlign: "center",
  },
  message: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  button: {
    marginTop: 8,
  },
});

export default EmptyState;
