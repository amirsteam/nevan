/**
 * Settings that depend on environment variables, layered on top of app.json.
 *
 * Google Sign-In on iOS needs the reversed iOS OAuth client ID registered as a
 * URL scheme. The plugin is only added when EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID is
 * set (Android needs no native config: just an Android OAuth client in Google
 * Cloud with the app's package name and signing SHA-1).
 */
module.exports = ({ config }) => {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  if (!iosClientId) return config;

  const iosUrlScheme = `com.googleusercontent.apps.${iosClientId.replace(
    /\.apps\.googleusercontent\.com$/,
    "",
  )}`;

  return {
    ...config,
    plugins: [
      ...(config.plugins ?? []),
      ["@react-native-google-signin/google-signin", { iosUrlScheme }],
    ],
  };
};
