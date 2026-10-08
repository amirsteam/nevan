/**
 * Products Management Page
 * List, create, edit, delete products with full CRUD operations
 */
import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { adminAPI } from '../../api';
import { formatPrice, getErrorMessage } from '../../utils/helpers';
import {
    DataTable,
    Pagination,
    SearchInput,
    StatusBadge,
    ConfirmDialog,
} from '../../components/admin';
import { usePageTitle } from '../../hooks/usePageTitle';
import { LOW_STOCK_DISPLAY } from '../../config/store';
import {
    Plus,
    Edit,
    Trash2,
    Eye,
    Star,
    Package,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { DataTableColumn, DataTableAction } from '../../components/admin/DataTable';
import type { ICategory, IProduct } from '../../types';

const STOCK_FILTERS = ['low', 'out'] as const;
type StockFilter = (typeof STOCK_FILTERS)[number];

const Products = () => {
    usePageTitle('Products');
    const navigate = useNavigate();

    // State
    const [products, setProducts] = useState<IProduct[]>([]);
    const [categories, setCategories] = useState<ICategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: 20,
    });

    // Filters live in the URL so they survive edits/back and the dashboard
    // can link to e.g. ?stock=low
    const [searchParams, setSearchParams] = useSearchParams();
    const search = searchParams.get('search') || '';
    const categoryFilter = searchParams.get('category') || '';
    const statusFilter = searchParams.get('status') || '';
    const stockParam = searchParams.get('stock') || '';
    const stockFilter: StockFilter | '' = (STOCK_FILTERS as readonly string[]).includes(stockParam)
        ? (stockParam as StockFilter)
        : '';
    const currentPage = Math.max(1, Number(searchParams.get('page')) || 1);

    const setFilter = (key: string, value: string) => {
        setSearchParams(
            (prev) => {
                const next = new URLSearchParams(prev);
                if (value) next.set(key, value);
                else next.delete(key);
                if (key !== 'page') next.delete('page');
                return next;
            },
            { replace: true },
        );
    };

    const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; product: IProduct | null }>({ open: false, product: null });
    const [deleting, setDeleting] = useState(false);

    // Fetch products
    const fetchProducts = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                page: currentPage,
                limit: pagination.itemsPerPage,
                search: search || undefined,
                category: categoryFilter || undefined,
                isActive: statusFilter ? statusFilter === 'active' : undefined,
                stock: stockFilter || undefined,
            };

            const response = await adminAPI.getProducts(params);
            setProducts(response.data.data.products);
            setPagination((prev) => ({
                ...prev,
                totalPages: response.data.pagination?.totalPages || 1,
                totalItems: response.data.pagination?.totalItems ?? response.data.results ?? 0,
            }));
        } catch (error) {
            console.error('Failed to fetch products:', error);
            toast.error('Failed to load products');
        } finally {
            setLoading(false);
        }
    }, [currentPage, pagination.itemsPerPage, search, categoryFilter, statusFilter, stockFilter]);

    // Fetch categories for filter dropdown
    const fetchCategories = async () => {
        try {
            const response = await adminAPI.getCategories();
            setCategories(response.data.data.categories);
        } catch (error) {
            console.error('Failed to fetch categories:', error);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    useEffect(() => {
        fetchCategories();
    }, []);

    const handleSearch = (value: string) => setFilter('search', value);
    const handlePageChange = (page: number) => setFilter('page', page > 1 ? String(page) : '');
    const handleEdit = (product: IProduct) => navigate(`/admin/products/${product._id}/edit`);

    // Handle delete confirmation
    const handleDeleteClick = (product: IProduct) => {
        setDeleteDialog({ open: true, product });
    };

    // Confirm delete
    const handleDeleteConfirm = async () => {
        if (!deleteDialog.product) return;

        setDeleting(true);
        try {
            await adminAPI.deleteProduct(deleteDialog.product._id);
            toast.success('Product deleted successfully');
            fetchProducts();
        } catch (error) {
            toast.error(getErrorMessage(error, 'Failed to delete product'));
        } finally {
            setDeleting(false);
            setDeleteDialog({ open: false, product: null });
        }
    };

    // Table columns
    const columns: DataTableColumn<IProduct>[] = [
        {
            key: 'image',
            label: '',
            width: '60px',
            render: (_, product) => {
                const primaryImage = product.images?.find((img) => img.isPrimary) || product.images?.[0];
                return (
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-[var(--color-bg)] flex items-center justify-center">
                        {primaryImage ? (
                            <img
                                src={primaryImage.url}
                                alt={product.name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <Package className="w-5 h-5 text-[var(--color-text-muted)]" />
                        )}
                    </div>
                );
            },
        },
        {
            key: 'name',
            label: 'Product',
            sortable: true,
            render: (name, product) => (
                <div>
                    <p className="font-medium">{name}</p>
                    <p className="text-sm text-[var(--color-text-muted)]">
                        SKU: {product.sku || 'N/A'}
                    </p>
                </div>
            ),
        },
        {
            key: 'category',
            label: 'Category',
            render: (category) => category?.name || 'Uncategorized',
        },
        {
            key: 'price',
            label: 'Price',
            sortable: true,
            // With sizes/colours, `price` is the cheapest option's
            render: (price, product) => (
                <div>
                    <p className="font-medium">
                        {product.variants?.some((v) => v.price !== price) && (
                            <span className="text-xs font-normal text-[var(--color-text-muted)] mr-1">From</span>
                        )}
                        {formatPrice(price)}
                    </p>
                    {(product.comparePrice ?? 0) > price && (
                        <p className="text-sm line-through text-[var(--color-text-muted)]">
                            {formatPrice(product.comparePrice)}
                        </p>
                    )}
                </div>
            ),
        },
        {
            key: 'stock',
            label: 'Stock',
            sortable: true,
            render: (stock, product) => {
                const totalStock = product.variants?.length
                    ? product.variants.reduce((sum, v) => sum + (v.stock || 0), 0)
                    : stock;
                if (totalStock <= 0) {
                    return <StatusBadge status="Out of stock" variant="error" />;
                }
                return (
                    <span className={totalStock <= LOW_STOCK_DISPLAY ? 'font-semibold text-[var(--color-warning)]' : ''}>
                        {totalStock}
                        {totalStock <= LOW_STOCK_DISPLAY && <span className="block text-xs font-normal">Low</span>}
                    </span>
                );
            },
        },
        {
            key: 'isFeatured',
            label: 'Featured',
            render: (isFeatured) => (
                isFeatured ? (
                    <Star className="w-5 h-5 text-[var(--color-accent)] fill-current" />
                ) : (
                    <Star className="w-5 h-5 text-[var(--color-text-muted)]" />
                )
            ),
        },
        {
            key: 'isActive',
            label: 'Status',
            render: (isActive) => (
                <StatusBadge
                    status={isActive ? 'Active' : 'Inactive'}
                    variant={isActive ? 'success' : 'error'}
                />
            ),
        },
    ];

    // Table row actions
    const getRowActions = (product: IProduct): DataTableAction<IProduct>[] => [
        {
            label: 'View',
            icon: Eye,
            onClick: () => window.open(`/products/${product.slug}`, '_blank'),
        },
        {
            label: 'Edit',
            icon: Edit,
            onClick: () => handleEdit(product),
        },
        {
            label: 'Delete',
            icon: Trash2,
            variant: 'danger',
            onClick: () => handleDeleteClick(product),
        },
    ];

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h1 className="text-2xl font-bold">Products</h1>
                <Link to="/admin/products/new" className="btn btn-primary">
                    <Plus className="w-5 h-5" aria-hidden="true" />
                    Add Product
                </Link>
            </div>

            {/* Filters */}
            <div className="card mb-6">
                <div className="p-4 flex flex-col sm:flex-row gap-4">
                    <SearchInput
                        value={search}
                        onChange={handleSearch}
                        placeholder="Search products..."
                        className="flex-1"
                    />

                    <div className="flex flex-wrap gap-3">
                        <select
                            value={categoryFilter}
                            onChange={(e) => setFilter('category', e.target.value)}
                            className="select w-auto"
                            aria-label="Filter by category"
                        >
                            <option value="">All Categories</option>
                            {categories.map((cat) => (
                                <option key={cat._id} value={cat._id}>
                                    {cat.name}
                                </option>
                            ))}
                        </select>

                        <select
                            value={statusFilter}
                            onChange={(e) => setFilter('status', e.target.value)}
                            className="select w-auto"
                            aria-label="Filter by status"
                        >
                            <option value="">All Status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>

                        <select
                            value={stockFilter}
                            onChange={(e) => setFilter('stock', e.target.value)}
                            className="select w-auto"
                            aria-label="Filter by stock"
                        >
                            <option value="">All Stock</option>
                            <option value="low">Low stock</option>
                            <option value="out">Out of stock</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Products Table */}
            <div className="card">
                <DataTable
                    columns={columns}
                    data={products}
                    loading={loading}
                    emptyMessage="No products found"
                    actions={getRowActions}
                />

                {/* Pagination */}
                {!loading && products.length > 0 && (
                    <div className="p-4 border-t border-[var(--color-border)]">
                        <Pagination
                            currentPage={currentPage}
                            totalPages={pagination.totalPages}
                            totalItems={pagination.totalItems}
                            itemsPerPage={pagination.itemsPerPage}
                            onPageChange={handlePageChange}
                        />
                    </div>
                )}
            </div>

            {/* Delete Confirmation */}
            <ConfirmDialog
                isOpen={deleteDialog.open}
                onClose={() => setDeleteDialog({ open: false, product: null })}
                onConfirm={handleDeleteConfirm}
                title="Delete Product"
                message={`Are you sure you want to delete "${deleteDialog.product?.name}"? This action cannot be undone.`}
                confirmText="Delete"
                variant="danger"
                loading={deleting}
            />
        </div>
    );
};

export default Products;
