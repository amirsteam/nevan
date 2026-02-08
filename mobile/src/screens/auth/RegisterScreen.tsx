import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Mail, Lock, User, Phone, Eye, EyeOff, UserPlus } from "lucide-react-native";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { register, clearError } from "../../store/authSlice";
import type { RegisterScreenProps } from "../../navigation/types";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NEPAL_PHONE_REGEX = /^(\+?977)?[0-9]{10}$/;

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phoneNumber: string;
}

type FieldKey = keyof FormData;

interface FieldErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  phoneNumber?: string;
}

// Password strength calculation
const getPasswordStrength = (password: string): { level: number; label: string; color: string } => {
  if (!password) return { level: 0, label: "", color: "#E5E7EB" };
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { level: 1, label: "Weak", color: "#EF4444" };
  if (score <= 2) return { level: 2, label: "Fair", color: "#F59E0B" };
  if (score <= 3) return { level: 3, label: "Good", color: "#3B82F6" };
  return { level: 4, label: "Strong", color: "#10B981" };
};

const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((state) => state.auth);

  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phoneNumber: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // Refs for keyboard field chaining
  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  // Shake animation
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const passwordStrength = useMemo(
    () => getPasswordStrength(formData.password),
    [formData.password],
  );

  useEffect(() => {
    if (error) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
      ]).start();
    }
  }, [error, shakeAnim]);

  // Use refs to avoid stale closures without changing callback identity
  const errorRef = useRef(error);
  const fieldErrorsRef = useRef(fieldErrors);
  useEffect(() => { errorRef.current = error; }, [error]);
  useEffect(() => { fieldErrorsRef.current = fieldErrors; }, [fieldErrors]);

  const handleChange = useCallback((key: FieldKey, value: string): void => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (fieldErrorsRef.current[key]) {
      setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
    }
    if (errorRef.current) dispatch(clearError());
  }, [dispatch]);

  const validate = (): boolean => {
    const errors: FieldErrors = {};
    const { firstName, lastName, email, password, confirmPassword, phoneNumber } = formData;

    if (!firstName.trim()) errors.firstName = "First name is required";
    if (!lastName.trim()) errors.lastName = "Last name is required";

    if (!email.trim()) {
      errors.email = "Email is required";
    } else if (!EMAIL_REGEX.test(email.trim())) {
      errors.email = "Please enter a valid email address";
    }

    if (!password) {
      errors.password = "Password is required";
    } else if (password.length < 6) {
      errors.password = "Minimum 6 characters";
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    if (phoneNumber && !NEPAL_PHONE_REGEX.test(phoneNumber)) {
      errors.phoneNumber = "Enter a valid 10-digit Nepali number";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegister = (): void => {
    if (!validate()) return;

    const { firstName, lastName, email, password, phoneNumber } = formData;

    dispatch(
      register({
        name: `${firstName.trim()} ${lastName.trim()}`,
        email: email.toLowerCase().trim(),
        password,
        phone: phoneNumber || undefined,
      }),
    );
  };

  const renderInput = (
    key: FieldKey,
    placeholder: string,
    icon: React.ReactNode,
    options?: {
      ref?: React.RefObject<TextInput>;
      keyboardType?: TextInput["props"]["keyboardType"];
      autoComplete?: TextInput["props"]["autoComplete"];
      textContentType?: TextInput["props"]["textContentType"];
      returnKeyType?: TextInput["props"]["returnKeyType"];
      nextRef?: React.RefObject<TextInput>;
      onSubmit?: () => void;
      secureTextEntry?: boolean;
      showToggle?: boolean;
      showToggleValue?: boolean;
      onToggle?: () => void;
      halfWidth?: boolean;
    },
  ) => {
    const hasError = !!fieldErrors[key];
    return (
      <View style={options?.halfWidth ? styles.halfInput : undefined}>
        <View
          style={[
            styles.inputContainer,
            hasError && styles.inputError,
          ]}
        >
          {icon}
          <TextInput
            ref={options?.ref}
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor="#BCBCBC"
            value={formData[key]}
            onChangeText={(text) => handleChange(key, text)}
            autoCapitalize={
              key === "email" ? "none" : key === "firstName" || key === "lastName" ? "words" : "none"
            }
            autoCorrect={false}
            keyboardType={options?.keyboardType}
            autoComplete={options?.autoComplete}
            textContentType={options?.textContentType}
            secureTextEntry={options?.secureTextEntry}
            returnKeyType={options?.returnKeyType || "next"}
            onSubmitEditing={() => {
              if (options?.onSubmit) {
                options.onSubmit();
              } else {
                options?.nextRef?.current?.focus();
              }
            }}
            blurOnSubmit={!options?.nextRef && !options?.onSubmit}
          />
          {options?.showToggle && (
            <TouchableOpacity
              onPress={options.onToggle}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {options.showToggleValue ? (
                <EyeOff color="#999" size={20} />
              ) : (
                <Eye color="#999" size={20} />
              )}
            </TouchableOpacity>
          )}
        </View>
        {hasError ? (
          <Text style={styles.fieldError}>{fieldErrors[key]}</Text>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoCircle}>
              <UserPlus color="#fff" size={32} />
            </View>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join Nevan and start shopping</Text>
          </View>

          {/* Server error banner */}
          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          ) : null}

          <Animated.View style={[styles.form, { transform: [{ translateX: shakeAnim }] }]}>
            {/* Name row */}
            <View style={styles.row}>
              {renderInput("firstName", "First Name", <User color="#999" size={20} style={styles.icon} />, {
                autoComplete: "given-name" as any,
                textContentType: "givenName",
                nextRef: lastNameRef,
                halfWidth: true,
              })}
              {renderInput("lastName", "Last Name", <User color="#999" size={20} style={styles.icon} />, {
                ref: lastNameRef,
                autoComplete: "family-name" as any,
                textContentType: "familyName",
                nextRef: emailRef,
                halfWidth: true,
              })}
            </View>

            {/* Email */}
            {renderInput("email", "Email Address", <Mail color="#999" size={20} style={styles.icon} />, {
              ref: emailRef,
              keyboardType: "email-address",
              autoComplete: "email",
              textContentType: "emailAddress",
              nextRef: phoneRef,
            })}

            {/* Phone */}
            {renderInput("phoneNumber", "Phone (Optional, e.g. 98XXXXXXXX)", <Phone color="#999" size={20} style={styles.icon} />, {
              ref: phoneRef,
              keyboardType: "phone-pad",
              autoComplete: "tel",
              textContentType: "telephoneNumber",
              nextRef: passwordRef,
            })}

            {/* Password */}
            {renderInput("password", "Password (min 6 chars)", <Lock color="#999" size={20} style={styles.icon} />, {
              ref: passwordRef,
              secureTextEntry: !showPassword,
              autoComplete: "new-password" as any,
              textContentType: "newPassword",
              nextRef: confirmPasswordRef,
              showToggle: true,
              showToggleValue: showPassword,
              onToggle: () => setShowPassword(!showPassword),
            })}

            {/* Password strength bar */}
            {formData.password ? (
              <View style={styles.strengthRow}>
                <View style={styles.strengthBar}>
                  {[1, 2, 3, 4].map((i) => (
                    <View
                      key={i}
                      style={[
                        styles.strengthSegment,
                        {
                          backgroundColor:
                            i <= passwordStrength.level ? passwordStrength.color : "#E5E7EB",
                        },
                      ]}
                    />
                  ))}
                </View>
                <Text style={[styles.strengthLabel, { color: passwordStrength.color }]}>
                  {passwordStrength.label}
                </Text>
              </View>
            ) : null}

            {/* Confirm Password */}
            {renderInput("confirmPassword", "Confirm Password", <Lock color="#999" size={20} style={styles.icon} />, {
              ref: confirmPasswordRef,
              secureTextEntry: !showConfirmPassword,
              autoComplete: "new-password" as any,
              textContentType: "newPassword",
              returnKeyType: "go",
              onSubmit: handleRegister,
              showToggle: true,
              showToggleValue: showConfirmPassword,
              onToggle: () => setShowConfirmPassword(!showConfirmPassword),
            })}

            {/* Register button */}
            <TouchableOpacity
              style={[styles.registerButton, loading && styles.registerButtonDisabled]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Create account"
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={styles.buttonContent}>
                  <UserPlus color="#fff" size={20} style={{ marginRight: 8 }} />
                  <Text style={styles.registerButtonText}>Create Account</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                <Text style={styles.linkText}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FCFCFC",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 28,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FF9999",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#FF9999",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: "#9CA3AF",
    fontWeight: "400",
  },
  errorBanner: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: {
    color: "#DC2626",
    fontSize: 14,
    textAlign: "center",
    fontWeight: "500",
  },
  form: {
    width: "100%",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 4,
    backgroundColor: "#F9FAFB",
  },
  inputError: {
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2",
  },
  icon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#1F2937",
    paddingVertical: 0,
  },
  fieldError: {
    fontSize: 12,
    color: "#EF4444",
    marginLeft: 16,
    marginBottom: 12,
    marginTop: 2,
  },
  strengthRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    marginTop: 2,
    marginHorizontal: 4,
    gap: 8,
  },
  strengthBar: {
    flex: 1,
    flexDirection: "row",
    gap: 4,
    height: 4,
  },
  strengthSegment: {
    flex: 1,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  registerButton: {
    backgroundColor: "#FF9999",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 12,
    shadowColor: "#FF9999",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  registerButtonDisabled: {
    opacity: 0.7,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  registerButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 28,
  },
  footerText: {
    fontSize: 15,
    color: "#6B7280",
  },
  linkText: {
    fontSize: 15,
    color: "#FF9999",
    fontWeight: "700",
  },
});

export default RegisterScreen;
