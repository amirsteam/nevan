/**
 * "Shop by category" tiles. With five or more categories the first one is a
 * large feature tile (bento layout on desktop); fewer get an even grid.
 */
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import type { ICategory } from "../../types";
import { imageUrl, imageSrcSet, onImageError } from "../../utils/image";
import { LoadingRegion, Skeleton } from "../ui/Skeleton";
import SectionHeader from "./SectionHeader";

const MAX_TILES = 5;
const FEATURE_IMAGE_WIDTH = 720;
const TILE_IMAGE_WIDTH = 400;

// Static class names so Tailwind can see them
const EVEN_COLUMNS: Record<number, string> = {
  1: "md:grid-cols-1",
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-4",
};

/** Tile shape: few categories get wider tiles so one or two don't tower over the page */
const tileAspect = (count: number, feature: boolean, bento: boolean): string => {
  // The bento feature tile fills two grid rows on desktop, so it has no ratio of its own there
  if (bento) return feature ? "aspect-[16/10] lg:aspect-auto lg:h-full" : "aspect-[4/3]";
  if (count === 1) return "aspect-[16/10] md:aspect-[21/9]";
  if (count === 2) return "aspect-[4/3] md:aspect-[16/10]";
  return feature ? "aspect-[16/10] md:aspect-[4/3]" : "aspect-[4/3]";
};

interface CategoryShowcaseProps {
  categories: ICategory[];
  loading?: boolean;
}

const CategoryTile = ({ category, feature, className }: { category: ICategory; feature: boolean; className: string }) => {
  const url = category.image?.url;
  const width = feature ? FEATURE_IMAGE_WIDTH : TILE_IMAGE_WIDTH;
  return (
    <Link
      to={`/products?category=${category.slug}`}
      className={`group relative block overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--color-primary-soft)] to-[var(--color-accent-light)] ${className}`}
    >
      {url ? (
        <img
          src={imageUrl(url, width)}
          srcSet={imageSrcSet(url, width)}
          alt=""
          loading="lazy"
          decoding="async"
          onError={onImageError}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center font-display text-8xl text-[var(--color-primary)] opacity-20">
          {category.name.charAt(0)}
        </span>
      )}
      <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
      <span className={`absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 text-white ${feature ? "p-5 md:p-7" : "p-3 md:p-4"}`}>
        <span className="min-w-0">
          <span className={`block font-display font-semibold leading-tight ${feature ? "text-2xl md:text-3xl" : "md:text-lg"}`}>
            {category.name}
          </span>
          {feature && category.description && (
            <span className="hidden sm:block mt-1 text-sm text-white/85 line-clamp-2 max-w-md">{category.description}</span>
          )}
          {!!category.productCount && (
            <span className="block mt-0.5 text-xs md:text-sm text-white/80">
              {category.productCount} {category.productCount === 1 ? "product" : "products"}
            </span>
          )}
        </span>
        <span
          aria-hidden="true"
          className={`shrink-0 rounded-full bg-white/90 text-neutral-800 items-center justify-center transition duration-300 group-hover:translate-x-0.5 ${
            feature ? "flex w-11 h-11" : "hidden md:flex w-8 h-8 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
          }`}
        >
          <ArrowRight className={feature ? "w-5 h-5" : "w-4 h-4"} />
        </span>
      </span>
    </Link>
  );
};

const CategoryShowcase = ({ categories, loading = false }: CategoryShowcaseProps) => {
  if (!loading && categories.length === 0) return null;
  const tiles = categories.slice(0, MAX_TILES);
  const bento = tiles.length >= MAX_TILES;
  // Odd counts on the two-column phone grid: the first tile spans both columns
  const featureFirst = bento || tiles.length % 2 === 1;

  return (
    <section aria-labelledby="categories-title" className="py-12 md:py-16">
      <div className="container-app reveal">
        <SectionHeader
          id="categories-title"
          title="Shop by category"
          subtitle="Find the perfect outfit for your little one"
          action={{ to: "/categories", label: "All categories" }}
        />
        {loading ? (
          <LoadingRegion label="Loading categories" className="grid grid-cols-2 lg:grid-cols-4 lg:grid-rows-2 gap-3 md:gap-5">
            <Skeleton className="col-span-2 lg:row-span-2 aspect-[16/10] lg:aspect-auto rounded-2xl" />
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[4/3] rounded-2xl" />
            ))}
          </LoadingRegion>
        ) : (
          <ul
            className={`grid grid-cols-2 gap-3 md:gap-5 ${
              bento ? "lg:grid-cols-4 lg:grid-rows-2" : EVEN_COLUMNS[tiles.length] || ""
            }`}
          >
            {tiles.map((category, i) => {
              const feature = featureFirst && i === 0;
              return (
                <li key={category._id} className={feature ? `col-span-2 ${bento ? "lg:row-span-2" : "md:col-span-1"}` : ""}>
                  <CategoryTile
                    category={category}
                    feature={feature && bento}
                    className={`h-full w-full ${tileAspect(tiles.length, feature, bento)}`}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
};

export default CategoryShowcase;
