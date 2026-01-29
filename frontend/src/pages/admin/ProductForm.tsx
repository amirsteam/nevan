/**
 * ProductForm Component
 * Create/Edit product form with variants and image management
 */
import { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { adminAPI } from "../../api";
import { ImageUploader, type ImageUploaderImage } from "../../components/admin";
import { Plus, Trash2, Loader2, X } from "lucide-react";
import toast from "react-hot-toast";
import {
  PRODUCT_SIZES,
  type IProduct,
  type ICategory,
  type IProductVariant,
  type IImage,
} from "../../../../shared/types";

// ============================================
// Type Definitions
// ============================================

interface ProductFormProps {
  product?: IProduct | null;
  categories: ICategory[];
  onSuccess: () => void;
  onCancel: () => void;
}

interface FormData {
  name: string;
  description: string;
  shortDescription: string;
  price: string;
  comparePrice: string;
  category: string;
  stock: string;
  sku: string;
  isFeatured: boolean;
  isActive: boolean;
  metaTitle: string;
  metaDescription: string;
}

interface LocalVariant {
  _id: string;
  size: string;
  color: string;
  price: number;
  stock: number;
  image: string;
  imageFile?: File | null;
}

interface ExistingImage {
  _id: string;
  url: string;
  publicId?: string;
  isPrimary: boolean;
}

interface NewImage {
  id: string;
  file: File;
  preview: string;
  isPrimary: boolean;
}

interface FormErrors {
  name?: string;
  description?: string;
  price?: string;
  category?: string;
  stock?: string;
  [key: string]: string | undefined;
}

// ============================================
// Component
// ============================================

const ProductForm: React.FC<ProductFormProps> = ({
  product,
  categories,
  onSuccess,
  onCancel,
}) => {
  const isEdit = Boolean(product);

  // Form state
  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    shortDescription: "",
    price: "",
    comparePrice: "",
    category: "",
    stock: "",
    sku: "",
    isFeatured: false,
    isActive: true,
    metaTitle: "",
    metaDescription: "",
  });

  // Variants state
  const [hasVariants, setHasVariants] = useState(false);
  const [variants, setVariants] = useState<LocalVariant[]>([]);

  // Images state
  const [existingImages, setExistingImages] = useState<ExistingImage[]>([]);
  const [newImages, setNewImages] = useState<NewImage[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  // Form state
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  // Initialize form with product data
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || "",
        description: product.description || "",
        shortDescription: (product as any).shortDescription || "",
        price: String(product.price || ""),
        comparePrice: String(product.comparePrice || ""),
        category:
          typeof product.category === "object"
            ? product.category._id
            : product.category || "",
        stock: String(product.stock || ""),
        sku: (product as any).sku || "",
        isFeatured: product.isFeatured || false,
        isActive: (product as any).isActive !== false,
        metaTitle: (product as any).metaTitle || "",
        metaDescription: (product as any).metaDescription || "",
      });

      // Map variants to local format
      const mappedVariants: LocalVariant[] = (product.variants || []).map(
        (v: IProductVariant) => ({
          _id: v._id,
          size: v.size,
          color: v.color,
          price: v.price,
          stock: v.stock,
          image: v.image || "",
          imageFile: null,
        }),
      );
      setVariants(mappedVariants);

      // Map images
      const mappedImages: ExistingImage[] = (product.images || []).map(
        (img: IImage) => ({
          _id: (img as any)._id || img.publicId,
          url: img.url,
          publicId: img.publicId,
          isPrimary: (img as any).isPrimary || false,
        }),
      );
      setExistingImages(mappedImages);

      // Sync hasVariants toggle with actual data
      setHasVariants((product.variants?.length || 0) > 0);
    }
  }, [product]);

  // Toggle Variants
  const handleHasVariantsChange = (checked: boolean): void => {
    setHasVariants(checked);
    if (checked && variants.length === 0) {
      handleAddVariant();
    }
  };

  // Handle input change
  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ): void => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    // Clear error on change
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  // Validate form
  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.name.trim()) newErrors.name = "Product name is required";
    if (!formData.description.trim())
      newErrors.description = "Description is required";
    if (!formData.price || parseFloat(formData.price) <= 0)
      newErrors.price = "Valid price is required";
    if (!formData.category) newErrors.category = "Category is required";
    if (
      variants.length === 0 &&
      (!formData.stock || parseInt(formData.stock) < 0)
    ) {
      newErrors.stock = "Stock is required when no variants";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Add new variant (flat structure)
  const handleAddVariant = (): void => {
    setVariants((prev) => [
      ...prev,
      {
        _id: `temp-${Date.now()}`,
        size: "",
        color: "",
        price: parseFloat(formData.price) || 0,
        stock: 0,
        image: "",
        imageFile: null,
      },
    ]);
  };

  // Update variant field
  const handleVariantChange = (
    index: number,
    field: keyof LocalVariant,
    value: string | number,
  ): void => {
    setVariants((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]:
          field === "price" || field === "stock"
            ? parseFloat(String(value)) || 0
            : value,
      };
      return updated;
    });
  };

  // Remove variant
  const handleRemoveVariant = (index: number): void => {
    setVariants((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Duplicate variant
  const handleDuplicateVariant = (index: number): void => {
    setVariants((prev) => {
      const original = prev[index];
      return [
        ...prev,
        {
          ...original,
          _id: `temp-${Date.now()}`,
          stock: 0,
          imageFile: null,
        },
      ];
    });
  };

  // Handle variant image upload
  const handleVariantImageUpload = async (
    index: number,
    file: File,
  ): Promise<void> => {
    const previewUrl = URL.createObjectURL(file);

    setVariants((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        image: previewUrl,
        imageFile: file,
      };
      return updated;
    });

    const variant = variants[index];
    const isNewVariant = variant._id.toString().startsWith("temp-");

    // Only upload immediately if product AND variant exist in DB (Edit Mode)
    if (product?._id && !isNewVariant) {
      try {
        const formDataUpload = new FormData();
        formDataUpload.append("image", file);

        const response = await adminAPI.uploadVariantImage(
          product._id,
          variant._id,
          formDataUpload,
        );

        const updatedProduct = (response.data as any).data.product;
        const updatedVariant = updatedProduct.variants.find(
          (v: IProductVariant) => v._id === variant._id,
        );

        if (updatedVariant?.image) {
          setVariants((prev) => {
            const updated = [...prev];
            updated[index] = {
              ...updated[index],
              image: updatedVariant.image,
              imageFile: null,
            };
            return updated;
          });
          toast.success("Variant image uploaded");
        }
      } catch (error) {
        console.error("Variant image upload error:", error);
        toast.error("Failed to upload variant image");
      }
    }
  };

  // Handle new image upload
  const handleImageUpload = (files: File[]): void => {
    const previews: NewImage[] = files.map((file) => ({
      id: `new-${Date.now()}-${Math.random()}`,
      file,
      preview: URL.createObjectURL(file),
      isPrimary: existingImages.length === 0 && newImages.length === 0,
    }));
    setNewImages((prev) => [...prev, ...previews]);
  };

  // Remove new image before upload
  const handleRemoveNewImage = (id: string): void => {
    setNewImages((prev) => {
      const removed = prev.find((img) => img.id === id);
      if (removed?.preview) {
        URL.revokeObjectURL(removed.preview);
      }
      return prev.filter((img) => img.id !== id);
    });
  };

  // Set primary image
  const handleSetPrimary = (id: string): void => {
    setExistingImages((prev) =>
      prev.map((img) => ({ ...img, isPrimary: img._id === id })),
    );
    setNewImages((prev) =>
      prev.map((img) => ({ ...img, isPrimary: img.id === id })),
    );
  };

  // Delete existing image
  const handleDeleteExistingImage = async (imageId: string): Promise<void> => {
    if (!product?._id) return;

    try {
      await adminAPI.deleteProductImage(product._id, imageId);
      setExistingImages((prev) => prev.filter((img) => img._id !== imageId));
      toast.success("Image deleted");
    } catch (error) {
      toast.error("Failed to delete image");
    }
  };

  // Submit form
  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      // Prepare product data
      const productData: Record<string, unknown> = {
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

      // Add variants only if active and valid
      if (hasVariants) {
        const cleanVariants = variants
          .filter((v) => v.size && v.color && v.price >= 0)
          .map((v) => ({
            size: v.size,
            color: v.color.trim(),
            price: parseFloat(String(v.price)) || 0,
            stock: parseInt(String(v.stock)) || 0,
            image: v.imageFile ? null : v.image || null,
          }));

        if (cleanVariants.length > 0) {
          productData.variants = cleanVariants;
        }
      } else {
        productData.variants = [];
      }

      let savedProduct: IProduct;
      if (isEdit && product?._id) {
        const response = await adminAPI.updateProduct(
          product._id,
          productData as Partial<IProduct>,
        );
        savedProduct = (response.data as any).data.product;
        toast.success("Product updated successfully");
      } else {
        const response = await adminAPI.createProduct(
          productData as Partial<IProduct>,
        );
        savedProduct = (response.data as any).data.product;
        toast.success("Product created successfully");
      }

      // Upload new images if any
      if (newImages.length > 0 && savedProduct._id) {
        setUploadingImages(true);
        const formDataImages = new FormData();
        newImages.forEach((img) => {
          formDataImages.append("images", img.file);
        });
        await adminAPI.uploadProductImages(savedProduct._id, formDataImages);
      }

      // Upload pending variant images (Create Mode)
      const variantsWithPendingImages = variants
        .map((v, index) => ({ ...v, index }))
        .filter((v) => v.imageFile);

      if (variantsWithPendingImages.length > 0 && savedProduct._id) {
        const uploadToastId = toast.loading("Uploading variant images...");

        const savedVariants = savedProduct.variants || [];

        for (const pendingVar of variantsWithPendingImages) {
          const savedVariant = savedVariants.find(
            (sv: IProductVariant) =>
              sv.size === pendingVar.size &&
              sv.color === pendingVar.color.trim(),
          );

          if (savedVariant?._id && pendingVar.imageFile) {
            const variantFormData = new FormData();
            variantFormData.append("image", pendingVar.imageFile);

            try {
              await adminAPI.uploadVariantImage(
                savedProduct._id,
                savedVariant._id,
                variantFormData,
              );
            } catch (err) {
              console.error("Failed to upload variant image", err);
              toast.error(`Failed to upload image for ${pendingVar.color}`);
            }
          }
        }
        toast.dismiss(uploadToastId);
      }

      onSuccess();
    } catch (error: any) {
      console.error("Form error:", error);
      toast.error(error.response?.data?.message || "Failed to save product");
    } finally {
      setLoading(false);
      setUploadingImages(false);
    }
  };

  // Combine images for preview
  const allImages: ImageUploaderImage[] = [
    ...existingImages.map((img) => ({
      ...img,
      id: img._id,
      url: img.url,
      preview: img.url,
    })),
    ...newImages.map((img) => ({ ...img, url: img.preview })),
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
              className={`input ${errors.name ? "border-red-500" : ""}`}
              placeholder="Enter product name"
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name}</p>
            )}
          </div>

          {/* Short Description */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">
              Short Description
            </label>
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
              className={`textarea ${errors.description ? "border-red-500" : ""}`}
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
              className={`input ${errors.price ? "border-red-500" : ""}`}
              placeholder="0"
              min="0"
              step="0.01"
            />
            {errors.price && (
              <p className="text-red-500 text-sm mt-1">{errors.price}</p>
            )}
          </div>

          {/* Compare Price */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Compare Price (NPR)
            </label>
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
              className={`select ${errors.category ? "border-red-500" : ""}`}
            >
              <option value="">Select category</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {(cat as any).parent ? `${(cat as any).parent.name} → ` : ""}
                  {cat.name}
                </option>
              ))}
            </select>
            {errors.category && (
              <p className="text-red-500 text-sm mt-1">{errors.category}</p>
            )}
          </div>

          {/* Stock */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Stock{" "}
              {variants.length === 0 && <span className="text-red-500">*</span>}
            </label>
            <input
              type="number"
              name="stock"
              value={formData.stock}
              onChange={handleChange}
              className={`input ${errors.stock ? "border-red-500" : ""}`}
              placeholder={variants.length > 0 ? "Managed per variant" : "0"}
              min="0"
              disabled={variants.length > 0}
            />
            {errors.stock && (
              <p className="text-red-500 text-sm mt-1">{errors.stock}</p>
            )}
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
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
              <input
                type="checkbox"
                checked={hasVariants}
                onChange={(e) => handleHasVariantsChange(e.target.checked)}
                className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)]"
              />
              <span className="text-sm font-medium">Enable Variants</span>
            </label>
          </div>
        </div>

        {hasVariants && (
          <div className="space-y-4 animate-fadeIn">
            {/* Headers */}
            <div className="hidden md:grid grid-cols-12 gap-4 text-sm font-medium text-[var(--color-text-muted)] border-b pb-2">
              <div className="col-span-3">
                Size <span className="text-red-500">*</span>
              </div>
              <div className="col-span-3">
                Color <span className="text-red-500">*</span>
              </div>
              <div className="col-span-2">Price</div>
              <div className="col-span-2">Stock</div>
              <div className="col-span-2">Image</div>
            </div>

            {/* Variant List */}
            {variants.map((variant, index) => (
              <div
                key={variant._id || index}
                className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start p-4 md:p-0 border md:border-0 rounded-lg md:rounded-none bg-gray-50 md:bg-transparent"
              >
                {/* Size */}
                <div className="col-span-3">
                  <label className="md:hidden text-xs font-medium mb-1 block">
                    Size
                  </label>
                  <select
                    value={variant.size}
                    onChange={(e) =>
                      handleVariantChange(index, "size", e.target.value)
                    }
                    className="select w-full text-sm"
                    required
                  >
                    <option value="">Select Size...</option>
                    {PRODUCT_SIZES.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Color */}
                <div className="col-span-3">
                  <label className="md:hidden text-xs font-medium mb-1 block">
                    Color
                  </label>
                  <input
                    type="text"
                    value={variant.color}
                    onChange={(e) =>
                      handleVariantChange(index, "color", e.target.value)
                    }
                    className="input w-full text-sm"
                    placeholder="Color (e.g. Red)"
                    required
                  />
                </div>

                {/* Price */}
                <div className="col-span-2">
                  <label className="md:hidden text-xs font-medium mb-1 block">
                    Price
                  </label>
                  <input
                    type="number"
                    value={variant.price}
                    onChange={(e) =>
                      handleVariantChange(index, "price", e.target.value)
                    }
                    className="input w-full text-sm"
                    placeholder="0"
                    min="0"
                    required
                  />
                </div>

                {/* Stock */}
                <div className="col-span-2">
                  <label className="md:hidden text-xs font-medium mb-1 block">
                    Stock
                  </label>
                  <input
                    type="number"
                    value={variant.stock}
                    onChange={(e) =>
                      handleVariantChange(index, "stock", e.target.value)
                    }
                    className="input w-full text-sm"
                    placeholder="0"
                    min="0"
                    required
                  />
                </div>

                {/* Image & Actions */}
                <div className="col-span-2 flex items-center gap-2">
                  {variant.image ? (
                    <div className="relative group">
                      <img
                        src={variant.image}
                        alt="Variant"
                        className="w-10 h-10 object-cover rounded border"
                      />
                      <button
                        type="button"
                        onClick={() => handleVariantChange(index, "image", "")}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <div className="w-10 h-10 border border-dashed border-gray-300 rounded flex items-center justify-center hover:bg-gray-50 text-gray-500">
                        <Plus className="w-4 h-4" />
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleVariantImageUpload(index, file);
                        }}
                      />
                    </label>
                  )}

                  <div className="flex ml-auto gap-1">
                    <button
                      type="button"
                      onClick={() => handleDuplicateVariant(index)}
                      className="p-1.5 text-blue-500 hover:bg-blue-50 rounded"
                      title="Duplicate Variant"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveVariant(index)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                      title="Remove Variant"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={handleAddVariant}
              className="flex items-center gap-2 text-sm text-[var(--color-primary)] font-medium hover:underline mt-2"
            >
              <Plus className="w-4 h-4" />
              Add Variant
            </button>
          </div>
        )}
      </div>

      {/* Images */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg border-b border-[var(--color-border)] pb-2">
          Images
        </h3>

        <ImageUploader
          images={allImages as any}
          onUpload={handleImageUpload}
          onDelete={(id: string) => {
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
            <label className="block text-sm font-medium mb-1">
              Meta Description
            </label>
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
              {uploadingImages ? "Uploading Images..." : "Saving..."}
            </>
          ) : (
            <>{isEdit ? "Update Product" : "Create Product"}</>
          )}
        </button>
      </div>
    </form>
  );
};

export default ProductForm;
