/**
 * Image URLs sized for the screen. Product images are Cloudinary uploads;
 * inserting a transformation serves WebP/AVIF at a sensible width and quality
 * instead of the full-size original (important on 3G/4G).
 */
const CLOUDINARY_UPLOAD = /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.*)$/;

export const PLACEHOLDER_IMAGE = "/placeholder.svg";

/** Cloudinary URL resized to `width` CSS px (auto format/quality); other URLs unchanged */
export const imageUrl = (url: string | null | undefined, width?: number): string => {
  if (!url) return PLACEHOLDER_IMAGE;
  const match = url.match(CLOUDINARY_UPLOAD);
  if (!match) return url;
  const [, prefix, rest] = match;
  // Already transformed (e.g. by the admin uploader): leave it alone
  if (/^(?:[a-z]{1,3}_[^/,]+,?)+\//.test(rest)) return url;
  const transform = ["f_auto", "q_auto", "c_limit", width ? `w_${Math.round(width)}` : null]
    .filter(Boolean)
    .join(",");
  return `${prefix}${transform}/${rest}`;
};

/** srcSet with 1x/2x widths for Cloudinary images; undefined for other URLs */
export const imageSrcSet = (url: string | null | undefined, width: number): string | undefined => {
  if (!url || !CLOUDINARY_UPLOAD.test(url)) return undefined;
  return `${imageUrl(url, width)} 1x, ${imageUrl(url, width * 2)} 2x`;
};

/**
 * srcSet with width descriptors for Cloudinary images (pair with `sizes`, so
 * the browser picks a file for the layout); undefined for other URLs
 */
export const imageWidthSrcSet = (url: string | null | undefined, widths: number[]): string | undefined => {
  if (!url || !CLOUDINARY_UPLOAD.test(url)) return undefined;
  return widths.map((w) => `${imageUrl(url, w)} ${w}w`).join(", ");
};

/** Swap a broken image for the placeholder once */
export const onImageError = (event: React.SyntheticEvent<HTMLImageElement>): void => {
  const img = event.currentTarget;
  if (!img.src.endsWith(PLACEHOLDER_IMAGE)) {
    img.srcset = "";
    img.src = PLACEHOLDER_IMAGE;
  }
};
