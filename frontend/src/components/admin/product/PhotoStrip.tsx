/**
 * One group of product photos (every colour, or one colour): thumbnails in
 * display order with move, "main photo" and remove buttons (always visible,
 * so they work on touch screens), plus an add tile that accepts drops.
 * Changes are kept in the form until Save.
 */
import { useRef, useState, type DragEvent } from "react";
import { ChevronLeft, ChevronRight, ImagePlus, Star, Trash2 } from "lucide-react";
import { imageUrl } from "../../../utils/image";
import { ACCEPTED_TYPES, type PhotoItem } from "./editorState";

interface PhotoStripProps {
  /** e.g. "Dusty Rose" or "every colour", used in button labels */
  label: string;
  photos: PhotoItem[];
  primaryKey: string | null;
  onAdd: (files: File[]) => void;
  onRemove: (key: string) => void;
  onMove: (key: string, direction: -1 | 1) => void;
  onSetPrimary: (key: string) => void;
  /** Smaller tiles inside a colour card */
  compact?: boolean;
}

const iconButton =
  "w-7 h-7 rounded-full bg-[var(--color-surface)]/95 text-[var(--color-text)] shadow-[var(--shadow-sm)] flex items-center justify-center hover:text-[var(--color-primary)] disabled:opacity-35 disabled:pointer-events-none";

const PhotoStrip = ({ label, photos, primaryKey, onAdd, onRemove, onMove, onSetPrimary, compact = false }: PhotoStripProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const tile = compact ? "w-24 h-24 sm:w-28 sm:h-28" : "w-28 h-28 sm:w-32 sm:h-32";

  const onDrop = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length) onAdd(files);
  };

  return (
    <ul className="flex flex-wrap gap-3" aria-label={`Photos for ${label}`}>
      {photos.map((photo, index) => {
        const isPrimary = photo.key === primaryKey;
        return (
          <li key={photo.key} className={`relative ${tile} rounded-xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface-muted)]`}>
            <img
              src={photo.file ? photo.url : imageUrl(photo.url, 256)}
              alt={`${label} photo ${index + 1}`}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-1.5 left-1.5 flex flex-wrap gap-1">
              {isPrimary && (
                <span className="px-1.5 py-0.5 rounded-full bg-[var(--color-primary)] text-[var(--color-on-primary)] text-[10px] font-semibold">Main</span>
              )}
              {photo.file && (
                <span className="px-1.5 py-0.5 rounded-full bg-[var(--color-surface)]/95 text-[10px] font-semibold">New</span>
              )}
            </div>
            <div className="absolute inset-x-1.5 bottom-1.5 flex items-center justify-between gap-1">
              <button
                type="button"
                className={iconButton}
                onClick={() => onMove(photo.key, -1)}
                disabled={index === 0}
                aria-label={`Move ${label} photo ${index + 1} earlier`}
              >
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                className={`${iconButton} ${isPrimary ? "text-[var(--color-primary)]" : ""}`}
                onClick={() => onSetPrimary(photo.key)}
                aria-pressed={isPrimary}
                aria-label={isPrimary ? `${label} photo ${index + 1} is the main photo` : `Make ${label} photo ${index + 1} the main photo`}
              >
                <Star className={`w-3.5 h-3.5 ${isPrimary ? "fill-current" : ""}`} aria-hidden="true" />
              </button>
              <button
                type="button"
                className={`${iconButton} hover:text-[var(--color-error)]`}
                onClick={() => onRemove(photo.key)}
                aria-label={`Remove ${label} photo ${index + 1}`}
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                className={iconButton}
                onClick={() => onMove(photo.key, 1)}
                disabled={index === photos.length - 1}
                aria-label={`Move ${label} photo ${index + 1} later`}
              >
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </li>
        );
      })}
      <li>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`${tile} rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 text-xs text-center px-2 transition-colors ${
            dragging
              ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
              : "border-[var(--color-border-strong)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
          }`}
        >
          <ImagePlus className="w-5 h-5" aria-hidden="true" />
          <span>
            Add photos<span className="sr-only"> for {label}</span>
          </span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          multiple
          className="hidden"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            e.target.value = "";
            if (files.length) onAdd(files);
          }}
        />
      </li>
    </ul>
  );
};

export default PhotoStrip;
