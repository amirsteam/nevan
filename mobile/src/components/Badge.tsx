import React from "react";
import { View, Text, StyleSheet, ViewStyle, TextStyle } from "react-native";

type BadgeVariant = "primary" | "secondary" | "success" | "warning" | "danger";
type BadgeSize = "small" | "medium" | "large";

interface BadgeProps {
  count?: number;
  maxCount?: number;
  showZero?: boolean;
  dot?: boolean;
  variant?: BadgeVariant;
  size?: BadgeSize;
  style?: ViewStyle;
  textStyle?: TextStyle;
  children?: React.ReactNode;
}

// Style mappings for type-safe access
const variantStyles = {
  primary: { backgroundColor: "#FF9999" },
  secondary: { backgroundColor: "#4A4A4A" },
  success: { backgroundColor: "#4CAF50" },
  warning: { backgroundColor: "#FFA500" },
  danger: { backgroundColor: "#F44336" },
};

const sizeStyles = {
  small: { minWidth: 16, height: 16, paddingHorizontal: 4 },
  medium: { minWidth: 20, height: 20, paddingHorizontal: 6 },
  large: { minWidth: 24, height: 24, paddingHorizontal: 8 },
};

const dotSizeStyles = {
  small: { width: 6, height: 6 },
  medium: { width: 8, height: 8 },
  large: { width: 10, height: 10 },
};

const textSizeStyles = {
  small: { fontSize: 10 },
  medium: { fontSize: 12 },
  large: { fontSize: 14 },
};

const Badge: React.FC<BadgeProps> = ({
  count = 0,
  maxCount = 99,
  showZero = false,
  dot = false,
  variant = "primary",
  size = "medium",
  style,
  textStyle,
  children,
}) => {
  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();
  const shouldShow = dot || showZero || count > 0;

  if (!shouldShow) {
    return <>{children}</>;
  }

  const badgeElement = (
    <View
      style={[
        styles.badge,
        variantStyles[variant],
        dot ? dotSizeStyles[size] : sizeStyles[size],
        children ? styles.absolute : undefined,
        style,
      ]}
    >
      {!dot && (
        <Text style={[styles.text, textSizeStyles[size], textStyle]}>
          {displayCount}
        </Text>
      )}
    </View>
  );

  if (children) {
    return (
      <View style={styles.container}>
        {children}
        {badgeElement}
      </View>
    );
  }

  return badgeElement;
};

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  badge: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 100,
  },
  absolute: {
    position: "absolute",
    top: -4,
    right: -4,
    zIndex: 1,
  },
  text: {
    color: "#FFFFFF",
    fontWeight: "700",
    textAlign: "center",
  },
});

export default Badge;
