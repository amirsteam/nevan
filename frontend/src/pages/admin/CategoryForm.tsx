/**
 * CategoryForm Component
 * Create/Edit category form with image upload
 */
import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { adminAPI } from '../../api';
import { Loader2, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';
import type { ICategory, IImage } from '../../types';
import { getErrorMessage, populated } from '../../utils/helpers';

interface CategoryFormProps {
    category?: ICategory | null;
    parentCategories: ICategory[];
    onSuccess: () => void;
    onCancel: () => void;
}

interface CategoryFormData {
    name: string;
    description: string;
    parent: string;
    order: number | string;
    isActive: boolean;
}

const CategoryForm = ({ category, parentCategories, onSuccess, onCancel }: CategoryFormProps) => {
    const isEdit = Boolean(category);

    // Form state
    const [formData, setFormData] = useState<CategoryFormData>({
        name: '',
        description: '',
        parent: '',
        order: 0,
        isActive: true,
    });

    // Image state
    const [existingImage, setExistingImage] = useState<IImage | null>(null);
    const [newImage, setNewImage] = useState<File | null>(null);
    const [newImagePreview, setNewImagePreview] = useState<string | null>(null);

    // Form state
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string | null>>({});

    // Initialize form with category data
    useEffect(() => {
        if (category) {
            setFormData({
                name: category.name || '',
                description: category.description || '',
                parent: populated(category.parent)?._id || (typeof category.parent === 'string' ? category.parent : ''),
                order: category.order || 0,
                isActive: category.isActive !== false,
            });
            setExistingImage(category.image || null);
        }
    }, [category]);

    // Handle input change
    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: null }));
        }
    };

    // Handle image selection
    const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                toast.error('Please select an image file');
                return;
            }
            if (file.size > 3 * 1024 * 1024) {
                toast.error('Image size must be less than 3MB');
                return;
            }
            setNewImage(file);
            setNewImagePreview(URL.createObjectURL(file));
        }
    };

    // Remove selected image
    const handleRemoveNewImage = () => {
        if (newImagePreview) {
            URL.revokeObjectURL(newImagePreview);
        }
        setNewImage(null);
        setNewImagePreview(null);
    };

    // Validate form
    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.name.trim()) newErrors.name = 'Category name is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Submit form
    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        try {
            const categoryData = {
                ...formData,
                order: parseInt(String(formData.order), 10) || 0,
                parent: formData.parent || null,
            };

            let savedCategory;
            if (isEdit && category) {
                const response = await adminAPI.updateCategory(category._id, categoryData);
                savedCategory = response.data.data.category;
                toast.success('Category updated successfully');
            } else {
                const response = await adminAPI.createCategory(categoryData);
                savedCategory = response.data.data.category;
                toast.success('Category created successfully');
            }

            // Upload image if new one selected
            if (newImage && savedCategory._id) {
                const formDataImage = new FormData();
                formDataImage.append('image', newImage);
                await adminAPI.uploadCategoryImage(savedCategory._id, formDataImage);
            }

            onSuccess();
        } catch (error) {
            console.error('Form error:', error);
            toast.error(getErrorMessage(error, 'Failed to save category'));
        } finally {
            setLoading(false);
        }
    };

    // Filter parent categories to exclude self (when editing)
    const availableParents = parentCategories.filter(
        (cat) => !isEdit || cat._id !== category?._id
    );

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div>
                <label className="block text-sm font-medium mb-1">
                    Category Name <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={`input ${errors.name ? 'border-red-500' : ''}`}
                    placeholder="Enter category name"
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>

            {/* Description */}
            <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    className="textarea"
                    placeholder="Category description (optional)"
                    rows={3}
                />
            </div>

            {/* Parent Category */}
            <div>
                <label className="block text-sm font-medium mb-1">Parent Category</label>
                <select
                    name="parent"
                    value={formData.parent}
                    onChange={handleChange}
                    className="select"
                >
                    <option value="">None (Root Category)</option>
                    {availableParents.map((cat) => (
                        <option key={cat._id} value={cat._id}>
                            {cat.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Order */}
            <div>
                <label className="block text-sm font-medium mb-1">Display Order</label>
                <input
                    type="number"
                    name="order"
                    value={formData.order}
                    onChange={handleChange}
                    className="input"
                    placeholder="0"
                    min="0"
                />
                <p className="text-sm text-[var(--color-text-muted)] mt-1">
                    Lower numbers appear first
                </p>
            </div>

            {/* Status */}
            <div>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        name="isActive"
                        checked={formData.isActive}
                        onChange={handleChange}
                        className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)]"
                    />
                    <span className="text-sm">Active</span>
                </label>
            </div>

            {/* Image */}
            <div>
                <label className="block text-sm font-medium mb-2">Category Image</label>

                {/* Current/Preview Image */}
                {(existingImage?.url || newImagePreview) && (
                    <div className="relative w-32 h-24 mb-3">
                        <img
                            src={newImagePreview || existingImage?.url}
                            alt="Category"
                            className="w-full h-full object-cover rounded-lg border border-[var(--color-border)]"
                        />
                        {newImagePreview && (
                            <button
                                type="button"
                                onClick={handleRemoveNewImage}
                                className="absolute -top-2 -right-2 p-1 bg-white rounded-full shadow border border-[var(--color-border)]"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                )}

                {/* Upload button */}
                <label className="inline-flex items-center gap-2 px-4 py-2 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-bg)] cursor-pointer transition-colors">
                    <Upload className="w-4 h-4" />
                    <span className="text-sm">
                        {existingImage?.url || newImagePreview ? 'Change Image' : 'Upload Image'}
                    </span>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                    />
                </label>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
                <button
                    type="button"
                    onClick={onCancel}
                    className="btn btn-secondary"
                    disabled={loading}
                >
                    Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>{isEdit ? 'Update Category' : 'Create Category'}</>
                    )}
                </button>
            </div>
        </form>
    );
};

export default CategoryForm;
