/**
 * Empty State Component
 * Displays user-friendly empty states with actions
 */
import { ReactNode, isValidElement, type ElementType } from "react";
import { Link } from "react-router-dom";
import {
  ShoppingBag,
  Package,
  Search,
  Heart,
  ClipboardList,
  FolderOpen,
  Users,
  AlertCircle,
} from "lucide-react";

interface EmptyStateProps {
  type?:
    | "cart"
    | "orders"
    | "products"
    | "search"
    | "wishlist"
    | "categories"
    | "users"
    | "generic";
  title?: string;
  description?: string;
  actionLabel?: string;
  actionLink?: string;
  onAction?: () => void;
  /** A Lucide icon component or a ready-made element */
  icon?: ReactNode | ElementType;
  /** Secondary action (e.g. "Chat with us") rendered as a text link */
  secondaryLabel?: string;
  secondaryLink?: string;
  headingLevel?: "h1" | "h2" | "h3";
  compact?: boolean;
}

const defaultStates = {
  cart: {
    icon: ShoppingBag,
    title: "Your cart is empty",
    description:
      "Looks like you haven't added anything yet. Explore soft, handmade clothing for your little one.",
    actionLabel: "Start shopping",
    actionLink: "/products",
  },
  orders: {
    icon: ClipboardList,
    title: "No orders yet",
    description:
      "When you place an order, you'll be able to track it here.",
    actionLabel: "Browse products",
    actionLink: "/products",
  },
  products: {
    icon: Package,
    title: "No products found",
    description:
      "There are no products matching your criteria. Try adjusting your filters or search terms.",
    actionLabel: "Clear filters",
    actionLink: "/products",
  },
  search: {
    icon: Search,
    title: "No results found",
    description:
      "We couldn't find any products matching your search. Try using different keywords.",
    actionLabel: "View all products",
    actionLink: "/products",
  },
  wishlist: {
    icon: Heart,
    title: "Your wishlist is empty",
    description: "Tap the heart on any product to save it here for later.",
    actionLabel: "Discover products",
    actionLink: "/products",
  },
  categories: {
    icon: FolderOpen,
    title: "No categories found",
    description: "Categories will appear here once they are added.",
    actionLabel: "Go home",
    actionLink: "/",
  },
  users: {
    icon: Users,
    title: "No users found",
    description: "No users match your search criteria.",
    actionLabel: "Clear search",
    actionLink: "/admin/users",
  },
  generic: {
    icon: AlertCircle,
    title: "Nothing here",
    description: "This section is currently empty.",
    actionLabel: "Go home",
    actionLink: "/",
  },
};

const EmptyState = ({
  type = "generic",
  title,
  description,
  actionLabel,
  actionLink,
  onAction,
  icon,
  secondaryLabel,
  secondaryLink,
  headingLevel = "h2",
  compact = false,
}: EmptyStateProps) => {
  const defaults = defaultStates[type];
  const Heading = headingLevel;
  const iconSource = icon ?? defaults.icon;
  let iconNode: ReactNode;
  if (isValidElement(iconSource)) {
    iconNode = iconSource;
  } else {
    // Lucide icons are forwardRef objects, so check "not an element" rather than typeof function
    const IconComponent = iconSource as ElementType;
    iconNode = <IconComponent className="w-10 h-10 text-[var(--color-text-muted)]" aria-hidden="true" />;
  }

  const finalTitle = title || defaults.title;
  const finalDescription = description || defaults.description;
  const finalActionLabel = actionLabel || defaults.actionLabel;
  // An explicit onAction wins over the type's default link
  const finalActionLink = onAction && !actionLink ? undefined : actionLink || defaults.actionLink;

  return (
    <div className={`flex flex-col items-center justify-center px-4 text-center ${compact ? "py-10" : "py-16"}`}>
      <div className="relative mb-6" aria-hidden="true">
        <div className="absolute inset-0 bg-[var(--color-primary)]/10 rounded-full blur-xl" />
        <div className="relative w-24 h-24 bg-[var(--color-surface-muted)] rounded-full flex items-center justify-center border-2 border-dashed border-[var(--color-border)]">
          {iconNode}
        </div>
      </div>

      <Heading className="text-xl font-semibold text-[var(--color-text)] mb-2 font-sans">
        {finalTitle}
      </Heading>
      <p className="text-[var(--color-text-muted)] max-w-md mb-6 leading-relaxed">
        {finalDescription}
      </p>

      {/* Action */}
      {(finalActionLink || onAction) &&
        (finalActionLink ? (
          <Link to={finalActionLink} className="btn btn-primary">
            {finalActionLabel}
          </Link>
        ) : (
          <button type="button" onClick={onAction} className="btn btn-primary">
            {finalActionLabel}
          </button>
        ))}
      {secondaryLabel && secondaryLink && (
        <Link to={secondaryLink} className="mt-3 text-sm text-[var(--color-primary)] hover:underline underline-offset-4">
          {secondaryLabel}
        </Link>
      )}
    </div>
  );
};

export default EmptyState;
