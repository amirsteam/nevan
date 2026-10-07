/**
 * Campaign Editor (/admin/campaigns/new?festival=tihar, /admin/campaigns/:id/edit)
 * Festival look, banners, schedule (Nepal time), automatic sale, launch push,
 * a live preview and, once running, the campaign's sales.
 */
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, useBlocker, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, CalendarClock, CheckCircle2, ExternalLink, Eye, ImagePlus, Loader2, Play, Send, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import { adminAPI } from "../../api";
import type { CampaignPayload } from "../../api/admin";
import { SearchInput } from "../../components/admin";
import { ConfirmModal, EmptyState, LoadingRegion, Skeleton } from "../../components/ui";
import { CampaignSlide } from "../../components/home/HeroCarousel";
import Countdown from "../../components/campaign/Countdown";
import { StateChip } from "./Campaigns";
import { usePageTitle } from "../../hooks/usePageTitle";
import { formatPrice, getErrorMessage } from "../../utils/helpers";
import { fromNepalInput, toNepalInput, formatNepalDateTime } from "../../utils/nepal";
import { saleText, salePath, timeLeft, timeUntil } from "../../utils/campaign";
import type {
  CampaignSaleScope,
  CampaignSaleType,
  IAdminCampaign,
  ICampaignPresets,
  ICategory,
  ICampaignStats,
  IProduct,
  IPublicCampaign,
} from "../../types";

interface PickedProduct {
  _id: string;
  name: string;
  price?: number;
}

interface FormState {
  festival: string;
  name: string;
  headline: string;
  subheadline: string;
  greeting: string;
  emoji: string;
  palette: string;
  ctaLabel: string;
  startsAt: string; // Nepal time, datetime-local format
  endsAt: string;
  saleType: CampaignSaleType;
  saleValue: string;
  scope: CampaignSaleScope;
  categories: string[];
  products: PickedProduct[];
  excludeProducts: PickedProduct[];
  pushOnLaunch: boolean;
}

const DAY = 24 * 60 * 60 * 1000;

/**
 * New campaigns start now (so "Publish" shows them on the website at once)
 * and run for a week; admins change the dates for a future festival.
 */
const defaultDates = () => {
  const endDay = toNepalInput(new Date(Date.now() + 7 * DAY)).slice(0, 10);
  return { startsAt: toNepalInput(new Date()), endsAt: `${endDay}T23:59` };
};

/** Start time for "Start now": the current minute in Nepal time */
const nowInput = () => toNepalInput(new Date());

const fromPreset = (presets: ICampaignPresets, festival: string): Partial<FormState> => {
  const preset = presets.festivals[festival] || presets.festivals.custom;
  return {
    festival,
    name: preset.name,
    headline: preset.headline,
    greeting: preset.greeting,
    emoji: preset.emoji,
    palette: preset.palette,
  };
};

const SAMPLE_PRICE = 1200;

const Section = ({ title, description, children }: { title: string; description?: string; children: ReactNode }) => (
  <section className="card p-4 sm:p-6 space-y-4">
    <div>
      <h2 className="text-lg font-semibold font-sans">{title}</h2>
      {description && <p className="text-sm text-[var(--color-text-muted)]">{description}</p>}
    </div>
    {children}
  </section>
);

const Field = ({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) => (
  <div className="space-y-1">
    <label htmlFor={id} className="block text-sm font-medium">
      {label}
    </label>
    {children}
    {hint && <p className="text-xs text-[var(--color-text-muted)]">{hint}</p>}
  </div>
);

// ---------------------------------------------------------------------------
// Banner upload
// ---------------------------------------------------------------------------

const BannerField = ({
  label,
  hint,
  url,
  aspect,
  disabled,
  onUpload,
  onRemove,
}: {
  label: string;
  hint: string;
  url?: string | null;
  aspect: string;
  disabled: boolean;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => Promise<void>;
}) => {
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image");
    if (file.size > 3 * 1024 * 1024) return toast.error("Banner images must be under 3 MB");
    setBusy(true);
    try {
      await onUpload(file);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <div
        className={`relative w-full ${aspect} rounded-xl border-2 border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-muted)] overflow-hidden flex items-center justify-center`}
      >
        {url ? (
          <img src={url} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <span className="text-sm text-[var(--color-text-muted)] px-4 text-center">
            {disabled ? "Save the campaign first to add banners" : "No banner — a themed banner is generated"}
          </span>
        )}
        {busy && (
          <span className="absolute inset-0 bg-[var(--color-overlay)] flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-white" aria-hidden="true" />
            <span className="sr-only">Uploading…</span>
          </span>
        )}
      </div>
      <p className="text-xs text-[var(--color-text-muted)]">{hint}</p>
      <div className="flex gap-2">
        <label className={`btn btn-secondary text-sm py-1.5 ${disabled || busy ? "opacity-50 pointer-events-none" : "cursor-pointer"}`}>
          <ImagePlus className="w-4 h-4" aria-hidden="true" />
          {url ? "Replace" : "Upload"}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={disabled || busy}
            onChange={(e) => pick(e.target.files?.[0])}
          />
        </label>
        {url && (
          <button
            type="button"
            className="btn btn-secondary text-sm py-1.5 text-[var(--color-error)]"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onRemove();
              } finally {
                setBusy(false);
              }
            }}
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
            Remove
          </button>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Product picker
// ---------------------------------------------------------------------------

const ProductPicker = ({
  label,
  selected,
  onChange,
}: {
  label: string;
  selected: PickedProduct[];
  onChange: (next: PickedProduct[]) => void;
}) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ query: string; products: IProduct[] }>({ query: "", products: [] });

  useEffect(() => {
    if (query.length < 2) return;
    let cancelled = false;
    adminAPI
      .getProducts({ search: query, limit: 8 })
      .then((res) => !cancelled && setResults({ query, products: res.data.data.products }))
      .catch(() => !cancelled && setResults({ query, products: [] }));
    return () => {
      cancelled = true;
    };
  }, [query]);

  const shown = query.length >= 2 && results.query === query ? results.products : [];
  const chosen = new Set(selected.map((p) => p._id));

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      {selected.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {selected.map((p) => (
            <li key={p._id} className="inline-flex items-center gap-1 rounded-full bg-[var(--color-primary-soft)] pl-3 pr-1 py-1 text-sm">
              {p.name}
              <button
                type="button"
                onClick={() => onChange(selected.filter((s) => s._id !== p._id))}
                className="p-0.5 rounded-full hover:bg-black/10"
                aria-label={`Remove ${p.name}`}
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <SearchInput value={query} onChange={(v) => setQuery(v.trim())} placeholder="Search products by name or SKU..." />
      {shown.length > 0 && (
        <ul className="border border-[var(--color-border)] rounded-lg divide-y divide-[var(--color-border)] max-h-64 overflow-y-auto">
          {shown.map((p) => (
            <li key={p._id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span className="min-w-0 truncate">
                {p.name} <span className="text-[var(--color-text-muted)]">· {formatPrice(p.price)}</span>
              </span>
              <button
                type="button"
                disabled={chosen.has(p._id)}
                onClick={() => onChange([...selected, { _id: p._id, name: p.name, price: p.price }])}
                className="btn btn-secondary text-xs py-1 px-2"
              >
                {chosen.has(p._id) ? "Added" : "Add"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Editor
// ---------------------------------------------------------------------------

const CampaignEditor = () => {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [presets, setPresets] = useState<ICampaignPresets | null>(null);
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [campaign, setCampaign] = useState<IAdminCampaign | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  // save() reads this (it may also receive overrides such as "Start now")
  const formState = form;
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState<"draft" | "published" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [confirmNotify, setConfirmNotify] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [stats, setStats] = useState<ICampaignStats | null>(null);
  const savedRef = useRef(false);

  usePageTitle(isEdit ? (campaign ? `Edit ${campaign.name}` : "Edit campaign") : "New campaign");

  // Load presets, categories and (when editing) the campaign
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [presetRes, categoryRes, campaignRes] = await Promise.all([
          adminAPI.getCampaignPresets(),
          adminAPI.getCategories(),
          id ? adminAPI.getCampaign(id) : Promise.resolve(null),
        ]);
        if (cancelled) return;
        const loadedPresets = presetRes.data.data;
        setPresets(loadedPresets);
        setCategories(categoryRes.data.data.categories);

        if (campaignRes) {
          const c = campaignRes.data.data.campaign;
          // Names for products already in the sale (ids only in the campaign)
          const ids = [...new Set([...c.sale.products, ...c.sale.excludeProducts])].slice(0, 100);
          const named = await Promise.allSettled(ids.map((pid) => adminAPI.getProductById(pid)));
          const names = new Map<string, PickedProduct>();
          named.forEach((r, i) => {
            const p = r.status === "fulfilled" ? r.value.data.data.product : null;
            names.set(ids[i], p ? { _id: p._id, name: p.name, price: p.price } : { _id: ids[i], name: "(deleted product)" });
          });
          if (cancelled) return;
          setCampaign(c);
          setForm({
            festival: c.festival,
            name: c.name,
            headline: c.headline,
            subheadline: c.subheadline || "",
            greeting: c.greeting || "",
            emoji: c.emoji || "",
            palette: c.palette,
            ctaLabel: c.ctaLabel || "Shop the sale",
            startsAt: toNepalInput(c.startsAt),
            endsAt: toNepalInput(c.endsAt),
            saleType: c.sale.type,
            saleValue: c.sale.value ? String(c.sale.value) : "",
            scope: c.sale.scope,
            categories: c.sale.categories.map(String),
            products: c.sale.products.map((pid) => names.get(String(pid))!).filter(Boolean),
            excludeProducts: c.sale.excludeProducts.map((pid) => names.get(String(pid))!).filter(Boolean),
            pushOnLaunch: c.notify?.pushOnLaunch || false,
          });
        } else {
          const festival = searchParams.get("festival") || "custom";
          setForm({
            subheadline: "",
            ctaLabel: "Shop the sale",
            saleType: "percent",
            saleValue: "10",
            scope: "all",
            categories: [],
            products: [],
            excludeProducts: [],
            pushOnLaunch: true,
            ...defaultDates(),
            ...(fromPreset(loadedPresets, festival) as Required<Pick<FormState, "festival" | "name" | "headline" | "greeting" | "emoji" | "palette">>),
          });
        }
      } catch (err) {
        if (!cancelled) setLoadError(getErrorMessage(err, "Could not load the campaign"));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, searchParams]);

  // Sales so far, for running or finished campaigns
  useEffect(() => {
    if (!campaign || (campaign.state !== "live" && campaign.state !== "ended")) return;
    adminAPI
      .getCampaignStats(campaign._id)
      .then((res) => setStats(res.data.data.stats))
      .catch(() => setStats(null));
  }, [campaign]);

  // Unsaved-changes guard (in-app navigation and closing the tab)
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && !savedRef.current && currentLocation.pathname !== nextLocation.pathname,
  );
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const update = (patch: Partial<FormState>) => {
    setForm((prev) => (prev ? { ...prev, ...patch } : prev));
    setDirty(true);
    if (patch.startsAt !== undefined || patch.endsAt !== undefined) setScheduleError(null);
  };

  /** Switching festival refreshes the look fields the admin hasn't customised */
  const changeFestival = (festival: string) => {
    if (!form || !presets) return;
    const previous = fromPreset(presets, form.festival);
    const next = fromPreset(presets, festival);
    const patch: Partial<FormState> = { festival };
    (["name", "headline", "greeting", "emoji", "palette"] as const).forEach((key) => {
      if (form[key] === previous[key]) (patch as Record<string, unknown>)[key] = next[key];
    });
    update(patch);
  };

  const theme = presets && form ? presets.palettes[form.palette] || presets.palettes.brand : null;

  const saleValueNumber = Number(form?.saleValue) || 0;
  const example = useMemo(() => {
    if (!form || form.saleType === "none" || saleValueNumber <= 0) return null;
    const sample = form.products[0] || { name: "A NPR 1,200 product", price: SAMPLE_PRICE };
    const base = sample.price || SAMPLE_PRICE;
    const raw = form.saleType === "percent" ? base * (1 - saleValueNumber / 100) : base - saleValueNumber;
    const price = Math.max(1, Math.min(base, Math.round(raw)));
    return { name: sample.name, base, price };
  }, [form, saleValueNumber]);

  // Preview data shaped like the storefront's campaign
  const preview: IPublicCampaign | null =
    form && theme
      ? {
          _id: campaign?._id || "new",
          name: form.name,
          slug: campaign?.slug || "preview",
          festival: form.festival,
          headline: form.headline || form.name,
          subheadline: form.subheadline,
          greeting: form.greeting,
          emoji: form.emoji,
          ctaLabel: form.ctaLabel || "Shop the sale",
          bannerDesktop: campaign?.bannerDesktop?.url || null,
          bannerMobile: campaign?.bannerMobile?.url || null,
          startsAt: fromNepalInput(form.startsAt) || new Date().toISOString(),
          endsAt: fromNepalInput(form.endsAt) || new Date(Date.now() + DAY).toISOString(),
          state: "live",
          theme,
          sale: {
            type: form.saleType,
            value: saleValueNumber,
            scope: form.scope,
            label:
              form.saleType === "percent" && saleValueNumber > 0
                ? `${saleValueNumber}% off`
                : form.saleType === "fixed" && saleValueNumber > 0
                  ? `NPR ${saleValueNumber.toLocaleString("en-IN")} off`
                  : null,
            categories: categories
              .filter((c) => form.categories.includes(c._id))
              .map((c) => ({ _id: c._id, name: c.name, slug: c.slug })),
          },
        }
      : null;

  const validate = (form: FormState | null): string | null => {
    if (!form) return "Still loading";
    const saleValueNumber = Number(form.saleValue) || 0;
    if (form.name.trim().length < 2) return "Give the campaign a name";
    if (!form.startsAt || !form.endsAt) return "Choose start and end dates";
    if (Date.parse(fromNepalInput(form.endsAt)) - Date.parse(fromNepalInput(form.startsAt)) < 60 * 60 * 1000) {
      return "The campaign must end at least an hour after it starts";
    }
    if (form.saleType === "percent" && (saleValueNumber < 1 || saleValueNumber > (presets?.maxPercent || 70))) {
      return `Percentage must be between 1 and ${presets?.maxPercent || 70}`;
    }
    if (form.saleType === "fixed" && saleValueNumber <= 0) return "Enter the discount amount";
    if (form.scope === "categories" && form.categories.length === 0) return "Choose at least one category";
    if (form.scope === "products" && form.products.length === 0) return "Add at least one product";
    return null;
  };

  const save = async (status: "draft" | "published", overrides: Partial<FormState> = {}) => {
    if (!formState) return;
    const form: FormState = { ...formState, ...overrides };
    const saleValueNumber = Number(form.saleValue) || 0;
    if (Object.keys(overrides).length) setForm(form);
    const problem = validate(form);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setSaving(status);
    const payload: CampaignPayload = {
      name: form.name.trim(),
      festival: form.festival,
      headline: form.headline.trim() || form.name.trim(),
      subheadline: form.subheadline.trim(),
      greeting: form.greeting.trim(),
      emoji: form.emoji.trim(),
      palette: form.palette,
      ctaLabel: form.ctaLabel.trim() || "Shop the sale",
      startsAt: fromNepalInput(form.startsAt),
      endsAt: fromNepalInput(form.endsAt),
      status,
      sale: {
        type: form.saleType,
        value: form.saleType === "none" ? 0 : saleValueNumber,
        scope: form.scope,
        categories: form.scope === "categories" ? form.categories : [],
        products: form.scope === "products" ? form.products.map((p) => p._id) : [],
        excludeProducts: form.excludeProducts.map((p) => p._id),
      },
      notify: { pushOnLaunch: form.pushOnLaunch },
    };
    try {
      const res = id ? await adminAPI.updateCampaign(id, payload) : await adminAPI.createCampaign(payload);
      const saved = res.data.data.campaign;
      setCampaign(saved);
      setDirty(false);
      toast.success(
        status === "draft"
          ? "Saved as draft"
          : saved.state === "live"
            ? "Campaign is live on the website"
            : `Scheduled — shows on the website ${formatNepalDateTime(saved.startsAt)}`,
      );
      if (!id) {
        savedRef.current = true;
        navigate(`/admin/campaigns/${saved._id}/edit`, { replace: true });
      }
    } catch (err) {
      const message = getErrorMessage(err, "Could not save the campaign");
      if (/overlap/i.test(message)) setScheduleError(message);
      else setError(message);
      toast.error(message);
    } finally {
      setSaving(null);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    save(campaign?.status === "published" ? "published" : "draft");
  };

  const uploadBanner = (variant: "desktop" | "mobile") => async (file: File) => {
    if (!id) return;
    const data = new FormData();
    data.append("image", file);
    try {
      const res = await adminAPI.uploadCampaignBanner(id, variant, data);
      setCampaign(res.data.data.campaign);
      toast.success("Banner uploaded");
    } catch (err) {
      toast.error(getErrorMessage(err, "Upload failed"));
    }
  };

  const removeBanner = (variant: "desktop" | "mobile") => async () => {
    if (!id) return;
    try {
      const res = await adminAPI.deleteCampaignBanner(id, variant);
      setCampaign(res.data.data.campaign);
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not remove the banner"));
    }
  };

  const sendNow = async () => {
    if (!id) return;
    setNotifying(true);
    try {
      const res = await adminAPI.notifyCampaign(id);
      setCampaign(res.data.data.campaign);
      toast.success("Notification sent to app users");
      setConfirmNotify(false);
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not send the notification"));
    } finally {
      setNotifying(false);
    }
  };

  if (loadError) {
    return (
      <EmptyState
        title="Couldn't open this campaign"
        description={loadError}
        actionLabel="Back to campaigns"
        actionLink="/admin/campaigns"
      />
    );
  }

  if (!form || !presets || !theme) {
    return (
      <LoadingRegion label="Loading campaign" className="max-w-6xl mx-auto space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </LoadingRegion>
    );
  }

  const published = campaign?.status === "published";
  const startsInFuture = Boolean(form.startsAt) && Date.parse(fromNepalInput(form.startsAt)) > Date.now() + 60_000;
  const sentAt = campaign?.notify?.sentAt;

  return (
    <form onSubmit={onSubmit} className="max-w-6xl mx-auto pb-24">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div className="min-w-0">
          <Link
            to="/admin/campaigns"
            className="inline-flex items-center gap-1 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Campaigns
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold truncate">
              {form.emoji && <span aria-hidden="true">{form.emoji} </span>}
              {form.name || "New campaign"}
            </h1>
            {campaign && <StateChip state={campaign.state} />}
          </div>
        </div>
        {campaign && (
          <a href={`/?preview=${campaign._id}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary text-sm">
            <Eye className="w-4 h-4" aria-hidden="true" />
            Preview on storefront
          </a>
        )}
      </div>

      {/* Where this campaign stands on the website (always visible, not just a toast) */}
      {campaign && !dirty && (
        <div
          role="status"
          className={`mb-4 rounded-lg border px-4 py-3 text-sm flex flex-wrap items-center gap-x-3 gap-y-2 ${
            campaign.state === "live"
              ? "border-[var(--color-success)]/30 bg-[var(--color-success)]/10"
              : campaign.state === "scheduled"
                ? "border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10"
                : "border-[var(--color-border)] bg-[var(--color-surface-muted)]"
          }`}
        >
          {campaign.state === "live" ? (
            <>
              <CheckCircle2 className="w-5 h-5 text-[var(--color-success)] shrink-0" aria-hidden="true" />
              <p className="flex-1 min-w-[12rem]">
                <strong>Live on the website now.</strong> Ends {formatNepalDateTime(campaign.endsAt)} ({timeLeft(campaign.endsAt)}).
              </p>
              <a href={salePath(campaign.slug)} target="_blank" rel="noopener noreferrer" className="btn btn-secondary text-sm py-1.5">
                <ExternalLink className="w-4 h-4" aria-hidden="true" />
                View on site
              </a>
            </>
          ) : campaign.state === "scheduled" ? (
            <>
              <CalendarClock className="w-5 h-5 text-[var(--color-warning)] shrink-0" aria-hidden="true" />
              <p className="flex-1 min-w-[12rem]">
                <strong>Scheduled — not on the website yet.</strong> It appears automatically on{" "}
                {formatNepalDateTime(campaign.startsAt)} (in {timeUntil(campaign.startsAt)}).
              </p>
              <button
                type="button"
                className="btn btn-primary text-sm py-1.5"
                disabled={Boolean(saving)}
                onClick={() => save("published", { startsAt: nowInput() })}
              >
                <Play className="w-4 h-4" aria-hidden="true" />
                Start now
              </button>
            </>
          ) : campaign.state === "ended" ? (
            <p>
              <strong>Ended</strong> {formatNepalDateTime(campaign.endsAt)}. Change the dates to run it again, or use Duplicate for next year.
            </p>
          ) : (
            <p>
              <strong>Draft — not visible on the website.</strong> Press Publish to show it
              {Date.parse(campaign.startsAt) > Date.now() ? ` from ${formatNepalDateTime(campaign.startsAt)}` : " now"}.
            </p>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mb-4 rounded-lg border border-[var(--color-error)]/30 bg-[var(--color-error)]/10 px-4 py-3 text-sm text-[var(--color-error)]">
          {error}
        </p>
      )}

      <div className="grid lg:grid-cols-[minmax(0,1fr)_24rem] gap-6 items-start">
        <div className="space-y-6">
          {/* Stats */}
          {stats && campaign && (
            <Section title={campaign.state === "live" ? "Sales so far" : "Campaign results"}>
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  ["Orders", String(stats.orders)],
                  ["Items sold", String(stats.units)],
                  ["Revenue", formatPrice(stats.revenue)],
                  ["Customers saved", formatPrice(stats.savings)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg bg-[var(--color-surface-muted)] p-3">
                    <dt className="text-xs text-[var(--color-text-muted)]">{label}</dt>
                    <dd className="text-lg font-bold">{value}</dd>
                  </div>
                ))}
              </dl>
            </Section>
          )}

          {/* 1. Festival & look */}
          <Section title="Festival & look" description="Pick the occasion; the name, greeting, emoji and colours fill in for you.">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field id="festival" label="Festival or event">
                <select id="festival" className="select w-full" value={form.festival} onChange={(e) => changeFestival(e.target.value)}>
                  {Object.entries(presets.festivals).map(([key, preset]) => (
                    <option key={key} value={key}>
                      {preset.emoji} {preset.label} — {preset.monthHint}
                    </option>
                  ))}
                </select>
              </Field>
              <Field id="name" label="Campaign name" hint="Shown on badges, e.g. “Tihar Sale”">
                <input id="name" className="input" maxLength={80} value={form.name} onChange={(e) => update({ name: e.target.value })} />
              </Field>
              <Field id="headline" label="Headline">
                <input id="headline" className="input" maxLength={80} value={form.headline} onChange={(e) => update({ headline: e.target.value })} />
              </Field>
              <Field id="greeting" label="Greeting">
                <input id="greeting" className="input" maxLength={80} value={form.greeting} onChange={(e) => update({ greeting: e.target.value })} />
              </Field>
              <Field id="subheadline" label="Subheading (optional)">
                <input
                  id="subheadline"
                  className="input"
                  maxLength={160}
                  placeholder="e.g. Festive outfits for little ones"
                  value={form.subheadline}
                  onChange={(e) => update({ subheadline: e.target.value })}
                />
              </Field>
              <div className="grid grid-cols-[5rem_1fr] gap-3">
                <Field id="emoji" label="Emoji">
                  <input id="emoji" className="input text-center text-xl" maxLength={16} value={form.emoji} onChange={(e) => update({ emoji: e.target.value })} />
                </Field>
                <Field id="ctaLabel" label="Button text">
                  <input id="ctaLabel" className="input" maxLength={30} value={form.ctaLabel} onChange={(e) => update({ ctaLabel: e.target.value })} />
                </Field>
              </div>
            </div>

            <fieldset>
              <legend className="text-sm font-medium mb-2">Colours</legend>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="radiogroup">
                {Object.entries(presets.palettes).map(([key, palette]) => (
                  <label
                    key={key}
                    className={`cursor-pointer rounded-lg border-2 overflow-hidden text-xs font-medium ${
                      form.palette === key ? "border-[var(--color-primary)]" : "border-transparent"
                    }`}
                  >
                    <input
                      type="radio"
                      name="palette"
                      value={key}
                      checked={form.palette === key}
                      onChange={() => update({ palette: key })}
                      className="sr-only"
                    />
                    <span className="flex items-center justify-between px-2 py-2" style={{ backgroundColor: palette.bg, color: palette.text }}>
                      {palette.label}
                      <span className="w-4 h-4 rounded-full" style={{ backgroundColor: palette.accent }} aria-hidden="true" />
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </Section>

          {/* 2. Banners */}
          <Section
            title="Banners (optional)"
            description="Upload your own festival artwork, or leave empty to use the themed banner shown in the preview."
          >
            <div className="grid sm:grid-cols-[2fr_1fr] gap-4">
              <BannerField
                label="Desktop banner"
                hint="1920 × 640 px, JPG/PNG/WebP, under 3 MB. Keep text in the centre."
                url={campaign?.bannerDesktop?.url}
                aspect="aspect-[3/1]"
                disabled={!campaign}
                onUpload={uploadBanner("desktop")}
                onRemove={removeBanner("desktop")}
              />
              <BannerField
                label="Mobile banner"
                hint="900 × 1100 px, under 3 MB."
                url={campaign?.bannerMobile?.url}
                aspect="aspect-[9/11]"
                disabled={!campaign}
                onUpload={uploadBanner("mobile")}
                onRemove={removeBanner("mobile")}
              />
            </div>
          </Section>

          {/* 3. Schedule */}
          <Section title="Schedule" description="Festival dates change every year — check the calendar. Times are Nepal time.">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field id="startsAt" label="Starts (Nepal time)">
                <div className="flex gap-2">
                  <input
                    id="startsAt"
                    type="datetime-local"
                    className="input flex-1 min-w-0"
                    value={form.startsAt}
                    onChange={(e) => update({ startsAt: e.target.value })}
                    aria-describedby={scheduleError ? "schedule-error start-hint" : "start-hint"}
                  />
                  <button type="button" className="btn btn-secondary text-sm whitespace-nowrap" onClick={() => update({ startsAt: nowInput() })}>
                    Start now
                  </button>
                </div>
              </Field>
              <Field id="endsAt" label="Ends (Nepal time)">
                <input
                  id="endsAt"
                  type="datetime-local"
                  className="input"
                  value={form.endsAt}
                  min={form.startsAt}
                  onChange={(e) => update({ endsAt: e.target.value })}
                  aria-describedby={scheduleError ? "schedule-error" : undefined}
                />
              </Field>
            </div>
            <p id="start-hint" className="text-sm text-[var(--color-text-muted)]">
              {startsInFuture
                ? `Shoppers will see it from ${formatNepalDateTime(fromNepalInput(form.startsAt))} (in ${timeUntil(fromNepalInput(form.startsAt))}), once published.`
                : "Shows on the website as soon as you publish."}
            </p>
            {scheduleError && (
              <p id="schedule-error" role="alert" className="text-sm text-[var(--color-error)]">
                {scheduleError}
              </p>
            )}
          </Section>

          {/* 4. Sale */}
          <Section title="Sale" description="Prices change automatically while the campaign is live and go back when it ends.">
            <fieldset>
              <legend className="sr-only">Discount type</legend>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["none", "No discount (look only)"],
                    ["percent", "% off"],
                    ["fixed", "NPR off"],
                  ] as const
                ).map(([value, label]) => (
                  <label
                    key={value}
                    className={`cursor-pointer rounded-full border px-4 py-1.5 text-sm ${
                      form.saleType === value
                        ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] font-medium"
                        : "border-[var(--color-border-strong)]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="saleType"
                      value={value}
                      checked={form.saleType === value}
                      onChange={() => update({ saleType: value })}
                      className="sr-only"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            {form.saleType !== "none" && (
              <Field
                id="saleValue"
                label={form.saleType === "percent" ? "Percentage off" : "Amount off each item (NPR)"}
                hint={form.saleType === "percent" ? `1–${presets.maxPercent}%. Prices are rounded to whole rupees.` : "Never goes below NPR 1."}
              >
                <input
                  id="saleValue"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={form.saleType === "percent" ? presets.maxPercent : undefined}
                  className="input max-w-[10rem]"
                  value={form.saleValue}
                  onChange={(e) => update({ saleValue: e.target.value })}
                />
              </Field>
            )}

            <fieldset className="space-y-3">
              <legend className="text-sm font-medium mb-1">
                {form.saleType === "none" ? "Products featured on the campaign page" : "Applies to"}
              </legend>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["all", "All products"],
                    ["categories", "Categories"],
                    ["products", "Specific products"],
                  ] as const
                ).map(([value, label]) => (
                  <label
                    key={value}
                    className={`cursor-pointer rounded-full border px-4 py-1.5 text-sm ${
                      form.scope === value
                        ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] font-medium"
                        : "border-[var(--color-border-strong)]"
                    }`}
                  >
                    <input type="radio" name="scope" value={value} checked={form.scope === value} onChange={() => update({ scope: value })} className="sr-only" />
                    {label}
                  </label>
                ))}
              </div>

              {form.scope === "categories" && (
                <div className="flex flex-wrap gap-2" role="group" aria-label="Categories">
                  {categories.map((cat) => {
                    const checked = form.categories.includes(cat._id);
                    return (
                      <label
                        key={cat._id}
                        className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm ${
                          checked ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]" : "border-[var(--color-border)]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={checked}
                          onChange={() =>
                            update({ categories: checked ? form.categories.filter((c) => c !== cat._id) : [...form.categories, cat._id] })
                          }
                        />
                        {cat.name}
                      </label>
                    );
                  })}
                  <p className="w-full text-xs text-[var(--color-text-muted)]">Subcategories are included automatically.</p>
                </div>
              )}

              {form.scope === "products" && (
                <ProductPicker label="Products in the sale" selected={form.products} onChange={(products) => update({ products })} />
              )}

              {form.scope !== "products" && (
                <details className="rounded-lg border border-[var(--color-border)] p-3">
                  <summary className="cursor-pointer text-sm font-medium">
                    Exclude products{form.excludeProducts.length ? ` (${form.excludeProducts.length})` : ""}
                  </summary>
                  <div className="mt-3">
                    <ProductPicker
                      label="Not discounted"
                      selected={form.excludeProducts}
                      onChange={(excludeProducts) => update({ excludeProducts })}
                    />
                  </div>
                </details>
              )}
            </fieldset>

            {example && (
              <p className="rounded-lg bg-[var(--color-surface-muted)] px-4 py-3 text-sm">
                Example: {example.name}{" "}
                <span className="line-through text-[var(--color-text-muted)]">{formatPrice(example.base)}</span> →{" "}
                <strong>{formatPrice(example.price)}</strong>
              </p>
            )}
          </Section>

          {/* 5. Notify */}
          <Section title="Notify customers" description="App users get a push notification (and a bell entry) when the campaign starts.">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1 w-4 h-4 accent-[var(--color-primary)]"
                checked={form.pushOnLaunch}
                onChange={(e) => update({ pushOnLaunch: e.target.checked })}
              />
              <span className="text-sm">
                <span className="font-medium">Send a notification when it goes live</span>
                <span className="block text-[var(--color-text-muted)]">
                  “{[form.emoji, form.headline || form.name].filter(Boolean).join(" ")}” —{" "}
                  {[form.greeting, preview && saleText(preview)].filter(Boolean).join(" ")}
                </span>
              </span>
            </label>
            {sentAt ? (
              <p className="text-sm text-[var(--color-success)]">Notification sent {formatNepalDateTime(sentAt)}.</p>
            ) : (
              published && (
                <button type="button" className="btn btn-secondary text-sm" onClick={() => setConfirmNotify(true)}>
                  <Send className="w-4 h-4" aria-hidden="true" />
                  Send notification now
                </button>
              )
            )}
          </Section>
        </div>

        {/* Live preview */}
        <aside className="lg:sticky lg:top-6 space-y-3" aria-label="Preview">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Preview</h2>
          {preview && (
            <div className="rounded-xl border border-[var(--color-border)] overflow-hidden" inert>
              <div className="px-3 py-1.5 text-xs text-center font-semibold" style={{ backgroundColor: theme.bg, color: theme.text }}>
                {form.emoji} {form.headline || form.name}
                {saleText(preview) ? ` — ${saleText(preview)}` : ""} · <Countdown endsAt={preview.endsAt} showIcon={false} />
              </div>
              <div className="min-h-[26rem] flex flex-col [&>*]:flex-1 [&_h2]:text-3xl">
                <CampaignSlide campaign={preview} priority={false} />
              </div>
            </div>
          )}
          <p className="text-xs text-[var(--color-text-muted)]">
            The bar appears above the header and the banner becomes the first home-page slide while the campaign is live. Prices
            change only when it goes live.
          </p>
        </aside>
      </div>

      {/* Sticky save bar */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-64 z-30 border-t border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur">
        <div className="max-w-6xl mx-auto pl-4 pr-[5.5rem] lg:pl-8 py-3 flex flex-wrap items-center justify-end gap-3">
          {dirty && <span className="text-sm text-[var(--color-text-muted)] mr-auto">Unsaved changes</span>}
          {published ? (
            <>
              <button type="button" className="btn btn-secondary" disabled={Boolean(saving)} onClick={() => save("draft")}>
                Unpublish
              </button>
              <button type="button" className="btn btn-primary" disabled={Boolean(saving)} onClick={() => save("published")}>
                {saving === "published" && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                Save changes
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn btn-secondary" disabled={Boolean(saving)} onClick={() => save("draft")}>
                {saving === "draft" && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                Save draft
              </button>
              <button type="button" className="btn btn-primary" disabled={Boolean(saving)} onClick={() => save("published")}>
                {saving === "published" && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                Publish
              </button>
            </>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={blocker.state === "blocked"}
        onClose={() => blocker.reset?.()}
        onConfirm={() => blocker.proceed?.()}
        title="Discard unsaved changes?"
        message="You've made changes to this campaign that haven't been saved."
        confirmText="Discard changes"
        cancelText="Keep editing"
        variant="warning"
      />
      <ConfirmModal
        isOpen={confirmNotify}
        onClose={() => setConfirmNotify(false)}
        onConfirm={sendNow}
        isLoading={notifying}
        variant="info"
        title="Send the notification now?"
        message="Every app user with notifications on gets it. It won't be sent again when the campaign starts."
        confirmText="Send now"
      />
    </form>
  );
};

export default CampaignEditor;
