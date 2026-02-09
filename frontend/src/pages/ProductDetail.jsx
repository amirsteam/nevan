/**
 * Product Detail Page
 * Single product view with images, details, variants, and add to cart
 */
import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { productsAPI } from "../api";
import { wishlistAPI } from "../api/wishlist";
import { addToCart, selectCartLoading } from "../store/cartSlice";
import { useAuth } from "../context/AuthContext";
import { usePendingCart } from "../context/PendingCartContext";
import { formatPrice, calculateDiscount } from "../utils/helpers";
import SizeGuide from "../components/SizeGuide";
import ReviewForm from "../components/ReviewForm";
import toast from "react-hot-toast";
import api from "../api/axios";
import {
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  ShoppingCart,
  Heart,
  Share2,
  Star,
  Truck,
  RefreshCw,
  Shield,
  Ruler,
  Loader2,
  Droplets,
  Baby,
  Leaf,
} from "lucide-react";

const ProductDetail = () => {
  const { slug } = useParams();
  const dispatch = useDispatch();
  const { isAuthenticated } = useAuth();
  const { pendingItem, setPendingItem, clearPendingItem, isModalOpen } =
    usePendingCart();
  const cartLoading = useSelector(selectCartLoading);

  // Track if we should add to cart after login
  const shouldAddToCartRef = useRef(false);

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [activeImage, setActiveImage] = useState("");
  const [quantity, setQuantity] = useState(1);

  // Flat Variant State
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");

  // Derived state for current variant
  const currentVariant = product?.variants?.find(
    (v) => v.size === selectedSize && v.color === selectedColor,
  );

  // Memoize unique sizes for rendering (must be before early returns)
  const uniqueSizes = useMemo(
    () =>
      product?.variants
        ? [...new Set(product.variants.map((v) => v.size))]
        : [],
    [product?.variants],
  );

  // Memoize available colors for selected size (must be before early returns)
  const availableColors = useMemo(
    () =>
      product?.variants
        ? [
            ...new Set(
              product.variants
                .filter((v) => v.size === selectedSize)
                .map((v) => v.color),
            ),
          ]
        : [],
    [product?.variants, selectedSize],
  );

  // Initialize logic
  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const response = await productsAPI.getProduct(slug);
        const fetchedProduct = response.data.product;
        setProduct(fetchedProduct);

        // Initialize variants if they exist
        if (fetchedProduct.variants?.length > 0) {
          // Get unique sizes
          const sizes = [
            ...new Set(fetchedProduct.variants.map((v) => v.size)),
          ];

          // Select first size by default
          if (sizes.length > 0) {
            const defaultSize = sizes[0];
            setSelectedSize(defaultSize);

            // Get colors for this size
            const availableColors = [
              ...new Set(
                fetchedProduct.variants
                  .filter((v) => v.size === defaultSize)
                  .map((v) => v.color),
              ),
            ];

            // Select first available color
            if (availableColors.length > 0) {
              setSelectedColor(availableColors[0]);

              // Set initial image from the selected variant if it has one
              const initialVariant = fetchedProduct.variants.find(
                (v) => v.size === defaultSize && v.color === availableColors[0],
              );

              if (initialVariant?.image) {
                setActiveImage(initialVariant.image);
                // Try to match with gallery index
                const imgIndex = fetchedProduct.images.findIndex(
                  (img) => img.url === initialVariant.image,
                );
                if (imgIndex !== -1) setSelectedImage(imgIndex);
                else setSelectedImage(-1);
              }
            }
          }
        } else {
          // No variants, just set main image
          if (fetchedProduct.images?.length > 0) {
            setActiveImage(fetchedProduct.images[0].url);
          }
        }
      } catch (error) {
        console.error("Failed to fetch product:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [slug]);

  // Update Color and Image when size changes or color selected
  const handleSizeChange = (size) => {
    setSelectedSize(size);

    // When size changes, check if current color is still valid
    const nextAvailableColors = [
      ...new Set(
        product.variants.filter((v) => v.size === size).map((v) => v.color),
      ),
    ];

    // Reset color to first available if current invalid, or keep if valid
    if (!nextAvailableColors.includes(selectedColor)) {
      const nextColor = nextAvailableColors[0] || "";
      setSelectedColor(nextColor);

      // Update image for new combo
      const nextVariant = product.variants.find(
        (v) => v.size === size && v.color === nextColor,
      );
      if (nextVariant?.image) {
        setActiveImage(nextVariant.image);
      }
    } else {
      // Update image for new combo (same color, new size - might have diff image)
      const nextVariant = product.variants.find(
        (v) => v.size === size && v.color === selectedColor,
      );
      if (nextVariant?.image) {
        setActiveImage(nextVariant.image);
      }
    }
  };

  const handleColorChange = (color) => {
    setSelectedColor(color);
    // Find variant for this color (and current size) to update image
    const variant = product.variants.find(
      (v) => v.size === selectedSize && v.color === color,
    );
    if (variant?.image) {
      setActiveImage(variant.image);
      const imgIndex = product.images.findIndex(
        (img) => img.url === variant.image,
      );
      if (imgIndex !== -1) setSelectedImage(imgIndex);
      else setSelectedImage(-1);
    }
  };

  // Helper function to actually add to cart (called directly or after login)
  const executeAddToCart = async (usePendingData = false) => {
    try {
      // When called after login, use pending item data if available
      const cartData =
        usePendingData && pendingItem
          ? {
              productId: pendingItem.productId,
              quantity: pendingItem.quantity,
              variantId: pendingItem.variantId || null,
              variantDetails: pendingItem.variantDetails || null,
            }
          : {
              productId: product._id,
              quantity,
              variantId: currentVariant?._id || null,
              variantDetails: currentVariant
                ? {
                    size: currentVariant.size,
                    color: currentVariant.color,
                    image: currentVariant.image,
                  }
                : null,
            };

      await dispatch(addToCart(cartData)).unwrap();
      toast.success("Added to cart!");
      clearPendingItem();
    } catch (error) {
      console.error(error);
      toast.error(error || "Failed to add to cart");
    }
  };

  // Effect to handle add to cart after successful login
  useEffect(() => {
    // If user just logged in and we have a pending item for this product
    if (
      isAuthenticated &&
      pendingItem &&
      pendingItem.productId === product?._id &&
      !isModalOpen
    ) {
      shouldAddToCartRef.current = true;
    }
  }, [isAuthenticated, pendingItem, product, isModalOpen]);

  // Execute pending add to cart
  useEffect(() => {
    if (shouldAddToCartRef.current && isAuthenticated && product) {
      shouldAddToCartRef.current = false;
      executeAddToCart(true); // Use pending item data
    }
  }, [isAuthenticated, product]);

  const handleAddToCart = async () => {
    // Validate variant selection if product has variants
    if (product.variants?.length > 0 && !currentVariant) {
      toast.error("Please select valid options");
      return;
    }

    // Verify stock
    if (product.variants?.length > 0) {
      if (currentVariant.stock < quantity) {
        toast.error(`Only ${currentVariant.stock} items available`);
        return;
      }
    } else if (product.stock < quantity) {
      toast.error(`Only ${product.stock} items available`);
      return;
    }

    // If not authenticated, show login modal with product preview
    if (!isAuthenticated) {
      const displayImage =
        currentVariant?.image || product.images[0]?.url || "/placeholder.jpg";
      const displayPrice = currentVariant?.price || product.price;

      setPendingItem({
        productId: product._id,
        productName: product.name,
        productImage: displayImage,
        productPrice: displayPrice,
        quantity,
        variantId: currentVariant?._id,
        variantDetails: currentVariant
          ? {
              size: currentVariant.size,
              color: currentVariant.color,
              image: currentVariant.image,
            }
          : undefined,
      });
      return;
    }

    // User is authenticated, add to cart directly
    await executeAddToCart();
  };

  // Wishlist handler (using backend API for authenticated users)
  const [isWishlisted, setIsWishlisted] = useState(false);

  useEffect(() => {
    if (product && isAuthenticated) {
      wishlistAPI
        .checkWishlist(product._id)
        .then((res) => setIsWishlisted(res.data?.isInWishlist || false))
        .catch(() => setIsWishlisted(false));
    }
  }, [product, isAuthenticated]);

  const handleWishlist = async () => {
    if (!isAuthenticated) {
      toast.error("Please login to use wishlist");
      return;
    }
    try {
      if (isWishlisted) {
        await wishlistAPI.removeFromWishlist(product._id);
        setIsWishlisted(false);
        toast.success("Removed from wishlist");
      } else {
        await wishlistAPI.addToWishlist(product._id);
        setIsWishlisted(true);
        toast.success("Added to wishlist!");
      }
    } catch {
      toast.error("Failed to update wishlist");
    }
  };

  // Share handler
  const handleShare = async () => {
    const shareData = {
      title: product.name,
      text:
        product.shortDescription ||
        `Check out ${product.name} at NevanHandicraft!`,
      url: window.location.href,
    };

    try {
      if (navigator.share && navigator.canShare(shareData)) {
        // Use native share on mobile
        await navigator.share(shareData);
      } else {
        // Fallback: copy link to clipboard
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Link copied to clipboard!");
      }
    } catch (error) {
      // User cancelled or error
      if (error.name !== "AbortError") {
        // Fallback: copy to clipboard
        try {
          await navigator.clipboard.writeText(window.location.href);
          toast.success("Link copied to clipboard!");
        } catch {
          toast.error("Failed to share");
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container-app py-20 text-center">
        <h1 className="text-2xl font-bold mb-4">Product Not Found</h1>
        <Link to="/products" className="btn btn-primary">
          Browse Products
        </Link>
      </div>
    );
  }

  const calculateDisplayPrice = () => {
    if (currentVariant) {
      return currentVariant.price;
    }
    return product.price; // Fallback or base price
  };

  const displayPrice = calculateDisplayPrice();
  const discount = calculateDiscount(product.comparePrice, displayPrice);

  // Size Guide state
  const [showSizeGuide, setShowSizeGuide] = useState(false);

  // Reviews state
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);

  // Related products state
  const [relatedProducts, setRelatedProducts] = useState([]);

  useEffect(() => {
    if (product?._id) {
      setReviewsLoading(true);
      api
        .get(`/products/${product._id}/reviews`)
        .then((res) => setReviews(res.data?.data?.reviews || []))
        .catch(() => {})
        .finally(() => setReviewsLoading(false));
    }
  }, [product?._id]);

  // Fetch related products (same category, different product)
  useEffect(() => {
    if (product?.category) {
      const catSlug = product.category?.slug || product.category;
      productsAPI
        .getProducts({ category: catSlug, limit: 4 })
        .then((res) => {
          const related = (res.data?.products || []).filter(
            (p) => p._id !== product._id
          );
          setRelatedProducts(related.slice(0, 4));
        })
        .catch(() => {});
    }
  }, [product?._id, product?.category]);

  const handleReviewSubmitted = () => {
    setShowReviewForm(false);
    // Refresh reviews
    api
      .get(`/products/${product._id}/reviews`)
      .then((res) => setReviews(res.data?.data?.reviews || []));
  };

  return (
    <div className="container-app py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] mb-6">
        <Link to="/" className="hover:text-[var(--color-primary)]">
          Home
        </Link>
        <span>/</span>
        <Link to="/products" className="hover:text-[var(--color-primary)]">
          Products
        </Link>
        <span>/</span>
        <span className="text-[var(--color-text)]">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Image Gallery */}
        <div className="space-y-4">
          <div className="relative aspect-square rounded-xl overflow-hidden bg-[var(--color-bg)]">
            <img
              src={activeImage || product.images[0]?.url || "/placeholder.jpg"}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            {discount > 0 && (
              <span className="absolute top-4 left-4 bg-[var(--color-error)] text-white px-3 py-1 rounded-lg font-medium">
                -{discount}% OFF
              </span>
            )}

            {/* Image Navigation */}
            {product.images.length > 1 && (
              <>
                <button
                  onClick={() => {
                    const newIndex =
                      selectedImage <= 0
                        ? product.images.length - 1
                        : selectedImage - 1;
                    setSelectedImage(newIndex);
                    setActiveImage(product.images[newIndex].url);
                  }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 rounded-full flex items-center justify-center hover:bg-white"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    const newIndex =
                      selectedImage >= product.images.length - 1
                        ? 0
                        : selectedImage + 1;
                    setSelectedImage(newIndex);
                    setActiveImage(product.images[newIndex].url);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 rounded-full flex items-center justify-center hover:bg-white"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>

          {/* Thumbnails */}
          {product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setSelectedImage(idx);
                    setActiveImage(img.url);
                  }}
                  className={`w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border-2 ${
                    selectedImage === idx
                      ? "border-[var(--color-primary)]"
                      : "border-transparent"
                  }`}
                >
                  <img
                    src={img.url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          <div>
            <p className="text-sm text-[var(--color-text-muted)] mb-2">
              {product.category?.name}
            </p>
            <h1 className="text-2xl md:text-3xl font-bold mb-4">
              {product.name}
            </h1>

            {/* Ratings */}
            {product.ratings?.count > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        star <= product.ratings.average
                          ? "fill-[var(--color-accent)] text-[var(--color-accent)]"
                          : "text-[var(--color-border)]"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-[var(--color-text-muted)]">
                  ({product.ratings.count} reviews)
                </span>
              </div>
            )}
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-[var(--color-primary)]">
              {formatPrice(displayPrice)}
            </span>
            {product.comparePrice > displayPrice && (
              <span className="text-xl text-[var(--color-text-muted)] line-through">
                {formatPrice(product.comparePrice)}
              </span>
            )}
          </div>

          {/* Description */}
          <p className="text-[var(--color-text-muted)]">
            {product.description}
          </p>

          {/* Flat Variant Selection */}
          {product.variants?.length > 0 && (
            <div className="space-y-4">
              {/* Size Selector */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium">Size</h3>
                  <button
                    onClick={() => setShowSizeGuide(true)}
                    className="flex items-center gap-1 text-xs text-[var(--color-primary)] hover:underline"
                  >
                    <Ruler className="w-3.5 h-3.5" />
                    Size Guide
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {uniqueSizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => handleSizeChange(size)}
                      className={`px-4 py-2 rounded-lg border transition-colors ${
                        selectedSize === size
                          ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                          : "border-[var(--color-border)] hover:border-[var(--color-primary)]"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Selector (Dependent on Size) */}
              <div>
                <h3 className="font-medium mb-3">Color</h3>
                <div className="flex flex-wrap gap-3">
                  {availableColors.map((color) => {
                    // Optional: find specific variant to check if it has a color image
                    // But typically color is just a string name
                    // We can try to use standard CSS colors or simple naming

                    const colorVariant = product.variants.find(
                      (v) => v.size === selectedSize && v.color === color,
                    );
                    const isOutOfStock = colorVariant?.stock === 0;

                    return (
                      <button
                        key={color}
                        onClick={() => handleColorChange(color)}
                        disabled={isOutOfStock}
                        className={`px-4 py-2 rounded-lg border transition-colors relative
                                                    ${
                                                      selectedColor === color
                                                        ? "border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]"
                                                        : "border-[var(--color-border)] hover:border-[var(--color-primary)]"
                                                    }
                                                    ${isOutOfStock ? "opacity-50 cursor-not-allowed bg-gray-100" : ""}
                                                `}
                      >
                        {color}
                        {isOutOfStock && (
                          <span className="ml-1 text-xs text-red-500">
                            (Out)
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Variant Image Grid (Optional - if useful to show all) */}
          {/* Dropped to simplify UI, reliant on main image changing */}

          {/* Quantity */}
          <div>
            <h3 className="font-medium mb-2">Quantity</h3>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-10 h-10 rounded-lg border border-[var(--color-border)] flex items-center justify-center hover:bg-[var(--color-bg)]"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-12 text-center font-medium">{quantity}</span>
              <button
                onClick={() =>
                  setQuantity((q) => {
                    // Determine max stock based on whether variants exist
                    const maxStock =
                      product.variants?.length > 0
                        ? 99 // Allow selecting up to 99, backend will validate specific variant stock
                        : product.stock;
                    return Math.min(maxStock, q + 1);
                  })
                }
                className="w-10 h-10 rounded-lg border border-[var(--color-border)] flex items-center justify-center hover:bg-[var(--color-bg)]"
              >
                <Plus className="w-4 h-4" />
              </button>
              <span className="text-sm text-[var(--color-text-muted)]">
                {product.variants?.length > 0
                  ? // Optionally show "In Stock" or verified stock of selected variant if logic allows
                    "In Stock"
                  : `${product.stock} available`}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleAddToCart}
              disabled={
                (product.variants?.length > 0 ? false : product.stock === 0) ||
                cartLoading
              }
              className="btn btn-primary flex-1 py-3 disabled:opacity-50"
            >
              {cartLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <ShoppingCart className="w-5 h-5" />
                  {product.variants?.length > 0
                    ? // If variants exist, check if ANY variant has stock (roughly) or rely on validation
                      "Add to Cart"
                    : product.stock === 0
                      ? "Out of Stock"
                      : "Add to Cart"}
                </>
              )}
            </button>
            <button
              onClick={handleWishlist}
              className={`btn btn-secondary p-3 ${isWishlisted ? "text-red-500 bg-red-50 border-red-200 hover:bg-red-100" : ""}`}
              title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            >
              <Heart
                className={`w-5 h-5 ${isWishlisted ? "fill-current" : ""}`}
              />
            </button>
            <button
              onClick={handleShare}
              className="btn btn-secondary p-3"
              title="Share product"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>

          {/* Baby Trust Features */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-[var(--color-border)]">
            <div className="flex items-center gap-2">
              <Baby className="w-5 h-5 text-[var(--color-primary)]" />
              <p className="text-xs text-[var(--color-text-muted)]">
                Baby-Safe
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Leaf className="w-5 h-5 text-green-500" />
              <p className="text-xs text-[var(--color-text-muted)]">
                Eco-Friendly
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-[var(--color-primary)]" />
              <p className="text-xs text-[var(--color-text-muted)]">
                Free Shipping
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-[var(--color-primary)]" />
              <p className="text-xs text-[var(--color-text-muted)]">
                Secure Payment
              </p>
            </div>
          </div>

          {/* Material & Care */}
          <div className="pt-6 border-t border-[var(--color-border)]">
            <h3 className="font-semibold mb-4">Material & Care</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-[var(--color-bg)]">
                <Droplets className="w-5 h-5 text-blue-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Fabric</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {product.material || "100% Soft Cotton"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-[var(--color-bg)]">
                <RefreshCw className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Care Instructions</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {product.careInstructions ||
                      "Machine wash cold, gentle cycle. Tumble dry low."}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-[var(--color-bg)]">
                <Baby className="w-5 h-5 text-[var(--color-primary)] mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Age Recommendation</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {product.ageRecommendation || "0–36 months"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-[var(--color-bg)]">
                <Shield className="w-5 h-5 text-amber-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Safety</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Non-toxic dyes, no small parts, baby-safe
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <section className="mt-12 pt-8 border-t border-[var(--color-border)]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold">Customer Reviews</h2>
            {product.ratings?.count > 0 && (
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        star <= product.ratings.average
                          ? "fill-amber-400 text-amber-400"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-[var(--color-text-muted)]">
                  {product.ratings.average.toFixed(1)} ({product.ratings.count}{" "}
                  {product.ratings.count === 1 ? "review" : "reviews"})
                </span>
              </div>
            )}
          </div>
          {isAuthenticated && (
            <button
              onClick={() => setShowReviewForm((v) => !v)}
              className="btn btn-secondary text-sm"
            >
              {showReviewForm ? "Cancel" : "Write a Review"}
            </button>
          )}
        </div>

        {/* Review Form */}
        {showReviewForm && isAuthenticated && (
          <div className="card p-6 mb-8">
            <ReviewForm
              productId={product._id}
              onReviewSubmitted={handleReviewSubmitted}
            />
          </div>
        )}

        {/* Reviews List */}
        {reviewsLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--color-primary)]" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-8 text-[var(--color-text-muted)]">
            <p>No reviews yet. Be the first to review this product!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div
                key={review._id}
                className="card p-5"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {review.user?.name || "Anonymous"}
                      </span>
                      {review.isVerifiedPurchase && (
                        <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">
                          Verified Purchase
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-3.5 h-3.5 ${
                            star <= review.rating
                              ? "fill-amber-400 text-amber-400"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {review.title && (
                  <p className="font-medium text-sm mt-2">{review.title}</p>
                )}
                {review.comment && (
                  <p className="text-sm text-[var(--color-text-muted)] mt-1">
                    {review.comment}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* You Might Also Like */}
      {relatedProducts.length > 0 && (
        <section className="mt-12 pt-8 border-t border-[var(--color-border)]">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">You Might Also Like</h2>
            <Link
              to={`/products?category=${product.category?.slug || ""}`}
              className="text-sm text-[var(--color-primary)] hover:underline"
            >
              View More
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {relatedProducts.map((rp) => (
              <Link
                key={rp._id}
                to={`/products/${rp.slug}`}
                className="card group"
              >
                <div className="relative aspect-square overflow-hidden">
                  <img
                    src={rp.images?.[0]?.url || "/placeholder.jpg"}
                    alt={rp.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {rp.comparePrice > rp.price && (
                    <span className="absolute top-2 left-2 bg-[var(--color-error)] text-white text-xs px-2 py-1 rounded">
                      -{calculateDiscount(rp.comparePrice, rp.price)}%
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-medium mb-1 line-clamp-2 group-hover:text-[var(--color-primary)]">
                    {rp.name}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[var(--color-primary)]">
                      {formatPrice(rp.price)}
                    </span>
                    {rp.comparePrice > rp.price && (
                      <span className="text-xs text-[var(--color-text-muted)] line-through">
                        {formatPrice(rp.comparePrice)}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Size Guide Modal */}
      <SizeGuide
        isOpen={showSizeGuide}
        onClose={() => setShowSizeGuide(false)}
        currentSize={selectedSize}
      />
    </div>
  );
};

export default ProductDetail;
