/**
 * Home Page
 * Hero, store promises, recently viewed, shop by age, most loved, categories, brand story,
 * new arrivals, real customer reviews, size help and newsletter sign-up
 */
import { useState, useEffect } from "react";
import { Sparkles, Truck, Banknote, RotateCcw, Gift } from "lucide-react";
import { productsAPI, categoriesAPI } from "../api";
import { reviewsAPI, type FeaturedReview } from "../api/contact";
import ProductCard from "../components/ProductCard";
import RecentlyViewed from "../components/RecentlyViewed";
import HeroCarousel from "../components/home/HeroCarousel";
import SectionHeader from "../components/home/SectionHeader";
import ShopByAge from "../components/home/ShopByAge";
import CategoryShowcase from "../components/home/CategoryShowcase";
import BrandStory from "../components/home/BrandStory";
import ProductRail from "../components/home/ProductRail";
import ReviewsSection from "../components/home/ReviewsSection";
import HelpBand from "../components/home/HelpBand";
import NewsletterSection from "../components/home/NewsletterSection";
import { ProductGridSkeleton } from "../components/ui/Skeleton";
import { formatPrice } from "../utils/helpers";
import { FREE_SHIPPING_THRESHOLD, RETURN_WINDOW_DAYS } from "../config/store";
import { usePageTitle } from "../hooks/usePageTitle";
import { useCampaign } from "../context/CampaignContext";
import type { ICategory, IProduct } from "../types";

const PROMISES = [
  { icon: Banknote, title: "Cash on delivery", text: "Or pay securely with eSewa" },
  { icon: Truck, title: "Delivery across Nepal", text: "3–5 days in Kathmandu Valley" },
  { icon: Gift, title: "Free shipping", text: `On orders over ${formatPrice(FREE_SHIPPING_THRESHOLD)}` },
  { icon: RotateCcw, title: `${RETURN_WINDOW_DAYS}-day returns`, text: `Request within ${RETURN_WINDOW_DAYS} days of delivery` },
];

const Home = () => {
  usePageTitle(null);
  const { campaign, isPreview } = useCampaign();
  const heroCampaign = campaign && (isPreview || campaign.state === "live") ? campaign : null;
  const [featuredProducts, setFeaturedProducts] = useState<IProduct[]>([]);
  const [newArrivals, setNewArrivals] = useState<IProduct[]>([]);
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [reviews, setReviews] = useState<FeaturedReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // Each section loads independently so one failure doesn't blank the page
      const [featuredRes, categoriesRes, newRes, reviewsRes] = await Promise.allSettled([
        productsAPI.getFeatured(8),
        categoriesAPI.getCategories(),
        productsAPI.getProducts({ sort: "-createdAt", limit: 10 }),
        reviewsAPI.getFeatured(3),
      ]);
      if (featuredRes.status === "fulfilled") setFeaturedProducts(featuredRes.value.data.products || []);
      if (categoriesRes.status === "fulfilled") setCategories(categoriesRes.value.data.categories || []);
      if (newRes.status === "fulfilled") setNewArrivals(newRes.value.data.products || []);
      if (reviewsRes.status === "fulfilled") setReviews(reviewsRes.value.data.reviews || []);
      setLoading(false);
    };
    fetchData();
  }, []);

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

      {/* Returning shoppers: just below the fold, so no scroll-in fade */}
      <RecentlyViewed reveal={false} />

      <ShopByAge />

      {/* Most loved */}
      {(loading || featuredProducts.length > 0) && (
        <section aria-labelledby="most-loved-title" className="py-12 md:py-16 bg-[var(--color-surface-muted)]">
          <div className="container-app reveal">
            <SectionHeader
              id="most-loved-title"
              eyebrow="Bestsellers"
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

      <CategoryShowcase categories={categories} loading={loading} />

      <BrandStory />

      <ProductRail
        id="new-arrivals-title"
        title="New arrivals"
        subtitle="Fresh styles just added"
        icon={<Sparkles className="w-5 h-5 text-[var(--color-accent-strong)]" aria-hidden="true" />}
        action={{ to: "/products?sort=-createdAt", label: "See all new" }}
        products={newArrivals}
        loading={loading}
      />

      <ReviewsSection reviews={reviews} />

      {/* Size help and newsletter: two cards closing the page */}
      <div className="container-app py-12 md:py-16 space-y-6 md:space-y-8">
        <HelpBand />
        <NewsletterSection />
      </div>
    </div>
  );
};

export default Home;
