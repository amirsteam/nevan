/**
 * Pagination Component
 * Accessible pagination with keyboard navigation
 */
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
  showFirstLast?: boolean;
  className?: string;
}

// Generate page numbers to display
const generatePageNumbers = (
  currentPage: number,
  totalPages: number,
  siblingCount: number,
): (number | "ellipsis")[] => {
  const totalNumbers = siblingCount * 2 + 3; // siblings + current + 2 ellipsis
  const totalBlocks = totalNumbers + 2; // + first and last page

  if (totalPages <= totalBlocks) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
  const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

  const shouldShowLeftEllipsis = leftSiblingIndex > 2;
  const shouldShowRightEllipsis = rightSiblingIndex < totalPages - 1;

  if (!shouldShowLeftEllipsis && shouldShowRightEllipsis) {
    const leftItemCount = 3 + 2 * siblingCount;
    const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
    return [...leftRange, "ellipsis", totalPages];
  }

  if (shouldShowLeftEllipsis && !shouldShowRightEllipsis) {
    const rightItemCount = 3 + 2 * siblingCount;
    const rightRange = Array.from(
      { length: rightItemCount },
      (_, i) => totalPages - rightItemCount + i + 1,
    );
    return [1, "ellipsis", ...rightRange];
  }

  const middleRange = Array.from(
    { length: rightSiblingIndex - leftSiblingIndex + 1 },
    (_, i) => leftSiblingIndex + i,
  );
  return [1, "ellipsis", ...middleRange, "ellipsis", totalPages];
};

const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  siblingCount = 1,
  showFirstLast: _showFirstLast = true,
  className = "",
}: PaginationProps) => {
  if (totalPages <= 1) return null;

  const pageNumbers = generatePageNumbers(
    currentPage,
    totalPages,
    siblingCount,
  );

  const handlePrevious = () => {
    if (currentPage > 1) onPageChange(currentPage - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) onPageChange(currentPage + 1);
  };

  const buttonBase = `
    min-w-[40px] h-10 px-3 rounded-lg font-medium text-sm
    transition-all duration-200 flex items-center justify-center
    focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

  const pageButton = `
    ${buttonBase}
    border border-[var(--color-border)]
    hover:bg-[var(--color-background)] hover:border-[var(--color-primary)]
  `;

  const activeButton = `
    ${buttonBase}
    bg-[var(--color-primary)] text-white border border-[var(--color-primary)]
    shadow-md
  `;

  const navButton = `
    ${buttonBase}
    border border-[var(--color-border)]
    hover:bg-[var(--color-background)] hover:border-[var(--color-primary)]
  `;

  return (
    <nav
      aria-label="Pagination"
      className={`flex items-center justify-center gap-1 ${className}`}
    >
      {/* Previous Button */}
      <button
        onClick={handlePrevious}
        disabled={currentPage === 1}
        className={navButton}
        aria-label="Previous page"
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="hidden sm:inline ml-1">Prev</span>
      </button>

      {/* Page Numbers */}
      <div className="hidden sm:flex items-center gap-1">
        {pageNumbers.map((page, index) => {
          if (page === "ellipsis") {
            return (
              <span
                key={`ellipsis-${index}`}
                className="min-w-[40px] h-10 flex items-center justify-center text-[var(--color-text-muted)]"
              >
                <MoreHorizontal className="w-4 h-4" />
              </span>
            );
          }

          return (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={page === currentPage ? activeButton : pageButton}
              aria-label={`Page ${page}`}
              aria-current={page === currentPage ? "page" : undefined}
            >
              {page}
            </button>
          );
        })}
      </div>

      {/* Mobile: Current Page Indicator */}
      <span className="sm:hidden px-4 py-2 text-sm font-medium text-[var(--color-text-muted)]">
        Page {currentPage} of {totalPages}
      </span>

      {/* Next Button */}
      <button
        onClick={handleNext}
        disabled={currentPage === totalPages}
        className={navButton}
        aria-label="Next page"
      >
        <span className="hidden sm:inline mr-1">Next</span>
        <ChevronRight className="w-4 h-4" />
      </button>
    </nav>
  );
};

export default Pagination;
