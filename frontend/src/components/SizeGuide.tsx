/**
 * SizeGuide Component
 * Approximate measurements for the store's sizes (Small 0–12 months … XL
 * 5–7 years, plus older names still on some products), shown in the accessible
 * Modal. Given the product's sizes it shows just those; the selected size is
 * highlighted.
 */
import { useState } from "react";
import { Info } from "lucide-react";
import Modal from "./ui/Modal";
import { sameName } from "../utils/productOptions";

interface SizeRow {
  size: string;
  short: string;
  age: string;
  weightKg: [number, number];
  heightCm: [number, number];
  chestCm: [number, number];
  // Older size names, only shown for products that use them
  legacy?: boolean;
}

// Approximate ranges; individual products may fit differently
const SIZE_DATA: SizeRow[] = [
  { size: "Small (0-12 months)", short: "S", age: "0–12 months", weightKg: [3, 10.5], heightCm: [50, 80], chestCm: [38, 48] },
  { size: "Medium (1-3 years)", short: "M", age: "1–3 years", weightKg: [10.5, 15], heightCm: [80, 98], chestCm: [48, 54] },
  { size: "Large (3-5 years)", short: "L", age: "3–5 years", weightKg: [15, 19], heightCm: [98, 110], chestCm: [54, 58] },
  { size: "XL (5-7 years)", short: "XL", age: "5–7 years", weightKg: [19, 23], heightCm: [110, 122], chestCm: [58, 62] },
  // Older names: the same garments under their earlier labels, shown only for products that still use them
  { size: "Small Size (0-1 yrs)", short: "S", age: "0–12 months", weightKg: [3, 10.5], heightCm: [50, 80], chestCm: [38, 48], legacy: true },
  { size: "Medium Size (1-4 yrs)", short: "M", age: "1–3 years", weightKg: [10.5, 15], heightCm: [80, 98], chestCm: [48, 54], legacy: true },
  { size: "Large Size (4-6 yrs)", short: "L", age: "3–5 years", weightKg: [15, 19], heightCm: [98, 110], chestCm: [54, 58], legacy: true },
  { size: "XL Size (6-8 yrs)", short: "XL", age: "5–7 years", weightKg: [19, 23], heightCm: [110, 122], chestCm: [58, 62], legacy: true },
  { size: "XXL Size (8-10 yrs)", short: "XXL", age: "8–10 yrs", weightKg: [26, 33], heightCm: [128, 140], chestCm: [64, 68], legacy: true },
];

interface SizeGuideProps {
  isOpen: boolean;
  onClose: () => void;
  currentSize?: string;
  /** The product's sizes: show only those (the whole age scale when none are known) */
  sizes?: string[];
}

const SizeGuide = ({ isOpen, onClose, currentSize, sizes }: SizeGuideProps) => {
  const [unit, setUnit] = useState<"cm" | "in">("cm");
  const forProduct = (sizes || [])
    .map((size) => SIZE_DATA.find((row) => sameName(row.size, size)))
    .filter((row): row is SizeRow => !!row);
  const rows = forProduct.length ? forProduct : SIZE_DATA.filter((row) => !row.legacy);
  const length = ([a, b]: [number, number]) =>
    unit === "cm" ? `${a}–${b} cm` : `${(a / 2.54).toFixed(0)}–${(b / 2.54).toFixed(0)} in`;
  const isCurrent = (row: SizeRow) => !!currentSize && sameName(row.size, currentSize);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Size guide" size="lg" variant="sheet">
      <div className="flex items-center justify-between gap-3 mb-4">
        <p className="text-sm text-[var(--color-text-muted)]">
          {forProduct.length ? "Approximate body measurements for this product's sizes." : "Approximate body measurements for each size."}
        </p>
        <div role="group" aria-label="Units" className="inline-flex rounded-lg border border-[var(--color-border)] p-0.5 shrink-0">
          {(["cm", "in"] as const).map((u) => (
            <button
              key={u}
              type="button"
              aria-pressed={unit === u}
              onClick={() => setUnit(u)}
              className={`px-3 py-1 text-xs font-medium rounded-md ${
                unit === u ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]" : "text-[var(--color-text-muted)]"
              }`}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto -mx-4 px-4">
        <table className="w-full text-sm min-w-[28rem]">
          <caption className="sr-only">Size chart</caption>
          <thead>
            <tr className="border-b border-[var(--color-border)] text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
              <th scope="col" className="text-left py-2 px-2 font-semibold">Size</th>
              <th scope="col" className="text-left py-2 px-2 font-semibold">Age</th>
              <th scope="col" className="text-left py-2 px-2 font-semibold">Height</th>
              <th scope="col" className="text-left py-2 px-2 font-semibold">Chest</th>
              <th scope="col" className="text-left py-2 px-2 font-semibold">Weight</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.size}
                aria-current={isCurrent(row) ? "true" : undefined}
                className={`border-b border-[var(--color-border)] last:border-0 ${
                  isCurrent(row) ? "bg-[var(--color-primary-soft)] font-medium" : ""
                }`}
              >
                <th scope="row" className="py-3 px-2 text-left font-medium">
                  <span
                    className={`inline-block min-w-9 text-center px-2 py-0.5 rounded text-xs font-semibold ${
                      isCurrent(row)
                        ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                        : "bg-[var(--color-surface-muted)]"
                    }`}
                  >
                    {row.short}
                  </span>
                  {isCurrent(row) && <span className="sr-only"> (selected)</span>}
                </th>
                <td className="py-3 px-2">{row.age}</td>
                <td className="py-3 px-2">{length(row.heightCm)}</td>
                <td className="py-3 px-2">{length(row.chestCm)}</td>
                <td className="py-3 px-2">
                  {row.weightKg[0]}–{row.weightKg[1]} kg
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-start gap-2 mt-4 p-3 bg-[var(--color-surface-muted)] rounded-lg text-xs text-[var(--color-text-muted)]">
        <Info className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-medium text-[var(--color-text)] mb-1">How to measure</p>
          <ul className="space-y-0.5">
            <li>
              <strong>Height:</strong> lay your baby flat and measure head to heel.
            </li>
            <li>
              <strong>Chest:</strong> measure around the fullest part of the chest.
            </li>
            <li>
              <strong>Between sizes?</strong> Choose the larger size — little ones grow fast.
            </li>
          </ul>
        </div>
      </div>
    </Modal>
  );
};

export default SizeGuide;
