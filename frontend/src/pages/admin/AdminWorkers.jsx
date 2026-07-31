import React, { useState, useEffect, useCallback } from "react";
import { adminAPI, analysisAPI } from "../../services/api";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorAlert from "../../components/ErrorAlert";
import EmptyState from "../../components/EmptyState";
import Modal from "../../components/Modal";
import ConfirmDialog from "../../components/ConfirmDialog";
import { useToast } from "../../hooks/useToast";
import Toast from "../../components/Toast";
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, Title, Tooltip, Legend,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";
import {
  Users, Plus, Edit2, UserX, RefreshCw, Brain,
  CheckCircle, XCircle, TrendingUp, Award, Medal, Target,
  BarChart3, Clock,
} from "lucide-react";

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

export default function AdminWorkers() {
  const { toasts, toast, removeToast } = useToast();
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [createModal, setCreateModal] = useState(false);
  const [editWorker, setEditWorker] = useState(null);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [perfWorker, setPerfWorker] = useState(null);
  const [perfData, setPerfData] = useState(null);
  const [perfLoading, setPerfLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("cards"); // "cards" | "leaderboard"
  const [actionLoading, setActionLoading] = useState(false);

  const [form, setForm] = useState({ name: "", email: "", password: "", department: "" });

  const fetchWorkers = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await adminAPI.workers();
      setWorkers(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load workers.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchWorkers(); }, []);

  const openPerf = async (worker) => {
    setPerfWorker(worker);
    setPerfData(null);
    setPerfLoading(true);
    try {
      const res = await analysisAPI.workerPerformance(worker.id);
      setPerfData(res.data.data);
    } catch { setPerfData(null); }
    finally { setPerfLoading(false); }
  };

  const handleCreate = async () => {
    if (!form.name || !form.email || !form.password) {
      toast.error("Name, email, and password are required."); return;
    }
    setActionLoading(true);
    try {
      await adminAPI.createWorker(form);
      toast.success("Worker created successfully.");
      setCreateModal(false);
      setForm({ name: "", email: "", password: "", department: "" });
      fetchWorkers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create worker.");
    } finally { setActionLoading(false); }
  };

  const handleUpdate = async () => {
    if (!editWorker) return;
    setActionLoading(true);
    try {
      await adminAPI.updateWorker(editWorker.id, {
        name: editWorker.name,
        department: editWorker.department,
        is_active: editWorker.is_active,
        ...(editWorker.newPassword ? { password: editWorker.newPassword } : {}),
      });
      toast.success("Worker updated.");
      setEditWorker(null);
      fetchWorkers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed.");
    } finally { setActionLoading(false); }
  };

  const handleDeactivate = async () => {
    if (!deactivateTarget) return;
    setActionLoading(true);
    try {
      await adminAPI.deactivateWorker(deactivateTarget.id);
      toast.success(`${deactivateTarget.name} deactivated.`);
      setDeactivateTarget(null);
      fetchWorkers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Deactivation failed.");
    } finally { setActionLoading(false); }
  };

  return (
    <div className="animate-fade-in">
      <Toast toasts={toasts} removeToast={removeToast} />

      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-400" /> Worker Management
          </h1>
          <p className="page-subtitle">{workers.length} worker{workers.length !== 1 ? "s" : ""} registered</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchWorkers} className="btn-secondary !px-3 !py-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => setCreateModal(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Add Worker
          </button>
        </div>
      </div>

      {error && <div className="mb-6"><ErrorAlert message={error} onRetry={fetchWorkers} /></div>}

      {loading ? (
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" text="Loading workers…" /></div>
      ) : workers.length === 0 ? (
        <div className="card"><EmptyState title="No workers" description="Add your first worker." icon={Users} /></div>
      ) : (
        <>
          {/* Tab switcher */}
          <div className="flex gap-2 mb-4">
            {[{ id:"cards", label:"Worker Cards" }, { id:"leaderboard", label:"🏆 Leaderboard" }].map(({ id, label }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all
                            ${activeTab === id
                              ? "bg-blue-600/20 border-blue-600 text-blue-400"
                              : "border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white"}`}>
                {label}
              </button>
            ))}
          </div>

          {activeTab === "cards" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {workers.map((w) => (
                <WorkerCard key={w.id} worker={w}
                  onEdit={() => setEditWorker({ ...w, newPassword: "" })}
                  onDeactivate={() => setDeactivateTarget(w)}
                  onPerf={() => openPerf(w)} />
              ))}
            </div>
          )}

          {activeTab === "leaderboard" && (
            <WorkerLeaderboard workers={workers} />
          )}
        </>
      )}

      {/* Create modal */}
      <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title="Add New Worker" size="sm">
        <div className="space-y-4">
          {[
            { label: "Full Name *", key: "name", type: "text", placeholder: "John Smith" },
            { label: "Email *", key: "email", type: "email", placeholder: "john@company.com" },
            { label: "Password *", key: "password", type: "password", placeholder: "••••••••" },
            { label: "Department", key: "department", type: "text", placeholder: "Assembly Line A" },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <label className="label">{label}</label>
              <input type={type} placeholder={placeholder}
                className="input" value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <button onClick={() => setCreateModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleCreate} disabled={actionLoading} className="btn-primary flex-1">
              {actionLoading ? <LoadingSpinner size="sm" /> : <><Plus className="w-4 h-4" /> Create</>}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit modal */}
      <Modal isOpen={!!editWorker} onClose={() => setEditWorker(null)} title="Edit Worker" size="sm">
        {editWorker && (
          <div className="space-y-4">
            {[
              { label: "Full Name", key: "name", type: "text" },
              { label: "Department", key: "department", type: "text" },
              { label: "New Password (leave blank to keep)", key: "newPassword", type: "password", placeholder: "••••••••" },
            ].map(({ label, key, type, placeholder = "" }) => (
              <div key={key}>
                <label className="label">{label}</label>
                <input type={type} placeholder={placeholder} className="input"
                  value={editWorker[key] || ""}
                  onChange={(e) => setEditWorker({ ...editWorker, [key]: e.target.value })} />
              </div>
            ))}
            <div className="flex items-center gap-3 p-3 bg-slate-700/40 rounded-xl">
              <label className="text-sm text-slate-300 flex-1">Account Active</label>
              <button
                onClick={() => setEditWorker({ ...editWorker, is_active: !editWorker.is_active })}
                className={`w-10 h-5 rounded-full transition-colors duration-200 relative
                            ${editWorker.is_active ? "bg-emerald-600" : "bg-slate-600"}`}>
                <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all duration-200
                                ${editWorker.is_active ? "left-5" : "left-0.5"}`} />
              </button>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditWorker(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleUpdate} disabled={actionLoading} className="btn-primary flex-1">
                {actionLoading ? <LoadingSpinner size="sm" /> : "Save Changes"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Deactivate confirm */}
      <ConfirmDialog
        isOpen={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={handleDeactivate}
        title="Deactivate Worker"
        message={`Are you sure you want to deactivate ${deactivateTarget?.name}? They will no longer be able to log in.`}
        confirmLabel="Deactivate"
        confirmClass="btn-danger"
        loading={actionLoading}
        icon={UserX}
      />

      {/* Worker Performance Modal */}
      <Modal isOpen={!!perfWorker} onClose={() => { setPerfWorker(null); setPerfData(null); }}
        title={perfWorker ? `${perfWorker.name} — Performance` : ""} size="lg">
        {perfLoading ? (
          <div className="flex justify-center py-12"><LoadingSpinner size="lg" text="Loading performance data…" /></div>
        ) : perfData ? (
          <WorkerPerfDetail data={perfData} />
        ) : (
          <p className="text-slate-400 text-center py-8">No performance data available.</p>
        )}
      </Modal>
    </div>
  );
}

function WorkerCard({ worker: w, onEdit, onDeactivate, onPerf }) {
  return (
    <div className={`card hover:border-slate-500 transition-all duration-200
                     ${!w.is_active ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600
                          flex items-center justify-center text-sm font-bold text-white">
            {w.name[0]}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-white truncate">{w.name}</p>
            <p className="text-xs text-slate-400 truncate">{w.email}</p>
          </div>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0
          ${w.is_active ? "bg-emerald-900/50 text-emerald-400" : "bg-slate-700 text-slate-400"}`}>
          {w.is_active ? "Active" : "Inactive"}
        </span>
      </div>

      {w.department && (
        <p className="text-xs text-slate-400 mb-3 px-2 py-1 bg-slate-700/40 rounded">
          🏭 {w.department}
        </p>
      )}

      <div className="grid grid-cols-3 gap-2 mb-4 text-center">
        {[
          { label: "Total", value: w.total_inspections, color: "text-blue-400" },
          { label: "Approved", value: w.approved_inspections, color: "text-emerald-400" },
          { label: "Rate", value: `${w.approval_rate}%`, color: w.approval_rate >= 80 ? "text-emerald-400" : w.approval_rate >= 60 ? "text-amber-400" : "text-red-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="p-2 bg-slate-700/40 rounded-lg">
            <p className={`text-lg font-bold ${color}`}>{value}</p>
            <p className="text-xs text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-xs text-slate-400 mb-1">
          <span>Approval Rate</span>
          <span>{w.approval_rate}%</span>
        </div>
        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${w.approval_rate >= 80 ? "bg-emerald-500" : w.approval_rate >= 60 ? "bg-amber-500" : "bg-red-500"}`}
            style={{ width: `${w.approval_rate}%`, transition: "width 0.5s ease" }} />
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={onPerf} className="btn-secondary !py-2 !px-3 text-sm" title="Performance">
          <BarChart3 className="w-3.5 h-3.5 text-purple-400" />
        </button>
        <button onClick={onEdit} className="btn-secondary flex-1 !py-2 text-sm">
          <Edit2 className="w-3.5 h-3.5" /> Edit
        </button>
        {w.is_active && (
          <button onClick={onDeactivate} className="btn-danger !py-2 !px-3 text-sm">
            <UserX className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Worker Leaderboard ─────────────────────────────────────────────── */
function WorkerLeaderboard({ workers }) {
  const sorted = [...workers].sort((a, b) => b.approval_rate - a.approval_rate);
  const MEDALS = ["🥇", "🥈", "🥉"];

  return (
    <div className="card">
      <h3 className="font-bold text-white mb-5 flex items-center gap-2">
        <Award className="w-5 h-5 text-yellow-400" /> Worker Leaderboard
      </h3>
      <div className="space-y-3">
        {sorted.map((w, i) => (
          <div key={w.id}
            className={`flex items-center gap-4 p-4 rounded-xl border transition-all
                        ${i === 0 ? "bg-yellow-900/10 border-yellow-800/40"
                          : i === 1 ? "bg-slate-700/20 border-slate-700/50"
                          : i === 2 ? "bg-orange-900/10 border-orange-800/40"
                          : "bg-slate-700/10 border-slate-700/30"}`}>
            <div className="w-10 text-center text-2xl flex-shrink-0">
              {MEDALS[i] || <span className="text-slate-500 text-sm font-bold">#{i + 1}</span>}
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600
                            flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
              {w.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white truncate">{w.name}</p>
              <p className="text-xs text-slate-400">{w.department || "—"}</p>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center flex-shrink-0">
              <div>
                <p className={`text-lg font-bold ${w.approval_rate >= 80 ? "text-emerald-400" : w.approval_rate >= 60 ? "text-amber-400" : "text-red-400"}`}>
                  {w.approval_rate}%
                </p>
                <p className="text-[10px] text-slate-500">Approval</p>
              </div>
              <div>
                <p className="text-lg font-bold text-blue-400">{w.total_inspections}</p>
                <p className="text-[10px] text-slate-500">Inspections</p>
              </div>
              <div>
                <p className="text-lg font-bold text-purple-400">{w.approved_inspections}</p>
                <p className="text-[10px] text-slate-500">Approved</p>
              </div>
            </div>
            <div className="w-24 flex-shrink-0">
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700
                                 ${w.approval_rate >= 80 ? "bg-emerald-500" : w.approval_rate >= 60 ? "bg-amber-500" : "bg-red-500"}`}
                  style={{ width: `${w.approval_rate}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Worker Performance Detail (inside modal) ───────────────────────── */
const CHART_OPTS = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { labels: { color: "#94a3b8", font: { size: 11 } } } },
  scales: {
    x: { ticks: { color: "#64748b" }, grid: { color: "#1e293b" } },
    y: { ticks: { color: "#64748b" }, grid: { color: "#1e293b" } },
  },
};

function WorkerPerfDetail({ data }) {
  const monthlyChart = {
    labels: data.monthly_trend.map((m) => m.month),
    datasets: [
      { label: "Approved", data: data.monthly_trend.map((m) => m.approved), backgroundColor: "rgba(16,185,129,0.7)", borderRadius: 4, borderWidth: 0 },
      { label: "Rejected", data: data.monthly_trend.map((m) => m.rejected), backgroundColor: "rgba(239,68,68,0.7)",  borderRadius: 4, borderWidth: 0 },
    ],
  };

  const defectChart = {
    labels: Object.keys(data.defect_breakdown).map((d) => d.replace("_", " ")),
    datasets: [{
      label: "Count",
      data: Object.values(data.defect_breakdown),
      backgroundColor: ["#ef4444","#eab308","#3b82f6","#a855f7","#f97316","#f43f5e","#10b981"],
      borderRadius: 4, borderWidth: 0,
    }],
  };

  const kpis = [
    { label: "Total Inspections",     value: data.total,          color: "text-blue-400" },
    { label: "Approval Rate",         value: `${data.approval_rate}%`, color: data.approval_rate >= 80 ? "text-emerald-400" : data.approval_rate >= 60 ? "text-amber-400" : "text-red-400" },
    { label: "AI Accuracy",           value: `${data.ai_accuracy}%`,   color: "text-purple-400" },
    { label: "Avg Quality Score",     value: `${data.avg_quality_score}/100`, color: "text-cyan-400" },
    { label: "Manual Corrections",    value: data.corrections,    color: "text-orange-400" },
    { label: "Avg Detection Time",    value: data.avg_detection_time_ms ? `${data.avg_detection_time_ms}ms` : "N/A", color: "text-slate-300" },
  ];

  return (
    <div className="space-y-5">
      {/* KPI grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {kpis.map(({ label, value, color }) => (
          <div key={label} className="bg-slate-700/40 rounded-xl p-3 text-center border border-slate-700">
            <p className={`text-xl font-bold ${color}`}>{value}</p>
            <p className="text-slate-500 text-xs mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Monthly performance chart */}
      {data.monthly_trend.length > 0 && (
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
          <p className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-400" /> Monthly Performance
          </p>
          <div className="h-52">
            <Bar data={monthlyChart} options={{ ...CHART_OPTS, scales: { x: { stacked: true, ticks: { color: "#64748b" }, grid: { color: "#1e293b" } }, y: { stacked: true, ticks: { color: "#64748b" }, grid: { color: "#1e293b" } } } }} />
          </div>
        </div>
      )}

      {/* Defect breakdown chart */}
      {Object.keys(data.defect_breakdown).length > 1 && (
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
          <p className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Target className="w-4 h-4 text-orange-400" /> Defect Breakdown
          </p>
          <div className="h-48">
            <Bar data={defectChart} options={{ ...CHART_OPTS, indexAxis: "y", plugins: { legend: { display: false } } }} />
          </div>
        </div>
      )}

      {/* AI Accuracy bar */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-slate-300 flex items-center gap-1.5">
            <Brain className="w-3.5 h-3.5 text-purple-400" /> AI Accuracy
          </span>
          <span className="font-bold text-purple-400">{data.ai_accuracy}%</span>
        </div>
        <div className="h-2.5 bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-purple-600 to-blue-500 rounded-full transition-all duration-700"
            style={{ width: `${data.ai_accuracy}%` }} />
        </div>
        <p className="text-xs text-slate-500 mt-1.5">
          {data.corrections} manual correction{data.corrections !== 1 ? "s" : ""} out of {data.total} reviewed
        </p>
      </div>
    </div>
  );
}
