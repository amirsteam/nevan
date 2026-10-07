/**
 * Admin Campaigns
 * Festival/event campaigns (Dashain, Tihar, Chhath, Holi, Christmas, …):
 * what's live, what's scheduled, drafts and past campaigns.
 */
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Pencil, Copy, Trash2, ExternalLink, Eye, Megaphone } from "lucide-react";
import toast from "react-hot-toast";
import { adminAPI } from "../../api";
import { ConfirmModal, EmptyState, LoadingRegion, Modal, Skeleton } from "../../components/ui";
import { usePageTitle } from "../../hooks/usePageTitle";
import { formatNepalDateTime } from "../../utils/nepal";
import { getErrorMessage } from "../../utils/helpers";
import { salePath, timeUntil } from "../../utils/campaign";
import type { CampaignState, IAdminCampaign, ICampaignPresets } from "../../types";

const STATE_ORDER: CampaignState[] = ["live", "scheduled", "draft", "ended"];

const STATE_STYLES: Record<CampaignState, { label: string; className: string }> = {
  live: { label: "Live", className: "bg-[var(--color-success)]/15 text-[var(--color-success)]" },
  scheduled: { label: "Scheduled", className: "bg-[var(--color-info)]/15 text-[var(--color-info)]" },
  draft: { label: "Draft", className: "bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]" },
  ended: { label: "Ended", className: "bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]" },
};

export const StateChip = ({ state }: { state: CampaignState }) => (
  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATE_STYLES[state].className}`}>
    {state === "live" && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" aria-hidden="true" />}
    {STATE_STYLES[state].label}
  </span>
);

const Campaigns = () => {
  usePageTitle("Campaigns");
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<IAdminCampaign[]>([]);
  const [presets, setPresets] = useState<ICampaignPresets | null>(null);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [toDelete, setToDelete] = useState<IAdminCampaign | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [list, presetRes] = await Promise.all([adminAPI.getCampaigns(), adminAPI.getCampaignPresets()]);
      setCampaigns(list.data.data.campaigns);
      setPresets(presetRes.data.data);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not load campaigns"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const duplicate = async (campaign: IAdminCampaign) => {
    try {
      const res = await adminAPI.duplicateCampaign(campaign._id);
      toast.success("Copied as a draft — set this year's dates");
      navigate(`/admin/campaigns/${res.data.data.campaign._id}/edit`);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not duplicate the campaign"));
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setBusy(true);
    try {
      await adminAPI.deleteCampaign(toDelete._id);
      toast.success("Campaign deleted");
      setCampaigns((prev) => prev.filter((c) => c._id !== toDelete._id));
      setToDelete(null);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not delete the campaign"));
    } finally {
      setBusy(false);
    }
  };

  const grouped = STATE_ORDER.map((state) => ({ state, items: campaigns.filter((c) => c.state === state) })).filter(
    (g) => g.items.length > 0,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Campaigns</h1>
          <p className="text-[var(--color-text-muted)]">Festival and event sales — Dashain, Tihar, Chhath, Holi, Christmas and more</p>
        </div>
        <button type="button" onClick={() => setPickerOpen(true)} className="btn btn-primary">
          <Plus className="w-5 h-5" aria-hidden="true" />
          New campaign
        </button>
      </div>

      {loading ? (
        <LoadingRegion label="Loading campaigns" className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </LoadingRegion>
      ) : campaigns.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No campaigns yet"
          description="Plan the next festival: pick Dashain, Tihar or another event, set the dates, and choose a discount. The store dresses up and prices change automatically."
          actionLabel="Create your first campaign"
          onAction={() => setPickerOpen(true)}
        />
      ) : (
        grouped.map(({ state, items }) => (
          <section key={state} aria-labelledby={`campaigns-${state}`} className="space-y-3">
            <h2 id={`campaigns-${state}`} className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              {STATE_STYLES[state].label}
            </h2>
            <ul className="space-y-3">
              {items.map((campaign) => (
                <li key={campaign._id} className="card overflow-hidden flex flex-col sm:flex-row">
                  {/* Palette swatch */}
                  <div
                    className="sm:w-28 h-14 sm:h-auto shrink-0 flex items-center justify-center text-3xl"
                    style={{ backgroundColor: campaign.theme.bg, color: campaign.theme.text }}
                    aria-hidden="true"
                  >
                    {campaign.emoji || "✨"}
                  </div>
                  <div className="flex-1 min-w-0 p-4 flex flex-col lg:flex-row lg:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <Link to={`/admin/campaigns/${campaign._id}/edit`} className="font-semibold hover:text-[var(--color-primary)] truncate">
                          {campaign.name}
                        </Link>
                        <StateChip state={campaign.state} />
                        {campaign.saleLabel && (
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-semibold"
                            style={{ backgroundColor: campaign.theme.accent, color: campaign.theme.onAccent }}
                          >
                            {campaign.saleLabel}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[var(--color-text-muted)]">
                        {formatNepalDateTime(campaign.startsAt)} → {formatNepalDateTime(campaign.endsAt)}
                        <span className="sr-only"> Nepal time</span>
                      </p>
                      {campaign.state === "scheduled" && (
                        <p className="text-sm font-medium text-[var(--color-warning)]">
                          Not on the website yet — starts in {timeUntil(campaign.startsAt)}
                        </p>
                      )}
                      {campaign.state === "draft" && (
                        <p className="text-sm text-[var(--color-text-muted)]">Draft — publish it to show it on the website</p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link to={`/admin/campaigns/${campaign._id}/edit`} className="btn btn-secondary text-sm py-1.5">
                        <Pencil className="w-4 h-4" aria-hidden="true" />
                        Edit
                      </Link>
                      {campaign.state === "live" || campaign.state === "ended" ? (
                        <a href={salePath(campaign.slug)} target="_blank" rel="noopener noreferrer" className="btn btn-secondary text-sm py-1.5">
                          <ExternalLink className="w-4 h-4" aria-hidden="true" />
                          View
                        </a>
                      ) : (
                        <a href={`/?preview=${campaign._id}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary text-sm py-1.5">
                          <Eye className="w-4 h-4" aria-hidden="true" />
                          Preview
                        </a>
                      )}
                      <button type="button" onClick={() => duplicate(campaign)} className="btn btn-secondary text-sm py-1.5" title="Copy as a draft dated next year">
                        <Copy className="w-4 h-4" aria-hidden="true" />
                        Duplicate
                      </button>
                      <button
                        type="button"
                        onClick={() => setToDelete(campaign)}
                        className="btn btn-secondary text-sm py-1.5 text-[var(--color-error)]"
                        aria-label={`Delete ${campaign.name}`}
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      {/* Festival picker */}
      <Modal isOpen={pickerOpen} onClose={() => setPickerOpen(false)} title="Which festival or event?" size="lg">
        {presets ? (
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(presets.festivals).map(([key, preset]) => {
              const palette = presets.palettes[preset.palette];
              return (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => navigate(`/admin/campaigns/new?festival=${key}`)}
                    className="w-full h-full text-left rounded-xl border border-[var(--color-border)] overflow-hidden hover:border-[var(--color-primary)] hover:shadow-[var(--shadow-md)] transition"
                  >
                    <span
                      className="flex items-center justify-center h-16 text-3xl"
                      style={{ backgroundColor: palette?.bg, color: palette?.text }}
                      aria-hidden="true"
                    >
                      {preset.emoji}
                    </span>
                    <span className="block p-3">
                      <span className="block font-semibold">{preset.label}</span>
                      <span className="block text-xs text-[var(--color-text-muted)]">{preset.monthHint}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <Skeleton className="h-48 w-full" />
        )}
      </Modal>

      <ConfirmModal
        isOpen={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        isLoading={busy}
        title={`Delete "${toDelete?.name}"?`}
        message={
          toDelete?.state === "live"
            ? "This campaign is live. Deleting it ends the sale immediately and prices go back to normal."
            : "Its banners are deleted too. Orders already placed keep their prices."
        }
        confirmText="Delete campaign"
      />
    </div>
  );
};

export default Campaigns;
