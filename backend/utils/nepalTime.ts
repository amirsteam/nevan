/**
 * Nepal time (UTC+05:45 all year, no daylight saving) for day and month
 * boundaries: dashboard periods and the admin order date filter.
 */
export const NEPAL_OFFSET_MS = (5 * 60 + 45) * 60 * 1000;
export const DAY_MS = 24 * 60 * 60 * 1000;

/** Start of the Nepal day containing `at` */
export const nepalDayStart = (at: Date): Date => {
  const local = new Date(at.getTime() + NEPAL_OFFSET_MS);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() - NEPAL_OFFSET_MS);
};

/** Start of the Nepal (Gregorian) month containing `at`, `monthsBack` months earlier */
export const nepalMonthStart = (at: Date, monthsBack = 0): Date => {
  const local = new Date(at.getTime() + NEPAL_OFFSET_MS);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() - monthsBack, 1) - NEPAL_OFFSET_MS);
};

/** "2026-10-14" (a Nepal calendar date) -> the instant that day starts, or null */
export const nepalDateStart = (value: unknown): Date | null => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const time = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(time) ? new Date(time - NEPAL_OFFSET_MS) : null;
};
