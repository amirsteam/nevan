/**
 * Size chips: the store's scale (Small 0–12 months … XL 5–7 years, One Size),
 * custom sizes (typed here or used on other products), and — only when this
 * product already has them — older sizes such as XXL, which can be kept or
 * removed but are never offered for new products. Selected sizes are kept
 * smallest first by the editor.
 */
import { useState, type KeyboardEvent } from "react";
import { Check, Plus } from "lucide-react";
import { LEGACY_SIZES, MAX_SIZE_LENGTH, PRODUCT_SIZES } from "../../../utils/constants";
import { sameName } from "../../../utils/productOptions";

interface SizePickerProps {
  selected: string[];
  /** Custom sizes already used on other products */
  usedElsewhere: string[];
  onToggle: (size: string) => void;
  error?: string;
}

/** "Small (0-12 months)" → "Small · 0–12 months" */
const chipLabel = (size: string): string => {
  const match = size.match(/^(.+?) \((\d+)-(\d+) (months|years)\)$/i);
  return match ? `${match[1]} · ${match[2]}–${match[3]} ${match[4].toLowerCase()}` : size;
};

const Chip = ({ size, selected, onToggle }: { size: string; selected: boolean; onToggle: (size: string) => void }) => (
  <button
    type="button"
    aria-pressed={selected}
    onClick={() => onToggle(size)}
    title={chipLabel(size) !== size ? size : undefined}
    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm transition-colors ${
      selected
        ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-on-primary)] font-medium"
        : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]"
    }`}
  >
    {selected && <Check className="w-3.5 h-3.5" aria-hidden="true" />}
    {chipLabel(size)}
  </button>
);

const isOneOf = (list: readonly string[], size: string) => list.some((s) => sameName(s, size));

const SizePicker = ({ selected, usedElsewhere, onToggle, error }: SizePickerProps) => {
  const [custom, setCustom] = useState("");
  const isSelected = (size: string) => selected.some((s) => sameName(s, size));
  const unique = (sizes: string[]) => sizes.filter((size, i, all) => all.findIndex((x) => sameName(x, size)) === i);

  // Older sizes appear only while this product still has them
  const older = unique(selected.filter((size) => isOneOf(LEGACY_SIZES, size)));
  const customSizes = unique(
    [...selected, ...usedElsewhere].filter((size) => !isOneOf(PRODUCT_SIZES, size) && !isOneOf(LEGACY_SIZES, size)),
  );

  const addCustom = () => {
    const value = custom.trim();
    if (!value) return;
    if (!isSelected(value)) onToggle(value);
    setCustom("");
  };

  const groups: [string, readonly string[]][] = [
    ["Sizes", PRODUCT_SIZES],
    ...(customSizes.length ? [["Custom", customSizes] as [string, string[]]] : []),
    ...(older.length ? [["Older", older] as [string, string[]]] : []),
  ];

  return (
    <div id="product-sizes" tabIndex={-1} aria-describedby={`product-sizes-hint${error ? " product-sizes-error" : ""}`} className="space-y-3 outline-none">
      {groups.map(([title, sizes]) => (
        <div key={title} role="group" aria-label={`${title} sizes`} className="flex flex-wrap items-center gap-2">
          <span className="w-14 shrink-0 text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">{title}</span>
          {sizes.map((size) => (
            <Chip key={size} size={size} selected={isSelected(size)} onToggle={onToggle} />
          ))}
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-2 sm:pl-16">
        <label htmlFor="custom-size" className="sr-only">
          Custom size
        </label>
        <input
          id="custom-size"
          type="text"
          value={custom}
          maxLength={MAX_SIZE_LENGTH}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
            // Enter adds the size instead of submitting the form
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom();
            }
          }}
          placeholder="Custom size, e.g. 90 cm"
          className="input text-sm max-w-xs"
        />
        <button type="button" onClick={addCustom} disabled={!custom.trim()} className="btn btn-secondary text-sm px-3 py-2">
          <Plus className="w-4 h-4" aria-hidden="true" />
          Add size
        </button>
      </div>
      <p id="product-sizes-hint" className="text-xs text-[var(--color-text-muted)] sm:pl-16">
        Sizes go up to 7 years. Use a custom size for anything else.
        {older.length > 0 && " Older sizes stay on this product until you remove them; they can't be added to others."}
      </p>
      {error && (
        <p id="product-sizes-error" className="text-sm text-[var(--color-error)]">
          {error}
        </p>
      )}
    </div>
  );
};

export default SizePicker;
