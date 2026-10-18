/**
 * Profile → Security for admins: two-step login status, new backup codes,
 * moving to a new phone and forgetting remembered browsers. Changes ask for a
 * current code from the authenticator app first.
 */
import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import { authAPI } from "../../api/auth";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../utils/helpers";
import type { ITwoFactorSetup, ITwoFactorStatus } from "../../types";
import Modal, { ConfirmModal } from "../ui/Modal";
import AuthField from "../auth/AuthField";
import AuthenticatorQr from "../auth/AuthenticatorQr";
import BackupCodes from "../auth/BackupCodes";

/** A 6-digit code form; `submit` throws on a wrong code */
const CodeForm = ({
  label,
  intro,
  submitLabel,
  submit,
}: {
  label: string;
  intro?: string;
  submitLabel: string;
  submit: (code: string) => Promise<void>;
}) => {
  const id = useId();
  const ref = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => ref.current?.focus(), []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code from your authenticator app");
      return ref.current?.focus();
    }
    setLoading(true);
    try {
      await submit(code);
    } catch (err) {
      setError(getErrorMessage(err, "That code didn't work. Please try again."));
      setCode("");
      ref.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {intro && <p className="text-sm text-[var(--color-text-muted)]">{intro}</p>}
      <p role="alert" className="sr-only">
        {error}
      </p>
      <AuthField
        ref={ref}
        id={`${id}-code`}
        label={label}
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
      <button type="submit" disabled={loading} aria-busy={loading} className="btn btn-primary w-full">
        {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
        {submitLabel}
      </button>
    </form>
  );
};

type Dialog = "codes" | "replace" | "forget" | null;

const TwoFactorSettings = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<ITwoFactorStatus | null>(null);
  const [loadError, setLoadError] = useState("");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [newCodes, setNewCodes] = useState<string[] | null>(null);
  const [newPhone, setNewPhone] = useState<ITwoFactorSetup | null>(null);
  const [forgetting, setForgetting] = useState(false);

  const load = useCallback(async () => {
    try {
      setStatus((await authAPI.twoFactorStatus()).data);
      setLoadError("");
    } catch (err) {
      setLoadError(getErrorMessage(err, "Couldn't load your two-step login settings"));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const close = () => {
    setDialog(null);
    setNewCodes(null);
    setNewPhone(null);
    void load();
  };

  const forget = async () => {
    setForgetting(true);
    try {
      await authAPI.forgetTrustedDevices();
      toast.success("Every browser will ask for a code next time");
      close();
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't forget the remembered browsers"));
    } finally {
      setForgetting(false);
    }
  };

  const since = status?.enabledAt ? new Date(status.enabledAt).toLocaleDateString("en-GB", { dateStyle: "medium" }) : null;
  const fewCodes = !!status && status.backupCodesLeft <= 3;

  return (
    <section aria-labelledby="two-factor-heading" className="card p-5 md:p-6 space-y-4 max-w-xl">
      <div className="flex items-start gap-3">
        <ShieldCheck className="w-6 h-6 shrink-0 text-[var(--color-success)]" aria-hidden="true" />
        <div>
          <h2 id="two-factor-heading" className="text-lg font-semibold font-sans">
            Two-step login
          </h2>
          <p className="text-sm text-[var(--color-text-muted)]">
            On{since ? ` since ${since}` : ""}. Admin sign-ins need a code from your authenticator app.
          </p>
        </div>
      </div>

      {loadError && (
        <p role="alert" className="text-sm text-[var(--color-error)]">
          {loadError}
        </p>
      )}

      {status && (
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-[var(--color-bg)] p-3">
            <dt className="text-[var(--color-text-muted)]">Backup codes left</dt>
            <dd className={`text-lg font-semibold ${fewCodes ? "text-[var(--color-warning)]" : ""}`}>
              {status.backupCodesLeft}
            </dd>
          </div>
          <div className="rounded-lg bg-[var(--color-bg)] p-3">
            <dt className="text-[var(--color-text-muted)]">Remembered browsers</dt>
            <dd className="text-lg font-semibold">{status.rememberedBrowsers}</dd>
          </div>
        </dl>
      )}
      {fewCodes && (
        <p className="text-sm text-[var(--color-warning)]">Only a few backup codes left: make new ones.</p>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setDialog("codes")} className="btn btn-outline">
          Make new backup codes
        </button>
        <button type="button" onClick={() => setDialog("replace")} className="btn btn-outline">
          Move to a new phone
        </button>
        {!!status?.rememberedBrowsers && (
          <button type="button" onClick={() => setDialog("forget")} className="btn btn-outline">
            Forget remembered browsers
          </button>
        )}
      </div>

      <Modal isOpen={dialog === "codes"} onClose={close} title="New backup codes" size="sm">
        {newCodes ? (
          <div className="space-y-4">
            <BackupCodes codes={newCodes} email={user?.email} />
            <button type="button" onClick={close} className="btn btn-primary w-full">
              Done
            </button>
          </div>
        ) : (
          <CodeForm
            label="Code from your authenticator app"
            intro="Your old backup codes stop working once you make new ones."
            submitLabel="Make new codes"
            submit={async (code) => setNewCodes((await authAPI.regenerateBackupCodes(code)).data.backupCodes)}
          />
        )}
      </Modal>

      <Modal isOpen={dialog === "replace"} onClose={close} title="Move to a new phone" size="sm">
        {newPhone ? (
          <div className="space-y-4">
            <p className="text-sm text-[var(--color-text-muted)]">
              On the new phone, add an account in the authenticator app and scan this code.
            </p>
            <AuthenticatorQr setup={newPhone} />
            <CodeForm
              label="Code from the new phone"
              submitLabel="Use the new phone"
              submit={async (code) => {
                await authAPI.finishTwoFactorReplace(code);
                toast.success("Your new phone is set up. The old one's codes no longer work.");
                close();
              }}
            />
          </div>
        ) : (
          <CodeForm
            label="Code from your current phone"
            intro="First, confirm with a code from the phone you use now. Other devices are signed out at the end."
            submitLabel="Continue"
            submit={async (code) => setNewPhone((await authAPI.startTwoFactorReplace(code)).data)}
          />
        )}
      </Modal>

      <ConfirmModal
        isOpen={dialog === "forget"}
        onClose={close}
        onConfirm={forget}
        title="Forget remembered browsers?"
        message="Every browser, this one included, will ask for a code at the next sign-in."
        confirmText="Forget them"
        variant="warning"
        isLoading={forgetting}
      />
    </section>
  );
};

export default TwoFactorSettings;
