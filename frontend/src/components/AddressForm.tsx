/**
 * AddressForm
 * Add/edit a saved delivery address (profile address book)
 */
import { useState, FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { DISTRICTS_BY_PROVINCE, PROVINCE_NAMES, NEPALI_MOBILE, normalizePhone } from "../utils/nepal";
import type { ISavedAddress, ISavedAddressInput } from "../types";

interface AddressFormProps {
  initial?: ISavedAddress | null;
  defaultName?: string;
  defaultPhone?: string;
  onSubmit: (address: ISavedAddressInput) => Promise<void>;
  onCancel: () => void;
}

type Field = "label" | "name" | "phone" | "street" | "city" | "district" | "province" | "landmark";

const AddressForm = ({ initial, defaultName = "", defaultPhone = "", onSubmit, onCancel }: AddressFormProps) => {
  const [form, setForm] = useState<Record<Field, string>>({
    label: initial?.label || "",
    name: initial?.name || defaultName,
    phone: initial?.phone || defaultPhone,
    street: initial?.street || "",
    city: initial?.city || "",
    district: initial?.district || "",
    province: String(initial?.province || 3),
    landmark: initial?.landmark || "",
  });
  const [isDefault, setIsDefault] = useState(!!initial?.isDefault);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const errors: Partial<Record<Field, string>> = {};
  if (!form.name.trim()) errors.name = "Enter the recipient's name";
  if (!NEPALI_MOBILE.test(normalizePhone(form.phone))) errors.phone = "Enter a 10-digit mobile number starting with 98 or 97";
  if (!form.street.trim()) errors.street = "Enter the street or tole";
  if (!form.city.trim()) errors.city = "Enter the city or municipality";
  if (!form.district) errors.district = "Choose a district";

  const set = (field: Field, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value, ...(field === "province" ? { district: "" } : {}) }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length) return;
    setSaving(true);
    try {
      await onSubmit({
        label: form.label.trim() || undefined,
        name: form.name.trim(),
        phone: normalizePhone(form.phone),
        street: form.street.trim(),
        city: form.city.trim(),
        district: form.district,
        province: parseInt(form.province, 10),
        landmark: form.landmark.trim() || undefined,
        isDefault,
      });
    } finally {
      setSaving(false);
    }
  };

  const input = (field: Field, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, span = false) => (
    <div className={span ? "sm:col-span-2" : ""}>
      <label htmlFor={`addr-${field}`} className="block text-sm font-medium mb-1">
        {label}
      </label>
      <input
        id={`addr-${field}`}
        value={form[field]}
        onChange={(e) => set(field, e.target.value)}
        aria-invalid={submitted && !!errors[field]}
        aria-describedby={submitted && errors[field] ? `addr-${field}-error` : undefined}
        className="input"
        {...props}
      />
      {submitted && errors[field] && (
        <p id={`addr-${field}-error`} className="text-xs text-[var(--color-error)] mt-1">
          {errors[field]}
        </p>
      )}
    </div>
  );

  const province = parseInt(form.province, 10);

  return (
    <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {input("label", "Label (optional)", { placeholder: "Home, Work, Grandma's…", maxLength: 30 }, true)}
      {input("name", "Recipient's full name", { autoComplete: "name" })}
      {input("phone", "Mobile number", { type: "tel", inputMode: "tel", autoComplete: "tel", placeholder: "98XXXXXXXX" })}
      <div>
        <label htmlFor="addr-province" className="block text-sm font-medium mb-1">
          Province
        </label>
        <select id="addr-province" value={form.province} onChange={(e) => set("province", e.target.value)} className="select">
          {Object.entries(PROVINCE_NAMES).map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="addr-district" className="block text-sm font-medium mb-1">
          District
        </label>
        <select
          id="addr-district"
          value={form.district}
          onChange={(e) => set("district", e.target.value)}
          className="select"
          aria-invalid={submitted && !!errors.district}
          aria-describedby={submitted && errors.district ? "addr-district-error" : undefined}
        >
          <option value="">Choose district</option>
          {(DISTRICTS_BY_PROVINCE[province] || []).map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        {submitted && errors.district && (
          <p id="addr-district-error" className="text-xs text-[var(--color-error)] mt-1">
            {errors.district}
          </p>
        )}
      </div>
      {input("city", "City / municipality", { autoComplete: "address-level2" })}
      {input("street", "Street, tole or ward", { autoComplete: "street-address" })}
      {input("landmark", "Landmark (optional)", {}, true)}
      <label className="sm:col-span-2 flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="w-4 h-4 accent-[var(--color-primary)]" />
        Use as my default delivery address
      </label>
      <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={saving} aria-busy={saving} className="btn btn-primary">
          {saving && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
          {initial ? "Save changes" : "Save address"}
        </button>
      </div>
    </form>
  );
};

export default AddressForm;
