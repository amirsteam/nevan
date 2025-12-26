/**
 * Products Management Page
 * List, create, edit, delete products with full CRUD operations
 */
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../api';
import { formatPrice } from '../../utils/helpers';
import {
    DataTable,
    Pagination,
    SearchInput,
    StatusBadge,
    ConfirmDialog,
    LoadingSpinner,
    Modal,
} from '../../components/admin';
import ProductForm from './ProductForm';
import {
    Plus,
    Edit,
    Trash2,
    Image as ImageIcon,
    Eye,
    Star,
    Package,
    Filter,
} from 'lucide-react';
import toast from 'react-hot-toast';

const Products = () => {
    // State
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: 20,
    });

    // Filters
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    // Modals
    const [showProductForm, setShowProductForm] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [deleteDialog, setDeleteDialog] = useState({ open: false, product: null });
    const [deleting, setDeleting] = useState(false);

    // Fetch products
    const fetchProducts = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                page: pagination.currentPage,
                limit: pagination.itemsPerPage,
            };
            if (search) params.search = search;
            if (categoryFilter) params.category = categoryFilter;
            if (statusFilter) params.isActive = statusFilter === 'active';

            const response = await adminAPI.getProducts(params);
            setProducts(response.data.data.products);
            setPagination((prev) => ({
                ...prev,
                totalPages: response.data.pagination?.totalPages || 1,
                totalItems: response.data.pagination?.totalItems || response.data.results,
            }));
        } catch (error) {
            console.error('Failed to fetch products:', error);
            toast.error('Failed to load products');
        } finally {
            setLoading(false);
        }
    }, [pagination.currentPage, pagination.itemsPerPage, search, categoryFilter, statusFilter]);

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

    // Handle search with reset pagination
    const handleSearch = (value) => {
        setSearch(value);
        setPagination((prev) => ({ ...prev, currentPage: 1 }));
    };

    // Handle page change
    const handlePageChange = (page) => {
        setPagination((prev) => ({ ...prev, currentPage: page }));
    };

    // Open create form
    const handleCreate = () => {
        setEditingProduct(null);
        setShowProductForm(true);
    };

    // Open edit form
    const handleEdit = (product) => {
        setEditingProduct(product);
        setShowProductForm(true);
    };

    // Handle delete confirmation
    const handleDeleteClick = (product) => {
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
            toast.error(error.response?.data?.message || 'Failed to delete product');
        } finally {
            setDeleting(false);
            setDeleteDialog({ open: false, product: null });
        }
    };

    // Handle form submit success
    const handleFormSuccess = () => {
        setShowProductForm(false);
        setEditingProduct(null);
        fetchProducts();
    };

    // Table columns
    const columns = [
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
            render: (price, product) => (
                <div>
                    <p className="font-medium">{formatPrice(price)}</p>
                    {product.comparePrice > price && (
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
                const totalStock = product.variants?.length > 0
                    ? product.variants.reduce((sum, v) => sum + v.options.reduce((s, o) => s + o.stock, 0), 0)
                    : stock;
                return (
                    <span className={totalStock < 10 ? 'text-[var(--color-error)]' : ''}>
                        {totalStock}
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
    const getRowActions = (product) => [
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
                <button onClick={handleCreate} className="btn btn-primary">
                    <Plus className="w-5 h-5" />
                    Add Product
                </button>
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

                    <div className="flex gap-3">
                        <select
                            value={categoryFilter}
                            onChange={(e) => {
                                setCategoryFilter(e.target.value);
                                setPagination((prev) => ({ ...prev, currentPage: 1 }));
                            }}
                            className="select w-auto"
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
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                setPagination((prev) => ({ ...prev, currentPage: 1 }));
                            }}
                            className="select w-auto"
                        >
                            <option value="">All Status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
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
                            currentPage={pagination.currentPage}
                            totalPages={pagination.totalPages}
                            totalItems={pagination.totalItems}
                            itemsPerPage={pagination.itemsPerPage}
                            onPageChange={handlePageChange}
                        />
                    </div>
                )}
            </div>

            {/* Product Form Modal */}
            <Modal
                isOpen={showProductForm}
                onClose={() => {
                    setShowProductForm(false);
                    setEditingProduct(null);
                }}
                title={editingProduct ? 'Edit Product' : 'Create Product'}
                size="xl"
            >
                <ProductForm
                    product={editingProduct}
                    categories={categories}
                    onSuccess={handleFormSuccess}
                    onCancel={() => {
                        setShowProductForm(false);
                        setEditingProduct(null);
                    }}
                />
            </Modal>

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
