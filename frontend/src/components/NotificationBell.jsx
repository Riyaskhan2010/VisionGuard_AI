import React, { useState, useEffect, useRef } from "react";
import { Bell, CheckCheck, X, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { notificationAPI } from "../services/api";

const TYPE_ICON = {
  approved:     <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />,
  rejected:     <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />,
  reinspection: <RefreshCw className="w-4 h-4 text-amber-400 flex-shrink-0" />,
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  const fetchCount = async () => {
    try {
      const res = await notificationAPI.unreadCount();
      setUnread(res.data.data?.unread || 0);
    } catch { /* silent */ }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await notificationAPI.list({ per_page: 15 });
      setNotifications(res.data.data?.notifications || []);
      setUnread(res.data.data?.unread || 0);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnread(0);
    } catch { /* silent */ }
  };

  // Poll unread count every 30s
  useEffect(() => {
    fetchCount();
    const iv = setInterval(fetchCount, 30000);
    return () => clearInterval(iv);
  }, []);

  // Open → fetch full list
  useEffect(() => {
    if (open) fetchNotifications();
  }, [open]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-slate-400 hover:text-white hover:bg-slate-700
                   rounded-lg transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white
                           text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-slate-800 border border-slate-700
                        rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-blue-400" />
              <span className="font-semibold text-white text-sm">Notifications</span>
              {unread > 0 && (
                <span className="text-xs bg-red-600 text-white px-1.5 py-0.5 rounded-full font-medium">
                  {unread}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded"
                  title="Mark all read"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                No notifications
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-slate-700/50
                              transition-colors
                              ${!n.is_read ? "bg-slate-700/30" : "opacity-60"}`}
                >
                  <div className="mt-0.5">{TYPE_ICON[n.type] || <Bell className="w-4 h-4 text-slate-400 flex-shrink-0" />}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white leading-tight">{n.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{n.message}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </div>
                  {!n.is_read && (
                    <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
