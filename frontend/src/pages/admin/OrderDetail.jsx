/**
 * OrderDetail Component
 * View order details and update status
 */
import { useState } from 'react';
import { adminAPI } from '../../api';
import { formatPrice, formatDate, formatDateTime, PROVINCES } from '../../utils/helpers';
import { StatusBadge } from '../../components/admin';
import {
    User,
    MapPin,
    CreditCard,
    Package,
    Clock,
    CheckCircle,
    Truck,
    XCircle,
    Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';

const OrderDetail = ({ order, onStatusUpdated, onClose }) => {
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [newStatus, setNewStatus] = useState('');
    const [statusNote, setStatusNote] = useState('');

    // Get next possible statuses
    const getNextStatuses = () => {
        const transitions = {
            pending: ['confirmed', 'cancelled'],
            confirmed: ['processing', 'cancelled'],
            processing: ['shipped', 'cancelled'],
            shipped: ['delivered'],
            delivered: [],
            cancelled: [],
        };
        return transitions[order.status] || [];
    };

    // Handle status update
    const handleStatusUpdate = async () => {
        if (!newStatus) return;

        setUpdatingStatus(true);
        try {
            await adminAPI.updateOrderStatus(order._id, newStatus, statusNote);
            toast.success(`Order status updated to ${newStatus}`);
            setNewStatus('');
            setStatusNote('');
            onStatusUpdated();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update status');
        } finally {
            setUpdatingStatus(false);
        }
    };

    // Get province name
    const getProvinceName = (provinceId) => {
        return PROVINCES.find((p) => p.id === provinceId)?.name || `Province ${provinceId}`;
    };

    // Status icon
    const getStatusIcon = (status) => {
        const icons = {
            pending: Clock,
            confirmed: CheckCircle,
            processing: Package,
            shipped: Truck,
            delivered: CheckCircle,
            cancelled: XCircle,
        };
        return icons[status] || Clock;
    };

    const nextStatuses = getNextStatuses();

    return (
        <div className="space-y-6">
            {/* Order Header */}
            <div className="flex flex-wrap gap-4 justify-between items-start">
                <div>
                    <p className="text-sm text-[var(--color-text-muted)]">
                        Placed on {formatDateTime(order.createdAt)}
                    </p>
                </div>
                <div className="flex gap-2">
                    <StatusBadge status={order.status} size="lg" />
                    <StatusBadge
                        status={order.payment?.status}
                        variant={order.payment?.status === 'paid' ? 'success' : 'warning'}
                        size="lg"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Customer Info */}
                <div className="card p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <User className="w-5 h-5 text-[var(--color-primary)]" />
                        <h3 className="font-semibold">Customer</h3>
                    </div>
                    <div className="space-y-1 text-sm">
                        <p className="font-medium">{order.user?.name}</p>
                        <p className="text-[var(--color-text-muted)]">{order.user?.email}</p>
                        <p className="text-[var(--color-text-muted)]">{order.user?.phone}</p>
                    </div>
                </div>

                {/* Shipping Address */}
                <div className="card p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <MapPin className="w-5 h-5 text-[var(--color-primary)]" />
                        <h3 className="font-semibold">Shipping Address</h3>
                    </div>
                    <div className="space-y-1 text-sm">
                        <p className="font-medium">{order.shippingAddress?.name}</p>
                        <p>{order.shippingAddress?.street}</p>
                        <p>
                            {order.shippingAddress?.city}, {order.shippingAddress?.district}
                        </p>
                        <p>{getProvinceName(order.shippingAddress?.province)}</p>
                        <p className="text-[var(--color-text-muted)]">
                            Phone: {order.shippingAddress?.phone}
                        </p>
                        {order.shippingAddress?.landmark && (
                            <p className="text-[var(--color-text-muted)]">
                                Landmark: {order.shippingAddress?.landmark}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Order Items */}
            <div className="card">
                <div className="p-4 border-b border-[var(--color-border)]">
                    <div className="flex items-center gap-2">
                        <Package className="w-5 h-5 text-[var(--color-primary)]" />
                        <h3 className="font-semibold">Order Items</h3>
                    </div>
                </div>
                <div className="divide-y divide-[var(--color-border)]">
                    {order.items?.map((item, index) => (
                        <div key={index} className="p-4 flex gap-4">
                            {/* Item Image */}
                            <div className="w-16 h-16 rounded-lg overflow-hidden bg-[var(--color-bg)] flex-shrink-0">
                                {item.image ? (
                                    <img
                                        src={item.image}
                                        alt={item.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Package className="w-6 h-6 text-[var(--color-text-muted)]" />
                                    </div>
                                )}
                            </div>

                            {/* Item Details */}
                            <div className="flex-1">
                                <p className="font-medium">{item.name}</p>
                                {item.selectedVariants?.length > 0 && (
                                    <p className="text-sm text-[var(--color-text-muted)]">
                                        {item.selectedVariants.map((v) => `${v.name}: ${v.value}`).join(', ')}
                                    </p>
                                )}
                                <p className="text-sm text-[var(--color-text-muted)]">
                                    Qty: {item.quantity} × {formatPrice(item.price)}
                                </p>
                            </div>

                            {/* Subtotal */}
                            <div className="text-right">
                                <p className="font-medium">{formatPrice(item.subtotal)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Pricing Summary */}
            <div className="card p-4">
                <div className="flex items-center gap-2 mb-3">
                    <CreditCard className="w-5 h-5 text-[var(--color-primary)]" />
                    <h3 className="font-semibold">Payment Details</h3>
                </div>

                <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                        <span>Payment Method</span>
                        <span className="uppercase">{order.payment?.method}</span>
                    </div>
                    {order.payment?.transactionId && (
                        <div className="flex justify-between text-sm">
                            <span>Transaction ID</span>
                            <span className="font-mono">{order.payment.transactionId}</span>
                        </div>
                    )}
                    {order.payment?.paidAt && (
                        <div className="flex justify-between text-sm">
                            <span>Paid At</span>
                            <span>{formatDateTime(order.payment.paidAt)}</span>
                        </div>
                    )}
                </div>

                <div className="border-t border-[var(--color-border)] pt-3 space-y-2">
                    <div className="flex justify-between text-sm">
                        <span>Subtotal</span>
                        <span>{formatPrice(order.pricing?.subtotal)}</span>
                    </div>
                    {order.pricing?.shippingCost > 0 && (
                        <div className="flex justify-between text-sm">
                            <span>Shipping</span>
                            <span>{formatPrice(order.pricing.shippingCost)}</span>
                        </div>
                    )}
                    {order.pricing?.discount > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                            <span>Discount</span>
                            <span>-{formatPrice(order.pricing.discount)}</span>
                        </div>
                    )}
                    {order.pricing?.tax > 0 && (
                        <div className="flex justify-between text-sm">
                            <span>Tax</span>
                            <span>{formatPrice(order.pricing.tax)}</span>
                        </div>
                    )}
                    <div className="flex justify-between font-semibold text-lg pt-2 border-t border-[var(--color-border)]">
                        <span>Total</span>
                        <span>{formatPrice(order.pricing?.total)}</span>
                    </div>
                </div>
            </div>

            {/* Status History */}
            {order.statusHistory?.length > 0 && (
                <div className="card p-4">
                    <div className="flex items-center gap-2 mb-4">
                        <Clock className="w-5 h-5 text-[var(--color-primary)]" />
                        <h3 className="font-semibold">Status History</h3>
                    </div>

                    <div className="space-y-3">
                        {order.statusHistory.map((history, index) => {
                            const Icon = getStatusIcon(history.status);
                            return (
                                <div key={index} className="flex gap-3">
                                    <div className="w-8 h-8 rounded-full bg-[var(--color-bg)] flex items-center justify-center flex-shrink-0">
                                        <Icon className="w-4 h-4 text-[var(--color-primary)]" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between">
                                            <span className="font-medium capitalize">{history.status}</span>
                                            <span className="text-sm text-[var(--color-text-muted)]">
                                                {formatDateTime(history.changedAt)}
                                            </span>
                                        </div>
                                        {history.note && (
                                            <p className="text-sm text-[var(--color-text-muted)]">
                                                {history.note}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Update Status */}
            {nextStatuses.length > 0 && (
                <div className="card p-4">
                    <h3 className="font-semibold mb-4">Update Status</h3>

                    <div className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                            {nextStatuses.map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setNewStatus(status)}
                                    className={`
                                        px-4 py-2 rounded-lg border transition-colors capitalize
                                        ${newStatus === status
                                            ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                                            : 'border-[var(--color-border)] hover:border-[var(--color-primary)]'}
                                        ${status === 'cancelled' ? 'text-red-500 hover:bg-red-50' : ''}
                                    `}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>

                        {newStatus && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium mb-1">
                                        Note (optional)
                                    </label>
                                    <textarea
                                        value={statusNote}
                                        onChange={(e) => setStatusNote(e.target.value)}
                                        className="textarea"
                                        placeholder={
                                            newStatus === 'cancelled'
                                                ? 'Reason for cancellation...'
                                                : 'Add a note about this status change...'
                                        }
                                        rows={2}
                                    />
                                </div>

                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={() => {
                                            setNewStatus('');
                                            setStatusNote('');
                                        }}
                                        className="btn btn-secondary"
                                        disabled={updatingStatus}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleStatusUpdate}
                                        className={`btn ${newStatus === 'cancelled' ? 'bg-red-600 hover:bg-red-700 text-white' : 'btn-primary'}`}
                                        disabled={updatingStatus}
                                    >
                                        {updatingStatus ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Updating...
                                            </>
                                        ) : (
                                            `Update to ${newStatus}`
                                        )}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Customer Notes */}
            {order.customerNotes && (
                <div className="card p-4 bg-yellow-50 border-yellow-200">
                    <h3 className="font-semibold mb-2">Customer Notes</h3>
                    <p className="text-sm">{order.customerNotes}</p>
                </div>
            )}
        </div>
    );
};

export default OrderDetail;
