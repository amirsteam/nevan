/**
 * ProductCard Component
 * Reusable product card with hover effects and badges
 */
import { Link } from "react-router-dom";
import { Heart, ShoppingCart, Eye, Star } from "lucide-react";
import { formatPrice, calculateDiscount } from "../utils/helpers";

interface ProductImage {
  url: string;
  public_id?: string;
}

interface ProductCategory {
  _id: string;
  name: string;
  slug: string;
}

interface ProductRatings {
  average: number;
  count: number;
}

interface Product {
  _id: string;
  name: string;
  slug: string;
  price: number;
  comparePrice?: number;
  images: ProductImage[];
  category?: ProductCategory;
  stock: number;
  ratings?: ProductRatings;
  isNew?: boolean;
  isFeatured?: boolean;
}

interface ProductCardProps {
  product: Product;
  onQuickView?: (product: Product) => void;
  onAddToWishlist?: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
  showQuickActions?: boolean;
  className?: string;
}

const ProductCard = ({
  product,
  onQuickView,
  onAddToWishlist,
  onAddToCart,
  showQuickActions = true,
  className = "",
}: ProductCardProps) => {
  const discount =
    product.comparePrice && product.comparePrice > product.price
      ? calculateDiscount(product.comparePrice, product.price)
      : 0;

  const isOutOfStock = product.stock === 0;

  // Check if product is new (created within last 7 days)
  const isNew = product.isNew;

  return (
    <div
      className={`group relative bg-[var(--color-surface)] rounded-xl overflow-hidden border border-[var(--color-border)] transition-all duration-300 hover:shadow-lg hover:border-[var(--color-primary)]/30 ${className}`}
    >
      {/* Image Container */}
      <Link
        to={`/products/${product.slug}`}
        className="block relative aspect-square overflow-hidden"
      >
        <img
          src={product.images[0]?.url || "/placeholder.jpg"}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {discount > 0 && (
            <span className="px-2.5 py-1 bg-red-500 text-white text-xs font-bold rounded-full shadow-lg">
              -{discount}%
            </span>
          )}
          {isNew && (
            <span className="px-2.5 py-1 bg-[var(--color-primary)] text-white text-xs font-bold rounded-full shadow-lg">
              New
            </span>
          )}
          {product.isFeatured && (
            <span className="px-2.5 py-1 bg-amber-500 text-white text-xs font-bold rounded-full shadow-lg">
              Featured
            </span>
          )}
        </div>

        {/* Out of Stock Overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[2px]">
            <span className="bg-white text-gray-900 px-6 py-2.5 rounded-full font-semibold text-sm shadow-lg">
              Out of Stock
            </span>
          </div>
        )}

        {/* Quick Actions */}
        {showQuickActions && !isOutOfStock && (
          <div className="absolute right-3 top-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
            {onAddToWishlist && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onAddToWishlist(product);
                }}
                className="w-9 h-9 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-[var(--color-primary)] hover:text-white transition-colors"
                aria-label="Add to wishlist"
              >
                <Heart className="w-4 h-4" />
              </button>
            )}
            {onQuickView && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onQuickView(product);
                }}
                className="w-9 h-9 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-[var(--color-primary)] hover:text-white transition-colors"
                aria-label="Quick view"
              >
                <Eye className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="p-4">
        {/* Category */}
        {product.category && (
          <Link
            to={`/products?category=${product.category.slug}`}
            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors uppercase tracking-wide"
          >
            {product.category.name}
          </Link>
        )}

        {/* Title */}
        <Link to={`/products/${product.slug}`}>
          <h3 className="font-medium mt-1 mb-2 line-clamp-2 group-hover:text-[var(--color-primary)] transition-colors leading-tight">
            {product.name}
          </h3>
        </Link>

        {/* Rating */}
        {product.ratings && product.ratings.count > 0 && (
          <div className="flex items-center gap-1 mb-2">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-3.5 h-3.5 ${
                    i < Math.round(product.ratings!.average)
                      ? "fill-amber-400 text-amber-400"
                      : "fill-gray-200 text-gray-200"
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-[var(--color-text-muted)]">
              ({product.ratings.count})
            </span>
          </div>
        )}

        {/* Price */}
        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-[var(--color-primary)]">
              {formatPrice(product.price)}
            </span>
            {product.comparePrice && product.comparePrice > product.price && (
              <span className="text-sm text-[var(--color-text-muted)] line-through">
                {formatPrice(product.comparePrice)}
              </span>
            )}
          </div>

          {/* Add to Cart Button (Mobile visible, Desktop on hover) */}
          {onAddToCart && !isOutOfStock && (
            <button
              onClick={() => onAddToCart(product)}
              className="w-9 h-9 bg-[var(--color-primary)]/10 rounded-full flex items-center justify-center text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition-all lg:opacity-0 lg:group-hover:opacity-100"
              aria-label="Add to cart"
            >
              <ShoppingCart className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
