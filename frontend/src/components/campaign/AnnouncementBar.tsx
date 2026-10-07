/**
 * Thin festival/event bar above the header while a campaign is live
 * ("🪔 Tihar Sale — 15% off everything · 2d 4h left · Shop the sale →").
 * Coloured from the campaign's palette; dismissible for the session.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, X } from "lucide-react";
import { useCampaign } from "../../context/CampaignContext";
import { saleText, salePath } from "../../utils/campaign";
import Countdown from "./Countdown";

const dismissKey = (slug: string) => `campaign-bar-dismissed:${slug}`;

const wasDismissed = (slug: string): boolean => {
  try {
    return sessionStorage.getItem(dismissKey(slug)) === "1";
  } catch {
    return false;
  }
};

const AnnouncementBar = () => {
  const { campaign, isPreview } = useCampaign();
  const [dismissedSlug, setDismissedSlug] = useState<string | null>(null);

  if (!campaign || (!isPreview && campaign.state !== "live")) return null;
  if (dismissedSlug === campaign.slug || (!isPreview && wasDismissed(campaign.slug))) return null;

  const offer = saleText(campaign);
  const { theme } = campaign;

  const dismiss = () => {
    try {
      sessionStorage.setItem(dismissKey(campaign.slug), "1");
    } catch {
      // Hidden for this page view only
    }
    setDismissedSlug(campaign.slug);
  };

  return (
    <div
      role="region"
      aria-label={`${campaign.name} announcement`}
      style={{ backgroundColor: theme.bg, color: theme.text }}
      className="relative text-sm"
    >
      <div className="container-app flex items-center justify-center gap-x-3 gap-y-1 py-2 pr-10 flex-wrap text-center">
        {isPreview && (
          <span
            className="px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide"
            style={{ backgroundColor: theme.accent, color: theme.onAccent }}
          >
            Preview
          </span>
        )}
        <p className="font-semibold">
          {campaign.emoji && <span aria-hidden="true">{campaign.emoji} </span>}
          {campaign.headline}
          {offer && <span className="font-normal"> — {offer}</span>}
        </p>
        <Countdown endsAt={campaign.endsAt} className="opacity-90" />
        <Link
          to={salePath(campaign.slug)}
          className="inline-flex items-center gap-1 font-semibold underline underline-offset-2 hover:no-underline"
        >
          {campaign.ctaLabel || "Shop the sale"}
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss announcement"
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-black/10"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
};

export default AnnouncementBar;
