/**
 * Orders Management Page with TanStack Table
 * Filters live in the URL (shareable; the dashboard links to e.g.
 * ?status=pending or ?refund=1), search runs on the server across all
 * orders, and selected orders can be moved to the next status in bulk.
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { adminAPI } from "../../api";
import { formatPrice, formatDate, getErrorMessage } from "../../utils/helpers";
import { AdvancedDataTable } from "../../components/admin/AdvancedDataTable";
import { StatusBadge, Modal, SearchInput } from "../../components/admin";
import type { BadgeVariant } from "../../components/admin/StatusBadge";
import { ConfirmModal } from "../../components/ui";
import { usePageTitle } from "../../hooks/usePageTitle";
import OrderDetail from "./OrderDetail";
import {
  Eye,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  RotateCcw,
  AlertCircle,
  AlertTriangle,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import type { IOrder, IUser, OrderStatus, PaymentStatus, PaymentMethod } from "../../types";

// Status configuration
const statusConfig: Record<
  OrderStatus,
  {
    variant: BadgeVariant;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
  }
> = {
  pending: { variant: "warning", icon: Clock, label: "Pending" },
  confirmed: { variant: "info", icon: CheckCircle, label: "Confirmed" },
  processing: { variant: "info", icon: RotateCcw, label: "Processing" },
  shipped: { variant: "info", icon: Truck, label: "Shipped" },
  delivered: { variant: "success", icon: CheckCircle, label: "Delivered" },
  cancelled: { variant: "error", icon: XCircle, label: "Cancelled" },
};

const paymentStatusConfig: Record<
  PaymentStatus,
  { variant: BadgeVariant; label: string }
> = {
  pending: { variant: "warning", label: "Pending" },
  paid: { variant: "success", label: "Paid" },
  failed: { variant: "error", label: "Failed" },
  refunded: { variant: "info", label: "Refunded" },
};

// Helper to extract user info
const getUserInfo = (
  user: string | IUser | undefined,
): { name: string; email: string } => {
  if (!user) return { name: "Guest", email: "" };
  if (typeof user === "string") return { name: "User", email: "" };
  return { name: user.name || "Guest", email: user.email || "" };
};

const ORDER_STATUSES = Object.keys(statusConfig) as OrderStatus[];
const PAYMENT_STATUSES = Object.keys(paymentStatusConfig) as PaymentStatus[];
const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cod", label: "Cash on delivery" },
  { value: "esewa", label: "eSewa" },
];

// Mirrors ORDER_TRANSITIONS in backend/models/Order.ts; cancelling stays a
// per-order action (it returns stock and may need a refund)
const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: "confirmed",
  confirmed: "processing",
  processing: "shipped",
  shipped: "delivered",
};
const BULK_TARGETS: OrderStatus[] = ["confirmed", "processing", "shipped", "delivered"];

const statusOf = (order: IOrder): OrderStatus | undefined => order.orderStatus || order.status;
const paymentStatusOf = (order: IOrder): PaymentStatus | undefined =>
  order.paymentStatus || order.payment?.status;
/** Cancelled after an online payment went through: the customer is owed a refund */
const isRefundOwed = (order: IOrder): boolean =>
  statusOf(order) === "cancelled" && paymentStatusOf(order) === "paid";

const columnHelper = createColumnHelper<IOrder>();

const AdminOrdersPage = () => {
  usePageTitle("Orders");

  // State
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  // Filters and paging from the URL
  const [searchParams, setSearchParams] = useSearchParams();
  const statusParam = searchParams.get("status") || "";
  const statusFilter = (ORDER_STATUSES as string[]).includes(statusParam) ? (statusParam as OrderStatus) : "";
  const paymentParam = searchParams.get("payment") || "";
  const paymentFilter = (PAYMENT_STATUSES as string[]).includes(paymentParam) ? (paymentParam as PaymentStatus) : "";
  const methodParam = searchParams.get("method") || "";
  const methodFilter = PAYMENT_METHODS.some((m) => m.value === methodParam) ? methodParam : "";
  const refundOnly = searchParams.get("refund") === "1";
  const search = searchParams.get("search") || "";
  const pageIndex = Math.max(0, (Number(searchParams.get("page")) || 1) - 1);
  const pageSize = [10, 20, 50, 100].includes(Number(searchParams.get("limit"))) ? Number(searchParams.get("limit")) : 20;
  const openOrderId = searchParams.get("order");
  const hasFilters = Boolean(statusFilter || paymentFilter || methodFilter || refundOnly || search);

  const updateParams = useCallback(
    (changes: Record<string, string | null>, { keepPage = false } = {}) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(changes)) {
            if (value) next.set(key, value);
            else next.delete(key);
          }
          if (!keepPage) next.delete("page");
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  // Order detail modal (?order=<id>, so it can be linked from the dashboard)
  const [selectedOrder, setSelectedOrder] = useState<IOrder | null>(null);

  // Status counts across all orders
  const [stats, setStats] = useState<Partial<Record<OrderStatus, number>>>({});

  // Bulk status update
  const [bulk, setBulk] = useState<{ orders: IOrder[]; status: OrderStatus; clear: () => void } | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    adminAPI
      .getOrders({
        page: pageIndex + 1,
        limit: pageSize,
        status: statusFilter || undefined,
        paymentStatus: paymentFilter || undefined,
        paymentMethod: methodFilter || undefined,
        refundRequired: refundOnly || undefined,
        search: search || undefined,
      })
      .then((response) => {
        if (cancelled) return;
        const ordersData = response.data.data.orders;
        setOrders(ordersData);
        // The API returns pagination and stats next to `data`, not inside it
        setTotalItems(response.data.pagination?.totalItems ?? ordersData.length);
        const backendStats = (response.data as { stats?: Partial<Record<OrderStatus, number>> }).stats;
        if (backendStats) setStats(backendStats);
      })
      .catch((error) => {
        if (!cancelled) toast.error(getErrorMessage(error, "Failed to load orders"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pageIndex, pageSize, statusFilter, paymentFilter, methodFilter, refundOnly, search, reloadKey]);

  const refetch = () => {
    setReloadKey((k) => k + 1);
    window.dispatchEvent(new Event("admin-badges-refresh"));
  };

  // Load the full order for the modal whenever ?order= changes
  useEffect(() => {
    if (!openOrderId) return;
    let cancelled = false;
    adminAPI
      .getOrderById(openOrderId)
      .then((response) => {
        if (!cancelled) setSelectedOrder(response.data.data.order);
      })
      .catch(() => {
        if (cancelled) return;
        toast.error("Failed to load order details");
        updateParams({ order: null }, { keepPage: true });
      });
    return () => {
      cancelled = true;
    };
  }, [openOrderId, reloadKey, updateParams]);

  const handleViewOrder = (order: IOrder) => updateParams({ order: order._id }, { keepPage: true });
  const closeOrder = () => {
    setSelectedOrder(null);
    updateParams({ order: null }, { keepPage: true });
  };

  // Status update callback (from the detail modal)
  const handleStatusUpdated = () => refetch();

  const handlePageChange = (index: number) => updateParams({ page: index > 0 ? String(index + 1) : null }, { keepPage: true });
  const handlePageSizeChange = (size: number) => updateParams({ limit: size === 20 ? null : String(size) });

  const runBulkUpdate = async () => {
    if (!bulk) return;
    const eligible = bulk.orders.filter((o) => NEXT_STATUS[statusOf(o) as OrderStatus] === bulk.status);
    setBulkSaving(true);
    try {
      const response = await adminAPI.bulkUpdateOrderStatus(
        eligible.map((o) => o._id),
        bulk.status,
        "Bulk update",
      );
      const { updated, failed } = response.data.data;
      if (updated.length) {
        toast.success(`${updated.length} order${updated.length > 1 ? "s" : ""} marked ${statusConfig[bulk.status].label.toLowerCase()}`);
      }
      if (failed.length) {
        toast.error(
          `${failed.length} not updated: ${failed.map((f) => `#${f.orderNumber || f._id} (${f.message})`).join(", ")}`,
          { duration: 8000 },
        );
      }
      bulk.clear();
      setBulk(null);
      refetch();
    } catch (error) {
      toast.error(getErrorMessage(error, "Bulk update failed"));
    } finally {
      setBulkSaving(false);
    }
  };

  // Custom export handler
  const handleExport = (data: IOrder[], format: "csv" | "json") => {
    if (format === "csv") {
      const headers = [
        "Order #",
        "Customer",
        "Email",
        "Phone",
        "Products",
        "Quantities",
        "Item Count",
        "Subtotal",
        "Shipping",
        "Total",
        "Payment Method",
        "Payment Status",
        "Order Status",
        "Shipping Address",
        "City",
        "Date",
      ];
      const rows = data.map((order) => {
        const userInfo = getUserInfo(order.user);
        // Get product names and quantities
        const productNames =
          order.items?.map((item) => item.name).join("; ") || "";
        const quantities =
          order.items
            ?.map((item) => `${item.name}: ${item.quantity}`)
            .join("; ") || "";
        const address = order.shippingAddress;
        const fullAddress = address
          ? `${address.street || ""}, ${address.city || ""}`
          : "";

        return [
          order.orderNumber,
          userInfo.name,
          userInfo.email,
          address?.phone || "",
          productNames,
          quantities,
          order.items?.length || 0,
          order.subtotal ?? order.pricing?.subtotal ?? 0,
          order.shippingCost ?? order.pricing?.shippingCost ?? 0,
          order.total ?? order.pricing?.total ?? 0,
          order.paymentMethod?.toUpperCase() ||
            order.payment?.method?.toUpperCase() ||
            "",
          order.paymentStatus || order.payment?.status || "",
          order.orderStatus || order.status || "",
          fullAddress,
          address?.city || "",
          new Date(order.createdAt).toLocaleDateString(),
        ];
      });

      const csvContent = [
        headers.join(","),
        ...rows.map((row) =>
          row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","),
        ),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `orders-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Orders exported successfully!");
    } else {
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `orders-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Orders exported successfully!");
    }
  };

  // Define columns using IOrder fields
  const columns = useMemo<ColumnDef<IOrder, unknown>[]>(
    () => [
      columnHelper.accessor("orderNumber", {
        header: "Order #",
        cell: (info) => (
          <span className="font-mono font-medium text-(--color-primary)">
            #{info.getValue()}
          </span>
        ),
        enableColumnFilter: true,
        size: 120,
      }),
      columnHelper.accessor("user", {
        header: "Customer",
        cell: (info) => {
          const user = info.getValue();
          const userInfo = getUserInfo(user);
          return (
            <div>
              <p className="font-medium">{userInfo.name}</p>
              <p className="text-sm text-(--color-text-muted)">
                {userInfo.email}
              </p>
            </div>
          );
        },
        filterFn: (row, _columnId, filterValue) => {
          const user = row.original.user;
          const userInfo = getUserInfo(user);
          const searchValue = String(filterValue).toLowerCase();
          return (
            userInfo.name.toLowerCase().includes(searchValue) ||
            userInfo.email.toLowerCase().includes(searchValue)
          );
        },
        size: 200,
      }),
      columnHelper.accessor("items", {
        header: "Items",
        cell: (info) => {
          const items = info.getValue();
          return (
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-(--color-text-muted)" />
              <span>{items?.length || 0} item(s)</span>
            </div>
          );
        },
        enableSorting: false,
        enableColumnFilter: false,
        size: 100,
      }),
      columnHelper.accessor((row) => row.total ?? row.pricing?.total ?? 0, {
        id: "total",
        header: "Total",
        cell: (info) => (
          <span className="font-semibold">
            {formatPrice(info.getValue() || 0)}
          </span>
        ),
        enableColumnFilter: false,
        size: 120,
      }),
      columnHelper.accessor("paymentMethod", {
        header: "Payment",
        cell: (info) => {
          const method = info.getValue();
          const paymentStatus = info.row.original.paymentStatus;
          const config = paymentStatusConfig[paymentStatus || "pending"];
          return (
            <div className="space-y-1">
              <span className="text-xs font-medium uppercase tracking-wider text-(--color-text-muted)">
                {method || "N/A"}
              </span>
              <StatusBadge
                status={paymentStatus || "pending"}
                variant={config.variant}
                size="sm"
              />
            </div>
          );
        },
        filterFn: (row, _columnId, filterValue) => {
          const searchValue = String(filterValue).toLowerCase();
          return (
            row.original.paymentMethod?.toLowerCase().includes(searchValue) ||
            row.original.paymentStatus?.toLowerCase().includes(searchValue) ||
            false
          );
        },
        size: 130,
      }),
      columnHelper.accessor("orderStatus", {
        header: "Status",
        cell: (info) => {
          const status = info.getValue();
          const config = statusConfig[status];
          const Icon = config?.icon || AlertCircle;
          return (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4" aria-hidden="true" />
                <StatusBadge
                  status={status}
                  variant={config?.variant || "default"}
                />
              </div>
              {isRefundOwed(info.row.original) && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-(--color-error)">
                  <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                  Refund owed
                </span>
              )}
            </div>
          );
        },
        filterFn: "equals",
        size: 140,
      }),
      columnHelper.accessor("shippingAddress", {
        header: "Location",
        cell: (info) => {
          const address = info.getValue();
          return (
            <span className="text-sm text-(--color-text-muted)">
              {address?.city || "N/A"}, {address?.state || ""}
            </span>
          );
        },
        filterFn: (row, _columnId, filterValue) => {
          const address = row.original.shippingAddress;
          const searchValue = String(filterValue).toLowerCase();
          return (
            address?.city?.toLowerCase().includes(searchValue) ||
            address?.state?.toLowerCase().includes(searchValue) ||
            false
          );
        },
        size: 150,
      }),
      columnHelper.accessor("createdAt", {
        header: "Date",
        cell: (info) => (
          <div className="text-sm">
            <p>{formatDate(info.getValue())}</p>
            <p className="text-(--color-text-muted)">
              {new Date(info.getValue()).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        ),
        sortingFn: "datetime",
        enableColumnFilter: false,
        size: 130,
      }),
    ],
    [],
  );

  // Render row actions
  const renderRowActions = (order: IOrder) => (
    <button
      onClick={(e) => {
        e.stopPropagation();
        handleViewOrder(order);
      }}
      className="p-2 rounded-lg hover:bg-(--color-bg) text-(--color-text-muted) hover:text-(--color-primary) transition-colors"
      title="View Details"
      aria-label={`View order #${order.orderNumber}`}
    >
      <Eye className="w-4 h-4" />
    </button>
  );

  const renderSelectionActions = (selected: IOrder[], clear: () => void) =>
    BULK_TARGETS.map((target) => {
      const count = selected.filter((o) => NEXT_STATUS[statusOf(o) as OrderStatus] === target).length;
      if (count === 0) return null;
      return (
        <button
          key={target}
          type="button"
          onClick={() => setBulk({ orders: selected, status: target, clear })}
          className="btn btn-secondary text-sm py-1.5"
        >
          Mark {statusConfig[target].label.toLowerCase()} ({count})
        </button>
      );
    });

  const bulkEligible = bulk ? bulk.orders.filter((o) => NEXT_STATUS[statusOf(o) as OrderStatus] === bulk.status) : [];
  const bulkSkipped = bulk ? bulk.orders.length - bulkEligible.length : 0;

  const quickStats: { status: OrderStatus; icon: React.ComponentType<{ className?: string }>; color: QuickStatCardProps["color"] }[] = [
    { status: "pending", icon: Clock, color: "warning" },
    { status: "confirmed", icon: CheckCircle, color: "info" },
    { status: "processing", icon: RotateCcw, color: "info" },
    { status: "shipped", icon: Truck, color: "info" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-(--color-text-muted)">
            View and manage all customer orders
          </p>
        </div>
      </div>

      {/* Quick Stats (click to filter) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickStats.map((item) => (
          <QuickStatCard
            key={item.status}
            label={statusConfig[item.status].label}
            count={stats[item.status] || 0}
            icon={item.icon}
            color={item.color}
            active={statusFilter === item.status}
            onClick={() => updateParams({ status: statusFilter === item.status ? null : item.status, refund: null })}
          />
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-col lg:flex-row gap-3">
          <SearchInput
            value={search}
            onChange={(value) => updateParams({ search: value.trim() || null })}
            placeholder="Search order #, customer, phone…"
            className="flex-1"
          />
          <div className="flex flex-wrap gap-3">
            <select
              value={statusFilter}
              onChange={(e) => updateParams({ status: e.target.value || null, refund: null })}
              className="select w-auto"
              aria-label="Filter by order status"
            >
              <option value="">All statuses</option>
              {ORDER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {statusConfig[status].label}
                </option>
              ))}
            </select>
            <select
              value={paymentFilter}
              onChange={(e) => updateParams({ payment: e.target.value || null, refund: null })}
              className="select w-auto"
              aria-label="Filter by payment status"
            >
              <option value="">Any payment</option>
              {PAYMENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {paymentStatusConfig[status].label}
                </option>
              ))}
            </select>
            <select
              value={methodFilter}
              onChange={(e) => updateParams({ method: e.target.value || null })}
              className="select w-auto"
              aria-label="Filter by payment method"
            >
              <option value="">All methods</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              aria-pressed={refundOnly}
              onClick={() => updateParams({ refund: refundOnly ? null : "1", status: null, payment: null })}
              className={`btn text-sm ${refundOnly ? "btn-primary" : "btn-secondary"}`}
            >
              <AlertTriangle className="w-4 h-4" aria-hidden="true" />
              Refunds owed
            </button>
          </div>
        </div>
        {hasFilters && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-(--color-text-muted)">
              {loading ? "Searching…" : `${totalItems} matching order${totalItems === 1 ? "" : "s"}`}
            </span>
            <button
              type="button"
              onClick={() => setSearchParams({}, { replace: true })}
              className="inline-flex items-center gap-1 text-(--color-primary) hover:underline"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Orders Table */}
      <div className="card p-4">
        <AdvancedDataTable
          columns={columns}
          data={orders}
          loading={loading}
          emptyMessage={
            hasFilters
              ? "No orders match these filters."
              : "No orders found. Orders will appear here once customers start placing them."
          }
          // Server-side pagination
          serverPagination={{
            pageIndex,
            pageSize,
            totalItems,
            onPageChange: handlePageChange,
            onPageSizeChange: handlePageSizeChange,
          }}
          // Features (search runs on the server, above)
          enableSorting={true}
          enableFiltering={true}
          enableGlobalFilter={false}
          enableColumnVisibility={true}
          enableRowSelection={true}
          enableExport={true}
          getRowId={(order) => order._id}
          renderSelectionActions={renderSelectionActions}
          // Callbacks
          onRowClick={handleViewOrder}
          onExport={handleExport}
          // Styling
          striped={true}
          stickyHeader={true}
          renderRowActions={renderRowActions}
        />
      </div>

      {/* Order Detail Modal */}
      <Modal
        isOpen={Boolean(openOrderId && selectedOrder)}
        onClose={closeOrder}
        title={`Order #${selectedOrder?.orderNumber || ""}`}
        size="xl"
      >
        {selectedOrder && (
          <OrderDetail
            order={selectedOrder}
            onStatusUpdated={handleStatusUpdated}
            onClose={closeOrder}
          />
        )}
      </Modal>

      {/* Bulk status confirmation */}
      <ConfirmModal
        isOpen={Boolean(bulk)}
        onClose={() => setBulk(null)}
        onConfirm={runBulkUpdate}
        isLoading={bulkSaving}
        variant="info"
        title={bulk ? `Mark ${bulkEligible.length} order${bulkEligible.length === 1 ? "" : "s"} ${statusConfig[bulk.status].label.toLowerCase()}?` : ""}
        message={
          bulk ? (
            <div className="space-y-2">
              <p>
                {bulkEligible.map((o) => `#${o.orderNumber}`).join(", ")}
              </p>
              {bulkSkipped > 0 && (
                <p className="text-sm text-(--color-text-muted)">
                  {bulkSkipped} selected order{bulkSkipped === 1 ? " is" : "s are"} at a different step and will be left as is.
                </p>
              )}
              <p className="text-sm text-(--color-text-muted)">Customers get the usual status notification.</p>
            </div>
          ) : null
        }
        confirmText="Update orders"
      />
    </div>
  );
};

// Quick Stat Card Component (also a filter toggle)
interface QuickStatCardProps {
  label: string;
  count: number;
  icon: React.ComponentType<{ className?: string }>;
  color: "warning" | "info" | "success" | "error";
  active?: boolean;
  onClick?: () => void;
}

const QuickStatCard = ({
  label,
  count,
  icon: Icon,
  color,
  active = false,
  onClick,
}: QuickStatCardProps) => {
  const colorClasses = {
    warning: "bg-(--color-warning)/10 text-(--color-warning)",
    info: "bg-(--color-info)/10 text-(--color-info)",
    success: "bg-(--color-success)/10 text-(--color-success)",
    error: "bg-(--color-error)/10 text-(--color-error)",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`card p-4 flex items-center gap-4 text-left transition-colors hover:border-(--color-primary) ${
        active ? "border-(--color-primary) ring-1 ring-(--color-primary)" : ""
      }`}
    >
      <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold">{count}</p>
        <p className="text-sm text-(--color-text-muted)">{label}</p>
      </div>
    </button>
  );
};

export default AdminOrdersPage;
