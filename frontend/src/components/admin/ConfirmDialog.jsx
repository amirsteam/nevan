/**
 * ConfirmDialog Component
 * Confirmation modal for destructive actions
 */
import { AlertTriangle, Trash2, Info } from 'lucide-react';
import Modal from './Modal';

const ConfirmDialog = ({
    isOpen,
    onClose,
    onConfirm,
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger', // danger, warning, info
    loading = false,
}) => {
    const variantConfig = {
        danger: {
            icon: Trash2,
            iconBg: 'bg-red-100',
            iconColor: 'text-red-600',
            buttonClass: 'bg-red-600 hover:bg-red-700 text-white',
        },
        warning: {
            icon: AlertTriangle,
            iconBg: 'bg-yellow-100',
            iconColor: 'text-yellow-600',
            buttonClass: 'bg-yellow-600 hover:bg-yellow-700 text-white',
        },
        info: {
            icon: Info,
            iconBg: 'bg-blue-100',
            iconColor: 'text-blue-600',
            buttonClass: 'bg-blue-600 hover:bg-blue-700 text-white',
        },
    };

    const config = variantConfig[variant];
    const Icon = config.icon;

    const handleConfirm = async () => {
        await onConfirm();
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="sm"
            showCloseButton={false}
        >
            <div className="text-center">
                {/* Icon */}
                <div className={`w-16 h-16 mx-auto rounded-full ${config.iconBg} flex items-center justify-center mb-4`}>
                    <Icon className={`w-8 h-8 ${config.iconColor}`} />
                </div>

                {/* Title */}
                <h3 className="text-lg font-semibold mb-2">{title}</h3>

                {/* Message */}
                <p className="text-[var(--color-text-muted)] mb-6">{message}</p>

                {/* Actions */}
                <div className="flex gap-3 justify-center">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="btn btn-secondary flex-1"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={loading}
                        className={`btn flex-1 ${config.buttonClass}`}
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Processing...
                            </span>
                        ) : (
                            confirmText
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default ConfirmDialog;
