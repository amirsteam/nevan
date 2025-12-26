/**
 * Admin Dashboard
 * Overview with stats, charts, and recent orders
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import { formatPrice, formatDate } from '../../utils/helpers';
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
} from 'recharts';
import {
    DollarSign,
    ShoppingCart,
    Users,
    Package,
    TrendingUp,
    ArrowRight,
    Loader2,
    AlertTriangle,
    Eye,
} from 'lucide-react';
import { StatusBadge } from '../../components/admin';

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [recentOrders, setRecentOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    // Mock chart data (in production, this would come from the API)
    const [chartData, setChartData] = useState([]);
    const [ordersByStatus, setOrdersByStatus] = useState([]);

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const response = await api.get('/admin/dashboard');
                setStats(response.data.data);
                setRecentOrders(response.data.data.recentOrders || []);

                // Generate mock chart data for demo
                // In production, you'd fetch this from the API
                const mockChartData = generateMockChartData();
                setChartData(mockChartData);

                // Mock order status distribution
                setOrdersByStatus([
                    { name: 'Pending', value: response.data.data.pendingOrders || 0, color: '#F59E0B' },
                    { name: 'Confirmed', value: 5, color: '#3B82F6' },
                    { name: 'Shipped', value: 3, color: '#8B5CF6' },
                    { name: 'Delivered', value: 12, color: '#10B981' },
                ]);
            } catch (error) {
                console.error('Failed to fetch dashboard:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboard();
    }, []);

    // Generate mock revenue data for last 7 days
    const generateMockChartData = () => {
        const data = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            data.push({
                date: date.toLocaleDateString('en-US', { weekday: 'short' }),
                revenue: Math.floor(Math.random() * 50000) + 10000,
                orders: Math.floor(Math.random() * 10) + 1,
            });
        }
        return data;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
            </div>
        );
    }

    const statCards = [
        {
            label: 'Total Revenue',
            value: formatPrice(stats?.totalRevenue || 0),
            icon: DollarSign,
            color: 'text-green-500',
            bg: 'bg-green-50 dark:bg-green-900/20',
            trend: '+12%',
        },
        {
            label: 'Total Orders',
            value: stats?.totalOrders || 0,
            icon: ShoppingCart,
            color: 'text-blue-500',
            bg: 'bg-blue-50 dark:bg-blue-900/20',
            link: '/admin/orders',
        },
        {
            label: 'Total Users',
            value: stats?.totalUsers || 0,
            icon: Users,
            color: 'text-purple-500',
            bg: 'bg-purple-50 dark:bg-purple-900/20',
            link: '/admin/users',
        },
        {
            label: 'Total Products',
            value: stats?.totalProducts || 0,
            icon: Package,
            color: 'text-orange-500',
            bg: 'bg-orange-50 dark:bg-orange-900/20',
            link: '/admin/products',
        },
    ];

    // Custom tooltip for chart
    const CustomTooltip = ({ active, payload, label }) => {
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
                    const CardWrapper = stat.link ? Link : 'div';
                    return (
                        <CardWrapper
                            key={stat.label}
                            to={stat.link}
                            className={`stat-card ${stat.link ? 'cursor-pointer' : ''}`}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-[var(--color-text-muted)]">{stat.label}</p>
                                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                                    {stat.trend && (
                                        <p className="text-sm text-green-500 mt-1">{stat.trend} from last month</p>
                                    )}
                                </div>
                                <div className={`w-12 h-12 ${stat.bg} rounded-lg flex items-center justify-center`}>
                                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                                </div>
                            </div>
                        </CardWrapper>
                    );
                })}
            </div>

            {/* Pending Orders Alert */}
            {stats?.pendingOrders > 0 && (
                <div className="card p-4 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-900/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-yellow-600" />
                        <span className="font-medium text-yellow-800 dark:text-yellow-200">
                            {stats.pendingOrders} pending order{stats.pendingOrders > 1 ? 's' : ''} need attention
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
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                                <XAxis
                                    dataKey="date"
                                    stroke="var(--color-text-muted)"
                                    fontSize={12}
                                />
                                <YAxis
                                    yAxisId="left"
                                    stroke="var(--color-text-muted)"
                                    fontSize={12}
                                    tickFormatter={(value) => `${value / 1000}k`}
                                />
                                <YAxis
                                    yAxisId="right"
                                    orientation="right"
                                    stroke="var(--color-text-muted)"
                                    fontSize={12}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Line
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#10B981"
                                    strokeWidth={2}
                                    dot={{ fill: '#10B981', strokeWidth: 2 }}
                                />
                                <Line
                                    yAxisId="right"
                                    type="monotone"
                                    dataKey="orders"
                                    stroke="#3B82F6"
                                    strokeWidth={2}
                                    dot={{ fill: '#3B82F6', strokeWidth: 2 }}
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
                                <span>{item.name}: {item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Recent Orders */}
            <div className="card">
                <div className="p-4 border-b border-[var(--color-border)] flex justify-between items-center">
                    <h2 className="font-semibold">Recent Orders</h2>
                    <Link to="/admin/orders" className="text-sm text-[var(--color-primary)] flex items-center gap-1">
                        View All
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-[var(--color-border)]">
                                <th className="text-left p-4 text-sm font-medium text-[var(--color-text-muted)]">Order</th>
                                <th className="text-left p-4 text-sm font-medium text-[var(--color-text-muted)]">Customer</th>
                                <th className="text-left p-4 text-sm font-medium text-[var(--color-text-muted)]">Date</th>
                                <th className="text-left p-4 text-sm font-medium text-[var(--color-text-muted)]">Status</th>
                                <th className="text-right p-4 text-sm font-medium text-[var(--color-text-muted)]">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentOrders.length > 0 ? (
                                recentOrders.map((order) => (
                                    <tr key={order._id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg)]">
                                        <td className="p-4">
                                            <Link to={`/admin/orders`} className="font-medium hover:text-[var(--color-primary)]">
                                                #{order.orderNumber}
                                            </Link>
                                        </td>
                                        <td className="p-4">{order.user?.name || 'Guest'}</td>
                                        <td className="p-4 text-sm text-[var(--color-text-muted)]">
                                            {formatDate(order.createdAt)}
                                        </td>
                                        <td className="p-4">
                                            <StatusBadge status={order.status} />
                                        </td>
                                        <td className="p-4 text-right font-medium">
                                            {formatPrice(order.pricing?.total || 0)}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-[var(--color-text-muted)]">
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
                    { label: 'Add New Product', link: '/admin/products', icon: Package },
                    { label: 'View All Orders', link: '/admin/orders', icon: ShoppingCart },
                    { label: 'Manage Categories', link: '/admin/categories', icon: TrendingUp },
                    { label: 'View Customers', link: '/admin/users', icon: Users },
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
