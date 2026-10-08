/**
 * "Add colour" panel: the palette (with swatches), colours used on other
 * products, and a custom colour (name + swatch).
 */
import { useState, type KeyboardEvent } from "react";
import { Check, Plus, X } from "lucide-react";
import { COLOR_PALETTE, MAX_COLOR_LENGTH } from "../../../utils/constants";
import { isLightSwatch, paletteHex, sameName } from "../../../utils/productOptions";

interface ColorChoice {
  name: string;
  hex?: string;
}

interface ColorPickerProps {
  /** Colours already on this product */
  existing: string[];
  usedElsewhere: ColorChoice[];
  onAdd: (name: string, hex: string) => void;
  onClose: () => void;
}

export const Swatch = ({ hex, className = "w-5 h-5" }: { hex?: string; className?: string }) =>
  hex ? (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 rounded-full ${isLightSwatch(hex) ? "ring-1 ring-inset ring-[var(--color-border-strong)]" : ""} ${className}`}
      style={{ backgroundColor: hex }}
    />
  ) : (
    <span aria-hidden="true" className={`inline-block shrink-0 rounded-full border-2 border-dashed border-[var(--color-border-strong)] ${className}`} />
  );

const ColorPicker = ({ existing, usedElsewhere, onAdd, onClose }: ColorPickerProps) => {
  const [name, setName] = useState("");
  const [hex, setHex] = useState("#c1847b");
  const has = (value: string) => existing.some((c) => sameName(c, value));

  const choice = (color: ColorChoice) => {
    const added = has(color.name);
    return (
      <button
        key={color.name}
        type="button"
        disabled={added}
        onClick={() => onAdd(color.name, color.hex || "")}
        className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] pl-1.5 pr-3 py-1 text-sm hover:border-[var(--color-primary)] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Swatch hex={color.hex} />
        {color.name}
        {added && (
          <>
            <Check className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="sr-only">(added)</span>
          </>
        )}
      </button>
    );
  };

  const addCustom = () => {
    const value = name.trim();
    if (!value || has(value)) return;
    onAdd(value, paletteHex(value) || hex);
    setName("");
  };

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium text-sm">Add a colour</p>
        <button type="button" onClick={onClose} aria-label="Close colour picker" className="p-1 rounded-md hover:bg-[var(--color-surface)]">
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
      <div role="group" aria-label="Suggested colours" className="flex flex-wrap gap-2">
        {COLOR_PALETTE.map(choice)}
      </div>
      {usedElsewhere.length > 0 && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)] mb-2">Used on other products</p>
          <div role="group" aria-label="Colours used on other products" className="flex flex-wrap gap-2">
            {usedElsewhere.map(choice)}
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label htmlFor="custom-color-name" className="block text-xs font-medium mb-1">
            Another colour
          </label>
          <input
            id="custom-color-name"
            type="text"
            value={name}
            maxLength={MAX_COLOR_LENGTH}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustom();
              }
            }}
            placeholder="e.g. Marigold"
            className="input text-sm w-48"
          />
        </div>
        <div>
          <label htmlFor="custom-color-hex" className="block text-xs font-medium mb-1">
            Swatch
          </label>
          <input
            id="custom-color-hex"
            type="color"
            value={hex}
            onChange={(e) => setHex(e.target.value)}
            className="h-10 w-14 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-1 cursor-pointer"
          />
        </div>
        <button type="button" onClick={addCustom} disabled={!name.trim() || has(name)} className="btn btn-secondary text-sm px-3 py-2 bg-[var(--color-surface)]">
          <Plus className="w-4 h-4" aria-hidden="true" />
          Add colour
        </button>
      </div>
    </div>
  );
};

export default ColorPicker;
