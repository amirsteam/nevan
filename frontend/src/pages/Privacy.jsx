/**
 * Privacy Policy Page
 */
import { Link } from "react-router-dom";
import { Shield } from "lucide-react";

const Privacy = () => {
  return (
    <div className="container-app py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] mb-6">
        <Link to="/" className="hover:text-[var(--color-primary)]">Home</Link>
        <span>/</span>
        <span className="text-[var(--color-text)]">Privacy Policy</span>
      </nav>

      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <Shield className="w-10 h-10 text-[var(--color-primary)] mx-auto mb-3" />
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Privacy Policy</h1>
          <p className="text-[var(--color-text-muted)] text-sm">
            Last updated: February 2026
          </p>
        </div>

        <div className="card p-6 md:p-8 space-y-8 text-sm text-[var(--color-text-muted)] leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-[var(--color-text)] mb-3">
              1. Information We Collect
            </h2>
            <p className="mb-3">
              When you create an account or place an order at Nevan Handicraft, we collect:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Personal Information:</strong> Name, email address, phone number</li>
              <li><strong>Shipping Address:</strong> Street, city, district, province</li>
              <li><strong>Order Data:</strong> Items purchased, order history, payment method chosen</li>
              <li><strong>Account Data:</strong> Password (encrypted), wishlist, and review content</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--color-text)] mb-3">
              2. How We Use Your Information
            </h2>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Process and deliver your orders</li>
              <li>Send order confirmations and shipping updates</li>
              <li>Provide customer support</li>
              <li>Improve our products and services</li>
              <li>Send promotional emails (only with your consent — you can unsubscribe anytime)</li>
              <li>Prevent fraud and ensure platform security</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--color-text)] mb-3">
              3. Data Sharing
            </h2>
            <p className="mb-3">
              We do not sell, rent, or trade your personal information. We may share limited data with:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Delivery Partners:</strong> Name, address, and phone number for shipping</li>
              <li><strong>Payment Processors:</strong> eSewa for payment processing (we never store your wallet credentials)</li>
              <li><strong>Legal Requirements:</strong> If required by Nepal law or court order</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--color-text)] mb-3">
              4. Data Security
            </h2>
            <p>
              We implement industry-standard security measures to protect your data:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
              <li>Passwords are hashed using bcrypt encryption</li>
              <li>All API communication is encrypted via HTTPS</li>
              <li>Authentication tokens are short-lived with secure refresh mechanisms</li>
              <li>Payment processing is handled by trusted third-party gateways</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--color-text)] mb-3">
              5. Cookies & Local Storage
            </h2>
            <p>
              We use browser local storage to maintain your login session and authentication tokens.
              No third-party tracking cookies are used on our site. We use essential cookies only
              for site functionality.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--color-text)] mb-3">
              6. Your Rights
            </h2>
            <p className="mb-3">You have the right to:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate information</li>
              <li>Request deletion of your account and associated data</li>
              <li>Opt out of promotional communications</li>
            </ul>
            <p className="mt-3">
              To exercise these rights, please contact us at{" "}
              <a
                href="mailto:anjanastha101@gmail.com"
                className="text-[var(--color-primary)] hover:underline"
              >
                anjanastha101@gmail.com
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--color-text)] mb-3">
              7. Children's Privacy
            </h2>
            <p>
              While our products are designed for babies and children, our website is intended for
              use by parents and guardians (age 18+). We do not knowingly collect personal
              information from children under 18.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--color-text)] mb-3">
              8. Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. Changes will be posted on this page
              with an updated "Last updated" date. Continued use of our service after changes
              constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--color-text)] mb-3">
              9. Contact Us
            </h2>
            <p>
              If you have questions about this Privacy Policy, contact us at:
            </p>
            <ul className="mt-2 space-y-1 ml-2">
              <li>Email: anjanastha101@gmail.com</li>
              <li>Phone: +977 9844575932</li>
              <li>Address: Panauti, Kavre, Nepal</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
