/**
 * Mobile design tokens, aligned with the web tokens in
 * frontend/src/index.css so the app and the website look like one brand.
 *
 * `primary` is the text-safe dusty rose (white text on it meets WCAG AA);
 * `brand` is the lighter original rose for decoration only, never small text.
 */
export const colors = {
  brand: "#c1847b",
  primary: "#9e5f57",
  primaryDark: "#864d46",
  primaryLight: "#d9a9a3",
  primarySoft: "#f6ebe9",
  onPrimary: "#ffffff",

  accent: "#8fae8b",
  accentStrong: "#4d6b49",

  bg: "#fdf9f7",
  surface: "#ffffff",
  surfaceMuted: "#f7f0ed",
  text: "#3d3230",
  textMuted: "#6f625f",
  border: "#ede5e2",
  borderStrong: "#d8ccc8",
  overlay: "rgba(28, 21, 20, 0.5)",

  success: "#047857",
  warning: "#b45309",
  error: "#dc2626",
  info: "#2563eb",
  whatsapp: "#25D366",
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

export default { colors, spacing, radius };
