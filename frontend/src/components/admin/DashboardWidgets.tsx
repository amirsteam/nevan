/**
 * Admin Quick Stats Widget
 * Real-time stats with trend indicators
 */
import { Link } from "react-router-dom";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  trend?: {
    value: number;
    label: string;
  };
  link?: string;
  onClick?: () => void;
}

export const StatCard = ({
  label,
  value,
  icon: Icon,
  color,
  bgColor,
  trend,
  link,
  onClick,
}: StatCardProps) => {
  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend.value > 0) return <TrendingUp className="w-4 h-4" />;
    if (trend.value < 0) return <TrendingDown className="w-4 h-4" />;
    return <Minus className="w-4 h-4" />;
  };

  const getTrendColor = () => {
    if (!trend) return "";
    if (trend.value > 0) return "text-green-600 dark:text-green-400";
    if (trend.value < 0) return "text-red-600 dark:text-red-400";
    return "text-gray-500";
  };

  const cardClassName = `stat-card block w-full text-left ${link || onClick ? "cursor-pointer" : ""}`;

  const cardContent = (
    <div className="flex items-start justify-between">
      <div className="space-y-1">
        <p className="text-sm font-medium text-[var(--color-text-muted)]">
          {label}
        </p>
        <p className="text-2xl font-bold text-[var(--color-text)]">{value}</p>
        {trend && (
          <div className={`flex items-center gap-1 text-sm ${getTrendColor()}`}>
            {getTrendIcon()}
            <span>
              {trend.value > 0 ? "+" : ""}
              {trend.value}% {trend.label}
            </span>
          </div>
        )}
      </div>
      <div
        className={`w-12 h-12 ${bgColor} rounded-xl flex items-center justify-center shadow-sm`}
      >
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
    </div>
  );

  if (link) {
    return (
      <Link to={link} className={cardClassName}>
        {cardContent}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cardClassName}>
        {cardContent}
      </button>
    );
  }

  return <div className={cardClassName}>{cardContent}</div>;
};

interface QuickActionProps {
  label: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  link: string;
  color?: string;
  badge?: string | number;
}

export const QuickAction = ({
  label,
  description,
  icon: Icon,
  link,
  color = "text-[var(--color-primary)]",
  badge,
}: QuickActionProps) => (
  <Link to={link} className="quick-action-card">
    <div className="relative w-10 h-10 bg-[var(--color-primary)]/10 rounded-lg flex items-center justify-center">
      <Icon className={`w-5 h-5 ${color}`} />
      {badge !== undefined && badge !== 0 && (
        <span className="notification-dot">{badge}</span>
      )}
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-medium text-[var(--color-text)] truncate">{label}</p>
      {description && (
        <p className="text-xs text-[var(--color-text-muted)] truncate">
          {description}
        </p>
      )}
    </div>
  </Link>
);

interface RecentActivityItem {
  id: string;
  type: "order" | "user" | "product" | "review";
  title: string;
  subtitle: string;
  time: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

export const RecentActivity = ({ items }: { items: RecentActivityItem[] }) => (
  <div className="card">
    <div className="p-4 border-b border-[var(--color-border)]">
      <h3 className="font-semibold">Recent Activity</h3>
    </div>
    <div className="divide-y divide-[var(--color-border)]">
      {items.length > 0 ? (
        items.map((item) => (
          <div
            key={item.id}
            className="p-4 flex items-start gap-3 hover:bg-[var(--color-bg)] transition-colors"
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${item.color}`}
            >
              <item.icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--color-text)] truncate">
                {item.title}
              </p>
              <p className="text-xs text-[var(--color-text-muted)] truncate">
                {item.subtitle}
              </p>
            </div>
            <span className="text-xs text-[var(--color-text-muted)] whitespace-nowrap">
              {item.time}
            </span>
          </div>
        ))
      ) : (
        <div className="p-8 text-center text-[var(--color-text-muted)]">
          No recent activity
        </div>
      )}
    </div>
  </div>
);

export default { StatCard, QuickAction, RecentActivity };
