/**
 * Card Component
 * Flexible card container with variants
 */
import { ReactNode, HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: "default" | "elevated" | "outlined" | "ghost";
  padding?: "none" | "sm" | "md" | "lg";
  hover?: boolean;
  clickable?: boolean;
}

const variantClasses = {
  default: "bg-[var(--color-surface)] border border-[var(--color-border)]",
  elevated: "bg-[var(--color-surface)] shadow-lg",
  outlined: "bg-transparent border-2 border-[var(--color-border)]",
  ghost: "bg-[var(--color-background)]",
};

const paddingClasses = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};

const Card = ({
  children,
  variant = "default",
  padding = "md",
  hover = false,
  clickable = false,
  className = "",
  ...props
}: CardProps) => {
  return (
    <div
      className={`
        rounded-xl transition-all duration-200
        ${variantClasses[variant]}
        ${paddingClasses[padding]}
        ${hover ? "hover:shadow-lg hover:border-[var(--color-primary)]/30" : ""}
        ${clickable ? "cursor-pointer active:scale-[0.98]" : ""}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
};

// Card Header
interface CardHeaderProps {
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export const CardHeader = ({
  children,
  actions,
  className = "",
}: CardHeaderProps) => {
  return (
    <div
      className={`flex items-center justify-between pb-4 border-b border-[var(--color-border)] mb-4 ${className}`}
    >
      <div className="font-semibold text-lg">{children}</div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
};

// Card Title
interface CardTitleProps {
  children: ReactNode;
  subtitle?: string;
  className?: string;
}

export const CardTitle = ({
  children,
  subtitle,
  className = "",
}: CardTitleProps) => {
  return (
    <div className={className}>
      <h3 className="text-lg font-semibold text-[var(--color-text)]">
        {children}
      </h3>
      {subtitle && (
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
          {subtitle}
        </p>
      )}
    </div>
  );
};

// Card Content
interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export const CardContent = ({ children, className = "" }: CardContentProps) => {
  return (
    <div className={`text-[var(--color-text)] ${className}`}>{children}</div>
  );
};

// Card Footer
interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export const CardFooter = ({ children, className = "" }: CardFooterProps) => {
  return (
    <div
      className={`pt-4 border-t border-[var(--color-border)] mt-4 flex items-center gap-3 ${className}`}
    >
      {children}
    </div>
  );
};

// Stat Card (for dashboards)
interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon?: ReactNode;
  iconBg?: string;
  className?: string;
}

export const StatCard = ({
  title,
  value,
  change,
  changeType = "neutral",
  icon,
  iconBg = "bg-[var(--color-primary)]/10",
  className = "",
}: StatCardProps) => {
  const changeColors = {
    positive: "text-green-600",
    negative: "text-red-600",
    neutral: "text-[var(--color-text-muted)]",
  };

  return (
    <Card hover className={`stat-card ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--color-text-muted)]">
            {title}
          </p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {change && (
            <p className={`text-sm mt-1 ${changeColors[changeType]}`}>
              {changeType === "positive" && "↑ "}
              {changeType === "negative" && "↓ "}
              {change}
            </p>
          )}
        </div>
        {icon && (
          <div
            className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center`}
          >
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
};

export default Card;
