/**
 * Admin Layout
 * Responsive sidebar navigation with mobile hamburger menu
 */
import { useState, useEffect } from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    LayoutDashboard,
    Package,
    FolderTree,
    ShoppingCart,
    Users,
    LogOut,
    ChevronLeft,
    Menu,
    X,
} from 'lucide-react';

const AdminLayout = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Close sidebar on route change (mobile)
    useEffect(() => {
        setSidebarOpen(false);
    }, [location.pathname]);

    // Close sidebar on escape key
    useEffect(() => {
        const handleEscape = (e) => {
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

    const navItems = [
        { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
        { to: '/admin/products', icon: Package, label: 'Products' },
        { to: '/admin/categories', icon: FolderTree, label: 'Categories' },
        { to: '/admin/orders', icon: ShoppingCart, label: 'Orders' },
        { to: '/admin/users', icon: Users, label: 'Users' },
    ];

    // Sidebar content (shared between mobile and desktop)
    const SidebarContent = () => (
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
                                ? 'bg-[var(--color-primary)] text-white'
                                : 'hover:bg-[var(--color-bg)]'
                            }`
                        }
                    >
                        <item.icon className="w-5 h-5" />
                        {item.label}
                    </NavLink>
                ))}
            </nav>

            {/* User section */}
            <div className="p-4 border-t border-[var(--color-border)]">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-[var(--color-primary)] rounded-full flex items-center justify-center text-white font-medium">
                        {user?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{user?.name}</p>
                        <p className="text-xs text-[var(--color-text-muted)]">Admin</p>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-3 py-2 w-full text-left rounded-lg hover:bg-[var(--color-bg)] text-[var(--color-error)]"
                >
                    <LogOut className="w-4 h-4" />
                    Logout
                </button>
            </div>
        </>
    );

    return (
        <div className="min-h-screen bg-[var(--color-bg)]">
            {/* Mobile Header */}
            <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-[var(--color-surface)] border-b border-[var(--color-border)] px-4 py-3">
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 -ml-2 rounded-lg hover:bg-[var(--color-bg)]"
                        aria-label="Open menu"
                    >
                        <Menu className="w-6 h-6" />
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
                <SidebarContent />
            </aside>

            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex w-64 bg-[var(--color-surface)] border-r border-[var(--color-border)] fixed h-full flex-col">
                <SidebarContent />
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
