/**
 * Reset Password Screen
 * User sets a new password after OTP verification
 */
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Lock, Eye, EyeOff, ArrowLeft, CheckCircle } from "lucide-react-native";
import axios from "../../api/axios";
import type { ResetPasswordScreenProps } from "../../navigation/types";

const ResetPasswordScreen: React.FC<ResetPasswordScreenProps> = ({
  navigation,
  route,
}) => {
  const { email, otp } = route.params;
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validatePassword = (
    pwd: string,
  ): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    if (pwd.length < 8) {
      errors.push("At least 8 characters");
    }
    if (!/[A-Z]/.test(pwd)) {
      errors.push("One uppercase letter");
    }
    if (!/[a-z]/.test(pwd)) {
      errors.push("One lowercase letter");
    }
    if (!/[0-9]/.test(pwd)) {
      errors.push("One number");
    }
    return { valid: errors.length === 0, errors };
  };

  const { valid: passwordValid, errors: passwordErrors } =
    validatePassword(password);

  const handleSubmit = async (): Promise<void> => {
    if (!password) {
      Alert.alert("Error", "Please enter a new password");
      return;
    }

    if (!passwordValid) {
      Alert.alert("Error", "Password does not meet requirements");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post("/auth/reset-password", {
        email,
        otp,
        newPassword: password,
      });

      if (response.data.status === "success") {
        Alert.alert(
          "Success",
          "Your password has been reset successfully. Please login with your new password.",
          [
            {
              text: "OK",
              onPress: () => navigation.navigate("Login"),
            },
          ],
        );
      }
    } catch (error: any) {
      const message =
        error.response?.data?.message || "Failed to reset password";
      Alert.alert("Error", message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={24} color="#333" />
          </TouchableOpacity>

          {/* Icon */}
          <View style={styles.iconContainer}>
            <Lock size={48} color="#000" />
          </View>

          {/* Title */}
          <Text style={styles.title}>Create New Password</Text>
          <Text style={styles.subtitle}>
            Your new password must be different from previously used passwords.
          </Text>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>New Password</Text>
            <View style={styles.inputWrapper}>
              <Lock size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter new password"
                placeholderTextColor="#999"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {showPassword ? (
                  <EyeOff size={20} color="#666" />
                ) : (
                  <Eye size={20} color="#666" />
                )}
              </TouchableOpacity>
            </View>

            {/* Password Requirements */}
            <View style={styles.requirementsContainer}>
              {[
                { text: "At least 8 characters", check: password.length >= 8 },
                { text: "One uppercase letter", check: /[A-Z]/.test(password) },
                { text: "One lowercase letter", check: /[a-z]/.test(password) },
                { text: "One number", check: /[0-9]/.test(password) },
              ].map((req, index) => (
                <View key={index} style={styles.requirementRow}>
                  <CheckCircle
                    size={14}
                    color={req.check ? "#4CAF50" : "#999"}
                    fill={req.check ? "#4CAF50" : "none"}
                  />
                  <Text
                    style={[
                      styles.requirementText,
                      req.check && styles.requirementTextMet,
                    ]}
                  >
                    {req.text}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Confirm Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.inputWrapper}>
              <Lock size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                placeholderTextColor="#999"
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {showConfirmPassword ? (
                  <EyeOff size={20} color="#666" />
                ) : (
                  <Eye size={20} color="#666" />
                )}
              </TouchableOpacity>
            </View>
            {confirmPassword && password !== confirmPassword && (
              <Text style={styles.errorText}>Passwords do not match</Text>
            )}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              isLoading && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Reset Password</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    marginBottom: 24,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#333",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: "#FAFAFA",
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 52,
    fontSize: 16,
    color: "#333",
  },
  requirementsContainer: {
    marginTop: 12,
    paddingLeft: 4,
  },
  requirementRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 8,
  },
  requirementText: {
    fontSize: 12,
    color: "#999",
  },
  requirementTextMet: {
    color: "#4CAF50",
  },
  errorText: {
    fontSize: 12,
    color: "#F44336",
    marginTop: 6,
    marginLeft: 4,
  },
  submitButton: {
    backgroundColor: "#000",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
  },
  submitButtonDisabled: {
    backgroundColor: "#666",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default ResetPasswordScreen;
