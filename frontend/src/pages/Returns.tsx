/**
 * Returns & Refunds Page
 * Return policy and refund process
 */
import { Link } from "react-router-dom";
import { RotateCcw, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";

const Returns = () => {
  return (
    <div className="container-app py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] mb-6">
        <Link to="/" className="hover:text-[var(--color-primary)]">Home</Link>
        <span>/</span>
        <span className="text-[var(--color-text)]">Returns & Refunds</span>
      </nav>

      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            Returns & Refunds
          </h1>
          <p className="text-[var(--color-text-muted)]">
            We want you and your little one to be completely happy with your purchase
          </p>
        </div>

        {/* Policy Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <div className="card p-5 text-center">
            <RotateCcw className="w-8 h-8 text-[var(--color-primary)] mx-auto mb-3" />
            <h3 className="font-semibold text-sm mb-1">7-Day Returns</h3>
            <p className="text-xs text-[var(--color-text-muted)]">
              From date of delivery
            </p>
          </div>
          <div className="card p-5 text-center">
            <Clock className="w-8 h-8 text-[var(--color-primary)] mx-auto mb-3" />
            <h3 className="font-semibold text-sm mb-1">3–5 Day Refunds</h3>
            <p className="text-xs text-[var(--color-text-muted)]">
              After inspection is complete
            </p>
          </div>
          <div className="card p-5 text-center">
            <CheckCircle className="w-8 h-8 text-[var(--color-primary)] mx-auto mb-3" />
            <h3 className="font-semibold text-sm mb-1">Easy Process</h3>
            <p className="text-xs text-[var(--color-text-muted)]">
              Contact us via WhatsApp
            </p>
          </div>
        </div>

        {/* Eligible for Return */}
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            Eligible for Return
          </h2>
          <ul className="space-y-2">
            {[
              "Item is unworn, unwashed, and in original condition",
              "Original tags and packaging are intact",
              "Return is requested within 7 days of delivery",
              "Wrong item or wrong size was delivered",
              "Item is damaged or defective on arrival",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-[var(--color-text-muted)]">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Not Eligible */}
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-500" />
            Not Eligible for Return
          </h2>
          <ul className="space-y-2">
            {[
              "Items that have been worn, washed, or altered",
              "Items without original tags or packaging",
              "Items returned after 7 days from delivery",
              "Sale or clearance items (unless defective)",
              "Personalized or custom-made items",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-[var(--color-text-muted)]">
                <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* How to Return */}
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">How to Initiate a Return</h2>
          <div className="space-y-4">
            {[
              {
                step: "1",
                title: "Contact Us",
                desc: "Send us a message on WhatsApp (+977 9844575932) or email with your order number and reason for return.",
              },
              {
                step: "2",
                title: "Get Approval",
                desc: "We'll review your request and confirm your return within 24 hours.",
              },
              {
                step: "3",
                title: "Ship the Item",
                desc: "Pack the item securely and ship it to our address. We'll provide return shipping instructions.",
              },
              {
                step: "4",
                title: "Receive Refund",
                desc: "Once we receive and inspect the item, your refund will be processed within 3–5 business days.",
              },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {item.step}
                </div>
                <div>
                  <h3 className="font-medium text-sm">{item.title}</h3>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Refund Info */}
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Refund Details</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="text-left py-3 font-semibold">Payment Method</th>
                  <th className="text-left py-3 font-semibold">Refund Method</th>
                  <th className="text-left py-3 font-semibold">Time</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[var(--color-border)]">
                  <td className="py-3">Cash on Delivery</td>
                  <td className="py-3">eSewa or Bank Transfer</td>
                  <td className="py-3">3–5 business days</td>
                </tr>
                <tr>
                  <td className="py-3">eSewa</td>
                  <td className="py-3">Refund to eSewa wallet</td>
                  <td className="py-3">3–5 business days</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Contact CTA */}
        <div className="card p-8 text-center">
          <AlertCircle className="w-10 h-10 text-[var(--color-primary)] mx-auto mb-3" />
          <h3 className="text-lg font-semibold mb-2">Need Help with a Return?</h3>
          <p className="text-sm text-[var(--color-text-muted)] mb-4">
            Our team is ready to assist you. Reach out via WhatsApp for the fastest response.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="https://wa.me/9779844575932"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              WhatsApp Us
            </a>
            <Link to="/contact" className="btn btn-secondary">
              Contact Page
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Returns;
