/**
 * Breadcrumb Component
 * Navigation breadcrumb for better UX
 */
import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[];
  showHome?: boolean;
  className?: string;
}

// Auto-generate breadcrumb from path
const generateBreadcrumbFromPath = (pathname: string): BreadcrumbItem[] => {
  const pathSegments = pathname.split("/").filter(Boolean);
  const items: BreadcrumbItem[] = [];

  let currentPath = "";

  pathSegments.forEach((segment, index) => {
    currentPath += `/${segment}`;

    // Convert slug to readable label
    const label = segment
      .replace(/-/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());

    // Don't add link for the last item (current page)
    const isLast = index === pathSegments.length - 1;

    items.push({
      label,
      path: isLast ? undefined : currentPath,
    });
  });

  return items;
};

const Breadcrumb = ({
  items,
  showHome = true,
  className = "",
}: BreadcrumbProps) => {
  const location = useLocation();

  // Use provided items or auto-generate from path
  const breadcrumbItems =
    items || generateBreadcrumbFromPath(location.pathname);

  if (breadcrumbItems.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex items-center gap-1 text-sm text-[var(--color-text-muted)] overflow-x-auto ${className}`}
    >
      {showHome && (
        <>
          <Link
            to="/"
            className="flex items-center gap-1 hover:text-[var(--color-primary)] transition-colors whitespace-nowrap"
          >
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">Home</span>
          </Link>
          <ChevronRight className="w-4 h-4 flex-shrink-0" />
        </>
      )}

      {breadcrumbItems.map((item, index) => (
        <div key={index} className="flex items-center gap-1">
          {item.path ? (
            <Link
              to={item.path}
              className="hover:text-[var(--color-primary)] transition-colors whitespace-nowrap"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-[var(--color-text)] font-medium whitespace-nowrap">
              {item.label}
            </span>
          )}

          {index < breadcrumbItems.length - 1 && (
            <ChevronRight className="w-4 h-4 flex-shrink-0" />
          )}
        </div>
      ))}
    </nav>
  );
};

export default Breadcrumb;
