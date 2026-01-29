import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from "react-native";
import { Plus, Minus } from "lucide-react-native";

interface QuantitySelectorProps {
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  containerStyle?: ViewStyle;
}

const QuantitySelector: React.FC<QuantitySelectorProps> = ({
  value,
  onIncrement,
  onDecrement,
  min = 1,
  max = 99,
  disabled = false,
  containerStyle,
}) => {
  const canDecrement = value > min && !disabled;
  const canIncrement = value < max && !disabled;

  return (
    <View style={[styles.container, containerStyle]}>
      <TouchableOpacity
        style={[styles.button, !canDecrement && styles.buttonDisabled]}
        onPress={onDecrement}
        disabled={!canDecrement}
        activeOpacity={0.7}
      >
        <Minus size={16} color={canDecrement ? "#333" : "#CCC"} />
      </TouchableOpacity>
      <Text style={styles.value}>{value}</Text>
      <TouchableOpacity
        style={[styles.button, !canIncrement && styles.buttonDisabled]}
        onPress={onIncrement}
        disabled={!canIncrement}
        activeOpacity={0.7}
      >
        <Plus size={16} color={canIncrement ? "#333" : "#CCC"} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EFEFEF",
    borderRadius: 20,
    backgroundColor: "#FAFAFA",
  },
  button: {
    padding: 10,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  value: {
    paddingHorizontal: 16,
    fontWeight: "600",
    color: "#333",
    fontSize: 16,
    minWidth: 40,
    textAlign: "center",
  },
});

export default QuantitySelector;
