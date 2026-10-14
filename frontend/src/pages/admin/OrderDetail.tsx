/**
 * OrderDetail Component
 * View order details and update status; record cash collected (COD) and
 * refunds. Unpaid online orders can't be confirmed by hand.
 */
import { useState } from 'react';
import { adminAPI } from '../../api';
import { formatPrice, formatDateTime, getErrorMessage, PROVINCES, populated } from "../../utils/helpers";
import type { IOrder, OrderStatus } from '../../types';
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
    Printer,
    Phone,
    MessageCircle,
    Banknote,
    RotateCcw,
    Info,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { printPackingSlip } from '../../utils/packingSlip';
import { isAwaitingOnlinePayment, isCashToCollect, isRefundOwed, whatsappNumber } from '../../utils/adminOrders';

interface OrderDetailProps {
    order: IOrder;
    onStatusUpdated: () => void;
    onClose?: () => void;
}

const OrderDetail = ({ order, onStatusUpdated }: OrderDetailProps) => {
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [newStatus, setNewStatus] = useState<OrderStatus | ''>('');
    const [statusNote, setStatusNote] = useState('');
    const [paymentBusy, setPaymentBusy] = useState(false);
    const [refundReference, setRefundReference] = useState('');
    const [refundNote, setRefundNote] = useState('');
    const [adminNote, setAdminNote] = useState(order.notes || '');
    const [savingNote, setSavingNote] = useState(false);
    const noteChanged = adminNote.trim() !== (order.notes || '').trim();

    const saveNote = async () => {
        setSavingNote(true);
        try {
            await adminAPI.updateOrderNote(order._id, adminNote.trim());
            toast.success('Note saved');
            onStatusUpdated();
        } catch (error) {
            toast.error(getErrorMessage(error, 'Could not save the note'));
        } finally {
            setSavingNote(false);
        }
    };

    const awaitingPayment = isAwaitingOnlinePayment(order);
    const refundOwed = isRefundOwed(order);
    const cashToCollect = isCashToCollect(order);

    const collectCash = async () => {
        setPaymentBusy(true);
        try {
            await adminAPI.markCODCollected(order._id);
            toast.success('Cash marked as collected');
            onStatusUpdated();
        } catch (error) {
            toast.error(getErrorMessage(error, 'Could not mark the cash as collected'));
        } finally {
            setPaymentBusy(false);
        }
    };

    const recordRefund = async () => {
        setPaymentBusy(true);
        try {
            await adminAPI.recordRefund(order._id, { reference: refundReference.trim(), note: refundNote.trim() });
            toast.success('Refund recorded');
            setRefundReference('');
            setRefundNote('');
            onStatusUpdated();
        } catch (error) {
            toast.error(getErrorMessage(error, 'Could not record the refund'));
        } finally {
            setPaymentBusy(false);
        }
    };

    // Get next possible statuses
    const getNextStatuses = (): OrderStatus[] => {
        const transitions: Record<OrderStatus, OrderStatus[]> = {
            pending: ['confirmed', 'cancelled'],
            confirmed: ['processing', 'cancelled'],
            processing: ['shipped', 'cancelled'],
            shipped: ['delivered'],
            delivered: [],
            cancelled: [],
        };
        const next = (order.status && transitions[order.status]) || [];
        // Unpaid online orders confirm themselves when the payment arrives
        return awaitingPayment ? next.filter((s) => s !== 'confirmed') : next;
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
            toast.error(getErrorMessage(error, 'Failed to update status'));
        } finally {
            setUpdatingStatus(false);
        }
    };

    // Get province name
    const getProvinceName = (provinceId?: number) => {
        return PROVINCES.find((p) => p.id === provinceId)?.name || `Province ${provinceId}`;
    };

    // Status icon
    const getStatusIcon = (status: OrderStatus) => {
        const icons: Record<OrderStatus, typeof Clock> = {
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
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            if (!printPackingSlip(order)) toast.error('Allow pop-ups for this site to print the packing slip');
                        }}
                        className="btn btn-secondary text-sm py-1.5"
                    >
                        <Printer className="w-4 h-4" aria-hidden="true" />
                        Packing slip
                    </button>
                    <StatusBadge status={order.status} size="lg" />
                    <StatusBadge
                        status={order.payment?.status}
                        variant={order.payment?.status === 'paid' ? 'success' : 'warning'}
                        size="lg"
                    />
                </div>
            </div>

            {awaitingPayment && (
                <p className="flex items-start gap-2 rounded-lg bg-[var(--color-info)]/10 p-3 text-sm">
                    <Info className="w-4 h-4 mt-0.5 shrink-0 text-[var(--color-info)]" aria-hidden="true" />
                    <span>
                        <strong>Waiting for the {order.payment?.method === 'esewa' ? 'eSewa' : 'online'} payment.</strong>{' '}
                        The order confirms itself once it's paid, and is cancelled automatically if it isn't paid in time.
                    </span>
                </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Customer Info */}
                <div className="card p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <User className="w-5 h-5 text-[var(--color-primary)]" />
                        <h3 className="font-semibold">Customer</h3>
                    </div>
                    <div className="space-y-1 text-sm">
                        <p className="font-medium">{populated(order.user)?.name}</p>
                        <p className="text-[var(--color-text-muted)]">{populated(order.user)?.email}</p>
                        <p className="text-[var(--color-text-muted)]">{populated(order.user)?.phone}</p>
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
                        {order.shippingAddress?.phone && (
                            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1">
                                <a
                                    href={`tel:${order.shippingAddress.phone}`}
                                    className="inline-flex items-center gap-1.5 font-medium text-[var(--color-primary)] hover:underline"
                                >
                                    <Phone className="w-4 h-4" aria-hidden="true" />
                                    {order.shippingAddress.phone}
                                </a>
                                <a
                                    href={`https://wa.me/${whatsappNumber(order.shippingAddress.phone)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-[var(--color-primary)] hover:underline"
                                >
                                    <MessageCircle className="w-4 h-4" aria-hidden="true" />
                                    WhatsApp
                                </a>
                            </p>
                        )}
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
                                {item.variant && (
                                    <p className="text-sm text-[var(--color-text-muted)]">
                                        Size: {item.variant.size}, Color: {item.variant.color}
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
                    {!!order.pricing?.shippingCost && (
                        <div className="flex justify-between text-sm">
                            <span>Shipping</span>
                            <span>{formatPrice(order.pricing.shippingCost)}</span>
                        </div>
                    )}
                    {!!order.pricing?.discount && (
                        <div className="flex justify-between text-sm text-green-600">
                            <span>Discount</span>
                            <span>-{formatPrice(order.pricing.discount)}</span>
                        </div>
                    )}
                    {!!order.pricing?.tax && (
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

            {/* Payment actions: cash collected, refunds */}
            {(cashToCollect || refundOwed || order.payment?.refundedAt) && (
                <div className="card p-4 space-y-3">
                    {cashToCollect && (
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-sm">
                                <strong>Cash on delivery:</strong> {formatPrice(order.pricing?.total)} not collected yet.
                            </p>
                            <button type="button" onClick={collectCash} disabled={paymentBusy} className="btn btn-secondary text-sm">
                                <Banknote className="w-4 h-4" aria-hidden="true" />
                                Mark cash collected
                            </button>
                        </div>
                    )}

                    {refundOwed && (
                        <div className="space-y-3">
                            <p className="flex items-start gap-2 text-sm">
                                <RotateCcw className="w-4 h-4 mt-0.5 shrink-0 text-[var(--color-error)]" aria-hidden="true" />
                                <span>
                                    <strong>Refund owed.</strong>{' '}
                                    {order.status === 'cancelled'
                                        ? `The customer paid ${formatPrice(order.pricing?.total)}, then the order was cancelled.`
                                        : 'The customer paid twice; give the extra payment back. The order itself stays paid.'}{' '}
                                    Once you've sent the money back, record it here.
                                </span>
                            </p>
                            <div className="grid sm:grid-cols-2 gap-3">
                                <div>
                                    <label htmlFor="refund-reference" className="block text-sm font-medium mb-1">
                                        Refund reference <span className="font-normal text-[var(--color-text-muted)]">(optional)</span>
                                    </label>
                                    <input
                                        id="refund-reference"
                                        className="input"
                                        maxLength={100}
                                        value={refundReference}
                                        onChange={(e) => setRefundReference(e.target.value)}
                                        placeholder="e.g. eSewa refund ID"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="refund-note" className="block text-sm font-medium mb-1">
                                        Note <span className="font-normal text-[var(--color-text-muted)]">(optional)</span>
                                    </label>
                                    <input
                                        id="refund-note"
                                        className="input"
                                        maxLength={500}
                                        value={refundNote}
                                        onChange={(e) => setRefundNote(e.target.value)}
                                        placeholder="How it was refunded"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <button type="button" onClick={recordRefund} disabled={paymentBusy} className="btn btn-primary text-sm">
                                    {paymentBusy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                                    Mark refund done
                                </button>
                            </div>
                        </div>
                    )}

                    {!refundOwed && order.payment?.refundedAt && (
                        <p className="flex items-center gap-2 text-sm text-[var(--color-success)]">
                            <CheckCircle className="w-4 h-4" aria-hidden="true" />
                            Refunded {formatDateTime(order.payment.refundedAt)}
                            {order.payment.refundReference && ` (ref ${order.payment.refundReference})`}
                        </p>
                    )}
                </div>
            )}

            {/* Status History */}
            {!!order.statusHistory?.length && (
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
                                                {formatDateTime(history.changedAt || history.timestamp || order.createdAt)}
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
                                            ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)] border-[var(--color-primary)]'
                                            : 'border-[var(--color-border)] hover:border-[var(--color-primary)]'}
                                        ${status === 'cancelled' && newStatus !== status ? 'text-[var(--color-error)] hover:bg-[var(--color-error)]/10' : ''}
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
                                        className={`btn ${newStatus === 'cancelled' ? 'bg-[var(--color-error)] text-[var(--color-on-error)] hover:opacity-90' : 'btn-primary'}`}
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

            {/* Internal note (admins only) */}
            <div className="card p-4">
                <label htmlFor="admin-note" className="block font-semibold mb-1">
                    Internal note
                </label>
                <p className="text-xs text-[var(--color-text-muted)] mb-2">Only admins see this, e.g. "Call before delivery" or courier details.</p>
                <textarea
                    id="admin-note"
                    className="textarea"
                    rows={2}
                    maxLength={1000}
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                />
                {noteChanged && (
                    <div className="flex justify-end mt-2">
                        <button type="button" onClick={saveNote} disabled={savingNote} className="btn btn-secondary text-sm">
                            {savingNote && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                            Save note
                        </button>
                    </div>
                )}
            </div>

            {/* Customer Notes */}
            {order.customerNotes && (
                <div className="card p-4 bg-[var(--color-warning)]/10 border-[var(--color-warning)]/30">
                    <h3 className="font-semibold mb-2">Customer Notes</h3>
                    <p className="text-sm">{order.customerNotes}</p>
                </div>
            )}
        </div>
    );
};

export default OrderDetail;
