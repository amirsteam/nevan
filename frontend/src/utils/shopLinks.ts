/**
 * Shop entry points shared by the header menu, the mobile menu and the home
 * page's "Shop by age" section: age bands, boy/girl/unisex and "New in".
 */
import type { AgeGroup } from "../config/store";

// One band per size: Small, Medium, Large, XL
export const AGE_LABELS: Record<AgeGroup, string> = {
  "0-12 Months": "Baby",
  "1-3 Years": "Toddler",
  "3-5 Years": "Little kid",
  "5-7 Years": "Big kid",
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

/** "0-12 Months" -> ["0–12", "months"] */
export const splitAge = (age: string): [string, string] => {
  const [range, unit = ""] = age.split(" ");
  return [range.replace("-", "–"), unit.toLowerCase()];
};
