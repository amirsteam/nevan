/**
 * ImageLightbox
 * Full-screen image viewer: arrow keys / swipe to move, Escape to close,
 * focus trapped by Modal.
 */
import { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Modal from "./ui/Modal";
import { imageUrl, onImageError } from "../utils/image";

interface ImageLightboxProps {
  images: { url: string; alt?: string }[];
  index: number;
  isOpen: boolean;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  title: string;
}

const ImageLightbox = ({ images, index, isOpen, onClose, onIndexChange, title }: ImageLightboxProps) => {
  const touchStart = useRef<number | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const count = images.length;
  const go = (delta: number) => {
    setZoomed(false);
    onIndexChange((index + delta + count) % count);
  };

  useEffect(() => {
    if (!isOpen || count < 2) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") onIndexChange((index + 1) % count);
      if (e.key === "ArrowLeft") onIndexChange((index - 1 + count) % count);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, index, count, onIndexChange]);

  const current = images[index];
  if (!current) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={count > 1 ? `${title} — image ${index + 1} of ${count}` : title}
      size="full"
      bodyClassName="p-0"
      className="sm:max-w-5xl bg-[var(--color-bg)]"
    >
      <div
        className="relative flex items-center justify-center bg-[var(--color-surface-muted)] h-[70vh] overflow-hidden select-none"
        onTouchStart={(e) => (touchStart.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchStart.current === null || count < 2) return;
          const dx = e.changedTouches[0].clientX - touchStart.current;
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
          touchStart.current = null;
        }}
      >
        <button
          type="button"
          onClick={() => setZoomed((z) => !z)}
          className={`w-full h-full flex items-center justify-center ${zoomed ? "cursor-zoom-out" : "cursor-zoom-in"}`}
          aria-label={zoomed ? "Zoom out" : "Zoom in"}
        >
          <img
            src={imageUrl(current.url, 1400)}
            alt={current.alt || title}
            onError={onImageError}
            className={`max-h-full max-w-full object-contain transition-transform duration-300 ${zoomed ? "scale-[1.8]" : ""}`}
          />
        </button>

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-[var(--color-surface)]/90 shadow-[var(--shadow-md)] flex items-center justify-center"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-5 h-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-[var(--color-surface)]/90 shadow-[var(--shadow-md)] flex items-center justify-center"
              aria-label="Next image"
            >
              <ChevronRight className="w-5 h-5" aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="flex gap-2 overflow-x-auto p-3 justify-center">
          {images.map((img, i) => (
            <button
              key={img.url + i}
              type="button"
              onClick={() => onIndexChange(i)}
              aria-label={`Show image ${i + 1}`}
              aria-current={i === index ? "true" : undefined}
              className={`w-16 h-16 shrink-0 rounded-lg overflow-hidden border-2 ${
                i === index ? "border-[var(--color-primary)]" : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              <img src={imageUrl(img.url, 96)} alt="" loading="lazy" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
};

export default ImageLightbox;
