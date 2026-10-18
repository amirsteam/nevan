/**
 * The QR code (and typed key) for adding Nevan Handicraft to an authenticator
 * app. Used at first sign-in and when moving to a new phone.
 */
import type { ITwoFactorSetup } from "../../types";

const AuthenticatorQr = ({ setup }: { setup: ITwoFactorSetup }) => (
  <div className="space-y-3">
    <div className="flex justify-center">
      {/* White background: phones can't read a QR code drawn on the dark theme */}
      <img
        src={setup.qrCode}
        alt="QR code for your authenticator app"
        width={200}
        height={200}
        className="rounded-lg border border-[var(--color-border)] bg-white p-2"
      />
    </div>
    <details className="text-sm">
      <summary className="cursor-pointer text-[var(--color-primary)] min-h-6">Can't scan it? Type this key instead</summary>
      <p className="mt-2 text-[var(--color-text-muted)]">
        In the app, choose “Enter a setup key”, name it Nevan Handicraft, and type:
      </p>
      <p className="mt-1 select-all break-all rounded-md bg-[var(--color-bg)] p-2 font-mono tracking-wider">
        {setup.manualKey}
      </p>
    </details>
  </div>
);

export default AuthenticatorQr;
