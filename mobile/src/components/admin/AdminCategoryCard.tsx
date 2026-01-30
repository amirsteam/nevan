/**
 * Admin Category Card Component
 * Displays a category with edit/delete actions
 */
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { FolderTree, Edit2, Trash2 } from "lucide-react-native";
import type { ICategory } from "@shared/types";

interface AdminCategoryCardProps {
  category: ICategory;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
  childCount?: number;
}

const AdminCategoryCard: React.FC<AdminCategoryCardProps> = ({
  category,
  onPress,
  onEdit,
  onDelete,
  childCount = 0,
}) => {
  const parentName =
    typeof category.parent === "object" ? category.parent?.name : null;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      {/* Category Image */}
      <View style={styles.imageContainer}>
        {category.image?.url ? (
          <Image
            source={{ uri: category.image.url }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderImage}>
            <FolderTree size={24} color="#888" />
          </View>
        )}
      </View>

      {/* Category Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.name} numberOfLines={1}>
          {category.name}
        </Text>
        <Text style={styles.slug} numberOfLines={1}>
          /{category.slug}
        </Text>
        <View style={styles.metaRow}>
          {parentName && (
            <View style={styles.parentBadge}>
              <Text style={styles.parentText}>{parentName}</Text>
            </View>
          )}
          {childCount > 0 && (
            <Text style={styles.childCount}>{childCount} subcategories</Text>
          )}
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={(e) => {
            e.stopPropagation?.();
            onEdit();
          }}
        >
          <Edit2 size={18} color="#1D4ED8" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={(e) => {
            e.stopPropagation?.();
            onDelete();
          }}
        >
          <Trash2 size={18} color="#DC2626" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  imageContainer: {
    width: 56,
    height: 56,
    borderRadius: 10,
    overflow: "hidden",
    marginRight: 12,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholderImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
  },
  infoContainer: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 2,
  },
  slug: {
    fontSize: 13,
    color: "#888",
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  parentBadge: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  parentText: {
    fontSize: 11,
    color: "#666",
  },
  childCount: {
    fontSize: 12,
    color: "#888",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#f8f9fa",
    alignItems: "center",
    justifyContent: "center",
  },
});

export default AdminCategoryCard;
