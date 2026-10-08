/**
 * "Shop by age" cards (one per age band, linking to the filtered shop) and
 * shortcuts for the boy/girl/unisex filter.
 */
import { Link } from "react-router-dom";
import { AGE_GROUPS, type AgeGroup } from "../../config/store";
import SectionHeader from "./SectionHeader";

const AGE_LABELS: Record<AgeGroup, string> = {
  "0-3 Months": "Newborn",
  "3-6 Months": "Infant",
  "6-12 Months": "Crawler",
  "1-2 Years": "Toddler",
  "2-4 Years": "Little kid",
  "4-6 Years": "Big kid",
  "6-10 Years": "Junior",
};

// The shop's gender filter also includes unisex items for boy/girl
const GENDER_LINKS = [
  { value: "girl", label: "Girls" },
  { value: "boy", label: "Boys" },
  { value: "unisex", label: "Unisex" },
];

/** "0-3 Months" -> ["0–3", "months"] */
const splitAge = (age: string): [string, string] => {
  const [range, unit = ""] = age.split(" ");
  return [range.replace("-", "–"), unit.toLowerCase()];
};

const ShopByAge = () => (
  <section id="shop-by-age" aria-labelledby="shop-by-age-title" className="py-12 md:py-16 scroll-mt-20">
    {/* No .reveal: this sits at the fold and would load half-faded */}
    <div className="container-app">
      <SectionHeader id="shop-by-age-title" title="Shop by age" subtitle="Find the right fit for your growing baby" />
      <ul className="flex md:grid md:grid-cols-4 lg:grid-cols-7 gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-none py-1 -mx-4 px-4 scroll-px-4 sm:-mx-5 sm:px-5 sm:scroll-px-5 md:mx-0 md:px-0 md:overflow-visible">
        {AGE_GROUPS.map((age, i) => {
          const [range, unit] = splitAge(age);
          // Alternate the two brand text colours (both AA on the surface)
          const tone = i % 2 === 0 ? "var(--color-primary)" : "var(--color-accent-strong)";
          return (
            <li key={age} className="snap-start shrink-0 w-[38%] sm:w-[28%] md:w-auto">
              <Link
                to={`/products?age=${encodeURIComponent(age)}`}
                className="group flex flex-col items-center text-center h-full px-3 pt-5 pb-4 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--color-primary)] hover:shadow-[var(--shadow-md)]"
              >
                <span className="font-display text-3xl md:text-4xl font-bold leading-none" style={{ color: tone }}>
                  {range}
                </span>
                <span className="mt-1 text-xs uppercase tracking-wider text-[var(--color-text-muted)]">{unit}</span>
                <span className="mt-3 font-semibold text-sm group-hover:text-[var(--color-primary)] transition-colors">
                  {AGE_LABELS[age]}
                </span>
                {/* Grows with each band: a hint of "your baby grows with us" */}
                <span aria-hidden="true" className="mt-3 block w-full max-w-[5rem] h-1 rounded-full bg-[var(--color-surface-muted)] overflow-hidden">
                  <span
                    className="block h-full rounded-full"
                    style={{ width: `${((i + 1) / AGE_GROUPS.length) * 100}%`, backgroundColor: tone }}
                  />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <nav aria-label="Shop by gender" className="mt-6 flex flex-wrap items-center gap-2">
        <span className="text-sm text-[var(--color-text-muted)] mr-1">Shopping for</span>
        {GENDER_LINKS.map(({ value, label }) => (
          <Link
            key={value}
            to={`/products?gender=${value}`}
            className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
          >
            {label}
          </Link>
        ))}
      </nav>
    </div>
  </section>
);

export default ShopByAge;
