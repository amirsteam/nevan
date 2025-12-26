/**
 * LoadingSpinner Component
 * Centered loading indicator
 */
import { Loader2 } from 'lucide-react';

const LoadingSpinner = ({
    size = 'md',
    message = null,
    fullPage = false,
}) => {
    const sizeClasses = {
        sm: 'w-5 h-5',
        md: 'w-8 h-8',
        lg: 'w-12 h-12',
    };

    const spinner = (
        <div className="flex flex-col items-center justify-center gap-3">
            <Loader2 className={`${sizeClasses[size]} animate-spin text-[var(--color-primary)]`} />
            {message && (
                <p className="text-sm text-[var(--color-text-muted)]">{message}</p>
            )}
        </div>
    );

    if (fullPage) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-[var(--color-bg)]">
                {spinner}
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center py-12">
            {spinner}
        </div>
    );
};

export default LoadingSpinner;
