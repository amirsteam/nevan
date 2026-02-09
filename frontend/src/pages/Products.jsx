/**
 * Products Page
 * Product listing with filters and pagination
 */
import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { productsAPI, categoriesAPI } from '../api';
import { formatPrice, calculateDiscount, debounce } from '../utils/helpers';
import { Search, Filter, X, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

const Products = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showFilters, setShowFilters] = useState(false);

    // Get current filters from URL
    const currentPage = parseInt(searchParams.get('page')) || 1;
    const currentCategory = searchParams.get('category') || '';
    const currentSearch = searchParams.get('search') || '';
    const currentSort = searchParams.get('sort') || '-createdAt';
    const currentMinPrice = searchParams.get('minPrice') || '';
    const currentMaxPrice = searchParams.get('maxPrice') || '';
    const currentAge = searchParams.get('age') || '';
    const currentGender = searchParams.get('gender') || '';

    // Fetch products
    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);
            try {
                const params = {
                    page: currentPage,
                    limit: 12,
                    sort: currentSort,
                };
                if (currentCategory) params.category = currentCategory;
                if (currentSearch) params.search = currentSearch;
                if (currentMinPrice) params.minPrice = currentMinPrice;
                if (currentMaxPrice) params.maxPrice = currentMaxPrice;
                if (currentAge) params.age = currentAge;
                if (currentGender) params.gender = currentGender;

                const response = await productsAPI.getProducts(params);
                setProducts(response.data.products);
                setPagination(response.pagination);
            } catch (error) {
                console.error('Failed to fetch products:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, [currentPage, currentCategory, currentSearch, currentSort, currentMinPrice, currentMaxPrice, currentAge, currentGender]);

    // Fetch categories
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await categoriesAPI.getCategories();
                setCategories(response.data.categories);
            } catch (error) {
                console.error('Failed to fetch categories:', error);
            }
        };
        fetchCategories();
    }, []);

    // Update filters
    const updateFilters = (key, value) => {
        const newParams = new URLSearchParams(searchParams);
        if (value) {
            newParams.set(key, value);
        } else {
            newParams.delete(key);
        }
        if (key !== 'page') {
            newParams.set('page', '1');
        }
        setSearchParams(newParams);
    };

    const clearFilters = () => {
        setSearchParams({});
    };

    const hasActiveFilters = currentCategory || currentSearch || currentMinPrice || currentMaxPrice || currentAge || currentGender;

    return (
        <div className="container-app py-8">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] mb-6">
                <Link to="/" className="hover:text-[var(--color-primary)] transition-colors">Home</Link>
                <span>/</span>
                <span className="text-[var(--color-text)]">Products</span>
            </nav>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Sidebar Filters (Desktop) */}
                <aside className="hidden lg:block w-64 flex-shrink-0">
                    <div className="sticky top-24 space-y-6">
                        {/* Search */}
                        <div>
                            <h3 className="font-semibold mb-3">Search</h3>
                            <div className="relative">
                                <input
                                    type="text"
                                    defaultValue={currentSearch}
                                    onChange={debounce((e) => updateFilters('search', e.target.value), 500)}
                                    placeholder="Search products..."
                                    className="input pl-10"
                                />
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
                            </div>
                        </div>

                        {/* Categories */}
                        <div>
                            <h3 className="font-semibold mb-3">Categories</h3>
                            <ul className="space-y-2">
                                <li>
                                    <button
                                        onClick={() => updateFilters('category', '')}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${!currentCategory ? 'bg-[var(--color-primary)] text-white' : 'hover:bg-[var(--color-bg)]'
                                            }`}
                                    >
                                        All Products
                                    </button>
                                </li>
                                {categories.map((cat) => (
                                    <li key={cat._id}>
                                        <button
                                            onClick={() => updateFilters('category', cat.slug)}
                                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${currentCategory === cat.slug ? 'bg-[var(--color-primary)] text-white' : 'hover:bg-[var(--color-bg)]'
                                                }`}
                                        >
                                            {cat.name}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Price Range */}
                        <div>
                            <h3 className="font-semibold mb-3">Price Range</h3>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    placeholder="Min"
                                    defaultValue={currentMinPrice}
                                    onChange={debounce((e) => updateFilters('minPrice', e.target.value), 500)}
                                    className="input text-sm"
                                />
                                <input
                                    type="number"
                                    placeholder="Max"
                                    defaultValue={currentMaxPrice}
                                    onChange={debounce((e) => updateFilters('maxPrice', e.target.value), 500)}
                                    className="input text-sm"
                                />
                            </div>
                        </div>

                        {/* Age Range */}
                        <div>
                            <h3 className="font-semibold mb-3">Age Range</h3>
                            <ul className="space-y-1">
                                {[
                                    { value: '', label: 'All Ages' },
                                    { value: '0-3 Months', label: '0–3 Months' },
                                    { value: '3-6 Months', label: '3–6 Months' },
                                    { value: '6-12 Months', label: '6–12 Months' },
                                    { value: '1-2 Years', label: '1–2 Years' },
                                    { value: '2-3 Years', label: '2–3 Years' },
                                ].map((age) => (
                                    <li key={age.value}>
                                        <button
                                            onClick={() => updateFilters('age', age.value)}
                                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                                                currentAge === age.value
                                                    ? 'bg-[var(--color-primary)] text-white'
                                                    : 'hover:bg-[var(--color-bg)]'
                                            }`}
                                        >
                                            {age.label}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Gender */}
                        <div>
                            <h3 className="font-semibold mb-3">Gender</h3>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { value: '', label: 'All' },
                                    { value: 'boy', label: 'Boy' },
                                    { value: 'girl', label: 'Girl' },
                                    { value: 'unisex', label: 'Unisex' },
                                ].map((g) => (
                                    <button
                                        key={g.value}
                                        onClick={() => updateFilters('gender', g.value)}
                                        className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                                            currentGender === g.value
                                                ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                                                : 'border-[var(--color-border)] hover:border-[var(--color-primary)]'
                                        }`}
                                    >
                                        {g.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Clear Filters */}
                        {hasActiveFilters && (
                            <button
                                onClick={clearFilters}
                                className="btn btn-secondary w-full text-sm"
                            >
                                <X className="w-4 h-4" />
                                Clear Filters
                            </button>
                        )}
                    </div>
                </aside>

                {/* Main Content */}
                <div className="flex-1">
                    {/* Header */}
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                        <div>
                            <h1 className="text-2xl font-bold">
                                {currentCategory ? categories.find(c => c.slug === currentCategory)?.name || 'Products' : 'All Products'}
                            </h1>
                            {pagination && (
                                <p className="text-sm text-[var(--color-text-muted)]">
                                    Showing {products.length} of {pagination.totalItems} products
                                </p>
                            )}
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Mobile Filter Toggle */}
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className="lg:hidden btn btn-secondary text-sm"
                            >
                                <Filter className="w-4 h-4" />
                                Filters
                            </button>

                            {/* Sort */}
                            <select
                                value={currentSort}
                                onChange={(e) => updateFilters('sort', e.target.value)}
                                className="input text-sm w-auto"
                            >
                                <option value="-createdAt">Newest</option>
                                <option value="createdAt">Oldest</option>
                                <option value="price">Price: Low to High</option>
                                <option value="-price">Price: High to Low</option>
                                <option value="-ratings.average">Best Rated</option>
                            </select>
                        </div>
                    </div>

                    {/* Products Grid */}
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
                        </div>
                    ) : products.length === 0 ? (
                        <div className="text-center py-20">
                            <p className="text-lg text-[var(--color-text-muted)] mb-4">No products found</p>
                            <button onClick={clearFilters} className="btn btn-primary">
                                Clear Filters
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                            {products.map((product) => (
                                <Link
                                    key={product._id}
                                    to={`/products/${product.slug}`}
                                    className="card group"
                                >
                                    <div className="relative aspect-square overflow-hidden">
                                        <img
                                            src={product.images[0]?.url || '/placeholder.jpg'}
                                            alt={product.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                        {product.comparePrice > product.price && (
                                            <span className="absolute top-2 left-2 bg-[var(--color-error)] text-white text-xs px-2 py-1 rounded">
                                                -{calculateDiscount(product.comparePrice, product.price)}%
                                            </span>
                                        )}
                                        {product.stock === 0 && (
                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                <span className="bg-white text-[var(--color-text)] px-4 py-2 rounded-lg font-medium">
                                                    Out of Stock
                                                </span>
                                            </div>
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

                    {/* Pagination */}
                    {pagination && pagination.totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 mt-8">
                            <button
                                onClick={() => updateFilters('page', currentPage - 1)}
                                disabled={currentPage === 1}
                                className="btn btn-secondary text-sm disabled:opacity-50"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="px-4 py-2 text-sm">
                                Page {currentPage} of {pagination.totalPages}
                            </span>
                            <button
                                onClick={() => updateFilters('page', currentPage + 1)}
                                disabled={currentPage === pagination.totalPages}
                                className="btn btn-secondary text-sm disabled:opacity-50"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Products;
