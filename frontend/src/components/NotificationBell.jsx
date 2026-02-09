/**
 * NotificationBell Component
 * Dropdown bell icon for web header — shows unread count + notification list
 */
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check, CheckCheck, Trash2, Package, CreditCard, Tag, Loader2 } from "lucide-react";
import { notificationsAPI } from "../api/notifications";

const ICON_MAP = {
  order: Package,
  payment: CreditCard,
  promotion: Tag,
};

const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Fetch unread count on mount + polling every 30s
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await notificationsAPI.getUnreadCount();
        setUnreadCount(res.data?.unreadCount || 0);
      } catch {
        // silently fail — user may not be auth'd
      }
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch full list when dropdown opens
  useEffect(() => {
    if (!open) return;
    const fetchNotifications = async () => {
      setLoading(true);
      try {
        const res = await notificationsAPI.getNotifications(1, 10);
        setNotifications(res.data?.notifications || []);
        setUnreadCount(res.data?.unreadCount || 0);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
  }, [open]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await notificationsAPI.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {}
  };

  const handleDelete = async (id) => {
    try {
      const wasUnread = notifications.find((n) => n._id === id && !n.isRead);
      await notificationsAPI.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  };

  const handleNotificationClick = (notification) => {
    if (!notification.isRead) handleMarkAsRead(notification._id);

    // Navigate based on type
    if (notification.type === "order" && notification.metadata?.orderId) {
      navigate(`/orders/${notification.metadata.orderId}`);
    }
    setOpen(false);
  };

  const timeAgo = (date) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 hover:bg-[var(--color-bg)] rounded-lg transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-[var(--color-error)] text-white text-xs rounded-full flex items-center justify-center font-medium">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xl z-50 max-h-[480px] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
            <h3 className="font-semibold text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-[var(--color-primary)] hover:underline flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-[var(--color-primary)]" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8 text-[var(--color-text-muted)] text-sm">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => {
                const Icon = ICON_MAP[n.type] || Bell;
                return (
                  <div
                    key={n._id}
                    className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-[var(--color-bg)] transition-colors border-b border-[var(--color-border)] last:border-b-0 ${
                      !n.isRead ? "bg-[var(--color-primary-light)]/5" : ""
                    }`}
                    onClick={() => handleNotificationClick(n)}
                  >
                    <div
                      className={`mt-0.5 p-1.5 rounded-full flex-shrink-0 ${
                        !n.isRead
                          ? "bg-[var(--color-primary-light)]/20 text-[var(--color-primary)]"
                          : "bg-[var(--color-bg)] text-[var(--color-text-muted)]"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm leading-snug ${
                          !n.isRead ? "font-medium" : "text-[var(--color-text-muted)]"
                        }`}
                      >
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5 line-clamp-2">
                          {n.body}
                        </p>
                      )}
                      <p className="text-xs text-[var(--color-text-muted)] mt-1">
                        {timeAgo(n.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!n.isRead && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(n._id);
                          }}
                          className="p-1 hover:bg-[var(--color-border)] rounded"
                          title="Mark as read"
                        >
                          <Check className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(n._id);
                        }}
                        className="p-1 hover:bg-[var(--color-border)] rounded"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
