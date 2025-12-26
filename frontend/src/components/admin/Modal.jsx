/**
 * Modal Component
 * Reusable modal dialog with backdrop and animations
 */
import { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

const Modal = ({
    isOpen,
    onClose,
    title,
    children,
    size = 'md', // sm, md, lg, xl, full
    showCloseButton = true,
    closeOnBackdrop = true,
    closeOnEscape = true,
    footer = null,
}) => {
    // Handle escape key press
    const handleEscape = useCallback((e) => {
        if (closeOnEscape && e.key === 'Escape') {
            onClose();
        }
    }, [closeOnEscape, onClose]);

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, handleEscape]);

    if (!isOpen) return null;

    // Size classes
    const sizeClasses = {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
        full: 'max-w-[90vw]',
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fadeIn"
                onClick={closeOnBackdrop ? onClose : undefined}
            />

            {/* Modal Panel */}
            <div
                className={`
                    relative w-full ${sizeClasses[size]} 
                    bg-[var(--color-surface)] rounded-xl shadow-xl
                    animate-slideUp max-h-[90vh] flex flex-col
                `}
            >
                {/* Header */}
                {(title || showCloseButton) && (
                    <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
                        {title && (
                            <h2 id="modal-title" className="text-lg font-semibold">
                                {title}
                            </h2>
                        )}
                        {showCloseButton && (
                            <button
                                onClick={onClose}
                                className="p-1 rounded-lg hover:bg-[var(--color-bg)] transition-colors ml-auto"
                                aria-label="Close modal"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                )}

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-4">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="p-4 border-t border-[var(--color-border)] flex justify-end gap-3">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Modal;
