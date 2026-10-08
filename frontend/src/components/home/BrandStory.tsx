/**
 * Short brand story on the home page (the full version is /about): who makes
 * the clothes and why, which matters for a small handmade shop.
 */
import { Link } from "react-router-dom";
import { ArrowRight, Baby, Heart, Leaf, MapPin } from "lucide-react";
import { CONTACT } from "../../config/store";
// Cropped and resized from founder.jpg (the About page uses the original)
import founder480 from "../../assets/founder-480.jpg";
import founder960 from "../../assets/founder-960.jpg";

const VALUES = [
  { icon: Heart, title: "Handmade with care", text: "Crafted slowly, with warmth, patience and intention." },
  { icon: Leaf, title: "Soft, baby-friendly fabrics", text: "Gentle, safe materials chosen for comfort first." },
  { icon: Baby, title: "For moms, by moms", text: "We know the little details that matter, because we're moms too." },
];

const BrandStory = () => (
  <section aria-labelledby="brand-story-title" className="py-14 md:py-20 bg-[var(--color-surface-muted)] overflow-clip">
    <div className="container-app reveal grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] gap-10 lg:gap-16 items-center">
      <div className="relative w-full max-w-sm sm:max-w-md mx-auto">
        {/* Offset frame, decoration only */}
        <span aria-hidden="true" className="absolute inset-0 translate-x-3 translate-y-3 md:translate-x-5 md:translate-y-5 rounded-[2rem] bg-[var(--color-brand)]/20" />
        <img
          src={founder480}
          srcSet={`${founder480} 480w, ${founder960} 960w`}
          sizes="(min-width: 640px) 28rem, 90vw"
          alt="The founder of Nevan Handicraft"
          width={480}
          height={640}
          loading="lazy"
          decoding="async"
          className="relative w-full aspect-[3/4] object-cover rounded-[2rem] shadow-[var(--shadow-lg)]"
        />
        <p className="absolute left-4 -bottom-5 md:-left-6 inline-flex items-center gap-2 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] px-4 py-2 text-sm font-medium shadow-[var(--shadow-md)]">
          <MapPin className="w-4 h-4 text-[var(--color-primary)]" aria-hidden="true" />
          Handmade in {CONTACT.address.replace(/, Nepal$/, "")}
        </p>
      </div>

      <div className="max-w-xl mx-auto lg:mx-0 pt-4 lg:pt-0">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)] mb-2">Our story</p>
        <h2 id="brand-story-title" className="text-3xl md:text-4xl font-bold leading-tight mb-5">
          A mother's love, stitched into every piece
        </h2>
        <p className="text-[var(--color-text-muted)] md:text-lg leading-relaxed">
          Nevan began during the Covid years with reusable, handmade cloth masks. When motherhood came along, so did a new
          idea: baby clothes made the way a mother would want them — soft, comfortable and made by hand.
        </p>

        <ul className="mt-7 grid sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3 gap-4">
          {VALUES.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex sm:flex-col lg:flex-row xl:flex-col gap-3">
              <span className="w-10 h-10 shrink-0 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center">
                <Icon className="w-5 h-5 text-[var(--color-primary)]" aria-hidden="true" />
              </span>
              <span>
                <span className="block font-semibold text-sm">{title}</span>
                <span className="block text-sm text-[var(--color-text-muted)]">{text}</span>
              </span>
            </li>
          ))}
        </ul>

        <Link to="/about" className="btn btn-secondary bg-[var(--color-surface)] mt-8 px-6 py-3">
          Read our story
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  </section>
);

export default BrandStory;
