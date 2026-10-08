/**
 * Recent real customer reviews (from /reviews/featured); nothing is shown
 * until there are some.
 */
import { Link } from "react-router-dom";
import { BadgeCheck, Quote, Star } from "lucide-react";
import type { FeaturedReview } from "../../api/contact";
import SectionHeader from "./SectionHeader";

const ReviewsSection = ({ reviews }: { reviews: FeaturedReview[] }) => {
  if (reviews.length === 0) return null;
  return (
    <section aria-labelledby="reviews-title" className="py-12 md:py-16 bg-[var(--color-surface-muted)]">
      <div className="container-app reveal">
        <SectionHeader id="reviews-title" eyebrow="Reviews" title="What parents are saying" subtitle="Recent reviews from our customers" />
        <ul className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {reviews.map((review) => (
            <li key={review._id}>
              <figure className="relative h-full flex flex-col rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] p-6 transition-shadow hover:shadow-[var(--shadow-md)]">
                <Quote className="absolute right-5 top-5 w-9 h-9 text-[var(--color-primary-soft)]" aria-hidden="true" />
                <div className="flex items-center gap-0.5 mb-4" role="img" aria-label={`${review.rating} out of 5 stars`}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      aria-hidden="true"
                      className={`w-4 h-4 ${star <= review.rating ? "fill-amber-400 text-amber-400" : "text-[var(--color-border-strong)]"}`}
                    />
                  ))}
                </div>
                <blockquote className="flex-1 leading-relaxed">
                  {review.title && <p className="font-semibold mb-1.5">{review.title}</p>}
                  <p className="text-[var(--color-text-muted)] line-clamp-6">{review.comment}</p>
                </blockquote>
                <figcaption className="mt-5 pt-5 border-t border-[var(--color-border)] flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="w-10 h-10 shrink-0 rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)] font-semibold flex items-center justify-center"
                  >
                    {review.reviewerName.trim().charAt(0).toUpperCase() || "?"}
                  </span>
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-x-1.5 font-semibold text-sm">
                      {review.reviewerName}
                      {review.isVerifiedPurchase && (
                        <span className="inline-flex items-center gap-0.5 text-xs font-medium text-[var(--color-success)]">
                          <BadgeCheck className="w-3.5 h-3.5" aria-hidden="true" />
                          Verified purchase
                        </span>
                      )}
                    </span>
                    {review.product && (
                      <Link
                        to={`/products/${review.product.slug}`}
                        className="block truncate text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
                      >
                        {review.product.name}
                      </Link>
                    )}
                  </span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default ReviewsSection;
