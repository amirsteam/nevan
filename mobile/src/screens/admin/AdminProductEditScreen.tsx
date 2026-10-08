/**
 * Admin Product Quick Edit
 * Day-to-day changes from the phone: visibility, featured, prices and stock
 * (per size and colour), and adding photos. Creating products and changing
 * sizes, colours or photo order happens in the web admin, which has the full
 * editor — the app links there.
 *
 * Saves send every variant with its id (so shoppers' carts survive) and its
 * compare price and SKU unchanged; the API keeps colour photos itself.
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Camera, ExternalLink, ImagePlus, Monitor, Save, X } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { adminAPI } from "../../api/admin";
import { colors, radius, spacing } from "../../theme";
import type { AdminProductEditScreenProps } from "../../navigation/types";
import type { IProduct, IProductVariant } from "@shared/types";

const WEB_ADMIN = "https://nevanhandicraft.com.np/admin/products";

const same = (a?: string | null, b?: string | null) =>
  String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase();

interface VariantRow {
  _id: string;
  size: string;
  color: string;
  price: string;
  stock: string;
  comparePrice?: number;
  sku?: string;
}

const toRows = (variants: IProductVariant[] = []): VariantRow[] =>
  variants.map((v) => ({
    _id: v._id,
    size: v.size,
    color: v.color,
    price: String(v.price ?? ""),
    stock: String(v.stock ?? 0),
    comparePrice: v.comparePrice,
    sku: v.sku,
  }));

const isPrice = (value: string) => Number(value) > 0;
const isStock = (value: string) => /^\d+$/.test(value.trim());

const openWebAdmin = (path = "") =>
  Linking.openURL(`${WEB_ADMIN}${path}`).catch(() => Alert.alert("Couldn't open the website", `Go to ${WEB_ADMIN}${path}`));

/** Products are created on the website (sizes, colours and photos per colour) */
const CreateOnWeb = ({ onBack }: { onBack: () => void }) => (
  <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.iconButton} accessibilityLabel="Go back">
        <ArrowLeft size={24} color={colors.text} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>New product</Text>
      <View style={styles.iconButton} />
    </View>
    <View style={styles.centered}>
      <Monitor size={48} color={colors.primary} />
      <Text style={styles.centeredTitle}>Create products on the website</Text>
      <Text style={styles.centeredText}>
        Adding sizes, colours and photos for each colour is much easier on a bigger screen. Once a product exists you can
        change its prices, stock and visibility here.
      </Text>
      <TouchableOpacity style={styles.primaryButton} onPress={() => openWebAdmin("/new")} accessibilityRole="link">
        <ExternalLink size={18} color={colors.onPrimary} />
        <Text style={styles.primaryButtonText}>Open the web admin</Text>
      </TouchableOpacity>
    </View>
  </SafeAreaView>
);

const AdminProductEditScreen: React.FC<AdminProductEditScreenProps> = ({ navigation, route }) => {
  const { productId } = route.params || {};

  const [product, setProduct] = useState<IProduct | null>(null);
  const [loading, setLoading] = useState(Boolean(productId));
  const [saving, setSaving] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [price, setPrice] = useState("");
  const [comparePrice, setComparePrice] = useState("");
  const [stock, setStock] = useState("");
  const [rows, setRows] = useState<VariantRow[]>([]);
  const [newPhotos, setNewPhotos] = useState<string[]>([]);
  const [showErrors, setShowErrors] = useState(false);

  const load = useCallback(async () => {
    if (!productId) return;
    try {
      const fetched = await adminAPI.getProductById(productId);
      setProduct(fetched);
      setIsActive(fetched.isActive !== false);
      setIsFeatured(!!fetched.isFeatured);
      setPrice(String(fetched.price ?? ""));
      setComparePrice(fetched.comparePrice ? String(fetched.comparePrice) : "");
      setStock(String(fetched.stock ?? 0));
      setRows(toRows(fetched.variants));
    } catch (err: any) {
      Alert.alert("Couldn't load the product", err.response?.data?.message || "Please try again.");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [productId, navigation]);

  useEffect(() => {
    load();
  }, [load]);

  // Variants grouped by colour (the product's colour order), sizes in size order
  const groups = useMemo(() => {
    if (!product || rows.length === 0) return [];
    const colorList = [
      ...(product.colors || []),
      ...rows
        .filter((r) => !(product.colors || []).some((c) => same(c.name, r.color)))
        .map((r) => ({ name: r.color, hex: undefined })),
    ].filter((c, i, all) => all.findIndex((x) => same(x.name, c.name)) === i);
    const sizeRank = (size: string) => {
      const index = (product.sizes || []).findIndex((s) => same(s, size));
      return index === -1 ? Number.MAX_SAFE_INTEGER : index;
    };
    return colorList
      .map((color) => ({
        color,
        rows: rows.filter((r) => same(r.color, color.name)).sort((a, b) => sizeRank(a.size) - sizeRank(b.size)),
      }))
      .filter((group) => group.rows.length > 0);
  }, [product, rows]);

  const hasVariants = rows.length > 0;
  const rowError = (row: VariantRow) => !isPrice(row.price) || !isStock(row.stock);
  const singleErrors = {
    price: !isPrice(price),
    compare: comparePrice.trim() !== "" && Number(comparePrice) > 0 && Number(comparePrice) <= Number(price),
    stock: !isStock(stock),
  };
  const hasErrors = hasVariants ? rows.some(rowError) : Object.values(singleErrors).some(Boolean);

  const updateRow = (id: string, patch: Partial<VariantRow>) =>
    setRows((current) => current.map((r) => (r._id === id ? { ...r, ...patch } : r)));

  const addPhotos = async (source: "library" | "camera") => {
    const permission =
      source === "camera" ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert("Permission needed", source === "camera" ? "Allow camera access to take photos." : "Allow photo library access.");
      return;
    }
    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: true, quality: 0.8 });
    if (!result.canceled && result.assets?.length) {
      setNewPhotos((current) => [...current, ...result.assets.map((asset) => asset.uri)]);
    }
  };

  const handleSave = async () => {
    if (!product) return;
    setShowErrors(true);
    if (hasErrors) {
      Alert.alert("Check the highlighted fields", "Prices must be above 0 and stock a whole number.");
      return;
    }
    setSaving(true);
    try {
      const data: Record<string, unknown> = { isActive, isFeatured };
      if (hasVariants) {
        data.variants = rows.map((r) => ({
          _id: r._id,
          size: r.size,
          color: r.color,
          price: Number(r.price),
          comparePrice: r.comparePrice && r.comparePrice > Number(r.price) ? r.comparePrice : null,
          stock: Number.parseInt(r.stock, 10),
          sku: r.sku || null,
        }));
        // Worked out from the sizes by the API
        data.comparePrice = null;
      } else {
        data.price = Number(price);
        data.comparePrice = Number(comparePrice) > 0 ? Number(comparePrice) : null;
        data.stock = Number.parseInt(stock, 10);
      }
      await adminAPI.updateProduct(product._id, data as Partial<IProduct>);

      if (newPhotos.length) {
        try {
          await adminAPI.uploadProductImages(product._id, newPhotos);
        } catch {
          Alert.alert("Saved, but the photos didn't upload", "Your other changes are saved. Try adding the photos again.");
          setNewPhotos([]);
          await load();
          return;
        }
      }
      navigation.goBack();
    } catch (err: any) {
      Alert.alert("Couldn't save", err.response?.data?.message || "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!productId) return <CreateOnWeb onBack={() => navigation.goBack()} />;

  if (loading || !product) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const field = (invalid: boolean) => [styles.input, showErrors && invalid ? styles.inputError : null];

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton} accessibilityLabel="Go back">
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Quick edit
        </Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveButton} accessibilityLabel="Save changes">
          {saving ? (
            <ActivityIndicator size="small" color={colors.onPrimary} />
          ) : (
            <>
              <Save size={18} color={colors.onPrimary} />
              <Text style={styles.saveButtonText}>Save</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={styles.flex1} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.productName}>{product.name}</Text>
          <TouchableOpacity onPress={() => openWebAdmin(`/${product._id}/edit`)} style={styles.webLink} accessibilityRole="link">
            <ExternalLink size={14} color={colors.primary} />
            <Text style={styles.webLinkText}>Sizes, colours and photo order: edit on the website</Text>
          </TouchableOpacity>

          {/* Photos */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Photos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
              {(product.images || []).map((img) => (
                <View key={img._id || img.url} style={styles.photo}>
                  <Image source={{ uri: img.url }} style={styles.photoImage} />
                  {!!img.color && (
                    <Text style={styles.photoTag} numberOfLines={1}>
                      {img.color}
                    </Text>
                  )}
                </View>
              ))}
              {newPhotos.map((uri) => (
                <View key={uri} style={styles.photo}>
                  <Image source={{ uri }} style={styles.photoImage} />
                  <Text style={styles.photoTag}>New</Text>
                  <TouchableOpacity
                    style={styles.photoRemove}
                    onPress={() => setNewPhotos((current) => current.filter((u) => u !== uri))}
                    accessibilityLabel="Remove this new photo"
                  >
                    <X size={14} color={colors.onPrimary} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
            <View style={styles.photoActions}>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => addPhotos("camera")}>
                <Camera size={16} color={colors.text} />
                <Text style={styles.secondaryButtonText}>Take photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => addPhotos("library")}>
                <ImagePlus size={16} color={colors.text} />
                <Text style={styles.secondaryButtonText}>From library</Text>
              </TouchableOpacity>
            </View>
            {hasVariants && <Text style={styles.hint}>New photos show for every colour.</Text>}
          </View>

          {/* Status */}
          <View style={styles.card}>
            <View style={styles.switchRow}>
              <View style={styles.flex1}>
                <Text style={styles.label}>Visible in store</Text>
                <Text style={styles.hint}>{isActive ? "Shoppers can find and buy it" : "Hidden: only admins can see it"}</Text>
              </View>
              <Switch
                value={isActive}
                onValueChange={setIsActive}
                trackColor={{ true: colors.primary, false: colors.borderStrong }}
                accessibilityLabel="Visible in store"
              />
            </View>
            <View style={[styles.switchRow, styles.divider]}>
              <Text style={[styles.label, styles.flex1]}>Feature on the home page</Text>
              <Switch
                value={isFeatured}
                onValueChange={setIsFeatured}
                trackColor={{ true: colors.primary, false: colors.borderStrong }}
                accessibilityLabel="Feature on the home page"
              />
            </View>
          </View>

          {/* Prices and stock */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{hasVariants ? "Prices and stock" : "Price and stock"}</Text>
            {hasVariants ? (
              groups.map(({ color, rows: colorRows }) => (
                <View key={color.name} style={styles.colorGroup}>
                  <View style={styles.colorHeader}>
                    <View style={[styles.swatch, { backgroundColor: color.hex || colors.surfaceMuted }]} />
                    <Text style={styles.colorName}>{color.name}</Text>
                  </View>
                  <View style={styles.tableHead}>
                    <Text style={[styles.tableHeadText, styles.sizeCol]}>Size</Text>
                    <Text style={[styles.tableHeadText, styles.numCol]}>Price (NPR)</Text>
                    <Text style={[styles.tableHeadText, styles.numCol]}>Stock</Text>
                  </View>
                  {colorRows.map((row) => (
                    <View key={row._id} style={styles.tableRow}>
                      <Text style={[styles.sizeText, styles.sizeCol]}>{row.size}</Text>
                      <TextInput
                        style={[...field(!isPrice(row.price)), styles.numCol]}
                        value={row.price}
                        onChangeText={(value) => updateRow(row._id, { price: value })}
                        keyboardType="decimal-pad"
                        accessibilityLabel={`Price for ${row.size}, ${row.color}`}
                      />
                      <TextInput
                        style={[...field(!isStock(row.stock)), styles.numCol]}
                        value={row.stock}
                        onChangeText={(value) => updateRow(row._id, { stock: value })}
                        keyboardType="number-pad"
                        accessibilityLabel={`Stock for ${row.size}, ${row.color}`}
                      />
                    </View>
                  ))}
                </View>
              ))
            ) : (
              <View style={styles.singleGrid}>
                <View style={styles.flex1}>
                  <Text style={styles.label}>Price (NPR)</Text>
                  <TextInput style={field(singleErrors.price)} value={price} onChangeText={setPrice} keyboardType="decimal-pad" accessibilityLabel="Price" />
                </View>
                <View style={styles.flex1}>
                  <Text style={styles.label}>Compare-at</Text>
                  <TextInput
                    style={field(singleErrors.compare)}
                    value={comparePrice}
                    onChangeText={setComparePrice}
                    keyboardType="decimal-pad"
                    placeholder="—"
                    placeholderTextColor={colors.textMuted}
                    accessibilityLabel="Compare-at price"
                  />
                </View>
                <View style={styles.flex1}>
                  <Text style={styles.label}>Stock</Text>
                  <TextInput style={field(singleErrors.stock)} value={stock} onChangeText={setStock} keyboardType="number-pad" accessibilityLabel="Stock" />
                </View>
              </View>
            )}
            {showErrors && hasErrors && (
              <Text style={styles.errorText}>Prices must be above 0, compare-at prices higher than the price, and stock a whole number.</Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  flex1: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "600", color: colors.text },
  iconButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    minWidth: 76,
    justifyContent: "center",
  },
  saveButtonText: { color: colors.onPrimary, fontWeight: "600" },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl * 2 },
  productName: { fontSize: 22, fontWeight: "700", color: colors.text },
  webLink: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: -spacing.sm },
  webLinkText: { color: colors.primary, fontSize: 13, fontWeight: "500" },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardTitle: { fontSize: 16, fontWeight: "600", color: colors.text },
  label: { fontSize: 14, fontWeight: "500", color: colors.text, marginBottom: 4 },
  hint: { fontSize: 12, color: colors.textMuted },
  photoRow: { gap: spacing.sm },
  photo: { width: 88, height: 88, borderRadius: radius.sm, overflow: "hidden", backgroundColor: colors.surfaceMuted },
  photoImage: { width: "100%", height: "100%" },
  photoTag: {
    position: "absolute",
    left: 4,
    bottom: 4,
    maxWidth: 80,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 10,
    fontWeight: "600",
    overflow: "hidden",
  },
  photoRemove: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.overlay,
    alignItems: "center",
    justifyContent: "center",
  },
  photoActions: { flexDirection: "row", gap: spacing.sm },
  secondaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm + 2,
  },
  secondaryButtonText: { color: colors.text, fontWeight: "500" },
  switchRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  divider: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  colorGroup: { gap: spacing.xs, marginBottom: spacing.sm },
  colorHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.xs },
  swatch: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: colors.borderStrong },
  colorName: { fontSize: 15, fontWeight: "600", color: colors.text },
  tableHead: { flexDirection: "row", gap: spacing.sm },
  tableHeadText: { fontSize: 11, fontWeight: "600", color: colors.textMuted, textTransform: "uppercase" },
  tableRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  sizeCol: { flex: 1.3 },
  numCol: { flex: 1 },
  sizeText: { fontSize: 14, color: colors.text },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === "ios" ? spacing.sm + 2 : spacing.sm,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  inputError: { borderColor: colors.error },
  errorText: { color: colors.error, fontSize: 13 },
  singleGrid: { flexDirection: "row", gap: spacing.sm },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.md },
  centeredTitle: { fontSize: 20, fontWeight: "700", color: colors.text, textAlign: "center" },
  centeredText: { fontSize: 15, color: colors.textMuted, textAlign: "center", lineHeight: 22 },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    marginTop: spacing.sm,
  },
  primaryButtonText: { color: colors.onPrimary, fontWeight: "600", fontSize: 16 },
});

export default AdminProductEditScreen;
