/**
 * Live checklist of the password rule (utils/password.ts, same as the API),
 * plus a strength hint once the rule is met. Used by sign-up, reset and change.
 */
import { Check, Circle } from "lucide-react";
import { PASSWORD_RULES } from "../utils/password";

// Beyond the rule: length and variety make a password harder to guess
const strengthOf = (password: string): { label: string; className: string } => {
  let score = 0;
  if (password.length >= 10) score++;
  if (password.length >= 14) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score >= 3) return { label: "Strong", className: "text-[var(--color-success)]" };
  if (score >= 1) return { label: "Good", className: "text-[var(--color-success)]" };
  return { label: "Fair — longer is safer", className: "text-[var(--color-text-muted)]" };
};

const PasswordStrength = ({ password, id }: { password: string; id?: string }) => {
  const results = PASSWORD_RULES.map((rule) => ({ label: rule.label, met: rule.test(password) }));
  const allMet = results.every((r) => r.met);
  const strength = allMet ? strengthOf(password) : null;

  return (
    <div id={id} className="mt-2 space-y-1">
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs" aria-label="Password needs">
        {results.map(({ label, met }) => (
          <li
            key={label}
            className={`flex items-center gap-1 ${
              met ? "text-[var(--color-success)]" : "text-[var(--color-text-muted)]"
            }`}
          >
            {met ? (
              <Check className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <Circle className="w-3 h-3" aria-hidden="true" />
            )}
            {label}
            <span className="sr-only">{met ? " (done)" : " (needed)"}</span>
          </li>
        ))}
      </ul>
      {strength && (
        <p className={`text-xs ${strength.className}`}>Strength: {strength.label}</p>
      )}
    </div>
  );
};

export default PasswordStrength;
