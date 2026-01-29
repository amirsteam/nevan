import React from "react";
import { Text, StyleSheet, TextStyle } from "react-native";

interface PriceDisplayProps {
  price: number;
  currency?: string;
  size?: "small" | "medium" | "large";
  color?: string;
  strikethrough?: boolean;
  style?: TextStyle;
}

const PriceDisplay: React.FC<PriceDisplayProps> = ({
  price,
  currency = "Rs.",
  size = "medium",
  color,
  strikethrough = false,
  style,
}) => {
  const formattedPrice = price.toLocaleString("en-NP", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  return (
    <Text
      style={[
        styles.base,
        styles[size],
        strikethrough && styles.strikethrough,
        color ? { color } : styles.defaultColor,
        style,
      ]}
    >
      {currency} {formattedPrice}
    </Text>
  );
};

const styles = StyleSheet.create({
  base: {
    fontWeight: "700",
  },
  defaultColor: {
    color: "#FF9999",
  },
  strikethrough: {
    textDecorationLine: "line-through",
    color: "#999",
    fontWeight: "400",
  },
  small: {
    fontSize: 14,
  },
  medium: {
    fontSize: 16,
  },
  large: {
    fontSize: 22,
  },
});

export default PriceDisplay;
