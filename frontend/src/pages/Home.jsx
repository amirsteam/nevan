/**
 * Home Page
 * Landing page with hero, featured products, and categories
 */
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { productsAPI, categoriesAPI } from "../api";
import { formatPrice, calculateDiscount } from "../utils/helpers";
import toast from "react-hot-toast";
import {
  ArrowRight,
  Sparkles,
  Heart,
  Leaf,
  ShieldCheck,
  Baby,
  Loader2,
  Star,
  Quote,
} from "lucide-react";

const Home = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterLoading, setNewsletterLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsRes, categoriesRes, newArrivalsRes] = await Promise.all([
          productsAPI.getFeatured(8),
          categoriesAPI.getCategories(),
          productsAPI.getProducts({ sort: "newest", limit: 4 }),
        ]);
        setFeaturedProducts(productsRes.data.products);
        setCategories(categoriesRes.data.categories.slice(0, 6));
        setNewArrivals(newArrivalsRes.data.products || []);
      } catch (error) {
        console.error("Failed to fetch home data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleNewsletter = async (e) => {
    e.preventDefault();
    if (!newsletterEmail || !/\S+@\S+\.\S+/.test(newsletterEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }
    setNewsletterLoading(true);
    // Simulate subscription — replace with real endpoint when available
    await new Promise((resolve) => setTimeout(resolve, 800));
    toast.success("Thanks for subscribing! 🎉");
    setNewsletterEmail("");
    setNewsletterLoading(false);
  };

  return (
    <div>
      {/* Hero Section */}
      {/* Hero Section */}
      <section className="relative h-[600px] flex items-center overflow-hidden bg-[var(--color-primary-dark)] text-white">
        {/* Dynamic Background Image */}
        <div className="absolute inset-0 z-0">
          <div
            className={`absolute inset-0 bg-black/50 z-10 ${loading ? "opacity-100" : "opacity-60"}`}
          />
          {featuredProducts.length > 0 && (
            <img
              src={featuredProducts[0]?.images?.[0]?.url || "/placeholder.jpg"}
              alt="Featured Handicraft"
              className="w-full h-full object-cover animate-slow-zoom opacity-80"
            />
          )}
        </div>

        <div className="container-app relative z-20">
          <div className="max-w-2xl animate-slideUp">
            <span className="inline-block px-4 py-1 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full text-sm mb-6 font-medium tracking-wide">
              🧶 Made with a Mother's Love
            </span>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight drop-shadow-lg">
              Soft, Safe &amp; Handmade Baby Clothing
            </h1>
            <p className="text-lg md:text-xl text-white/90 mb-8 leading-relaxed max-w-xl drop-shadow-md">
              Gentle fabrics, thoughtful designs, and handmade care — because
              your little one deserves the softest start.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to={
                  featuredProducts.length > 0
                    ? `/products/${featuredProducts[0].slug}`
                    : "/products"
                }
                className="btn bg-white text-[var(--color-primary)] hover:bg-gray-100 border-none px-8 py-3 text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all"
              >
                Shop Featured
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/categories"
                className="btn bg-transparent border-2 border-white text-white hover:bg-white hover:text-[var(--color-primary)] px-8 py-3 text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all"
              >
                Explore Categories
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-12 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
        <div className="container-app">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-pink-50 rounded-full flex items-center justify-center">
                <Baby className="w-6 h-6 text-[var(--color-primary)]" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Baby-Safe Fabrics</h3>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Soft, gentle on skin
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center">
                <Leaf className="w-6 h-6 text-[var(--color-accent-dark)]" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Eco-Friendly</h3>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Natural, sustainable materials
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center">
                <Heart className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Handmade in Nepal</h3>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Crafted with love &amp; care
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Mom-Approved</h3>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Made by moms, for moms
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Shop by Age */}
      <section className="py-12 bg-[var(--color-bg)]">
        <div className="container-app">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold">Shop by Age</h2>
            <p className="text-[var(--color-text-muted)] mt-2">
              Find the right size for your growing baby
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {[
              { label: "Newborn", range: "0-3 Months", emoji: "\uD83C\uDF7C" },
              { label: "Infant", range: "3-6 Months", emoji: "\uD83D\uDC76" },
              { label: "Crawler", range: "6-12 Months", emoji: "\uD83D\uDE4C" },
              { label: "Toddler", range: "1-2 Years", emoji: "\uD83D\uDEB6" },
              { label: "Little Kid", range: "2-3 Years", emoji: "\u2B50" },
            ].map((age) => (
              <Link
                key={age.label}
                to={`/products?age=${encodeURIComponent(age.range)}`}
                className="group flex flex-col items-center gap-3 p-5 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:shadow-md transition-all"
              >
                <span className="text-3xl">{age.emoji}</span>
                <div className="text-center">
                  <p className="font-semibold text-sm group-hover:text-[var(--color-primary)] transition-colors">
                    {age.label}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {age.range}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16">
        <div className="container-app">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">
                Featured Products
              </h2>
              <p className="text-[var(--color-text-muted)] mt-1">
                Our most loved baby essentials
              </p>
            </div>
            <Link
              to="/products?featured=true"
              className="btn btn-secondary text-sm"
            >
              View All
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {featuredProducts.map((product) => (
                <Link
                  key={product._id}
                  to={`/products/${product.slug}`}
                  className="card group"
                >
                  <div className="relative aspect-square overflow-hidden">
                    <img
                      src={product.images[0]?.url || "/placeholder.jpg"}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {product.comparePrice > product.price && (
                      <span className="absolute top-2 left-2 bg-[var(--color-error)] text-white text-xs px-2 py-1 rounded">
                        -
                        {calculateDiscount(product.comparePrice, product.price)}
                        %
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-[var(--color-text-muted)] mb-1">
                      {product.category?.name}
                    </p>
                    <h3 className="font-medium mb-2 line-clamp-2 group-hover:text-[var(--color-primary)]">
                      {product.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[var(--color-primary)]">
                        {formatPrice(product.price)}
                      </span>
                      {product.comparePrice > product.price && (
                        <span className="text-sm text-[var(--color-text-muted)] line-through">
                          {formatPrice(product.comparePrice)}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 bg-[var(--color-bg)]">
        <div className="container-app">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold">Shop by Category</h2>
            <p className="text-[var(--color-text-muted)] mt-2">
              Find the perfect outfit for your little one
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {categories.map((category) => (
              <Link
                key={category._id}
                to={`/products?category=${category.slug}`}
                className="group relative aspect-[4/3] rounded-xl overflow-hidden"
              >
                <img
                  src={category.image?.url || "/placeholder-category.jpg"}
                  alt={category.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                  <h3 className="font-semibold text-lg">{category.name}</h3>
                  {category.productCount && (
                    <p className="text-sm text-white/70">
                      {category.productCount} Products
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* New Arrivals */}
      <section className="py-16">
        <div className="container-app">
          <div className="flex justify-between items-center mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-5 h-5 text-[var(--color-accent-dark)]" />
                <h2 className="text-2xl md:text-3xl font-bold">New Arrivals</h2>
              </div>
              <p className="text-[var(--color-text-muted)]">
                Fresh styles just added for your little one
              </p>
            </div>
            <Link
              to="/products?sort=newest"
              className="btn btn-secondary text-sm"
            >
              See All New
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {!loading && newArrivals.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {newArrivals.map((product) => (
                <Link
                  key={product._id}
                  to={`/products/${product.slug}`}
                  className="card group"
                >
                  <div className="relative aspect-square overflow-hidden">
                    <img
                      src={product.images[0]?.url || "/placeholder.jpg"}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute top-2 left-2 bg-[var(--color-primary)] text-white text-xs px-2.5 py-1 rounded-full font-medium">
                      New
                    </span>
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-[var(--color-text-muted)] mb-1">
                      {product.category?.name}
                    </p>
                    <h3 className="font-medium mb-2 line-clamp-2 group-hover:text-[var(--color-primary)]">
                      {product.name}
                    </h3>
                    <span className="font-bold text-[var(--color-primary)]">
                      {formatPrice(product.price)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-[var(--color-surface)]">
        <div className="container-app">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold">What Moms Are Saying</h2>
            <p className="text-[var(--color-text-muted)] mt-2">
              Real reviews from real parents
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: "Srijana M.",
                location: "Kathmandu",
                rating: 5,
                text: "The softest baby clothes I've ever felt! My 6-month-old loves the organic cotton rompers. The quality is amazing for the price.",
                product: "Organic Cotton Romper",
              },
              {
                name: "Anita T.",
                location: "Pokhara",
                rating: 5,
                text: "I bought the newborn gift set for my friend's baby shower — she absolutely loved it! Beautiful packaging and such thoughtful details.",
                product: "Newborn Gift Set",
              },
              {
                name: "Priya S.",
                location: "Lalitpur",
                rating: 4,
                text: "Fast delivery and the clothes are true to size. My toddler has been wearing Nevan outfits on repeat. Will definitely order again!",
                product: "Toddler Dress Set",
              },
            ].map((testimonial, idx) => (
              <div
                key={idx}
                className="card p-6 flex flex-col"
              >
                <Quote className="w-8 h-8 text-[var(--color-primary-light)] mb-3" />
                <p className="text-sm text-[var(--color-text)] leading-relaxed flex-1">
                  "{testimonial.text}"
                </p>
                <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
                  <div className="flex items-center gap-1 mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-3.5 h-3.5 ${
                          star <= testimonial.rating
                            ? "fill-amber-400 text-amber-400"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="font-semibold text-sm">{testimonial.name}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {testimonial.location} • Purchased: {testimonial.product}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-[var(--color-accent)]">
        <div className="container-app text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-[var(--color-primary-dark)] mb-4">
            Join Our Newsletter
          </h2>
          <p className="text-[var(--color-text)] mb-6 max-w-md mx-auto">
            Get early access to new arrivals, special offers, and parenting
            tips from our mom community.
          </p>
          <form onSubmit={handleNewsletter} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              className="input flex-1"
            />
            <button type="submit" disabled={newsletterLoading} className="btn btn-primary">
              {newsletterLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Subscribe"
              )}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
};

export default Home;
