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
    <nav aria-label="Breadcrumb" className={`text-sm text-[var(--color-text-muted)] ${className}`}>
      <ol className="flex items-center gap-1 overflow-x-auto whitespace-nowrap">
      {showHome && (
        <li className="flex items-center gap-1">
          <Link
            to="/"
            className="flex items-center gap-1 hover:text-[var(--color-primary)] transition-colors"
          >
            <Home className="w-4 h-4" aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">Home</span>
          </Link>
          <ChevronRight className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
        </li>
      )}

      {breadcrumbItems.map((item, index) => (
        <li key={index} className="flex items-center gap-1 min-w-0">
          {item.path ? (
            <Link
              to={item.path}
              className="hover:text-[var(--color-primary)] transition-colors whitespace-nowrap"
            >
              {item.label}
            </Link>
          ) : (
            <span aria-current="page" className="text-[var(--color-text)] font-medium truncate max-w-[16rem]">
              {item.label}
            </span>
          )}

          {index < breadcrumbItems.length - 1 && (
            <ChevronRight className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          )}
        </li>
      ))}
      </ol>
    </nav>
  );
};

export default Breadcrumb;
