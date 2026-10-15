/**
 * Is the shop answering right now (Nepal time)? Used by the contact page's
 * "Open now" badge. Hours come from OPENING_HOURS in shared/store.ts.
 */
import { OPENING_HOURS } from "../config/store";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Day of week (0 = Sunday) and fractional hour in Nepal, whatever the visitor's own time zone */
const nepalClock = (date: Date): { day: number; hour: number } => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kathmandu",
    weekday: "long",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return { day: WEEKDAYS.indexOf(get("weekday")), hour: Number(get("hour")) + Number(get("minute")) / 60 };
};

const formatHour = (hour: number): string => {
  const h = hour % 12 || 12;
  return `${h}${hour < 12 ? "am" : "pm"}`;
};

const isOpenDay = (day: number) => (OPENING_HOURS.days as readonly number[]).includes(day);

export interface OpenStatus {
  open: boolean;
  /** e.g. "Open now · until 7pm" or "Closed · opens Sunday at 10am" */
  label: string;
}

export const openStatus = (date: Date = new Date()): OpenStatus => {
  const { day, hour } = nepalClock(date);
  const { opensAt, closesAt } = OPENING_HOURS;

  if (isOpenDay(day) && hour >= opensAt && hour < closesAt) {
    return { open: true, label: `Open now · until ${formatHour(closesAt)}` };
  }
  if (isOpenDay(day) && hour < opensAt) {
    return { open: false, label: `Closed · opens today at ${formatHour(opensAt)}` };
  }
  // After hours or a day off: the next open day
  for (let ahead = 1; ahead <= 7; ahead++) {
    const next = (day + ahead) % 7;
    if (isOpenDay(next)) {
      const when = ahead === 1 ? "tomorrow" : WEEKDAYS[next];
      return { open: false, label: `Closed · opens ${when} at ${formatHour(opensAt)}` };
    }
  }
  return { open: false, label: "Closed" };
};
