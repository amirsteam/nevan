/**
 * Small category picture for lists and menus: the uploaded photo, else the
 * brand logo (Nevan Collection / Nevan Sprouts), else `fallback`.
 */
import type { ReactNode } from "react";
import type { ICategory } from "../types";
import { imageUrl, imageSrcSet } from "../utils/image";
import { brandLogoFor } from "../utils/brandLogos";
import BrandLogoImage from "./BrandLogoImage";

interface CategoryThumbProps {
  category: Pick<ICategory, "slug" | "name" | "image">;
  /** Square size in px */
  size?: number;
  fallback?: ReactNode;
}

const CategoryThumb = ({ category, size = 32, fallback = null }: CategoryThumbProps) => {
  const url = category.image?.url;
  const box = { width: size, height: size };
  if (url) {
    return (
      <img
        src={imageUrl(url, size)}
        srcSet={imageSrcSet(url, size)}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        className="shrink-0 rounded-lg object-cover"
        style={box}
      />
    );
  }
  const logo = brandLogoFor(category);
  if (!logo) return <>{fallback}</>;
  return (
    <span
      aria-hidden="true"
      className={`shrink-0 overflow-hidden border border-[var(--color-border)] ${logo.round ? "rounded-full" : "rounded-lg"}`}
      style={{ ...box, backgroundColor: logo.background }}
    >
      <BrandLogoImage logo={logo} sizes={`${size}px`} className="w-full h-full" />
    </span>
  );
};

export default CategoryThumb;
