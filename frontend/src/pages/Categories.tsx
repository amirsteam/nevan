/**
 * Categories Page
 * Displays all product categories
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { categoriesAPI } from '../api';
import { Loader2 } from 'lucide-react';
import type { ICategory } from '../types';
import { imageUrl, imageSrcSet, onImageError } from '../utils/image';
import { brandLogoFor } from '../utils/brandLogos';
import BrandLogoImage from '../components/BrandLogoImage';
import { usePageTitle } from "../hooks/usePageTitle";

const Categories = () => {
  usePageTitle("Shop by category");
    const [categories, setCategories] = useState<ICategory[]>([]);
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
                // One or two categories (the two Nevan brands) get large tiles instead of a sparse grid
                <div
                    className={`grid grid-cols-2 gap-4 md:gap-6 ${
                        categories.length <= 2 ? 'max-w-3xl mx-auto' : 'md:grid-cols-3 lg:grid-cols-4'
                    }`}
                >
                    {categories.map((category) => {
                        const url = category.image?.url;
                        // An uploaded photo always wins; brand categories fall back to their logo
                        const logo = url ? null : brandLogoFor(category);
                        const subcategories = category.subcategories?.length || 0;
                        const caption = (light: boolean) => (
                            <>
                                <h2 className={`font-semibold sm:text-lg leading-tight ${light ? '' : 'text-[var(--color-text)]'}`}>{category.name}</h2>
                                {subcategories > 0 && (
                                    <p className={`text-xs mt-0.5 ${light ? 'text-white/80' : 'text-[var(--color-text-muted)]'}`}>
                                        {subcategories} {subcategories === 1 ? 'subcategory' : 'subcategories'}
                                    </p>
                                )}
                            </>
                        );

                        if (logo) {
                            return (
                                <Link
                                    key={category._id}
                                    to={`/products?category=${category.slug}`}
                                    className="group flex flex-col rounded-xl overflow-hidden border border-[var(--color-border)] hover:shadow-lg transition-shadow"
                                    style={{ backgroundColor: logo.background }}
                                >
                                    {/* Square logo area, caption below (a caption inside a small square would crowd the logo out) */}
                                    <span className="aspect-square flex items-center justify-center p-3 sm:p-5">
                                        <BrandLogoImage
                                            logo={logo}
                                            sizes="(min-width: 768px) 22rem, 45vw"
                                            className="h-full w-auto max-w-full aspect-square group-hover:scale-105 transition-transform duration-300"
                                        />
                                    </span>
                                    <span className="block bg-[var(--color-surface)] border-t border-[var(--color-border)] px-3 py-2.5 sm:px-4 sm:py-3">{caption(false)}</span>
                                </Link>
                            );
                        }

                        return (
                            <Link
                                key={category._id}
                                to={`/products?category=${category.slug}`}
                                className="group relative aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-[var(--color-primary-soft)] to-[var(--color-accent-light)] border border-[var(--color-border)] hover:shadow-lg transition-all"
                            >
                                {url ? (
                                    <img
                                        src={imageUrl(url, 480)}
                                        srcSet={imageSrcSet(url, 480)}
                                        alt=""
                                        loading="lazy"
                                        decoding="async"
                                        onError={onImageError}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                ) : (
                                    <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center font-display text-7xl text-[var(--color-primary)] opacity-25">
                                        {category.name.charAt(0)}
                                    </span>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
                                <div className="absolute inset-x-0 bottom-0 p-4 text-white">{caption(true)}</div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default Categories;
