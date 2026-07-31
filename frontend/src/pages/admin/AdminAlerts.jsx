import React, { useState, useEffect } from "react";
import { adminAPI } from "../../services/api";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorAlert from "../../components/ErrorAlert";
import EmptyState from "../../components/EmptyState";
import { useToast } from "../../hooks/useToast";
import Toast from "../../components/Toast";
import {
  Bell, AlertTriangle, Repeat2, XCircle, CheckCheck,
  RefreshCw, Factory, Info, Clock, Mail, MailCheck, List, GitBranch,
} from "lucide-react";

const TYPE_CONFIG = {
  recurring:             { label: "Recurring",   icon: Repeat2,       style: "bg-orange-900/20 border-orange-800", badge: "bg-orange-900/50 text-orange-400", text: "text-orange-300", severity: "Warning"  },
  critical:              { label: "Critical",    icon: AlertTriangle, style: "bg-red-900/20 border-red-800",       badge: "bg-red-900/50 text-red-400",       text: "text-red-300",    severity: "Critical" },
  high_reject:           { label: "High Reject", icon: XCircle,       style: "bg-yellow-900/20 border-yellow-800", badge: "bg-yellow-900/50 text-yellow-400", text: "text-yellow-300", severity: "Warning"  },
  manufacturing_pattern: { label: "Pattern",     icon: Factory,       style: "bg-purple-900/20 border-purple-800", badge: "bg-purple-900/50 text-purple-400", text: "text-purple-300", severity: "Warning"  },
};

const SEV_TABS = [
  { id: "all",      label: "All",      icon: List },
  { id: "Critical", label: "Critical", icon: AlertTriangle },
  { id: "Warning",  label: "Warning",  icon: Bell },
  { id: "timeline", label: "Timeline", icon: GitBranch },
];

export default function AdminAlerts() {
  const { toasts, toast, removeToast } = useToast();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [markingRead, setMarkingRead] = useState(false);
  const [typeFilter, setTypeFilter] = useState("");
  const [sevTab, setSevTab] = useState("all");
  const [emailEnabled] = useState(true); // mock email notification status

  const fetchAlerts = async () => {
    setLoading(true); setError(null);
    try {
      const res = await adminAPI.alerts();
      setAlerts(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load alerts.");
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchAlerts(); }, []);

  const handleMarkAllRead = async () => {
    setMarkingRead(true);
    try {
      await adminAPI.markAlertsRead();
      setAlerts((prev) => prev.map((a) => ({ ...a, is_read: true })));
      toast.success("All alerts marked as read.");
    } catch { toast.error("Failed to mark alerts as read."); }
    finally { setMarkingRead(false); }
  };

  const unread = alerts.filter((a) => !a.is_read).length;
  const types = [...new Set(alerts.map((a) => a.alert_type))];

  // Apply severity tab + type filter
  const filtered = alerts.filter((a) => {
    const cfg = TYPE_CONFIG[a.alert_type] || {};
    if (sevTab === "Critical" && cfg.severity !== "Critical") return false;
    if (sevTab === "Warning"  && cfg.severity !== "Warning")  return false;
    if (typeFilter && a.alert_type !== typeFilter) return false;
    return true;
  });

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <Toast toasts={toasts} removeToast={removeToast} />

      <div className="page-header flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Bell className="w-6 h-6 text-blue-400" />
            Smart Alert Center
            {unread > 0 && (
              <span className="text-sm font-normal bg-red-600 text-white px-2 py-0.5 rounded-full">
                {unread} new
              </span>
            )}
          </h1>
          <p className="page-subtitle">Automated quality control notifications</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Email notification status */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium
                           ${emailEnabled
                             ? "bg-emerald-900/20 border-emerald-800 text-emerald-400"
                             : "bg-slate-700 border-slate-600 text-slate-400"}`}>
            {emailEnabled ? <MailCheck className="w-3.5 h-3.5" /> : <Mail className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Email {emailEnabled ? "On" : "Off"}</span>
          </div>
          {unread > 0 && (
            <button onClick={handleMarkAllRead} disabled={markingRead} className="btn-secondary !px-3 !py-2 text-sm">
              {markingRead ? <LoadingSpinner size="sm" /> : <CheckCheck className="w-4 h-4" />}
              <span className="hidden sm:block">Mark all read</span>
            </button>
          )}
          <button onClick={fetchAlerts} className="btn-secondary !px-3 !py-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Summary stats */}
      {!loading && alerts.length > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { label: "Total",    count: alerts.length,                                                          color: "text-blue-400",   bg: "bg-blue-900/20 border-blue-800/50"   },
            { label: "Unread",   count: unread,                                                                 color: "text-red-400",    bg: "bg-red-900/20 border-red-800/50"     },
            { label: "Critical", count: alerts.filter((a) => TYPE_CONFIG[a.alert_type]?.severity === "Critical").length, color: "text-orange-400", bg: "bg-orange-900/20 border-orange-800/50" },
            { label: "Warning",  count: alerts.filter((a) => TYPE_CONFIG[a.alert_type]?.severity === "Warning").length,  color: "text-amber-400",  bg: "bg-amber-900/20 border-amber-800/50"  },
          ].map(({ label, count, color, bg }) => (
            <div key={label} className={`p-3 rounded-xl border ${bg} text-center`}>
              <p className={`text-xl font-bold ${color}`}>{count}</p>
              <p className="text-slate-500 text-[10px] mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Severity tabs */}
      <div className="flex gap-1 mb-5 p-1 bg-slate-800 border border-slate-700 rounded-xl">
        {SEV_TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => { setSevTab(id); setTypeFilter(""); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold
                        transition-all duration-200
                        ${sevTab === id
                          ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md"
                          : "text-slate-400 hover:text-white hover:bg-slate-700/50"}`}>
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Type filter — only show when not timeline */}
      {sevTab !== "timeline" && types.length > 1 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          <button onClick={() => setTypeFilter("")}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors
                        ${!typeFilter ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-400 hover:text-white"}`}>
            All Types ({filtered.length})
          </button>
          {types.map((t) => {
            const cfg = TYPE_CONFIG[t] || {};
            const count = alerts.filter((a) => a.alert_type === t).length;
            return (
              <button key={t} onClick={() => setTypeFilter(t)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors
                            ${typeFilter === t ? "bg-slate-600 text-white" : "bg-slate-700 text-slate-400 hover:text-white"}`}>
                {cfg.label || t} ({count})
              </button>
            );
          })}
        </div>
      )}

      {error && <div className="mb-6"><ErrorAlert message={error} onRetry={fetchAlerts} /></div>}

      {loading ? (
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" text="Loading alerts…" /></div>
      ) : sevTab === "timeline" ? (
        <AlertTimeline alerts={alerts} />
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState title="No alerts"
            description="Smart alerts appear when recurring defects, critical issues, high rejection rates, or manufacturing patterns are detected."
            icon={Bell} />
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((alert) => {
            const cfg = TYPE_CONFIG[alert.alert_type] || { label: alert.alert_type, icon: Bell, style: "bg-slate-800 border-slate-700", badge: "bg-slate-700 text-slate-400", text: "text-slate-300" };
            const Icon = cfg.icon;
            return (
              <div key={alert.id}
                className={`border rounded-xl p-4 flex items-start gap-3 transition-opacity
                             ${!alert.is_read ? cfg.style : "bg-slate-800 border-slate-700 opacity-60"}`}>
                <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${cfg.text}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>
                      {cfg.label}
                    </span>
                    {!alert.is_read && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
                    {alert.product?.product_name && (
                      <span className="text-xs text-slate-400">{alert.product.product_name}</span>
                    )}
                    {emailEnabled && !alert.is_read && (
                      <span className="text-[10px] text-emerald-400 flex items-center gap-0.5">
                        <MailCheck className="w-3 h-3" /> notified
                      </span>
                    )}
                  </div>
                  <p className={`text-sm leading-relaxed ${cfg.text}`}>{alert.message}</p>
                  <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />{new Date(alert.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Timeline view ──────────────────────────────────────────────────── */
function AlertTimeline({ alerts }) {
  if (alerts.length === 0) {
    return (
      <div className="card">
        <EmptyState title="No alerts in timeline" icon={Bell} />
      </div>
    );
  }

  // Group by date
  const grouped = {};
  alerts.forEach((a) => {
    const day = new Date(a.created_at).toLocaleDateString(undefined, { weekday:"long", year:"numeric", month:"short", day:"numeric" });
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(a);
  });

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([day, items]) => (
        <div key={day}>
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px flex-1 bg-slate-700" />
            <span className="text-xs font-semibold text-slate-400 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
              {day}
            </span>
            <div className="h-px flex-1 bg-slate-700" />
          </div>
          <div className="relative pl-6 space-y-3">
            <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-slate-700" />
            {items.map((a) => {
              const cfg = TYPE_CONFIG[a.alert_type] || { label: a.alert_type, icon: Bell, text: "text-slate-400", badge: "bg-slate-700 text-slate-400" };
              const Icon = cfg.icon;
              return (
                <div key={a.id} className="relative">
                  <div className={`absolute -left-4 top-3 w-3 h-3 rounded-full border-2 border-slate-900
                                   ${a.is_read ? "bg-slate-600" : cfg.severity === "Critical" ? "bg-red-500" : "bg-amber-400"}`} />
                  <div className={`border rounded-xl p-3 ${!a.is_read ? "bg-slate-800 border-slate-600" : "bg-slate-800/40 border-slate-700/40 opacity-60"}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`w-3.5 h-3.5 ${cfg.text}`} />
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
                      <span className="text-xs text-slate-500 ml-auto">
                        {new Date(a.created_at).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })}
                      </span>
                    </div>
                    <p className={`text-sm ${cfg.text}`}>{a.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
