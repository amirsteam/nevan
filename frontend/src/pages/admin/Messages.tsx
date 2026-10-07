/**
 * Admin Messages
 * Contact-form messages (stored even when the email copy fails) and
 * newsletter subscribers.
 */
import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Mail, MailOpen, Phone, Reply, Download, Inbox } from "lucide-react";
import toast from "react-hot-toast";
import { adminAPI } from "../../api";
import { Tabs, TabList, TabTrigger, TabContent, Pagination, EmptyState, LoadingRegion, Skeleton } from "../../components/ui";
import { usePageTitle } from "../../hooks/usePageTitle";
import { formatDateTime, getErrorMessage } from "../../utils/helpers";
import type { IContactMessage, ISubscriber } from "../../types";

const PAGE_SIZE = 20;

const ListSkeleton = ({ label }: { label: string }) => (
  <LoadingRegion label={label} className="divide-y divide-[var(--color-border)]">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="p-4 space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-full max-w-md" />
      </div>
    ))}
  </LoadingRegion>
);

// ---------------------------------------------------------------------------
// Contact messages
// ---------------------------------------------------------------------------

const MessagesPanel = () => {
  const [messages, setMessages] = useState<IContactMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getContactMessages({ page, limit: PAGE_SIZE, unread: unreadOnly || undefined });
      setMessages(res.data.data.messages);
      setUnreadCount(res.data.data.unreadCount);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not load messages"));
    } finally {
      setLoading(false);
    }
  }, [page, unreadOnly]);

  useEffect(() => {
    load();
  }, [load]);

  const setRead = async (message: IContactMessage, isRead: boolean) => {
    if (message.isRead === isRead) return;
    // Optimistic: the list and badge update immediately
    setMessages((prev) => prev.map((m) => (m._id === message._id ? { ...m, isRead } : m)));
    setUnreadCount((n) => Math.max(0, n + (isRead ? -1 : 1)));
    try {
      await adminAPI.setContactMessageRead(message._id, isRead);
      window.dispatchEvent(new Event("admin-badges-refresh"));
    } catch (error) {
      setMessages((prev) => prev.map((m) => (m._id === message._id ? { ...m, isRead: !isRead } : m)));
      setUnreadCount((n) => Math.max(0, n + (isRead ? 1 : -1)));
      toast.error(getErrorMessage(error, "Could not update the message"));
    }
  };

  const toggleOpen = (message: IContactMessage) => {
    const opening = openId !== message._id;
    setOpenId(opening ? message._id : null);
    if (opening) setRead(message, true);
  };

  return (
    <div className="card">
      <div className="p-4 border-b border-[var(--color-border)] flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--color-text-muted)]">
          {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
        </p>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(e) => {
              setUnreadOnly(e.target.checked);
              setPage(1);
            }}
            className="w-4 h-4 accent-[var(--color-primary)]"
          />
          Unread only
        </label>
      </div>

      {loading ? (
        <ListSkeleton label="Loading messages" />
      ) : messages.length === 0 ? (
        <EmptyState
          compact
          icon={Inbox}
          headingLevel="h2"
          title={unreadOnly ? "No unread messages" : "No messages yet"}
          description="Messages sent from the Contact page appear here."
        />
      ) : (
        <ul className="divide-y divide-[var(--color-border)]">
          {messages.map((message) => {
            const open = openId === message._id;
            return (
              <li key={message._id} className={message.isRead ? "" : "bg-[var(--color-primary-soft)]/40"}>
                <button
                  type="button"
                  onClick={() => toggleOpen(message)}
                  aria-expanded={open}
                  className="w-full text-left p-4 flex items-start gap-3 hover:bg-[var(--color-surface-muted)] transition-colors"
                >
                  {message.isRead ? (
                    <MailOpen className="w-5 h-5 mt-0.5 shrink-0 text-[var(--color-text-muted)]" aria-hidden="true" />
                  ) : (
                    <Mail className="w-5 h-5 mt-0.5 shrink-0 text-[var(--color-primary)]" aria-hidden="true" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <span className={`truncate ${message.isRead ? "" : "font-semibold"}`}>
                        {message.name}
                        {!message.isRead && <span className="sr-only"> (unread)</span>}
                      </span>
                      <span className="text-xs text-[var(--color-text-muted)] shrink-0">
                        {formatDateTime(message.createdAt)}
                      </span>
                    </span>
                    <span className="block text-sm truncate">{message.subject || "(no subject)"}</span>
                    {!open && (
                      <span className="block text-sm text-[var(--color-text-muted)] truncate">{message.message}</span>
                    )}
                  </span>
                </button>

                {open && (
                  <div className="px-4 pb-4 pl-12 space-y-3">
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.message}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--color-text-muted)]">
                      <span>{message.email}</span>
                      {message.phone && (
                        <a href={`tel:${message.phone}`} className="inline-flex items-center gap-1 hover:text-[var(--color-primary)]">
                          <Phone className="w-3.5 h-3.5" aria-hidden="true" />
                          {message.phone}
                        </a>
                      )}
                      {!message.emailed && <span>Email copy not sent — reply from here</span>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={`mailto:${message.email}?subject=${encodeURIComponent(`Re: ${message.subject || "Your message to Nevan"}`)}`}
                        className="btn btn-primary text-sm"
                      >
                        <Reply className="w-4 h-4" aria-hidden="true" />
                        Reply by email
                      </a>
                      <button type="button" onClick={() => setRead(message, false)} className="btn btn-secondary text-sm">
                        Mark unread
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="p-4 border-t border-[var(--color-border)]">
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Newsletter subscribers
// ---------------------------------------------------------------------------

const SubscribersPanel = () => {
  const [subscribers, setSubscribers] = useState<ISubscriber[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    adminAPI
      .getSubscribers({ page, limit: 50 })
      .then((res) => {
        if (cancelled) return;
        setSubscribers(res.data.data.subscribers);
        setTotalPages(res.data.pagination?.totalPages || 1);
        setTotal(res.data.pagination?.totalItems ?? res.data.data.subscribers.length);
      })
      .catch((error) => toast.error(getErrorMessage(error, "Could not load subscribers")))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [page]);

  // Every page, for pasting into an email tool
  const exportCsv = async () => {
    setExporting(true);
    try {
      const all: ISubscriber[] = [];
      for (let p = 1; ; p++) {
        const res = await adminAPI.getSubscribers({ page: p, limit: 100 });
        all.push(...res.data.data.subscribers);
        if (p >= (res.data.pagination?.totalPages || 1)) break;
      }
      const csv = ["email,source,subscribed", ...all.map((s) => `${s.email},${s.source},${s.createdAt.slice(0, 10)}`)].join("\n");
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(getErrorMessage(error, "Export failed"));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="card">
      <div className="p-4 border-b border-[var(--color-border)] flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--color-text-muted)]">{total} active subscriber{total === 1 ? "" : "s"}</p>
        <button type="button" onClick={exportCsv} disabled={exporting || total === 0} className="btn btn-secondary text-sm">
          <Download className="w-4 h-4" aria-hidden="true" />
          {exporting ? "Exporting…" : "Export CSV"}
        </button>
      </div>

      {loading ? (
        <ListSkeleton label="Loading subscribers" />
      ) : subscribers.length === 0 ? (
        <EmptyState
          compact
          icon={Mail}
          headingLevel="h2"
          title="No subscribers yet"
          description="Sign-ups from the newsletter form on the home page appear here."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-[var(--color-text-muted)]">
                <th scope="col" className="p-4 font-medium">Email</th>
                <th scope="col" className="p-4 font-medium">Source</th>
                <th scope="col" className="p-4 font-medium">Subscribed</th>
              </tr>
            </thead>
            <tbody>
              {subscribers.map((s) => (
                <tr key={s._id} className="border-b border-[var(--color-border)] last:border-0">
                  <td className="p-4 break-all">{s.email}</td>
                  <td className="p-4 capitalize">{s.source}</td>
                  <td className="p-4 text-[var(--color-text-muted)] whitespace-nowrap">{formatDateTime(s.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="p-4 border-t border-[var(--color-border)]">
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------

const Messages = () => {
  usePageTitle("Contact forms");
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "subscribers" ? "subscribers" : "messages";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Contact forms</h1>
        <p className="text-[var(--color-text-muted)]">
          Messages from the Contact page and newsletter sign-ups. Live conversations are in{" "}
          <Link to="/admin/chat" className="text-[var(--color-primary)] hover:underline">
            Live chat
          </Link>
          .
        </p>
      </div>

      <Tabs
        defaultValue="messages"
        value={tab}
        onChange={(value) => setSearchParams(value === "messages" ? {} : { tab: value }, { replace: true })}
      >
        <TabList variant="underline">
          <TabTrigger value="messages" variant="underline">Contact messages</TabTrigger>
          <TabTrigger value="subscribers" variant="underline">Newsletter</TabTrigger>
        </TabList>
        <TabContent value="messages" className="mt-6">
          <MessagesPanel />
        </TabContent>
        <TabContent value="subscribers" className="mt-6">
          <SubscribersPanel />
        </TabContent>
      </Tabs>
    </div>
  );
};

export default Messages;
