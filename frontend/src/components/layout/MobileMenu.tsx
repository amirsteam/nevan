/**
 * MobileMenu
 * Site menu below the desktop breakpoint: a drawer from the left with the
 * shop shortcuts (age, boy/girl, categories), account links, help and theme.
 */
import { Link, NavLink } from "react-router-dom";
import { X, ChevronRight, Package, Heart, Settings, LogOut, LayoutDashboard, Phone, MessageCircle } from "lucide-react";
import Modal from "../ui/Modal";
import ThemeToggle from "./ThemeToggle";
import { useAuth } from "../../context/AuthContext";
import { useCampaign } from "../../context/CampaignContext";
import { useNavCategories } from "../../hooks/useNavCategories";
import CategoryThumb from "../CategoryThumb";
import { AGE_GROUPS, CONTACT } from "../../config/store";
import { SOCIAL_LINKS } from "../../config/social";
import { AGE_LABELS, GENDER_LINKS, NEW_IN_PATH, ageLink, genderLink, splitAge } from "../../utils/shopLinks";
import { salePath } from "../../utils/campaign";
// Store logo with its wordmark (640×342, cropped from the 1024px app icon); drawn on white
import logo from "../../assets/nevan-handicraft-logo.webp";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

const sectionTitle = "px-4 mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]";
const rowLink = "flex items-center gap-3 px-4 py-3 text-[15px] hover:bg-[var(--color-surface-muted)] transition-colors";
const chip =
  "rounded-full border border-[var(--color-border)] px-3.5 py-2 text-sm font-medium hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors";

const MAX_CATEGORIES = 6;

const MobileMenu = ({ isOpen, onClose, onLogout }: MobileMenuProps) => {
  const { user, isAuthenticated, isAdmin } = useAuth();
  const { campaign, isPreview } = useCampaign();
  const categories = useNavCategories(isOpen);
  const sale = campaign && campaign.sale.label && (isPreview || campaign.state === "live") ? campaign : null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} ariaLabel="Menu" variant="drawer" showCloseButton={false} bodyClassName="p-0">
      {/* Close the drawer on any link, including links to the page already open */}
      <div
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("a")) onClose();
        }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-4 h-16 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
          <Link
            to="/"
            className="flex items-center rounded-lg dark:bg-white dark:px-1.5 dark:py-0.5"
            aria-label="Nevan Handicraft home"
          >
            <img src={logo} alt="" width={640} height={342} className="h-11 w-auto" />
          </Link>
          <button
            type="button"
            data-modal-close="true"
            onClick={onClose}
            className="p-2.5 -mr-2.5 rounded-lg hover:bg-[var(--color-surface-muted)] transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Account */}
        {isAuthenticated ? (
          <div className="px-4 py-4 border-b border-[var(--color-border)]">
            <p className="font-medium truncate">{user?.name}</p>
            <p className="text-sm text-[var(--color-text-muted)] truncate">{user?.email}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 px-4 py-4 border-b border-[var(--color-border)]">
            <Link to="/login" className="btn btn-secondary text-sm py-2.5">
              Sign in
            </Link>
            <Link to="/register" className="btn btn-primary text-sm py-2.5">
              Create account
            </Link>
          </div>
        )}

        <nav aria-label="Shop" className="py-4 space-y-5">
          {sale && (
            <Link
              to={salePath(sale.slug)}
              className="mx-4 flex items-center justify-between gap-3 rounded-xl px-4 py-3 font-semibold"
              style={{ backgroundColor: sale.theme.bg, color: sale.theme.text }}
            >
              <span>
                {sale.emoji && <span aria-hidden="true">{sale.emoji} </span>}
                {sale.name}
              </span>
              <ChevronRight className="w-4 h-4 shrink-0" aria-hidden="true" />
            </Link>
          )}

          <div>
            <p className={sectionTitle}>Shop by age</p>
            <ul className="grid grid-cols-2 gap-2 px-4">
              {AGE_GROUPS.map((age) => {
                const [range, unit] = splitAge(age);
                return (
                  <li key={age}>
                    <Link
                      to={ageLink(age)}
                      className="flex flex-col rounded-xl border border-[var(--color-border)] px-3 py-2.5 hover:border-[var(--color-primary)] transition-colors"
                    >
                      <span className="text-sm font-semibold">{AGE_LABELS[age]}</span>
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {range} {unit}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <p className={sectionTitle}>Shopping for</p>
            <ul className="flex flex-wrap gap-2 px-4">
              {GENDER_LINKS.map(({ value, label }) => (
                <li key={value}>
                  <Link to={genderLink(value)} className={chip}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <ul>
            <li>
              <Link to="/products" className={rowLink}>
                Shop all
                <ChevronRight className="w-4 h-4 ml-auto text-[var(--color-text-muted)]" aria-hidden="true" />
              </Link>
            </li>
            <li>
              <Link to={NEW_IN_PATH} className={rowLink}>
                New in
                <ChevronRight className="w-4 h-4 ml-auto text-[var(--color-text-muted)]" aria-hidden="true" />
              </Link>
            </li>
            {categories.slice(0, MAX_CATEGORIES).map((category) => (
              <li key={category._id}>
                <Link to={`/products?category=${category.slug}`} className={rowLink}>
                  <CategoryThumb category={category} size={32} />
                  {category.name}
                  <ChevronRight className="w-4 h-4 ml-auto text-[var(--color-text-muted)]" aria-hidden="true" />
                </Link>
              </li>
            ))}
            <li>
              <NavLink to="/categories" className={rowLink}>
                All categories
                <ChevronRight className="w-4 h-4 ml-auto text-[var(--color-text-muted)]" aria-hidden="true" />
              </NavLink>
            </li>
          </ul>
        </nav>

        {isAuthenticated && (
          <nav aria-label="Account" className="py-3 border-t border-[var(--color-border)]">
            {isAdmin && (
              <Link to="/admin" className={rowLink}>
                <LayoutDashboard className="w-5 h-5 text-[var(--color-text-muted)]" aria-hidden="true" />
                Admin dashboard
              </Link>
            )}
            <Link to="/orders" className={rowLink}>
              <Package className="w-5 h-5 text-[var(--color-text-muted)]" aria-hidden="true" />
              My orders
            </Link>
            <Link to="/wishlist" className={rowLink}>
              <Heart className="w-5 h-5 text-[var(--color-text-muted)]" aria-hidden="true" />
              Wishlist
            </Link>
            <Link to="/profile" className={rowLink}>
              <Settings className="w-5 h-5 text-[var(--color-text-muted)]" aria-hidden="true" />
              Account settings
            </Link>
            <button type="button" onClick={onLogout} className={`${rowLink} w-full text-left text-[var(--color-error)]`}>
              <LogOut className="w-5 h-5" aria-hidden="true" />
              Sign out
            </button>
          </nav>
        )}

        <div className="py-3 border-t border-[var(--color-border)]">
          <p className={`${sectionTitle} mt-2`}>Need help?</p>
          <a href={CONTACT.phoneHref} className={rowLink}>
            <Phone className="w-5 h-5 text-[var(--color-text-muted)]" aria-hidden="true" />
            {CONTACT.phoneDisplay}
          </a>
          <a href={CONTACT.whatsappHref} target="_blank" rel="noopener noreferrer" className={rowLink}>
            <MessageCircle className="w-5 h-5 text-[var(--color-text-muted)]" aria-hidden="true" />
            WhatsApp us
          </a>
          <Link to="/about" className={rowLink}>
            About us
          </Link>
          <Link to="/contact" className={rowLink}>
            Contact
          </Link>
          <p className={`${sectionTitle} mt-3`}>Follow us</p>
          <ul className="flex flex-wrap gap-2 px-4 pb-1">
            {SOCIAL_LINKS.map(({ network, href, logo: networkLogo }) => (
              <li key={network}>
                <a href={href} target="_blank" rel="noopener noreferrer" className={`${chip} inline-flex items-center gap-2 pl-1.5`}>
                  <img src={networkLogo} alt="" width={24} height={24} loading="lazy" className="w-6 h-6" />
                  {network}
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col items-start gap-2 px-4 py-4 border-t border-[var(--color-border)]">
          <span className="text-sm text-[var(--color-text-muted)]">Appearance</span>
          <ThemeToggle variant="segmented" />
        </div>
      </div>
    </Modal>
  );
};

export default MobileMenu;
