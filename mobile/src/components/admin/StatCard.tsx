/**
 * StatCard Component
 * Displays a statistic with icon, value, and label for admin dashboard
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface StatCardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  color?: string;
  backgroundColor?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  icon,
  value,
  label,
  color = "#000",
  backgroundColor = "#f5f5f5",
}) => {
  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={[styles.iconContainer, { backgroundColor: color + "15" }]}>
        {icon}
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    minWidth: 140,
    marginHorizontal: 4,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  value: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },
});

export default StatCard;
