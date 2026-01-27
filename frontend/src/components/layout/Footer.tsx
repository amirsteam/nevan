/**
 * Footer Component
 * Site footer with links and contact info
 */
import { Link } from "react-router-dom";
import { Mail, Phone, MapPin } from "lucide-react";
import { FaFacebook, FaInstagram } from "react-icons/fa";

const Footer = (): React.ReactElement => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[var(--color-surface)] border-t border-[var(--color-border)] mt-auto">
      <div className="container-app py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <Link to="/" className="inline-block mb-4">
              <span className="text-2xl font-bold text-[var(--color-primary)]">
                Nevan
              </span>
              <span className="text-lg text-[var(--color-text-muted)]">
                Handicraft
              </span>
            </Link>
            <p className="text-sm text-[var(--color-text-muted)] mb-4">
              Authentic Nepali handicrafts crafted with love and tradition.
              Bringing the beauty of Nepal to your home.
            </p>
            <div className="flex gap-3">
              <a
                href="https://www.facebook.com/nevancollections"
                className="w-9 h-9 bg-[var(--color-bg)] rounded-full flex items-center justify-center hover:bg-[var(--color-primary)] hover:text-white transition-colors"
              >
                <FaFacebook className="w-4 h-4" />
              </a>
              <a
                href="https://www.instagram.com/nevancollection/"
                className="w-9 h-9 bg-[var(--color-bg)] rounded-full flex items-center justify-center hover:bg-[var(--color-primary)] hover:text-white transition-colors"
              >
                <FaInstagram className="w-4 h-4" />
              </a>
            </div>
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
                <span>+977 9844575932</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-[var(--color-text-muted)]">
                <Mail className="w-4 h-4 flex-shrink-0" />
                <span>anjanastha101@gmail.com</span>
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
            <img
              src="/khalti.png"
              alt="Khalti"
              className="h-8 w-auto object-contain opacity-80"
            />
            <span className="text-sm text-[var(--color-text-muted)]">
              Cash on Delivery
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
