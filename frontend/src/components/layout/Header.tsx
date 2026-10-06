/**
 * Header Component
 * Navigation, search (inline on desktop, overlay elsewhere), wishlist, cart,
 * notifications, theme and account menu
 */
import { useState, useEffect, useRef, FormEvent } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { ShoppingBag, Heart, Menu, X, Search, LogOut, Settings, Package, LayoutDashboard } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { selectCartCount } from "../../store/cartSlice";
import { useWishlist } from "../../hooks/useWishlist";
import NotificationBell from "../NotificationBell";
import SearchOverlay, { rememberSearch } from "./SearchOverlay";
import ThemeToggle from "./ThemeToggle";
import logo from "../../assets/logo.png";
import type { RootState } from "../../store";

interface NavItem {
  to: string;
  label: string;
}

const NAV_LINKS: NavItem[] = [
  { to: "/", label: "Home" },
  { to: "/products", label: "Shop" },
  { to: "/categories", label: "Categories" },
  { to: "/about", label: "About" },
];

const iconButton = "relative p-2 rounded-lg hover:bg-[var(--color-surface-muted)] transition-colors";

const Header = (): React.ReactElement => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [cartBump, setCartBump] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const previousCount = useRef<number | null>(null);

  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { count: wishlistCount } = useWishlist();
  const cartCount = useSelector((state: RootState) => selectCartCount(state));
  const navigate = useNavigate();
  const location = useLocation();

  // Close menus on navigation
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  // Small bump when the cart count goes up
  useEffect(() => {
    if (previousCount.current !== null && cartCount > previousCount.current) {
      setCartBump(true);
      const timer = setTimeout(() => setCartBump(false), 400);
      previousCount.current = cartCount;
      return () => clearTimeout(timer);
    }
    previousCount.current = cartCount;
  }, [cartCount]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setUserMenuOpen(false);
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleSearch = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    rememberSearch(q);
    navigate(`/products?search=${encodeURIComponent(q)}`);
    setSearchQuery("");
  };

  const handleLogout = (): void => {
    logout();
    setUserMenuOpen(false);
    navigate("/");
  };

  const menuItem = "flex items-center gap-2 px-4 py-2 hover:bg-[var(--color-surface-muted)]";

  return (
    <header className="bg-[var(--color-surface)]/95 backdrop-blur border-b border-[var(--color-border)] sticky top-0 z-40">
      <div className="container-app">
        <div className="flex items-center justify-between gap-3 h-16">
          <div className="flex items-center gap-1">
            {/* Mobile menu */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className={`md:hidden -ml-2 ${iconButton}`}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
            </button>

            <Link to="/" className="flex items-center gap-2" aria-label="Nevan Handicraft home">
              <img src={logo} alt="" className="h-9 w-auto object-contain" width={36} height={36} />
              <span className="flex flex-col leading-none">
                <span className="text-xl font-bold text-[var(--color-primary)] font-display">Nevan</span>
                <span className="text-[11px] text-[var(--color-text-muted)] font-medium hidden sm:block">Handicraft</span>
              </span>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-6" aria-label="Main">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/"}
                className={({ isActive }) =>
                  `text-sm font-medium transition-colors hover:text-[var(--color-primary)] py-1 border-b-2 ${
                    isActive ? "text-[var(--color-primary)] border-[var(--color-primary)]" : "text-[var(--color-text)] border-transparent"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* Inline search (large screens) */}
          <form onSubmit={handleSearch} role="search" className="hidden lg:flex items-center">
            <div className="input-group">
              <Search className="input-icon w-4 h-4" aria-hidden="true" />
              <label htmlFor="header-search" className="sr-only">
                Search products
              </label>
              <input
                id="header-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products…"
                className="input w-60 xl:w-72 py-2 text-sm"
              />
            </div>
          </form>

          <div className="flex items-center gap-0.5 sm:gap-1">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className={`lg:hidden ${iconButton}`}
              aria-label="Search products"
              aria-haspopup="dialog"
            >
              <Search className="w-5 h-5" aria-hidden="true" />
            </button>

            <ThemeToggle className="hidden sm:inline-flex" />

            <Link
              to="/wishlist"
              className={iconButton}
              aria-label={wishlistCount > 0 ? `Wishlist, ${wishlistCount} saved` : "Wishlist"}
            >
              <Heart className="w-5 h-5" aria-hidden="true" />
              {wishlistCount > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-4 h-4 px-1 bg-[var(--color-primary)] text-[var(--color-on-primary)] text-[10px] font-semibold rounded-full flex items-center justify-center">
                  {wishlistCount > 9 ? "9+" : wishlistCount}
                </span>
              )}
            </Link>

            {isAuthenticated && <NotificationBell />}

            <Link
              to="/cart"
              className={iconButton}
              aria-label={cartCount > 0 ? `Cart, ${cartCount} ${cartCount === 1 ? "item" : "items"}` : "Cart"}
            >
              <ShoppingBag className="w-5 h-5" aria-hidden="true" />
              {cartCount > 0 && (
                <span
                  className={`absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 bg-[var(--color-primary)] text-[var(--color-on-primary)] text-xs font-semibold rounded-full flex items-center justify-center transition-transform duration-200 ${
                    cartBump ? "scale-125" : "scale-100"
                  }`}
                >
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </Link>

            {isAuthenticated ? (
              <div className="relative ml-1" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((open) => !open)}
                  className="flex items-center p-1 rounded-full hover:bg-[var(--color-surface-muted)]"
                  aria-expanded={userMenuOpen}
                  aria-haspopup="menu"
                  aria-label="Account menu"
                >
                  <span className="w-8 h-8 bg-[var(--color-primary)] rounded-full flex items-center justify-center text-[var(--color-on-primary)] text-sm font-medium">
                    {user?.name?.charAt(0).toUpperCase()}
                  </span>
                </button>

                {userMenuOpen && (
                  <div
                    className="absolute right-0 mt-2 w-60 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-[var(--shadow-lg)] py-2 animate-fadeIn"
                    role="menu"
                  >
                    <div className="px-4 py-2 border-b border-[var(--color-border)] mb-1">
                      <p className="font-medium truncate">{user?.name}</p>
                      <p className="text-sm text-[var(--color-text-muted)] truncate">{user?.email}</p>
                    </div>
                    {isAdmin && (
                      <Link to="/admin" role="menuitem" className={menuItem}>
                        <LayoutDashboard className="w-4 h-4" aria-hidden="true" />
                        Admin dashboard
                      </Link>
                    )}
                    <Link to="/orders" role="menuitem" className={menuItem}>
                      <Package className="w-4 h-4" aria-hidden="true" />
                      My orders
                    </Link>
                    <Link to="/wishlist" role="menuitem" className={menuItem}>
                      <Heart className="w-4 h-4" aria-hidden="true" />
                      Wishlist
                    </Link>
                    <Link to="/profile" role="menuitem" className={menuItem}>
                      <Settings className="w-4 h-4" aria-hidden="true" />
                      Account settings
                    </Link>
                    <button type="button" role="menuitem" onClick={handleLogout} className={`${menuItem} w-full text-left text-[var(--color-error)]`}>
                      <LogOut className="w-4 h-4" aria-hidden="true" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 ml-1">
                <Link to="/login" className="btn btn-secondary text-sm px-3 py-2">
                  Login
                </Link>
                <Link to="/register" className="btn btn-primary text-sm px-3 py-2 hidden sm:inline-flex">
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>

        {mobileMenuOpen && (
          <div id="mobile-menu" className="md:hidden py-3 border-t border-[var(--color-border)] animate-fadeIn">
            <nav className="flex flex-col gap-1" aria-label="Main">
              {NAV_LINKS.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === "/"}
                  className={({ isActive }) =>
                    `px-4 py-2.5 rounded-lg transition-colors ${
                      isActive ? "bg-[var(--color-primary-soft)] text-[var(--color-primary)] font-medium" : "hover:bg-[var(--color-surface-muted)]"
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
              {!isAuthenticated && (
                <NavLink to="/register" className="px-4 py-2.5 rounded-lg hover:bg-[var(--color-surface-muted)] sm:hidden">
                  Create an account
                </NavLink>
              )}
            </nav>
            <div className="flex items-center justify-between px-4 pt-3 mt-2 border-t border-[var(--color-border)]">
              <span className="text-sm text-[var(--color-text-muted)]">Appearance</span>
              <ThemeToggle variant="segmented" />
            </div>
          </div>
        )}
      </div>

      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
};

export default Header;
