/**
 * Where a website visit came from, on which kind of device, and whether it is a
 * bot. Pure functions used when visit events are recorded (analyticsService).
 *
 * Facebook and Instagram are where the shop sells most, and their in-app
 * browsers often send no referrer, so their user agents (FBAN/FBAV/FB_IAB,
 * Instagram) and click ids (fbclid, igshid) also count as those sources.
 */
import type { VisitDevice, VisitSource } from "../models/VisitSession";

export interface VisitContext {
  /** document.referrer of the first page of the visit */
  referrer?: string;
  utm?: { source?: string; medium?: string; campaign?: string };
  /** Click ids found on the landing page (fbclid, igshid, gclid) */
  clickIds?: string[];
  userAgent?: string;
}

// Crawlers, link previews (WhatsApp/Facebook fetch pages to show cards), monitors and scripts
const BOT_PATTERN =
  /bot|crawl|spider|slurp|facebookexternalhit|facebookcatalog|whatsapp\/|headless|lighthouse|pagespeed|preview|python|curl|wget|axios|node-fetch|go-http|java\/|monitor|pingdom|uptime/i;

export const isBot = (userAgent = ""): boolean => !userAgent || BOT_PATTERN.test(userAgent);

export const classifyDevice = (userAgent = ""): VisitDevice => {
  if (/iPad|Tablet|PlayBook|Silk|Kindle|Android(?!.*Mobile)/i.test(userAgent)) return "tablet";
  if (/Mobi|iPhone|iPod|Android|Windows Phone|Opera Mini/i.test(userAgent)) return "mobile";
  return "desktop";
};

/** Our own hosts: a visit referred from the shop itself is a return, not a referral */
const OWN_HOSTS = /(^|\.)nevanhandicraft\.com\.np$|^localhost$|^127\.0\.0\.1$/i;

const hostOf = (url?: string): string | undefined => {
  if (!url) return undefined;
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return undefined;
  }
};

/** A utm_source value or a referrer host -> one of the named sources, if it is one */
const namedSource = (value: string): VisitSource | undefined => {
  const v = value.toLowerCase();
  if (/(^|\.)(facebook\.com|fb\.com|fb\.me|messenger\.com)$|^(facebook|fb|messenger)$/.test(v)) return "Facebook";
  if (/(^|\.)instagram\.com$|^(instagram|ig)$/.test(v)) return "Instagram";
  if (/(^|\.)google\.[a-z.]+$|^google$/.test(v)) return "Google";
  if (/(^|\.)(whatsapp\.com|wa\.me)$|^(whatsapp|wa)$/.test(v)) return "WhatsApp";
  if (/(^|\.)tiktok\.com$|^tiktok$/.test(v)) return "TikTok";
  if (/(^|\.)(bing\.com|duckduckgo\.com|yahoo\.com|yandex\.[a-z]+|baidu\.com|ecosia\.org)$/.test(v)) return "Other search";
  return undefined;
};

export const classifySource = ({
  referrer,
  utm,
  clickIds = [],
  userAgent = "",
}: VisitContext): { source: VisitSource; referrerHost?: string } => {
  // Tagged links win: the shop decides what utm_source its posts carry
  if (utm?.source) return { source: namedSource(utm.source) ?? "Other sites" };
  if (clickIds.includes("fbclid")) return { source: /Instagram/i.test(userAgent) ? "Instagram" : "Facebook" };
  if (clickIds.includes("igshid")) return { source: "Instagram" };
  if (clickIds.includes("gclid")) return { source: "Google" };

  const host = hostOf(referrer);
  if (host && !OWN_HOSTS.test(host)) {
    const named = namedSource(host);
    return named ? { source: named } : { source: "Other sites", referrerHost: host.slice(0, 120) };
  }

  // In-app browsers usually send no referrer
  if (/Instagram/i.test(userAgent)) return { source: "Instagram" };
  if (/FBAN|FBAV|FB_IAB|FBIOS/i.test(userAgent)) return { source: "Facebook" };
  return { source: "Direct" };
};
