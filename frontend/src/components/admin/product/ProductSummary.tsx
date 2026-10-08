/**
 * Live summary beside the product editor: how the card will look in the
 * store, totals, and things worth fixing before saving.
 */
import { AlertTriangle, CheckCircle2, ImageOff } from "lucide-react";
import { formatPrice } from "../../../utils/helpers";
import { imageUrl } from "../../../utils/image";
import { derivedAgeGroups, summarize, type EditorState } from "./editorState";
import { Swatch } from "./ColorPicker";

const ProductSummary = ({ state }: { state: EditorState }) => {
  const summary = summarize(state);
  const primary = state.photos.find((p) => p.key === state.primaryKey) || state.photos[0];
  const ageGroups = derivedAgeGroups(state).length ? derivedAgeGroups(state) : state.details.ageGroups;

  const checks: { ok: boolean; text: string }[] = [
    { ok: summary.photos > 0, text: summary.photos > 0 ? `${summary.photos} photo${summary.photos === 1 ? "" : "s"}` : "No photos yet" },
  ];
  if (state.mode === "variants") {
    if (summary.colorsWithoutPhotos.length) {
      checks.push({ ok: false, text: `No photos for ${summary.colorsWithoutPhotos.join(", ")}` });
    }
    checks.push(
      summary.outOfStock.length
        ? { ok: false, text: `${summary.outOfStock.length} option${summary.outOfStock.length === 1 ? "" : "s"} out of stock` }
        : { ok: summary.options > 0, text: summary.options > 0 ? "Every option in stock" : "No options yet" },
    );
  } else if (summary.totalStock <= 0) {
    checks.push({ ok: false, text: "Out of stock" });
  }
  checks.push(
    ageGroups.length
      ? { ok: true, text: "Shows in Shop by age" }
      : { ok: false, text: "No age groups: won't show in Shop by age" },
  );

  const priceText =
    summary.minPrice == null
      ? "No price yet"
      : summary.maxPrice !== summary.minPrice
        ? `From ${formatPrice(summary.minPrice)}`
        : formatPrice(summary.minPrice);

  return (
    <section aria-labelledby="summary-heading" className="card p-4 space-y-4">
      <h3 id="summary-heading" className="font-semibold">
        Summary
      </h3>

      {/* Card preview */}
      <div className="flex gap-3">
        <div className="w-20 h-24 shrink-0 rounded-lg overflow-hidden bg-[var(--color-surface-muted)] flex items-center justify-center">
          {primary ? (
            <img src={primary.file ? primary.url : imageUrl(primary.url, 160)} alt="" className="w-full h-full object-cover" />
          ) : (
            <ImageOff className="w-6 h-6 text-[var(--color-text-muted)]" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0 text-sm">
          <p className="font-medium line-clamp-2">{state.details.name.trim() || "Product name"}</p>
          <p className="font-bold text-[var(--color-primary)] mt-1">{priceText}</p>
          {state.mode === "variants" && state.colors.length > 1 && (
            <p className="flex gap-1 mt-1.5" aria-label={`${state.colors.length} colours`}>
              {state.colors.slice(0, 6).map((c) => (
                <Swatch key={c.key} hex={c.hex} className="w-3.5 h-3.5" />
              ))}
            </p>
          )}
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-2 text-center">
        {[
          ["Options", String(summary.options)],
          ["In stock", String(summary.totalStock)],
          ["Photos", String(summary.photos)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg bg-[var(--color-surface-muted)] py-2">
            <dt className="text-xs text-[var(--color-text-muted)]">{label}</dt>
            <dd className="font-semibold">{value}</dd>
          </div>
        ))}
      </dl>

      <ul className="space-y-1.5 text-sm">
        {checks.map(({ ok, text }) => (
          <li key={text} className="flex items-start gap-2">
            {ok ? (
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-[var(--color-success)]" aria-hidden="true" />
            ) : (
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-[var(--color-warning)]" aria-hidden="true" />
            )}
            <span>{text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default ProductSummary;
