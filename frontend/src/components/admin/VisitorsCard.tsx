/**
 * Dashboard card: website visitors today and online now, refreshed every
 * minute while the tab is visible. Links to the full Visitors page.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Eye } from "lucide-react";
import { adminAPI } from "../../api";
import type { ILiveVisitors } from "../../types";

const REFRESH_MS = 60 * 1000;

const VisitorsCard = () => {
  const [live, setLive] = useState<ILiveVisitors | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      if (document.hidden) return;
      adminAPI
        .getLiveVisitors()
        .then((res) => {
          if (cancelled) return;
          setLive(res.data.data);
          setFailed(false);
        })
        .catch(() => !cancelled && setFailed(true));
    };
    load();
    const timer = window.setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const latest = live?.recent.find((visit) => visit.productsViewed > 0);

  return (
    <section aria-labelledby="visitors-card-heading" className="card p-4 flex flex-col sm:flex-row sm:items-center gap-4">
      <span className="p-2.5 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] self-start sm:self-center">
        <Eye className="w-5 h-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 id="visitors-card-heading" className="font-semibold">
          Website visitors
        </h2>
        {failed && !live ? (
          <p className="text-sm text-[var(--color-text-muted)]">Visitor numbers aren't available right now.</p>
        ) : (
          <p className="text-sm text-[var(--color-text-muted)]" aria-live="polite">
            <span className="font-semibold text-[var(--color-text)]">{live ? live.todayVisitors : "…"}</span> today
            <span aria-hidden="true"> · </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className={`w-2 h-2 rounded-full ${live?.onlineNow ? "bg-[var(--color-success)] animate-pulse" : "bg-[var(--color-text-muted)]"}`}
              />
              <span className="font-semibold text-[var(--color-text)]">{live ? live.onlineNow : "…"}</span> online now
            </span>
            {latest && (
              <span className="block truncate">
                Latest: {latest.name || latest.visitorLabel} looked at {latest.products[0]?.name ?? `${latest.productsViewed} products`}
              </span>
            )}
          </p>
        )}
      </div>
      <Link to="/admin/visitors" className="btn btn-secondary text-sm self-start sm:self-center">
        Visitor stats
        <ArrowRight className="w-4 h-4" aria-hidden="true" />
      </Link>
    </section>
  );
};

export default VisitorsCard;
