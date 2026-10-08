/**
 * Newsletter sign-up plus the store's social accounts.
 */
import { useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { FaFacebook, FaInstagram } from "react-icons/fa";
import { contactAPI } from "../../api/contact";
import { CONTACT } from "../../config/store";
import { getErrorMessage } from "../../utils/helpers";

/** "https://www.instagram.com/nevancollection/" -> "@nevancollection" */
const handleFrom = (url: string): string => `@${url.replace(/\/+$/, "").split("/").pop()}`;

const SOCIALS = [
  { href: CONTACT.instagram, icon: FaInstagram, network: "Instagram", text: "New pieces and little ones wearing them" },
  { href: CONTACT.facebook, icon: FaFacebook, network: "Facebook", text: "Offers, festival sales and updates" },
];

const NewsletterSection = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const value = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(value)) {
      toast.error("Please enter a valid email address");
      return;
    }
    setLoading(true);
    try {
      const res = await contactAPI.subscribe(value, "home");
      toast.success(res.message || "You're subscribed!");
      setSubscribed(true);
      setEmail("");
    } catch (error) {
      toast.error(getErrorMessage(error, "Couldn't subscribe right now. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section aria-labelledby="newsletter-title">
      <div className="reveal relative overflow-hidden rounded-3xl bg-[var(--color-primary-soft)] px-6 py-10 md:px-12 md:py-14 grid lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-10 items-center">
        {/* Soft shapes, decoration only */}
        <span aria-hidden="true" className="absolute -right-20 -top-24 w-72 h-72 rounded-full bg-[var(--color-brand)]/15" />
        <span aria-hidden="true" className="absolute right-1/3 -bottom-28 w-56 h-56 rounded-full bg-[var(--color-accent)]/15" />

        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)] mb-2">Stay in the loop</p>
          <h2 id="newsletter-title" className="text-2xl md:text-4xl font-bold mb-3">
            Join the Nevan family
          </h2>
          <p className="text-[var(--color-text-muted)] mb-6 max-w-md">
            New arrivals and offers, about twice a month. Unsubscribe anytime.
          </p>
          {subscribed ? (
            <p role="status" className="inline-flex items-center gap-2 font-medium text-[var(--color-success)]">
              <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
              Thanks! You're on the list.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-lg" noValidate>
              <label htmlFor="newsletter-email" className="sr-only">
                Email address
              </label>
              <div className="input-group flex-1">
                <Mail className="input-icon w-4 h-4" aria-hidden="true" />
                <input
                  id="newsletter-email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input py-3"
                  required
                />
              </div>
              <button type="submit" disabled={loading} aria-busy={loading} className="btn btn-primary px-6 py-3">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : null}
                Subscribe
              </button>
            </form>
          )}
        </div>

        <ul className="relative grid gap-3">
          {SOCIALS.map(({ href, icon: Icon, network, text }) => (
            <li key={network}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] p-4 transition-all hover:border-[var(--color-primary)] hover:shadow-[var(--shadow-md)]"
              >
                <span className="w-11 h-11 shrink-0 rounded-full bg-[var(--color-primary-soft)] flex items-center justify-center">
                  <Icon className="w-5 h-5 text-[var(--color-primary)]" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold text-sm group-hover:text-[var(--color-primary)] transition-colors">
                    {handleFrom(href)} on {network}
                    <span className="sr-only"> (opens in a new tab)</span>
                  </span>
                  <span className="block text-xs text-[var(--color-text-muted)]">{text}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default NewsletterSection;
