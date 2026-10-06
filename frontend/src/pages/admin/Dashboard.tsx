/**
 * Admin Dashboard
 * Overview with stats, charts, and recent orders
 */
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api";
import { formatPrice, formatDate } from "../../utils/helpers";
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
  TrendingUp,
  ArrowRight,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { StatusBadge } from "../../components/admin";
import type { IUser, OrderStatus } from "../../types";

// GET /admin/dashboard response (routes/adminRoutes.ts + Order.getDashboardStats)
interface DashboardStats {
  totalOrders: number;
  todayOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  totalUsers: number;
  totalProducts: number;
  ordersByStatus: Partial<Record<OrderStatus, number>>;
  salesByDay: { date: string; revenue: number; orders: number }[];
  recentOrders: {
    _id: string;
    orderNumber: string;
    user?: Pick<IUser, "name" | "email"> | null;
    orderStatus: OrderStatus;
    total?: number;
    createdAt: string;
  }[];
}

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "#F59E0B",
  confirmed: "#3B82F6",
  processing: "#6366F1",
  shipped: "#8B5CF6",
  delivered: "#10B981",
  cancelled: "#EF4444",
};

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
        <p className="text-sm text-green-600">
          Revenue: {formatPrice(payload[0].value)}
        </p>
        <p className="text-sm text-blue-600">
          Orders: {payload[1]?.value || 0}
        </p>
      </div>
    );
  }
  return null;
};

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await api.get("/admin/dashboard");
        setStats(response.data.data);
      } catch (error) {
        console.error("Failed to fetch dashboard:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  const recentOrders = stats?.recentOrders || [];

  const chartData = (stats?.salesByDay || []).map((day) => ({
    ...day,
    // "2026-10-05" -> "Mon"; parsed as local noon to avoid timezone day shifts
    date: new Date(`${day.date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short" }),
  }));

  const ordersByStatus = (Object.keys(STATUS_COLORS) as OrderStatus[])
    .map((status) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: stats?.ordersByStatus?.[status] || 0,
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
      label: "Total Sales",
      value: formatPrice(stats?.totalRevenue || 0),
      icon: Banknote,
      color: "text-green-500",
      bg: "bg-green-50 dark:bg-green-900/20",
    },
    {
      label: "Total Orders",
      value: stats?.totalOrders || 0,
      icon: ShoppingCart,
      color: "text-blue-500",
      bg: "bg-blue-50 dark:bg-blue-900/20",
      link: "/admin/orders",
    },
    {
      label: "Total Users",
      value: stats?.totalUsers || 0,
      icon: Users,
      color: "text-purple-500",
      bg: "bg-purple-50 dark:bg-purple-900/20",
      link: "/admin/users",
    },
    {
      label: "Total Products",
      value: stats?.totalProducts || 0,
      icon: Package,
      color: "text-orange-500",
      bg: "bg-orange-50 dark:bg-orange-900/20",
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
        <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
          <TrendingUp className="w-4 h-4" />
          Last 7 days
        </div>
      </div>

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

      {/* Pending Orders Alert */}
      {!!stats?.pendingOrders && (
        <div className="card p-4 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-900/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <span className="font-medium text-yellow-800 dark:text-yellow-200">
              {stats.pendingOrders} pending order
              {stats.pendingOrders > 1 ? "s" : ""} need attention
            </span>
          </div>
          <Link
            to="/admin/orders?status=pending"
            className="text-yellow-700 dark:text-yellow-300 hover:underline text-sm flex items-center gap-1"
          >
            View Orders <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 card p-4">
          <h2 className="font-semibold mb-4">Revenue & Orders (Last 7 Days)</h2>
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
                  tickFormatter={(value: number) => `${value / 1000}k`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="var(--color-text-muted)"
                  fontSize={12}
                />
                <Tooltip content={<ChartTooltip />} />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={{ fill: "#10B981", strokeWidth: 2 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="orders"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={{ fill: "#3B82F6", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Orders by Status Pie Chart */}
        <div className="card p-4">
          <h2 className="font-semibold mb-4">Orders by Status</h2>
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
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {ordersByStatus.map((item) => (
              <div key={item.name} className="flex items-center gap-2 text-sm">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span>
                  {item.name}: {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
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
                        to={`/admin/orders`}
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
          { label: "Add New Product", link: "/admin/products", icon: Package },
          {
            label: "View All Orders",
            link: "/admin/orders",
            icon: ShoppingCart,
          },
          {
            label: "Manage Categories",
            link: "/admin/categories",
            icon: TrendingUp,
          },
          { label: "View Customers", link: "/admin/users", icon: Users },
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
