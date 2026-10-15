/**
 * Header Component
 * Logo, shop navigation (mega menu on desktop, drawer below it), search
 * (inline combobox on wide screens, overlay elsewhere), wishlist, cart,
 * notifications, theme and account menu
 */
import { useState, useEffect, useRef } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { ShoppingCart, Heart, Menu, Search, LogOut, Settings, Package, LayoutDashboard, User, ChevronDown } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useCampaign } from "../../context/CampaignContext";
import { selectCartCount } from "../../store/cartSlice";
import { useWishlist } from "../../hooks/useWishlist";
import NotificationBell from "../NotificationBell";
import CountBadge from "../ui/CountBadge";
import SearchOverlay from "./SearchOverlay";
import HeaderSearch from "./HeaderSearch";
import ShopMenu from "./ShopMenu";
import MobileMenu from "./MobileMenu";
import ThemeToggle from "./ThemeToggle";
import { NEW_IN_PATH } from "../../utils/shopLinks";
import { salePath } from "../../utils/campaign";
// Store logo with its wordmark (640×342, cropped from the 1024px app icon); drawn on white
import logo from "../../assets/nevan-handicraft-logo.webp";
import type { RootState } from "../../store";

// No display class here, so `hidden sm:inline-flex` on a button can't be overridden
const iconButton = "relative p-2 rounded-lg hover:bg-[var(--color-surface-muted)] transition-colors";
// Header action icons: larger, lighter line icons
const actionIcon = "w-6 h-6";
const ACTION_STROKE = 1.75;
// Person icon + "Hello, … / My Account" (the text from xl up; phones and tablets show the icon)
const accountTrigger =
  "flex items-center gap-2 rounded-lg p-2 xl:py-1 xl:pl-1.5 xl:pr-2 hover:bg-[var(--color-surface-muted)] transition-colors";

/** Desktop nav link: full header height, with the active bar on the header's bottom edge */
const navLinkClass = (active: boolean): string =>
  `relative h-16 inline-flex items-center gap-1 text-sm font-medium transition-colors hover:text-[var(--color-primary)] after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full after:bg-[var(--color-primary)] after:transition-transform after:duration-200 ${
    active ? "text-[var(--color-primary)] after:scale-x-100" : "text-[var(--color-text)] after:scale-x-0 hover:after:scale-x-100"
  }`;

const Header = (): React.ReactElement => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartBump, setCartBump] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const userButtonRef = useRef<HTMLButtonElement>(null);

  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { campaign, isPreview } = useCampaign();
  const { count: wishlistCount } = useWishlist();
  const cartCount = useSelector((state: RootState) => selectCartCount(state));
  const navigate = useNavigate();
  const location = useLocation();

  // Close menus on navigation, including filter changes on the same page
  // (adjusting state during render, not in an effect)
  const route = location.pathname + location.search;
  const [lastRoute, setLastRoute] = useState(route);
  if (lastRoute !== route) {
    setLastRoute(route);
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
  }

  // Small bump when the cart count goes up
  const [lastCartCount, setLastCartCount] = useState(cartCount);
  if (lastCartCount !== cartCount) {
    setLastCartCount(cartCount);
    if (cartCount > lastCartCount) setCartBump(true);
  }
  useEffect(() => {
    if (!cartBump) return;
    const timer = setTimeout(() => setCartBump(false), 400);
    return () => clearTimeout(timer);
  }, [cartBump]);

  // Lift the header off the page once it starts sticking
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Account menu: outside click closes; Escape closes and returns focus to the account button
  useEffect(() => {
    if (!userMenuOpen) return;
    userMenuRef.current?.querySelector<HTMLElement>("[data-menu-item]")?.focus();
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setUserMenuOpen(false);
      userButtonRef.current?.focus();
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [userMenuOpen]);

  const handleLogout = (): void => {
    logout();
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
    navigate("/");
  };

  const params = new URLSearchParams(location.search);
  const onShop = location.pathname === "/products";
  const newInActive = onShop && params.get("sort") === "-createdAt" && !params.get("search");
  const shopActive = (onShop && !newInActive) || location.pathname.startsWith("/products/");
  const sale = campaign && campaign.sale.label && (isPreview || campaign.state === "live") ? campaign : null;
  // "Hello, Anjana" — first name, else the part of the email before @
  const firstName = (user?.name?.trim().split(/\s+/)[0] || user?.email?.split("@")[0] || "there").trim();

  const menuItem = "flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-[var(--color-surface-muted)] focus-visible:bg-[var(--color-surface-muted)] transition-colors";

  return (
    <header
      className={`sticky top-0 z-40 bg-[var(--color-surface)]/95 backdrop-blur border-b border-[var(--color-border)] transition-shadow duration-200 ${
        scrolled ? "shadow-[var(--shadow-md)]" : ""
      }`}
    >
      <div className="container-app">
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 lg:gap-8 h-16">
          {/* Brand (and the menu button below desktop) */}
          <div className="flex items-center gap-1 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className={`lg:hidden -ml-2.5 ${iconButton}`}
              aria-haspopup="dialog"
              aria-expanded={mobileMenuOpen}
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" aria-hidden="true" />
            </button>

            {/* The logo is drawn on white: invisible on the light header, a small white card on the dark one */}
            <Link
              to="/"
              className="flex items-center shrink-0 rounded-lg dark:bg-white dark:px-1.5 dark:py-0.5"
              aria-label="Nevan Handicraft home"
            >
              <img src={logo} alt="" width={640} height={342} className="h-11 w-auto sm:h-12" />
            </Link>
          </div>

          {/* Shop navigation (desktop) */}
          <nav className="hidden lg:flex items-center justify-center gap-8" aria-label="Main">
            <ShopMenu linkClassName={navLinkClass} active={shopActive} />
            <Link to={NEW_IN_PATH} className={navLinkClass(newInActive)} aria-current={newInActive ? "page" : undefined}>
              New in
            </Link>
            <NavLink to="/categories" className={({ isActive }) => navLinkClass(isActive)}>
              Categories
            </NavLink>
            <NavLink to="/about" className={({ isActive }) => navLinkClass(isActive)}>
              About us
            </NavLink>
            {sale && (
              <NavLink to={salePath(sale.slug)} className={({ isActive }) => navLinkClass(isActive)}>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary-soft)] px-2.5 py-1 font-semibold text-[var(--color-primary)]">
                  {sale.emoji ? (
                    <span aria-hidden="true">{sale.emoji}</span>
                  ) : (
                    <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sale.theme.accent }} />
                  )}
                  Sale
                </span>
              </NavLink>
            )}
          </nav>

          {/* Actions */}
          <div className="col-start-3 flex items-center justify-end gap-0 sm:gap-1">
            <HeaderSearch className="hidden xl:block mr-2" />
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className={`xl:hidden ${iconButton}`}
              aria-label="Search products"
              aria-haspopup="dialog"
            >
              <Search className="w-5 h-5" aria-hidden="true" />
            </button>

            <ThemeToggle className="hidden lg:inline-flex" />

            {/* Below sm the wishlist lives in the menu drawer and account menu */}
            <Link
              to="/wishlist"
              className={`hidden sm:inline-flex ${iconButton}`}
              aria-label={wishlistCount > 0 ? `Wishlist, ${wishlistCount} saved` : "Wishlist"}
            >
              <Heart className={actionIcon} strokeWidth={ACTION_STROKE} aria-hidden="true" />
              <CountBadge count={wishlistCount} />
            </Link>

            {isAuthenticated && <NotificationBell />}

            <Link
              to="/cart"
              className={iconButton}
              aria-label={cartCount > 0 ? `Cart, ${cartCount} ${cartCount === 1 ? "item" : "items"}` : "Cart"}
            >
              <ShoppingCart className={actionIcon} strokeWidth={ACTION_STROKE} aria-hidden="true" />
              <CountBadge count={cartCount} max={99} bump={cartBump} />
            </Link>

            {isAuthenticated ? (
              <div
                className="relative ml-1"
                ref={userMenuRef}
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setUserMenuOpen(false);
                }}
              >
                <button
                  ref={userButtonRef}
                  type="button"
                  onClick={() => setUserMenuOpen((open) => !open)}
                  className={accountTrigger}
                  aria-expanded={userMenuOpen}
                  aria-controls="account-menu"
                  aria-label="My Account"
                >
                  <User className={actionIcon} strokeWidth={ACTION_STROKE} aria-hidden="true" />
                  <span className="hidden xl:flex flex-col items-start leading-tight text-left" aria-hidden="true">
                    <span className="max-w-[8rem] truncate text-xs text-[var(--color-text-muted)]">Hello, {firstName}</span>
                    <span className="flex items-center gap-0.5 text-sm font-semibold">
                      My Account
                      <ChevronDown className={`w-4 h-4 transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
                    </span>
                  </span>
                </button>

                {userMenuOpen && (
                  <div
                    id="account-menu"
                    className="absolute right-0 mt-2 w-64 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-[var(--shadow-lg)] py-2 animate-fadeIn"
                  >
                    <div className="px-4 py-2 border-b border-[var(--color-border)] mb-1">
                      <p className="font-medium truncate">{user?.name}</p>
                      <p className="text-sm text-[var(--color-text-muted)] truncate">{user?.email}</p>
                    </div>
                    <ul>
                      {isAdmin && (
                        <li>
                          <Link to="/admin" data-menu-item className={menuItem}>
                            <LayoutDashboard className="w-4 h-4 text-[var(--color-text-muted)]" aria-hidden="true" />
                            Admin dashboard
                          </Link>
                        </li>
                      )}
                      <li>
                        <Link to="/orders" data-menu-item className={menuItem}>
                          <Package className="w-4 h-4 text-[var(--color-text-muted)]" aria-hidden="true" />
                          My orders
                        </Link>
                      </li>
                      <li>
                        <Link to="/wishlist" data-menu-item className={menuItem}>
                          <Heart className="w-4 h-4 text-[var(--color-text-muted)]" aria-hidden="true" />
                          Wishlist
                          {wishlistCount > 0 && (
                            <span className="ml-auto text-xs text-[var(--color-text-muted)] tabular-nums">{wishlistCount}</span>
                          )}
                        </Link>
                      </li>
                      <li>
                        <Link to="/profile" data-menu-item className={menuItem}>
                          <Settings className="w-4 h-4 text-[var(--color-text-muted)]" aria-hidden="true" />
                          Account settings
                        </Link>
                      </li>
                      <li className="mt-1 pt-1 border-t border-[var(--color-border)]">
                        <button
                          type="button"
                          data-menu-item
                          onClick={handleLogout}
                          className={`${menuItem} w-full text-left text-[var(--color-error)]`}
                        >
                          <LogOut className="w-4 h-4" aria-hidden="true" />
                          Sign out
                        </button>
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="ml-1">
                {/* Same place and look as the signed-in account button; the sign-in page links to sign-up */}
                <Link to="/login" className={accountTrigger} aria-label="Sign in to My Account">
                  <User className={actionIcon} strokeWidth={ACTION_STROKE} aria-hidden="true" />
                  <span className="hidden xl:flex flex-col items-start leading-tight text-left" aria-hidden="true">
                    <span className="text-xs text-[var(--color-text-muted)]">Hello, sign in</span>
                    <span className="text-sm font-semibold">My Account</span>
                  </span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <MobileMenu isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} onLogout={handleLogout} />
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
};

export default Header;
