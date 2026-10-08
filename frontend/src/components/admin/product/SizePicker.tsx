/**
 * Size chips: the age scale (babies in months, kids in years), sizes used on
 * other products, and a box for a new size. Selected sizes are kept smallest
 * first by the editor.
 */
import { useState, type KeyboardEvent } from "react";
import { Check, Plus } from "lucide-react";
import { MAX_SIZE_LENGTH, PRODUCT_SIZES } from "../../../utils/constants";
import { sameName } from "../../../utils/productOptions";

interface SizePickerProps {
  selected: string[];
  /** Custom sizes already used on other products */
  usedElsewhere: string[];
  onToggle: (size: string) => void;
  error?: string;
}

const BABY = PRODUCT_SIZES.filter((s) => s.endsWith("Months"));
const KIDS = PRODUCT_SIZES.filter((s) => s.endsWith("Years"));

const Chip = ({ size, selected, onToggle }: { size: string; selected: boolean; onToggle: (size: string) => void }) => (
  <button
    type="button"
    aria-pressed={selected}
    onClick={() => onToggle(size)}
    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm transition-colors ${
      selected
        ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-on-primary)] font-medium"
        : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]"
    }`}
  >
    {selected && <Check className="w-3.5 h-3.5" aria-hidden="true" />}
    {size}
  </button>
);

const SizePicker = ({ selected, usedElsewhere, onToggle, error }: SizePickerProps) => {
  const [custom, setCustom] = useState("");
  const isSelected = (size: string) => selected.some((s) => sameName(s, size));
  const scale = PRODUCT_SIZES as readonly string[];
  // Selected sizes that aren't on the scale (custom or older names) plus suggestions
  const others = [
    "One Size",
    ...[...selected, ...usedElsewhere].filter(
      (size, i, all) => !scale.some((s) => sameName(s, size)) && all.findIndex((x) => sameName(x, size)) === i,
    ),
  ];

  const addCustom = () => {
    const value = custom.trim();
    if (!value) return;
    if (!isSelected(value)) onToggle(value);
    setCustom("");
  };

  const groups: [string, readonly string[]][] = [
    ["Babies", BABY],
    ["Kids", KIDS],
    ["Other", others],
  ];

  return (
    <div id="product-sizes" tabIndex={-1} aria-describedby={error ? "product-sizes-error" : undefined} className="space-y-3 outline-none">
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
          Another size
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
          placeholder="Another size, e.g. 90 cm"
          className="input text-sm max-w-xs"
        />
        <button type="button" onClick={addCustom} disabled={!custom.trim()} className="btn btn-secondary text-sm px-3 py-2">
          <Plus className="w-4 h-4" aria-hidden="true" />
          Add size
        </button>
      </div>
      {error && (
        <p id="product-sizes-error" className="text-sm text-[var(--color-error)]">
          {error}
        </p>
      )}
    </div>
  );
};

export default SizePicker;
