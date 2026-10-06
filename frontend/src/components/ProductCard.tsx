/**
 * ProductCard Component
 * The one product card used by Home, Products, Wishlist and related items:
 * sized images (Cloudinary), second image on hover, stock and discount
 * badges, wishlist toggle, and quick add for products without options.
 */
import { memo } from "react";
import { Link } from "react-router-dom";
import { Heart, ShoppingBag, Star, Loader2 } from "lucide-react";
import { formatPrice, calculateDiscount, getAvailableStock, populated } from "../utils/helpers";
import { imageUrl, imageSrcSet, onImageError } from "../utils/image";
import { LOW_STOCK_DISPLAY } from "../config/store";
import { useWishlist } from "../hooks/useWishlist";
import { useAddToCart } from "../hooks/useAddToCart";
import type { IProduct } from "../types";

interface ProductCardProps {
  product: IProduct;
  /** Eager-load images above the fold (first row on the page) */
  priority?: boolean;
  showQuickAdd?: boolean;
  showCategory?: boolean;
  className?: string;
}

const CARD_IMAGE_WIDTH = 360;

/** Lowest price across variants ("From NPR …") when prices differ */
const getPriceInfo = (product: IProduct) => {
  const prices = (product.variants || []).map((v) => v.price).filter((p) => typeof p === "number");
  if (prices.length === 0) return { price: product.price, from: false };
  const min = Math.min(...prices);
  return { price: min, from: Math.max(...prices) > min };
};

const ProductCard = memo(
  ({ product, priority = false, showQuickAdd = true, showCategory = true, className = "" }: ProductCardProps) => {
    const { isWishlisted, toggle } = useWishlist();
    const { add, addingId } = useAddToCart();

    const images = product.images || [];
    const primary = images.find((img) => img.isPrimary) || images[0];
    const secondary = images.find((img) => img !== primary);
    const { price, from } = getPriceInfo(product);
    const discount = calculateDiscount(product.comparePrice, price);
    const stock = getAvailableStock(product);
    const isOutOfStock = stock <= 0;
    const hasOptions = !!product.variants?.length;
    const saved = isWishlisted(product._id);
    const category = populated(product.category);
    const href = `/products/${product.slug}`;
    const rating = product.ratings;

    return (
      <article
        className={`group relative flex flex-col bg-[var(--color-surface)] rounded-xl overflow-hidden border border-[var(--color-border)] transition-shadow duration-300 hover:shadow-[var(--shadow-md)] ${className}`}
      >
        {/* Image */}
        <Link
          to={href}
          className="block relative aspect-[4/5] overflow-hidden bg-[var(--color-surface-muted)]"
          tabIndex={-1}
          aria-hidden="true"
        >
          <img
            src={imageUrl(primary?.url, CARD_IMAGE_WIDTH)}
            srcSet={imageSrcSet(primary?.url, CARD_IMAGE_WIDTH)}
            alt=""
            width={CARD_IMAGE_WIDTH}
            height={450}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            onError={onImageError}
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ${
              secondary ? "md:group-hover:opacity-0" : "group-hover:scale-105"
            }`}
          />
          {secondary && (
            <img
              src={imageUrl(secondary.url, CARD_IMAGE_WIDTH)}
              alt=""
              width={CARD_IMAGE_WIDTH}
              height={450}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-500 hidden md:block md:group-hover:opacity-100"
            />
          )}

          {isOutOfStock && (
            <div className="absolute inset-0 bg-[var(--color-overlay)] flex items-center justify-center">
              <span className="bg-[var(--color-surface)] text-[var(--color-text)] px-4 py-1.5 rounded-full font-semibold text-sm">
                Out of stock
              </span>
            </div>
          )}
        </Link>

        {/* Badges */}
        <div className="absolute z-10 top-2.5 left-2.5 flex flex-col items-start gap-1.5 pointer-events-none">
          {discount > 0 && (
            <span className="px-2 py-0.5 bg-red-700 text-white text-xs font-bold rounded-full">-{discount}%</span>
          )}
          {!isOutOfStock && stock <= LOW_STOCK_DISPLAY && (
            <span className="px-2 py-0.5 bg-amber-100 text-amber-900 text-xs font-semibold rounded-full">
              Only {stock} left
            </span>
          )}
        </div>

        {/* Wishlist (outside the link so it's its own control) */}
        <button
          type="button"
          onClick={() => toggle(product._id, product.name)}
          aria-pressed={saved}
          aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
          className={`absolute z-10 top-2.5 right-2.5 w-9 h-9 rounded-full flex items-center justify-center shadow-[var(--shadow-sm)] transition-colors ${
            saved
              ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]"
              : "bg-[var(--color-surface)]/90 text-[var(--color-text)] hover:text-[var(--color-primary)]"
          }`}
        >
          <Heart className={`w-4 h-4 ${saved ? "fill-current" : ""}`} aria-hidden="true" />
        </button>

        {/* Content */}
        <div className="p-3 sm:p-4 flex flex-col flex-1">
          {showCategory && category && (
            <p className="text-[11px] sm:text-xs text-[var(--color-text-muted)] uppercase tracking-wide truncate">
              {category.name}
            </p>
          )}

          <h3 className="font-medium text-sm sm:text-base mt-1 mb-1.5 line-clamp-2 leading-snug">
            <Link to={href} className="hover:text-[var(--color-primary)] transition-colors">
              {/* Stretched link: the whole card is clickable, other controls sit above it */}
              <span className="absolute inset-0 z-0" aria-hidden="true" />
              <span className="relative">{product.name}</span>
            </Link>
          </h3>

          {rating && rating.count > 0 && (
            <div
              className="flex items-center gap-1 mb-1.5"
              aria-label={`Rated ${rating.average.toFixed(1)} out of 5 from ${rating.count} ${rating.count === 1 ? "review" : "reviews"}`}
              role="img"
            >
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
              <span className="text-xs font-medium">{rating.average.toFixed(1)}</span>
              <span className="text-xs text-[var(--color-text-muted)]">({rating.count})</span>
            </div>
          )}

          <div className="flex items-end justify-between gap-2 mt-auto pt-1">
            <div className="min-w-0">
              <p className="font-bold text-[var(--color-primary)] leading-tight">
                {from && <span className="text-xs font-medium text-[var(--color-text-muted)] mr-1">From</span>}
                {formatPrice(price)}
              </p>
              {discount > 0 && (
                <p className="text-xs text-[var(--color-text-muted)] line-through">
                  <span className="sr-only">Was </span>
                  {formatPrice(product.comparePrice)}
                </p>
              )}
            </div>

            {showQuickAdd && !isOutOfStock && (
              hasOptions ? (
                <Link
                  to={href}
                  className="relative z-10 shrink-0 text-xs font-medium px-2.5 py-1.5 rounded-full border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
                  aria-label={`Choose options for ${product.name}`}
                >
                  Options
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    add({
                      productId: product._id,
                      productName: product.name,
                      productImage: primary?.url,
                      price,
                    })
                  }
                  disabled={addingId === product._id}
                  aria-label={`Add ${product.name} to cart`}
                  className="relative z-10 shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-[var(--color-primary-soft)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-[var(--color-on-primary)] transition-colors disabled:opacity-60"
                >
                  {addingId === product._id ? (
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <ShoppingBag className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
              )
            )}
          </div>
        </div>
      </article>
    );
  },
);

ProductCard.displayName = "ProductCard";

export default ProductCard;
