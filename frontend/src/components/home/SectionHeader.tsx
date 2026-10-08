/**
 * Heading row for home page sections: optional eyebrow, title, subtitle and
 * a "View all" link (plus any extra controls, e.g. rail arrows).
 */
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

interface SectionHeaderProps {
  title: string;
  /** Lets the section use aria-labelledby */
  id?: string;
  eyebrow?: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: { to: string; label: string };
  /** Rendered next to the action link */
  controls?: ReactNode;
  /** Smaller title and spacing, for sections within a page */
  compact?: boolean;
}

const SectionHeader = ({ title, id, eyebrow, subtitle, icon, action, controls, compact = false }: SectionHeaderProps) => (
  <div className={`flex flex-wrap justify-between items-end gap-3 ${compact ? "mb-6" : "mb-6 md:mb-8"}`}>
    <div className="min-w-0">
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)] mb-1.5">{eyebrow}</p>
      )}
      <h2 id={id} className={`${compact ? "text-xl md:text-2xl" : "text-2xl md:text-3xl"} font-bold flex items-center gap-2`}>
        {icon}
        {title}
      </h2>
      {subtitle && <p className="text-[var(--color-text-muted)] mt-1">{subtitle}</p>}
    </div>
    {(action || controls) && (
      <div className="flex items-center gap-4">
        {action && (
          <Link
            to={action.to}
            className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-primary)] hover:underline underline-offset-4"
          >
            {action.label}
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        )}
        {controls}
      </div>
    )}
  </div>
);

export default SectionHeader;
