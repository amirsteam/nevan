/**
 * Contact Page
 * The quickest ways to reach the shop first (WhatsApp, call, live chat, email),
 * then a contact form (stored by the API and emailed to the store) with topics,
 * the workshop's hours and map, and quick answers that may save a message.
 */
import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  RotateCcw,
  Ruler,
  Send,
  Truck,
  Wallet,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import toast from "react-hot-toast";
import { contactAPI } from "../api/contact";
import { CONTACT, OPENING_HOURS } from "../config/store";
import { SOCIAL_LINKS } from "../config/social";
import { usePageTitle } from "../hooks/usePageTitle";
import { getErrorMessage } from "../utils/helpers";
import { openStatus } from "../utils/openingHours";
import { useAuth } from "../context/AuthContext";
import { useAppDispatch } from "../store/hooks";
import { openChat } from "../store/chatSlice";
import SizeGuide from "../components/SizeGuide";

type Field = "name" | "email" | "phone" | "orderNumber" | "message";
type FormErrors = Partial<Record<Field, string>>;

const MAP_QUERY = "Taukhal Panauti Nepal";
const MAP_LINK = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(MAP_QUERY)}`;

// What the message is about: sent as the subject, and it tunes the message hint
const TOPICS = [
  { id: "sizes", label: "Sizes & fit", hint: "Your child's age (and height if you know it), and the product you're looking at." },
  { id: "order", label: "An order", hint: "What would you like to know or change about your order?" },
  { id: "delivery", label: "Delivery", hint: "Where should it go, and by when do you need it?" },
  { id: "returns", label: "Returns & exchanges", hint: "What would you like to return or exchange, and why?" },
  { id: "bulk", label: "Bulk or custom order", hint: "What would you like, how many, and by when?" },
  { id: "other", label: "Something else", hint: "How can we help?" },
] as const;
type TopicId = (typeof TOPICS)[number]["id"];

// Same rules as contactValidator in backend/middleware/validate.ts
const validate = (data: Record<Field, string>): FormErrors => {
  const errors: FormErrors = {};
  if (!data.name.trim()) errors.name = "Please tell us your name";
  if (!/^\S+@\S+\.\S+$/.test(data.email.trim())) errors.email = "Please enter a valid email address";
  if (data.phone.trim() && !/^(\+?977)?[0-9]{7,10}$/.test(data.phone.replace(/[\s-]/g, ""))) {
    errors.phone = "Please enter a valid phone number, e.g. 98XXXXXXXX";
  }
  const length = data.message.trim().length;
  if (length < 10) errors.message = "Please write at least 10 characters";
  else if (length > 2000) errors.message = "Please keep your message under 2000 characters";
  return errors;
};

const subjectFor = (topic: TopicId | null, orderNumber: string): string | undefined => {
  if (!topic) return undefined;
  const label = TOPICS.find((t) => t.id === topic)!.label;
  const order = orderNumber.trim();
  return topic === "order" && order ? `${label} — ${order}`.slice(0, 150) : label;
};

const Contact = () => {
  usePageTitle(
    "Contact us",
    "Questions about sizes, orders or delivery? WhatsApp, call, chat or message Nevan Handicraft — we usually reply within a few hours.",
  );
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const [status] = useState(() => openStatus());
  const [showSizeGuide, setShowSizeGuide] = useState(false);

  const [formData, setFormData] = useState<Record<Field, string>>({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    orderNumber: "",
    message: "",
  });
  const [topic, setTopic] = useState<TopicId | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
    if (errors[id as Field]) setErrors((prev) => ({ ...prev, [id]: undefined }));
  };

  const submitHandler = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const found = validate(formData);
    setErrors(found);
    const firstInvalid = (Object.keys(found) as Field[])[0];
    if (firstInvalid) {
      document.getElementById(firstInvalid)?.focus();
      return;
    }

    setLoading(true);
    try {
      const res = await contactAPI.sendMessage({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.replace(/[\s-]/g, "") || undefined,
        subject: subjectFor(topic, formData.orderNumber),
        message: formData.message.trim(),
      });
      toast.success(res.message || "Thanks! We've received your message.");
      setSentTo(formData.email.trim());
      setFormData((prev) => ({ ...prev, orderNumber: "", message: "" }));
      setTopic(null);
    } catch (error) {
      toast.error(getErrorMessage(error, "Couldn't send your message. Please try again or chat with us."));
    } finally {
      setLoading(false);
    }
  };

  const fieldProps = (id: Field) => ({
    id,
    value: formData[id],
    onChange: handleChange,
    "aria-invalid": Boolean(errors[id]),
    "aria-describedby": errors[id] ? `${id}-error` : undefined,
    className: `input ${errors[id] ? "border-[var(--color-error)]" : ""}`,
  });

  const fieldError = (id: Field) =>
    errors[id] ? (
      <p id={`${id}-error`} className="text-sm text-[var(--color-error)]">
        {errors[id]}
      </p>
    ) : null;

  const hint = TOPICS.find((t) => t.id === topic)?.hint ?? "How can we help? Include your order number if it's about an order.";

  const quickCard =
    "group flex h-full flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 md:p-5 text-left shadow-[var(--shadow-sm)] transition-all hover:-translate-y-0.5 hover:border-[var(--color-primary)] hover:shadow-[var(--shadow-md)]";
  const quickIcon = "flex h-11 w-11 items-center justify-center rounded-xl";

  return (
    <div className="pb-16 md:pb-20">
      {/* HEADER */}
      <section className="bg-[var(--color-primary-soft)] pt-10 pb-16 md:pt-14 md:pb-20">
        <div className="container-app text-center md:text-left">
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--color-primary-dark)]">Contact us</p>
          <h1 className="mt-2 text-3xl md:text-5xl font-bold">We're here to help</h1>
          <p className="mt-3 max-w-2xl text-[var(--color-text-muted)] md:text-lg mx-auto md:mx-0">
            Questions about sizes, an order or delivery? Reach us whichever way suits you.
          </p>
          <p
            className={`mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--color-surface)] px-3 py-1.5 text-sm font-medium shadow-[var(--shadow-sm)] ${
              status.open ? "text-[var(--color-success)]" : "text-[var(--color-text-muted)]"
            }`}
          >
            <span
              aria-hidden="true"
              className={`h-2 w-2 rounded-full ${status.open ? "bg-[var(--color-success)] animate-pulse" : "bg-[var(--color-text-muted)]"}`}
            />
            {status.label}
          </p>
        </div>
      </section>

      {/* QUICKEST WAYS TO REACH US */}
      <section aria-labelledby="quick-contact-title" className="container-app -mt-10 relative">
        <h2 id="quick-contact-title" className="sr-only">
          Quick ways to reach us
        </h2>
        <ul className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <li>
            <a href={CONTACT.whatsappHref} target="_blank" rel="noopener noreferrer" className={quickCard}>
              <span className="flex items-start justify-between gap-2">
                <span className={`${quickIcon} bg-[#25d366]/15`}>
                  <FaWhatsapp className="h-6 w-6 text-[#128c4a] dark:text-[#25d366]" aria-hidden="true" />
                </span>
                <span className="rounded-full bg-[var(--color-success)]/10 px-2 py-0.5 text-[11px] font-semibold text-[var(--color-success)]">
                  Fastest
                </span>
              </span>
              <span>
                <span className="block font-semibold">WhatsApp</span>
                <span className="block text-sm text-[var(--color-text-muted)]">{CONTACT.phoneDisplay}</span>
              </span>
              <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-[var(--color-primary)]">
                Message us <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </span>
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </li>
          <li>
            <a href={CONTACT.phoneHref} className={quickCard}>
              <span className={`${quickIcon} bg-[var(--color-primary-soft)]`}>
                <Phone className="h-5 w-5 text-[var(--color-primary)]" aria-hidden="true" />
              </span>
              <span>
                <span className="block font-semibold">Call us</span>
                <span className="block text-sm text-[var(--color-text-muted)]">{CONTACT.phoneDisplay}</span>
              </span>
              <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-[var(--color-primary)]">
                Call now <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </span>
            </a>
          </li>
          <li>
            <button type="button" onClick={() => dispatch(openChat())} className={`${quickCard} w-full`}>
              <span className={`${quickIcon} bg-[var(--color-accent-light)]`}>
                <MessageCircle className="h-5 w-5 text-[var(--color-accent-strong)]" aria-hidden="true" />
              </span>
              <span>
                <span className="block font-semibold">Live chat</span>
                <span className="block text-sm text-[var(--color-text-muted)]">Right here, no account needed</span>
              </span>
              <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-[var(--color-primary)]">
                Start chat <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </span>
            </button>
          </li>
          <li>
            <a href={`mailto:${CONTACT.email}`} className={quickCard}>
              <span className={`${quickIcon} bg-[var(--color-primary-soft)]`}>
                <Mail className="h-5 w-5 text-[var(--color-primary)]" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold">Email</span>
                <span className="block truncate text-sm text-[var(--color-text-muted)]">{CONTACT.email}</span>
              </span>
              <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-[var(--color-primary)]">
                Write to us <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </span>
            </a>
          </li>
        </ul>
        <p className="mt-4 flex items-center justify-center md:justify-start gap-2 text-sm text-[var(--color-text-muted)]">
          <Clock className="h-4 w-4" aria-hidden="true" />
          {CONTACT.replyTime}
        </p>
      </section>

      {/* FORM + VISIT */}
      <div className="container-app mt-10 md:mt-12 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <section aria-labelledby="form-title" className="lg:col-span-7">
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 md:p-8 shadow-[var(--shadow-sm)]">
            <h2 id="form-title" className="text-2xl font-bold mb-1">
              Send us a message
            </h2>
            <p className="text-sm text-[var(--color-text-muted)] mb-6">We'll reply by email, usually within a few hours.</p>

            {sentTo && (
              <div
                role="status"
                className="mb-6 flex items-start gap-3 rounded-xl border border-[var(--color-success)]/30 bg-[var(--color-success)]/10 p-4 text-sm"
              >
                <CheckCircle2 className="w-5 h-5 shrink-0 text-[var(--color-success)]" aria-hidden="true" />
                <p>
                  Message sent — we'll reply to <strong>{sentTo}</strong>. Need to add something? Just send another message.
                </p>
              </div>
            )}

            <form onSubmit={submitHandler} className="space-y-5" noValidate>
              <fieldset>
                <legend className="text-sm font-medium mb-2">
                  What's it about? <span className="font-normal text-[var(--color-text-muted)]">(optional)</span>
                </legend>
                <div className="flex flex-wrap gap-2">
                  {TOPICS.map((t) => {
                    const checked = topic === t.id;
                    return (
                      <label
                        key={t.id}
                        className={`cursor-pointer select-none rounded-full border px-3.5 py-1.5 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--color-primary)] ${
                          checked
                            ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-on-primary)] font-medium"
                            : "border-[var(--color-border)] hover:border-[var(--color-primary)]"
                        }`}
                      >
                        <input
                          type="radio"
                          name="topic"
                          value={t.id}
                          checked={checked}
                          onChange={() => setTopic(t.id)}
                          onClick={() => checked && setTopic(null)}
                          className="sr-only"
                        />
                        {t.label}
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              {topic === "order" && (
                <div className="space-y-1.5">
                  <label htmlFor="orderNumber" className="text-sm font-medium">
                    Order number <span className="font-normal text-[var(--color-text-muted)]">(optional)</span>
                  </label>
                  <input type="text" placeholder="e.g. ORD-20261015-AB12C" maxLength={40} autoComplete="off" {...fieldProps("orderNumber")} />
                  <p className="text-xs text-[var(--color-text-muted)]">
                    It's in your confirmation email and under{" "}
                    <Link to="/orders" className="text-[var(--color-primary)] underline underline-offset-2">
                      My orders
                    </Link>
                    .
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label htmlFor="name" className="text-sm font-medium">
                    Your name <span aria-hidden="true" className="text-[var(--color-error)]">*</span>
                  </label>
                  <input type="text" autoComplete="name" required maxLength={100} {...fieldProps("name")} />
                  {fieldError("name")}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-sm font-medium">
                    Email address <span aria-hidden="true" className="text-[var(--color-error)]">*</span>
                  </label>
                  <input type="email" autoComplete="email" placeholder="name@example.com" required {...fieldProps("email")} />
                  {fieldError("email")}
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="phone" className="text-sm font-medium">
                  Phone <span className="font-normal text-[var(--color-text-muted)]">(optional, if you'd like a call back)</span>
                </label>
                <input type="tel" autoComplete="tel" inputMode="tel" placeholder="98XXXXXXXX" {...fieldProps("phone")} />
                {fieldError("phone")}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="message" className="text-sm font-medium">
                  Message <span aria-hidden="true" className="text-[var(--color-error)]">*</span>
                </label>
                <textarea
                  rows={5}
                  placeholder={hint}
                  required
                  maxLength={2000}
                  {...fieldProps("message")}
                  className={`${fieldProps("message").className} min-h-[150px] resize-y`}
                />
                <div className="flex justify-between gap-3">
                  {fieldError("message")}
                  <span className="ml-auto text-xs text-[var(--color-text-muted)]">{formData.message.trim().length}/2000</span>
                </div>
              </div>

              <button type="submit" disabled={loading} aria-busy={loading} className="btn btn-primary w-full md:w-auto h-12 px-8 text-base">
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" aria-hidden="true" />
                    Send message
                  </>
                )}
              </button>
            </form>
          </div>
        </section>

        <aside aria-labelledby="visit-title" className="lg:col-span-5">
          <div className="h-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 md:p-8 shadow-[var(--shadow-sm)]">
            <h2 id="visit-title" className="text-2xl font-bold mb-5">
              Visit our workshop
            </h2>
            <ul className="space-y-4 text-sm">
              <li className="flex gap-3">
                <MapPin className="h-5 w-5 shrink-0 text-[var(--color-primary)]" aria-hidden="true" />
                <span>
                  <span className="block font-medium">{CONTACT.address}</span>
                  <span className="text-[var(--color-text-muted)]">Where every piece is cut and sewn by hand</span>
                </span>
              </li>
              <li className="flex gap-3">
                <Clock className="h-5 w-5 shrink-0 text-[var(--color-primary)]" aria-hidden="true" />
                <span>
                  <span className="block font-medium">{OPENING_HOURS.label}</span>
                  <span className="text-[var(--color-text-muted)]">{OPENING_HOURS.closedLabel} · Nepal time</span>
                </span>
              </li>
            </ul>

            {/* The map loads lazily; the pin and link show until it does (or if it's blocked) */}
            <div className="relative mt-6 aspect-[4/3] w-full overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]">
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-[var(--color-text-muted)]">
                <MapPin className="h-8 w-8 text-[var(--color-primary)]" aria-hidden="true" />
                {CONTACT.address}
              </div>
              <iframe
                title="Map: Nevan Handicraft, Panauti"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(MAP_QUERY)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                className="relative h-full w-full border-0"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <a
              href={MAP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[var(--color-primary)] hover:underline"
            >
              Open in Google Maps <ArrowRight className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>

            <div className="mt-6 border-t border-[var(--color-border)] pt-5">
              <p className="text-sm font-medium mb-3">See new pieces first</p>
              <div className="flex flex-wrap gap-2">
                {SOCIAL_LINKS.map(({ network, href, logo }) => (
                  <a key={network} href={href} target="_blank" rel="noopener noreferrer" className="btn btn-secondary text-sm px-3 py-2">
                    <img src={logo} alt="" width={20} height={20} loading="lazy" className="h-5 w-5" />
                    {network}
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* QUICK ANSWERS */}
      <section aria-labelledby="answers-title" className="container-app mt-12 md:mt-16">
        <h2 id="answers-title" className="text-2xl font-bold">
          Quick answers
        </h2>
        <p className="mt-1 mb-5 text-[var(--color-text-muted)]">You might find what you need right away.</p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {[
            { icon: Ruler, title: "Which size?", text: "Measurements for every size, 0–7 years.", onClick: () => setShowSizeGuide(true) },
            { icon: Truck, title: "Delivery", text: "Costs, free-shipping and delivery times.", to: "/shipping" },
            { icon: RotateCcw, title: "Returns & exchanges", text: "How to return or swap a size.", to: "/returns" },
            { icon: Wallet, title: "Paying", text: "Cash on delivery or eSewa — and more FAQs.", to: "/faq" },
          ].map(({ icon: Icon, title, text, to, onClick }) => {
            const body = (
              <>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-soft)]">
                  <Icon className="h-5 w-5 text-[var(--color-primary)]" aria-hidden="true" />
                </span>
                <span>
                  <span className="block font-semibold">{title}</span>
                  <span className="block text-sm text-[var(--color-text-muted)]">{text}</span>
                </span>
              </>
            );
            const className =
              "flex h-full w-full items-start gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-left transition-colors hover:border-[var(--color-primary)]";
            return (
              <li key={title}>
                {to ? (
                  <Link to={to} className={className}>
                    {body}
                  </Link>
                ) : (
                  <button type="button" onClick={onClick} className={className}>
                    {body}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        <p className="mt-5 flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
          <Package className="h-4 w-4" aria-hidden="true" />
          Already ordered?{" "}
          <Link to="/orders" className="font-medium text-[var(--color-primary)] hover:underline">
            Track it under My orders
          </Link>
        </p>
      </section>

      <SizeGuide isOpen={showSizeGuide} onClose={() => setShowSizeGuide(false)} />
    </div>
  );
};

export default Contact;
