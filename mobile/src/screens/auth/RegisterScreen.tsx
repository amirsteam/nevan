import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Mail, Lock, User, Phone, Eye, EyeOff } from "lucide-react-native";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { register, clearError } from "../../store/authSlice";
import type { RegisterScreenProps } from "../../navigation/types";

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phoneNumber: string;
}

const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((state) => state.auth);

  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phoneNumber: "",
  });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (error) {
      Alert.alert("Registration Failed", error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleChange = (key: keyof FormData, value: string): void => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleRegister = (): void => {
    const { firstName, lastName, email, password, phoneNumber } = formData;

    if (!firstName || !lastName || !email || !password) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    // Basic phone validation for Nepal if provided
    if (phoneNumber && !/^(\+?977)?[0-9]{10}$/.test(phoneNumber)) {
      Alert.alert("Error", "Please enter a valid 10-digit Nepali phone number");
      return;
    }

    const registerData = {
      name: `${firstName} ${lastName}`.trim(),
      email: email.toLowerCase().trim(),
      password,
      phone: phoneNumber,
    };

    dispatch(register(registerData));
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Sign up to start shopping</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.row}>
              <View style={[styles.inputContainer, styles.halfInput]}>
                <User color="#666" size={20} style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="First Name"
                  value={formData.firstName}
                  onChangeText={(text) => handleChange("firstName", text)}
                />
              </View>
              <View style={[styles.inputContainer, styles.halfInput]}>
                <User color="#666" size={20} style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Last Name"
                  value={formData.lastName}
                  onChangeText={(text) => handleChange("lastName", text)}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Mail color="#666" size={20} style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Email Address"
                value={formData.email}
                onChangeText={(text) => handleChange("email", text)}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputContainer}>
              <Phone color="#666" size={20} style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Phone Number (Optional)"
                value={formData.phoneNumber}
                onChangeText={(text) => handleChange("phoneNumber", text)}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputContainer}>
              <Lock color="#666" size={20} style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                value={formData.password}
                onChangeText={(text) => handleChange("password", text)}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                {showPassword ? (
                  <EyeOff color="#666" size={20} />
                ) : (
                  <Eye color="#666" size={20} />
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.registerButton}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.registerButtonText}>Register</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                <Text style={styles.linkText}>Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    justifyContent: "center",
    padding: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#4A4A4A",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#888",
    fontWeight: "500",
  },
  form: {
    width: "100%",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  halfInput: {
    flex: 1,
    width: undefined,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EFEFEF",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    backgroundColor: "#FAFAFA",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  icon: {
    marginRight: 12,
    opacity: 0.7,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  registerButton: {
    backgroundColor: "#FF9999",
    borderRadius: 30,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 16,
    shadowColor: "#FF9999",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  registerButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 30,
  },
  footerText: {
    fontSize: 15,
    color: "#666",
  },
  linkText: {
    fontSize: 15,
    color: "#FF9999",
    fontWeight: "700",
  },
});

export default RegisterScreen;
