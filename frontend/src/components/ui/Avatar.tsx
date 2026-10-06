/**
 * Avatar Component
 * User avatars with fallback initials
 */
import { HTMLAttributes } from "react";

interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  showOnline?: boolean;
  className?: string;
}

const sizeClasses = {
  xs: "w-6 h-6 text-xs",
  sm: "w-8 h-8 text-sm",
  md: "w-10 h-10 text-base",
  lg: "w-12 h-12 text-lg",
  xl: "w-16 h-16 text-xl",
};

const onlineIndicatorSizes = {
  xs: "w-1.5 h-1.5 border",
  sm: "w-2 h-2 border-2",
  md: "w-2.5 h-2.5 border-2",
  lg: "w-3 h-3 border-2",
  xl: "w-4 h-4 border-2",
};

// Generate consistent color from string
const getColorFromString = (str: string): string => {
  // Muted brand-family tones; all keep white initials at 4.5:1 or better
  const colors = [
    "bg-[#9e5f57]", // rose
    "bg-[#4d6b49]", // sage
    "bg-[#8a5a3c]", // terracotta
    "bg-[#566887]", // dusty blue
    "bg-[#7a5677]", // mauve
    "bg-[#6b5f4b]", // taupe
    "bg-[#3f6b6b]", // teal
  ];

  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
};

// Get initials from name
const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const Avatar = ({
  src,
  alt,
  name,
  size = "md",
  showOnline = false,
  className = "",
  ...props
}: AvatarProps) => {
  const displayName = name || alt || "User";
  const initials = getInitials(displayName);
  const bgColor = getColorFromString(displayName);

  return (
    <div className={`relative inline-flex ${className}`} {...props}>
      <div
        className={`
          ${sizeClasses[size]}
          rounded-full flex items-center justify-center font-medium
          overflow-hidden ring-2 ring-[var(--color-surface)]
        `}
      >
        {src ? (
          <img
            src={src}
            alt={alt || displayName}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Hide image on error, show initials
              e.currentTarget.style.display = "none";
            }}
          />
        ) : null}

        {/* Fallback initials - shown when no image or image fails to load */}
        <div
          className={`
            absolute inset-0 flex items-center justify-center
            ${bgColor} text-white font-semibold
            ${src ? "hidden" : ""}
          `}
          aria-hidden={!!src}
        >
          {initials}
        </div>
      </div>

      {/* Online indicator */}
      {showOnline && (
        <span
          className={`
            absolute bottom-0 right-0 block rounded-full
            bg-green-500 border-[var(--color-surface)]
            ${onlineIndicatorSizes[size]}
          `}
          aria-label="Online"
        />
      )}
    </div>
  );
};

// Avatar Group for showing multiple avatars
interface AvatarGroupProps {
  children: React.ReactNode;
  max?: number;
  size?: AvatarProps["size"];
  className?: string;
}

export const AvatarGroup = ({
  children,
  max = 4,
  size = "md",
  className = "",
}: AvatarGroupProps) => {
  const childArray = Array.isArray(children) ? children : [children];
  const visibleChildren = childArray.slice(0, max);
  const remainingCount = childArray.length - max;

  return (
    <div className={`flex -space-x-2 ${className}`}>
      {visibleChildren}
      {remainingCount > 0 && (
        <div
          className={`
            ${sizeClasses[size]}
            rounded-full flex items-center justify-center font-medium
            bg-[var(--color-surface)] border-2 border-[var(--color-border)]
            text-[var(--color-text-muted)]
          `}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
};

export default Avatar;
