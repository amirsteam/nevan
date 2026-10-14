/**
 * About Page
 * Who makes the clothes (Anjana Shrestha, Panauti), how the brand grew, the
 * Outstanding Entrepreneur Award 2082, values, real reviews and how to reach us.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Award, Baby, Heart, Leaf, Mail, MapPin, MessageCircle, Phone, Truck } from "lucide-react";
import { FaFacebook, FaInstagram } from "react-icons/fa";
import Breadcrumb from "../components/ui/Breadcrumb";
import ReviewsSection from "../components/home/ReviewsSection";
import { reviewsAPI, type FeaturedReview } from "../api/contact";
import { CONTACT, FABRIC, STORE_SLOGAN } from "../config/store";
import { usePageTitle } from "../hooks/usePageTitle";
import { useShippingSettings } from "../hooks/useShippingSettings";
import { freeAreaNames } from "../utils/shippingText";
import CategoryThumb from "../components/CategoryThumb";
// Cropped and resized from founder.jpg
import founder480 from "../assets/founder-480.jpg";
import founder960 from "../assets/founder-960.jpg";
import certificate from "../assets/award-certificate.jpg";

const FOUNDER = "Anjana Shrestha";
const AWARD = "Outstanding Entrepreneur Award 2082";

const MILESTONES = [
  {
    when: "The Covid years",
    title: "Nevan Collection",
    text: `${FOUNDER} began sewing reusable, eco-friendly cloth masks — the first Nevan brand.`,
  },
  {
    when: "Becoming a mother",
    title: "Nevan Sprouts",
    text: "Motherhood brought a new idea: baby clothes that are soft, comfortable and made by hand.",
  },
  {
    when: "Today",
    title: "Nevan Handicraft",
    text: "Both brands now grow together under one name, made in Panauti, Kavrepalanchok.",
  },
  {
    when: "2082 BS",
    title: AWARD,
    text: "Honoured by the Office of Industry and Commerce, Kavrepalanchok, on the 11th Industry Day.",
  },
];

const VALUES = [
  { icon: Heart, title: "Handmade with love", text: "Every piece is crafted with warmth, patience and intention — the care a mother gives." },
  { icon: Leaf, title: `Soft ${FABRIC}`, text: `Breathable ${FABRIC}, gentle on a baby's skin — crafted slowly and thoughtfully.` },
  { icon: Baby, title: "For moms, by moms", text: "We know the small details that matter for comfort and quality, because we're moms too." },
];

const eyebrow = "text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)] mb-2";
const contactText = "flex items-center gap-3 py-2";
const contactRow = `${contactText} hover:text-[var(--color-primary)] transition-colors`;

const About = () => {
  usePageTitle(
    "About us",
    `Meet ${FOUNDER}, the mother behind Nevan Handicraft's handmade ${FABRIC} baby clothing in Panauti, Nepal — winner of the ${AWARD}.`,
  );
  const shipping = useShippingSettings();
  const freeAreas = freeAreaNames(shipping);
  const [reviews, setReviews] = useState<FeaturedReview[]>([]);

  useEffect(() => {
    reviewsAPI
      .getFeatured(3)
      .then((res) => setReviews(res.data.reviews || []))
      .catch(() => {
        // The section stays hidden without reviews
      });
  }, []);

  return (
    <div>
      {/* Hero: who makes the clothes */}
      <section aria-labelledby="about-title" className="bg-[var(--color-primary-soft)] overflow-clip">
        <div className="container-app pt-6 pb-14 md:pb-20">
          <Breadcrumb items={[{ label: "About us" }]} className="mb-8 md:mb-12" />
          <div className="grid lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] gap-10 lg:gap-16 items-center">
            <div className="max-w-xl">
              <p className={eyebrow}>Our story</p>
              <h1 id="about-title" className="text-4xl md:text-5xl font-bold leading-tight mb-5">
                A mother's love, stitched into every creation
              </h1>
              <p className="text-lg text-[var(--color-text-muted)] leading-relaxed">
                Nevan Handicraft is the work of <strong className="text-[var(--color-text)]">{FOUNDER}</strong>, a mother and maker
                in Panauti, Kavrepalanchok. Every piece is made by hand in {FABRIC}, with the care she would want for her own
                child.
              </p>
              <p className="mt-5 font-display text-xl md:text-2xl italic text-[var(--color-primary)]">“{STORE_SLOGAN}.”</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/products" className="btn btn-primary px-6 py-3">
                  Shop baby clothing
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
                <a href="#award" className="btn btn-secondary bg-[var(--color-surface)] px-6 py-3">
                  <Award className="w-4 h-4 text-[var(--color-primary)]" aria-hidden="true" />
                  See her award
                </a>
              </div>
            </div>

            <figure className="relative w-full max-w-sm sm:max-w-md mx-auto lg:mr-0">
              <span aria-hidden="true" className="absolute inset-0 translate-x-3 translate-y-3 md:translate-x-5 md:translate-y-5 rounded-[2rem] bg-[var(--color-brand)]/20" />
              <img
                src={founder480}
                srcSet={`${founder480} 480w, ${founder960} 960w`}
                sizes="(min-width: 640px) 28rem, 90vw"
                alt={`${FOUNDER}, founder of Nevan Handicraft, holding her ${AWARD} certificate`}
                width={480}
                height={640}
                fetchPriority="high"
                className="relative w-full aspect-[4/5] object-cover rounded-[2rem] shadow-[var(--shadow-lg)]"
              />
              <figcaption className="absolute left-4 -bottom-5 md:-left-6 inline-flex items-center gap-2 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] px-4 py-2 text-sm font-medium shadow-[var(--shadow-md)]">
                <Award className="w-4 h-4 text-[var(--color-primary)]" aria-hidden="true" />
                {FOUNDER} · Outstanding Entrepreneur 2082
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* How the brand grew (also explains the three Nevan names) */}
      <section aria-labelledby="journey-title" className="py-14 md:py-20">
        <div className="container-app">
          <div className="max-w-2xl mb-10">
            <p className={eyebrow}>How Nevan grew</p>
            <h2 id="journey-title" className="text-3xl md:text-4xl font-bold">
              From cloth masks to baby clothes
            </h2>
          </div>
          <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-0">
            {MILESTONES.map((m, i) => (
              <li key={m.title} className="relative lg:pr-8">
                {/* Line between steps on wide screens */}
                {i < MILESTONES.length - 1 && (
                  <span aria-hidden="true" className="hidden lg:block absolute top-5 left-10 right-0 h-px bg-[var(--color-border-strong)]" />
                )}
                <span
                  aria-hidden="true"
                  className="relative z-10 w-10 h-10 rounded-full bg-[var(--color-primary)] text-[var(--color-on-primary)] font-semibold flex items-center justify-center"
                >
                  {i + 1}
                </span>
                <p className="mt-4 text-sm text-[var(--color-text-muted)]">{m.when}</p>
                <h3 className="mt-1 text-lg font-semibold flex items-center gap-3">
                  {/* The two brands show their logos */}
                  <CategoryThumb category={{ slug: "", name: m.title }} size={56} />
                  {m.title}
                </h3>
                <p className="mt-2 text-[var(--color-text-muted)] leading-relaxed">{m.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* The award */}
      <section id="award" aria-labelledby="award-title" className="py-14 md:py-20 bg-[var(--color-surface-muted)] scroll-mt-20">
        <div className="container-app grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <figure className="order-last lg:order-first">
            <a
              href={certificate}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-2xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-md)] transition-shadow hover:shadow-[var(--shadow-lg)]"
            >
              <img
                src={certificate}
                alt={`${AWARD} certificate (सम्मान-पत्र) from the Office of Industry and Commerce, Dhulikhel, Kavrepalanchok, presented to ${FOUNDER}, proprietor of Nevan Handicraft`}
                width={720}
                height={501}
                loading="lazy"
                decoding="async"
                className="w-full h-auto"
              />
            </a>
            <figcaption className="mt-3 text-sm text-[var(--color-text-muted)]">
              The certificate, in Nepali. Select it to open it full size.
            </figcaption>
          </figure>

          <div className="max-w-xl">
            <p className={eyebrow}>Recognition</p>
            <h2 id="award-title" className="text-3xl md:text-4xl font-bold mb-2">
              Honoured for making in Nepal
            </h2>
            <p lang="ne" className="text-[var(--color-text-muted)] mb-6">
              उत्कृष्ट उद्यमी सम्मान २०८२
            </p>
            <div className="space-y-4 text-lg leading-relaxed">
              <p>
                On the 11th Industry Day, the Office of Industry and Commerce in Dhulikhel, Kavrepalanchok (Government of Bagmati
                Province), presented {FOUNDER}, proprietor of Nevan Handicraft, with the{" "}
                <strong>{AWARD}</strong>.
              </p>
              <p className="text-[var(--color-text-muted)]">
                It recognises her work making goods in Nepal instead of importing them, and creating jobs in the community.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section aria-labelledby="values-title" className="py-14 md:py-20">
        <div className="container-app">
          <div className="max-w-2xl mb-10">
            <p className={eyebrow}>What we care about</p>
            <h2 id="values-title" className="text-3xl md:text-4xl font-bold">
              Made the way a mother would want
            </h2>
          </div>
          <ul className="grid md:grid-cols-3 gap-5">
            {VALUES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] p-6">
                <span className="w-12 h-12 rounded-full bg-[var(--color-primary-soft)] flex items-center justify-center mb-5">
                  <Icon className="w-6 h-6 text-[var(--color-primary)]" aria-hidden="true" />
                </span>
                <h3 className="text-lg font-semibold mb-2">{title}</h3>
                <p className="text-[var(--color-text-muted)] leading-relaxed">{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Real reviews (hidden until there are some) */}
      <ReviewsSection reviews={reviews} />

      {/* Where we are and how to reach us */}
      <section aria-labelledby="reach-title" className="py-14 md:py-20">
        <div className="container-app grid lg:grid-cols-2 gap-10 lg:gap-16">
          <div className="max-w-xl">
            <p className={eyebrow}>Say hello</p>
            <h2 id="reach-title" className="text-3xl md:text-4xl font-bold mb-4">
              Made in Panauti, Kavre
            </h2>
            <p className="text-lg text-[var(--color-text-muted)] leading-relaxed">
              Questions about sizes, fabrics or a gift? Call or message {FOUNDER.split(" ")[0]} and the team directly.
            </p>
            {freeAreas.length > 0 && (
              <p className="mt-5 inline-flex items-start gap-2 rounded-lg bg-[var(--color-primary-soft)] px-4 py-3 text-sm">
                <Truck className="w-4 h-4 mt-0.5 shrink-0 text-[var(--color-primary)]" aria-hidden="true" />
                <span>
                  <strong>Free delivery</strong> to {freeAreas.join(", ")}, whatever the order amount.
                </span>
              </p>
            )}
          </div>

          <ul className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] p-6 divide-y divide-[var(--color-border)]">
            <li>
              <p className={contactText}>
                <MapPin className="w-5 h-5 text-[var(--color-primary)] shrink-0" aria-hidden="true" />
                {CONTACT.address}
              </p>
            </li>
            <li>
              <a href={CONTACT.phoneHref} className={contactRow}>
                <Phone className="w-5 h-5 text-[var(--color-primary)] shrink-0" aria-hidden="true" />
                {CONTACT.phoneDisplay}
              </a>
            </li>
            <li>
              <a href={CONTACT.whatsappHref} target="_blank" rel="noopener noreferrer" className={contactRow}>
                <MessageCircle className="w-5 h-5 text-[var(--color-primary)] shrink-0" aria-hidden="true" />
                WhatsApp us
              </a>
            </li>
            <li>
              <a href={`mailto:${CONTACT.email}`} className={`${contactRow} break-all`}>
                <Mail className="w-5 h-5 text-[var(--color-primary)] shrink-0" aria-hidden="true" />
                {CONTACT.email}
              </a>
            </li>
            <li className="flex gap-6">
              <a href={CONTACT.facebook} target="_blank" rel="noopener noreferrer" className={contactRow}>
                <FaFacebook className="w-5 h-5 text-[var(--color-primary)]" aria-hidden="true" />
                Facebook
              </a>
              <a href={CONTACT.instagram} target="_blank" rel="noopener noreferrer" className={contactRow}>
                <FaInstagram className="w-5 h-5 text-[var(--color-primary)]" aria-hidden="true" />
                Instagram
              </a>
            </li>
          </ul>
        </div>
      </section>

      {/* Closing */}
      <section aria-labelledby="thanks-title" className="pb-16 md:pb-24">
        <div className="container-app">
          <div className="rounded-3xl bg-[var(--color-primary-soft)] px-6 py-12 md:px-12 text-center">
            <Heart className="w-10 h-10 text-[var(--color-primary)] mx-auto mb-5" aria-hidden="true" />
            <h2 id="thanks-title" className="text-3xl font-bold mb-3">
              Thank you for choosing handmade
            </h2>
            <p className="font-display italic text-lg text-[var(--color-primary)] mb-3">{STORE_SLOGAN}.</p>
            <p className="max-w-2xl mx-auto text-lg text-[var(--color-text-muted)] leading-relaxed">
              To every mom, every family and every supporter: thank you for helping a small Nepali business grow.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/products" className="btn btn-primary px-6 py-3">
                Shop the collection
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
              <Link to="/contact" className="btn btn-secondary bg-[var(--color-surface)] px-6 py-3">
                <Mail className="w-4 h-4" aria-hidden="true" />
                Contact us
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
