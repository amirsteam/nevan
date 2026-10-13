/**
 * Google's sign-in button followed by an "or" divider. Renders nothing in Expo Go
 * or when the Google client IDs aren't configured (see services/googleSignIn).
 */
import React, { useState } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { googleLogin } from "../store/authSlice";
import { getGoogleIdToken, loadGoogleSignIn } from "../services/googleSignIn";
import { colors } from "../theme";

const PASSWORD_REMOVED_NOTICE =
  "For your security, the password on this account was removed. Sign in with Google, or set a new password with Forgot password.";

const GoogleSignInButton: React.FC = () => {
  const dispatch = useAppDispatch();
  const loading = useAppSelector((state) => state.auth.loading);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState("");

  const google = loadGoogleSignIn();
  if (!google) return null;
  const { GoogleSigninButton } = google;

  const handlePress = async () => {
    setError("");
    setPickerOpen(true);
    let idToken: string | null;
    try {
      idToken = await getGoogleIdToken();
    } catch (e) {
      setError((e as Error).message);
      return;
    } finally {
      setPickerOpen(false);
    }
    if (!idToken) return; // closed the picker

    // API errors appear in the screen's error banner (auth.error)
    const result = await dispatch(googleLogin(idToken));
    if (googleLogin.fulfilled.match(result) && result.payload.passwordRemoved) {
      Alert.alert("Signed in with Google", PASSWORD_REMOVED_NOTICE);
    }
  };

  return (
    <View style={styles.container}>
      <GoogleSigninButton
        style={styles.button}
        size={GoogleSigninButton.Size.Wide}
        color={GoogleSigninButton.Color.Light}
        onPress={handlePress}
        disabled={loading || pickerOpen}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.divider} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={styles.line} />
        <Text style={styles.dividerText}>or use your email</Text>
        <View style={styles.line} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  button: {
    width: "100%",
    height: 52,
  },
  error: {
    fontSize: 13,
    color: colors.error,
    textAlign: "center",
    marginTop: 8,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderStrong,
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 13,
    color: colors.textMuted,
  },
});

export default GoogleSignInButton;
