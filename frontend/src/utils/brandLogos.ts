/**
 * The two Nevan brands are also the top-level categories. Their logos stand
 * in for a category photo wherever a category is shown (until an admin
 * uploads a photo, which always wins). Matched by slug, or by name if an admin
 * renamed the slug.
 */
import collection160 from "../assets/brands/nevan-collection-160.jpg";
import collection320 from "../assets/brands/nevan-collection-320.jpg";
import collection640 from "../assets/brands/nevan-collection-640.jpg";
import sprouts160 from "../assets/brands/nevan-sprouts-160.jpg";
import sprouts320 from "../assets/brands/nevan-sprouts-320.jpg";
import sprouts640 from "../assets/brands/nevan-sprouts-640.jpg";
import type { ICategory } from "../types";

export interface BrandLogo {
  /** Smallest file; `srcSet` lets the browser pick a larger one */
  src: string;
  srcSet: string;
  alt: string;
  /** Background the logo sits on (its own paper colour), so it fills a tile seamlessly */
  background: string;
  /** The artwork is a circle: show it round so its white corners disappear */
  round: boolean;
}

const LOGOS: Record<string, BrandLogo> = {
  "nevan-collection": {
    src: collection320,
    srcSet: `${collection160} 160w, ${collection320} 320w, ${collection640} 640w`,
    alt: "Nevan Collection logo",
    background: "#f9e6d7",
    round: true,
  },
  "nevan-sprouts": {
    src: sprouts320,
    srcSet: `${sprouts160} 160w, ${sprouts320} 320w, ${sprouts640} 640w`,
    alt: "Nevan Sprouts logo",
    background: "#ffffff",
    round: false,
  },
};

const toKey = (value: string): string => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** The brand logo for a category (Nevan Collection / Nevan Sprouts), if it is one */
export const brandLogoFor = (category: Pick<ICategory, "slug" | "name">): BrandLogo | null =>
  LOGOS[toKey(category.slug || "")] ?? LOGOS[toKey(category.name || "")] ?? null;
