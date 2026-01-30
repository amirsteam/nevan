/**
 * Admin Product Edit Screen
 * Create/Edit product form with variants and images
 */
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Camera,
  X,
  Plus,
  Trash2,
  Save,
  Package,
  Check,
  AlertCircle,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { adminAPI } from "../../api/admin";
import type { AdminProductEditScreenProps } from "../../navigation/types";
import type { IProduct, ICategory, IProductVariant } from "@shared/types";

// Define locally since Metro doesn't resolve path aliases for runtime imports
const PRODUCT_SIZES = [
  "Small Size (0-1 yrs)",
  "Medium Size (1-4 yrs)",
  "Large Size (4-6 yrs)",
  "XL Size (6-8 yrs)",
  "XXL Size (8-10 yrs)",
  "Standard Size",
  "One Size",
] as const;

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
}

interface LocalVariant {
  _id?: string;
  size: string;
  color: string;
  price: string;
  stock: string;
  image?: string; // URL for existing or local URI for new
}

interface FormErrors {
  name?: string;
  description?: string;
  price?: string;
  category?: string;
  stock?: string;
  [key: string]: string | undefined;
}

const AdminProductEditScreen: React.FC<AdminProductEditScreenProps> = ({
  navigation,
  route,
}) => {
  const { productId } = route.params || {};
  const isEdit = Boolean(productId);

  // State
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<ICategory[]>([]);
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
  });
  const [errors, setErrors] = useState<FormErrors>({});

  // Variants state
  const [hasVariants, setHasVariants] = useState(false);
  const [variants, setVariants] = useState<LocalVariant[]>([]);
  const [variantUploadStatus, setVariantUploadStatus] = useState<
    Record<number, "pending" | "uploading" | "success" | "failed">
  >({});

  // Images state
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<string[]>([]);

  // Fetch product and categories
  const fetchData = useCallback(async () => {
    try {
      const allCategories = await adminAPI.getCategories();
      setCategories(allCategories);

      if (productId) {
        const product = await adminAPI.getProductById(productId);
        const categoryId =
          typeof product.category === "object"
            ? product.category._id
            : product.category || "";

        setFormData({
          name: product.name || "",
          description: product.description || "",
          shortDescription: (product as any).shortDescription || "",
          price: String(product.price || ""),
          comparePrice: String(product.comparePrice || ""),
          category: categoryId,
          stock: String(product.stock || ""),
          sku: (product as any).sku || "",
          isFeatured: product.isFeatured || false,
          isActive: (product as any).isActive !== false,
        });

        // Set variants
        if (product.variants && product.variants.length > 0) {
          setHasVariants(true);
          setVariants(
            product.variants.map((v: IProductVariant) => ({
              _id: v._id,
              size: v.size,
              color: v.color || "",
              price: String(v.price),
              stock: String(v.stock),
              image: v.image || "",
            })),
          );
        }

        // Set existing images
        if (product.images && product.images.length > 0) {
          setExistingImages(product.images.map((img) => img.url));
        }
      }
    } catch (err: any) {
      Alert.alert("Error", "Failed to load product data");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [productId, navigation]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle input change
  const handleChange = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Handle variant change
  const handleVariantChange = (
    index: number,
    field: keyof LocalVariant,
    value: string,
  ) => {
    setVariants((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: value } : v)),
    );
  };

  // Add variant
  const handleAddVariant = () => {
    setVariants((prev) => [
      ...prev,
      {
        size: PRODUCT_SIZES[0],
        color: "",
        price: formData.price,
        stock: "0",
        image: "",
      },
    ]);
  };

  // Pick variant image
  const handlePickVariantImage = async (index: number) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Please allow access to your photo library",
      );
      return;
    }

    // Note: allowsEditing on Android can have issues with some devices
    // Setting to false for more reliable behavior, crop can be done server-side
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: Platform.OS === "ios", // Only enable editing on iOS
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      handleVariantChange(index, "image", result.assets[0].uri);
    }
  };

  // Remove variant image
  const handleRemoveVariantImage = (index: number) => {
    handleVariantChange(index, "image", "");
  };

  // Remove variant
  const handleRemoveVariant = (index: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  // Toggle variants
  const handleToggleVariants = (enabled: boolean) => {
    setHasVariants(enabled);
    if (enabled && variants.length === 0) {
      handleAddVariant();
    }
  };

  // Pick images
  const handlePickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Please allow access to your photo library",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      setNewImages((prev) => [
        ...prev,
        ...result.assets.map((a: { uri: string }) => a.uri),
      ]);
    }
  };

  // Remove new image
  const handleRemoveNewImage = (index: number) => {
    setNewImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Remove existing image
  const handleRemoveExistingImage = (index: number) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
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
    if (!hasVariants && (!formData.stock || parseInt(formData.stock) < 0))
      newErrors.stock = "Valid stock is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit form
  const handleSubmit = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      // Prepare variant data - don't include local image URIs
      const variantDataList = hasVariants
        ? variants.map((v) => {
            const variantData: any = {
              size: v.size,
              color: v.color,
              price: parseFloat(v.price),
              stock: parseInt(v.stock),
            };
            // Only add _id if it's a valid existing variant ID (not empty/undefined)
            if (v._id && v._id.length > 0) {
              variantData._id = v._id;
            }
            return variantData;
          })
        : [];

      const productData: Partial<IProduct> = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        comparePrice: formData.comparePrice
          ? parseFloat(formData.comparePrice)
          : undefined,
        category: formData.category as any,
        stock: hasVariants
          ? variants.reduce((sum, v) => sum + parseInt(v.stock || "0"), 0)
          : parseInt(formData.stock),
        isFeatured: formData.isFeatured,
        variants: variantDataList,
      };

      let savedProduct: IProduct;

      if (isEdit && productId) {
        savedProduct = await adminAPI.updateProduct(productId, productData);
      } else {
        savedProduct = await adminAPI.createProduct(productData);
      }

      // Upload new product images if any
      let productImagesUploaded = 0;
      if (newImages.length > 0) {
        try {
          await adminAPI.uploadProductImages(savedProduct._id, newImages);
          productImagesUploaded = newImages.length;
        } catch (imgErr: any) {
          console.warn("Failed to upload product images:", imgErr.message);
          Alert.alert(
            "Warning",
            `Product saved but ${newImages.length} image(s) failed to upload. You can add them later.`,
          );
        }
      }

      // Upload variant images if any (only for local URIs, not existing URLs)
      let variantImagesUploaded = 0;
      let variantImagesFailed = 0;
      if (
        hasVariants &&
        savedProduct.variants &&
        savedProduct.variants.length > 0
      ) {
        // Log for debugging
        console.log(
          "Saved product variants:",
          savedProduct.variants.map((v: any) => ({ _id: v._id, size: v.size })),
        );
        console.log(
          "Local variants:",
          variants.map((v, i) => ({
            index: i,
            size: v.size,
            hasImage: !!v.image,
          })),
        );

        for (let i = 0; i < variants.length; i++) {
          const localVariant = variants[i];
          const savedVariant = savedProduct.variants[i];

          // Check if it's a new local image (starts with file:// or content://)
          const isLocalImage =
            localVariant.image &&
            (localVariant.image.startsWith("file://") ||
              localVariant.image.startsWith("content://") ||
              (localVariant.image.startsWith("/") &&
                !localVariant.image.startsWith("http")));

          if (isLocalImage && savedVariant?._id) {
            setVariantUploadStatus((prev) => ({ ...prev, [i]: "uploading" }));
            try {
              console.log(
                `Uploading variant ${i} image to product ${savedProduct._id}, variant ${savedVariant._id}`,
              );
              await adminAPI.uploadVariantImage(
                savedProduct._id,
                savedVariant._id,
                localVariant.image!,
              );
              setVariantUploadStatus((prev) => ({ ...prev, [i]: "success" }));
              variantImagesUploaded++;
            } catch (imgErr: any) {
              console.warn(
                `Failed to upload variant ${i + 1} image:`,
                imgErr.message,
                imgErr.response?.data,
              );
              setVariantUploadStatus((prev) => ({ ...prev, [i]: "failed" }));
              variantImagesFailed++;
            }
          }
        }
      }

      // Show appropriate success message
      let successMessage = isEdit
        ? "Product updated successfully"
        : "Product created successfully";
      if (variantImagesFailed > 0) {
        successMessage += `\n\n⚠️ ${variantImagesFailed} variant image(s) failed to upload.`;
      }
      if (variantImagesUploaded > 0) {
        successMessage += `\n\n✓ ${variantImagesUploaded} variant image(s) uploaded.`;
      }

      Alert.alert("Success", successMessage);
      navigation.goBack();
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.response?.data?.message || "Failed to save product",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      </SafeAreaView>
    );
  }

  const allImages = [...existingImages, ...newImages];

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEdit ? "Edit Product" : "New Product"}
        </Text>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={saving}
          style={styles.saveButton}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Save size={18} color="#fff" />
              <Text style={styles.saveButtonText}>Save</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Images Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Product Images</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.imagesRow}
            >
              {allImages.map((uri, index) => (
                <View key={index} style={styles.imagePreviewContainer}>
                  <Image
                    source={{ uri }}
                    style={styles.imagePreview}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() =>
                      index < existingImages.length
                        ? handleRemoveExistingImage(index)
                        : handleRemoveNewImage(index - existingImages.length)
                    }
                  >
                    <X size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity
                style={styles.addImageButton}
                onPress={handlePickImages}
              >
                <Camera size={24} color="#888" />
                <Text style={styles.addImageText}>Add</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Basic Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>

            {/* Name */}
            <View style={styles.field}>
              <Text style={styles.label}>
                Product Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.name && styles.inputError]}
                value={formData.name}
                onChangeText={(v) => handleChange("name", v)}
                placeholder="Enter product name"
                placeholderTextColor="#999"
              />
              {errors.name && (
                <Text style={styles.errorText}>{errors.name}</Text>
              )}
            </View>

            {/* Description */}
            <View style={styles.field}>
              <Text style={styles.label}>
                Description <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  errors.description && styles.inputError,
                ]}
                value={formData.description}
                onChangeText={(v) => handleChange("description", v)}
                placeholder="Product description"
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              {errors.description && (
                <Text style={styles.errorText}>{errors.description}</Text>
              )}
            </View>

            {/* Category */}
            <View style={styles.field}>
              <Text style={styles.label}>
                Category <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.categoryOptions}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat._id}
                    style={[
                      styles.categoryOption,
                      formData.category === cat._id &&
                        styles.categoryOptionActive,
                    ]}
                    onPress={() => handleChange("category", cat._id)}
                  >
                    <Text
                      style={[
                        styles.categoryOptionText,
                        formData.category === cat._id &&
                          styles.categoryOptionTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {errors.category && (
                <Text style={styles.errorText}>{errors.category}</Text>
              )}
            </View>
          </View>

          {/* Pricing */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pricing</Text>

            <View style={styles.row}>
              <View style={[styles.field, styles.flex1]}>
                <Text style={styles.label}>
                  Price <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, errors.price && styles.inputError]}
                  value={formData.price}
                  onChangeText={(v) => handleChange("price", v)}
                  placeholder="0"
                  placeholderTextColor="#999"
                  keyboardType="decimal-pad"
                />
                {errors.price && (
                  <Text style={styles.errorText}>{errors.price}</Text>
                )}
              </View>
              <View style={[styles.field, styles.flex1]}>
                <Text style={styles.label}>Compare Price</Text>
                <TextInput
                  style={styles.input}
                  value={formData.comparePrice}
                  onChangeText={(v) => handleChange("comparePrice", v)}
                  placeholder="0"
                  placeholderTextColor="#999"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          </View>

          {/* Inventory */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Inventory</Text>

            {!hasVariants && (
              <View style={styles.field}>
                <Text style={styles.label}>
                  Stock <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, errors.stock && styles.inputError]}
                  value={formData.stock}
                  onChangeText={(v) => handleChange("stock", v)}
                  placeholder="0"
                  placeholderTextColor="#999"
                  keyboardType="number-pad"
                />
                {errors.stock && (
                  <Text style={styles.errorText}>{errors.stock}</Text>
                )}
              </View>
            )}

            <View style={styles.field}>
              <Text style={styles.label}>SKU</Text>
              <TextInput
                style={styles.input}
                value={formData.sku}
                onChangeText={(v) => handleChange("sku", v)}
                placeholder="Product SKU (optional)"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          {/* Variants */}
          <View style={styles.section}>
            <View style={styles.switchField}>
              <View>
                <Text style={styles.label}>Has Variants</Text>
                <Text style={styles.helperText}>Add size/color variations</Text>
              </View>
              <Switch
                value={hasVariants}
                onValueChange={handleToggleVariants}
                trackColor={{ false: "#e0e0e0", true: "#4ade80" }}
                thumbColor="#fff"
              />
            </View>

            {hasVariants && (
              <View style={styles.variantsContainer}>
                {variants.map((variant, index) => (
                  <View key={index} style={styles.variantCard}>
                    <View style={styles.variantHeader}>
                      <Text style={styles.variantTitle}>
                        Variant {index + 1}
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleRemoveVariant(index)}
                      >
                        <Trash2 size={18} color="#DC2626" />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.row}>
                      <View style={[styles.field, styles.flex1]}>
                        <Text style={styles.label}>Size</Text>
                        <View style={styles.sizeOptions}>
                          {PRODUCT_SIZES.map((size) => (
                            <TouchableOpacity
                              key={size}
                              style={[
                                styles.sizeOption,
                                variant.size === size &&
                                  styles.sizeOptionActive,
                              ]}
                              onPress={() =>
                                handleVariantChange(index, "size", size)
                              }
                            >
                              <Text
                                style={[
                                  styles.sizeOptionText,
                                  variant.size === size &&
                                    styles.sizeOptionTextActive,
                                ]}
                              >
                                {size}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    </View>

                    <View style={styles.row}>
                      <View style={[styles.field, styles.flex1]}>
                        <Text style={styles.label}>Color</Text>
                        <TextInput
                          style={styles.input}
                          value={variant.color}
                          onChangeText={(v) =>
                            handleVariantChange(index, "color", v)
                          }
                          placeholder="Color name"
                          placeholderTextColor="#999"
                        />
                      </View>
                    </View>

                    <View style={styles.row}>
                      <View style={[styles.field, styles.flex1]}>
                        <Text style={styles.label}>Price</Text>
                        <TextInput
                          style={styles.input}
                          value={variant.price}
                          onChangeText={(v) =>
                            handleVariantChange(index, "price", v)
                          }
                          placeholder="0"
                          placeholderTextColor="#999"
                          keyboardType="decimal-pad"
                        />
                      </View>
                      <View style={[styles.field, styles.flex1]}>
                        <Text style={styles.label}>Stock</Text>
                        <TextInput
                          style={styles.input}
                          value={variant.stock}
                          onChangeText={(v) =>
                            handleVariantChange(index, "stock", v)
                          }
                          placeholder="0"
                          placeholderTextColor="#999"
                          keyboardType="number-pad"
                        />
                      </View>
                    </View>

                    {/* Variant Image */}
                    <View style={styles.field}>
                      <View style={styles.variantImageHeader}>
                        <Text style={styles.label}>Variant Image</Text>
                        {variantUploadStatus[index] === "uploading" && (
                          <View style={styles.uploadStatusBadge}>
                            <ActivityIndicator size="small" color="#666" />
                            <Text style={styles.uploadStatusText}>
                              Uploading...
                            </Text>
                          </View>
                        )}
                        {variantUploadStatus[index] === "success" && (
                          <View
                            style={[
                              styles.uploadStatusBadge,
                              styles.uploadStatusSuccess,
                            ]}
                          >
                            <Check size={12} color="#16a34a" />
                            <Text
                              style={[
                                styles.uploadStatusText,
                                { color: "#16a34a" },
                              ]}
                            >
                              Uploaded
                            </Text>
                          </View>
                        )}
                        {variantUploadStatus[index] === "failed" && (
                          <View
                            style={[
                              styles.uploadStatusBadge,
                              styles.uploadStatusFailed,
                            ]}
                          >
                            <AlertCircle size={12} color="#dc2626" />
                            <Text
                              style={[
                                styles.uploadStatusText,
                                { color: "#dc2626" },
                              ]}
                            >
                              Failed
                            </Text>
                          </View>
                        )}
                      </View>
                      {variant.image ? (
                        <View style={styles.variantImageContainer}>
                          <Image
                            source={{ uri: variant.image }}
                            style={styles.variantImage}
                            resizeMode="cover"
                          />
                          {/* Show image source indicator */}
                          <View style={styles.imageSourceBadge}>
                            <Text style={styles.imageSourceText}>
                              {variant.image.startsWith("http")
                                ? "Uploaded"
                                : "Selected"}
                            </Text>
                          </View>
                          <TouchableOpacity
                            style={styles.variantImageRemove}
                            onPress={() => handleRemoveVariantImage(index)}
                          >
                            <X size={14} color="#fff" />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.variantImagePicker}
                          onPress={() => handlePickVariantImage(index)}
                        >
                          <Camera size={20} color="#666" />
                          <Text style={styles.variantImagePickerText}>
                            Add Image
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}

                <TouchableOpacity
                  style={styles.addVariantButton}
                  onPress={handleAddVariant}
                >
                  <Plus size={18} color="#1a1a1a" />
                  <Text style={styles.addVariantText}>Add Variant</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Settings</Text>

            <View style={styles.switchField}>
              <View>
                <Text style={styles.label}>Featured Product</Text>
                <Text style={styles.helperText}>
                  Show on homepage featured section
                </Text>
              </View>
              <Switch
                value={formData.isFeatured}
                onValueChange={(v) => handleChange("isFeatured", v)}
                trackColor={{ false: "#e0e0e0", true: "#4ade80" }}
                thumbColor="#fff"
              />
            </View>

            <View style={[styles.switchField, { marginTop: 16 }]}>
              <View>
                <Text style={styles.label}>Active</Text>
                <Text style={styles.helperText}>
                  Show this product on the store
                </Text>
              </View>
              <Switch
                value={formData.isActive}
                onValueChange={(v) => handleChange("isActive", v)}
                trackColor={{ false: "#e0e0e0", true: "#4ade80" }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  flex1: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "#fff",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 60,
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 16,
  },
  imagesRow: {
    flexDirection: "row",
  },
  imagePreviewContainer: {
    width: 80,
    height: 80,
    borderRadius: 10,
    overflow: "hidden",
    marginRight: 10,
    position: "relative",
  },
  imagePreview: {
    width: "100%",
    height: "100%",
  },
  removeImageButton: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 10,
    padding: 3,
  },
  addImageButton: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: "#f0f0f0",
    borderWidth: 2,
    borderColor: "#ddd",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  addImageText: {
    fontSize: 12,
    color: "#888",
    marginTop: 4,
  },
  field: {
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  required: {
    color: "#DC2626",
  },
  input: {
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1a1a1a",
  },
  inputError: {
    borderColor: "#DC2626",
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  errorText: {
    color: "#DC2626",
    fontSize: 12,
    marginTop: 4,
  },
  helperText: {
    color: "#888",
    fontSize: 12,
    marginTop: 2,
  },
  categoryOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  categoryOptionActive: {
    backgroundColor: "#1a1a1a",
    borderColor: "#1a1a1a",
  },
  categoryOptionText: {
    fontSize: 14,
    color: "#1a1a1a",
  },
  categoryOptionTextActive: {
    color: "#fff",
  },
  switchField: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  variantsContainer: {
    marginTop: 16,
  },
  variantCard: {
    backgroundColor: "#f8f9fa",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  variantHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  variantTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  sizeOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  sizeOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  sizeOptionActive: {
    backgroundColor: "#1a1a1a",
    borderColor: "#1a1a1a",
  },
  sizeOptionText: {
    fontSize: 12,
    color: "#1a1a1a",
  },
  sizeOptionTextActive: {
    color: "#fff",
  },
  addVariantButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#f0f0f0",
    gap: 6,
  },
  addVariantText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1a1a1a",
  },
  variantImageContainer: {
    position: "relative",
    width: 100,
    height: 100,
    marginTop: 8,
  },
  variantImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  variantImageRemove: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  variantImagePicker: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: "#fafafa",
    borderWidth: 2,
    borderColor: "#ddd",
    borderStyle: "dashed",
    gap: 6,
    marginTop: 8,
  },
  variantImagePickerText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  variantImageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  uploadStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#f0f0f0",
  },
  uploadStatusSuccess: {
    backgroundColor: "#dcfce7",
  },
  uploadStatusFailed: {
    backgroundColor: "#fee2e2",
  },
  uploadStatusText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#666",
  },
  imageSourceBadge: {
    position: "absolute",
    bottom: 4,
    left: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  imageSourceText: {
    fontSize: 9,
    color: "#fff",
    textAlign: "center",
    fontWeight: "500",
  },
});

export default AdminProductEditScreen;
