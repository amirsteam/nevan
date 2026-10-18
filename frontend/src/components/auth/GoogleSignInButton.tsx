/**
 * "Continue with Google" button (Google Identity Services) followed by an "or"
 * divider. Renders nothing unless VITE_GOOGLE_CLIENT_ID is set, and Google's
 * script only loads where the button is shown.
 */
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  GoogleLogin,
  GoogleOAuthProvider,
  type CredentialResponse,
} from "@react-oauth/google";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth, type GoogleAuthResult } from "../../context/AuthContext";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Google draws its button at a fixed pixel width within these bounds
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

// The site's resolved theme (utils/theme writes it to <html data-theme>)
const subscribeToTheme = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
};
const isDarkTheme = () => document.documentElement.getAttribute("data-theme") === "dark";

const PASSWORD_REMOVED_NOTICE =
  "For your security, the password on this account was removed. Sign in with Google, or set a new password with Forgot password.";

interface GoogleSignInButtonProps {
  text?: "signin_with" | "signup_with" | "continue_with";
  onSuccess?: (result: GoogleAuthResult) => void;
}

const GoogleButton = ({ text = "continue_with", onSuccess }: GoogleSignInButtonProps) => {
  const { loginWithGoogle } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(() =>
    typeof ResizeObserver === "undefined" ? MAX_WIDTH : null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dark = useSyncExternalStore(subscribeToTheme, isDarkTheme, () => false);

  // Fit the button to its container (it doesn't resize itself)
  useEffect(() => {
    const element = containerRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      const next = Math.round(
        Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, entry.contentRect.width)),
      );
      setWidth((previous) => (previous === next ? previous : next));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const handleCredential = async ({ credential }: CredentialResponse) => {
    if (!credential) {
      setError("Google sign-in failed. Please try again.");
      return;
    }
    setBusy(true);
    setError("");
    const result = await loginWithGoogle(credential);
    setBusy(false);

    // Admin: the page shows the authenticator step next
    if (result.twoFactor) return;
    if (!result.success) {
      setError(result.error || "Google sign-in failed. Please try again.");
      return;
    }
    if (result.passwordRemoved) {
      toast(PASSWORD_REMOVED_NOTICE, { duration: 10000 });
    }
    onSuccess?.(result);
  };

  return (
    <div className="space-y-3">
      {/* color-scheme: light keeps Google's frame transparent on the dark theme */}
      <div ref={containerRef} className="flex justify-center min-h-[44px]" style={{ colorScheme: "light" }}>
        {width && (
          <GoogleLogin
            onSuccess={handleCredential}
            onError={() => setError("Google sign-in didn't complete. Please try again.")}
            text={text}
            theme={dark ? "filled_black" : "outline"}
            size="large"
            width={width}
          />
        )}
      </div>

      {busy && (
        <p className="flex items-center justify-center gap-2 text-sm text-[var(--color-text-muted)]">
          <Loader2 className="w-4 h-4 animate-spin" />
          Signing in with Google…
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-center text-[var(--color-error)]">
          {error}
        </p>
      )}

      <div className="relative py-1" aria-hidden="true">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[var(--color-border)]" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-[var(--color-surface)] px-3 text-[var(--color-text-muted)]">
            or use your email
          </span>
        </div>
      </div>
    </div>
  );
};

const GoogleSignInButton = (props: GoogleSignInButtonProps) => {
  if (!CLIENT_ID) return null;
  return (
    // English to match the site (Google otherwise follows the browser language)
    <GoogleOAuthProvider clientId={CLIENT_ID} locale="en">
      <GoogleButton {...props} />
    </GoogleOAuthProvider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const isGoogleSignInEnabled = Boolean(CLIENT_ID);

export default GoogleSignInButton;
