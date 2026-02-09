/**
 * Categories Page
 * Displays all product categories
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { categoriesAPI } from '../api';
import { Loader2 } from 'lucide-react';

const Categories = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await categoriesAPI.getCategories();
                setCategories(response.data.categories);
            } catch (error) {
                console.error('Failed to fetch categories:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchCategories();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
            </div>
        );
    }

    return (
        <div className="container-app py-12">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] mb-6">
                <Link to="/" className="hover:text-[var(--color-primary)] transition-colors">Home</Link>
                <span>/</span>
                <span className="text-[var(--color-text)]">Categories</span>
            </nav>

            <div className="text-center mb-12">
                <h1 className="text-3xl md:text-4xl font-bold mb-4">Browse Categories</h1>
                <p className="text-[var(--color-text-muted)] max-w-2xl mx-auto">
                    Explore our handmade baby clothing and accessories by category
                </p>
            </div>

            {categories.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-lg text-[var(--color-text-muted)]">No categories found</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {categories.map((category) => (
                        <Link
                            key={category._id}
                            to={`/products?category=${category.slug}`}
                            className="group relative aspect-square rounded-xl overflow-hidden bg-[var(--color-surface)] border border-[var(--color-border)] hover:shadow-lg transition-all"
                        >
                            {/* Image */}
                            <div className="w-full h-full">
                                <img
                                    src={category.image?.url || '/placeholder-category.jpg'}
                                    alt={category.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                            </div>

                            {/* Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />

                            {/* Content */}
                            <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                                <h3 className="font-semibold text-lg mb-1">{category.name}</h3>
                                {category.subcategories && category.subcategories.length > 0 && (
                                    <p className="text-xs text-white/80">
                                        {category.subcategories.length} Subcategories
                                    </p>
                                )}
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Categories;
