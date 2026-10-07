/**
 * Admin Layout
 * Responsive sidebar navigation with mobile hamburger menu
 */
import { useState, useEffect, useCallback } from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminAPI } from '../../api';
import { useAppSelector } from '../../store/hooks';
import type { IAdminBadges } from '../../types';
import {
    LayoutDashboard,
    Package,
    FolderTree,
    ShoppingCart,
    Users,
    Mail,
    Megaphone,
    MessageCircle,
    LogOut,
    ChevronLeft,
    Menu,
    X,
} from 'lucide-react';

type BadgeKey = 'orders' | 'messages' | 'chat';

const navItems: { to: string; icon: typeof Package; label: string; end?: boolean; badge?: BadgeKey }[] = [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/admin/orders', icon: ShoppingCart, label: 'Orders', badge: 'orders' },
    { to: '/admin/chat', icon: MessageCircle, label: 'Live chat', badge: 'chat' },
    { to: '/admin/products', icon: Package, label: 'Products' },
    { to: '/admin/categories', icon: FolderTree, label: 'Categories' },
    { to: '/admin/users', icon: Users, label: 'Users' },
    { to: '/admin/campaigns', icon: Megaphone, label: 'Campaigns' },
    { to: '/admin/messages', icon: Mail, label: 'Contact forms', badge: 'messages' },
];

const BADGE_POLL_MS = 60_000;

// Sidebar content (shared between mobile and desktop)
const SidebarContent = ({
    userName,
    onLogout,
    badges,
}: {
    userName?: string;
    onLogout: () => void;
    badges: Record<BadgeKey, { count: number; label: string }>;
}) => (
    <>
        {/* Header */}
        <div className="p-4 border-b border-[var(--color-border)]">
            <Link
                to="/"
                className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
            >
                <ChevronLeft className="w-4 h-4" />
                Back to Store
            </Link>
            <h1 className="text-xl font-bold text-[var(--color-primary)] mt-2">Admin Panel</h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => (
                <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive
                            ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)]'
                            : 'hover:bg-[var(--color-bg)]'
                        }`
                    }
                >
                    <item.icon className="w-5 h-5" aria-hidden="true" />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && badges[item.badge].count > 0 && (
                        <span
                            className="min-w-6 h-6 px-1.5 rounded-full bg-[var(--color-error)] text-white text-xs font-semibold flex items-center justify-center"
                            title={badges[item.badge].label}
                        >
                            {badges[item.badge].count > 99 ? '99+' : badges[item.badge].count}
                            <span className="sr-only"> {badges[item.badge].label}</span>
                        </span>
                    )}
                </NavLink>
            ))}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-[var(--color-border)]">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[var(--color-primary)] rounded-full flex items-center justify-center text-[var(--color-on-primary)] font-medium">
                    {userName?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{userName}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">Admin</p>
                </div>
            </div>
            <button
                onClick={onLogout}
                className="flex items-center gap-2 px-3 py-2 w-full text-left rounded-lg hover:bg-[var(--color-bg)] text-[var(--color-error)]"
            >
                <LogOut className="w-4 h-4" />
                Logout
            </button>
        </div>
    </>
);

const AdminLayout = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [counts, setCounts] = useState<IAdminBadges | null>(null);

    // Badge counts: on load, every minute, on navigation, and when a page
    // changes something (dispatches "admin-badges-refresh")
    const refreshBadges = useCallback(() => {
        adminAPI
            .getBadges()
            .then((res) => setCounts(res.data.data))
            .catch(() => {
                /* badges are best-effort */
            });
    }, []);

    useEffect(() => {
        refreshBadges();
        const timer = window.setInterval(refreshBadges, BADGE_POLL_MS);
        window.addEventListener('admin-badges-refresh', refreshBadges);
        return () => {
            window.clearInterval(timer);
            window.removeEventListener('admin-badges-refresh', refreshBadges);
        };
    }, [refreshBadges]);

    useEffect(() => {
        refreshBadges();
    }, [location.pathname, refreshBadges]);

    const ordersNeedingAction = (counts?.pendingOrders || 0) + (counts?.refundRequired || 0);
    // Live from the chat connection (updates the moment a customer writes)
    const unreadChats = useAppSelector((state) => state.chat.unreadCount);
    const badges: Record<BadgeKey, { count: number; label: string }> = {
        chat: {
            count: unreadChats,
            label: `${unreadChats} unread chat message${unreadChats === 1 ? '' : 's'}`,
        },
        orders: {
            count: ordersNeedingAction,
            label: [
                counts?.pendingOrders ? `${counts.pendingOrders} pending` : '',
                counts?.refundRequired ? `${counts.refundRequired} refund${counts.refundRequired > 1 ? 's' : ''} owed` : '',
            ]
                .filter(Boolean)
                .join(', '),
        },
        messages: {
            count: counts?.unreadMessages || 0,
            label: `${counts?.unreadMessages || 0} unread`,
        },
    };

    // Close sidebar on route change (mobile) — adjusting state during render
    // avoids an extra effect-triggered render
    const [lastPath, setLastPath] = useState(location.pathname);
    if (lastPath !== location.pathname) {
        setLastPath(location.pathname);
        setSidebarOpen(false);
    }

    // Close sidebar on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setSidebarOpen(false);
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, []);

    // Prevent body scroll when sidebar is open on mobile
    useEffect(() => {
        if (sidebarOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [sidebarOpen]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };



    return (
        <div className="min-h-screen bg-[var(--color-bg)]">
            {/* Mobile Header */}
            <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-[var(--color-surface)] border-b border-[var(--color-border)] px-4 py-3">
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="relative p-2 -ml-2 rounded-lg hover:bg-[var(--color-bg)]"
                        aria-label={
                            ordersNeedingAction + (counts?.unreadMessages || 0) > 0
                                ? 'Open menu (items need attention)'
                                : 'Open menu'
                        }
                    >
                        <Menu className="w-6 h-6" />
                        {ordersNeedingAction + (counts?.unreadMessages || 0) > 0 && (
                            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-[var(--color-error)]" aria-hidden="true" />
                        )}
                    </button>
                    <h1 className="text-lg font-bold text-[var(--color-primary)]">Admin Panel</h1>
                    <div className="w-10" /> {/* Spacer for centering */}
                </div>
            </header>

            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="lg:hidden fixed inset-0 z-50 bg-black/50 animate-fadeIn"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Mobile Sidebar */}
            <aside
                className={`
                    lg:hidden fixed top-0 left-0 z-50 w-72 h-full
                    bg-[var(--color-surface)] border-r border-[var(--color-border)]
                    transform transition-transform duration-300 ease-in-out
                    ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                    flex flex-col
                `}
            >
                {/* Close button */}
                <button
                    onClick={() => setSidebarOpen(false)}
                    className="absolute top-4 right-4 p-2 rounded-lg hover:bg-[var(--color-bg)]"
                    aria-label="Close menu"
                >
                    <X className="w-5 h-5" />
                </button>
                <SidebarContent userName={user?.name} onLogout={handleLogout} badges={badges} />
            </aside>

            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex w-64 bg-[var(--color-surface)] border-r border-[var(--color-border)] fixed h-full flex-col">
                <SidebarContent userName={user?.name} onLogout={handleLogout} badges={badges} />
            </aside>

            {/* Main Content */}
            <main className="lg:ml-64 min-h-screen">
                {/* Mobile top padding for fixed header */}
                <div className="lg:hidden h-14" />

                <div className="p-4 lg:p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
