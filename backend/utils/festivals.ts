/**
 * Festival presets for campaigns (Dashain, Tihar, Chhath, …).
 *
 * Festival dates follow the lunar / Bikram Sambat calendar and move every
 * year, so presets only supply the look and copy; admins pick the dates.
 * Served to the admin via GET /admin/campaigns/presets, and every campaign
 * response carries its resolved palette, so the web and mobile apps never
 * need their own copy of this file.
 */

export interface Palette {
  label: string;
  /** Banner / announcement-bar background */
  bg: string;
  /** Text on `bg` (≥ 4.5:1) */
  text: string;
  /** Badges and buttons */
  accent: string;
  /** Text on `accent` (≥ 4.5:1) */
  onAccent: string;
  /** Decoration only (never behind small text) */
  highlight: string;
}

// Curated so every text/background pair meets WCAG AA; admins pick one of
// these instead of free colours
export const PALETTES = {
  brand: { label: "Nevan rose", bg: "#f6ebe9", text: "#3d3230", accent: "#9e5f57", onAccent: "#ffffff", highlight: "#c1847b" },
  marigold: { label: "Marigold & maroon", bg: "#fff4dc", text: "#5a1a0f", accent: "#b3261e", onAccent: "#ffffff", highlight: "#f2a30f" },
  diyo: { label: "Diyo night", bg: "#2b1036", text: "#fff3d6", accent: "#f5b301", onAccent: "#2b1036", highlight: "#ff8a3d" },
  sindoor: { label: "Sindoor & sunrise", bg: "#fff1e6", text: "#6b1d00", accent: "#c2410c", onAccent: "#ffffff", highlight: "#f59e0b" },
  holi: { label: "Holi colours", bg: "#fdf2ff", text: "#3b0764", accent: "#a21caf", onAccent: "#ffffff", highlight: "#22c55e" },
  pine: { label: "Pine & berry", bg: "#0f3d2e", text: "#f3faf5", accent: "#c62828", onAccent: "#ffffff", highlight: "#f4c430" },
  himal: { label: "Himalayan blue", bg: "#e8f1fb", text: "#0b2545", accent: "#1d4ed8", onAccent: "#ffffff", highlight: "#93c5fd" },
  teej: { label: "Teej red", bg: "#ffe9ec", text: "#5b0a1a", accent: "#be123c", onAccent: "#ffffff", highlight: "#16a34a" },
} as const satisfies Record<string, Palette>;

export type PaletteKey = keyof typeof PALETTES;
export const PALETTE_KEYS = Object.keys(PALETTES) as PaletteKey[];

export interface FestivalPreset {
  label: string;
  emoji: string;
  palette: PaletteKey;
  name: string;
  headline: string;
  greeting: string;
  /** When it usually falls, to help admins plan */
  monthHint: string;
}

export const FESTIVALS = {
  dashain: {
    label: "Dashain",
    emoji: "🪁",
    palette: "marigold",
    name: "Dashain Sale",
    headline: "Dashain Sale",
    greeting: "Happy Bijaya Dashami 🙏",
    monthHint: "Asoj–Kartik (Sep–Oct)",
  },
  tihar: {
    label: "Tihar",
    emoji: "🪔",
    palette: "diyo",
    name: "Tihar Sale",
    headline: "Tihar Sale",
    greeting: "Shubha Deepawali — Happy Tihar!",
    monthHint: "Kartik (Oct–Nov)",
  },
  chhath: {
    label: "Chhath",
    emoji: "🌅",
    palette: "sindoor",
    name: "Chhath Special",
    headline: "Chhath Special",
    greeting: "Happy Chhath Parva",
    monthHint: "Kartik (Oct–Nov)",
  },
  holi: {
    label: "Holi",
    emoji: "🎨",
    palette: "holi",
    name: "Holi Colours Sale",
    headline: "Holi Colours Sale",
    greeting: "Happy Holi!",
    monthHint: "Falgun (Mar)",
  },
  christmas: {
    label: "Christmas",
    emoji: "🎄",
    palette: "pine",
    name: "Christmas Sale",
    headline: "Christmas Sale",
    greeting: "Merry Christmas!",
    monthHint: "25 December",
  },
  "new-year": {
    label: "New Year",
    emoji: "🎉",
    palette: "himal",
    name: "New Year Sale",
    headline: "New Year Sale",
    greeting: "Happy New Year!",
    monthHint: "1 January",
  },
  "nepali-new-year": {
    label: "Nepali New Year",
    emoji: "🌸",
    palette: "marigold",
    name: "Naya Barsha Sale",
    headline: "Naya Barsha Sale",
    greeting: "Naya Barsha ko Shubhakamana!",
    monthHint: "1 Baisakh (mid-April)",
  },
  teej: {
    label: "Teej",
    emoji: "💃",
    palette: "teej",
    name: "Teej Collection",
    headline: "Teej Collection",
    greeting: "Happy Teej!",
    monthHint: "Bhadra (Aug–Sep)",
  },
  lhosar: {
    label: "Lhosar",
    emoji: "🏔️",
    palette: "himal",
    name: "Lhosar Sale",
    headline: "Lhosar Sale",
    greeting: "Happy Lhosar — Tashi Delek!",
    monthHint: "Poush–Falgun (Dec–Mar)",
  },
  custom: {
    label: "Other event",
    emoji: "✨",
    palette: "brand",
    name: "Special Sale",
    headline: "Special Sale",
    greeting: "",
    monthHint: "Any time",
  },
} as const satisfies Record<string, FestivalPreset>;

export type FestivalKey = keyof typeof FESTIVALS;
export const FESTIVAL_KEYS = Object.keys(FESTIVALS) as FestivalKey[];

export const resolvePalette = (key: string | undefined): Palette =>
  PALETTES[(key as PaletteKey) in PALETTES ? (key as PaletteKey) : "brand"];
