/**
 * ProductForm Component
 * Create/Edit product form with variants and image management
 */
import { useState, useEffect } from 'react';
import { adminAPI } from '../../api';
import { ImageUploader } from '../../components/admin';
import { Plus, Trash2, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';

const ProductForm = ({ product, categories, onSuccess, onCancel }) => {
    const isEdit = Boolean(product);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        shortDescription: '',
        price: '',
        comparePrice: '',
        category: '',
        stock: '',
        sku: '',
        isFeatured: false,
        isActive: true,
        metaTitle: '',
        metaDescription: '',
    });

    // Variants state
    const [variants, setVariants] = useState([]);

    // Images state
    const [existingImages, setExistingImages] = useState([]);
    const [newImages, setNewImages] = useState([]);
    const [uploadingImages, setUploadingImages] = useState(false);

    // Form state
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    // Initialize form with product data
    useEffect(() => {
        if (product) {
            setFormData({
                name: product.name || '',
                description: product.description || '',
                shortDescription: product.shortDescription || '',
                price: product.price || '',
                comparePrice: product.comparePrice || '',
                category: product.category?._id || product.category || '',
                stock: product.stock || '',
                sku: product.sku || '',
                isFeatured: product.isFeatured || false,
                isActive: product.isActive !== false,
                metaTitle: product.metaTitle || '',
                metaDescription: product.metaDescription || '',
            });
            setVariants(product.variants || []);
            setExistingImages(product.images || []);
        }
    }, [product]);

    // Handle input change
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
        // Clear error on change
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: null }));
        }
    };

    // Validate form
    const validate = () => {
        const newErrors = {};
        if (!formData.name.trim()) newErrors.name = 'Product name is required';
        if (!formData.description.trim()) newErrors.description = 'Description is required';
        if (!formData.price || parseFloat(formData.price) <= 0) newErrors.price = 'Valid price is required';
        if (!formData.category) newErrors.category = 'Category is required';
        if (variants.length === 0 && (!formData.stock || parseInt(formData.stock) < 0)) {
            newErrors.stock = 'Stock is required when no variants';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Add new variant
    const handleAddVariant = () => {
        setVariants((prev) => [
            ...prev,
            {
                _id: `temp-${Date.now()}`,
                name: '',
                options: [{ _id: `temp-opt-${Date.now()}`, value: '', priceModifier: 0, stock: 0 }],
            },
        ]);
    };

    // Update variant name
    const handleVariantNameChange = (variantIndex, name) => {
        setVariants((prev) => {
            const updated = [...prev];
            updated[variantIndex] = { ...updated[variantIndex], name };
            return updated;
        });
    };

    // Add variant option
    const handleAddOption = (variantIndex) => {
        setVariants((prev) => {
            const updated = [...prev];
            updated[variantIndex] = {
                ...updated[variantIndex],
                options: [
                    ...updated[variantIndex].options,
                    { _id: `temp-opt-${Date.now()}`, value: '', priceModifier: 0, stock: 0 },
                ],
            };
            return updated;
        });
    };

    // Update variant option
    const handleOptionChange = (variantIndex, optionIndex, field, value) => {
        setVariants((prev) => {
            const updated = [...prev];
            updated[variantIndex] = {
                ...updated[variantIndex],
                options: updated[variantIndex].options.map((opt, idx) =>
                    idx === optionIndex
                        ? { ...opt, [field]: field === 'value' ? value : parseFloat(value) || 0 }
                        : opt
                ),
            };
            return updated;
        });
    };

    // Remove variant
    const handleRemoveVariant = (variantIndex) => {
        setVariants((prev) => prev.filter((_, idx) => idx !== variantIndex));
    };

    // Remove option
    const handleRemoveOption = (variantIndex, optionIndex) => {
        setVariants((prev) => {
            const updated = [...prev];
            updated[variantIndex] = {
                ...updated[variantIndex],
                options: updated[variantIndex].options.filter((_, idx) => idx !== optionIndex),
            };
            // Remove variant if no options left
            if (updated[variantIndex].options.length === 0) {
                return prev.filter((_, idx) => idx !== variantIndex);
            }
            return updated;
        });
    };

    // Handle new image upload
    const handleImageUpload = (files) => {
        const previews = files.map((file) => ({
            id: `new-${Date.now()}-${Math.random()}`,
            file,
            preview: URL.createObjectURL(file),
            isPrimary: existingImages.length === 0 && newImages.length === 0,
        }));
        setNewImages((prev) => [...prev, ...previews]);
    };

    // Remove new image before upload
    const handleRemoveNewImage = (id) => {
        setNewImages((prev) => {
            const removed = prev.find((img) => img.id === id);
            if (removed?.preview) {
                URL.revokeObjectURL(removed.preview);
            }
            return prev.filter((img) => img.id !== id);
        });
    };

    // Set primary image
    const handleSetPrimary = (id) => {
        setExistingImages((prev) =>
            prev.map((img) => ({ ...img, isPrimary: img._id === id }))
        );
        setNewImages((prev) =>
            prev.map((img) => ({ ...img, isPrimary: img.id === id }))
        );
    };

    // Delete existing image
    const handleDeleteExistingImage = async (imageId) => {
        if (!product?._id) return;

        try {
            await adminAPI.deleteProductImage(product._id, imageId);
            setExistingImages((prev) => prev.filter((img) => img._id !== imageId));
            toast.success('Image deleted');
        } catch (error) {
            toast.error('Failed to delete image');
        }
    };

    // Submit form
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        try {
            // Prepare product data - clean up empty/undefined values
            const productData = {
                name: formData.name,
                description: formData.description,
                price: parseFloat(formData.price),
                category: formData.category,
                stock: parseInt(formData.stock) || 0,
                isFeatured: formData.isFeatured,
                isActive: formData.isActive,
            };

            // Add optional fields only if they have values
            if (formData.shortDescription?.trim()) {
                productData.shortDescription = formData.shortDescription.trim();
            }
            if (formData.comparePrice && parseFloat(formData.comparePrice) > 0) {
                productData.comparePrice = parseFloat(formData.comparePrice);
            }
            if (formData.sku?.trim()) {
                productData.sku = formData.sku.trim();
            }
            if (formData.metaTitle?.trim()) {
                productData.metaTitle = formData.metaTitle.trim();
            }
            if (formData.metaDescription?.trim()) {
                productData.metaDescription = formData.metaDescription.trim();
            }

            // Add variants only if there are valid ones
            const cleanVariants = variants
                .filter((v) => v.name?.trim() && v.options.length > 0)
                .map((v) => ({
                    name: v.name.trim(),
                    options: v.options
                        .filter((o) => o.value?.trim())
                        .map((o) => ({
                            value: o.value.trim(),
                            priceModifier: parseFloat(o.priceModifier) || 0,
                            stock: parseInt(o.stock) || 0,
                        })),
                }))
                .filter((v) => v.options.length > 0);

            if (cleanVariants.length > 0) {
                productData.variants = cleanVariants;
            }

            let savedProduct;
            if (isEdit) {
                const response = await adminAPI.updateProduct(product._id, productData);
                savedProduct = response.data.data.product;
                toast.success('Product updated successfully');
            } else {
                const response = await adminAPI.createProduct(productData);
                savedProduct = response.data.data.product;
                toast.success('Product created successfully');
            }

            // Upload new images if any
            if (newImages.length > 0 && savedProduct._id) {
                setUploadingImages(true);
                const formDataImages = new FormData();
                newImages.forEach((img) => {
                    formDataImages.append('images', img.file);
                });
                await adminAPI.uploadProductImages(savedProduct._id, formDataImages);
            }

            onSuccess();
        } catch (error) {
            console.error('Form error:', error);
            toast.error(error.response?.data?.message || 'Failed to save product');
        } finally {
            setLoading(false);
            setUploadingImages(false);
        }
    };

    // Combine images for preview
    const allImages = [
        ...existingImages.map((img) => ({ ...img, id: img._id })),
        ...newImages,
    ];

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b border-[var(--color-border)] pb-2">
                    Basic Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Name */}
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-1">
                            Product Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            className={`input ${errors.name ? 'border-red-500' : ''}`}
                            placeholder="Enter product name"
                        />
                        {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                    </div>

                    {/* Short Description */}
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-1">Short Description</label>
                        <input
                            type="text"
                            name="shortDescription"
                            value={formData.shortDescription}
                            onChange={handleChange}
                            className="input"
                            placeholder="Brief description for listings"
                            maxLength={200}
                        />
                    </div>

                    {/* Description */}
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-1">
                            Description <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            className={`textarea ${errors.description ? 'border-red-500' : ''}`}
                            placeholder="Detailed product description"
                            rows={4}
                        />
                        {errors.description && (
                            <p className="text-red-500 text-sm mt-1">{errors.description}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Pricing */}
            <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b border-[var(--color-border)] pb-2">
                    Pricing
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Price */}
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Price (NPR) <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            name="price"
                            value={formData.price}
                            onChange={handleChange}
                            className={`input ${errors.price ? 'border-red-500' : ''}`}
                            placeholder="0"
                            min="0"
                            step="0.01"
                        />
                        {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price}</p>}
                    </div>

                    {/* Compare Price */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Compare Price (NPR)</label>
                        <input
                            type="number"
                            name="comparePrice"
                            value={formData.comparePrice}
                            onChange={handleChange}
                            className="input"
                            placeholder="Original price (optional)"
                            min="0"
                            step="0.01"
                        />
                    </div>

                    {/* SKU */}
                    <div>
                        <label className="block text-sm font-medium mb-1">SKU</label>
                        <input
                            type="text"
                            name="sku"
                            value={formData.sku}
                            onChange={handleChange}
                            className="input"
                            placeholder="Stock keeping unit"
                        />
                    </div>
                </div>
            </div>

            {/* Organization */}
            <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b border-[var(--color-border)] pb-2">
                    Organization
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Category */}
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Category <span className="text-red-500">*</span>
                        </label>
                        <select
                            name="category"
                            value={formData.category}
                            onChange={handleChange}
                            className={`select ${errors.category ? 'border-red-500' : ''}`}
                        >
                            <option value="">Select category</option>
                            {categories.map((cat) => (
                                <option key={cat._id} value={cat._id}>
                                    {cat.parent ? `${cat.parent.name} → ` : ''}{cat.name}
                                </option>
                            ))}
                        </select>
                        {errors.category && (
                            <p className="text-red-500 text-sm mt-1">{errors.category}</p>
                        )}
                    </div>

                    {/* Stock (only if no variants) */}
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Stock {variants.length === 0 && <span className="text-red-500">*</span>}
                        </label>
                        <input
                            type="number"
                            name="stock"
                            value={formData.stock}
                            onChange={handleChange}
                            className={`input ${errors.stock ? 'border-red-500' : ''}`}
                            placeholder={variants.length > 0 ? 'Managed per variant' : '0'}
                            min="0"
                            disabled={variants.length > 0}
                        />
                        {errors.stock && <p className="text-red-500 text-sm mt-1">{errors.stock}</p>}
                        {variants.length > 0 && (
                            <p className="text-sm text-[var(--color-text-muted)] mt-1">
                                Stock is managed per variant option
                            </p>
                        )}
                    </div>
                </div>

                {/* Toggles */}
                <div className="flex gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            name="isFeatured"
                            checked={formData.isFeatured}
                            onChange={handleChange}
                            className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)]"
                        />
                        <span className="text-sm">Featured Product</span>
                    </label>

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
            </div>

            {/* Variants */}
            <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-[var(--color-border)] pb-2">
                    <h3 className="font-semibold text-lg">Variants</h3>
                    <button
                        type="button"
                        onClick={handleAddVariant}
                        className="btn btn-secondary text-sm py-1"
                    >
                        <Plus className="w-4 h-4" />
                        Add Variant
                    </button>
                </div>

                {variants.length === 0 ? (
                    <p className="text-[var(--color-text-muted)] text-sm">
                        Add variants like Size, Color, etc. for products with multiple options.
                    </p>
                ) : (
                    <div className="space-y-6">
                        {variants.map((variant, variantIndex) => (
                            <div
                                key={variant._id}
                                className="border border-[var(--color-border)] rounded-lg p-4"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1 mr-4">
                                        <label className="block text-sm font-medium mb-1">
                                            Variant Name (e.g., Size, Color)
                                        </label>
                                        <input
                                            type="text"
                                            value={variant.name}
                                            onChange={(e) =>
                                                handleVariantNameChange(variantIndex, e.target.value)
                                            }
                                            className="input"
                                            placeholder="e.g., Size"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveVariant(variantIndex)}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Variant Options */}
                                <div className="space-y-3">
                                    <div className="grid grid-cols-12 gap-2 text-sm font-medium text-[var(--color-text-muted)]">
                                        <div className="col-span-4">Value</div>
                                        <div className="col-span-3">Price Modifier</div>
                                        <div className="col-span-3">Stock</div>
                                        <div className="col-span-2"></div>
                                    </div>

                                    {variant.options.map((option, optionIndex) => (
                                        <div
                                            key={option._id}
                                            className="grid grid-cols-12 gap-2 items-center"
                                        >
                                            <input
                                                type="text"
                                                value={option.value}
                                                onChange={(e) =>
                                                    handleOptionChange(
                                                        variantIndex,
                                                        optionIndex,
                                                        'value',
                                                        e.target.value
                                                    )
                                                }
                                                className="input col-span-4"
                                                placeholder="e.g., XL"
                                            />
                                            <input
                                                type="number"
                                                value={option.priceModifier}
                                                onChange={(e) =>
                                                    handleOptionChange(
                                                        variantIndex,
                                                        optionIndex,
                                                        'priceModifier',
                                                        e.target.value
                                                    )
                                                }
                                                className="input col-span-3"
                                                placeholder="0"
                                            />
                                            <input
                                                type="number"
                                                value={option.stock}
                                                onChange={(e) =>
                                                    handleOptionChange(
                                                        variantIndex,
                                                        optionIndex,
                                                        'stock',
                                                        e.target.value
                                                    )
                                                }
                                                className="input col-span-3"
                                                placeholder="0"
                                                min="0"
                                            />
                                            <div className="col-span-2 flex justify-end">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleRemoveOption(variantIndex, optionIndex)
                                                    }
                                                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                    <button
                                        type="button"
                                        onClick={() => handleAddOption(variantIndex)}
                                        className="text-sm text-[var(--color-primary)] hover:underline flex items-center gap-1"
                                    >
                                        <Plus className="w-3 h-3" />
                                        Add Option
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Images */}
            <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b border-[var(--color-border)] pb-2">
                    Images
                </h3>

                <ImageUploader
                    images={allImages}
                    onUpload={handleImageUpload}
                    onDelete={(id) => {
                        // Check if it's an existing image or new
                        if (existingImages.find((img) => img._id === id)) {
                            handleDeleteExistingImage(id);
                        } else {
                            handleRemoveNewImage(id);
                        }
                    }}
                    onSetPrimary={handleSetPrimary}
                    uploading={uploadingImages}
                />
            </div>

            {/* SEO */}
            <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b border-[var(--color-border)] pb-2">
                    SEO (Optional)
                </h3>

                <div className="grid grid-cols-1 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Meta Title</label>
                        <input
                            type="text"
                            name="metaTitle"
                            value={formData.metaTitle}
                            onChange={handleChange}
                            className="input"
                            placeholder="Custom title for search engines"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Meta Description</label>
                        <textarea
                            name="metaDescription"
                            value={formData.metaDescription}
                            onChange={handleChange}
                            className="textarea"
                            placeholder="Custom description for search engines"
                            rows={2}
                        />
                    </div>
                </div>
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
                            {uploadingImages ? 'Uploading Images...' : 'Saving...'}
                        </>
                    ) : (
                        <>{isEdit ? 'Update Product' : 'Create Product'}</>
                    )}
                </button>
            </div>
        </form>
    );
};

export default ProductForm;
