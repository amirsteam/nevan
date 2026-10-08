/**
 * Home hero carousel: the live festival/event campaign (if any), a brand
 * slide (with a collage of featured products on desktop), then featured
 * products.
 *
 * - Product photos cover the slide's full height (object-cover, centred):
 *   behind the text on phones, a column beside it from md. Cloudinary
 *   serves a width chosen for the layout.
 * - Only the visible slide and its neighbours load images; the first image
 *   loads with high priority (it's the largest thing on the page).
 * - Left/right buttons, dots, swipe and arrow keys; autoplay pauses on
 *   hover/focus, in background tabs and for reduced-motion users.
 */
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronLeft, ChevronRight, Truck, Banknote, Sparkles, Heart } from "lucide-react";
import { formatPrice, calculateDiscount, populated } from "../../utils/helpers";
import { imageUrl, imageSrcSet, imageWidthSrcSet, onImageError } from "../../utils/image";
import { FREE_SHIPPING_THRESHOLD } from "../../config/store";
import { saleText, salePath } from "../../utils/campaign";
import { Skeleton } from "../ui/Skeleton";
import Countdown from "../campaign/Countdown";
import type { IProduct, IPublicCampaign } from "../../types";

const AUTOPLAY_MS = 6000;
const SWIPE_THRESHOLD_PX = 50;
const MAX_PRODUCT_SLIDES = 5;
const MAX_COLLAGE = 3;
// Product slide photo files; `sizes` approximates the rendered width of a 3:2
// photo covering the column (phones: the slide width, capped at 1080px files
// to spare mobile data)
const PHOTO_WIDTHS = [480, 720, 1080];
const PHOTO_SIZES = "(min-width: 1280px) 50rem, (min-width: 768px) 44rem, 100vw";
// Collage card photos (desktop); 2x is requested for retina
const COLLAGE_IMAGE_WIDTH = 420;

// Soft brand tints, cycled per slide
const TINTS = [
  "from-[var(--color-primary-soft)] via-[var(--color-surface-muted)] to-[var(--color-accent-light)]/50",
  "from-[var(--color-accent-light)]/60 via-[var(--color-surface-muted)] to-[var(--color-primary-soft)]",
  "from-[var(--color-surface-muted)] via-[var(--color-primary-soft)] to-[var(--color-bg)]",
];

const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const primaryImage = (product: IProduct): string | undefined =>
  (product.images?.find((img) => img.isPrimary) || product.images?.[0])?.url;

interface HeroCarouselProps {
  products: IProduct[];
  loading?: boolean;
  /** Live (or previewed) campaign: shown as the first slide */
  campaign?: IPublicCampaign | null;
}

/**
 * Campaign slide: the admin's uploaded banner art (desktop/mobile), or a
 * banner built from the campaign's palette, greeting and offer.
 */
export const CampaignSlide = ({ campaign, priority }: { campaign: IPublicCampaign; priority: boolean }) => {
  const { theme } = campaign;
  const offer = saleText(campaign);
  const href = salePath(campaign.slug);
  const banner = campaign.bannerMobile || campaign.bannerDesktop;

  if (banner) {
    // Uploaded art usually contains its own text; the link still has a full name
    return (
      <Link to={href} className="block h-full relative" style={{ backgroundColor: theme.bg }}>
        <span className="sr-only">
          {campaign.headline}
          {offer ? ` — ${offer}` : ""}. {campaign.ctaLabel}
        </span>
        <picture>
          {campaign.bannerDesktop && (
            <source
              media="(min-width: 768px)"
              srcSet={imageSrcSet(campaign.bannerDesktop, 1440) || imageUrl(campaign.bannerDesktop, 1440)}
            />
          )}
          <img
            src={imageUrl(banner, 800)}
            srcSet={imageSrcSet(banner, 800)}
            alt=""
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            decoding="async"
            onError={onImageError}
            className="absolute inset-0 w-full h-full object-cover"
          />
        </picture>
      </Link>
    );
  }

  return (
    <div className="relative h-full flex items-center justify-center text-center px-6 py-10 sm:px-10 md:px-24 overflow-hidden" style={{ backgroundColor: theme.bg, color: theme.text }}>
      {/* Festive glow, decoration only */}
      <span aria-hidden="true" className="absolute -left-20 -top-24 w-72 h-72 md:w-[26rem] md:h-[26rem] rounded-full opacity-25" style={{ backgroundColor: theme.highlight }} />
      <span aria-hidden="true" className="absolute -right-16 -bottom-28 w-72 h-72 md:w-[24rem] md:h-[24rem] rounded-full opacity-20" style={{ backgroundColor: theme.accent }} />
      <div className="relative max-w-3xl">
        {campaign.emoji && (
          <p className="text-5xl md:text-6xl mb-3" aria-hidden="true">
            {campaign.emoji}
          </p>
        )}
        {campaign.greeting && <p className="text-base md:text-xl font-medium opacity-90 mb-2">{campaign.greeting}</p>}
        <h2 className="text-3xl sm:text-4xl lg:text-6xl font-bold leading-tight mb-3">{campaign.headline}</h2>
        {offer && (
          <p className="inline-block text-lg md:text-2xl font-bold rounded-full px-5 py-1.5 mb-3" style={{ backgroundColor: theme.accent, color: theme.onAccent }}>
            {offer}
          </p>
        )}
        {campaign.subheadline && <p className="md:text-lg opacity-90 mb-4 max-w-xl mx-auto">{campaign.subheadline}</p>}
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3 mt-2">
          <Link
            to={href}
            className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-base font-semibold shadow-[var(--shadow-md)] transition-transform hover:-translate-y-0.5"
            style={{ backgroundColor: theme.accent, color: theme.onAccent }}
          >
            {campaign.ctaLabel || "Shop the sale"}
            <ArrowRight className="w-5 h-5" aria-hidden="true" />
          </Link>
          <Countdown endsAt={campaign.endsAt} className="text-sm font-medium" />
        </div>
      </div>
    </div>
  );
};

// Collage positions (desktop only): a large centre card and two smaller
// ones overlapping its corners
const COLLAGE_CARDS = [
  "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-52 xl:w-60 -rotate-3 z-10",
  "right-0 top-0 w-32 xl:w-40 rotate-6",
  "left-0 bottom-0 w-32 xl:w-40 -rotate-6 z-20",
];

/**
 * Featured products fanned out beside the brand pitch. Hidden below lg, and
 * lazy images inside display:none aren't fetched, so phones don't pay for
 * it.
 */
const HeroCollage = ({ products, loadImages }: { products: IProduct[]; loadImages: boolean }) => (
  <div aria-hidden="true" className="hidden lg:block relative w-full max-w-[26rem] xl:max-w-[30rem] h-[22rem] xl:h-[25rem] mx-auto">
    {products.map((product, i) => {
      const url = primaryImage(product);
      return (
        <Link
          key={product._id}
          to={`/products/${product.slug}`}
          tabIndex={-1}
          className={`absolute ${COLLAGE_CARDS[i]} rounded-3xl bg-[var(--color-surface)] p-2 shadow-[var(--shadow-lg)] transition-[rotate,scale] duration-500 hover:rotate-0 hover:scale-[1.03] motion-reduce:transition-none`}
        >
          <span className="relative block aspect-[4/5] overflow-hidden rounded-2xl bg-[var(--color-surface-muted)]">
            <Skeleton className="absolute inset-0 rounded-2xl" />
            {loadImages && url && (
              <img
                src={imageUrl(url, COLLAGE_IMAGE_WIDTH)}
                srcSet={imageSrcSet(url, COLLAGE_IMAGE_WIDTH)}
                alt=""
                loading="lazy"
                decoding="async"
                onError={onImageError}
                className="relative w-full h-full object-cover"
              />
            )}
          </span>
        </Link>
      );
    })}
    <span className="absolute z-30 right-0 xl:right-4 bottom-10 inline-flex items-center gap-1.5 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] px-3 py-1.5 text-sm font-medium shadow-[var(--shadow-md)]">
      <Heart className="w-4 h-4 fill-[var(--color-primary)] text-[var(--color-primary)]" />
      Newborn to 10 years
    </span>
  </div>
);

const BrandSlide = ({ collage, loadImages }: { collage: IProduct[]; loadImages: boolean }) => (
  <div
    className={`relative h-full grid items-center gap-10 px-6 py-10 sm:px-10 md:px-24 overflow-hidden ${
      collage.length ? "lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]" : ""
    }`}
  >
    {/* Decorative soft shapes */}
    <span aria-hidden="true" className="absolute -right-16 -top-20 w-72 h-72 md:w-[28rem] md:h-[28rem] rounded-full bg-[var(--color-brand)]/15" />
    <span aria-hidden="true" className="absolute right-24 -bottom-24 w-56 h-56 md:w-80 md:h-80 rounded-full bg-[var(--color-accent)]/20" />
    <div className="relative max-w-2xl">
      <span className="inline-flex items-center gap-2 px-3 py-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-full text-sm mb-4 font-medium">
        <span aria-hidden="true">🧶</span> Handmade in Nepal
      </span>
      <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold mb-4 leading-[1.1]">
        Soft, safe &amp; handmade clothing for little ones
      </h1>
      <p className="text-base md:text-lg text-[var(--color-text-muted)] mb-6 max-w-xl">
        Gentle fabrics and thoughtful designs from newborn to 10 years.
      </p>
      <div className="flex flex-wrap gap-3 mb-6">
        <Link to="/products" className="btn btn-primary px-6 py-3 text-base">
          Shop now
          <ArrowRight className="w-5 h-5" aria-hidden="true" />
        </Link>
        <a href="#shop-by-age" className="btn btn-secondary px-6 py-3 text-base bg-[var(--color-surface)]">
          Shop by age
        </a>
      </div>
      <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-[var(--color-text-muted)]">
        <li className="flex items-center gap-1.5">
          <Banknote className="w-4 h-4 text-[var(--color-primary)]" aria-hidden="true" />
          Cash on delivery
        </li>
        <li className="flex items-center gap-1.5">
          <Truck className="w-4 h-4 text-[var(--color-primary)]" aria-hidden="true" />
          Free shipping over {formatPrice(FREE_SHIPPING_THRESHOLD)}
        </li>
      </ul>
    </div>
    {collage.length > 0 && <HeroCollage products={collage} loadImages={loadImages} />}
  </div>
);

const ProductSlide = ({ product, loadImage, priority }: { product: IProduct; loadImage: boolean; priority: boolean }) => {
  const url = primaryImage(product);
  const discount = calculateDiscount(product.comparePrice, product.price);
  const category = populated(product.category)?.name;

  return (
    <div className="relative h-full md:grid md:grid-cols-[minmax(0,1fr)_auto]">
      {/* Photo: fills the whole slide behind the text on phones, a
          full-height column on the right from md */}
      <Link
        to={`/products/${product.slug}`}
        tabIndex={-1}
        aria-hidden="true"
        className="absolute inset-0 md:relative md:inset-auto md:order-2 md:w-[20rem] lg:w-[30rem] xl:w-[34rem] overflow-hidden bg-[var(--color-surface-muted)]"
      >
        {/* Shimmer until the photo arrives (it covers this once loaded) */}
        <Skeleton className="absolute inset-0 rounded-none" />
        {loadImage && url && (
          // Not loading="lazy": the carousel already limits loading to the
          // current and next slide, and lazy would wait until the slide is
          // on screen, showing an empty card on arrival
          <img
            src={imageUrl(url, PHOTO_WIDTHS[1])}
            srcSet={imageWidthSrcSet(url, PHOTO_WIDTHS)}
            sizes={PHOTO_SIZES}
            alt=""
            fetchPriority={priority ? "high" : "auto"}
            decoding="async"
            onError={onImageError}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        {/* Phones: darken the bottom so the text over the photo stays readable */}
        <span aria-hidden="true" className="md:hidden absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 via-45% to-transparent to-70%" />
      </Link>

      {/* Over the photo's bottom edge on phones (white text); beside it from md */}
      <div className="absolute inset-x-0 bottom-0 md:static md:order-1 flex flex-col justify-center min-w-0 px-5 pb-6 sm:px-8 sm:pb-8 md:pl-20 lg:pl-24 md:pr-10 md:py-10 text-white md:text-[var(--color-text)]">
        <p className="inline-flex items-center gap-1.5 text-xs md:text-sm font-semibold uppercase tracking-wide text-white/90 md:text-[var(--color-primary)] mb-1.5 md:mb-3">
          <Sparkles className="w-4 h-4" aria-hidden="true" />
          {category ? `Featured · ${category}` : "Featured"}
        </p>
        <h2 className="text-2xl sm:text-3xl lg:text-5xl font-bold leading-tight mb-3 md:mb-4 line-clamp-2">{product.name}</h2>
        {product.shortDescription && (
          <p className="hidden md:block text-[var(--color-text-muted)] md:text-lg mb-6 line-clamp-2 max-w-xl">
            {product.shortDescription}
          </p>
        )}
        {/* Price and button share a row on phones to keep the photo visible */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 md:block">
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 md:gap-3 md:mb-7">
            <span className="text-xl sm:text-2xl md:text-3xl font-bold">{formatPrice(product.price)}</span>
            {discount > 0 && (
              <>
                <span className="text-sm md:text-base text-white/75 md:text-[var(--color-text-muted)] line-through">
                  {formatPrice(product.comparePrice)}
                </span>
                <span className="text-xs md:text-sm font-semibold text-[var(--color-on-primary)] bg-[var(--color-primary)] rounded-full px-2 py-0.5">
                  {discount}% off
                </span>
              </>
            )}
          </div>
          <Link to={`/products/${product.slug}`} className="btn btn-primary px-5 py-2.5 md:px-6 md:py-3 text-base shrink-0">
            Shop now
            <span className="sr-only">: {product.name}</span>
            <ArrowRight className="w-5 h-5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
};

type Slide =
  | { kind: "campaign"; key: string; campaign: IPublicCampaign }
  | { kind: "brand"; key: string }
  | { kind: "product"; key: string; product: IProduct };

const HeroCarousel = ({ products, loading = false, campaign = null }: HeroCarouselProps) => {
  const withImages = products.filter((p) => primaryImage(p)).slice(0, MAX_PRODUCT_SLIDES);
  const collage = withImages.slice(0, MAX_COLLAGE);
  const slides: Slide[] = [
    ...(campaign ? [{ kind: "campaign" as const, key: `campaign-${campaign._id}`, campaign }] : []),
    { kind: "brand" as const, key: "brand" },
    ...withImages.map((product) => ({ kind: "product" as const, key: product._id, product })),
  ];
  const count = slides.length;

  const [index, setIndex] = useState(0);
  const active = index % count;
  const [paused, setPaused] = useState(false);
  // Bumped to re-arm the autoplay timer when it fired in a background tab
  const [autoplayTick, setAutoplayTick] = useState(0);
  const [reducedMotion] = useState(prefersReducedMotion);
  // Images load for the visible slide and the next one, and stay loaded
  const [seen, setSeen] = useState<Set<number>>(() => new Set([0, 1]));
  const upcoming = (active + 1) % count;
  if (!seen.has(active) || !seen.has(upcoming)) {
    setSeen(new Set([...seen, active, upcoming]));
  }
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);

  const goTo = (next: number) => {
    setIndex(((next % count) + count) % count);
  };
  const next = () => goTo(active + 1);
  const prev = () => goTo(active - 1);

  // Autoplay: restarts whenever the slide changes, so a manual click gets a
  // full interval before the next automatic move
  useEffect(() => {
    if (paused || reducedMotion || count < 2) return;
    const timer = window.setTimeout(() => {
      if (document.hidden) setAutoplayTick((t) => t + 1);
      else setIndex((i) => (i + 1) % count);
    }, AUTOPLAY_MS);
    return () => window.clearTimeout(timer);
  }, [paused, reducedMotion, count, active, autoplayTick]);

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      next();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      prev();
    }
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    pointerStart.current = { x: e.clientX, y: e.clientY };
    swiped.current = false;
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) > SWIPE_THRESHOLD_PX && Math.abs(dx) > Math.abs(dy)) {
      swiped.current = true;
      if (dx < 0) next();
      else prev();
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl overflow-hidden h-[30rem] sm:h-[26rem] md:h-[28rem] lg:h-[30rem]" role="status" aria-label="Loading">
        <Skeleton className="w-full h-full rounded-3xl" />
      </div>
    );
  }

  const slideLabel = (i: number) => `${i + 1} of ${count}`;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured"
      className="relative group/carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPaused(false);
      }}
      onKeyDown={onKeyDown}
    >
      <div className="relative overflow-hidden rounded-3xl border border-[var(--color-border)]">
        <div
          className="flex transition-transform duration-500 ease-out motion-reduce:transition-none touch-pan-y"
          style={{ transform: `translateX(-${active * 100}%)` }}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => (pointerStart.current = null)}
          // A swipe shouldn't also follow the link it started on
          onClickCapture={(e) => {
            if (swiped.current) {
              e.preventDefault();
              e.stopPropagation();
              swiped.current = false;
            }
          }}
        >
          {slides.map((slide, i) => {
            const isActive = i === active;
            const name =
              slide.kind === "product" ? slide.product.name : slide.kind === "campaign" ? slide.campaign.headline : null;
            return (
              <div
                key={slide.key}
                role="group"
                aria-roledescription="slide"
                aria-label={name ? `${slideLabel(i)}: ${name}` : slideLabel(i)}
                aria-hidden={!isActive}
                inert={!isActive}
                className={`w-full shrink-0 ${slide.kind === "campaign" ? "" : `bg-gradient-to-br ${TINTS[i % TINTS.length]}`} min-h-[30rem] sm:min-h-[26rem] md:min-h-[28rem] lg:min-h-[30rem]`}
              >
                {slide.kind === "product" ? (
                  <ProductSlide product={slide.product} loadImage={seen.has(i)} priority={i === (campaign ? 2 : 1)} />
                ) : slide.kind === "campaign" ? (
                  <CampaignSlide campaign={slide.campaign} priority={i === 0} />
                ) : (
                  <BrandSlide collage={collage} loadImages={seen.has(i)} />
                )}
              </div>
            );
          })}
        </div>

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Previous slide"
              className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-[var(--color-surface)]/90 text-[var(--color-text)] shadow-[var(--shadow-md)] border border-[var(--color-border)] items-center justify-center hover:bg-[var(--color-surface)] hover:text-[var(--color-primary)] transition-colors"
            >
              <ChevronLeft className="w-6 h-6" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next slide"
              className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-[var(--color-surface)]/90 text-[var(--color-text)] shadow-[var(--shadow-md)] border border-[var(--color-border)] items-center justify-center hover:bg-[var(--color-surface)] hover:text-[var(--color-primary)] transition-colors"
            >
              <ChevronRight className="w-6 h-6" aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="flex justify-center items-center gap-2 mt-4">
          {Array.from({ length: count }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === active ? "true" : undefined}
              className="p-1.5 -m-0.5 group/dot"
            >
              <span
                className={`block h-2 rounded-full transition-all ${
                  i === active
                    ? "w-6 bg-[var(--color-primary)]"
                    : "w-2 bg-[var(--color-border-strong)] group-hover/dot:bg-[var(--color-primary-light)]"
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </section>
  );
};

export default HeroCarousel;
