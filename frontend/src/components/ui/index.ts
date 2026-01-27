/**
 * UI Components Index
 * Export all reusable UI components
 */

// Loading & Feedback
export {
  default as Skeleton,
  ProductCardSkeleton,
  ProductGridSkeleton,
  CategoryCardSkeleton,
  OrderItemSkeleton,
  TableRowSkeleton,
  DashboardStatSkeleton,
  ChartSkeleton,
} from "./Skeleton";
export { default as EmptyState } from "./EmptyState";
export { Toaster, showToast } from "./Toast";
export { default as Tooltip } from "./Tooltip";

// Navigation
export { default as Breadcrumb } from "./Breadcrumb";
export { default as Pagination } from "./Pagination";
export { default as Tabs, TabList, TabTrigger, TabContent } from "./Tabs";

// Overlays
export { default as Modal, ConfirmModal } from "./Modal";
export { default as AuthPromptModal } from "./AuthPromptModal";

// Data Display
export {
  default as Badge,
  OrderStatusBadge,
  PaymentStatusBadge,
  StockBadge,
} from "./Badge";
export {
  default as Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  StatCard,
} from "./Card";
export { default as Avatar, AvatarGroup } from "./Avatar";
export {
  default as PriceDisplay,
  PriceTag,
  DiscountBadge,
} from "./PriceDisplay";

// Form Components
export { default as Button, IconButton, ButtonGroup } from "./Button";
export { Input, Textarea, Select, Checkbox } from "./Input";
export { default as SearchInput } from "./SearchInput";
export { default as QuantitySelector } from "./QuantitySelector";
