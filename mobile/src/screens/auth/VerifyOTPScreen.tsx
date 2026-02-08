/**
 * Verify OTP Screen
 * User enters the OTP received via email
 */
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ShieldCheck, ArrowLeft } from "lucide-react-native";
import axios from "../../api/axios";
import type { VerifyOTPScreenProps } from "../../navigation/types";

const OTP_LENGTH = 6;

const VerifyOTPScreen: React.FC<VerifyOTPScreenProps> = ({
  navigation,
  route,
}) => {
  const { email } = route.params;
  const [otp, setOtp] = useState<string[]>(new Array(OTP_LENGTH).fill(""));
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    // Focus first input on mount
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    // Countdown timer for resend
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleChange = (value: string, index: number): void => {
    if (value.length > 1) {
      // Handle paste
      const pastedOtp = value.slice(0, OTP_LENGTH).split("");
      const newOtp = [...otp];
      pastedOtp.forEach((digit, i) => {
        if (i < OTP_LENGTH) {
          newOtp[i] = digit;
        }
      });
      setOtp(newOtp);
      inputRefs.current[Math.min(pastedOtp.length, OTP_LENGTH - 1)]?.focus();
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (
    e: { nativeEvent: { key: string } },
    index: number,
  ): void => {
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (): Promise<void> => {
    const otpString = otp.join("");
    if (otpString.length !== OTP_LENGTH) {
      Alert.alert("Error", "Please enter the complete verification code");
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post("/auth/verify-reset-otp", {
        email,
        otp: otpString,
      });

      if (response.data.status === "success") {
        navigation.navigate("ResetPassword", { email, otp: otpString });
      }
    } catch (error: any) {
      const message =
        error.response?.data?.message || "Invalid or expired code";
      Alert.alert("Error", message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async (): Promise<void> => {
    if (countdown > 0) return;

    setIsResending(true);
    try {
      await axios.post("/auth/forgot-password", { email });
      Alert.alert("Success", "A new verification code has been sent");
      setCountdown(60);
      setOtp(new Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } catch (error: any) {
      Alert.alert("Error", "Failed to resend code. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
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
            <ShieldCheck size={48} color="#000" />
          </View>

          {/* Title */}
          <Text style={styles.title}>Verify Code</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit verification code sent to{"\n"}
            <Text style={styles.emailText}>{email}</Text>
          </Text>

          {/* OTP Input */}
          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => {
                  inputRefs.current[index] = ref;
                }}
                style={[styles.otpInput, digit && styles.otpInputFilled]}
                value={digit}
                onChangeText={(value) => handleChange(value, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="number-pad"
                maxLength={index === 0 ? OTP_LENGTH : 1}
                selectTextOnFocus
              />
            ))}
          </View>

          {/* Verify Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              isLoading && styles.submitButtonDisabled,
            ]}
            onPress={handleVerify}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Verify Code</Text>
            )}
          </TouchableOpacity>

          {/* Resend Code */}
          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>Didn't receive the code? </Text>
            <TouchableOpacity
              onPress={handleResend}
              disabled={isResending || countdown > 0}
            >
              <Text
                style={[
                  styles.resendLink,
                  countdown > 0 && styles.resendLinkDisabled,
                ]}
              >
                {isResending
                  ? "Sending..."
                  : countdown > 0
                    ? `Resend in ${countdown}s`
                    : "Resend Code"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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
  },
  emailText: {
    fontWeight: "600",
    color: "#333",
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginBottom: 32,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    backgroundColor: "#FAFAFA",
    color: "#333",
  },
  otpInputFilled: {
    borderColor: "#000",
    backgroundColor: "#fff",
  },
  submitButton: {
    backgroundColor: "#000",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 24,
  },
  submitButtonDisabled: {
    backgroundColor: "#666",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  resendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  resendText: {
    fontSize: 14,
    color: "#666",
  },
  countdownText: {
    fontSize: 14,
    color: "#999",
  },
  resendLink: {
    fontSize: 14,
    color: "#000",
    fontWeight: "600",
  },
  resendLinkDisabled: {
    color: "#999",
    fontWeight: "400",
  },
});

export default VerifyOTPScreen;
