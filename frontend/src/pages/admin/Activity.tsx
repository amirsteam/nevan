/**
 * Admin Activity (/admin/activity)
 * Who changed what: roles and account status, refunds, cash collected,
 * product and category deletes, shipping and campaign changes. Order status
 * changes stay in each order's history.
 */
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { History, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { adminAPI } from "../../api";
import { EmptyState, LoadingRegion, Skeleton } from "../../components/ui";
import { usePageTitle } from "../../hooks/usePageTitle";
import { formatDateTime, getErrorMessage } from "../../utils/helpers";
import type { IAdminLogEntry } from "../../types";

const PAGE_SIZE = 30;

const ACTION_LABELS: Record<string, string> = {
  "user.activated": "Activated account",
  "user.deactivated": "Deactivated account",
  "user.role": "Changed role",
  "user.two_factor_reset": "Reset two-step login",
  "order.refund": "Recorded refund",
  "order.cash_collected": "Marked cash collected",
  "product.deleted": "Deleted product",
  "product.archived": "Archived product",
  "category.deleted": "Deleted category",
  "shipping.updated": "Changed shipping settings",
  "campaign.created": "Created campaign",
  "campaign.updated": "Saved campaign",
  "campaign.deleted": "Deleted campaign",
  "campaign.notified": "Sent campaign notification",
};

/** Where the thing the action was about can be opened, if it still exists */
const targetLink = (entry: IAdminLogEntry): string | null => {
  const { type, id } = entry.target;
  if (!id) return type === "shipping" ? "/admin/shipping" : null;
  if (type === "order") return `/admin/orders?order=${id}`;
  if (type === "product" && entry.action === "product.archived") return `/admin/products/${id}/edit`;
  if (type === "campaign" && entry.action !== "campaign.deleted") return `/admin/campaigns/${id}/edit`;
  return null;
};

const Activity = () => {
  usePageTitle("Activity");
  const [entries, setEntries] = useState<IAdminLogEntry[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async (nextPage: number) => {
    try {
      const res = await adminAPI.getActivity({ page: nextPage, limit: PAGE_SIZE });
      const { entries: rows } = res.data.data;
      setEntries((prev) => (nextPage === 1 ? rows : [...prev, ...rows]));
      setTotalPages(res.data.pagination?.totalPages || 1);
      setPage(nextPage);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not load activity"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(1);
  }, [load]);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Activity</h1>
        <p className="text-[var(--color-text-muted)]">
          Changes made by admins in the last year. Order status changes are in each order's history.
        </p>
      </div>

      {loading ? (
        <LoadingRegion label="Loading activity" className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </LoadingRegion>
      ) : entries.length === 0 ? (
        <EmptyState icon={History} title="No activity yet" description="Role changes, refunds, deletes and settings changes will show up here." />
      ) : (
        <>
          <ol className="card divide-y divide-[var(--color-border)]">
            {entries.map((entry) => {
              const link = targetLink(entry);
              return (
                <li key={entry._id} className="p-4 flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
                  <time dateTime={entry.createdAt} className="text-xs text-[var(--color-text-muted)] sm:w-40 shrink-0 sm:pt-0.5">
                    {formatDateTime(entry.createdAt)}
                  </time>
                  <div className="min-w-0 text-sm">
                    <p>
                      <span className="font-medium">{entry.adminName || "An admin"}</span>{" "}
                      {(ACTION_LABELS[entry.action] || entry.action).toLowerCase()}
                      {entry.target.label && (
                        <>
                          {" "}
                          {link ? (
                            <Link to={link} className="font-medium text-[var(--color-primary)] hover:underline">
                              {entry.target.label}
                            </Link>
                          ) : (
                            <span className="font-medium">{entry.target.label}</span>
                          )}
                        </>
                      )}
                    </p>
                    {entry.details && <p className="text-[var(--color-text-muted)] mt-0.5 break-words">{entry.details}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
          {page < totalPages && (
            <div className="flex justify-center">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={loadingMore}
                onClick={async () => {
                  setLoadingMore(true);
                  await load(page + 1);
                  setLoadingMore(false);
                }}
              >
                {loadingMore && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                Show older
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Activity;
