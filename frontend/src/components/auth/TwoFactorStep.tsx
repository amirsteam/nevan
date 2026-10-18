/**
 * Admin sign-in, second step: the 6-digit code from the authenticator app (or
 * a backup code). Submits by itself once six digits are typed or pasted.
 */
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import AuthField from "./AuthField";

interface TwoFactorStepProps {
  onSuccess: () => void;
}

const digitsOnly = (value: string) => value.replace(/\D/g, "").slice(0, 6);

export const RememberBrowser = ({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) => {
  const id = useId();
  return (
    <label htmlFor={id} className="flex items-start gap-2 text-sm cursor-pointer">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 accent-[var(--color-primary)]"
      />
      <span>
        Remember this browser for 30 days
        <span className="block text-[var(--color-text-muted)]">Only on your own computer or phone.</span>
      </span>
    </label>
  );
};

const TwoFactorStep = ({ onSuccess }: TwoFactorStepProps) => {
  const { verifyTwoFactor, cancelTwoFactor } = useAuth();
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [useBackup, setUseBackup] = useState(false);
  const [code, setCode] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => inputRef.current?.focus(), [useBackup]);

  const submit = async (value = code) => {
    setError("");
    const entered = useBackup ? value.trim() : digitsOnly(value);
    if (!useBackup && entered.length !== 6) {
      setError("Enter the 6-digit code from your authenticator app");
      return inputRef.current?.focus();
    }
    if (useBackup && entered.replace(/[^0-9a-z]/gi, "").length !== 10) {
      setError("Enter a backup code like ABCDE-23456");
      return inputRef.current?.focus();
    }
    setLoading(true);
    const result = await verifyTwoFactor(
      useBackup ? { backupCode: entered, rememberDevice: remember } : { code: entered, rememberDevice: remember },
    );
    setLoading(false);
    if (result.success) return onSuccess();
    // An expired sign-in returns to the password form (the context clears the challenge)
    setError(result.error || "That code didn't work. Please try again.");
    setCode("");
    inputRef.current?.focus();
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void submit();
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="flex items-start gap-3">
        <ShieldCheck className="w-6 h-6 shrink-0 text-[var(--color-primary)]" aria-hidden="true" />
        <div>
          <h2 className="text-lg font-semibold font-sans">Two-step login</h2>
          <p className="text-sm text-[var(--color-text-muted)]">
            {useBackup
              ? "Enter one of the backup codes you saved. Each code works once."
              : "Open your authenticator app and enter the 6-digit code for Nevan Handicraft."}
          </p>
        </div>
      </div>

      {/* Announced; the same text is tied to the field below */}
      <p role="alert" className="sr-only">
        {error}
      </p>

      <AuthField
        key={useBackup ? "backup" : "code"}
        ref={inputRef}
        id={`${id}-${useBackup ? "backup" : "code"}`}
        label={useBackup ? "Backup code" : "6-digit code"}
        icon={KeyRound}
        inputMode={useBackup ? "text" : "numeric"}
        autoComplete="one-time-code"
        autoCapitalize={useBackup ? "characters" : "none"}
        spellCheck={false}
        maxLength={useBackup ? 14 : undefined}
        placeholder={useBackup ? "ABCDE-23456" : "123456"}
        value={code}
        onChange={(e) => {
          const next = useBackup ? e.target.value : digitsOnly(e.target.value);
          setCode(next);
          if (error) setError("");
          // Six digits typed or pasted: no need to press the button
          if (!useBackup && next.length === 6 && !loading) void submit(next);
        }}
        error={error || undefined}
        className="input tracking-[0.3em] font-mono"
      />

      <RememberBrowser checked={remember} onChange={setRemember} />

      <button type="submit" disabled={loading} aria-busy={loading} className="btn btn-primary w-full py-3">
        {loading && <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />}
        {loading ? "Checking…" : "Sign in"}
      </button>

      <div className="flex flex-wrap justify-between gap-2 text-sm">
        <button
          type="button"
          onClick={() => {
            setUseBackup((v) => !v);
            setCode("");
            setError("");
          }}
          className="text-[var(--color-primary)] hover:underline min-h-6"
        >
          {useBackup ? "Use the authenticator app instead" : "Lost your phone? Use a backup code"}
        </button>
        <button type="button" onClick={cancelTwoFactor} className="text-[var(--color-text-muted)] hover:underline min-h-6">
          Use a different account
        </button>
      </div>
    </form>
  );
};

export default TwoFactorStep;
