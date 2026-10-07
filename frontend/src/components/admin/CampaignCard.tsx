/**
 * Dashboard card: the live campaign with its sales so far, or the next
 * scheduled one, or a nudge to plan the next festival.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Megaphone, ArrowRight } from "lucide-react";
import { adminAPI } from "../../api";
import Countdown from "../campaign/Countdown";
import { formatPrice } from "../../utils/helpers";
import { formatNepalDateTime } from "../../utils/nepal";
import type { IAdminCampaign, ICampaignStats } from "../../types";

const CampaignCard = () => {
  const [campaign, setCampaign] = useState<IAdminCampaign | null>(null);
  const [stats, setStats] = useState<ICampaignStats | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await adminAPI.getCampaigns();
        const all = res.data.data.campaigns;
        const live = all.find((c) => c.state === "live");
        const next = all
          .filter((c) => c.state === "scheduled")
          .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))[0];
        const shown = live || next || null;
        if (cancelled) return;
        setCampaign(shown);
        if (live) {
          const statsRes = await adminAPI.getCampaignStats(live._id);
          if (!cancelled) setStats(statsRes.data.data.stats);
        }
      } catch {
        // The dashboard works without this card
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loaded) return null;

  if (!campaign) {
    return (
      <Link
        to="/admin/campaigns"
        className="card p-4 flex items-center gap-3 hover:border-[var(--color-primary)] transition-colors"
      >
        <span className="p-2 rounded-lg bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
          <Megaphone className="w-5 h-5" aria-hidden="true" />
        </span>
        <span className="flex-1">
          <span className="block font-medium">No campaign scheduled</span>
          <span className="block text-sm text-[var(--color-text-muted)]">Plan the next festival sale — Dashain, Tihar, Holi…</span>
        </span>
        <ArrowRight className="w-4 h-4 text-[var(--color-text-muted)]" aria-hidden="true" />
      </Link>
    );
  }

  const live = campaign.state === "live";

  return (
    <section className="card overflow-hidden" aria-label="Campaign">
      <div
        className="px-4 py-3 flex flex-wrap items-center gap-x-3 gap-y-1"
        style={{ backgroundColor: campaign.theme.bg, color: campaign.theme.text }}
      >
        <span className="text-2xl" aria-hidden="true">
          {campaign.emoji || "✨"}
        </span>
        <span className="font-semibold">{campaign.name}</span>
        {campaign.saleLabel && (
          <span
            className="px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{ backgroundColor: campaign.theme.accent, color: campaign.theme.onAccent }}
          >
            {campaign.saleLabel}
          </span>
        )}
        <span className="ml-auto text-sm font-medium">
          {live ? <Countdown endsAt={campaign.endsAt} /> : `Starts ${formatNepalDateTime(campaign.startsAt)}`}
        </span>
      </div>
      <div className="p-4 flex flex-wrap items-center gap-x-6 gap-y-2">
        {live && stats ? (
          <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <div>
              <dt className="text-[var(--color-text-muted)]">Orders</dt>
              <dd className="text-lg font-bold">{stats.orders}</dd>
            </div>
            <div>
              <dt className="text-[var(--color-text-muted)]">Items sold</dt>
              <dd className="text-lg font-bold">{stats.units}</dd>
            </div>
            <div>
              <dt className="text-[var(--color-text-muted)]">Revenue</dt>
              <dd className="text-lg font-bold">{formatPrice(stats.revenue)}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-[var(--color-text-muted)]">Scheduled — the store will dress up automatically.</p>
        )}
        <Link to={`/admin/campaigns/${campaign._id}/edit`} className="ml-auto text-sm font-medium text-[var(--color-primary)] inline-flex items-center gap-1">
          Manage
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
};

export default CampaignCard;
