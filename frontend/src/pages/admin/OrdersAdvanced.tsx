/**
 * Orders Management Page with TanStack Table
 * Advanced features: Sorting, Filtering, Column Visibility, Export
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { adminAPI } from "../../api";
import { formatPrice, formatDate } from "../../utils/helpers";
import { AdvancedDataTable } from "../../components/admin/AdvancedDataTable";
import { StatusBadge, Modal } from "../../components/admin";
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
} from "lucide-react";
import toast from "react-hot-toast";
import type { IOrder, IUser, OrderStatus, PaymentStatus } from "../../types";

// Status configuration
const statusConfig: Record<
  OrderStatus,
  {
    variant: string;
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
  { variant: string; label: string }
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

const columnHelper = createColumnHelper<IOrder>();

const AdminOrdersPage = () => {
  // State
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    currentPage: 0,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20,
  });

  // Modal
  const [selectedOrder, setSelectedOrder] = useState<IOrder | null>(null);

  // Quick Stats
  const [stats, setStats] = useState({
    pending: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
  });

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.currentPage + 1,
        limit: pagination.itemsPerPage,
      };

      const response = await adminAPI.getOrders(params);
      const ordersData = response.data.data.orders;
      setOrders(ordersData);

      // Access pagination from data wrapper
      const paginationData = response.data.data.pagination;
      setPagination((prev) => ({
        ...prev,
        totalPages: paginationData?.pages || 1,
        totalItems: paginationData?.total || ordersData.length,
      }));

      // Use stats from backend response (accurate counts across all orders)
      const backendStats = (response.data as any).stats;
      if (backendStats) {
        setStats({
          pending: backendStats.pending || 0,
          processing: backendStats.processing || 0,
          shipped: backendStats.shipped || 0,
          delivered: backendStats.delivered || 0,
        });
      }
    } catch (error) {
      console.error("Failed to fetch orders:", error);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [pagination.currentPage, pagination.itemsPerPage]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // View order detail
  const handleViewOrder = async (order: IOrder) => {
    try {
      const response = await adminAPI.getOrderById(order._id);
      setSelectedOrder(response.data.data.order);
    } catch (error) {
      toast.error("Failed to load order details");
    }
  };

  // Status update callback
  const handleStatusUpdated = () => {
    fetchOrders();
    if (selectedOrder) {
      handleViewOrder(selectedOrder);
    }
  };

  // Handle page change
  const handlePageChange = (pageIndex: number) => {
    setPagination((prev) => ({ ...prev, currentPage: pageIndex }));
  };

  // Handle page size change
  const handlePageSizeChange = (pageSize: number) => {
    setPagination((prev) => ({
      ...prev,
      itemsPerPage: pageSize,
      currentPage: 0,
    }));
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
            <div className="flex items-center gap-2">
              <Icon className="w-4 h-4" />
              <StatusBadge
                status={status}
                variant={config?.variant || "default"}
              />
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
    >
      <Eye className="w-4 h-4" />
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Orders Management</h1>
          <p className="text-(--color-text-muted)">
            View and manage all customer orders
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <QuickStatCard
          label="Pending"
          count={stats.pending}
          icon={Clock}
          color="warning"
        />
        <QuickStatCard
          label="Processing"
          count={stats.processing}
          icon={RotateCcw}
          color="info"
        />
        <QuickStatCard
          label="Shipped"
          count={stats.shipped}
          icon={Truck}
          color="info"
        />
        <QuickStatCard
          label="Delivered"
          count={stats.delivered}
          icon={CheckCircle}
          color="success"
        />
      </div>

      {/* Orders Table */}
      <div className="card p-4">
        <AdvancedDataTable
          columns={columns}
          data={orders}
          loading={loading}
          emptyMessage="No orders found. Orders will appear here once customers start placing them."
          // Server-side pagination
          serverPagination={{
            pageIndex: pagination.currentPage,
            pageSize: pagination.itemsPerPage,
            totalItems: pagination.totalItems,
            onPageChange: handlePageChange,
            onPageSizeChange: handlePageSizeChange,
          }}
          // Features
          enableSorting={true}
          enableFiltering={true}
          enableGlobalFilter={true}
          enableColumnVisibility={true}
          enableRowSelection={true}
          enableExport={true}
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
        isOpen={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        title={`Order #${selectedOrder?.orderNumber || ""}`}
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

// Quick Stat Card Component
interface QuickStatCardProps {
  label: string;
  count: number;
  icon: React.ComponentType<{ className?: string }>;
  color: "warning" | "info" | "success" | "error";
}

const QuickStatCard = ({
  label,
  count,
  icon: Icon,
  color,
}: QuickStatCardProps) => {
  const colorClasses = {
    warning:
      "bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400",
    info: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
    success:
      "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400",
    error: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400",
  };

  return (
    <div className="card p-4 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold">{count}</p>
        <p className="text-sm text-(--color-text-muted)">{label}</p>
      </div>
    </div>
  );
};

export default AdminOrdersPage;
