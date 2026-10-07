/**
 * Admin Dashboard
 * What needs doing today (each item links to a filtered list), store
 * performance, low stock and best sellers.
 */
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { adminAPI } from "../../api";
import { formatPrice, formatDate, getErrorMessage } from "../../utils/helpers";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Banknote,
  ShoppingCart,
  Users,
  Package,
  ArrowRight,
  Clock,
  Truck,
  AlertTriangle,
  PackageX,
  Mail,
  MessageCircle,
  CheckCircle2,
  Plus,
  FolderTree,
  RefreshCw,
} from "lucide-react";
import { StatusBadge } from "../../components/admin";
import CampaignCard from "../../components/admin/CampaignCard";
import { useAppSelector } from "../../store/hooks";
import { ChartSkeleton, DashboardStatSkeleton, EmptyState, LoadingRegion, Skeleton } from "../../components/ui";
import { usePageTitle } from "../../hooks/usePageTitle";
import type { IDashboardStats, OrderStatus } from "../../types";

// Status colours (brand-aligned; readable on light and dark surfaces)
const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "#d97706",
  confirmed: "#2563eb",
  processing: "#8fae8b",
  shipped: "#c1847b",
  delivered: "#047857",
  cancelled: "#dc2626",
};

const REVENUE_COLOR = "var(--color-primary)";
const ORDERS_COLOR = "var(--color-accent-dark)";

interface ChartTooltipProps {
  active?: boolean;
  payload?: { value?: number }[];
  label?: string;
}

// Custom tooltip for the revenue chart
const ChartTooltip = ({ active, payload, label }: ChartTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-3 shadow-lg">
        <p className="font-medium mb-1">{label}</p>
        <p className="text-sm text-[var(--color-primary)]">
          Revenue: {formatPrice(payload[0].value)}
        </p>
        <p className="text-sm text-[var(--color-accent-strong)]">
          Orders: {payload[1]?.value || 0}
        </p>
      </div>
    );
  }
  return null;
};

const Dashboard = () => {
  usePageTitle("Dashboard");
  const unreadChats = useAppSelector((state) => state.chat.unreadCount);
  const [stats, setStats] = useState<IDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    adminAPI
      .getDashboard()
      .then((response) => {
        if (cancelled) return;
        setStats(response.data.data);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, "Could not load the dashboard"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  if (loading) {
    return (
      <LoadingRegion label="Loading dashboard" className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <DashboardStatSkeleton key={i} />
          ))}
        </div>
        <ChartSkeleton />
      </LoadingRegion>
    );
  }

  if (error || !stats) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Couldn't load the dashboard"
        description={error || "Please try again."}
        actionLabel="Try again"
        onAction={() => {
          setLoading(true);
          setReloadKey((k) => k + 1);
        }}
      />
    );
  }

  const attention = stats.needsAttention;
  const attentionItems: {
    label: string;
    count: number;
    hint: string;
    link: string;
    icon: typeof Clock;
    tone: "warning" | "info" | "error";
  }[] = [
    {
      label: "Pending orders",
      count: attention?.pendingOrders || 0,
      hint: "Confirm or cancel",
      link: "/admin/orders?status=pending",
      icon: Clock,
      tone: "warning",
    },
    {
      label: "Ready to ship",
      count: attention?.toShip || 0,
      hint: "Confirmed or processing",
      link: "/admin/orders?status=confirmed",
      icon: Truck,
      tone: "info",
    },
    {
      label: "Refunds owed",
      count: attention?.refundRequired || 0,
      hint: "Paid, then cancelled",
      link: "/admin/orders?refund=1",
      icon: AlertTriangle,
      tone: "error",
    },
    {
      label: "Low stock",
      count: attention?.lowStock || 0,
      hint: `${stats.lowStockThreshold ?? 5} or fewer left`,
      link: "/admin/products?stock=low",
      icon: PackageX,
      tone: "warning",
    },
    {
      label: "Unread chats",
      count: unreadChats,
      hint: "Customers and visitors",
      link: "/admin/chat",
      icon: MessageCircle,
      tone: "warning",
    },
    {
      label: "Contact forms",
      count: attention?.unreadMessages || 0,
      hint: "Unread messages",
      link: "/admin/messages",
      icon: Mail,
      tone: "info",
    },
  ];
  const toneClasses = {
    warning: "bg-[var(--color-warning)]/10 text-[var(--color-warning)]",
    info: "bg-[var(--color-info)]/10 text-[var(--color-info)]",
    error: "bg-[var(--color-error)]/10 text-[var(--color-error)]",
  };
  const allClear = attentionItems.every((item) => item.count === 0);

  const recentOrders = stats.recentOrders || [];

  const chartData = (stats.salesByDay || []).map((day) => ({
    ...day,
    // "2026-10-05" -> "Mon"; parsed as local noon to avoid timezone day shifts
    date: new Date(`${day.date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short" }),
  }));

  const ordersByStatus = (Object.keys(STATUS_COLORS) as OrderStatus[])
    .map((status) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: stats.ordersByStatus?.[status] || 0,
      color: STATUS_COLORS[status],
    }))
    .filter((entry) => entry.value > 0);

  const statCards: {
    label: string;
    value: string | number;
    icon: typeof Banknote;
    color: string;
    bg: string;
    link?: string;
  }[] = [
    {
      label: "Revenue",
      value: formatPrice(stats.totalRevenue || 0),
      icon: Banknote,
      color: "text-[var(--color-success)]",
      bg: "bg-[var(--color-success)]/10",
    },
    {
      label: "Total Orders",
      value: stats.totalOrders || 0,
      icon: ShoppingCart,
      color: "text-[var(--color-info)]",
      bg: "bg-[var(--color-info)]/10",
      link: "/admin/orders",
    },
    {
      label: "Total Users",
      value: stats.totalUsers || 0,
      icon: Users,
      color: "text-[var(--color-primary)]",
      bg: "bg-[var(--color-primary-soft)]",
      link: "/admin/users",
    },
    {
      label: "Total Products",
      value: stats.totalProducts || 0,
      icon: Package,
      color: "text-[var(--color-accent-strong)]",
      bg: "bg-[var(--color-accent)]/15",
      link: "/admin/products",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-[var(--color-text-muted)]">
            Overview of your store performance
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            setReloadKey((k) => k + 1);
          }}
          className="btn btn-secondary text-sm"
        >
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
          Refresh
        </button>
      </div>

      {/* Needs attention */}
      <section aria-labelledby="attention-heading" className="space-y-3">
        <h2 id="attention-heading" className="font-semibold">
          Needs attention
        </h2>
        {allClear ? (
          <div className="card p-4 flex items-center gap-3 text-[var(--color-success)]">
            <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
            <span className="font-medium">All caught up — nothing waiting on you.</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {attentionItems.map((item) => (
              <Link
                key={item.label}
                to={item.link}
                className={`card p-4 flex items-start gap-3 transition-colors hover:border-[var(--color-primary)] ${
                  item.count === 0 ? "opacity-60" : ""
                }`}
              >
                <span className={`p-2 rounded-lg shrink-0 ${toneClasses[item.tone]}`}>
                  <item.icon className="w-5 h-5" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-2xl font-bold leading-tight">{item.count}</span>
                  <span className="block text-sm font-medium">{item.label}</span>
                  <span className="block text-xs text-[var(--color-text-muted)]">{item.hint}</span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {statCards.map((stat) => {
          const content = (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                </div>
                <div
                  className={`w-12 h-12 ${stat.bg} rounded-lg flex items-center justify-center`}
                >
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
          );
          return stat.link ? (
            <Link key={stat.label} to={stat.link} className="stat-card cursor-pointer">
              {content}
            </Link>
          ) : (
            <div key={stat.label} className="stat-card">
              {content}
            </div>
          );
        })}
      </div>

      {/* Festival/event campaign */}
      <CampaignCard />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h2 className="font-semibold">Revenue &amp; orders, last 7 days</h2>
            <div className="flex items-center gap-4 text-xs text-[var(--color-text-muted)]">
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-0.5 bg-[var(--color-primary)]" aria-hidden="true" />
                Revenue
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-4 border-t-2 border-dashed border-[var(--color-accent-dark)]" aria-hidden="true" />
                Orders
              </span>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-border)"
                />
                <XAxis
                  dataKey="date"
                  stroke="var(--color-text-muted)"
                  fontSize={12}
                />
                <YAxis
                  yAxisId="left"
                  stroke="var(--color-text-muted)"
                  fontSize={12}
                  tickFormatter={(value: number) => (value >= 1000 ? `${value / 1000}k` : String(value))}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="var(--color-text-muted)"
                  fontSize={12}
                  allowDecimals={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke={REVENUE_COLOR}
                  strokeWidth={2}
                  dot={{ fill: REVENUE_COLOR, strokeWidth: 2 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="orders"
                  name="Orders"
                  stroke={ORDERS_COLOR}
                  strokeWidth={2}
                  strokeDasharray="5 3"
                  dot={{ fill: ORDERS_COLOR, strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Orders by Status Pie Chart */}
        <div className="card p-4">
          <h2 className="font-semibold mb-4">Orders by status</h2>
          {ordersByStatus.length === 0 ? (
            <p className="h-56 flex items-center justify-center text-sm text-[var(--color-text-muted)]">No orders yet</p>
          ) : (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={ordersByStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {ordersByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          )}
          <ul className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2">
            {ordersByStatus.map((item) => (
              <li key={item.name}>
                <Link
                  to={`/admin/orders?status=${item.name.toLowerCase()}`}
                  className="flex items-center gap-2 text-sm hover:text-[var(--color-primary)]"
                >
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                    aria-hidden="true"
                  />
                  {item.name}: {item.value}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Low stock and best sellers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="card" aria-labelledby="low-stock-heading">
          <div className="p-4 border-b border-[var(--color-border)] flex justify-between items-center gap-2">
            <h2 id="low-stock-heading" className="font-semibold">
              Low stock
            </h2>
            {(stats.lowStockCount || 0) > 0 && (
              <Link
                to="/admin/products?stock=low"
                className="text-sm text-[var(--color-primary)] flex items-center gap-1"
              >
                View all {stats.lowStockCount}
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            )}
          </div>
          {(stats.lowStockProducts || []).length === 0 ? (
            <p className="p-6 text-sm text-[var(--color-text-muted)]">Everything is well stocked.</p>
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {stats.lowStockProducts.map((product) => (
                <li key={product._id}>
                  <Link
                    to={`/admin/products/${product._id}/edit`}
                    className="flex items-center gap-3 p-3 hover:bg-[var(--color-surface-muted)]"
                  >
                    {product.image ? (
                      <img src={product.image} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                    ) : (
                      <span className="w-10 h-10 rounded-lg bg-[var(--color-surface-muted)] shrink-0" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium truncate">{product.name}</span>
                      {product.lowVariants.length > 0 && (
                        <span className="block text-xs text-[var(--color-text-muted)] truncate">
                          {product.lowVariants
                            .slice(0, 4)
                            .map((v) => `${v.size}${v.color ? ` / ${v.color}` : ""}: ${v.stock}`)
                            .join(" · ")}
                        </span>
                      )}
                    </span>
                    <span
                      className={`text-sm font-semibold shrink-0 ${
                        product.stock <= 0 ? "text-[var(--color-error)]" : "text-[var(--color-warning)]"
                      }`}
                    >
                      {product.stock <= 0 ? "Sold out" : `${product.stock} left`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card" aria-labelledby="top-products-heading">
          <div className="p-4 border-b border-[var(--color-border)]">
            <h2 id="top-products-heading" className="font-semibold">
              Best sellers, last 30 days
            </h2>
          </div>
          {(stats.topProducts || []).length === 0 ? (
            <p className="p-6 text-sm text-[var(--color-text-muted)]">No confirmed sales in the last 30 days yet.</p>
          ) : (
            <ol className="divide-y divide-[var(--color-border)]">
              {stats.topProducts.map((product, index) => (
                <li key={product._id} className="flex items-center gap-3 p-3">
                  <span className="w-6 text-center text-sm font-semibold text-[var(--color-text-muted)]">
                    {index + 1}
                  </span>
                  {product.image ? (
                    <img src={product.image} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                  ) : (
                    <span className="w-10 h-10 rounded-lg bg-[var(--color-surface-muted)] shrink-0" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium truncate">{product.name}</span>
                    <span className="block text-xs text-[var(--color-text-muted)]">
                      {product.quantity} sold
                    </span>
                  </span>
                  <span className="text-sm font-semibold shrink-0">{formatPrice(product.revenue)}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      {/* Recent Orders */}
      <div className="card">
        <div className="p-4 border-b border-[var(--color-border)] flex justify-between items-center">
          <h2 className="font-semibold">Recent Orders</h2>
          <Link
            to="/admin/orders"
            className="text-sm text-[var(--color-primary)] flex items-center gap-1"
          >
            View All
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="text-left p-4 text-sm font-medium text-[var(--color-text-muted)]">
                  Order
                </th>
                <th className="text-left p-4 text-sm font-medium text-[var(--color-text-muted)]">
                  Customer
                </th>
                <th className="text-left p-4 text-sm font-medium text-[var(--color-text-muted)]">
                  Date
                </th>
                <th className="text-left p-4 text-sm font-medium text-[var(--color-text-muted)]">
                  Status
                </th>
                <th className="text-right p-4 text-sm font-medium text-[var(--color-text-muted)]">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.length > 0 ? (
                recentOrders.map((order) => (
                  <tr
                    key={order._id}
                    className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg)]"
                  >
                    <td className="p-4">
                      <Link
                        to={`/admin/orders?order=${order._id}`}
                        className="font-medium hover:text-[var(--color-primary)]"
                      >
                        #{order.orderNumber}
                      </Link>
                    </td>
                    <td className="p-4">{order.user?.name || "Guest"}</td>
                    <td className="p-4 text-sm text-[var(--color-text-muted)]">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="p-4">
                      <StatusBadge status={order.orderStatus} />
                    </td>
                    <td className="p-4 text-right font-medium">
                      {formatPrice(order.total ?? 0)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="p-8 text-center text-[var(--color-text-muted)]"
                  >
                    No recent orders
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Add new product", link: "/admin/products/new", icon: Plus },
          {
            label: "View all orders",
            link: "/admin/orders",
            icon: ShoppingCart,
          },
          {
            label: "Manage categories",
            link: "/admin/categories",
            icon: FolderTree,
          },
          { label: "View customers", link: "/admin/users", icon: Users },
        ].map((item) => (
          <Link
            key={item.label}
            to={item.link}
            className="card p-4 flex items-center gap-3 hover:border-[var(--color-primary)] transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center">
              <item.icon className="w-5 h-5 text-[var(--color-primary)]" />
            </div>
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
