/**
 * Prices (per size, or per size and colour) and stock (a sizes × colours
 * grid, where any combination can be marked "not made"), with fill-all
 * helpers. Scrolls sideways on narrow screens with the size column pinned.
 */
import { useState } from "react";
import { Ban, Plus } from "lucide-react";
import {
  applyPriceToAll,
  applyStockToAll,
  cellKey,
  setCell,
  setPriceByColour,
  setSizePrice,
  sizeId,
  type EditorState,
  type Errors,
} from "./editorState";
import { Swatch } from "./ColorPicker";

interface OptionsTableProps {
  state: EditorState;
  errors: Errors;
  update: (change: (state: EditorState) => EditorState) => void;
}

const NumberInput = ({
  id,
  label,
  value,
  onChange,
  error,
  placeholder,
  decimal = true,
  className = "",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  decimal?: boolean;
  className?: string;
}) => (
  <div className={className}>
    <label htmlFor={id} className="sr-only">
      {label}
    </label>
    <input
      id={id}
      type="number"
      inputMode={decimal ? "decimal" : "numeric"}
      min="0"
      step={decimal ? "0.01" : "1"}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? `${id}-error` : undefined}
      className={`input text-sm py-2 ${error ? "border-[var(--color-error)]" : ""}`}
    />
    {error && (
      <p id={`${id}-error`} className="text-xs text-[var(--color-error)] mt-1">
        {error}
      </p>
    )}
  </div>
);

const FillAll = ({ label, buttonLabel, onApply, decimal }: { label: string; buttonLabel: string; onApply: (value: string) => void; decimal: boolean }) => {
  const [value, setValue] = useState("");
  const id = `fill-${label.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor={id} className="text-sm text-[var(--color-text-muted)]">
        {label}
      </label>
      <input
        id={id}
        type="number"
        min="0"
        step={decimal ? "0.01" : "1"}
        inputMode={decimal ? "decimal" : "numeric"}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (value.trim()) onApply(value.trim());
          }
        }}
        className="input text-sm py-1.5 w-28"
      />
      <button type="button" disabled={!value.trim()} onClick={() => onApply(value.trim())} className="btn btn-secondary text-sm px-3 py-1.5">
        {buttonLabel}
      </button>
    </div>
  );
};

const OptionsTable = ({ state, errors, update }: OptionsTableProps) => {
  const { sizes, colors, cells, sizePrices, priceByColour, showSkus } = state;
  if (!sizes.length || !colors.length) {
    return (
      <p className="text-sm text-[var(--color-text-muted)] rounded-lg border border-dashed border-[var(--color-border-strong)] p-4">
        Choose at least one size and one colour to set prices and stock.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {/* Prices */}
      <section aria-labelledby="prices-heading" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h4 id="prices-heading" className="font-medium">
              Prices
            </h4>
            <p className="text-sm text-[var(--color-text-muted)]">
              {priceByColour
                ? "Set in the stock table below, for each size and colour."
                : "One price per size, for every colour. A compare-at price is shown struck out."}
            </p>
          </div>
          <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={priceByColour}
              onChange={(e) => update((s) => setPriceByColour(s, e.target.checked))}
              className="w-4 h-4"
            />
            Prices differ by colour
          </label>
        </div>

        <FillAll
          label={priceByColour ? "Same price for everything (NPR)" : "Same price for every size (NPR)"}
          buttonLabel="Apply"
          decimal
          onApply={(value) => update((s) => applyPriceToAll(s, value))}
        />

        {!priceByColour && (
          <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
            <table className="w-full text-sm min-w-[22rem]">
              <thead className="bg-[var(--color-surface-muted)] text-left text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                <tr>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Size
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Price (NPR)
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Compare-at <span className="normal-case font-normal">(optional)</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sizes.map((size) => {
                  const price = sizePrices[sizeId(size)] || { price: "", comparePrice: "" };
                  return (
                    <tr key={size} className="border-t border-[var(--color-border)] align-top">
                      <th scope="row" className="px-3 py-2.5 text-left font-medium whitespace-nowrap">
                        {size}
                      </th>
                      <td className="px-3 py-2">
                        <NumberInput
                          id={`size-price-${sizeId(size)}`}
                          label={`Price for ${size}`}
                          value={price.price}
                          placeholder="0"
                          error={errors[`size-price-${sizeId(size)}`]}
                          onChange={(value) => update((s) => setSizePrice(s, size, { price: value }))}
                          className="min-w-[6rem] max-w-[9rem]"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <NumberInput
                          id={`size-compare-${sizeId(size)}`}
                          label={`Compare-at price for ${size}`}
                          value={price.comparePrice}
                          placeholder="—"
                          error={errors[`size-compare-${sizeId(size)}`]}
                          onChange={(value) => update((s) => setSizePrice(s, size, { comparePrice: value }))}
                          className="min-w-[6rem] max-w-[9rem]"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Stock grid */}
      <section aria-labelledby="stock-heading" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h4 id="stock-heading" className="font-medium">
              Stock{priceByColour ? " and prices" : ""}
            </h4>
            <p className="text-sm text-[var(--color-text-muted)]">How many of each size you have in each colour.</p>
          </div>
          <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={showSkus}
              onChange={(e) => update((s) => ({ ...s, showSkus: e.target.checked }))}
              className="w-4 h-4"
            />
            Show SKUs
          </label>
        </div>
        <FillAll label="Same stock for every option" buttonLabel="Apply" decimal={false} onApply={(value) => update((s) => applyStockToAll(s, value))} />

        <div id="product-options" tabIndex={-1} className="overflow-x-auto rounded-xl border border-[var(--color-border)] outline-none">
          <table className="text-sm min-w-full">
            <thead className="bg-[var(--color-surface-muted)] text-left text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
              <tr>
                <th scope="col" className="sticky left-0 z-10 bg-[var(--color-surface-muted)] px-3 py-2 font-semibold">
                  Size
                </th>
                {colors.map((color) => (
                  <th key={color.key} scope="col" className="px-3 py-2 font-semibold min-w-[9.5rem]">
                    <span className="inline-flex items-center gap-1.5 normal-case text-sm text-[var(--color-text)]">
                      <Swatch hex={color.hex} className="w-4 h-4" />
                      {color.name || "Unnamed colour"}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sizes.map((size) => (
                <tr key={size} className="border-t border-[var(--color-border)] align-top">
                  <th scope="row" className="sticky left-0 z-10 bg-[var(--color-surface)] px-3 py-2.5 text-left font-medium whitespace-nowrap">
                    {size}
                  </th>
                  {colors.map((color) => {
                    const key = cellKey(size, color.key);
                    const cell = cells[key];
                    const name = `${size}, ${color.name || "unnamed colour"}`;
                    if (!cell?.offered) {
                      return (
                        <td key={color.key} className="px-3 py-2 bg-[var(--color-surface-muted)]/60">
                          <span className="block text-xs text-[var(--color-text-muted)] mb-1">Not made</span>
                          <button
                            type="button"
                            onClick={() => update((s) => setCell(s, size, color.key, { offered: true }))}
                            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-primary)] hover:underline"
                          >
                            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                            Offer<span className="sr-only"> {name}</span>
                          </button>
                        </td>
                      );
                    }
                    return (
                      <td key={color.key} className="px-3 py-2">
                        <div className="space-y-1.5">
                          <div className="flex items-start gap-1.5">
                            <NumberInput
                              id={`cell-stock-${key}`}
                              label={`Stock for ${name}`}
                              value={cell.stock}
                              placeholder="0 in stock"
                              decimal={false}
                              error={errors[`cell-stock-${key}`]}
                              onChange={(value) => update((s) => setCell(s, size, color.key, { stock: value }))}
                              className="flex-1 min-w-[5.5rem]"
                            />
                            <button
                              type="button"
                              onClick={() => update((s) => setCell(s, size, color.key, { offered: false }))}
                              title="Not made in this size and colour"
                              aria-label={`Not made: ${name}`}
                              className="mt-1.5 p-1 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-error)] hover:bg-[var(--color-surface-muted)]"
                            >
                              <Ban className="w-4 h-4" aria-hidden="true" />
                            </button>
                          </div>
                          {priceByColour && (
                            <>
                              <NumberInput
                                id={`cell-price-${key}`}
                                label={`Price for ${name}`}
                                value={cell.price}
                                placeholder="Price"
                                error={errors[`cell-price-${key}`]}
                                onChange={(value) => update((s) => setCell(s, size, color.key, { price: value }))}
                              />
                              <NumberInput
                                id={`cell-compare-${key}`}
                                label={`Compare-at price for ${name}`}
                                value={cell.comparePrice}
                                placeholder="Compare-at"
                                error={errors[`cell-compare-${key}`]}
                                onChange={(value) => update((s) => setCell(s, size, color.key, { comparePrice: value }))}
                              />
                            </>
                          )}
                          {showSkus && (
                            <div>
                              <label htmlFor={`cell-sku-${key}`} className="sr-only">
                                SKU for {name}
                              </label>
                              <input
                                id={`cell-sku-${key}`}
                                type="text"
                                maxLength={50}
                                value={cell.sku}
                                placeholder="SKU"
                                onChange={(e) => update((s) => setCell(s, size, color.key, { sku: e.target.value }))}
                                className="input text-sm py-2 uppercase"
                              />
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {errors["product-options"] && <p className="text-sm text-[var(--color-error)]">{errors["product-options"]}</p>}
      </section>
    </div>
  );
};

export default OptionsTable;
