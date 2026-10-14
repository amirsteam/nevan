/**
 * A brand logo (Nevan Collection / Nevan Sprouts) standing in for a category
 * photo: shown whole (never cropped), round when the artwork is a circle.
 */
import type { BrandLogo } from "../utils/brandLogos";

interface BrandLogoImageProps {
  logo: BrandLogo;
  /** Rendered width, for picking the file (e.g. "(min-width: 768px) 20rem, 45vw") */
  sizes: string;
  /** Decorative when the category name is shown next to it */
  decorative?: boolean;
  className?: string;
  loading?: "lazy" | "eager";
}

const BrandLogoImage = ({ logo, sizes, decorative = true, className = "", loading = "lazy" }: BrandLogoImageProps) => (
  <img
    src={logo.src}
    srcSet={logo.srcSet}
    sizes={sizes}
    alt={decorative ? "" : logo.alt}
    loading={loading}
    decoding="async"
    className={`object-contain ${logo.round ? "rounded-full" : ""} ${className}`}
  />
);

export default BrandLogoImage;
