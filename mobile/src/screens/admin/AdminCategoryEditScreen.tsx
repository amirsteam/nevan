/**
 * Admin Category Edit Screen
 * Create/Edit category form
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
  FolderTree,
  Save,
  Trash2,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { adminAPI } from "../../api/admin";
import type { AdminCategoryEditScreenProps } from "../../navigation/types";
import type { ICategory } from "@shared/types";

interface FormData {
  name: string;
  description: string;
  parent: string;
  order: string;
  isActive: boolean;
}

interface FormErrors {
  name?: string;
  [key: string]: string | undefined;
}

const AdminCategoryEditScreen: React.FC<AdminCategoryEditScreenProps> = ({
  navigation,
  route,
}) => {
  const { categoryId } = route.params || {};
  const isEdit = Boolean(categoryId);

  // State
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    parent: "",
    order: "0",
    isActive: true,
  });
  const [errors, setErrors] = useState<FormErrors>({});

  // Image state
  const [existingImage, setExistingImage] = useState<string | null>(null);
  const [newImage, setNewImage] = useState<string | null>(null);

  // Fetch category and all categories
  const fetchData = useCallback(async () => {
    try {
      const allCategories = await adminAPI.getCategories();
      setCategories(allCategories);

      if (categoryId) {
        const category = allCategories.find((c) => c._id === categoryId);
        if (category) {
          const parentId =
            typeof category.parent === "object"
              ? category.parent?._id || ""
              : category.parent || "";

          setFormData({
            name: category.name || "",
            description: category.description || "",
            parent: parentId,
            order: String(category.order || 0),
            isActive: category.isActive !== false,
          });
          setExistingImage(category.image?.url || null);
        }
      }
    } catch (err: any) {
      Alert.alert("Error", "Failed to load category data");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [categoryId, navigation]);

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

  // Pick image
  const handlePickImage = async () => {
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
      allowsEditing: Platform.OS === "ios", // Only enable editing on iOS due to Android issues
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setNewImage(result.assets[0].uri);
    }
  };

  // Remove image
  const handleRemoveImage = () => {
    setNewImage(null);
    setExistingImage(null);
  };

  // Validate form
  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = "Category name is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit form
  const handleSubmit = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      const categoryData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        parent: formData.parent || null,
        order: parseInt(formData.order) || 0,
        isActive: formData.isActive,
      };

      let savedCategory;

      if (isEdit && categoryId) {
        savedCategory = await adminAPI.updateCategory(categoryId, categoryData);
      } else {
        savedCategory = await adminAPI.createCategory(categoryData);
      }

      // Upload image if a new one was selected
      if (
        newImage &&
        (newImage.startsWith("file://") ||
          newImage.startsWith("content://") ||
          newImage.startsWith("/"))
      ) {
        try {
          await adminAPI.uploadCategoryImage(savedCategory._id, newImage);
        } catch (imgErr: any) {
          console.warn("Failed to upload category image:", imgErr.message);
          // Don't fail the whole operation if image upload fails
        }
      }

      Alert.alert(
        "Success",
        isEdit
          ? "Category updated successfully"
          : "Category created successfully",
      );
      navigation.goBack();
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.response?.data?.message || "Failed to save category",
      );
    } finally {
      setSaving(false);
    }
  };

  // Filter parent categories to exclude self
  const availableParents = categories.filter((cat) => {
    if (isEdit && cat._id === categoryId) return false;
    // Only show root categories as parent options
    return !cat.parent;
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      </SafeAreaView>
    );
  }

  const displayImage = newImage || existingImage;

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
          {isEdit ? "Edit Category" : "New Category"}
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
          {/* Image Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Category Image</Text>
            <TouchableOpacity
              style={styles.imagePickerContainer}
              onPress={handlePickImage}
            >
              {displayImage ? (
                <View style={styles.imagePreviewContainer}>
                  <Image
                    source={{ uri: displayImage }}
                    style={styles.imagePreview}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={handleRemoveImage}
                  >
                    <X size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Camera size={32} color="#888" />
                  <Text style={styles.imagePlaceholderText}>
                    Tap to add image
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Basic Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>

            {/* Name */}
            <View style={styles.field}>
              <Text style={styles.label}>
                Category Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.name && styles.inputError]}
                value={formData.name}
                onChangeText={(v) => handleChange("name", v)}
                placeholder="Enter category name"
                placeholderTextColor="#999"
              />
              {errors.name && (
                <Text style={styles.errorText}>{errors.name}</Text>
              )}
            </View>

            {/* Description */}
            <View style={styles.field}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(v) => handleChange("description", v)}
                placeholder="Category description (optional)"
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Parent Category */}
            <View style={styles.field}>
              <Text style={styles.label}>Parent Category</Text>
              <View style={styles.parentOptions}>
                <TouchableOpacity
                  style={[
                    styles.parentOption,
                    !formData.parent && styles.parentOptionActive,
                  ]}
                  onPress={() => handleChange("parent", "")}
                >
                  <Text
                    style={[
                      styles.parentOptionText,
                      !formData.parent && styles.parentOptionTextActive,
                    ]}
                  >
                    None (Root)
                  </Text>
                </TouchableOpacity>
                {availableParents.map((cat) => (
                  <TouchableOpacity
                    key={cat._id}
                    style={[
                      styles.parentOption,
                      formData.parent === cat._id && styles.parentOptionActive,
                    ]}
                    onPress={() => handleChange("parent", cat._id)}
                  >
                    <Text
                      style={[
                        styles.parentOptionText,
                        formData.parent === cat._id &&
                          styles.parentOptionTextActive,
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Display Order */}
            <View style={styles.field}>
              <Text style={styles.label}>Display Order</Text>
              <TextInput
                style={styles.input}
                value={formData.order}
                onChangeText={(v) => handleChange("order", v)}
                placeholder="0"
                placeholderTextColor="#999"
                keyboardType="number-pad"
              />
              <Text style={styles.helperText}>Lower numbers appear first</Text>
            </View>

            {/* Active Status */}
            <View style={styles.switchField}>
              <View>
                <Text style={styles.label}>Active</Text>
                <Text style={styles.helperText}>
                  Show this category on the store
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
    paddingBottom: 40,
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
  imagePickerContainer: {
    alignItems: "center",
  },
  imagePreviewContainer: {
    width: 120,
    height: 120,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  imagePreview: {
    width: "100%",
    height: "100%",
  },
  removeImageButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 12,
    padding: 4,
  },
  imagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: "#f0f0f0",
    borderWidth: 2,
    borderColor: "#ddd",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  imagePlaceholderText: {
    marginTop: 8,
    fontSize: 12,
    color: "#888",
  },
  field: {
    marginBottom: 16,
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
    minHeight: 80,
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
    marginTop: 4,
  },
  parentOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  parentOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  parentOptionActive: {
    backgroundColor: "#1a1a1a",
    borderColor: "#1a1a1a",
  },
  parentOptionText: {
    fontSize: 14,
    color: "#1a1a1a",
  },
  parentOptionTextActive: {
    color: "#fff",
  },
  switchField: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});

export default AdminCategoryEditScreen;
