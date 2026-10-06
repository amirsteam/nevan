/**
 * Product Detail Page
 * Gallery with lightbox, accessible size/colour pickers, exact stock for the
 * selected option, delivery facts from the store config, reviews, related
 * products, and a sticky add-to-cart bar on phones.
 */
import { useState, useEffect, useMemo, useRef, useCallback, KeyboardEvent } from "react";
import { useParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  Heart,
  Share2,
  Star,
  Truck,
  RotateCcw,
  Banknote,
  Ruler,
  Loader2,
  Droplets,
  Baby,
  Sparkles,
  Expand,
  BadgeCheck,
} from "lucide-react";
import { productsAPI } from "../api";
import api from "../api/axios";
import { formatPrice, calculateDiscount, populated, getAvailableStock, formatDate } from "../utils/helpers";
import { imageUrl, onImageError } from "../utils/image";
import {
  CONTACT,
  DELIVERY_ESTIMATE,
  FREE_SHIPPING_THRESHOLD,
  RETURN_WINDOW_DAYS,
  LOW_STOCK_DISPLAY,
  GENDER_LABELS,
  formatAgeGroup,
} from "../config/store";
import { useAddToCart } from "../hooks/useAddToCart";
import { useWishlist } from "../hooks/useWishlist";
import { usePageTitle } from "../hooks/usePageTitle";
import { useChatOffset } from "../hooks/useChatOffset";
import type { IProduct, IReview, IProductVariant } from "../types";
import SizeGuide from "../components/SizeGuide";
import ReviewForm from "../components/ReviewForm";
import ProductCard from "../components/ProductCard";
import ImageLightbox from "../components/ImageLightbox";
import Breadcrumb from "../components/ui/Breadcrumb";
import QuantitySelector from "../components/ui/QuantitySelector";
import { StockBadge } from "../components/ui/Badge";
import { ProductDetailSkeleton, Skeleton } from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";
import { useAuth } from "../context/AuthContext";

const MAIN_IMAGE_WIDTH = 720;

/** Arrow-key navigation for a radio group of option buttons */
const onRadioKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
  if (!["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(e.key)) return;
  const radios = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]:not([disabled])'));
  const index = radios.indexOf(document.activeElement as HTMLButtonElement);
  if (index === -1) return;
  e.preventDefault();
  const next = radios[(index + (e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1) + radios.length) % radios.length];
  next.focus();
  next.click();
};

const Stars = ({ value, size = "w-4 h-4" }: { value: number; size?: string }) => (
  <span className="flex items-center gap-0.5" aria-hidden="true">
    {[1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        className={`${size} ${star <= Math.round(value) ? "fill-amber-400 text-amber-400" : "text-[var(--color-border-strong)]"}`}
      />
    ))}
  </span>
);

const ProductDetail = () => {
  const { slug = "" } = useParams();
  const { isAuthenticated } = useAuth();
  const { add, addingId } = useAddToCart();
  const { isWishlisted, toggle: toggleWishlist } = useWishlist();

  const [product, setProduct] = useState<IProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageIndex, setImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [reviews, setReviews] = useState<IReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState<IProduct[]>([]);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const addButtonRef = useRef<HTMLDivElement>(null);

  const variants = useMemo(() => product?.variants || [], [product]);
  const hasVariants = variants.length > 0;
  const currentVariant: IProductVariant | undefined = variants.find(
    (v) => v.size === selectedSize && v.color === selectedColor,
  );

  const uniqueSizes = useMemo(() => [...new Set(variants.map((v) => v.size))], [variants]);
  const colorsForSize = useMemo(
    () => [...new Set(variants.filter((v) => v.size === selectedSize).map((v) => v.color))],
    [variants, selectedSize],
  );
  const sizeInStock = useCallback(
    (size: string) => variants.some((v) => v.size === size && v.stock > 0),
    [variants],
  );

  // Gallery: product images plus any variant image not already in the gallery
  const gallery = useMemo(() => {
    if (!product) return [];
    const images = [...(product.images || [])].sort((a, b) => Number(!!b.isPrimary) - Number(!!a.isPrimary));
    const urls = new Set(images.map((img) => img.url));
    for (const v of variants) {
      if (v.image && !urls.has(v.image)) {
        urls.add(v.image);
        images.push({ url: v.image, publicId: "", alt: `${product.name} — ${v.color}` });
      }
    }
    return images.map((img) => ({ url: img.url, alt: img.alt || product.name }));
  }, [product, variants]);

  const showVariantImage = useCallback(
    (variant?: IProductVariant) => {
      if (!variant?.image) return;
      const index = gallery.findIndex((img) => img.url === variant.image);
      if (index !== -1) setImageIndex(index);
    },
    [gallery],
  );

  // Load product
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    productsAPI
      .getProduct(slug)
      .then((response) => {
        if (cancelled) return;
        const fetched = response.data.product;
        setProduct(fetched);
        setImageIndex(0);
        setQuantity(1);
        const fetchedVariants = fetched.variants || [];
        // Default to the first in-stock option, falling back to the first option
        const first = fetchedVariants.find((v) => v.stock > 0) || fetchedVariants[0];
        setSelectedSize(first?.size || "");
        setSelectedColor(first?.color || "");
      })
      .catch(() => !cancelled && setProduct(null))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // Show the default variant's image once the gallery is ready
  useEffect(() => {
    showVariantImage(currentVariant);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?._id]);

  // Reviews
  const loadReviews = useCallback((productId: string) => {
    setReviewsLoading(true);
    api
      .get(`/products/${productId}/reviews`)
      .then((res) => setReviews(res.data?.data?.reviews || []))
      .catch(() => {})
      .finally(() => setReviewsLoading(false));
  }, []);

  useEffect(() => {
    if (product?._id) loadReviews(product._id);
  }, [product?._id, loadReviews]);

  // Related products (same category)
  useEffect(() => {
    if (!product?.category) return;
    const catSlug = populated(product.category)?.slug || String(product.category);
    productsAPI
      .getProducts({ category: catSlug, limit: 5 })
      .then((res) => setRelatedProducts((res.data?.products || []).filter((p) => p._id !== product._id).slice(0, 4)))
      .catch(() => {});
  }, [product?._id, product?.category]);

  // Sticky bar on phones once the main add-to-cart button scrolls away
  useEffect(() => {
    const node = addButtonRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setShowStickyBar(!entry.isIntersecting && entry.boundingClientRect.top < 0), {
      threshold: 0,
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [loading, product?._id]);

  // Lift the floating chat button above the sticky bar
  useChatOffset(showStickyBar);

  usePageTitle(product?.name, product?.shortDescription || product?.description);

  const available = hasVariants ? currentVariant?.stock ?? 0 : product?.stock ?? 0;

  // Keep the quantity within what's in stock for the selection
  useEffect(() => {
    setQuantity((q) => Math.max(1, Math.min(q, available || 1)));
  }, [available]);

  if (loading) return <ProductDetailSkeleton />;

  if (!product) {
    return (
      <div className="container-app py-12">
        <EmptyState
          type="products"
          headingLevel="h1"
          title="We couldn't find that product"
          description="It may have sold out or been removed. Have a look at what's new instead."
          actionLabel="Browse products"
          actionLink="/products"
        />
      </div>
    );
  }

  const category = populated(product.category);
  const displayPrice = currentVariant?.price ?? product.price;
  const discount = calculateDiscount(product.comparePrice, displayPrice);
  const totalStock = getAvailableStock(product);
  const soldOut = totalStock <= 0;
  const selectionUnavailable = hasVariants && (!currentVariant || currentVariant.stock <= 0);
  const canAdd = !soldOut && !selectionUnavailable && available > 0;
  const saved = isWishlisted(product._id);
  const rating = product.ratings;
  const adding = addingId === product._id;

  const handleSizeChange = (size: string) => {
    setSelectedSize(size);
    const colors = variants.filter((v) => v.size === size);
    const keep = colors.find((v) => v.color === selectedColor && v.stock > 0);
    const next = keep || colors.find((v) => v.stock > 0) || colors[0];
    setSelectedColor(next?.color || "");
    showVariantImage(next);
  };

  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    showVariantImage(variants.find((v) => v.size === selectedSize && v.color === color));
  };

  const handleAddToCart = async () => {
    if (!canAdd) return;
    await add({
      productId: product._id,
      productName: product.name,
      productImage: gallery[0]?.url,
      price: displayPrice,
      quantity,
      variant: currentVariant
        ? { _id: currentVariant._id, size: currentVariant.size, color: currentVariant.color, image: currentVariant.image }
        : undefined,
    });
  };

  const handleShare = async () => {
    const shareData = {
      title: product.name,
      text: product.shortDescription || `${product.name} at Nevan Handicraft`,
      url: window.location.href,
    };
    try {
      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
        return;
      }
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied");
    } catch (error) {
      if ((error as { name?: string })?.name === "AbortError") return;
      toast.error("Couldn't share this link");
    }
  };

  const addLabel = soldOut ? "Sold out" : selectionUnavailable ? "This option is sold out" : "Add to cart";
  const mainImage = gallery[imageIndex] || gallery[0];

  return (
    <div className="container-app py-6 md:py-8 pb-28 md:pb-8">
      <Breadcrumb
        className="mb-5"
        items={[
          { label: "Shop", path: "/products" },
          ...(category ? [{ label: category.name, path: `/products?category=${category.slug}` }] : []),
          { label: product.name },
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        {/* Gallery */}
        <div className="space-y-3 md:sticky md:top-24 md:self-start">
          <div className="relative aspect-square rounded-xl overflow-hidden bg-[var(--color-surface-muted)]">
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              className="w-full h-full cursor-zoom-in"
              aria-label="Open full-screen image"
            >
              <img
                src={imageUrl(mainImage?.url, MAIN_IMAGE_WIDTH)}
                srcSet={mainImage?.url ? `${imageUrl(mainImage.url, MAIN_IMAGE_WIDTH)} 1x, ${imageUrl(mainImage.url, MAIN_IMAGE_WIDTH * 2)} 2x` : undefined}
                alt={mainImage?.alt || product.name}
                width={MAIN_IMAGE_WIDTH}
                height={MAIN_IMAGE_WIDTH}
                fetchPriority="high"
                onError={onImageError}
                className="w-full h-full object-cover"
              />
            </button>
            {discount > 0 && (
              <span className="absolute top-3 left-3 bg-red-700 text-white px-2.5 py-1 rounded-lg text-sm font-semibold pointer-events-none">
                -{discount}%
              </span>
            )}
            <span className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-[var(--color-surface)]/90 flex items-center justify-center pointer-events-none" aria-hidden="true">
              <Expand className="w-4 h-4" />
            </span>
            {gallery.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setImageIndex((i) => (i - 1 + gallery.length) % gallery.length)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-[var(--color-surface)]/90 rounded-full flex items-center justify-center shadow-[var(--shadow-sm)]"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-5 h-5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setImageIndex((i) => (i + 1) % gallery.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-[var(--color-surface)]/90 rounded-full flex items-center justify-center shadow-[var(--shadow-sm)]"
                  aria-label="Next image"
                >
                  <ChevronRight className="w-5 h-5" aria-hidden="true" />
                </button>
              </>
            )}
          </div>

          {gallery.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {gallery.map((img, idx) => (
                <button
                  key={img.url + idx}
                  type="button"
                  onClick={() => setImageIndex(idx)}
                  aria-label={`Show image ${idx + 1} of ${gallery.length}`}
                  aria-current={imageIndex === idx ? "true" : undefined}
                  className={`w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden shrink-0 border-2 ${
                    imageIndex === idx ? "border-[var(--color-primary)]" : "border-transparent"
                  }`}
                >
                  <img src={imageUrl(img.url, 160)} alt="" loading="lazy" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-6">
          <div>
            {category && (
              <Link
                to={`/products?category=${category.slug}`}
                className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)] uppercase tracking-wide"
              >
                {category.name}
              </Link>
            )}
            <h1 className="text-2xl md:text-4xl font-bold mt-1 mb-3">{product.name}</h1>

            {rating && rating.count > 0 ? (
              <a href="#reviews" className="inline-flex items-center gap-2 text-sm hover:underline underline-offset-4">
                <Stars value={rating.average} />
                <span className="font-medium">{rating.average.toFixed(1)}</span>
                <span className="text-[var(--color-text-muted)]">
                  ({rating.count} {rating.count === 1 ? "review" : "reviews"})
                </span>
                <span className="sr-only">, rated {rating.average.toFixed(1)} out of 5. Go to reviews</span>
              </a>
            ) : (
              <a href="#reviews" className="text-sm text-[var(--color-text-muted)] hover:underline underline-offset-4">
                No reviews yet
              </a>
            )}
          </div>

          {/* Price */}
          <div className="flex flex-wrap items-baseline gap-3">
            <span className="text-3xl font-bold text-[var(--color-primary)]">{formatPrice(displayPrice)}</span>
            {(product.comparePrice ?? 0) > displayPrice && (
              <span className="text-lg text-[var(--color-text-muted)] line-through">
                <span className="sr-only">Was </span>
                {formatPrice(product.comparePrice)}
              </span>
            )}
            {discount > 0 && (
              <span className="text-sm font-semibold text-red-700 dark:text-red-400">Save {discount}%</span>
            )}
          </div>

          {product.shortDescription && <p className="text-[var(--color-text-muted)]">{product.shortDescription}</p>}

          {/* Options */}
          {hasVariants && (
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <p id="size-label" className="font-medium">
                    Size{selectedSize && <span className="font-normal text-[var(--color-text-muted)]">: {selectedSize}</span>}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowSizeGuide(true)}
                    className="flex items-center gap-1 text-sm text-[var(--color-primary)] hover:underline underline-offset-4"
                  >
                    <Ruler className="w-4 h-4" aria-hidden="true" />
                    Size guide
                  </button>
                </div>
                <div role="radiogroup" aria-labelledby="size-label" className="flex flex-wrap gap-2" onKeyDown={onRadioKeyDown}>
                  {uniqueSizes.map((size) => {
                    const checked = selectedSize === size;
                    const inStock = sizeInStock(size);
                    return (
                      <button
                        key={size}
                        type="button"
                        role="radio"
                        aria-checked={checked}
                        tabIndex={checked ? 0 : -1}
                        onClick={() => handleSizeChange(size)}
                        className={`px-4 py-2 rounded-lg border text-sm transition-colors ${
                          checked
                            ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                            : "border-[var(--color-border)] hover:border-[var(--color-primary)]"
                        } ${!inStock ? "line-through decoration-1 text-[var(--color-text-muted)]" : ""}`}
                      >
                        {size}
                        {!inStock && <span className="sr-only"> (sold out)</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p id="color-label" className="font-medium mb-2.5">
                  Colour{selectedColor && <span className="font-normal text-[var(--color-text-muted)]">: {selectedColor}</span>}
                </p>
                <div role="radiogroup" aria-labelledby="color-label" className="flex flex-wrap gap-2" onKeyDown={onRadioKeyDown}>
                  {colorsForSize.map((color) => {
                    const variant = variants.find((v) => v.size === selectedSize && v.color === color);
                    const outOfStock = (variant?.stock ?? 0) <= 0;
                    const checked = selectedColor === color;
                    return (
                      <button
                        key={color}
                        type="button"
                        role="radio"
                        aria-checked={checked}
                        tabIndex={checked ? 0 : -1}
                        onClick={() => handleColorChange(color)}
                        className={`px-4 py-2 rounded-lg border text-sm transition-colors ${
                          checked
                            ? "border-[var(--color-primary)] ring-1 ring-[var(--color-primary)] font-medium"
                            : "border-[var(--color-border)] hover:border-[var(--color-primary)]"
                        } ${outOfStock ? "line-through decoration-1 text-[var(--color-text-muted)]" : ""}`}
                      >
                        {color}
                        {outOfStock && <span className="sr-only"> (sold out)</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Quantity + stock */}
          <div className="flex flex-wrap items-center gap-4">
            <QuantitySelector
              value={quantity}
              onChange={setQuantity}
              min={1}
              max={Math.max(1, available)}
              disabled={!canAdd}
              label={`Quantity for ${product.name}`}
            />
            <StockBadge stock={available} size="md" lowThreshold={LOW_STOCK_DISPLAY} />
          </div>

          {/* Actions */}
          <div ref={addButtonRef} className="flex gap-3">
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!canAdd || adding}
              aria-busy={adding}
              className="btn btn-primary flex-1 py-3 text-base"
            >
              {adding ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> : <ShoppingBag className="w-5 h-5" aria-hidden="true" />}
              {adding ? "Adding…" : addLabel}
            </button>
            <button
              type="button"
              onClick={() => toggleWishlist(product._id, product.name)}
              aria-pressed={saved}
              aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
              className={`btn btn-secondary px-3.5 ${saved ? "text-[var(--color-primary)] border-[var(--color-primary)]" : ""}`}
            >
              <Heart className={`w-5 h-5 ${saved ? "fill-current" : ""}`} aria-hidden="true" />
            </button>
            <button type="button" onClick={handleShare} aria-label="Share this product" className="btn btn-secondary px-3.5">
              <Share2 className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
          {soldOut && (
            <p className="text-sm text-[var(--color-text-muted)] -mt-3">
              Sold out right now.{" "}
              <a href={CONTACT.whatsappHref} target="_blank" rel="noreferrer" className="text-[var(--color-primary)] underline underline-offset-4">
                Ask us on WhatsApp
              </a>{" "}
              when it's back.
            </p>
          )}

          {/* Delivery & payment facts (from the store config, so they match checkout) */}
          <ul className="rounded-xl border border-[var(--color-border)] divide-y divide-[var(--color-border)] text-sm">
            <li className="flex items-start gap-3 p-3.5">
              <Truck className="w-5 h-5 text-[var(--color-primary)] shrink-0" aria-hidden="true" />
              <div>
                <p className="font-medium">Delivery across Nepal</p>
                <p className="text-[var(--color-text-muted)]">
                  {DELIVERY_ESTIMATE}. Free shipping on orders over {formatPrice(FREE_SHIPPING_THRESHOLD)}.{" "}
                  <Link to="/shipping" className="text-[var(--color-primary)] underline underline-offset-4">
                    Rates
                  </Link>
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3 p-3.5">
              <Banknote className="w-5 h-5 text-[var(--color-primary)] shrink-0" aria-hidden="true" />
              <div>
                <p className="font-medium">Cash on delivery or eSewa</p>
                <p className="text-[var(--color-text-muted)]">Pay when it arrives, or pay securely online.</p>
              </div>
            </li>
            <li className="flex items-start gap-3 p-3.5">
              <RotateCcw className="w-5 h-5 text-[var(--color-primary)] shrink-0" aria-hidden="true" />
              <div>
                <p className="font-medium">{RETURN_WINDOW_DAYS}-day returns</p>
                <p className="text-[var(--color-text-muted)]">
                  Request a return within {RETURN_WINDOW_DAYS} days of delivery.{" "}
                  <Link to="/returns" className="text-[var(--color-primary)] underline underline-offset-4">
                    Policy
                  </Link>
                </p>
              </div>
            </li>
          </ul>

          {/* Description and details */}
          <section className="pt-2">
            <h2 className="text-lg font-semibold mb-2 font-sans">Description</h2>
            <p className="text-[var(--color-text-muted)] whitespace-pre-line">{product.description}</p>
          </section>

          {(product.material || product.careInstructions || product.ageRecommendation || product.ageGroups?.length || product.gender) && (
            <section>
              <h2 className="text-lg font-semibold mb-3 font-sans">Details</h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {product.material && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-[var(--color-surface-muted)]">
                    <Droplets className="w-5 h-5 text-[var(--color-primary)] mt-0.5 shrink-0" aria-hidden="true" />
                    <div>
                      <dt className="text-sm font-medium">Fabric</dt>
                      <dd className="text-sm text-[var(--color-text-muted)]">{product.material}</dd>
                    </div>
                  </div>
                )}
                {product.careInstructions && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-[var(--color-surface-muted)]">
                    <Sparkles className="w-5 h-5 text-[var(--color-primary)] mt-0.5 shrink-0" aria-hidden="true" />
                    <div>
                      <dt className="text-sm font-medium">Care</dt>
                      <dd className="text-sm text-[var(--color-text-muted)]">{product.careInstructions}</dd>
                    </div>
                  </div>
                )}
                {(product.ageRecommendation || !!product.ageGroups?.length) && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-[var(--color-surface-muted)]">
                    <Baby className="w-5 h-5 text-[var(--color-primary)] mt-0.5 shrink-0" aria-hidden="true" />
                    <div>
                      <dt className="text-sm font-medium">Age</dt>
                      <dd className="text-sm text-[var(--color-text-muted)]">
                        {product.ageRecommendation || product.ageGroups?.map(formatAgeGroup).join(", ")}
                      </dd>
                    </div>
                  </div>
                )}
                {product.gender && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-[var(--color-surface-muted)]">
                    <Heart className="w-5 h-5 text-[var(--color-primary)] mt-0.5 shrink-0" aria-hidden="true" />
                    <div>
                      <dt className="text-sm font-medium">Style</dt>
                      <dd className="text-sm text-[var(--color-text-muted)]">{GENDER_LABELS[product.gender]}</dd>
                    </div>
                  </div>
                )}
              </dl>
            </section>
          )}
        </div>
      </div>

      {/* Reviews */}
      <section id="reviews" className="mt-12 pt-8 border-t border-[var(--color-border)] scroll-mt-24" aria-labelledby="reviews-heading">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 id="reviews-heading" className="text-xl md:text-2xl font-bold">
              Customer reviews
            </h2>
            {rating && rating.count > 0 && (
              <div className="flex items-center gap-2 mt-1">
                <Stars value={rating.average} />
                <span className="text-sm text-[var(--color-text-muted)]">
                  {rating.average.toFixed(1)} out of 5 · {rating.count} {rating.count === 1 ? "review" : "reviews"}
                </span>
              </div>
            )}
          </div>
          {isAuthenticated ? (
            <button type="button" onClick={() => setShowReviewForm((v) => !v)} className="btn btn-secondary text-sm" aria-expanded={showReviewForm}>
              {showReviewForm ? "Cancel" : "Write a review"}
            </button>
          ) : (
            <Link to="/login" state={{ from: { pathname: `/products/${product.slug}` } }} className="text-sm text-[var(--color-primary)] underline underline-offset-4">
              Sign in to write a review
            </Link>
          )}
        </div>

        {showReviewForm && isAuthenticated && (
          <div className="card p-6 mb-8">
            <ReviewForm
              productId={product._id}
              onReviewSubmitted={() => {
                setShowReviewForm(false);
                loadReviews(product._id);
              }}
            />
          </div>
        )}

        {reviewsLoading ? (
          <div className="space-y-4" aria-busy="true">
            {[0, 1].map((i) => (
              <div key={i} className="card p-5 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <p className="text-center py-8 text-[var(--color-text-muted)]">No reviews yet. Be the first to review this product!</p>
        ) : (
          <ul className="space-y-4">
            {reviews.map((review) => (
              <li key={review._id} className="card p-5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="flex flex-wrap items-center gap-2 font-medium text-sm">
                      {populated(review.user)?.name || "Customer"}
                      {review.isVerifiedPurchase && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-success)]">
                          <BadgeCheck className="w-3.5 h-3.5" aria-hidden="true" />
                          Verified purchase
                        </span>
                      )}
                    </p>
                    <div className="mt-1" role="img" aria-label={`${review.rating} out of 5 stars`}>
                      <Stars value={review.rating} size="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <time dateTime={review.createdAt} className="text-xs text-[var(--color-text-muted)] shrink-0">
                    {formatDate(review.createdAt)}
                  </time>
                </div>
                {review.title && <p className="font-medium text-sm mt-2">{review.title}</p>}
                {review.comment && <p className="text-sm text-[var(--color-text-muted)] mt-1 whitespace-pre-line">{review.comment}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Related */}
      {relatedProducts.length > 0 && (
        <section className="mt-12 pt-8 border-t border-[var(--color-border)]">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl md:text-2xl font-bold">You might also like</h2>
            {category && (
              <Link to={`/products?category=${category.slug}`} className="text-sm font-medium text-[var(--color-primary)] hover:underline underline-offset-4">
                View more
              </Link>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {relatedProducts.map((rp) => (
              <ProductCard key={rp._id} product={rp} showCategory={false} />
            ))}
          </div>
        </section>
      )}

      {/* Sticky add-to-cart (phones) */}
      <div
        className={`md:hidden fixed inset-x-0 bottom-0 z-40 bg-[var(--color-surface)] border-t border-[var(--color-border)] shadow-[var(--shadow-lg)] px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] transition-transform duration-300 ${
          showStickyBar ? "translate-y-0" : "translate-y-full"
        }`}
        aria-hidden={!showStickyBar}
      >
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{product.name}</p>
            <p className="text-sm font-bold text-[var(--color-primary)]">
              {formatPrice(displayPrice)}
              {currentVariant && (
                <span className="font-normal text-[var(--color-text-muted)]">
                  {" "}
                  · {currentVariant.size}, {currentVariant.color}
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!canAdd || adding}
            tabIndex={showStickyBar ? 0 : -1}
            className="btn btn-primary shrink-0"
          >
            {adding ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <ShoppingBag className="w-4 h-4" aria-hidden="true" />}
            {canAdd ? "Add to cart" : "Sold out"}
          </button>
        </div>
      </div>

      <ImageLightbox
        images={gallery}
        index={imageIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onIndexChange={setImageIndex}
        title={product.name}
      />
      <SizeGuide isOpen={showSizeGuide} onClose={() => setShowSizeGuide(false)} currentSize={selectedSize} />
    </div>
  );
};

export default ProductDetail;
