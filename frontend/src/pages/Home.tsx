/**
 * Home Page
 * Hero, store promises, shop by age, featured products, categories,
 * new arrivals, real customer reviews and newsletter sign-up
 */
import { useState, useEffect, FormEvent } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowRight, Sparkles, Truck, Banknote, RotateCcw, Gift, Loader2, Star, Quote, BadgeCheck } from "lucide-react";
import { productsAPI, categoriesAPI } from "../api";
import { contactAPI, reviewsAPI, type FeaturedReview } from "../api/contact";
import ProductCard from "../components/ProductCard";
import HeroCarousel from "../components/home/HeroCarousel";
import { ProductGridSkeleton } from "../components/ui/Skeleton";
import { formatPrice, getErrorMessage } from "../utils/helpers";
import { imageUrl, onImageError } from "../utils/image";
import { AGE_GROUPS, FREE_SHIPPING_THRESHOLD, RETURN_WINDOW_DAYS, formatAgeGroup } from "../config/store";
import { usePageTitle } from "../hooks/usePageTitle";
import { useCampaign } from "../context/CampaignContext";
import type { ICategory, IProduct } from "../types";

const AGE_LABELS: Record<string, { label: string; emoji: string }> = {
  "0-3 Months": { label: "Newborn", emoji: "🍼" },
  "3-6 Months": { label: "Infant", emoji: "👶" },
  "6-12 Months": { label: "Crawler", emoji: "🙌" },
  "1-2 Years": { label: "Toddler", emoji: "🚶" },
  "2-4 Years": { label: "Little kid", emoji: "⭐" },
  "4-6 Years": { label: "Big kid", emoji: "🎒" },
  "6-10 Years": { label: "Junior", emoji: "🎈" },
};

const PROMISES = [
  { icon: Banknote, title: "Cash on delivery", text: "Or pay securely with eSewa" },
  { icon: Truck, title: "Delivery across Nepal", text: "3–5 days in Kathmandu Valley" },
  { icon: Gift, title: "Free shipping", text: `On orders over ${formatPrice(FREE_SHIPPING_THRESHOLD)}` },
  { icon: RotateCcw, title: `${RETURN_WINDOW_DAYS}-day returns`, text: "Request within 7 days of delivery" },
];

const SectionHeader = ({
  title,
  subtitle,
  action,
  icon,
}: {
  title: string;
  subtitle?: string;
  action?: { to: string; label: string };
  icon?: React.ReactNode;
}) => (
  <div className="flex flex-wrap justify-between items-end gap-3 mb-6 md:mb-8">
    <div>
      <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
        {icon}
        {title}
      </h2>
      {subtitle && <p className="text-[var(--color-text-muted)] mt-1">{subtitle}</p>}
    </div>
    {action && (
      <Link
        to={action.to}
        className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-primary)] hover:underline underline-offset-4"
      >
        {action.label}
        <ArrowRight className="w-4 h-4" aria-hidden="true" />
      </Link>
    )}
  </div>
);

const Home = () => {
  usePageTitle(null);
  const { campaign, isPreview } = useCampaign();
  const heroCampaign = campaign && (isPreview || campaign.state === "live") ? campaign : null;
  const [featuredProducts, setFeaturedProducts] = useState<IProduct[]>([]);
  const [newArrivals, setNewArrivals] = useState<IProduct[]>([]);
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [reviews, setReviews] = useState<FeaturedReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterLoading, setNewsletterLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      // Each section loads independently so one failure doesn't blank the page
      const [featuredRes, categoriesRes, newRes, reviewsRes] = await Promise.allSettled([
        productsAPI.getFeatured(8),
        categoriesAPI.getCategories(),
        productsAPI.getProducts({ sort: "-createdAt", limit: 4 }),
        reviewsAPI.getFeatured(3),
      ]);
      if (featuredRes.status === "fulfilled") setFeaturedProducts(featuredRes.value.data.products || []);
      if (categoriesRes.status === "fulfilled") setCategories((categoriesRes.value.data.categories || []).slice(0, 6));
      if (newRes.status === "fulfilled") setNewArrivals(newRes.value.data.products || []);
      if (reviewsRes.status === "fulfilled") setReviews(reviewsRes.value.data.reviews || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleNewsletter = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const email = newsletterEmail.trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }
    setNewsletterLoading(true);
    try {
      const res = await contactAPI.subscribe(email, "home");
      toast.success(res.message || "You're subscribed!");
      setSubscribed(true);
      setNewsletterEmail("");
    } catch (error) {
      toast.error(getErrorMessage(error, "Couldn't subscribe right now. Please try again."));
    } finally {
      setNewsletterLoading(false);
    }
  };

  return (
    <div>
      {/* Hero carousel */}
      <div className="container-app pt-4 md:pt-6 pb-6 md:pb-8">
        <HeroCarousel products={featuredProducts} loading={loading} campaign={heroCampaign} />
      </div>

      {/* Store promises */}
      <section aria-label="Why shop with us" className="bg-[var(--color-surface)] border-y border-[var(--color-border)]">
        <ul className="container-app grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 py-6 md:py-8">
          {PROMISES.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-center gap-3">
              <span className="w-11 h-11 shrink-0 bg-[var(--color-primary-soft)] rounded-full flex items-center justify-center">
                <Icon className="w-5 h-5 text-[var(--color-primary)]" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-sm">{title}</p>
                <p className="text-xs text-[var(--color-text-muted)]">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Shop by Age */}
      <section id="shop-by-age" className="py-12 md:py-16 scroll-mt-20">
        <div className="container-app">
          <SectionHeader title="Shop by age" subtitle="Find the right fit for your growing baby" />
          <ul className="flex md:grid md:grid-cols-4 lg:grid-cols-7 gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:overflow-visible">
            {AGE_GROUPS.map((age) => (
              <li key={age} className="snap-start shrink-0 w-[42%] sm:w-[30%] md:w-auto">
                <Link
                  to={`/products?age=${encodeURIComponent(age)}`}
                  className="group flex flex-col items-center gap-2 p-4 h-full bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:shadow-[var(--shadow-md)] transition-all"
                >
                  <span className="text-3xl" aria-hidden="true">
                    {AGE_LABELS[age]?.emoji}
                  </span>
                  <span className="text-center">
                    <span className="block font-semibold text-sm group-hover:text-[var(--color-primary)] transition-colors">
                      {AGE_LABELS[age]?.label}
                    </span>
                    <span className="block text-xs text-[var(--color-text-muted)]">{formatAgeGroup(age)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Featured Products */}
      {(loading || featuredProducts.length > 0) && (
        <section className="py-12 md:py-16 bg-[var(--color-surface-muted)]">
          <div className="container-app">
            <SectionHeader
              title="Most loved"
              subtitle="Our favourite baby essentials"
              action={{ to: "/products?sort=-soldCount", label: "View all" }}
            />
            {loading ? (
              <ProductGridSkeleton count={4} />
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {featuredProducts.map((product, i) => (
                  <ProductCard key={product._id} product={product} priority={i < 2} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Categories */}
      {categories.length > 0 && (
        <section className="py-12 md:py-16">
          <div className="container-app">
            <SectionHeader
              title="Shop by category"
              subtitle="Find the perfect outfit for your little one"
              action={{ to: "/categories", label: "All categories" }}
            />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              {categories.map((category) => (
                <Link
                  key={category._id}
                  to={`/products?category=${category.slug}`}
                  className="group relative aspect-[4/3] rounded-xl overflow-hidden bg-[var(--color-primary-soft)]"
                >
                  {category.image?.url && (
                    <img
                      src={imageUrl(category.image.url, 480)}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      onError={onImageError}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4 text-white">
                    <h3 className="font-semibold md:text-lg">{category.name}</h3>
                    {!!category.productCount && (
                      <p className="text-xs md:text-sm text-white/80">{category.productCount} products</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* New Arrivals */}
      {(loading || newArrivals.length > 0) && (
        <section className="py-12 md:py-16 bg-[var(--color-surface-muted)]">
          <div className="container-app">
            <SectionHeader
              title="New arrivals"
              subtitle="Fresh styles just added"
              icon={<Sparkles className="w-5 h-5 text-[var(--color-accent-strong)]" aria-hidden="true" />}
              action={{ to: "/products?sort=-createdAt", label: "See all new" }}
            />
            {loading ? (
              <ProductGridSkeleton count={4} />
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {newArrivals.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Real customer reviews (hidden until there are some) */}
      {reviews.length > 0 && (
        <section className="py-12 md:py-16">
          <div className="container-app">
            <SectionHeader title="What parents are saying" subtitle="Recent reviews from our customers" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              {reviews.map((review) => (
                <figure key={review._id} className="card p-6 flex flex-col">
                  <Quote className="w-8 h-8 text-[var(--color-primary-light)] mb-3" aria-hidden="true" />
                  <blockquote className="text-sm leading-relaxed flex-1">
                    {review.title && <p className="font-semibold mb-1">{review.title}</p>}
                    <p>{review.comment}</p>
                  </blockquote>
                  <figcaption className="mt-4 pt-4 border-t border-[var(--color-border)]">
                    <div className="flex items-center gap-0.5 mb-2" role="img" aria-label={`${review.rating} out of 5 stars`}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          aria-hidden="true"
                          className={`w-3.5 h-3.5 ${
                            star <= review.rating ? "fill-amber-400 text-amber-400" : "text-[var(--color-border-strong)]"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="font-semibold text-sm flex items-center gap-1.5">
                      {review.reviewerName}
                      {review.isVerifiedPurchase && (
                        <span className="inline-flex items-center gap-0.5 text-xs font-medium text-[var(--color-success)]">
                          <BadgeCheck className="w-3.5 h-3.5" aria-hidden="true" />
                          Verified purchase
                        </span>
                      )}
                    </p>
                    {review.product && (
                      <Link
                        to={`/products/${review.product.slug}`}
                        className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
                      >
                        {review.product.name}
                      </Link>
                    )}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Newsletter */}
      <section className="py-12 md:py-16 bg-[var(--color-primary-soft)]">
        <div className="container-app text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">Join our newsletter</h2>
          <p className="text-[var(--color-text-muted)] mb-6 max-w-md mx-auto">
            New arrivals and offers, about twice a month. Unsubscribe anytime.
          </p>
          {subscribed ? (
            <p role="status" className="font-medium text-[var(--color-success)]">
              Thanks! You're on the list.
            </p>
          ) : (
            <form onSubmit={handleNewsletter} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto" noValidate>
              <label htmlFor="newsletter-email" className="sr-only">
                Email address
              </label>
              <input
                id="newsletter-email"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="you@example.com"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                className="input flex-1"
                required
              />
              <button type="submit" disabled={newsletterLoading} aria-busy={newsletterLoading} className="btn btn-primary">
                {newsletterLoading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : null}
                Subscribe
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
};

export default Home;
