/**
 * StatusBadge Component
 * Configurable status badge with color variants
 */

const StatusBadge = ({ status, variant, size = 'md', uppercase = true }) => {
    // Auto-determine variant from status if not provided
    const getVariant = () => {
        if (variant) return variant;

        const variants = {
            // Order status
            pending: 'warning',
            confirmed: 'info',
            processing: 'info',
            shipped: 'info',
            delivered: 'success',
            cancelled: 'error',
            // Payment status
            paid: 'success',
            failed: 'error',
            refunded: 'warning',
            // User status
            active: 'success',
            inactive: 'error',
            // Generic
            true: 'success',
            false: 'error',
            yes: 'success',
            no: 'error',
        };

        return variants[status?.toLowerCase?.()] || 'default';
    };

    const variantClasses = {
        success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        default: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
        primary: 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]',
    };

    const sizeClasses = {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-1 text-xs',
        lg: 'px-3 py-1.5 text-sm',
    };

    const displayText = uppercase && status ? status.toUpperCase() : status;

    return (
        <span
            className={`
                inline-flex items-center font-medium rounded-full
                ${variantClasses[getVariant()]}
                ${sizeClasses[size]}
            `}
        >
            {displayText}
        </span>
    );
};

export default StatusBadge;
