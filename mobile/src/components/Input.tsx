import React from "react";
import {
  View,
  TextInput as RNTextInput,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TextInputProps as RNTextInputProps,
} from "react-native";
import type { LucideIcon } from "lucide-react-native";

interface InputProps extends Omit<RNTextInputProps, "style"> {
  label?: string;
  error?: string;
  leftIcon?: LucideIcon;
  rightIcon?: LucideIcon;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  onRightIconPress,
  containerStyle,
  inputStyle,
  ...textInputProps
}) => {
  const hasError = !!error;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[styles.inputContainer, hasError && styles.inputContainerError]}
      >
        {LeftIcon && (
          <LeftIcon color="#666" size={20} style={styles.leftIcon} />
        )}
        <RNTextInput
          style={[styles.input, inputStyle]}
          placeholderTextColor="#999"
          {...textInputProps}
        />
        {RightIcon && (
          <View style={styles.rightIconContainer} onTouchEnd={onRightIconPress}>
            <RightIcon color="#666" size={20} />
          </View>
        )}
      </View>
      {hasError && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4A4A4A",
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EFEFEF",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FAFAFA",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  inputContainerError: {
    borderColor: "#f44336",
    backgroundColor: "#FFF5F5",
  },
  leftIcon: {
    marginRight: 12,
    opacity: 0.7,
  },
  rightIconContainer: {
    padding: 4,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    padding: 0,
  },
  errorText: {
    fontSize: 12,
    color: "#f44336",
    marginTop: 6,
    marginLeft: 4,
  },
});

export default Input;
