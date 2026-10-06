/**
 * ThemeToggle
 * Cycles light → dark → system (icon button), or shows all three options
 * (`variant="segmented"`, used on the profile page).
 */
import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";
import type { ThemePreference } from "../../utils/theme";

const OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

const ThemeToggle = ({ variant = "icon", className = "" }: { variant?: "icon" | "segmented"; className?: string }) => {
  const { preference, setPreference } = useTheme();

  if (variant === "segmented") {
    return (
      <div role="radiogroup" aria-label="Theme" className={`inline-flex rounded-lg border border-[var(--color-border)] p-1 ${className}`}>
        {OPTIONS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={preference === value}
            onClick={() => setPreference(value)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm ${
              preference === value
                ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            <Icon className="w-4 h-4" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
    );
  }

  const index = OPTIONS.findIndex((o) => o.value === preference);
  const current = OPTIONS[index] || OPTIONS[2];
  const next = OPTIONS[(index + 1) % OPTIONS.length];
  const Icon = current.icon;

  return (
    <button
      type="button"
      onClick={() => setPreference(next.value)}
      className={`p-2 rounded-lg hover:bg-[var(--color-surface-muted)] ${className}`}
      aria-label={`Theme: ${current.label}. Switch to ${next.label.toLowerCase()}`}
      title={`Theme: ${current.label}`}
    >
      <Icon className="w-5 h-5" aria-hidden="true" />
    </button>
  );
};

export default ThemeToggle;
