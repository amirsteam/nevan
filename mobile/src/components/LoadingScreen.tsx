import React from "react";
import { View, ActivityIndicator, Text, StyleSheet } from "react-native";

interface LoadingScreenProps {
  message?: string;
  color?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message,
  color = "#000",
}) => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={color} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FCFCFC",
  },
  message: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
});

export default LoadingScreen;
