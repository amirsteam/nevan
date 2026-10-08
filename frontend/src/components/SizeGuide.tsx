/**
 * SizeGuide Component
 * Approximate measurements for the store's sizes (the age scale in
 * utils/constants, plus the older S–XXL sizes), shown in the accessible
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
  { size: "0-3 Months", short: "0–3M", age: "0–3 months", weightKg: [3, 6], heightCm: [50, 62], chestCm: [38, 42] },
  { size: "3-6 Months", short: "3–6M", age: "3–6 months", weightKg: [6, 8], heightCm: [62, 68], chestCm: [42, 44] },
  { size: "6-12 Months", short: "6–12M", age: "6–12 months", weightKg: [8, 10.5], heightCm: [68, 80], chestCm: [44, 48] },
  { size: "12-18 Months", short: "12–18M", age: "12–18 months", weightKg: [10.5, 12], heightCm: [80, 86], chestCm: [48, 50] },
  { size: "18-24 Months", short: "18–24M", age: "18–24 months", weightKg: [12, 13.5], heightCm: [86, 92], chestCm: [50, 52] },
  { size: "2-3 Years", short: "2–3Y", age: "2–3 years", weightKg: [13.5, 15], heightCm: [92, 98], chestCm: [52, 54] },
  { size: "3-4 Years", short: "3–4Y", age: "3–4 years", weightKg: [15, 17], heightCm: [98, 104], chestCm: [54, 56] },
  { size: "4-5 Years", short: "4–5Y", age: "4–5 years", weightKg: [17, 19], heightCm: [104, 110], chestCm: [56, 58] },
  { size: "5-6 Years", short: "5–6Y", age: "5–6 years", weightKg: [19, 21], heightCm: [110, 116], chestCm: [58, 60] },
  { size: "6-7 Years", short: "6–7Y", age: "6–7 years", weightKg: [21, 23], heightCm: [116, 122], chestCm: [60, 62] },
  { size: "7-8 Years", short: "7–8Y", age: "7–8 years", weightKg: [23, 26], heightCm: [122, 128], chestCm: [62, 64] },
  { size: "8-10 Years", short: "8–10Y", age: "8–10 years", weightKg: [26, 33], heightCm: [128, 140], chestCm: [64, 68] },
  { size: "Small Size (0-1 yrs)", short: "S", age: "0–1 yr", weightKg: [3, 10], heightCm: [50, 76], chestCm: [38, 48], legacy: true },
  { size: "Medium Size (1-4 yrs)", short: "M", age: "1–4 yrs", weightKg: [10, 16], heightCm: [76, 103], chestCm: [48, 55], legacy: true },
  { size: "Large Size (4-6 yrs)", short: "L", age: "4–6 yrs", weightKg: [16, 21], heightCm: [103, 116], chestCm: [55, 60], legacy: true },
  { size: "XL Size (6-8 yrs)", short: "XL", age: "6–8 yrs", weightKg: [21, 26], heightCm: [116, 128], chestCm: [60, 64], legacy: true },
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
