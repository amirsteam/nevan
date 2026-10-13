/**
 * Name + email + password sign-up, shared by /register and the add-to-cart
 * sign-in popup. The button is always enabled: problems are shown on submit
 * (focus goes to the first one) and re-checked as fields are left.
 */
import { useId, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, Loader2, Lock, Mail, User } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { suggestEmail } from "../../utils/emailTypo";
import { passwordProblem } from "../../utils/password";
import PasswordStrength from "../PasswordStrength";
import AuthField from "./AuthField";
import EmailSuggestion from "./EmailSuggestion";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME_LENGTH = 100;

type Field = "name" | "email" | "password";
type Errors = Partial<Record<Field, string>>;

const check = (field: Field, value: string): string => {
  switch (field) {
    case "name":
      if (!value.trim()) return "Enter your full name";
      if (value.trim().length < 2) return "Enter at least 2 characters";
      if (value.trim().length > MAX_NAME_LENGTH) return `Use ${MAX_NAME_LENGTH} characters or fewer`;
      return "";
    case "email":
      if (!value.trim()) return "Enter your email address";
      if (!EMAIL_PATTERN.test(value.trim())) return "Enter an email like name@example.com";
      return "";
    case "password":
      return passwordProblem(value);
  }
};

interface SignUpFormProps {
  onSuccess: () => void;
  submitLabel?: string;
  /** "Sign in instead" for an email that already has an account */
  onSignInInstead: (email: string) => void;
  /** Called before following a link out of the form (e.g. to close a popup) */
  onLeave?: () => void;
}

const SignUpForm = ({
  onSuccess,
  submitLabel = "Create account",
  onSignInInstead,
  onLeave,
}: SignUpFormProps) => {
  const { register } = useAuth();
  const id = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const [values, setValues] = useState<Record<Field, string>>({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);
  const [leftEmail, setLeftEmail] = useState("");
  const [formError, setFormError] = useState("");
  const [existingEmail, setExistingEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const suggestion = leftEmail ? suggestEmail(leftEmail) : null;

  const update = (field: Field, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    // Once shown, an error follows the input so it clears as soon as it's fixed
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: check(field, value) || undefined }));
    if (field === "email") {
      setLeftEmail("");
      setExistingEmail("");
    }
  };

  // Fields are checked when left (after something was typed, or after a submit attempt)
  const leave = (field: Field) => {
    if (field === "email") setLeftEmail(values.email);
    if (!values[field] && !submitted) return;
    setErrors((prev) => ({ ...prev, [field]: check(field, values[field]) || undefined }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(true);
    setFormError("");
    setExistingEmail("");

    const found: Errors = {};
    (["name", "email", "password"] as Field[]).forEach((field) => {
      const problem = check(field, values[field]);
      if (problem) found[field] = problem;
    });
    setErrors(found);
    if (found.name) return nameRef.current?.focus();
    if (found.email) return emailRef.current?.focus();
    if (found.password) return passwordRef.current?.focus();

    setLoading(true);
    const email = values.email.trim().toLowerCase();
    const result = await register({ name: values.name.trim(), email, password: values.password });
    setLoading(false);

    if (result.success) {
      onSuccess();
    } else if (result.status === 400 && /already registered/i.test(result.error || "")) {
      setExistingEmail(email);
    } else {
      setFormError(result.error || "Couldn't create your account. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {existingEmail && (
        <div
          role="alert"
          className="rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface-muted)] p-3 text-sm"
        >
          <p className="font-medium">An account already exists for {existingEmail}.</p>
          <p className="mt-1 text-[var(--color-text-muted)]">
            <button
              type="button"
              onClick={() => onSignInInstead(existingEmail)}
              className="font-medium text-[var(--color-primary)] underline underline-offset-2"
            >
              Sign in
            </button>{" "}
            or{" "}
            <Link
              to="/forgot-password"
              state={{ email: existingEmail }}
              onClick={onLeave}
              className="font-medium text-[var(--color-primary)] underline underline-offset-2"
            >
              reset your password
            </Link>
            .
          </p>
        </div>
      )}
      {formError && (
        <div
          role="alert"
          className="flex gap-2 rounded-lg border border-[var(--color-error)]/30 bg-[var(--color-error)]/10 p-3 text-sm text-[var(--color-error)]"
        >
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
          <p>{formError}</p>
        </div>
      )}

      <AuthField
        ref={nameRef}
        id={`${id}-name`}
        label="Full name"
        icon={User}
        autoComplete="name"
        autoCapitalize="words"
        value={values.name}
        onChange={(e) => update("name", e.target.value)}
        onBlur={() => leave("name")}
        error={errors.name}
      />

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
        value={values.email}
        onChange={(e) => update("email", e.target.value)}
        onBlur={() => leave("email")}
        error={errors.email}
        hint={
          suggestion ? (
            <EmailSuggestion
              suggestion={suggestion}
              onAccept={(fixed) => {
                update("email", fixed);
                setErrors((prev) => ({ ...prev, email: undefined }));
              }}
            />
          ) : (
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              We'll send order updates here.
            </p>
          )
        }
      />

      <AuthField
        ref={passwordRef}
        id={`${id}-password`}
        label="Password"
        icon={Lock}
        type="password"
        autoComplete="new-password"
        value={values.password}
        onChange={(e) => update("password", e.target.value)}
        onBlur={() => leave("password")}
        error={errors.password}
        hint={<PasswordStrength password={values.password} />}
      />

      <button
        type="submit"
        disabled={loading}
        aria-busy={loading}
        className="btn btn-primary w-full py-3"
      >
        {loading && <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />}
        {loading ? "Creating your account…" : submitLabel}
      </button>

      <p className="text-center text-xs text-[var(--color-text-muted)]">
        By creating an account, you accept our{" "}
        <Link to="/privacy" onClick={onLeave} className="text-[var(--color-primary)] underline underline-offset-2">
          Privacy Policy
        </Link>
        .
      </p>
    </form>
  );
};

export default SignUpForm;
