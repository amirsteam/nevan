/**
 * Native Google Sign-In. Produces a Google ID token that the API's
 * POST /auth/google verifies (its audience is the *web* client ID).
 *
 * The native module isn't part of Expo Go, so it is only loaded in builds
 * (EAS development/preview/production) and when the client IDs are configured.
 */
import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";

type GoogleSignInModule = typeof import("@react-native-google-signin/google-signin");

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export const isGoogleSignInAvailable =
  !isExpoGo &&
  Platform.OS !== "web" &&
  !!WEB_CLIENT_ID &&
  (Platform.OS !== "ios" || !!IOS_CLIENT_ID);

let googleModule: GoogleSignInModule | null = null;

/** The configured native module, or null where Google sign-in isn't available */
export const loadGoogleSignIn = (): GoogleSignInModule | null => {
  if (!isGoogleSignInAvailable) return null;
  if (!googleModule) {
    // Loaded on first use: importing it at the top would crash Expo Go
    googleModule = require("@react-native-google-signin/google-signin") as GoogleSignInModule;
    googleModule.GoogleSignin.configure({
      webClientId: WEB_CLIENT_ID,
      iosClientId: IOS_CLIENT_ID,
    });
  }
  return googleModule;
};

/**
 * Show Google's account picker and return an ID token,
 * or null when the user closes it. Throws with a readable message on failure.
 */
export const getGoogleIdToken = async (): Promise<string | null> => {
  const google = loadGoogleSignIn();
  if (!google) throw new Error("Google sign-in isn't available in this version of the app");

  const { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } = google;
  try {
    if (Platform.OS === "android") {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    }
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) return null; // closed the picker

    const { idToken } = response.data;
    if (!idToken) throw new Error("missing idToken");
    return idToken;
  } catch (error) {
    if (isErrorWithCode(error)) {
      if (
        error.code === statusCodes.SIGN_IN_CANCELLED ||
        error.code === statusCodes.IN_PROGRESS
      ) {
        return null;
      }
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error("Google Play services are needed to sign in with Google");
      }
    }
    throw new Error("Google sign-in failed. Please try again.");
  }
};

/** Forget the chosen Google account so the next sign-in shows the picker again */
export const signOutOfGoogle = async (): Promise<void> => {
  const google = googleModule ?? (isGoogleSignInAvailable ? loadGoogleSignIn() : null);
  if (!google) return;
  try {
    await google.GoogleSignin.signOut();
  } catch {
    // Not signed in with Google on this device
  }
};
