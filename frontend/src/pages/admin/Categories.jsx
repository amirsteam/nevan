/**
 * Categories Management Page
 * List, create, edit, delete categories
 */
import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../api';
import {
    DataTable,
    SearchInput,
    ConfirmDialog,
    Modal,
} from '../../components/admin';
import CategoryForm from './CategoryForm';
import { Plus, Edit, Trash2, FolderTree, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';

const Categories = () => {
    // State
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Modals
    const [showForm, setShowForm] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [deleteDialog, setDeleteDialog] = useState({ open: false, category: null });
    const [deleting, setDeleting] = useState(false);

    // Fetch categories
    const fetchCategories = useCallback(async () => {
        setLoading(true);
        try {
            const response = await adminAPI.getCategories();
            setCategories(response.data.data.categories);
        } catch (error) {
            console.error('Failed to fetch categories:', error);
            toast.error('Failed to load categories');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    // Filter categories by search
    const filteredCategories = categories.filter((cat) =>
        cat.name.toLowerCase().includes(search.toLowerCase())
    );

    // Open create form
    const handleCreate = () => {
        setEditingCategory(null);
        setShowForm(true);
    };

    // Open edit form
    const handleEdit = (category) => {
        setEditingCategory(category);
        setShowForm(true);
    };

    // Handle delete click
    const handleDeleteClick = (category) => {
        setDeleteDialog({ open: true, category });
    };

    // Confirm delete
    const handleDeleteConfirm = async () => {
        if (!deleteDialog.category) return;

        setDeleting(true);
        try {
            await adminAPI.deleteCategory(deleteDialog.category._id);
            toast.success('Category deleted successfully');
            fetchCategories();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete category');
        } finally {
            setDeleting(false);
            setDeleteDialog({ open: false, category: null });
        }
    };

    // Handle form success
    const handleFormSuccess = () => {
        setShowForm(false);
        setEditingCategory(null);
        fetchCategories();
    };

    // Get parent categories for dropdown
    const getParentCategories = () => {
        return categories.filter((cat) => !cat.parent);
    };

    // Count children
    const getChildCount = (categoryId) => {
        return categories.filter((cat) => cat.parent?._id === categoryId || cat.parent === categoryId).length;
    };

    // Table columns
    const columns = [
        {
            key: 'image',
            label: '',
            width: '60px',
            render: (_, category) => (
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-[var(--color-bg)] flex items-center justify-center">
                    {category.image?.url ? (
                        <img
                            src={category.image.url}
                            alt={category.name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <FolderTree className="w-5 h-5 text-[var(--color-text-muted)]" />
                    )}
                </div>
            ),
        },
        {
            key: 'name',
            label: 'Name',
            sortable: true,
            render: (name, category) => (
                <div>
                    <p className="font-medium">{name}</p>
                    <p className="text-sm text-[var(--color-text-muted)]">
                        /{category.slug}
                    </p>
                </div>
            ),
        },
        {
            key: 'parent',
            label: 'Parent',
            render: (parent) => parent?.name || '-',
        },
        {
            key: 'children',
            label: 'Subcategories',
            render: (_, category) => {
                const count = getChildCount(category._id);
                return count > 0 ? `${count} subcategories` : '-';
            },
        },
        {
            key: 'order',
            label: 'Order',
            sortable: true,
        },
        {
            key: 'isActive',
            label: 'Status',
            render: (isActive) => (
                <span className={`badge ${isActive ? 'badge-success' : 'badge-error'}`}>
                    {isActive ? 'Active' : 'Inactive'}
                </span>
            ),
        },
    ];

    // Row actions
    const getRowActions = (category) => [
        {
            label: 'Edit',
            icon: Edit,
            onClick: () => handleEdit(category),
        },
        {
            label: 'Delete',
            icon: Trash2,
            variant: 'danger',
            onClick: () => handleDeleteClick(category),
        },
    ];

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h1 className="text-2xl font-bold">Categories</h1>
                <button onClick={handleCreate} className="btn btn-primary">
                    <Plus className="w-5 h-5" />
                    Add Category
                </button>
            </div>

            {/* Search */}
            <div className="card mb-6">
                <div className="p-4">
                    <SearchInput
                        value={search}
                        onChange={setSearch}
                        placeholder="Search categories..."
                        className="max-w-md"
                    />
                </div>
            </div>

            {/* Categories Table */}
            <div className="card">
                <DataTable
                    columns={columns}
                    data={filteredCategories}
                    loading={loading}
                    emptyMessage="No categories found"
                    actions={getRowActions}
                />
            </div>

            {/* Category Form Modal */}
            <Modal
                isOpen={showForm}
                onClose={() => {
                    setShowForm(false);
                    setEditingCategory(null);
                }}
                title={editingCategory ? 'Edit Category' : 'Create Category'}
                size="md"
            >
                <CategoryForm
                    category={editingCategory}
                    parentCategories={getParentCategories()}
                    onSuccess={handleFormSuccess}
                    onCancel={() => {
                        setShowForm(false);
                        setEditingCategory(null);
                    }}
                />
            </Modal>

            {/* Delete Confirmation */}
            <ConfirmDialog
                isOpen={deleteDialog.open}
                onClose={() => setDeleteDialog({ open: false, category: null })}
                onConfirm={handleDeleteConfirm}
                title="Delete Category"
                message={
                    getChildCount(deleteDialog.category?._id) > 0
                        ? `"${deleteDialog.category?.name}" has subcategories. Deleting this will make them root categories. Continue?`
                        : `Are you sure you want to delete "${deleteDialog.category?.name}"?`
                }
                confirmText="Delete"
                variant="danger"
                loading={deleting}
            />
        </div>
    );
};

export default Categories;
