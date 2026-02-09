/**
 * Wishlist Page
 * Displays saved wishlist items with remove and add-to-cart actions
 */
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { wishlistAPI } from "../api/wishlist";
import { formatPrice, calculateDiscount } from "../utils/helpers";
import toast from "react-hot-toast";
import { Heart, Trash2, ShoppingCart, Loader2 } from "lucide-react";

const Wishlist = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWishlist = async () => {
      try {
        const res = await wishlistAPI.getWishlist();
        setItems(res.data?.wishlist || []);
      } catch {
        toast.error("Failed to load wishlist");
      } finally {
        setLoading(false);
      }
    };
    fetchWishlist();
  }, []);

  const handleRemove = async (productId) => {
    try {
      await wishlistAPI.removeFromWishlist(productId);
      setItems((prev) => prev.filter((p) => p._id !== productId));
      toast.success("Removed from wishlist");
    } catch {
      toast.error("Failed to remove item");
    }
  };

  const handleClearAll = async () => {
    try {
      await wishlistAPI.clearWishlist();
      setItems([]);
      toast.success("Wishlist cleared");
    } catch {
      toast.error("Failed to clear wishlist");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  return (
    <div className="container-app py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] mb-6">
        <Link to="/" className="hover:text-[var(--color-primary)]">Home</Link>
        <span>/</span>
        <span className="text-[var(--color-text)]">My Wishlist</span>
      </nav>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">My Wishlist</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            {items.length} {items.length === 1 ? "item" : "items"} saved
          </p>
        </div>
        {items.length > 0 && (
          <button
            onClick={handleClearAll}
            className="btn btn-secondary text-sm text-[var(--color-error)]"
          >
            Clear All
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16">
          <Heart className="w-16 h-16 text-[var(--color-border)] mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Your wishlist is empty</h2>
          <p className="text-[var(--color-text-muted)] mb-6">
            Save items you love by tapping the heart icon on any product
          </p>
          <Link to="/products" className="btn btn-primary">
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {items.map((product) => (
            <div key={product._id} className="card group relative">
              {/* Remove button */}
              <button
                onClick={() => handleRemove(product._id)}
                className="absolute top-2 right-2 z-10 p-1.5 bg-white/90 rounded-full shadow hover:bg-red-50 transition-colors"
                title="Remove from wishlist"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>

              <Link to={`/products/${product.slug}`}>
                <div className="relative aspect-square overflow-hidden">
                  <img
                    src={product.images?.[0]?.url || "/placeholder.jpg"}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {product.comparePrice > product.price && (
                    <span className="absolute top-2 left-2 bg-[var(--color-error)] text-white text-xs px-2 py-1 rounded">
                      -{calculateDiscount(product.comparePrice, product.price)}%
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-xs text-[var(--color-text-muted)] mb-1">
                    {product.category?.name}
                  </p>
                  <h3 className="text-sm font-medium mb-2 line-clamp-2 group-hover:text-[var(--color-primary)]">
                    {product.name}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[var(--color-primary)]">
                      {formatPrice(product.price)}
                    </span>
                    {product.comparePrice > product.price && (
                      <span className="text-xs text-[var(--color-text-muted)] line-through">
                        {formatPrice(product.comparePrice)}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Wishlist;
