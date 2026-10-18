/**
 * First sign-in of an admin without two-step login: install an authenticator
 * app, scan the QR code, enter its first code, then save the backup codes.
 * The admin is signed in only after the backup codes step.
 */
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { useAuth, type TwoFactorEnabled } from "../../context/AuthContext";
import { getErrorMessage } from "../../utils/helpers";
import type { ITwoFactorSetup } from "../../types";
import AuthField from "./AuthField";
import AuthenticatorQr from "./AuthenticatorQr";
import BackupCodes from "./BackupCodes";
import { RememberBrowser } from "./TwoFactorStep";

interface TwoFactorSetupProps {
  onSuccess: () => void;
}

type Step = "intro" | "scan" | "codes";

const TwoFactorSetup = ({ onSuccess }: TwoFactorSetupProps) => {
  const { startTwoFactorSetup, enableTwoFactor, cancelTwoFactor } = useAuth();
  const id = useId();
  const codeRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [step, setStep] = useState<Step>("intro");
  const [setup, setSetup] = useState<ITwoFactorSetup | null>(null);
  const [code, setCode] = useState("");
  const [remember, setRemember] = useState(false);
  const [enabled, setEnabled] = useState<TwoFactorEnabled | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Each step starts at its heading for screen readers and keyboards
  useEffect(() => headingRef.current?.focus(), [step]);

  const begin = async () => {
    setError("");
    setLoading(true);
    try {
      setSetup(await startTwoFactorSetup());
      setStep("scan");
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't start the setup. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const confirm = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code your app shows for Nevan Handicraft");
      return codeRef.current?.focus();
    }
    setLoading(true);
    try {
      setEnabled(await enableTwoFactor(code, remember));
      setStep("codes");
    } catch (err) {
      setError(getErrorMessage(err, "That code didn't work. Please try again."));
      setCode("");
      codeRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  const heading = (text: string) => (
    <div className="flex items-start gap-3">
      <ShieldCheck className="w-6 h-6 shrink-0 text-[var(--color-primary)]" aria-hidden="true" />
      <h2 ref={headingRef} tabIndex={-1} className="text-lg font-semibold font-sans outline-none">
        {text}
      </h2>
    </div>
  );

  if (step === "codes" && enabled) {
    return (
      <div className="space-y-4">
        {heading("Save your backup codes")}
        <BackupCodes
          codes={enabled.backupCodes}
          doneLabel="Continue to the admin panel"
          onDone={() => {
            enabled.finish();
            onSuccess();
          }}
        />
      </div>
    );
  }

  if (step === "scan" && setup) {
    return (
      <form onSubmit={confirm} noValidate className="space-y-4">
        {heading("Scan with your authenticator app")}
        <ol className="list-decimal space-y-1 pl-5 text-sm text-[var(--color-text-muted)]">
          <li>In the app, tap + (Add account) and choose Scan a QR code.</li>
          <li>Point the camera at this code.</li>
          <li>Type the 6-digit code it shows for Nevan Handicraft.</li>
        </ol>
        <AuthenticatorQr setup={setup} />
        <p role="alert" className="sr-only">
          {error}
        </p>
        <AuthField
          ref={codeRef}
          id={`${id}-code`}
          label="6-digit code"
          icon={KeyRound}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="123456"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
            if (error) setError("");
          }}
          error={error || undefined}
          className="input tracking-[0.3em] font-mono"
        />
        <RememberBrowser checked={remember} onChange={setRemember} />
        <button type="submit" disabled={loading} aria-busy={loading} className="btn btn-primary w-full py-3">
          {loading && <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />}
          {loading ? "Checking…" : "Turn on two-step login"}
        </button>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      {heading("Protect the admin account")}
      <p className="text-sm text-[var(--color-text-muted)]">
        Admin accounts need two-step login: after your password, you enter a code from your phone.
        Someone who learns your password still can't get in.
      </p>
      <p className="text-sm text-[var(--color-text-muted)]">
        You need a free authenticator app on your phone, such as <strong>Google Authenticator</strong> or{" "}
        <strong>Microsoft Authenticator</strong> (App Store or Play Store). Install it, then continue.
      </p>
      {error && (
        <p role="alert" className="text-sm text-[var(--color-error)]">
          {error}
        </p>
      )}
      <button type="button" onClick={begin} disabled={loading} aria-busy={loading} className="btn btn-primary w-full py-3">
        {loading && <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />}
        I have the app: continue
      </button>
      <button type="button" onClick={cancelTwoFactor} className="text-sm text-[var(--color-text-muted)] hover:underline min-h-6">
        Use a different account
      </button>
    </div>
  );
};

export default TwoFactorSetup;
