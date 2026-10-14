/**
 * Admin Shipping
 * One flat fee per order: the Kathmandu Valley rate or the province's rate,
 * free from the threshold and in the free-delivery areas (e.g. the shop's own
 * district). Saved settings apply to orders placed from then on.
 */
import { FormEvent, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Trash2, Truck, MapPin, Info, Loader2 } from "lucide-react";
import { adminAPI } from "../../api";
import { LoadingRegion, Skeleton } from "../../components/ui";
import { usePageTitle } from "../../hooks/usePageTitle";
import { setShippingSettings } from "../../hooks/useShippingSettings";
import { DISTRICTS_BY_PROVINCE, PROVINCE_NAMES, formatNepalDateTime } from "../../utils/nepal";
import { formatPrice, getErrorMessage, VALLEY_DISTRICTS } from "../../utils/helpers";
import type { IShippingSettings } from "../../types";

const PROVINCES = Object.keys(PROVINCE_NAMES).map(Number);

interface FormState {
  freeShippingThreshold: string;
  valleyRate: string;
  provinceRates: Record<number, string>;
  freeAreas: { district: string; city: string }[];
}

const toForm = (s: IShippingSettings): FormState => ({
  freeShippingThreshold: String(s.freeShippingThreshold),
  valleyRate: String(s.valleyRate),
  provinceRates: Object.fromEntries(PROVINCES.map((p) => [p, String(s.provinceRates[p] ?? "")])),
  freeAreas: s.freeAreas.map((a) => ({ district: a.district, city: a.city || "" })),
});

const isAmount = (value: string) => /^\d+$/.test(value.trim());

const validate = (form: FormState): string | null => {
  if (!isAmount(form.freeShippingThreshold)) return "Enter the free-shipping threshold as a whole amount (0 or more).";
  if (!isAmount(form.valleyRate)) return "Enter the Kathmandu Valley rate as a whole amount (0 or more).";
  const missing = PROVINCES.find((p) => !isAmount(form.provinceRates[p] || ""));
  if (missing) return `Enter a rate for ${PROVINCE_NAMES[missing]} Province (0 or more).`;
  if (form.freeAreas.some((a) => !a.district)) return "Choose a district for each free-delivery area, or remove the empty row.";
  return null;
};

const amountInput = "input pl-12 tabular-nums";

const AmountField = ({ id, label, hint, value, onChange }: { id: string; label: string; hint?: string; value: string; onChange: (v: string) => void }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium mb-1">
      {label}
    </label>
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-text-muted)] pointer-events-none">NPR</span>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={0}
        step={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={amountInput}
        aria-describedby={hint ? `${id}-hint` : undefined}
      />
    </div>
    {hint && (
      <p id={`${id}-hint`} className="text-xs text-[var(--color-text-muted)] mt-1">
        {hint}
      </p>
    )}
  </div>
);

const ShippingSettings = () => {
  usePageTitle("Shipping");
  const [form, setForm] = useState<FormState | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminAPI
      .getShippingSettings()
      .then((res) => {
        setForm(toForm(res.data.data.settings));
        setUpdatedAt(res.data.data.settings.updatedAt ?? null);
      })
      .catch((error) => toast.error(getErrorMessage(error, "Could not load shipping settings")));
  }, []);

  const update = (changes: Partial<FormState>) => setForm((prev) => (prev ? { ...prev, ...changes } : prev));

  const setArea = (index: number, changes: Partial<FormState["freeAreas"][number]>) =>
    update({ freeAreas: form!.freeAreas.map((a, i) => (i === index ? { ...a, ...changes } : a)) });

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const problem = validate(form);
    if (problem) {
      toast.error(problem);
      return;
    }
    setSaving(true);
    try {
      const res = await adminAPI.updateShippingSettings({
        freeShippingThreshold: Number(form.freeShippingThreshold),
        valleyRate: Number(form.valleyRate),
        provinceRates: Object.fromEntries(PROVINCES.map((p) => [p, Number(form.provinceRates[p])])),
        freeAreas: form.freeAreas.map((a) => ({ district: a.district, ...(a.city.trim() ? { city: a.city.trim() } : {}) })),
      });
      const saved = res.data.data.settings;
      setForm(toForm(saved));
      setUpdatedAt(saved.updatedAt ?? null);
      setShippingSettings(saved);
      toast.success("Shipping settings saved");
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not save shipping settings"));
    } finally {
      setSaving(false);
    }
  };

  if (!form) {
    return (
      <LoadingRegion label="Loading shipping settings" className="space-y-4 max-w-3xl">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </LoadingRegion>
    );
  }

  return (
    <form onSubmit={save} className="space-y-6 max-w-3xl" noValidate>
      <div>
        <h1 className="text-2xl font-bold">Shipping</h1>
        <p className="text-[var(--color-text-muted)]">One flat fee per order, by where it's going. Changes apply to orders placed from now on.</p>
        {updatedAt && <p className="text-xs text-[var(--color-text-muted)] mt-1">Last saved {formatNepalDateTime(updatedAt)}</p>}
      </div>

      <section className="card p-5 space-y-4" aria-labelledby="free-threshold-title">
        <h2 id="free-threshold-title" className="flex items-center gap-2 font-semibold text-lg">
          <Truck className="w-5 h-5 text-[var(--color-primary)]" aria-hidden="true" />
          Free shipping
        </h2>
        <div className="max-w-xs">
          <AmountField
            id="free-threshold"
            label="Free on orders of at least"
            hint="Compared with the order subtotal after sale prices. Use 0 to ship every order free."
            value={form.freeShippingThreshold}
            onChange={(v) => update({ freeShippingThreshold: v })}
          />
        </div>
      </section>

      <section className="card p-5 space-y-4" aria-labelledby="rates-title">
        <div>
          <h2 id="rates-title" className="font-semibold text-lg">
            Rates below the threshold
          </h2>
          <p className="text-sm text-[var(--color-text-muted)]">The same fee for every order to a place, whatever its size.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <AmountField
            id="rate-valley"
            label="Kathmandu Valley"
            hint={VALLEY_DISTRICTS.join(", ")}
            value={form.valleyRate}
            onChange={(v) => update({ valleyRate: v })}
          />
          {PROVINCES.map((p) => (
            <AmountField
              key={p}
              id={`rate-${p}`}
              label={`${PROVINCE_NAMES[p]} Province`}
              hint={p === 3 ? "Outside the valley" : undefined}
              value={form.provinceRates[p] || ""}
              onChange={(v) => update({ provinceRates: { ...form.provinceRates, [p]: v } })}
            />
          ))}
        </div>
      </section>

      <section className="card p-5 space-y-4" aria-labelledby="free-areas-title">
        <div>
          <h2 id="free-areas-title" className="flex items-center gap-2 font-semibold text-lg">
            <MapPin className="w-5 h-5 text-[var(--color-primary)]" aria-hidden="true" />
            Free-delivery areas
          </h2>
          <p className="text-sm text-[var(--color-text-muted)]">
            Orders to these places ship free at any amount. Leave the town empty to include the whole district.
          </p>
        </div>

        {form.freeAreas.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)] italic">No free-delivery areas.</p>
        ) : (
          <ul className="space-y-3">
            {form.freeAreas.map((area, i) => (
              <li key={i} className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
                <div>
                  <label htmlFor={`area-district-${i}`} className="block text-xs font-medium mb-1">
                    District
                  </label>
                  <select
                    id={`area-district-${i}`}
                    value={area.district}
                    onChange={(e) => setArea(i, { district: e.target.value })}
                    className="input"
                  >
                    <option value="">Choose district</option>
                    {PROVINCES.map((p) => (
                      <optgroup key={p} label={PROVINCE_NAMES[p]}>
                        {DISTRICTS_BY_PROVINCE[p].map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div className="col-span-2 sm:col-span-1 row-start-2 sm:row-start-auto">
                  <label htmlFor={`area-city-${i}`} className="block text-xs font-medium mb-1">
                    Town <span className="font-normal text-[var(--color-text-muted)]">(optional)</span>
                  </label>
                  <input
                    id={`area-city-${i}`}
                    type="text"
                    value={area.city}
                    maxLength={100}
                    onChange={(e) => setArea(i, { city: e.target.value })}
                    placeholder="Whole district"
                    className="input"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => update({ freeAreas: form.freeAreas.filter((_, j) => j !== i) })}
                  className="p-2.5 rounded-lg text-[var(--color-error)] hover:bg-[var(--color-surface-muted)] row-start-1 col-start-2 sm:col-start-3"
                  aria-label={`Remove ${area.district || "this area"}${area.city ? ` (${area.city})` : ""}`}
                >
                  <Trash2 className="w-5 h-5" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={() => update({ freeAreas: [...form.freeAreas, { district: "", city: "" }] })}
          className="btn btn-secondary text-sm"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          Add area
        </button>

        <p className="flex items-start gap-2 text-xs text-[var(--color-text-muted)]">
          <Info className="w-4 h-4 shrink-0 mt-px" aria-hidden="true" />
          A town matches when the customer's city contains it as a word, e.g. "Panauti" matches "Panauti-7".
        </p>
      </section>

      <div className="flex items-center gap-3">
        <button type="submit" className="btn btn-primary" disabled={saving} aria-busy={saving}>
          {saving && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
          {saving ? "Saving…" : "Save shipping settings"}
        </button>
        <span className="text-sm text-[var(--color-text-muted)]">
          Example: an order under {formatPrice(Number(form.freeShippingThreshold) || 0)} to Kathmandu pays {formatPrice(Number(form.valleyRate) || 0)}.
        </span>
      </div>
    </form>
  );
};

export default ShippingSettings;
