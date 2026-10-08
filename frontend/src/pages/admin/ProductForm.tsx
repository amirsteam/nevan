/**
 * ProductForm Component
 * Create/edit a product. Products are either one version (one price and
 * stock count) or come in sizes × colours: sizes are chips on the age
 * scale, colours have swatches and their own photos, prices are set per
 * size (optionally per colour) and stock in a sizes × colours grid.
 *
 * Everything — photo removals and order included — is kept in the form until
 * Save. New products stay hidden until their photos finish uploading.
 * State and rules live in components/admin/product/editorState.ts.
 */
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import toast from "react-hot-toast";
import { ArrowDown, ArrowUp, Layers, Loader2, Package, Plus, Trash2 } from "lucide-react";
import { adminAPI } from "../../api";
import { ConfirmModal } from "../../components/ui";
import { AGE_GROUPS, PRODUCT_GENDERS, GENDER_LABELS, formatAgeGroup } from "../../config/store";
import { getErrorMessage, populated } from "../../utils/helpers";
import type { ICategory, IProduct } from "../../types";
import PhotoStrip from "../../components/admin/product/PhotoStrip";
import SizePicker from "../../components/admin/product/SizePicker";
import ColorPicker, { Swatch } from "../../components/admin/product/ColorPicker";
import OptionsTable from "../../components/admin/product/OptionsTable";
import ProductSummary from "../../components/admin/product/ProductSummary";
import {
  ACCEPTED_TYPES,
  addColor,
  addPhotos,
  buildPayload,
  cellKey,
  derivedAgeGroups,
  fromProduct,
  moveColor,
  movePhoto,
  pendingUploads,
  photoOrder,
  photosOf,
  removeColor,
  removePhoto,
  savedVariantCount,
  setMode,
  snapshot,
  toggleSize,
  updateColor,
  validate,
  type Details,
  type EditorState,
  type Mode,
} from "../../components/admin/product/editorState";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

interface ProductFormProps {
  product?: IProduct | null;
  categories: ICategory[];
  /** `reopen`: keep editing (e.g. some photos didn't upload) */
  onSaved: (product: IProduct, options: { reopen: boolean }) => void;
  onCancel: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

interface Confirmation {
  title: string;
  message: ReactNode;
  confirmText: string;
  onConfirm: () => void;
}

// ============================================
// Small layout pieces
// ============================================

const Card = ({ id, title, description, children }: { id: string; title: string; description?: ReactNode; children: ReactNode }) => (
  <section aria-labelledby={id} className="card p-4 sm:p-6 space-y-4 overflow-visible">
    <div>
      <h2 id={id} className="font-semibold text-lg font-sans tracking-normal">
        {title}
      </h2>
      {description && <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{description}</p>}
    </div>
    {children}
  </section>
);

const Field = ({
  id,
  label,
  required,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
}) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium mb-1">
      {label}
      {required && (
        <span className="text-[var(--color-error)]" aria-hidden="true">
          {" "}
          *
        </span>
      )}
    </label>
    {children}
    {hint && !error && (
      <p id={`${id}-hint`} className="text-xs text-[var(--color-text-muted)] mt-1">
        {hint}
      </p>
    )}
    {error && (
      <p id={`${id}-error`} className="text-sm text-[var(--color-error)] mt-1">
        {error}
      </p>
    )}
  </div>
);

/** id, error wiring and the error border for an input */
const inputProps = (id: string, errors: Record<string, string>, base = "input", hasHint = false) => ({
  id,
  "aria-invalid": errors[id] ? true : undefined,
  "aria-describedby": errors[id] ? `${id}-error` : hasHint ? `${id}-hint` : undefined,
  className: `${base} ${errors[id] ? "border-[var(--color-error)]" : ""}`,
});

const MODES: { value: Mode; title: string; text: string; icon: typeof Package }[] = [
  { value: "single", title: "One version", text: "One price and stock count, e.g. a blanket or gift set", icon: Package },
  { value: "variants", title: "Sizes & colours", text: "Each size and colour has its own stock (and price if you like)", icon: Layers },
];

// ============================================
// Component
// ============================================

const ProductForm = ({ product, categories, onSaved, onCancel, onDirtyChange }: ProductFormProps) => {
  const isEdit = Boolean(product?._id);
  const [state, setState] = useState<EditorState>(() => fromProduct(product));
  const [initialSnapshot] = useState(() => snapshot(fromProduct(product)));
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState<null | "saving" | "photos">(null);
  const [options, setOptions] = useState<{ customSizes: string[]; colors: { name: string; hex?: string }[] }>({
    customSizes: [],
    colors: [],
  });
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  const update = useCallback((change: (s: EditorState) => EditorState) => setState((s) => change(s)), []);
  const setDetail = <K extends keyof Details>(field: K, value: Details[K]) =>
    update((s) => ({ ...s, details: { ...s.details, [field]: value } }));

  // After the first save attempt, errors update as fields are fixed
  const errors = submitted ? validate(state) : {};
  const dirty = snapshot(state) !== initialSnapshot;

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    adminAPI
      .getProductOptions()
      .then((res) => setOptions({ customSizes: res.data.data.sizes.custom, colors: res.data.data.colors.used }))
      .catch(() => {});
  }, []);

  // Free local photo previews when leaving the page
  const photosRef = useRef(state.photos);
  useEffect(() => {
    photosRef.current = state.photos;
  }, [state.photos]);
  useEffect(
    () => () =>
      photosRef.current.forEach((photo) => {
        if (photo.file) URL.revokeObjectURL(photo.url);
      }),
    [],
  );

  // ---------- Photos ----------
  const handleAddPhotos = (files: File[], colorKey: string | null) => {
    const skipped: string[] = [];
    const valid = files.filter((file) => {
      if (!ACCEPTED_TYPES.includes(file.type)) skipped.push(`${file.name}: use JPG, PNG or WebP`);
      else if (file.size > MAX_FILE_SIZE) skipped.push(`${file.name}: larger than 10 MB`);
      else return true;
      return false;
    });
    if (skipped.length) toast.error(`Some photos were skipped:\n${skipped.join("\n")}`, { duration: 6000 });
    if (valid.length) update((s) => addPhotos(s, valid, colorKey));
  };

  const handleRemovePhoto = (key: string) => {
    const photo = state.photos.find((p) => p.key === key);
    if (photo?.file) URL.revokeObjectURL(photo.url);
    update((s) => removePhoto(s, key));
  };

  const photoHandlers = {
    primaryKey: state.primaryKey,
    onRemove: handleRemovePhoto,
    onMove: (key: string, direction: -1 | 1) => update((s) => movePhoto(s, key, direction)),
    onSetPrimary: (key: string) => update((s) => ({ ...s, primaryKey: key })),
  };

  // ---------- Options ----------
  const handleModeChange = (mode: Mode) => {
    const saved = savedVariantCount(state);
    if (mode === "single" && saved > 0) {
      setConfirmation({
        title: "Remove the sizes and colours?",
        message: `This product's ${saved} saved size/colour option${saved === 1 ? "" : "s"} will be deleted when you save, and removed from shoppers' carts. Colour photos will show for the whole product.`,
        confirmText: "Use one version",
        onConfirm: () => update((s) => setMode(s, "single")),
      });
      return;
    }
    update((s) => setMode(s, mode));
  };

  const handleToggleSize = (size: string) => {
    const removing = state.sizes.some((s) => s.trim().toLowerCase() === size.trim().toLowerCase());
    const saved = removing ? state.colors.filter((c) => state.cells[cellKey(size, c.key)]?.id).length : 0;
    if (saved > 0) {
      setConfirmation({
        title: `Remove size ${size}?`,
        message: `Its ${saved} saved option${saved === 1 ? "" : "s"} will be deleted when you save, and removed from shoppers' carts.`,
        confirmText: "Remove size",
        onConfirm: () => update((s) => toggleSize(s, size)),
      });
      return;
    }
    update((s) => toggleSize(s, size));
  };

  const handleRemoveColor = (key: string) => {
    const color = state.colors.find((c) => c.key === key);
    const saved = state.sizes.filter((size) => state.cells[cellKey(size, key)]?.id).length;
    const photos = photosOf(state, key).length;
    const remove = () => update((s) => removeColor(s, key, true));
    if (!saved && !photos) return remove();
    const parts = [
      saved ? `${saved} saved option${saved === 1 ? "" : "s"} (removed from shoppers' carts)` : null,
      photos ? `${photos} photo${photos === 1 ? "" : "s"}` : null,
    ].filter(Boolean);
    setConfirmation({
      title: `Remove ${color?.name || "this colour"}?`,
      message: `This deletes its ${parts.join(" and ")} when you save.`,
      confirmText: "Remove colour",
      onConfirm: remove,
    });
  };

  // ---------- Save ----------
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(true);
    const found = validate(state);
    const first = Object.keys(found)[0];
    if (first) {
      toast.error("Please fix the highlighted fields");
      requestAnimationFrame(() => {
        const el = document.getElementById(first);
        el?.focus({ preventScroll: true });
        el?.scrollIntoView?.({ block: "center", behavior: "smooth" });
      });
      return;
    }

    setSaving("saving");
    const wantVisible = state.details.isActive;
    const uploads = pendingUploads(state);
    const payload = buildPayload(state, isEdit);
    // New products stay hidden until their photos are in
    if (!isEdit) payload.isActive = wantVisible && uploads.files.length === 0;

    let saved: IProduct;
    try {
      const response = isEdit && product
        ? await adminAPI.updateProduct(product._id, payload)
        : await adminAPI.createProduct(payload);
      saved = response.data.data.product;
    } catch (error) {
      toast.error(getErrorMessage(error, "Couldn't save the product"));
      setSaving(null);
      return;
    }

    // Saved from here on. If photos fail the editor reopens on the saved
    // product (saving the "new" form again would create a duplicate).
    let photosFailed = false;
    if (uploads.files.length) {
      setSaving("photos");
      try {
        const known = new Set((saved.images || []).map((img) => img._id));
        const form = new FormData();
        uploads.files.forEach((file) => form.append("images", file));
        form.append("meta", JSON.stringify(uploads.meta));
        saved = (await adminAPI.uploadProductImages(saved._id, form)).data.data.product;

        // Uploaded photos are appended; put them where the admin placed them
        const added = (saved.images || []).filter((img) => img._id && !known.has(img._id));
        const idsByKey: Record<string, string> = {};
        uploads.keys.forEach((key, i) => {
          if (added[i]?._id) idsByKey[key] = added[i]._id!;
        });
        const order = photoOrder(state, idsByKey);
        const followUp: Record<string, unknown> = {};
        if (order.map((p) => p._id).join() !== (saved.images || []).map((img) => img._id).join()) followUp.images = order;
        if (!isEdit && wantVisible) followUp.isActive = true;
        if (Object.keys(followUp).length) saved = (await adminAPI.updateProduct(saved._id, followUp)).data.data.product;
      } catch (error) {
        console.error("Product photos failed to upload", error);
        photosFailed = true;
      }
    }

    setSaving(null);
    if (photosFailed) {
      toast.error(
        isEdit
          ? "Saved, but some photos didn't upload. Add them again and save."
          : "Saved as hidden: the photos didn't upload. Add them again, then make the product visible.",
        { duration: 8000 },
      );
      onSaved(saved, { reopen: true });
      return;
    }
    toast.success(isEdit ? "Product saved" : wantVisible ? "Product created and visible in the store" : "Product created (hidden)");
    onSaved(saved, { reopen: false });
  };

  const { details } = state;
  const derived = derivedAgeGroups(state);
  const generalPhotos = photosOf(state, null);

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] items-start">
        {/* Main column */}
        <div className="space-y-6 min-w-0">
          <Card id="details-heading" title="Details">
            <Field id="product-name" label="Product name" required error={errors["product-name"]}>
              <input
                type="text"
                value={details.name}
                maxLength={100}
                onChange={(e) => setDetail("name", e.target.value)}
                placeholder="e.g. Muslin Jhabla Set"
                {...inputProps("product-name", errors)}
              />
            </Field>
            <Field
              id="product-short-description"
              label="Short description"
              hint={`Shown on product pages and in search results. ${200 - details.shortDescription.length} characters left.`}
            >
              <input
                type="text"
                value={details.shortDescription}
                maxLength={200}
                onChange={(e) => setDetail("shortDescription", e.target.value)}
                placeholder="One line about what makes it special"
                {...inputProps("product-short-description", errors, "input", true)}
              />
            </Field>
            <Field id="product-description" label="Description" required error={errors["product-description"]}>
              <textarea
                value={details.description}
                maxLength={2000}
                rows={5}
                onChange={(e) => setDetail("description", e.target.value)}
                placeholder="Fabric, fit, how it's made, what's included…"
                {...inputProps("product-description", errors, "textarea")}
              />
            </Field>
          </Card>

          <Card
            id="photos-heading"
            title={state.mode === "variants" ? "Photos for every colour" : "Photos"}
            description={
              state.mode === "variants"
                ? "Shown whichever colour a shopper picks, e.g. detail shots or a size chart. Each colour's photos are under Sizes & colours."
                : "The first photo, or the one marked Main, is shown on product cards. JPG, PNG or WebP, up to 10 MB."
            }
          >
            <PhotoStrip
              label={state.mode === "variants" ? "every colour" : "this product"}
              photos={generalPhotos}
              onAdd={(files) => handleAddPhotos(files, null)}
              {...photoHandlers}
            />
          </Card>

          <Card id="options-heading" title="Price & options">
            <fieldset>
              <legend className="text-sm font-medium mb-2">Does this product come in different sizes or colours?</legend>
              <div className="grid sm:grid-cols-2 gap-3">
                {MODES.map(({ value, title, text, icon: Icon }) => {
                  const checked = state.mode === value;
                  return (
                    <label
                      key={value}
                      className={`flex gap-3 rounded-xl border-2 p-3 cursor-pointer transition-colors ${
                        checked ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]" : "border-[var(--color-border)] hover:border-[var(--color-border-strong)]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="product-mode"
                        value={value}
                        checked={checked}
                        onChange={() => handleModeChange(value)}
                        className="mt-1 w-4 h-4"
                      />
                      <span>
                        <span className="flex items-center gap-1.5 font-medium">
                          <Icon className="w-4 h-4" aria-hidden="true" />
                          {title}
                        </span>
                        <span className="block text-sm text-[var(--color-text-muted)]">{text}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {state.mode === "single" ? (
              <div className="grid sm:grid-cols-3 gap-4">
                <Field id="product-price" label="Price (NPR)" required error={errors["product-price"]}>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={details.price}
                    onChange={(e) => setDetail("price", e.target.value)}
                    placeholder="0"
                    {...inputProps("product-price", errors)}
                  />
                </Field>
                <Field
                  id="product-compare-price"
                  label="Compare-at price"
                  hint="Optional. Shown struck out."
                  error={errors["product-compare-price"]}
                >
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={details.comparePrice}
                    onChange={(e) => setDetail("comparePrice", e.target.value)}
                    placeholder="—"
                    {...inputProps("product-compare-price", errors, "input", true)}
                  />
                </Field>
                <Field id="product-stock" label="In stock" required error={errors["product-stock"]}>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    step="1"
                    value={details.stock}
                    onChange={(e) => setDetail("stock", e.target.value)}
                    placeholder="0"
                    {...inputProps("product-stock", errors)}
                  />
                </Field>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h3 className="font-medium font-sans tracking-normal">Sizes</h3>
                  <SizePicker
                    selected={state.sizes}
                    usedElsewhere={options.customSizes}
                    onToggle={handleToggleSize}
                    error={errors["product-sizes"]}
                  />
                </div>

                <div className="space-y-3">
                  <div>
                    <h3 className="font-medium font-sans tracking-normal">Colours</h3>
                    <p className="text-sm text-[var(--color-text-muted)]">
                      Add each colour's photos here: shoppers see them when they pick the colour.
                    </p>
                  </div>
                  <ul id="product-colors" tabIndex={-1} className="space-y-3 outline-none">
                    {state.colors.map((color, index) => {
                      const nameId = `color-name-${color.key}`;
                      const label = color.name.trim() || `colour ${index + 1}`;
                      return (
                        <li key={color.key} className="rounded-xl border border-[var(--color-border)] p-3 sm:p-4 space-y-3">
                          <div className="flex flex-wrap items-start gap-3">
                            {/* The swatch is the colour input: tap it to change the colour */}
                            <label
                              className="relative mt-0.5 rounded-full cursor-pointer focus-within:ring-2 focus-within:ring-[var(--color-primary)] focus-within:ring-offset-2"
                              title="Change swatch"
                            >
                              <Swatch hex={color.hex} className="w-9 h-9" />
                              <span className="sr-only">Swatch for {label}</span>
                              <input
                                id={`color-hex-${color.key}`}
                                type="color"
                                value={color.hex || "#ffffff"}
                                onChange={(e) => update((s) => updateColor(s, color.key, { hex: e.target.value }))}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              />
                            </label>
                            <div className="flex-1 min-w-[10rem]">
                              <label htmlFor={nameId} className="sr-only">
                                Colour name
                              </label>
                              <input
                                type="text"
                                value={color.name}
                                maxLength={30}
                                onChange={(e) => update((s) => updateColor(s, color.key, { name: e.target.value }))}
                                {...inputProps(nameId, errors)}
                              />
                              {errors[nameId] && (
                                <p id={`${nameId}-error`} className="text-sm text-[var(--color-error)] mt-1">
                                  {errors[nameId]}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => update((s) => moveColor(s, color.key, -1))}
                                disabled={index === 0}
                                aria-label={`Move ${label} up`}
                                className="p-2 rounded-lg hover:bg-[var(--color-surface-muted)] disabled:opacity-35"
                              >
                                <ArrowUp className="w-4 h-4" aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                onClick={() => update((s) => moveColor(s, color.key, 1))}
                                disabled={index === state.colors.length - 1}
                                aria-label={`Move ${label} down`}
                                className="p-2 rounded-lg hover:bg-[var(--color-surface-muted)] disabled:opacity-35"
                              >
                                <ArrowDown className="w-4 h-4" aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveColor(color.key)}
                                aria-label={`Remove ${label}`}
                                className="p-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-error)] hover:bg-[var(--color-surface-muted)]"
                              >
                                <Trash2 className="w-4 h-4" aria-hidden="true" />
                              </button>
                            </div>
                          </div>
                          <PhotoStrip
                            compact
                            label={label}
                            photos={photosOf(state, color.key)}
                            onAdd={(files) => handleAddPhotos(files, color.key)}
                            {...photoHandlers}
                          />
                        </li>
                      );
                    })}
                  </ul>
                  {errors["product-colors"] && <p className="text-sm text-[var(--color-error)]">{errors["product-colors"]}</p>}
                  {colorPickerOpen ? (
                    <ColorPicker
                      existing={state.colors.map((c) => c.name)}
                      usedElsewhere={options.colors}
                      onAdd={(name, hex) => update((s) => addColor(s, name, hex))}
                      onClose={() => setColorPickerOpen(false)}
                    />
                  ) : (
                    <button type="button" onClick={() => setColorPickerOpen(true)} className="btn btn-secondary text-sm">
                      <Plus className="w-4 h-4" aria-hidden="true" />
                      Add colour
                    </button>
                  )}
                </div>

                <OptionsTable state={state} errors={errors} update={update} />
              </div>
            )}
          </Card>

          <details className="card p-4 sm:p-6 group">
            <summary className="cursor-pointer font-semibold text-lg list-none flex items-center justify-between">
              Search engine listing
              <span className="text-sm font-normal text-[var(--color-text-muted)] group-open:hidden">Optional</span>
            </summary>
            <div className="space-y-4 mt-4">
              <Field id="product-meta-title" label="Search result title" hint="Defaults to the product name">
                <input
                  type="text"
                  value={details.metaTitle}
                  maxLength={70}
                  onChange={(e) => setDetail("metaTitle", e.target.value)}
                  {...inputProps("product-meta-title", errors, "input", true)}
                />
              </Field>
              <Field id="product-meta-description" label="Search result description" hint="Defaults to the short description">
                <textarea
                  value={details.metaDescription}
                  maxLength={160}
                  rows={2}
                  onChange={(e) => setDetail("metaDescription", e.target.value)}
                  {...inputProps("product-meta-description", errors, "textarea", true)}
                />
              </Field>
            </div>
          </details>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <Card id="status-heading" title="Status">
            <fieldset className="space-y-2">
              <legend className="sr-only">Visibility</legend>
              {[
                { value: true, title: "Visible in store", text: isEdit ? "Shoppers can find and buy it" : "Goes live once its photos have uploaded" },
                { value: false, title: "Hidden", text: "Only admins can see it (draft)" },
              ].map((option) => (
                <label key={option.title} className="flex gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="product-visibility"
                    checked={details.isActive === option.value}
                    onChange={() => setDetail("isActive", option.value)}
                    className="mt-1 w-4 h-4"
                  />
                  <span>
                    <span className="block text-sm font-medium">{option.title}</span>
                    <span className="block text-xs text-[var(--color-text-muted)]">{option.text}</span>
                  </span>
                </label>
              ))}
            </fieldset>
            <label className="flex items-center gap-2.5 cursor-pointer border-t border-[var(--color-border)] pt-3">
              <input
                type="checkbox"
                checked={details.isFeatured}
                onChange={(e) => setDetail("isFeatured", e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">Feature on the home page</span>
            </label>
          </Card>

          <Card id="organisation-heading" title="Organisation">
            <Field id="product-category" label="Category" required error={errors["product-category"]}>
              <select
                value={details.category}
                onChange={(e) => setDetail("category", e.target.value)}
                {...inputProps("product-category", errors, "select")}
              >
                <option value="">Choose a category</option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat._id}>
                    {populated(cat.parent) ? `${populated(cat.parent)?.name} → ` : ""}
                    {cat.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="product-gender" label="For">
              <select value={details.gender} onChange={(e) => setDetail("gender", e.target.value)} {...inputProps("product-gender", errors, "select")}>
                <option value="">Anyone (not specified)</option>
                {PRODUCT_GENDERS.map((g) => (
                  <option key={g} value={g}>
                    {GENDER_LABELS[g]}
                  </option>
                ))}
              </select>
            </Field>
            <fieldset>
              <legend className="block text-sm font-medium mb-1">Shop by age</legend>
              {derived.length > 0 ? (
                <>
                  <ul className="flex flex-wrap gap-1.5" aria-label="Age groups">
                    {derived.map((age) => (
                      <li key={age} className="rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)] px-2.5 py-1 text-xs font-medium">
                        {formatAgeGroup(age)}
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1.5">Set automatically from the sizes.</p>
                </>
              ) : (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    {AGE_GROUPS.map((age) => {
                      const checked = details.ageGroups.includes(age);
                      return (
                        <label
                          key={age}
                          className={`cursor-pointer select-none rounded-full border px-2.5 py-1 text-xs transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--color-primary)] ${
                            checked
                              ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)] font-medium"
                              : "border-[var(--color-border)] hover:border-[var(--color-primary)]"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={checked}
                            onChange={() =>
                              setDetail(
                                "ageGroups",
                                checked ? details.ageGroups.filter((a) => a !== age) : AGE_GROUPS.filter((a) => a === age || details.ageGroups.includes(a)),
                              )
                            }
                          />
                          {formatAgeGroup(age)}
                        </label>
                      );
                    })}
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1.5">
                    {state.mode === "variants" ? "Sizes on the age scale set these automatically." : "Untagged products don't appear in Shop by age."}
                  </p>
                </>
              )}
            </fieldset>
          </Card>

          <Card id="more-heading" title="More details">
            <Field id="product-material" label="Material">
              <input
                type="text"
                value={details.material}
                maxLength={200}
                onChange={(e) => setDetail("material", e.target.value)}
                placeholder="e.g. 100% organic cotton"
                {...inputProps("product-material", errors)}
              />
            </Field>
            <Field id="product-care" label="Care instructions">
              <input
                type="text"
                value={details.careInstructions}
                maxLength={500}
                onChange={(e) => setDetail("careInstructions", e.target.value)}
                placeholder="e.g. Machine wash cold, gentle cycle"
                {...inputProps("product-care", errors)}
              />
            </Field>
            <Field id="product-age-recommendation" label="Age note" hint="Optional, e.g. “Best from 3 months”">
              <input
                type="text"
                value={details.ageRecommendation}
                maxLength={100}
                onChange={(e) => setDetail("ageRecommendation", e.target.value)}
                {...inputProps("product-age-recommendation", errors, "input", true)}
              />
            </Field>
            <Field id="product-sku" label="Product code (SKU)">
              <input
                type="text"
                value={details.sku}
                maxLength={50}
                onChange={(e) => setDetail("sku", e.target.value)}
                {...inputProps("product-sku", errors, "input uppercase")}
              />
            </Field>
          </Card>

          <ProductSummary state={state} />
        </aside>
      </div>

      {/* Sticky actions (right padding keeps Save clear of the floating chat button) */}
      <div className="sticky bottom-0 z-20 mt-6 -mx-4 sm:-mx-6 pl-4 sm:pl-6 pr-20 sm:pr-24 py-3 border-t border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--color-text-muted)]" role="status">
          {saving === "photos" ? "Uploading photos…" : saving ? "Saving…" : dirty ? "Unsaved changes" : isEdit ? "All changes saved" : "New product"}
        </p>
        <div className="flex gap-3">
          <button type="button" onClick={onCancel} className="btn btn-secondary" disabled={!!saving}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={!!saving} aria-busy={!!saving}>
            {saving && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
            {isEdit ? "Save changes" : "Create product"}
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!confirmation}
        onClose={() => setConfirmation(null)}
        onConfirm={() => {
          confirmation?.onConfirm();
          setConfirmation(null);
        }}
        title={confirmation?.title || ""}
        message={confirmation?.message || ""}
        confirmText={confirmation?.confirmText}
        cancelText="Keep it"
        variant="warning"
      />
    </form>
  );
};

export default ProductForm;
