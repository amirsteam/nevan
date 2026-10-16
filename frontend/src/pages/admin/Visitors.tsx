/**
 * Admin Visitors page: who visits the website and what they look at, from the
 * shop's own first-party analytics (utils/analytics.ts → /admin/analytics).
 * Range in the URL (?range=today|7d|30d|90d), compared with the period before.
 * Online now and the latest visits refresh every 30 seconds; a visit opens its
 * step-by-step timeline. Signed-in shoppers are named, everyone else is an
 * anonymous visitor. Admins and bots are never counted.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Eye,
  FileText,
  Monitor,
  RefreshCw,
  Search,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Tablet,
  TrendingDown,
} from "lucide-react";
import { adminAPI } from "../../api";
import { Change, SeriesTooltip, Thumb } from "../../components/admin/charts";
import { ChartSkeleton, DashboardStatSkeleton, EmptyState, LoadingRegion, Modal, Skeleton } from "../../components/ui";
import { usePageTitle } from "../../hooks/usePageTitle";
import { getErrorMessage } from "../../utils/helpers";
import { countThisDevice, isThisDeviceCounted } from "../../utils/analytics";
import type { ILiveVisitors, IRecentVisit, IVisitTimeline, IVisitorStats, VisitDevice, VisitorRange } from "../../types";

const LIVE_REFRESH_MS = 30 * 1000;

const RANGES: { value: VisitorRange; label: string; versus: string }[] = [
  { value: "today", label: "Today", versus: "vs yesterday so far" },
  { value: "7d", label: "7 days", versus: "vs the 7 days before" },
  { value: "30d", label: "30 days", versus: "vs the 30 days before" },
  { value: "90d", label: "90 days", versus: "" },
];

// Brand colours of each source; readable on light and dark surfaces
const SOURCE_COLORS: Record<string, string> = {
  Facebook: "#1877f2",
  Instagram: "#d62976",
  Google: "#34a853",
  WhatsApp: "#128c4a",
  TikTok: "#ee1d52",
  "Other search": "#8b5cf6",
  "Other sites": "#c1847b",
  Direct: "#8fae8b",
};

const DEVICE_META: Record<VisitDevice, { label: string; color: string; icon: typeof Smartphone }> = {
  mobile: { label: "Phone", color: "var(--color-primary)", icon: Smartphone },
  tablet: { label: "Tablet", color: "var(--color-accent-dark)", icon: Tablet },
  desktop: { label: "Computer", color: "var(--color-info)", icon: Monitor },
};

const VISITORS_COLOR = "var(--color-primary)";
const VIEWS_COLOR = "var(--color-accent-dark)";
const ORDERS_COLOR = "var(--color-info)";

const percent = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);
const formatPercent = (value: number) => `${(value * 100).toFixed(value > 0 && value < 0.1 ? 1 : 0)}%`;
const number = (value: number) => value.toLocaleString("en-IN");

/** "10am", "3pm" (Nepal hours from the API) */
const hourLabel = (hour: number) => `${hour % 12 || 12}${hour < 12 ? "am" : "pm"}`;

const seriesLabel = (key: string, granularity: "hour" | "day", long = false) => {
  if (granularity === "hour") return hourLabel(Number(key));
  // "2026-10-14" as a calendar date (noon avoids time-zone day shifts)
  const date = new Date(`${key}T12:00:00`);
  return date.toLocaleDateString("en-US", long ? { weekday: "short", month: "short", day: "numeric" } : { month: "short", day: "numeric" });
};

const timeAgo = (iso: string) => {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const isRange = (value: string | null): value is VisitorRange => RANGES.some((r) => r.value === value);

const Visitors = () => {
  usePageTitle("Visitors");
  const [searchParams, setSearchParams] = useSearchParams();
  const range: VisitorRange = isRange(searchParams.get("range")) ? (searchParams.get("range") as VisitorRange) : "7d";

  const [stats, setStats] = useState<IVisitorStats | null>(null);
  const [error, setError] = useState<{ range: VisitorRange; message: string } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [live, setLive] = useState<ILiveVisitors | null>(null);
  const [openVisit, setOpenVisit] = useState<IRecentVisit | null>(null);
  const [deviceCounted, setDeviceCounted] = useState(isThisDeviceCounted);

  useEffect(() => {
    let cancelled = false;
    adminAPI
      .getVisitorStats(range)
      .then((res) => {
        if (cancelled) return;
        setStats(res.data.data);
        setError(null);
      })
      .catch((err) => !cancelled && setError({ range, message: getErrorMessage(err, "Could not load visitor stats") }));
    return () => {
      cancelled = true;
    };
  }, [range, reloadKey]);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      if (document.hidden) return;
      adminAPI
        .getLiveVisitors()
        .then((res) => !cancelled && setLive(res.data.data))
        .catch(() => undefined);
    };
    load();
    const timer = window.setInterval(load, LIVE_REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [reloadKey]);

  const showing = stats && stats.range === range ? stats : null;
  const failed = error?.range === range ? error.message : null;
  const rangeInfo = RANGES.find((r) => r.value === range)!;

  const chartData = useMemo(
    () =>
      (showing?.series || []).map((point) => ({
        ...point,
        label: seriesLabel(point.key, showing!.granularity),
      })),
    [showing],
  );

  const busiest = useMemo(() => {
    const hours = showing?.hours || [];
    const top = hours.reduce((best, h) => (h.pageViews > best.pageViews ? h : best), { hour: 0, pageViews: 0 });
    return top.pageViews > 0 ? top : null;
  }, [showing]);

  const changeRange = (value: VisitorRange) => {
    const next = new URLSearchParams(searchParams);
    if (value === "7d") next.delete("range");
    else next.set("range", value);
    setSearchParams(next, { replace: true });
  };

  const header = (
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold">Visitors</h1>
        <p className="text-[var(--color-text-muted)]">
          Who visits the website and what they look at. Admins and bots aren't counted.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm"
          aria-live="polite"
        >
          <span
            aria-hidden="true"
            className={`w-2 h-2 rounded-full ${live?.onlineNow ? "bg-[var(--color-success)] animate-pulse" : "bg-[var(--color-text-muted)]"}`}
          />
          <span className="font-semibold">{live ? live.onlineNow : "…"}</span> online now
        </span>
        <div role="group" aria-label="Time range" className="inline-flex rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => changeRange(r.value)}
              aria-pressed={range === r.value}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                range === r.value
                  ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setReloadKey((k) => k + 1)} className="btn btn-secondary text-sm" aria-label="Refresh">
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );

  if (failed && !showing) {
    return (
      <div className="space-y-6">
        {header}
        <EmptyState
          icon={AlertTriangle}
          title="Couldn't load visitor stats"
          description={failed}
          actionLabel="Try again"
          onAction={() => setReloadKey((k) => k + 1)}
        />
      </div>
    );
  }

  if (!showing) {
    return (
      <div className="space-y-6">
        {header}
        <LoadingRegion label="Loading visitor stats" className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <DashboardStatSkeleton key={i} />
            ))}
          </div>
          <ChartSkeleton />
          <Skeleton className="h-48 w-full rounded-xl" />
        </LoadingRegion>
      </div>
    );
  }

  const { current, previous } = showing.totals;
  const compare = showing.comparable;
  const kpis: { label: string; value: string; current: number; previous: number; hint?: string }[] = [
    { label: "Visitors", value: number(current.visitors), current: current.visitors, previous: previous.visitors, hint: `${number(current.visits)} visits` },
    { label: "Product views", value: number(current.productViews), current: current.productViews, previous: previous.productViews },
    { label: "Added to cart", value: number(current.addToCarts), current: current.addToCarts, previous: previous.addToCarts },
    {
      label: "Orders placed",
      value: number(current.ordersPlaced),
      current: current.ordersPlaced,
      previous: previous.ordersPlaced,
      hint: "Website and app",
    },
    {
      label: "Conversion",
      value: formatPercent(current.conversion),
      current: current.conversion,
      previous: previous.conversion,
      hint: "Visitors who ordered",
    },
  ];

  const funnelTop = showing.funnel[0]?.visitors || 0;
  const totalSourceVisits = showing.sources.reduce((sum, s) => sum + s.visits, 0);
  const devices = showing.devices.map((d) => ({ ...d, ...DEVICE_META[d.device] }));
  const totalDeviceVisits = devices.reduce((sum, d) => sum + d.visits, 0);
  const noVisits = current.visitors === 0;

  return (
    <div className="space-y-6">
      {header}

      {!deviceCounted && (
        <p className="text-xs text-[var(--color-text-muted)]">
          Your own browsing on this device isn't counted because an admin signed in here.{" "}
          <button
            type="button"
            className="underline underline-offset-2 hover:text-[var(--color-primary)]"
            onClick={() => {
              countThisDevice();
              setDeviceCounted(true);
            }}
          >
            Count this device
          </button>
        </p>
      )}

      {/* Key numbers */}
      <section aria-labelledby="kpi-heading">
        <h2 id="kpi-heading" className="sr-only">
          Key numbers
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="stat-card">
              <p className="text-sm text-[var(--color-text-muted)]">{kpi.label}</p>
              <p className="text-2xl font-bold mt-1">{kpi.value}</p>
              {compare && (
                <p className="text-xs mt-1 flex flex-wrap items-center gap-x-1.5">
                  <Change current={kpi.current} previous={kpi.previous} />
                  <span className="text-[var(--color-text-muted)]">{rangeInfo.versus}</span>
                </p>
              )}
              {kpi.hint && <p className="text-xs text-[var(--color-text-muted)] mt-1">{kpi.hint}</p>}
            </div>
          ))}
        </div>
      </section>

      {noVisits && (
        <div className="card p-4 flex items-start gap-3 text-sm">
          <Eye className="w-5 h-5 text-[var(--color-text-muted)] shrink-0" aria-hidden="true" />
          <p className="text-[var(--color-text-muted)]">
            No visits recorded for this period yet. Visits show up here a few seconds after someone browses the shop.
          </p>
        </div>
      )}

      {/* Over time */}
      <section aria-labelledby="trend-heading" className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h2 id="trend-heading" className="font-semibold">
            {showing.granularity === "hour" ? "Today, hour by hour" : "Day by day"}
          </h2>
          <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--color-text-muted)]" aria-hidden="true">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[var(--color-primary)]/40 border border-[var(--color-primary)]" />
              Visitors
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 border-t-2 border-dashed border-[var(--color-accent-dark)]" />
              Product views
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 bg-[var(--color-info)]" />
              Orders
            </span>
          </div>
        </div>
        <div className="h-72" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ left: -16, right: 0 }} accessibilityLayer={false}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="label" stroke="var(--color-text-muted)" fontSize={12} minTickGap={16} />
              <YAxis yAxisId="left" stroke="var(--color-text-muted)" fontSize={12} allowDecimals={false} />
              <YAxis yAxisId="right" orientation="right" stroke="var(--color-text-muted)" fontSize={12} allowDecimals={false} />
              <Tooltip content={<SeriesTooltip />} />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="visitors"
                name="Visitors"
                stroke={VISITORS_COLOR}
                fill={VISITORS_COLOR}
                fillOpacity={0.15}
                strokeWidth={2}
              />
              <Line yAxisId="left" type="monotone" dataKey="productViews" name="Product views" stroke={VIEWS_COLOR} strokeDasharray="5 3" strokeWidth={2} dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="orders" name="Orders" stroke={ORDERS_COLOR} strokeWidth={2} dot={{ r: 2 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        {/* Text alternative for the chart (a table ignores sr-only's 1px width, so it's wrapped) */}
        <div className="sr-only">
        <table>
          <caption>Visitors, product views and orders {showing.granularity === "hour" ? "by hour today" : "by day"}</caption>
          <thead>
            <tr>
              <th scope="col">{showing.granularity === "hour" ? "Hour" : "Day"}</th>
              <th scope="col">Visitors</th>
              <th scope="col">Product views</th>
              <th scope="col">Orders</th>
            </tr>
          </thead>
          <tbody>
            {showing.series.map((point) => (
              <tr key={point.key}>
                <th scope="row">{seriesLabel(point.key, showing.granularity, true)}</th>
                <td>{point.visitors}</td>
                <td>{point.productViews}</td>
                <td>{point.orders}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Funnel */}
        <section aria-labelledby="funnel-heading" className="card p-4">
          <h2 id="funnel-heading" className="font-semibold">
            From visit to order
          </h2>
          <p className="text-xs text-[var(--color-text-muted)] mb-4">Website visitors who reached each step</p>
          <ol className="space-y-3">
            {showing.funnel.map((step, index) => {
              const prev = index > 0 ? showing.funnel[index - 1].visitors : step.visitors;
              const drop = index > 0 && prev > 0 ? 100 - percent(step.visitors, prev) : 0;
              return (
                <li key={step.step}>
                  <div className="flex items-baseline justify-between gap-2 text-sm mb-1">
                    <span className="font-medium">{step.label}</span>
                    <span>
                      <span className="font-semibold">{number(step.visitors)}</span>
                      <span className="text-[var(--color-text-muted)]"> · {percent(step.visitors, funnelTop)}%</span>
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-[var(--color-surface-muted)] overflow-hidden" aria-hidden="true">
                    <div
                      className="h-full rounded-full bg-[var(--color-primary)]"
                      style={{ width: `${Math.max(percent(step.visitors, funnelTop), step.visitors ? 2 : 0)}%` }}
                    />
                  </div>
                  {index > 0 && drop > 0 && (
                    <p className="text-xs text-[var(--color-text-muted)] mt-1 flex items-center gap-1">
                      <TrendingDown className="w-3 h-3" aria-hidden="true" />
                      {drop}% stopped before this step
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        </section>

        {/* Sources and devices */}
        <section aria-labelledby="sources-heading" className="card p-4">
          <h2 id="sources-heading" className="font-semibold">
            Where visitors come from
          </h2>
          <p className="text-xs text-[var(--color-text-muted)] mb-4">
            Visits by source. Tip: add <code className="text-[11px]">?utm_source=facebook&amp;utm_campaign=…</code> to links in posts to see each post.
          </p>
          {showing.sources.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">No visits yet.</p>
          ) : (
            <ul className="space-y-2.5">
              {showing.sources.map((s) => (
                <li key={s.source}>
                  <div className="flex items-baseline justify-between gap-2 text-sm mb-1">
                    <span className="flex items-center gap-2 font-medium">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SOURCE_COLORS[s.source] || "var(--color-text-muted)" }} aria-hidden="true" />
                      {s.source}
                    </span>
                    <span className="text-[var(--color-text-muted)]">
                      <span className="font-semibold text-[var(--color-text)]">{number(s.visits)}</span> visits
                      {s.orders > 0 && ` · ${s.orders} ordered`}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--color-surface-muted)] overflow-hidden" aria-hidden="true">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${percent(s.visits, totalSourceVisits)}%`, backgroundColor: SOURCE_COLORS[s.source] || "var(--color-text-muted)" }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}

          {devices.length > 0 && (
            <div className="mt-6 pt-4 border-t border-[var(--color-border)] flex items-center gap-4">
              <div className="w-28 h-28 shrink-0" aria-hidden="true">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart accessibilityLayer={false}>
                    <Pie data={devices} dataKey="visits" nameKey="label" innerRadius={30} outerRadius={52} paddingAngle={2} rootTabIndex={-1}>
                      {devices.map((d) => (
                        <Cell key={d.device} fill={d.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-1.5 text-sm" aria-label="Devices">
                {devices.map((d) => (
                  <li key={d.device} className="flex items-center gap-2">
                    <d.icon className="w-4 h-4" style={{ color: d.color }} aria-hidden="true" />
                    {d.label}
                    <span className="font-semibold">{percent(d.visits, totalDeviceVisits)}%</span>
                    <span className="text-[var(--color-text-muted)]">({number(d.visits)})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>

      {/* Products */}
      <section aria-labelledby="products-heading" className="card">
        <div className="p-4 border-b border-[var(--color-border)]">
          <h2 id="products-heading" className="font-semibold">
            Most viewed products
          </h2>
          <p className="text-xs text-[var(--color-text-muted)]">
            Views and add-to-carts on the website; orders from all channels.
          </p>
        </div>
        {showing.topProducts.length === 0 ? (
          <p className="p-6 text-sm text-[var(--color-text-muted)]">No product views in this period yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
                  <th scope="col" className="text-left p-3 font-medium">Product</th>
                  <th scope="col" className="text-right p-3 font-medium">Views</th>
                  <th scope="col" className="text-right p-3 font-medium">Added to cart</th>
                  <th scope="col" className="text-right p-3 font-medium">Orders</th>
                  <th scope="col" className="hidden sm:table-cell text-right p-3 font-medium">Views → order</th>
                </tr>
              </thead>
              <tbody>
                {showing.topProducts.map((product) => (
                  <tr key={product._id} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="p-3">
                      <Link to={`/admin/products/${product._id}/edit`} className="flex items-center gap-3 hover:text-[var(--color-primary)]">
                        <Thumb url={product.image} />
                        <span className="min-w-0">
                          <span className="block font-medium truncate max-w-[16rem]">{product.name}</span>
                          {product.notSelling && (
                            <span className="inline-block mt-0.5 rounded-full border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10 px-2 py-0.5 text-[11px] font-medium text-[var(--color-text)]">
                              Viewed a lot, not ordered
                            </span>
                          )}
                          {!product.isActive && (
                            <span className="inline-block mt-0.5 ml-1 rounded-full bg-[var(--color-surface-muted)] px-2 py-0.5 text-[11px] text-[var(--color-text-muted)]">
                              Hidden
                            </span>
                          )}
                        </span>
                      </Link>
                    </td>
                    <td className="p-3 text-right font-semibold">{number(product.views)}</td>
                    <td className="p-3 text-right">{number(product.carts)}</td>
                    <td className="p-3 text-right">
                      {number(product.orders)}
                      {product.quantity > product.orders && (
                        <span className="block text-[11px] text-[var(--color-text-muted)]">{product.quantity} pcs</span>
                      )}
                    </td>
                    <td className="hidden sm:table-cell p-3 text-right text-[var(--color-text-muted)]">
                      {product.views ? formatPercent(product.conversion) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Searches */}
        <section aria-labelledby="searches-heading" className="card p-4">
          <h2 id="searches-heading" className="font-semibold mb-3">
            What they search for
          </h2>
          {showing.searches.top.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">No searches yet.</p>
          ) : (
            <ol className="space-y-1.5 text-sm">
              {showing.searches.top.map((s) => (
                <li key={s.query} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 min-w-0">
                    <Search className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" aria-hidden="true" />
                    <span className="truncate">{s.query}</span>
                  </span>
                  <span className="text-[var(--color-text-muted)] shrink-0">{s.searches}×</span>
                </li>
              ))}
            </ol>
          )}
          {showing.searches.noResults.length > 0 && (
            <div className="mt-4 pt-3 border-t border-[var(--color-border)]">
              <h3 className="text-sm font-semibold">Found nothing</h3>
              <p className="text-xs text-[var(--color-text-muted)] mb-2">Ideas for new stock or product names</p>
              <ul className="flex flex-wrap gap-1.5">
                {showing.searches.noResults.map((s) => (
                  <li key={s.query} className="rounded-full border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10 px-2.5 py-1 text-xs text-[var(--color-text)]">
                    {s.query} · {s.searches}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Busiest hours */}
        <section aria-labelledby="hours-heading" className="card p-4">
          <h2 id="hours-heading" className="font-semibold">
            Busiest hours
          </h2>
          <p className="text-xs text-[var(--color-text-muted)] mb-3">
            {busiest
              ? `Most browsing around ${hourLabel(busiest.hour)}–${hourLabel((busiest.hour + 1) % 24)} (Nepal time): a good time to post.`
              : "Page views by hour of the day (Nepal time)."}
          </p>
          <div className="h-40" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={showing.hours} margin={{ left: -24, right: 0 }} accessibilityLayer={false}>
                <XAxis dataKey="hour" stroke="var(--color-text-muted)" fontSize={11} tickFormatter={hourLabel} interval={5} />
                <YAxis stroke="var(--color-text-muted)" fontSize={11} allowDecimals={false} />
                <Tooltip content={<SeriesTooltip labelFormatter={(h) => hourLabel(Number(h))} />} cursor={{ fill: "var(--color-surface-muted)" }} />
                <Bar dataKey="pageViews" name="Page views" fill={VISITORS_COLOR} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Pages */}
        <section aria-labelledby="pages-heading" className="card p-4">
          <h2 id="pages-heading" className="font-semibold mb-3">
            Most visited pages
          </h2>
          {showing.topPages.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">No page views yet.</p>
          ) : (
            <ol className="space-y-1.5 text-sm">
              {showing.topPages.map((page) => (
                <li key={page.path} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 min-w-0">
                    <FileText className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" aria-hidden="true" />
                    <span className="truncate" title={page.path}>
                      {page.path === "/" ? "Home" : page.path}
                    </span>
                  </span>
                  <span className="text-[var(--color-text-muted)] shrink-0">{number(page.views)}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      {/* Latest visits */}
      <section aria-labelledby="recent-heading" className="card">
        <div className="p-4 border-b border-[var(--color-border)]">
          <h2 id="recent-heading" className="font-semibold">
            Latest visits
          </h2>
          <p className="text-xs text-[var(--color-text-muted)]">
            Signed-in shoppers show their name; everyone else is an anonymous visitor. Updates every 30 seconds.
          </p>
        </div>
        {!live ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : live.recent.length === 0 ? (
          <p className="p-6 text-sm text-[var(--color-text-muted)]">No visits yet.</p>
        ) : (
          <ul className="divide-y divide-[var(--color-border)]">
            {live.recent.map((visit) => {
              const device = DEVICE_META[visit.device] || DEVICE_META.desktop;
              return (
                <li key={visit.session}>
                  <button
                    type="button"
                    onClick={() => setOpenVisit(visit)}
                    className="w-full text-left p-3 sm:px-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 hover:bg-[var(--color-surface-muted)]"
                  >
                    <span className="flex items-center gap-3 min-w-0 sm:w-64 shrink-0">
                      <span className="relative shrink-0">
                        <device.icon className="w-5 h-5 text-[var(--color-text-muted)]" aria-hidden="true" />
                        {visit.online && (
                          <span className="absolute -right-1 -top-1 w-2.5 h-2.5 rounded-full bg-[var(--color-success)] ring-2 ring-[var(--color-surface)]" aria-hidden="true" />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-medium truncate">
                          {visit.name || visit.visitorLabel}
                          {visit.online && <span className="sr-only"> (online now)</span>}
                        </span>
                        <span className="block text-xs text-[var(--color-text-muted)] truncate">
                          {device.label} · {visit.source}
                          {visit.campaign ? ` (${visit.campaign})` : visit.referrerHost ? ` (${visit.referrerHost})` : ""}
                          {visit.returning ? " · returning" : ""}
                        </span>
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5 flex-1 min-w-0">
                      {visit.products.length > 0 ? (
                        <>
                          {visit.products.map((p) => (
                            <span key={p._id} title={p.name}>
                              <Thumb url={p.image} size={32} />
                            </span>
                          ))}
                          {visit.productsViewed > visit.products.length && (
                            <span className="text-xs text-[var(--color-text-muted)]">+{visit.productsViewed - visit.products.length}</span>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-[var(--color-text-muted)]">
                          {visit.pageViews} page{visit.pageViews === 1 ? "" : "s"} · landed on {visit.landingPath === "/" ? "Home" : visit.landingPath}
                        </span>
                      )}
                    </span>
                    <span className="flex items-center gap-2 text-xs shrink-0">
                      {visit.ordered ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-success)]/10 px-2 py-0.5 font-medium text-[var(--color-success)]">
                          <CheckCircle2 className="w-3 h-3" aria-hidden="true" /> Ordered
                        </span>
                      ) : visit.addToCarts > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10 px-2 py-0.5 font-medium text-[var(--color-text)]">
                          <ShoppingCart className="w-3 h-3 text-[var(--color-warning)]" aria-hidden="true" /> In cart
                        </span>
                      ) : null}
                      <span className="text-[var(--color-text-muted)]">{visit.online ? "Online now" : timeAgo(visit.lastSeenAt)}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="text-xs text-[var(--color-text-muted)]">
        Visit records are kept for {showing.retentionDays} days. No IP addresses are stored, and browsers that ask not to be
        tracked aren't counted.
      </p>

      <VisitDrawer visit={openVisit} onClose={() => setOpenVisit(null)} />
    </div>
  );
};

const EVENT_META: Record<IVisitTimeline["events"][number]["type"], { icon: typeof Eye; label: string }> = {
  page_view: { icon: FileText, label: "Opened" },
  product_view: { icon: ShoppingBag, label: "Looked at" },
  search: { icon: Search, label: "Searched for" },
  add_to_cart: { icon: ShoppingCart, label: "Added to cart" },
  checkout_start: { icon: CreditCard, label: "Started checkout" },
  order_placed: { icon: CheckCircle2, label: "Placed order" },
};

/** One visit, step by step */
const VisitDrawer = ({ visit, onClose }: { visit: IRecentVisit | null; onClose: () => void }) => {
  const [timeline, setTimeline] = useState<{ session: string; data: IVisitTimeline | null; error?: string } | null>(null);

  useEffect(() => {
    if (!visit) return;
    let cancelled = false;
    adminAPI
      .getVisitTimeline(visit.session)
      .then((res) => !cancelled && setTimeline({ session: visit.session, data: res.data.data.visit }))
      .catch((err) => !cancelled && setTimeline({ session: visit.session, data: null, error: getErrorMessage(err, "Could not load this visit") }));
    return () => {
      cancelled = true;
    };
  }, [visit]);

  const current = timeline && visit && timeline.session === visit.session ? timeline : null;

  return (
    <Modal
      isOpen={Boolean(visit)}
      onClose={onClose}
      variant="drawer"
      title={visit ? visit.name || visit.visitorLabel : "Visit"}
      description={
        visit
          ? `${(DEVICE_META[visit.device] || DEVICE_META.desktop).label} · ${visit.source}${visit.campaign ? ` (${visit.campaign})` : ""} · started ${new Date(visit.startedAt).toLocaleString()}`
          : undefined
      }
    >
      {!current ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : current.error || !current.data ? (
        <p className="text-sm text-[var(--color-error)]">{current.error || "This visit is no longer available."}</p>
      ) : (
        <ol className="relative border-l border-[var(--color-border)] ml-2 space-y-4">
          {current.data.events.map((event, index) => {
            const meta = EVENT_META[event.type];
            return (
              <li key={index} className="pl-5 relative">
                <span className="absolute -left-[13px] top-0.5 flex w-6 h-6 items-center justify-center rounded-full bg-[var(--color-surface)] border border-[var(--color-border)]">
                  <meta.icon className="w-3.5 h-3.5 text-[var(--color-primary)]" aria-hidden="true" />
                </span>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {new Date(event.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                </p>
                <p className="text-sm">
                  <span className="font-medium">{meta.label}</span>{" "}
                  {event.product ? (
                    <Link to={`/admin/products/${event.product._id}/edit`} className="inline-flex items-center gap-2 align-middle hover:text-[var(--color-primary)]" onClick={onClose}>
                      <Thumb url={event.product.image} size={28} />
                      {event.product.name}
                    </Link>
                  ) : event.type === "search" ? (
                    <>
                      “{event.query}”{" "}
                      <span className="text-[var(--color-text-muted)]">
                        {event.results === 0 ? "· nothing found" : event.results != null ? `· ${event.results} results` : ""}
                      </span>
                    </>
                  ) : event.order ? (
                    <Link to={`/admin/orders?order=${event.order._id}`} className="hover:text-[var(--color-primary)]" onClick={onClose}>
                      #{event.order.orderNumber}
                    </Link>
                  ) : event.type === "page_view" ? (
                    <span className="text-[var(--color-text-muted)]">{event.path === "/" ? "Home" : event.path}</span>
                  ) : null}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </Modal>
  );
};

export default Visitors;
