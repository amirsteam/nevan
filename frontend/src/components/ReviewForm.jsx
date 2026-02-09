/**
 * ReviewForm Component
 * Star rating + text review form for product reviews
 */
import { useState } from "react";
import { Star, Loader2, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import api from "../api/axios";

const ReviewForm = ({ productId, onReviewSubmitted }) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (rating === 0) {
      setError("Please select a star rating");
      return;
    }

    setLoading(true);
    try {
      await api.post(`/products/${productId}/reviews`, {
        rating,
        title: title.trim() || undefined,
        comment: comment.trim() || undefined,
      });
      toast.success("Review submitted! It will be visible after approval.");
      setRating(0);
      setTitle("");
      setComment("");
      if (onReviewSubmitted) onReviewSubmitted();
    } catch (err) {
      const message =
        err.response?.data?.message || "Failed to submit review";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 text-[var(--color-error)] rounded-lg text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Star Rating */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Your Rating <span className="text-[var(--color-error)]">*</span>
        </label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="p-0.5 transition-transform hover:scale-110"
            >
              <Star
                className={`w-7 h-7 transition-colors ${
                  star <= (hoverRating || rating)
                    ? "fill-amber-400 text-amber-400"
                    : "text-gray-300"
                }`}
              />
            </button>
          ))}
          {rating > 0 && (
            <span className="ml-2 text-sm text-[var(--color-text-muted)]">
              {
                ["", "Poor", "Fair", "Good", "Very Good", "Excellent"][
                  rating
                ]
              }
            </span>
          )}
        </div>
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Review Title{" "}
          <span className="text-[var(--color-text-muted)] font-normal">
            (optional)
          </span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Summarize your experience"
          maxLength={100}
          className="input"
        />
      </div>

      {/* Comment */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Your Review{" "}
          <span className="text-[var(--color-text-muted)] font-normal">
            (optional)
          </span>
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="What did you like or dislike about this product? How was the fabric quality?"
          maxLength={1000}
          rows={4}
          className="input resize-y min-h-[100px]"
        />
        <p className="text-xs text-[var(--color-text-muted)] mt-1 text-right">
          {comment.length}/1000
        </p>
      </div>

      <button
        type="submit"
        disabled={loading || rating === 0}
        className="btn btn-primary py-2.5 disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          "Submit Review"
        )}
      </button>
    </form>
  );
};

export default ReviewForm;
