/**
 * Shop entry points shared by the header menu, the mobile menu and the home
 * page's "Shop by age" section: age bands, boy/girl/unisex and "New in".
 */
import type { AgeGroup } from "../config/store";

export const AGE_LABELS: Record<AgeGroup, string> = {
  "0-3 Months": "Newborn",
  "3-6 Months": "Infant",
  "6-12 Months": "Crawler",
  "1-2 Years": "Toddler",
  "2-4 Years": "Little kid",
  "4-6 Years": "Big kid",
  "6-10 Years": "Junior",
};

// The shop's gender filter also includes unisex items for boy/girl
export const GENDER_LINKS = [
  { value: "girl", label: "Girls" },
  { value: "boy", label: "Boys" },
  { value: "unisex", label: "Unisex" },
] as const;

export const ageLink = (age: string): string => `/products?age=${encodeURIComponent(age)}`;

export const genderLink = (gender: string): string => `/products?gender=${gender}`;

export const NEW_IN_PATH = "/products?sort=-createdAt";

/** "0-3 Months" -> ["0–3", "months"] */
export const splitAge = (age: string): [string, string] => {
  const [range, unit = ""] = age.split(" ");
  return [range.replace("-", "–"), unit.toLowerCase()];
};
