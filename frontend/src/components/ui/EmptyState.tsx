/**
 * Empty State Component
 * Displays user-friendly empty states with actions
 */
import { ReactNode } from "react";
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
  icon?: ReactNode;
}

const defaultStates = {
  cart: {
    icon: ShoppingBag,
    title: "Your cart is empty",
    description:
      "Looks like you haven't added anything to your cart yet. Start exploring our handcrafted products!",
    actionLabel: "Start Shopping",
    actionLink: "/products",
  },
  orders: {
    icon: ClipboardList,
    title: "No orders yet",
    description:
      "You haven't placed any orders yet. Discover our unique Nepali handicrafts!",
    actionLabel: "Browse Products",
    actionLink: "/products",
  },
  products: {
    icon: Package,
    title: "No products found",
    description:
      "There are no products matching your criteria. Try adjusting your filters or search terms.",
    actionLabel: "Clear Filters",
    actionLink: "/products",
  },
  search: {
    icon: Search,
    title: "No results found",
    description:
      "We couldn't find any products matching your search. Try using different keywords.",
    actionLabel: "View All Products",
    actionLink: "/products",
  },
  wishlist: {
    icon: Heart,
    title: "Your wishlist is empty",
    description: "Save your favorite items here to buy them later.",
    actionLabel: "Discover Products",
    actionLink: "/products",
  },
  categories: {
    icon: FolderOpen,
    title: "No categories found",
    description: "Categories will appear here once they are added.",
    actionLabel: "Go Home",
    actionLink: "/",
  },
  users: {
    icon: Users,
    title: "No users found",
    description: "No users match your search criteria.",
    actionLabel: "Clear Search",
    actionLink: "/admin/users",
  },
  generic: {
    icon: AlertCircle,
    title: "Nothing here",
    description: "This section is currently empty.",
    actionLabel: "Go Back",
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
}: EmptyStateProps) => {
  const defaults = defaultStates[type];
  const IconComponent = icon || defaults.icon;

  const finalTitle = title || defaults.title;
  const finalDescription = description || defaults.description;
  const finalActionLabel = actionLabel || defaults.actionLabel;
  const finalActionLink = actionLink || defaults.actionLink;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {/* Animated Icon */}
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-[var(--color-primary)]/10 rounded-full blur-xl animate-pulse" />
        <div className="relative w-24 h-24 bg-[var(--color-bg)] rounded-full flex items-center justify-center border-2 border-dashed border-[var(--color-border)]">
          {typeof IconComponent === "function" ? (
            <IconComponent className="w-10 h-10 text-[var(--color-text-muted)]" />
          ) : (
            IconComponent
          )}
        </div>
      </div>

      {/* Content */}
      <h3 className="text-xl font-semibold text-[var(--color-text)] mb-2">
        {finalTitle}
      </h3>
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
          <button onClick={onAction} className="btn btn-primary">
            {finalActionLabel}
          </button>
        ))}
    </div>
  );
};

export default EmptyState;
