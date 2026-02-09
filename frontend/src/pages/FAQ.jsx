/**
 * FAQ Page
 * Frequently asked questions about baby clothing and shopping
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp } from "lucide-react";

const faqs = [
  {
    category: "Orders & Shipping",
    items: [
      {
        q: "How long does delivery take?",
        a: "We deliver within 3–5 business days inside Kathmandu Valley. For orders outside the valley, delivery may take 5–7 business days. You'll receive a confirmation with tracking details once your order is shipped.",
      },
      {
        q: "Do you offer free shipping?",
        a: "Yes! We currently offer free shipping on all orders within Nepal. No minimum order amount required.",
      },
      {
        q: "Can I track my order?",
        a: "Absolutely. Once your order is shipped, you'll receive tracking information via email. You can also check your order status anytime in the 'My Orders' section of your account.",
      },
      {
        q: "Do you ship outside Nepal?",
        a: "Currently we only ship within Nepal. International shipping is coming soon — subscribe to our newsletter to be the first to know!",
      },
    ],
  },
  {
    category: "Products & Sizing",
    items: [
      {
        q: "What sizes do you offer?",
        a: "We offer sizes from Newborn (NB) up to 3 years. Each product page includes a detailed size guide with measurements in both centimeters and inches to help you find the perfect fit.",
      },
      {
        q: "What materials are used?",
        a: "Our baby clothing is made with 100% soft cotton and natural fabrics. All materials are OEKO-TEX tested, free from harmful chemicals, and safe for your baby's sensitive skin.",
      },
      {
        q: "How should I care for the clothes?",
        a: "We recommend machine washing on a gentle cycle with cold water. Tumble dry on low or hang dry. Avoid bleach and harsh detergents. Specific care instructions are included on each product page and garment label.",
      },
      {
        q: "Are the dyes safe for babies?",
        a: "Yes, all our fabrics use non-toxic, azo-free dyes that are completely safe for babies. Our products contain no small parts or choking hazards.",
      },
    ],
  },
  {
    category: "Payments & Returns",
    items: [
      {
        q: "What payment methods do you accept?",
        a: "We accept Cash on Delivery (COD) and eSewa digital wallet. We're working on adding more payment options including Khalti and card payments.",
      },
      {
        q: "Can I return or exchange an item?",
        a: "Yes, we accept returns within 7 days of delivery for unworn, unwashed items with original tags attached. Please visit our Returns & Refunds page for the full policy.",
      },
      {
        q: "How do refunds work?",
        a: "Once we receive and inspect your returned item, we'll process your refund within 3–5 business days. For COD orders, refunds are issued via eSewa or bank transfer.",
      },
    ],
  },
  {
    category: "Account & General",
    items: [
      {
        q: "Do I need an account to order?",
        a: "Yes, an account is required to place orders. This allows you to track orders, save your wishlist, and manage your shipping addresses. Registration is quick and free!",
      },
      {
        q: "Are your products handmade?",
        a: "Yes! Every piece is handcrafted by skilled artisans in Nepal. We're a small family brand — each garment is made with a mother's care and attention to detail.",
      },
      {
        q: "Can I send items as a gift?",
        a: "Absolutely! During checkout, you can mark your order as a gift and include a personal message. We'll make sure the gift is presentation-ready.",
      },
    ],
  },
];

const AccordionItem = ({ question, answer }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-[var(--color-border)] last:border-b-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between py-4 text-left group"
      >
        <span className="font-medium text-sm pr-4 group-hover:text-[var(--color-primary)] transition-colors">
          {question}
        </span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-[var(--color-primary)] flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[var(--color-text-muted)] flex-shrink-0" />
        )}
      </button>
      {open && (
        <div className="pb-4 text-sm text-[var(--color-text-muted)] leading-relaxed">
          {answer}
        </div>
      )}
    </div>
  );
};

const FAQ = () => {
  return (
    <div className="container-app py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] mb-6">
        <Link to="/" className="hover:text-[var(--color-primary)]">Home</Link>
        <span>/</span>
        <span className="text-[var(--color-text)]">FAQ</span>
      </nav>

      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            Frequently Asked Questions
          </h1>
          <p className="text-[var(--color-text-muted)]">
            Everything you need to know about shopping at Nevan Handicraft
          </p>
        </div>

        <div className="space-y-8">
          {faqs.map((section) => (
            <div key={section.category}>
              <h2 className="text-lg font-semibold mb-3 text-[var(--color-primary)]">
                {section.category}
              </h2>
              <div className="card">
                {section.items.map((item) => (
                  <AccordionItem
                    key={item.q}
                    question={item.q}
                    answer={item.a}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Still have questions */}
        <div className="mt-12 text-center card p-8">
          <h3 className="text-lg font-semibold mb-2">Still have questions?</h3>
          <p className="text-sm text-[var(--color-text-muted)] mb-4">
            We're here to help! Reach out to us anytime.
          </p>
          <Link to="/contact" className="btn btn-primary">
            Contact Us
          </Link>
        </div>
      </div>
    </div>
  );
};

export default FAQ;
