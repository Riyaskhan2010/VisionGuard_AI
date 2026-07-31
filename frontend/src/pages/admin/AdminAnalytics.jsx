import React, { useEffect, useState } from "react";
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend, Filler,
} from "chart.js";
import { Bar, Line, Doughnut } from "react-chartjs-2";
import { adminAPI, authAPI } from "../../services/api";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorAlert from "../../components/ErrorAlert";
import StatCard from "../../components/StatCard";
import Modal from "../../components/Modal";
import PredictiveSection from "../../components/PredictiveSection";
import { inspectionAPI } from "../../services/api";
import {
  BarChart3, TrendingUp, RefreshCw, Bot, UserCheck,
  GitBranch, AlertTriangle, Shield, CheckCircle,
} from "lucide-react";

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend, Filler
);

const GRID_COLOR = "#1e293b";
const TICK_COLOR = "#64748b";
const LEGEND_COLOR = "#94a3b8";

const BASE_OPTS = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { labels: { color: LEGEND_COLOR, font: { size: 11 } } } },
  scales: {
    x: { ticks: { color: TICK_COLOR }, grid: { color: GRID_COLOR } },
    y: { ticks: { color: TICK_COLOR }, grid: { color: GRID_COLOR } },
  },
};

const NO_LEGEND = { ...BASE_OPTS, plugins: { legend: { display: false } } };

const PERIOD_OPTS = [
  { value: "daily", label: "Daily (14d)" },
  { value: "weekly", label: "Weekly (12w)" },
  { value: "monthly", label: "Monthly (12mo)" },
];

export default function AdminAnalytics() {
  const [data, setData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState("daily");
  const [timelineProduct, setTimelineProduct] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [patternAlerts, setPatternAlerts] = useState([]);

  const fetchData = async () => {
    setLoading(true); setError(null);
    try {
      const [analyticsRes, summaryRes, productsRes, patternRes] = await Promise.all([
        adminAPI.analytics(),
        adminAPI.dashboard(),
        authAPI.products(),
        adminAPI.patternAlerts(),
      ]);
      setData(analyticsRes.data.data);
      setSummary(summaryRes.data.data);
      setProducts(productsRes.data.data || []);
      setPatternAlerts(patternRes.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load analytics.");
    } finally { setLoading(false); }
  };

  const fetchTimeline = async (productId) => {
    setTimelineLoading(true);
    try {
      const res = await adminAPI.timeline(productId);
      setTimeline(res.data.data || []);
    } catch { setTimeline([]); }
    finally { setTimelineLoading(false); }
  };

  const handleResolvePattern = async (id) => {
    try {
      await adminAPI.resolvePattern(id);
      setPatternAlerts((prev) => prev.filter((p) => p.id !== id));
    } catch { /* silent */ }
  };

  useEffect(() => { fetchData(); }, []);

  // ── Chart builders ────────────────────────────────────────────────────────
  const trendData = () => {
    const map = { daily: data?.daily_trend, weekly: data?.weekly_trend, monthly: data?.monthly_trend };
    const trend = map[period] || [];
    const labelKey = period === "daily" ? "date" : period === "weekly" ? "week" : "month";
    return {
      labels: trend.map((d) => d[labelKey]),
      datasets: [{
        label: "Inspections",
        data: trend.map((d) => d.count),
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59,130,246,0.15)",
        fill: true, tension: 0.4,
        pointBackgroundColor: "#3b82f6", pointRadius: 4,
      }],
    };
  };

  const statusTrendData = () => {
    const trend = data?.status_trend || [];
    return {
      labels: trend.map((d) => d.date),
      datasets: [
        { label: "Approved", data: trend.map((d) => d.Approved || 0), backgroundColor: "rgba(16,185,129,0.75)", borderRadius: 4, borderWidth: 0 },
        { label: "Rejected", data: trend.map((d) => d.Rejected || 0), backgroundColor: "rgba(239,68,68,0.75)", borderRadius: 4, borderWidth: 0 },
      ],
    };
  };

  const severityData = () => {
    const dist = data?.severity_distribution || [];
    return {
      labels: dist.map((d) => d.severity || "Unknown"),
      datasets: [{
        data: dist.map((d) => d.count),
        backgroundColor: ["#ef4444","#eab308","#3b82f6","#10b981","#6b7280"],
        borderWidth: 0, hoverOffset: 6,
      }],
    };
  };

  const defectData = () => {
    const dist = data?.defect_distribution || [];
    const colors = { crack:"#ef4444", scratch:"#eab308", dent:"#3b82f6", missing_component:"#a855f7", surface_damage:"#f97316", burn_mark:"#f43f5e", none:"#10b981" };
    return {
      labels: dist.map((d) => (d.defect || "none").replace("_"," ")),
      datasets: [{
        label: "Count",
        data: dist.map((d) => d.count),
        backgroundColor: dist.map((d) => colors[d.defect] || "#6b7280"),
        borderRadius: 6, borderWidth: 0,
      }],
    };
  };

  const workerData = () => {
    const wp = data?.worker_performance || [];
    return {
      labels: wp.map((w) => w.worker_name),
      datasets: [
        { label: "Approved", data: wp.map((w) => w.approved), backgroundColor: "rgba(16,185,129,0.75)", borderRadius: 4, borderWidth: 0 },
        { label: "Rejected", data: wp.map((w) => w.rejected), backgroundColor: "rgba(239,68,68,0.75)", borderRadius: 4, borderWidth: 0 },
        { label: "Pending",  data: wp.map((w) => w.pending),  backgroundColor: "rgba(245,158,11,0.75)", borderRadius: 4, borderWidth: 0 },
      ],
    };
  };

  const hv = data?.human_validation || {};

  return (
    <div className="animate-fade-in">
      <div className="page-header flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-400" /> Analytics
          </h1>
          <p className="page-subtitle">Industrial Quality Intelligence Engine</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={period} onChange={(e) => setPeriod(e.target.value)} className="input !w-auto text-sm !py-2">
            {PERIOD_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button onClick={fetchData} className="btn-secondary !px-3 !py-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {error && <div className="mb-6"><ErrorAlert message={error} onRetry={fetchData} /></div>}

      {loading ? (
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" text="Loading analytics…" /></div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard title="Total Inspections" value={summary?.total} icon={BarChart3} color="blue" />
            <StatCard title="AI Accuracy" value={`${hv.accuracy_percentage ?? 0}%`} icon={Bot} color="green" />
            <StatCard title="Manual Corrections" value={hv.manual_corrections ?? 0} icon={UserCheck} color="yellow" />
            <StatCard title="Critical Defects" value={summary?.critical ?? 0} icon={AlertTriangle} color="red" />
          </div>

          {/* Trend + Status */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="card">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                Inspection Trend
              </h3>
              <div className="h-56">
                {(trendData().labels || []).length === 0
                  ? <EmptyChart /> : <Line data={trendData()} options={BASE_OPTS} />}
              </div>
            </div>
            <div className="card">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-400" /> Approval vs Rejection
              </h3>
              <div className="h-56">
                {(data?.status_trend || []).length === 0
                  ? <EmptyChart /> : <Bar data={statusTrendData()} options={{
                    ...BASE_OPTS,
                    scales: { x: { stacked: true, ticks: { color: TICK_COLOR }, grid: { color: GRID_COLOR } },
                              y: { stacked: true, ticks: { color: TICK_COLOR }, grid: { color: GRID_COLOR } } },
                  }} />}
              </div>
            </div>
            <div className="card">
              <h3 className="font-semibold text-white mb-4">Severity Distribution</h3>
              <div className="h-56 flex items-center justify-center">
                {(data?.severity_distribution || []).length === 0
                  ? <EmptyChart /> : <Doughnut data={severityData()} options={{
                    responsive: true, maintainAspectRatio: false, cutout: "62%",
                    plugins: { legend: { position: "right", labels: { color: LEGEND_COLOR, font: { size: 11 } } } },
                  }} />}
              </div>
            </div>
            <div className="card">
              <h3 className="font-semibold text-white mb-4">Defect Type Distribution</h3>
              <div className="h-56">
                {(data?.defect_distribution || []).length === 0
                  ? <EmptyChart /> : <Bar data={defectData()} options={{ ...NO_LEGEND, indexAxis: "y" }} />}
              </div>
            </div>
          </div>

          {/* Worker performance chart */}
          {(data?.worker_performance || []).length > 0 && (
            <div className="card mb-6">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-purple-400" /> Worker Performance
              </h3>
              <div className="h-64">
                <Bar data={workerData()} options={{
                  ...BASE_OPTS,
                  scales: { x: { stacked: true, ticks: { color: TICK_COLOR }, grid: { color: GRID_COLOR } },
                            y: { stacked: true, ticks: { color: TICK_COLOR }, grid: { color: GRID_COLOR } } },
                }} />
              </div>
            </div>
          )}

          {/* AI Human Validation */}
          {/* Predictive Analytics */}
          <PredictiveSection />

          {/* Human Validation */}
          <div className="card mb-6">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Bot className="w-4 h-4 text-purple-400" /> Human Validation Analytics
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              {[
                { label: "Total Reviewed",      value: hv.total_reviewed ?? 0,       color: "text-blue-400" },
                { label: "AI Accurate",          value: hv.ai_accurate ?? 0,          color: "text-emerald-400" },
                { label: "Manual Corrections",   value: hv.manual_corrections ?? 0,   color: "text-yellow-400" },
                { label: "AI Accuracy %",        value: `${hv.accuracy_percentage ?? 0}%`, color: "text-purple-400" },
              ].map(({ label, value, color }) => (
                <div key={label} className="p-4 bg-slate-700/40 rounded-xl text-center">
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  <p className="text-slate-400 text-xs mt-1">{label}</p>
                </div>
              ))}
            </div>
            {hv.total_reviewed > 0 && (
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>AI Accuracy</span><span>{hv.accuracy_percentage}%</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 rounded-full transition-all duration-700"
                    style={{ width: `${hv.accuracy_percentage}%` }} />
                </div>
              </div>
            )}

            {/* Correction history */}
            {(data?.correction_history || []).length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-slate-300 mb-3">Recent AI Corrections</p>
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr><th>Inspection</th><th>Product</th><th>AI Predicted</th><th>Admin Decision</th><th>Date</th></tr>
                    </thead>
                    <tbody>
                      {data.correction_history.map((c) => (
                        <tr key={c.inspection_id}>
                          <td className="font-mono text-xs text-slate-500">#{c.inspection_id}</td>
                          <td className="text-white text-sm">{c.product}</td>
                          <td><span className="text-red-400 text-xs capitalize">{c.ai_prediction?.replace("_"," ")}</span></td>
                          <td><span className="text-emerald-400 text-xs capitalize">{c.admin_correction?.replace("_"," ")}</span></td>
                          <td className="text-slate-400 text-xs">{new Date(c.date).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Manufacturing Pattern Alerts */}
          {patternAlerts.length > 0 && (
            <div className="card mb-6">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4 text-red-400" /> Manufacturing Pattern Alerts
                <span className="text-xs bg-red-900/50 text-red-400 px-2 py-0.5 rounded-full font-normal">
                  {patternAlerts.length} active
                </span>
              </h3>
              <div className="space-y-3">
                {patternAlerts.map((pa) => (
                  <div key={pa.id} className="p-4 bg-purple-900/10 border border-purple-900/50 rounded-xl">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <AlertTriangle className="w-4 h-4 text-purple-400" />
                          <p className="text-purple-300 font-semibold text-sm capitalize">
                            Recurring pattern: {pa.defect_type?.replace("_"," ")}
                          </p>
                          <span className="text-xs bg-purple-900/50 text-purple-400 px-2 py-0.5 rounded-full">
                            {pa.occurrence_count} products affected
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mb-2">
                          ⚠️ These are <em>suggested causes for investigation</em>, not confirmed diagnoses.
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {(pa.suggested_causes || []).map((cause, i) => (
                            <span key={i} className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded-lg">
                              {cause}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button onClick={() => handleResolvePattern(pa.id)}
                        className="btn-secondary !px-3 !py-1.5 text-xs flex-shrink-0">
                        <CheckCircle className="w-3.5 h-3.5" /> Resolve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inspection Timeline */}
          <div className="card mb-6">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-cyan-400" /> Inspection Timeline
            </h3>
            <select className="input !w-auto text-sm !py-2 mb-4"
              onChange={(e) => {
                const id = e.target.value;
                const p = products.find((p) => String(p.id) === id);
                setTimelineProduct(p || null);
                if (id) fetchTimeline(id); else setTimeline([]);
              }} defaultValue="">
              <option value="">— Select product —</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.product_name}</option>)}
            </select>
            {timelineLoading ? (
              <div className="py-8 flex justify-center"><LoadingSpinner text="Loading timeline…" /></div>
            ) : timeline.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-6">
                {timelineProduct ? "No inspections for this product." : "Select a product to view timeline."}
              </p>
            ) : (
              <div className="relative pl-6">
                <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-slate-700" />
                {timeline.map((ins, idx) => (
                  <div key={ins.id} className="relative mb-4 last:mb-0">
                    <div className="absolute -left-4 top-2 w-3 h-3 rounded-full border-2 border-slate-600 bg-slate-900">
                      <div className={`w-1.5 h-1.5 rounded-full m-auto mt-0.5
                        ${ins.status === "Approved" ? "bg-emerald-400"
                          : ins.status === "Rejected" ? "bg-red-400" : "bg-amber-400"}`} />
                    </div>
                    <div className="bg-slate-700/30 rounded-xl p-3 border border-slate-700">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 font-mono">#{idx + 1}</span>
                          <span className="text-sm font-medium text-white capitalize">
                            {ins.defect === "none" ? "No Defect" : ins.defect?.replace("_"," ")}
                          </span>
                          {ins.is_recurring && <span className="text-xs text-orange-400">⚠ Recurring</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full
                            ${ins.status === "Approved" ? "bg-emerald-900/50 text-emerald-400"
                              : ins.status === "Rejected" ? "bg-red-900/50 text-red-400"
                              : "bg-amber-900/50 text-amber-400"}`}>{ins.status}</span>
                          <span className="text-xs text-slate-500">{new Date(ins.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      {ins.confidence != null && (
                        <p className="text-xs text-slate-400 mt-1">
                          Confidence: {(ins.confidence * 100).toFixed(1)}% · By {ins.worker?.name}
                          {ins.quality_score != null && ` · Quality: ${Math.round(ins.quality_score)}/100`}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recurring defects table */}
          {(data?.recurring_defects || []).length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-white mb-4">Recurring Defect Memory</h3>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr><th>Product</th><th>Defect Type</th><th>Occurrences</th><th>Risk Level</th></tr>
                  </thead>
                  <tbody>
                    {data.recurring_defects.map((r, i) => (
                      <tr key={i}>
                        <td className="font-medium text-white">{r.product_name}</td>
                        <td className="capitalize text-slate-300">{r.defect?.replace("_"," ")}</td>
                        <td><span className="font-bold text-orange-400">{r.count}×</span></td>
                        <td>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full
                            ${r.count >= 4 ? "bg-red-900/50 text-red-400"
                              : r.count >= 3 ? "bg-orange-900/50 text-orange-400"
                              : "bg-yellow-900/50 text-yellow-400"}`}>
                            {r.count >= 4 ? "Critical" : r.count >= 3 ? "High" : "Medium"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EmptyChart() {
  return <div className="h-full flex items-center justify-center text-slate-500 text-sm">No data available</div>;
}
