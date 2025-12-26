/**
 * Orders Management Page
 * List orders with filters and status management
 */
import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../api';
import { formatPrice, formatDate } from '../../utils/helpers';
import {
    DataTable,
    Pagination,
    SearchInput,
    StatusBadge,
    Modal,
} from '../../components/admin';
import OrderDetail from './OrderDetail';
import { Eye, Package, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

const Orders = () => {
    // State
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: 20,
    });

    // Filters
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [paymentFilter, setPaymentFilter] = useState('');

    // Modal
    const [selectedOrder, setSelectedOrder] = useState(null);

    // Fetch orders
    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                page: pagination.currentPage,
                limit: pagination.itemsPerPage,
            };
            if (search) params.search = search;
            if (statusFilter) params.status = statusFilter;
            if (paymentFilter) params.paymentStatus = paymentFilter;

            const response = await adminAPI.getOrders(params);
            setOrders(response.data.data.orders);
            setPagination((prev) => ({
                ...prev,
                totalPages: response.data.pagination?.totalPages || 1,
                totalItems: response.data.pagination?.totalItems || response.data.results,
            }));
        } catch (error) {
            console.error('Failed to fetch orders:', error);
            toast.error('Failed to load orders');
        } finally {
            setLoading(false);
        }
    }, [pagination.currentPage, pagination.itemsPerPage, search, statusFilter, paymentFilter]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    // Handle search
    const handleSearch = (value) => {
        setSearch(value);
        setPagination((prev) => ({ ...prev, currentPage: 1 }));
    };

    // Handle page change
    const handlePageChange = (page) => {
        setPagination((prev) => ({ ...prev, currentPage: page }));
    };

    // View order detail
    const handleViewOrder = async (order) => {
        try {
            const response = await adminAPI.getOrderById(order._id);
            setSelectedOrder(response.data.data.order);
        } catch (error) {
            toast.error('Failed to load order details');
        }
    };

    // Status update callback
    const handleStatusUpdated = () => {
        fetchOrders();
        // Refresh selected order if still open
        if (selectedOrder) {
            handleViewOrder(selectedOrder);
        }
    };

    // Get status badge variant
    const getStatusVariant = (status) => {
        const variants = {
            pending: 'warning',
            confirmed: 'info',
            processing: 'info',
            shipped: 'info',
            delivered: 'success',
            cancelled: 'error',
        };
        return variants[status] || 'default';
    };

    // Table columns
    const columns = [
        {
            key: 'orderNumber',
            label: 'Order',
            sortable: true,
            render: (orderNumber) => (
                <span className="font-medium">#{orderNumber}</span>
            ),
        },
        {
            key: 'user',
            label: 'Customer',
            render: (user) => (
                <div>
                    <p className="font-medium">{user?.name || 'Guest'}</p>
                    <p className="text-sm text-[var(--color-text-muted)]">{user?.email}</p>
                </div>
            ),
        },
        {
            key: 'items',
            label: 'Items',
            render: (items) => (
                <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-[var(--color-text-muted)]" />
                    <span>{items?.length || 0} items</span>
                </div>
            ),
        },
        {
            key: 'pricing',
            label: 'Total',
            sortable: true,
            render: (pricing) => (
                <span className="font-medium">{formatPrice(pricing?.total || 0)}</span>
            ),
        },
        {
            key: 'payment',
            label: 'Payment',
            render: (payment) => (
                <div className="space-y-1">
                    <p className="text-sm uppercase">{payment?.method}</p>
                    <StatusBadge
                        status={payment?.status}
                        variant={payment?.status === 'paid' ? 'success' : payment?.status === 'failed' ? 'error' : 'warning'}
                        size="sm"
                    />
                </div>
            ),
        },
        {
            key: 'status',
            label: 'Status',
            render: (status) => (
                <StatusBadge status={status} variant={getStatusVariant(status)} />
            ),
        },
        {
            key: 'createdAt',
            label: 'Date',
            sortable: true,
            render: (date) => (
                <span className="text-sm text-[var(--color-text-muted)]">
                    {formatDate(date)}
                </span>
            ),
        },
    ];

    // Row actions
    const getRowActions = (order) => [
        {
            label: 'View Details',
            icon: Eye,
            onClick: () => handleViewOrder(order),
        },
    ];

    // Order status options
    const statusOptions = [
        { value: '', label: 'All Status' },
        { value: 'pending', label: 'Pending' },
        { value: 'confirmed', label: 'Confirmed' },
        { value: 'processing', label: 'Processing' },
        { value: 'shipped', label: 'Shipped' },
        { value: 'delivered', label: 'Delivered' },
        { value: 'cancelled', label: 'Cancelled' },
    ];

    // Payment status options
    const paymentOptions = [
        { value: '', label: 'All Payments' },
        { value: 'pending', label: 'Pending' },
        { value: 'paid', label: 'Paid' },
        { value: 'failed', label: 'Failed' },
    ];

    return (
        <div>
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Orders</h1>
            </div>

            {/* Filters */}
            <div className="card mb-6">
                <div className="p-4 flex flex-col sm:flex-row gap-4">
                    <SearchInput
                        value={search}
                        onChange={handleSearch}
                        placeholder="Search by order number..."
                        className="flex-1"
                    />

                    <div className="flex gap-3">
                        <select
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                setPagination((prev) => ({ ...prev, currentPage: 1 }));
                            }}
                            className="select w-auto"
                        >
                            {statusOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>

                        <select
                            value={paymentFilter}
                            onChange={(e) => {
                                setPaymentFilter(e.target.value);
                                setPagination((prev) => ({ ...prev, currentPage: 1 }));
                            }}
                            className="select w-auto"
                        >
                            {paymentOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Orders Table */}
            <div className="card">
                <DataTable
                    columns={columns}
                    data={orders}
                    loading={loading}
                    emptyMessage="No orders found"
                    actions={getRowActions}
                    onRowClick={handleViewOrder}
                />

                {/* Pagination */}
                {!loading && orders.length > 0 && (
                    <div className="p-4 border-t border-[var(--color-border)]">
                        <Pagination
                            currentPage={pagination.currentPage}
                            totalPages={pagination.totalPages}
                            totalItems={pagination.totalItems}
                            itemsPerPage={pagination.itemsPerPage}
                            onPageChange={handlePageChange}
                        />
                    </div>
                )}
            </div>

            {/* Order Detail Modal */}
            <Modal
                isOpen={Boolean(selectedOrder)}
                onClose={() => setSelectedOrder(null)}
                title={`Order #${selectedOrder?.orderNumber || ''}`}
                size="xl"
            >
                {selectedOrder && (
                    <OrderDetail
                        order={selectedOrder}
                        onStatusUpdated={handleStatusUpdated}
                        onClose={() => setSelectedOrder(null)}
                    />
                )}
            </Modal>
        </div>
    );
};

export default Orders;
