/**
 * Catches likely typos in common email domains ("gmial.com", "gmail.con") so
 * order updates and reset codes don't go to an address nobody reads.
 */
const COMMON_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "icloud.com",
  "live.com",
  "ymail.com",
];

const COMMON_TLDS = ["com", "net", "org", "com.np", "edu.np"];

// Levenshtein distance, with an early exit once it exceeds `max`
const distance = (a: string, b: string, max: number): number => {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
      rowMin = Math.min(rowMin, current[j]);
    }
    if (rowMin > max) return max + 1;
    previous = current;
  }
  return previous[b.length];
};

const closest = (value: string, options: string[], max: number): string | null => {
  let best: string | null = null;
  let bestDistance = max + 1;
  for (const option of options) {
    const d = distance(value, option, max);
    if (d < bestDistance) {
      best = option;
      bestDistance = d;
    }
  }
  return best;
};

/** A corrected address when the domain looks mistyped, otherwise null */
export const suggestEmail = (email: string): string | null => {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf("@");
  if (at < 1 || at === trimmed.length - 1) return null;

  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  if (COMMON_DOMAINS.includes(domain)) return null;

  // Whole domain close to a popular provider: gmial.com, gmail.con, gamil.com
  const provider = closest(domain, COMMON_DOMAINS, 2);
  if (provider) return `${local}@${provider}`;

  // Otherwise only fix an obviously broken ending: example.con → example.com
  const dot = domain.indexOf(".");
  if (dot < 1) return null;
  const name = domain.slice(0, dot);
  const tld = domain.slice(dot + 1);
  if (COMMON_TLDS.includes(tld)) return null;
  const fixedTld = closest(tld, COMMON_TLDS, 1);
  return fixedTld ? `${local}@${name}.${fixedTld}` : null;
};
