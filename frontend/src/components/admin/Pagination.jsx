/**
 * Pagination Component
 * Page navigation with controls
 */
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

const Pagination = ({
    currentPage = 1,
    totalPages = 1,
    totalItems = 0,
    itemsPerPage = 20,
    onPageChange,
    showInfo = true,
    compact = false,
}) => {
    // Calculate item range
    const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    // Generate page numbers to show
    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = compact ? 3 : 5;

        let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let end = Math.min(totalPages, start + maxVisible - 1);

        if (end - start + 1 < maxVisible) {
            start = Math.max(1, end - maxVisible + 1);
        }

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }

        return pages;
    };

    const pageNumbers = getPageNumbers();
    const buttonClass = `
        p-2 rounded-lg border border-[var(--color-border)]
        hover:bg-[var(--color-bg)] disabled:opacity-50 
        disabled:cursor-not-allowed transition-colors
    `;

    if (totalPages <= 1 && !showInfo) return null;

    return (
        <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Info */}
            {showInfo && (
                <p className="text-sm text-[var(--color-text-muted)]">
                    Showing <span className="font-medium">{startItem}</span> to{' '}
                    <span className="font-medium">{endItem}</span> of{' '}
                    <span className="font-medium">{totalItems}</span> results
                </p>
            )}

            {/* Controls */}
            {totalPages > 1 && (
                <div className="flex items-center gap-1">
                    {/* First page */}
                    {!compact && (
                        <button
                            onClick={() => onPageChange(1)}
                            disabled={currentPage === 1}
                            className={buttonClass}
                            aria-label="First page"
                        >
                            <ChevronsLeft className="w-4 h-4" />
                        </button>
                    )}

                    {/* Previous */}
                    <button
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className={buttonClass}
                        aria-label="Previous page"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>

                    {/* Page numbers */}
                    {!compact && pageNumbers.map((page) => (
                        <button
                            key={page}
                            onClick={() => onPageChange(page)}
                            className={`
                                w-10 h-10 rounded-lg border transition-colors
                                ${page === currentPage
                                    ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                                    : 'border-[var(--color-border)] hover:bg-[var(--color-bg)]'}
                            `}
                        >
                            {page}
                        </button>
                    ))}

                    {/* Compact page display */}
                    {compact && (
                        <span className="px-3 text-sm">
                            {currentPage} / {totalPages}
                        </span>
                    )}

                    {/* Next */}
                    <button
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className={buttonClass}
                        aria-label="Next page"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>

                    {/* Last page */}
                    {!compact && (
                        <button
                            onClick={() => onPageChange(totalPages)}
                            disabled={currentPage === totalPages}
                            className={buttonClass}
                            aria-label="Last page"
                        >
                            <ChevronsRight className="w-4 h-4" />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default Pagination;
