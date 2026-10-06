/**
 * Password strength hint (register, change/reset password).
 * A guide only — the API's rule is a minimum of 6 characters.
 */
const scorePassword = (password: string): number => {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (password.length < 6) return Math.min(score, 1);
  return Math.min(score, 4);
};

const LEVELS = [
  { label: "Too short", color: "bg-red-600", text: "text-[var(--color-error)]" },
  { label: "Weak", color: "bg-red-600", text: "text-[var(--color-error)]" },
  { label: "Fair", color: "bg-amber-500", text: "text-[var(--color-warning)]" },
  { label: "Good", color: "bg-green-600", text: "text-[var(--color-success)]" },
  { label: "Strong", color: "bg-green-700", text: "text-[var(--color-success)]" },
];

const PasswordStrength = ({ password, id }: { password: string; id?: string }) => {
  if (!password) {
    return (
      <p id={id} className="text-xs text-[var(--color-text-muted)] mt-1">
        At least 6 characters. Longer, with numbers or symbols, is safer.
      </p>
    );
  }

  const score = password.length < 6 ? 0 : scorePassword(password);
  const level = LEVELS[score];

  return (
    <div id={id} className="mt-2" aria-live="polite">
      <div className="flex gap-1" aria-hidden="true">
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={`h-1 flex-1 rounded-full ${i <= score ? level.color : "bg-[var(--color-border)]"}`} />
        ))}
      </div>
      <p className={`text-xs mt-1 ${level.text}`}>
        Password strength: {level.label}
        {score < 3 && password.length >= 6 && <span className="text-[var(--color-text-muted)]"> — try adding numbers, symbols or more letters</span>}
      </p>
    </div>
  );
};

export default PasswordStrength;
