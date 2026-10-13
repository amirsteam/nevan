/**
 * Email + password sign-in, shared by /login and the add-to-cart sign-in popup.
 */
import { useId, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, Loader2, Lock, Mail } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { suggestEmail } from "../../utils/emailTypo";
import AuthField from "./AuthField";
import EmailSuggestion from "./EmailSuggestion";
import { isGoogleSignInEnabled } from "./GoogleSignInButton";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Errors = { email?: string; password?: string };

interface SignInFormProps {
  onSuccess: () => void;
  initialEmail?: string;
  submitLabel?: string;
  /** Called before following a link out of the form (e.g. to close a popup) */
  onLeave?: () => void;
}

const validate = (email: string, password: string): Errors => {
  const errors: Errors = {};
  if (!email.trim()) errors.email = "Enter your email address";
  else if (!EMAIL_PATTERN.test(email.trim())) errors.email = "Enter an email like name@example.com";
  if (!password) errors.password = "Enter your password";
  return errors;
};

const SignInForm = ({ onSuccess, initialEmail = "", submitLabel = "Sign in", onLeave }: SignInFormProps) => {
  const { login } = useAuth();
  const id = useId();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState(initialEmail);
  // Checked for typos when the field is left, not while typing
  const [leftEmail, setLeftEmail] = useState("");
  const suggestion = leftEmail ? suggestEmail(leftEmail) : null;
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError("");

    const found = validate(email, password);
    setErrors(found);
    if (found.email) return emailRef.current?.focus();
    if (found.password) return passwordRef.current?.focus();

    setLoading(true);
    const result = await login(email.trim().toLowerCase(), password);
    setLoading(false);

    if (result.success) {
      onSuccess();
    } else {
      setFormError(result.error || "Couldn't sign you in. Please try again.");
      passwordRef.current?.select();
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {formError && (
        <div
          role="alert"
          className="flex gap-2 rounded-lg border border-[var(--color-error)]/30 bg-[var(--color-error)]/10 p-3 text-sm text-[var(--color-error)]"
        >
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <p>{formError}</p>
            {isGoogleSignInEnabled && (
              <p className="mt-1 text-[var(--color-text-muted)]">
                Signed up with Google? Use the Google button above.
              </p>
            )}
          </div>
        </div>
      )}

      <AuthField
        ref={emailRef}
        id={`${id}-email`}
        label="Email"
        icon={Mail}
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        placeholder="name@example.com"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          setLeftEmail("");
          if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
        }}
        onBlur={() => setLeftEmail(email)}
        error={errors.email}
        hint={
          suggestion ? (
            <EmailSuggestion
              suggestion={suggestion}
              onAccept={(fixed) => {
                setEmail(fixed);
                setLeftEmail("");
              }}
            />
          ) : undefined
        }
      />

      <AuthField
        ref={passwordRef}
        id={`${id}-password`}
        label="Password"
        icon={Lock}
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
        }}
        error={errors.password}
        labelAction={
          <Link
            to="/forgot-password"
            state={{ email: email.trim() }}
            onClick={onLeave}
            className="inline-flex min-h-6 items-center text-sm text-[var(--color-primary)] hover:underline"
          >
            Forgot password?
          </Link>
        }
      />

      <button
        type="submit"
        disabled={loading}
        aria-busy={loading}
        className="btn btn-primary w-full py-3"
      >
        {loading && <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />}
        {loading ? "Signing in…" : submitLabel}
      </button>
    </form>
  );
};

export default SignInForm;
