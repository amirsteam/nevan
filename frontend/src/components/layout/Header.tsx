/**
 * Header Component
 * Main navigation with cart and user menu
 */
import { useState, FormEvent, ChangeEvent } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useAuth } from "../../context/AuthContext";
import { selectCartCount } from "../../store/cartSlice";
import {
  ShoppingCart,
  Menu,
  X,
  Search,
  LogOut,
  Settings,
  Package,
  LayoutDashboard,
} from "lucide-react";
import logo from "../../assets/logo.png";
import type { RootState } from "../../store";

interface NavLink {
  to: string;
  label: string;
}

const Header = (): React.ReactElement => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [userMenuOpen, setUserMenuOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const cartCount = useSelector((state: RootState) => selectCartCount(state));
  const navigate = useNavigate();

  const handleSearch = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery)}`);
      setSearchQuery("");
    }
  };

  const handleLogout = (): void => {
    logout();
    setUserMenuOpen(false);
    navigate("/");
  };

  const navLinks: NavLink[] = [
    { to: "/", label: "Home" },
    { to: "/products", label: "Products" },
    { to: "/categories", label: "Categories" },
    { to: "/about", label: "About" },
  ];

  return (
    <header className="bg-[var(--color-surface)] border-b border-[var(--color-border)] sticky top-0 z-50">
      <div className="container-app">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img
              src={logo}
              alt="Nevan Handicraft"
              className="h-10 w-auto object-contain"
            />
            <div className="flex flex-col leading-none">
              <span className="text-xl font-bold text-[var(--color-primary)]">
                Nevan
              </span>
              <span className="text-xs text-[var(--color-text-muted)] font-medium">
                Handicraft
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `text-sm font-medium transition-colors hover:text-[var(--color-primary)] ${
                    isActive
                      ? "text-[var(--color-primary)]"
                      : "text-[var(--color-text)]"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="hidden lg:flex items-center">
            <div className="input-group">
              <Search className="input-icon w-4 h-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setSearchQuery(e.target.value)
                }
                placeholder="Search products..."
                className="input w-64 py-2 text-sm"
              />
            </div>
          </form>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            {/* Cart */}
            <Link
              to="/cart"
              className="relative p-2 hover:bg-[var(--color-bg)] rounded-lg"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-[var(--color-primary)] text-white text-xs rounded-full flex items-center justify-center">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </Link>

            {/* User Menu */}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-2 hover:bg-[var(--color-bg)] rounded-lg"
                >
                  <div className="w-8 h-8 bg-[var(--color-primary)] rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                </button>

                {/* Dropdown */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-lg py-2">
                    <div className="px-4 py-2 border-b border-[var(--color-border)]">
                      <p className="font-medium">{user?.name}</p>
                      <p className="text-sm text-[var(--color-text-muted)]">
                        {user?.email}
                      </p>
                    </div>

                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 hover:bg-[var(--color-bg)]"
                      >
                        <LayoutDashboard className="w-4 h-4" />
                        Admin Dashboard
                      </Link>
                    )}

                    <Link
                      to="/orders"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 hover:bg-[var(--color-bg)]"
                    >
                      <Package className="w-4 h-4" />
                      My Orders
                    </Link>

                    <Link
                      to="/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 hover:bg-[var(--color-bg)]"
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </Link>

                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 px-4 py-2 w-full text-left hover:bg-[var(--color-bg)] text-[var(--color-error)]"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="btn btn-secondary text-sm">
                  Login
                </Link>
                <Link
                  to="/register"
                  className="btn btn-primary text-sm hidden sm:inline-flex"
                >
                  Sign Up
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 hover:bg-[var(--color-bg)] rounded-lg"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-[var(--color-border)]">
            <form onSubmit={handleSearch} className="mb-4">
              <div className="input-group">
                <Search className="input-icon w-4 h-4" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setSearchQuery(e.target.value)
                  }
                  placeholder="Search products..."
                  className="input w-full"
                />
              </div>
            </form>

            <nav className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-lg transition-colors ${
                      isActive
                        ? "bg-[var(--color-primary)] text-white"
                        : "hover:bg-[var(--color-bg)]"
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
