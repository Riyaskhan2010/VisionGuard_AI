import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminAPI, analysisAPI } from "../../services/api";
import StatCard from "../../components/StatCard";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorAlert from "../../components/ErrorAlert";
import FactoryHealthSection from "../../components/FactoryHealthSection";
import {
  Activity, Clock, CheckCircle, XCircle, AlertTriangle,
  RefreshCw, ArrowRight, Shield, Repeat2, Bot, Award,
  TrendingUp, Users, Zap,
} from "lucide-react";

const ALERT_TYPE_CONFIG = {
  recurring:            { color: "bg-orange-900/20 border-orange-800", text: "text-orange-300", badge: "bg-orange-900/50 text-orange-400" },
  critical:             { color: "bg-red-900/20 border-red-800",       text: "text-red-300",    badge: "bg-red-900/50 text-red-400" },
  high_reject:          { color: "bg-yellow-900/20 border-yellow-800", text: "text-yellow-300", badge: "bg-yellow-900/50 text-yellow-400" },
  manufacturing_pattern:{ color: "bg-purple-900/20 border-purple-800", text: "text-purple-300", badge: "bg-purple-900/50 text-purple-400" },
};

export default function AdminDashboard() {
  const [summary, setSummary] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true); setError(null);
    try {
      const [summaryRes, alertsRes, workersRes] = await Promise.all([
        adminAPI.dashboard(),
        adminAPI.alerts(),
        adminAPI.workerPerformance(),
      ]);
      setSummary(summaryRes.data.data);
      setAlerts((alertsRes.data.data || []).slice(0, 6));
      setWorkers((workersRes.data.data || []).slice(0, 4));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load dashboard.");
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div className="animate-fade-in">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Shield className="w-6 h-6 text-purple-400" />Admin Dashboard
          </h1>
          <p className="page-subtitle">Quality control command center</p>
        </div>
        <button onClick={fetchData} className="btn-secondary !px-3 !py-2">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error && <div className="mb-6"><ErrorAlert message={error} onRetry={fetchData} /></div>}

      {loading ? (
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" text="Loading dashboard…" /></div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-4 mb-8">
            <div className="xl:col-span-1"><StatCard title="Total" value={summary?.total} icon={Activity} color="blue" /></div>
            <div className="xl:col-span-1"><StatCard title="Pending" value={summary?.pending} icon={Clock} color="yellow" /></div>
            <div className="xl:col-span-1"><StatCard title="Approved" value={summary?.approved} icon={CheckCircle} color="green" /></div>
            <div className="xl:col-span-1"><StatCard title="Rejected" value={summary?.rejected} icon={XCircle} color="red" /></div>
            <div className="xl:col-span-1"><StatCard title="Critical" value={summary?.critical} icon={AlertTriangle} color="orange" /></div>
            <div className="xl:col-span-1"><StatCard title="Recurring" value={summary?.recurring} icon={Repeat2} color="purple" /></div>
            <div className="xl:col-span-1"><StatCard title="AI Accuracy" value={`${summary?.ai_accuracy ?? 0}%`} icon={Bot} color="green" /></div>
            <div className="xl:col-span-1"><StatCard title="Avg Quality" value={summary?.avg_quality_score ? `${summary.avg_quality_score}` : "—"} icon={Award} color="blue" /></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Quick actions */}
            <div className="card">
              <h2 className="font-semibold text-white mb-4">Quick Actions</h2>
              <div className="space-y-2">
                {[
                  { to: "/admin/inspections?status=Pending", label: "Review Pending",    count: summary?.pending,       color: "amber" },
                  { to: "/admin/inspections",               label: "All Inspections",   count: summary?.total,         color: "blue" },
                  { to: "/admin/workers",                   label: "Manage Workers",    count: null,                   color: "purple" },
                  { to: "/admin/analytics",                 label: "Analytics",         count: null,                   color: "green" },
                  { to: "/admin/alerts",                    label: "Smart Alerts",      count: summary?.unread_alerts, color: "red" },
                ].map(({ to, label, count, color }) => (
                  <Link key={to + label} to={to}
                    className="flex items-center justify-between p-3 rounded-xl
                               bg-slate-700/30 hover:bg-slate-700/60 transition-colors group">
                    <span className="text-sm text-slate-300 group-hover:text-white">{label}</span>
                    <div className="flex items-center gap-2">
                      {count != null && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full
                          bg-${color}-900/50 text-${color}-400`}>{count}</span>
                      )}
                      <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Recent alerts */}
            <div className="card lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-white">Recent Alerts</h2>
                <Link to="/admin/alerts" className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1">
                  View all <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              {alerts.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-8">No alerts</p>
              ) : (
                <div className="space-y-2">
                  {alerts.map((a) => {
                    const cfg = ALERT_TYPE_CONFIG[a.alert_type] || ALERT_TYPE_CONFIG.critical;
                    return (
                      <div key={a.id} className={`flex items-start gap-2 p-2.5 rounded-lg border
                                                   ${!a.is_read ? cfg.color : "border-slate-700 opacity-60"}`}>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 mt-0.5 ${cfg.badge}`}>
                          {a.alert_type?.replace("_", " ")}
                        </span>
                        <p className={`text-xs flex-1 leading-relaxed ${cfg.text}`}>{a.message}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Factory Health Dashboard */}
          <FactoryHealthSection />

          {/* Worker Performance snapshot */}
          {workers.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-400" /> Worker Performance
                </h2>
                <Link to="/admin/workers" className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1">
                  View all <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {workers.map((w) => (
                  <div key={w.worker_id} className="p-4 bg-slate-700/30 rounded-xl border border-slate-700">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600
                                      flex items-center justify-center text-xs font-bold text-white">
                        {w.worker_name[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{w.worker_name}</p>
                        <p className="text-xs text-slate-400 truncate">{w.department || "—"}</p>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Approval Rate</span>
                        <span className={`font-semibold ${w.approval_rate >= 80 ? "text-emerald-400" : w.approval_rate >= 60 ? "text-amber-400" : "text-red-400"}`}>
                          {w.approval_rate}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500
                          ${w.approval_rate >= 80 ? "bg-emerald-500" : w.approval_rate >= 60 ? "bg-amber-500" : "bg-red-500"}`}
                          style={{ width: `${w.approval_rate}%` }} />
                      </div>
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>{w.total} inspections</span>
                        <span>Today: {w.today_count}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Dashboard Widgets Row ── */}
          <DashboardWidgets summary={summary} workers={workers} alerts={alerts} />
        </>
      )}
    </div>
  );
}

/* ── Dashboard Widgets ──────────────────────────────────────────────── */
function DashboardWidgets({ summary, workers, alerts }) {
  const [machineData, setMachineData] = React.useState(null);
  const [recentInspections, setRecentInspections] = React.useState([]);

  React.useEffect(() => {
    analysisAPI.machineHealth()
      .then((r) => setMachineData(r.data.data))
      .catch(() => {});
    adminAPI.inspections({ per_page: 5, page: 1 })
      .then((r) => setRecentInspections(r.data.data?.inspections || []))
      .catch(() => {});
  }, []);

  const topWorker = workers.length > 0
    ? workers.reduce((best, w) => (!best || w.approval_rate > best.approval_rate ? w : best), null)
    : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4 mt-6">
      {/* Recent Inspections widget */}
      <div className="card lg:col-span-2">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-white flex items-center gap-2 text-sm">
            <Activity className="w-4 h-4 text-blue-400" /> Recent Inspections
          </h3>
          <Link to="/admin/inspections" className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {recentInspections.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-4">No inspections yet</p>
        ) : (
          <div className="space-y-2">
            {recentInspections.map((ins) => (
              <div key={ins.id} className="flex items-center gap-3 p-2.5 bg-slate-700/30 rounded-xl border border-slate-700/40">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{ins.product?.product_name || "Unknown"}</p>
                  <p className="text-[10px] text-slate-500">{ins.worker?.name} · {new Date(ins.created_at).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full
                  ${ins.status === "Approved" ? "bg-emerald-900/50 text-emerald-400"
                    : ins.status === "Rejected" ? "bg-red-900/50 text-red-400"
                    : "bg-amber-900/50 text-amber-400"}`}>
                  {ins.status}
                </span>
                <span className="text-[10px] text-slate-400 capitalize">{(ins.defect || "none").replace("_"," ")}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Machine Health widget */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-white flex items-center gap-2 text-sm">
            <Zap className="w-4 h-4 text-amber-400" /> Machine Health
          </h3>
          <Link to="/admin/factory" className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1">
            Details <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {!machineData ? (
          <div className="flex justify-center py-4"><div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="space-y-2">
            <div className="flex justify-around text-center mb-2">
              {[
                { label: "Healthy",  count: machineData.healthy_count,  color: "text-emerald-400" },
                { label: "Warning",  count: machineData.warning_count,   color: "text-amber-400"  },
                { label: "Critical", count: machineData.critical_count,  color: "text-red-400"    },
              ].map(({ label, count, color }) => (
                <div key={label}>
                  <p className={`text-lg font-bold ${color}`}>{count}</p>
                  <p className="text-[10px] text-slate-500">{label}</p>
                </div>
              ))}
            </div>
            {machineData.machines.slice(0, 4).map((m) => (
              <div key={m.id} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${m.health_status === "Healthy" ? "bg-emerald-400" : m.health_status === "Warning" ? "bg-amber-400" : "bg-red-400"}`} />
                <p className="text-xs text-slate-300 flex-1 truncate">{m.name}</p>
                <span className="text-xs font-semibold text-slate-400">{m.health_score}%</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top Worker + Failure Prediction combined widget */}
      <div className="card flex flex-col gap-4">
        {/* Top Performing Worker */}
        {topWorker && (
          <div>
            <h3 className="font-semibold text-white flex items-center gap-2 text-sm mb-3">
              <Award className="w-4 h-4 text-yellow-400" /> Top Performer
            </h3>
            <div className="flex items-center gap-3 p-3 bg-yellow-900/10 border border-yellow-800/30 rounded-xl">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500
                              flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                {topWorker.worker_name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{topWorker.worker_name}</p>
                <p className="text-xs text-slate-400">{topWorker.department || "—"}</p>
                <p className="text-xs text-yellow-400 font-semibold">{topWorker.approval_rate}% approval</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-blue-400">{topWorker.total}</p>
                <p className="text-[10px] text-slate-500">total</p>
              </div>
            </div>
          </div>
        )}

        {/* Failure Prediction mini */}
        <div className="border-t border-slate-700 pt-3">
          <h3 className="font-semibold text-white flex items-center gap-2 text-sm mb-3">
            <AlertTriangle className="w-4 h-4 text-orange-400" /> Failure Prediction
          </h3>
          <div className="space-y-2">
            {[
              { label: "Critical Defects",    value: summary?.critical || 0,   risk: summary?.critical > 5 ? "High" : summary?.critical > 2 ? "Medium" : "Low" },
              { label: "Pending Reviews",     value: summary?.pending  || 0,   risk: summary?.pending  > 10 ? "High" : summary?.pending > 5 ? "Medium" : "Low" },
              { label: "Recurring Patterns",  value: summary?.recurring || 0,  risk: summary?.recurring > 3 ? "High" : summary?.recurring > 1 ? "Medium" : "Low" },
            ].map(({ label, value, risk }) => (
              <div key={label} className="flex items-center justify-between">
                <p className="text-xs text-slate-400">{label}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">{value}</span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded
                    ${risk === "High" ? "bg-red-900/50 text-red-400" : risk === "Medium" ? "bg-amber-900/50 text-amber-400" : "bg-emerald-900/50 text-emerald-400"}`}>
                    {risk}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
