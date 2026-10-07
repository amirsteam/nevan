/**
 * Nepal's provinces and their 77 districts (checkout and address book).
 * Picking from a list keeps district names consistent, which matters because
 * the Kathmandu Valley shipping rate is matched on the district name.
 */
export const DISTRICTS_BY_PROVINCE: Record<number, string[]> = {
  1: ["Bhojpur", "Dhankuta", "Ilam", "Jhapa", "Khotang", "Morang", "Okhaldhunga", "Panchthar", "Sankhuwasabha", "Solukhumbu", "Sunsari", "Taplejung", "Terhathum", "Udayapur"],
  2: ["Bara", "Dhanusha", "Mahottari", "Parsa", "Rautahat", "Saptari", "Sarlahi", "Siraha"],
  3: ["Bhaktapur", "Chitwan", "Dhading", "Dolakha", "Kathmandu", "Kavrepalanchok", "Lalitpur", "Makwanpur", "Nuwakot", "Ramechhap", "Rasuwa", "Sindhuli", "Sindhupalchok"],
  4: ["Baglung", "Gorkha", "Kaski", "Lamjung", "Manang", "Mustang", "Myagdi", "Nawalpur", "Parbat", "Syangja", "Tanahun"],
  5: ["Arghakhanchi", "Banke", "Bardiya", "Dang", "Gulmi", "Kapilvastu", "Palpa", "Parasi", "Pyuthan", "Rolpa", "Rukum East", "Rupandehi"],
  6: ["Dailekh", "Dolpa", "Humla", "Jajarkot", "Jumla", "Kalikot", "Mugu", "Rukum West", "Salyan", "Surkhet"],
  7: ["Achham", "Baitadi", "Bajhang", "Bajura", "Dadeldhura", "Darchula", "Doti", "Kailali", "Kanchanpur"],
};

export const PROVINCE_NAMES: Record<number, string> = {
  1: "Koshi",
  2: "Madhesh",
  3: "Bagmati",
  4: "Gandaki",
  5: "Lumbini",
  6: "Karnali",
  7: "Sudurpashchim",
};

/** Mobile numbers: 98/97 + 8 digits, optionally prefixed with +977 */
export const NEPALI_MOBILE = /^(\+?977)?9[78]\d{8}$/;

export const normalizePhone = (phone: string): string => phone.replace(/[\s-]/g, "");

// Nepal time is UTC+05:45 all year (no daylight saving), so admin date/time
// inputs can be converted exactly without a timezone library
const NEPAL_OFFSET_MS = (5 * 60 + 45) * 60 * 1000;

/** ISO instant -> "YYYY-MM-DDTHH:mm" in Nepal time (for datetime-local inputs) */
export const toNepalInput = (iso: string | Date | null | undefined): string => {
  if (!iso) return "";
  const time = new Date(iso).getTime();
  return Number.isFinite(time) ? new Date(time + NEPAL_OFFSET_MS).toISOString().slice(0, 16) : "";
};

/** "YYYY-MM-DDTHH:mm" entered as Nepal time -> ISO instant */
export const fromNepalInput = (value: string): string => {
  const time = Date.parse(`${value}:00Z`);
  return Number.isFinite(time) ? new Date(time - NEPAL_OFFSET_MS).toISOString() : "";
};

/** "20 Oct 2026, 6:00 am" in Nepal time */
export const formatNepalDateTime = (iso: string | Date): string =>
  new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kathmandu",
  });
