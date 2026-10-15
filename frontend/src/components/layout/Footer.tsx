/**
 * Footer Component
 * Site footer with links and contact info
 */
import { Link } from "react-router-dom";
import { Mail, Phone, MapPin } from "lucide-react";
import { CONTACT, FABRIC, STORE_SLOGAN } from "../../config/store";
import { SOCIAL_LINKS } from "../../config/social";
// Store logo with its wordmark (same as the header); drawn on white
import logo from "../../assets/nevan-handicraft-logo.webp";

const Footer = (): React.ReactElement => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[var(--color-surface)] border-t border-[var(--color-border)] mt-auto">
      <div className="container-app py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            {/* Invisible on the light footer, a small white card on the dark one */}
            <Link
              to="/"
              className="inline-flex mb-4 rounded-lg dark:bg-white dark:px-2 dark:py-1"
              aria-label="Nevan Handicraft home"
            >
              <img src={logo} alt="" width={640} height={342} loading="lazy" className="h-16 w-auto" />
            </Link>
            <p className="font-display italic text-[var(--color-primary)] mb-2">{STORE_SLOGAN}.</p>
            <p className="text-sm text-[var(--color-text-muted)] mb-4">
              Handmade {FABRIC} baby clothing, crafted with a mother's love in Panauti, Nepal.
            </p>
            <p className="text-sm font-semibold mb-2">Follow us for new pieces</p>
            <ul className="flex flex-wrap gap-2">
              {SOCIAL_LINKS.map(({ network, href, handle, logo: networkLogo }) => (
                <li key={network}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] py-1.5 pl-1.5 pr-3.5 text-sm font-medium hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
                  >
                    <img src={networkLogo} alt="" width={28} height={28} loading="lazy" className="h-7 w-7" />
                    <span>
                      {network}
                      <span className="sr-only"> {handle} (opens in a new tab)</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/products"
                  className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
                >
                  All Products
                </Link>
              </li>
              <li>
                <Link
                  to="/categories"
                  className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
                >
                  Categories
                </Link>
              </li>
              <li>
                <Link
                  to="/about"
                  className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
                >
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h3 className="font-semibold mb-4">Customer Service</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/faq"
                  className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
                >
                  FAQ
                </Link>
              </li>
              <li>
                <Link
                  to="/shipping"
                  className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
                >
                  Shipping Info
                </Link>
              </li>
              <li>
                <Link
                  to="/returns"
                  className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
                >
                  Returns & Refunds
                </Link>
              </li>
              <li>
                <Link
                  to="/privacy"
                  className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
                >
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold mb-4">Contact Us</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm text-[var(--color-text-muted)]">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Panauti, Kavre, Nepal</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-[var(--color-text-muted)]">
                <Phone className="w-4 h-4 flex-shrink-0" />
                <span>{CONTACT.phoneDisplay}</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-[var(--color-text-muted)]">
                <Mail className="w-4 h-4 flex-shrink-0" />
                <span>{CONTACT.email}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-8 border-t border-[var(--color-border)] flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-[var(--color-text-muted)]">
            © {currentYear} Nevan Handicraft. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <img
              src="/esewa.png"
              alt="eSewa"
              className="h-8 w-auto object-contain opacity-80"
            />
            <span className="text-sm text-[var(--color-text-muted)]">
              Cash on Delivery
            </span>
          </div>
        </div>

        {/* Credit, centred under everything (room below on phones so the chat bubble doesn't cover it) */}
        <p className="mt-6 mb-16 md:mb-0 text-center text-sm text-[var(--color-text-muted)]">
          Designed and created by{" "}
          <a href="https://amirlearner.me" target="_blank" rel="noopener" className="credit-name">
            Amir Shrestha
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </p>
      </div>
    </footer>
  );
};

export default Footer;
