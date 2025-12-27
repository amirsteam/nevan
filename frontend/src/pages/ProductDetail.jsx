/**
 * Product Detail Page
 * Single product view with images, details, variants, and add to cart
 */
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { productsAPI } from '../api';
import { addToCart, selectCartLoading } from '../store/cartSlice';
import { useAuth } from '../context/AuthContext';
import { formatPrice, calculateDiscount } from '../utils/helpers';
import toast from 'react-hot-toast';
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
    Loader2,
} from 'lucide-react';

const ProductDetail = () => {
    const { slug } = useParams();
    const dispatch = useDispatch();
    const { isAuthenticated } = useAuth();
    const cartLoading = useSelector(selectCartLoading);

    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState(0);
    const [quantity, setQuantity] = useState(1);
    const [selectedVariants, setSelectedVariants] = useState({});

    // Initialize logic
    useEffect(() => {
        const fetchProduct = async () => {
            setLoading(true);
            try {
                const response = await productsAPI.getProduct(slug);
                const fetchedProduct = response.data.product;
                setProduct(fetchedProduct);

                // Initialize variant selections - single select for ALL
                const initialVariants = {};
                fetchedProduct.variants?.forEach((variant) => {
                    if (variant.options.length > 0) {
                        initialVariants[variant.name] = variant.options[0];
                    }
                });
                setSelectedVariants(initialVariants);
                
                // Set initial image from color variant if it has one
                const colorVariant = fetchedProduct.variants?.find(v => v.name.toLowerCase() === 'color');
                if (colorVariant?.options[0]?.image) {
                    const imgIndex = fetchedProduct.images.findIndex(img => img.url === colorVariant.options[0].image);
                    if (imgIndex !== -1) setSelectedImage(imgIndex);
                }

            } catch (error) {
                console.error('Failed to fetch product:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchProduct();
    }, [slug]);

    // Single-select variant change for ALL variants
    const handleVariantChange = (variantName, option) => {
        setSelectedVariants((prev) => ({
            ...prev,
            [variantName]: option,
        }));

        // Switch main image if this option has an image (for colors)
        if (option.image) {
            const imgIndex = product.images.findIndex(img => img.url === option.image);
            if (imgIndex !== -1) {
                setSelectedImage(imgIndex);
            }
        }
    };

    const handleAddToCart = async () => {
        if (!isAuthenticated) {
            toast.error('Please login to add items to cart');
            return;
        }

        // Build variants array for cart
        const variantsToAdd = Object.entries(selectedVariants).map(([name, option]) => ({
            variantName: name,
            optionValue: option.value,
        }));

        try {
            await dispatch(addToCart({
                productId: product._id,
                quantity,
                selectedVariants: variantsToAdd,
            })).unwrap();
            toast.success('Added to cart!');
        } catch (error) {
            console.error(error);
            toast.error(error || 'Failed to add to cart');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
            </div>
        );
    }
    
    // ... render check existing ...
    if (!product) { /* ... same ... */ return (
            <div className="container-app py-20 text-center">
                <h1 className="text-2xl font-bold mb-4">Product Not Found</h1>
                <Link to="/products" className="btn btn-primary">
                    Browse Products
                </Link>
            </div>
        );
    }

    const calculateTotalPrice = () => {
        const basePrice = product.price;
        // Sum all selected variant modifiers
        const modifiers = Object.values(selectedVariants).reduce(
            (sum, opt) => sum + (opt?.priceModifier || 0),
            0
        );
        return basePrice + modifiers;
    };

    const currentPrice = calculateTotalPrice();
    const discount = calculateDiscount(product.comparePrice, currentPrice);

    return (
        <div className="container-app py-8">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] mb-6">
                <Link to="/" className="hover:text-[var(--color-primary)]">Home</Link>
                <span>/</span>
                <Link to="/products" className="hover:text-[var(--color-primary)]">Products</Link>
                <span>/</span>
                <span className="text-[var(--color-text)]">{product.name}</span>
            </nav>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                {/* Image Gallery */}
                <div className="space-y-4">
                    <div className="relative aspect-square rounded-xl overflow-hidden bg-[var(--color-bg)]">
                        <img
                            src={product.images[selectedImage]?.url || '/placeholder.jpg'}
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
                                    onClick={() => setSelectedImage((prev) => prev === 0 ? product.images.length - 1 : prev - 1)}
                                    className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 rounded-full flex items-center justify-center hover:bg-white"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => setSelectedImage((prev) => prev === product.images.length - 1 ? 0 : prev + 1)}
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
                                    onClick={() => setSelectedImage(idx)}
                                    className={`w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border-2 ${selectedImage === idx ? 'border-[var(--color-primary)]' : 'border-transparent'
                                        }`}
                                >
                                    <img src={img.url} alt="" className="w-full h-full object-cover" />
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
                        <h1 className="text-2xl md:text-3xl font-bold mb-4">{product.name}</h1>

                        {/* Ratings */}
                        {product.ratings?.count > 0 && (
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                            key={star}
                                            className={`w-4 h-4 ${star <= product.ratings.average
                                                    ? 'fill-[var(--color-accent)] text-[var(--color-accent)]'
                                                    : 'text-[var(--color-border)]'
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
                            {formatPrice(currentPrice)}
                        </span>
                        {product.comparePrice > currentPrice && (
                            <span className="text-xl text-[var(--color-text-muted)] line-through">
                                {formatPrice(product.comparePrice)}
                            </span>
                        )}
                    </div>

                    {/* Description */}
                    <p className="text-[var(--color-text-muted)]">{product.description}</p>

                    {/* Variants */}
                    {product.variants?.map((variant) => (
                        <div key={variant._id}>
                            <h3 className="font-medium mb-2">{variant.name}</h3>
                            
                            {/* Render based on variant type */}
                            {variant.name.toLowerCase() === 'size' ? (
                                // BUTTON SWATCHES FOR SIZE
                                <div className="flex flex-wrap gap-2">
                                    {variant.options.map((option) => {
                                        const isSelected = selectedVariants[variant.name]?._id === option._id;
                                        return (
                                            <button
                                                key={option._id}
                                                type="button"
                                                onClick={() => handleVariantChange(variant.name, option)}
                                                disabled={option.stock === 0}
                                                className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all
                                                    ${isSelected
                                                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                                                        : option.stock === 0
                                                            ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                                                            : 'border-[var(--color-border)] hover:border-[var(--color-primary)] bg-white'
                                                    }
                                                `}
                                            >
                                                {option.value}
                                                {option.priceModifier > 0 && (
                                                    <span className="ml-1 text-xs opacity-75">
                                                        (+{formatPrice(option.priceModifier)})
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : variant.name.toLowerCase() === 'color' ? (
                                // SWATCHES FOR COLOR
                                <div className="flex flex-wrap gap-3">
                                    {variant.options.map((option) => (
                                        <button
                                            key={option._id}
                                            onClick={() => handleVariantChange(variant.name, option)}
                                            disabled={option.stock === 0}
                                            title={`${option.value}${option.priceModifier > 0 ? ` (+${formatPrice(option.priceModifier)})` : ''}`}
                                            className={`w-10 h-10 rounded-full border-2 transition-all relative
                                                ${selectedVariants[variant.name]?.value === option.value
                                                    ? 'border-[var(--color-primary)] scale-110 ring-2 ring-[var(--color-primary)] ring-offset-2'
                                                    : 'border-gray-200 hover:border-gray-300'
                                                }
                                                ${option.stock === 0 ? 'opacity-50 cursor-not-allowed' : ''}
                                            `}
                                            style={
                                                option.image 
                                                ? { 
                                                    backgroundImage: `url(${option.image})`,
                                                    backgroundSize: 'cover',
                                                    backgroundPosition: 'center',
                                                    backgroundColor: option.value.toLowerCase() // fallback
                                                  }
                                                : { backgroundColor: option.value.toLowerCase() }
                                            }
                                        >
                                            {/* Fallback for invalid colors or just purely visual consistency */}
                                            <span className="sr-only">{option.value}</span>
                                            {option.stock === 0 && (
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <div className="w-full h-0.5 bg-gray-400 rotate-45"></div>
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                // STANDARD BUTTONS FOR OTHER VARIANTS
                                <div className="flex flex-wrap gap-2">
                                    {variant.options.map((option) => (
                                        <button
                                            key={option._id}
                                            onClick={() => handleVariantChange(variant.name, option)}
                                            disabled={option.stock === 0}
                                            className={`px-4 py-2 rounded-lg border transition-colors ${selectedVariants[variant.name]?.value === option.value
                                                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                                                    : option.stock === 0
                                                        ? 'border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-muted)] cursor-not-allowed'
                                                        : 'border-[var(--color-border)] hover:border-[var(--color-primary)]'
                                                }`}
                                        >
                                            {option.value}
                                            {option.priceModifier > 0 && ` (+${formatPrice(option.priceModifier)})`}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}

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
                                onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                                className="w-10 h-10 rounded-lg border border-[var(--color-border)] flex items-center justify-center hover:bg-[var(--color-bg)]"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                            <span className="text-sm text-[var(--color-text-muted)]">
                                {product.stock} available
                            </span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={handleAddToCart}
                            disabled={product.stock === 0 || cartLoading}
                            className="btn btn-primary flex-1 py-3 disabled:opacity-50"
                        >
                            {cartLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <ShoppingCart className="w-5 h-5" />
                                    {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                                </>
                            )}
                        </button>
                        <button className="btn btn-secondary p-3">
                            <Heart className="w-5 h-5" />
                        </button>
                        <button className="btn btn-secondary p-3">
                            <Share2 className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Features */}
                    <div className="grid grid-cols-3 gap-4 pt-6 border-t border-[var(--color-border)]">
                        <div className="text-center">
                            <Truck className="w-6 h-6 mx-auto mb-2 text-[var(--color-primary)]" />
                            <p className="text-xs text-[var(--color-text-muted)]">Free Shipping</p>
                        </div>
                        <div className="text-center">
                            <RefreshCw className="w-6 h-6 mx-auto mb-2 text-[var(--color-primary)]" />
                            <p className="text-xs text-[var(--color-text-muted)]">Easy Returns</p>
                        </div>
                        <div className="text-center">
                            <Shield className="w-6 h-6 mx-auto mb-2 text-[var(--color-primary)]" />
                            <p className="text-xs text-[var(--color-text-muted)]">Secure Payment</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductDetail;
