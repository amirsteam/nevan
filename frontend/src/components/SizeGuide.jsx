/**
 * SizeGuide Component
 * Modal displaying baby clothing size chart with age-to-measurement mapping
 */
import { useState } from "react";
import { X, Ruler, Info } from "lucide-react";

const SIZE_DATA = [
  {
    size: "NB",
    label: "Newborn",
    age: "0–1 mo",
    weight: "2.5–4 kg",
    height: "45–55 cm",
    chest: "38–40 cm",
  },
  {
    size: "0-3M",
    label: "0–3 Months",
    age: "0–3 mo",
    weight: "3–6 kg",
    height: "55–62 cm",
    chest: "40–43 cm",
  },
  {
    size: "3-6M",
    label: "3–6 Months",
    age: "3–6 mo",
    weight: "5.5–8 kg",
    height: "62–68 cm",
    chest: "43–46 cm",
  },
  {
    size: "6-9M",
    label: "6–9 Months",
    age: "6–9 mo",
    weight: "7–9.5 kg",
    height: "68–74 cm",
    chest: "46–48 cm",
  },
  {
    size: "9-12M",
    label: "9–12 Months",
    age: "9–12 mo",
    weight: "9–11 kg",
    height: "74–80 cm",
    chest: "48–50 cm",
  },
  {
    size: "12-18M",
    label: "12–18 Months",
    age: "12–18 mo",
    weight: "10–12 kg",
    height: "80–86 cm",
    chest: "50–52 cm",
  },
  {
    size: "18-24M",
    label: "18–24 Months",
    age: "18–24 mo",
    weight: "11–13 kg",
    height: "86–92 cm",
    chest: "52–54 cm",
  },
  {
    size: "2-3Y",
    label: "2–3 Years",
    age: "2–3 yr",
    weight: "12–15 kg",
    height: "92–98 cm",
    chest: "54–56 cm",
  },
];

const SizeGuide = ({ isOpen, onClose, currentSize }) => {
  const [unit, setUnit] = useState("cm");

  if (!isOpen) return null;

  const convertToInches = (cmRange) => {
    return cmRange
      .split("–")
      .map((v) => (parseFloat(v) / 2.54).toFixed(1))
      .join("–");
  };

  const displayMeasurement = (value) => {
    if (unit === "in" && value.includes("cm")) {
      return convertToInches(value.replace(" cm", "")) + " in";
    }
    return value;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--color-surface)] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <Ruler className="w-5 h-5 text-[var(--color-primary)]" />
            <h2 className="text-lg font-semibold">Baby Size Guide</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--color-bg)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Unit Toggle */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <p className="text-sm text-[var(--color-text-muted)]">
            Find the right fit for your little one
          </p>
          <div className="flex rounded-lg border border-[var(--color-border)] overflow-hidden text-sm">
            <button
              onClick={() => setUnit("cm")}
              className={`px-3 py-1 transition-colors ${
                unit === "cm"
                  ? "bg-[var(--color-primary)] text-white"
                  : "hover:bg-[var(--color-bg)]"
              }`}
            >
              cm
            </button>
            <button
              onClick={() => setUnit("in")}
              className={`px-3 py-1 transition-colors ${
                unit === "in"
                  ? "bg-[var(--color-primary)] text-white"
                  : "hover:bg-[var(--color-bg)]"
              }`}
            >
              inches
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-auto px-5 pb-5" style={{ maxHeight: "60vh" }}>
          <table className="w-full text-sm mt-2">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="text-left py-3 px-2 font-semibold text-[var(--color-text-muted)] text-xs uppercase tracking-wider">
                  Size
                </th>
                <th className="text-left py-3 px-2 font-semibold text-[var(--color-text-muted)] text-xs uppercase tracking-wider">
                  Age
                </th>
                <th className="text-left py-3 px-2 font-semibold text-[var(--color-text-muted)] text-xs uppercase tracking-wider">
                  Weight
                </th>
                <th className="text-left py-3 px-2 font-semibold text-[var(--color-text-muted)] text-xs uppercase tracking-wider">
                  Height
                </th>
                <th className="text-left py-3 px-2 font-semibold text-[var(--color-text-muted)] text-xs uppercase tracking-wider">
                  Chest
                </th>
              </tr>
            </thead>
            <tbody>
              {SIZE_DATA.map((row) => (
                <tr
                  key={row.size}
                  className={`border-b border-[var(--color-border)] last:border-0 transition-colors ${
                    currentSize &&
                    row.size.toLowerCase() === currentSize.toLowerCase()
                      ? "bg-[var(--color-primary)]/5 font-medium"
                      : "hover:bg-[var(--color-bg)]"
                  }`}
                >
                  <td className="py-3 px-2">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        currentSize &&
                        row.size.toLowerCase() === currentSize.toLowerCase()
                          ? "bg-[var(--color-primary)] text-white"
                          : "bg-[var(--color-bg)]"
                      }`}
                    >
                      {row.size}
                    </span>
                  </td>
                  <td className="py-3 px-2">{row.age}</td>
                  <td className="py-3 px-2">{row.weight}</td>
                  <td className="py-3 px-2">
                    {displayMeasurement(row.height)}
                  </td>
                  <td className="py-3 px-2">
                    {displayMeasurement(row.chest)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Tips */}
        <div className="px-5 pb-5">
          <div className="flex items-start gap-2 p-3 bg-[var(--color-bg)] rounded-lg text-xs text-[var(--color-text-muted)]">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-[var(--color-text)] mb-1">
                How to measure your baby
              </p>
              <ul className="space-y-0.5">
                <li>
                  <strong>Height:</strong> Lay your baby flat and measure head to
                  toe.
                </li>
                <li>
                  <strong>Chest:</strong> Measure around the fullest part of the
                  chest.
                </li>
                <li>
                  <strong>Tip:</strong> When between sizes, choose the larger
                  size for comfort.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SizeGuide;
