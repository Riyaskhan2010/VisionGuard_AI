import React, { useState, useEffect } from "react";
import {
  FileText, Download, Table, Calendar, TrendingUp,
  CheckCircle, XCircle, Clock, AlertTriangle, RefreshCw,
  BarChart3, Users, Package,
} from "lucide-react";
import { enterpriseAPI } from "../../services/api";
import { adminAPI } from "../../services/api";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorAlert from "../../components/ErrorAlert";
import { SkeletonStats } from "../../components/SkeletonLoader";
import { useToast } from "../../hooks/useToast";
import Toast from "../../components/Toast";

const PERIODS = [
  { id: "daily",   label: "Daily",   icon: Calendar },
  { id: "weekly",  label: "Weekly",  icon: TrendingUp },
  { id: "monthly", label: "Monthly", icon: BarChart3 },
];

export default function ReportCenter() {
  const { toasts, toast, removeToast } = useToast();
  const [period, setPeriod]   = useState("daily");
  const [report, setReport]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [exporting, setExporting] = useState(false);

  const fetchReport = async (p = period) => {
    setLoading(true); setError(null);
    try {
      const res = await enterpriseAPI.reportSummary(p);
      setReport(res.data.data);
    } catch (e) {
      setError("Failed to generate report.");
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchReport(period); }, [period]);

  const handleCSVExport = async () => {
    setExporting(true);
    try {
      const token = localStorage.getItem("vg_token");
      const url = `/api/enterprise/reports/export-csv?period=${period}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `VisionGuard_${period}_Report.csv`;
      a.click();
      toast.success("CSV exported successfully.");
    } catch { toast.error("Export failed."); }
    finally { setExporting(false); }
  };

  const handlePrint = () => window.print();

  return (
    <div className="animate-fade-in">
      <Toast toasts={toasts} removeToast={removeToast} />

      <div className="page-header flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-400" /> Report Center
          </h1>
          <p className="page-subtitle">Generate and export professional quality reports</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleCSVExport} disabled={exporting || loading}
            className="btn-secondary !px-3 !py-2 text-sm gap-2">
            {exporting ? <LoadingSpinner size="sm" /> : <Table className="w-4 h-4 text-emerald-400" />}
            Export CSV
          </button>
          <button onClick={handlePrint} className="btn-secondary !px-3 !py-2 text-sm gap-2">
            <FileText className="w-4 h-4" /> Print
          </button>
          <button onClick={() => fetchReport()} className="btn-secondary !px-3 !py-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Period selector */}
      <div className="flex gap-2 mb-6">
        {PERIODS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setPeriod(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
                        border transition-all duration-200
                        ${period === id
                          ? "bg-blue-600/20 border-blue-600 text-blue-400"
                          : "border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white"}`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {error && <div className="mb-6"><ErrorAlert message={error} onRetry={() => fetchReport()} /></div>}

      {loading ? <SkeletonStats count={4} /> : report && (
        <div className="space-y-6 animate-fade-in" id="report-content">
          {/* Report header */}
          <div className="card bg-gradient-to-r from-blue-900/20 to-purple-900/20 border-blue-800/40">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">{report.label}</h2>
                <p className="text-slate-400 text-sm mt-1">
                  Generated: {new Date(report.generated_at).toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-slate-400 text-xs">VisionGuard AI Platform</p>
                <p className="text-blue-400 text-xs">Industrial Quality Intelligence</p>
              </div>
            </div>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: "Total",          value: report.total,           color: "text-blue-400",    icon: BarChart3 },
              { label: "Approved",       value: report.approved,        color: "text-emerald-400", icon: CheckCircle },
              { label: "Rejected",       value: report.rejected,        color: "text-red-400",     icon: XCircle },
              { label: "Pending",        value: report.pending,         color: "text-amber-400",   icon: Clock },
              { label: "Critical",       value: report.critical,        color: "text-orange-400",  icon: AlertTriangle },
              { label: "Avg Quality",    value: `${report.avg_quality_score}`, color: "text-purple-400", icon: TrendingUp },
            ].map(({ label, value, color, icon: Icon }) => (
              <div key={label} className="stat-card">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-slate-400 text-xs uppercase tracking-wide">{label}</p>
                  <Icon className={`w-3.5 h-3.5 ${color}`} />
                </div>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Defect breakdown */}
          {Object.keys(report.defect_distribution).length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-400" /> Defect Distribution
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {Object.entries(report.defect_distribution).map(([defect, count]) => (
                  <div key={defect} className="bg-slate-700/40 rounded-xl p-3 text-center border border-slate-700">
                    <p className="text-xl font-bold text-white">{count}</p>
                    <p className="text-slate-400 text-xs mt-0.5 capitalize">{defect.replace("_", " ")}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Worker performance */}
          {report.worker_performance?.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" /> Worker Performance
              </h3>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Worker</th><th>Department</th><th>Total</th>
                      <th>Approved</th><th>Rejected</th><th>Approval Rate</th>
                      <th>Avg Quality</th><th>Today</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.worker_performance.map((w) => (
                      <tr key={w.worker_id}>
                        <td className="font-medium text-white">{w.worker_name}</td>
                        <td className="text-slate-400 text-xs">{w.department || "—"}</td>
                        <td>{w.total}</td>
                        <td className="text-emerald-400">{w.approved}</td>
                        <td className="text-red-400">{w.rejected}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden min-w-[60px]">
                              <div className={`h-full rounded-full ${w.approval_rate >= 80 ? "bg-emerald-500" : w.approval_rate >= 60 ? "bg-amber-500" : "bg-red-500"}`}
                                style={{ width: `${w.approval_rate}%` }} />
                            </div>
                            <span className={`text-xs font-bold ${w.approval_rate >= 80 ? "text-emerald-400" : w.approval_rate >= 60 ? "text-amber-400" : "text-red-400"}`}>
                              {w.approval_rate}%
                            </span>
                          </div>
                        </td>
                        <td className="text-purple-400">{w.avg_quality_score}</td>
                        <td className="text-blue-400">{w.today_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Inspection table */}
          {report.inspections?.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <Package className="w-4 h-4 text-slate-400" />
                Inspections ({report.inspections.length} shown)
              </h3>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr><th>#</th><th>Product</th><th>Worker</th><th>Defect</th><th>Severity</th><th>Quality</th><th>Status</th><th>Date</th></tr>
                  </thead>
                  <tbody>
                    {report.inspections.map((ins) => (
                      <tr key={ins.id}>
                        <td className="font-mono text-xs text-slate-500">{ins.id}</td>
                        <td className="font-medium text-white text-sm">{ins.product?.product_name || "—"}</td>
                        <td className="text-slate-300 text-sm">{ins.worker?.name || "—"}</td>
                        <td className="capitalize text-sm">{(ins.defect || "none").replace("_", " ")}</td>
                        <td>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold
                            ${ins.severity === "Critical" ? "bg-red-900/50 text-red-400"
                              : ins.severity === "Medium" ? "bg-amber-900/50 text-amber-400"
                              : "bg-blue-900/50 text-blue-400"}`}>
                            {ins.severity || "None"}
                          </span>
                        </td>
                        <td className="text-purple-400 text-sm">{ins.quality_score ? `${Math.round(ins.quality_score)}` : "—"}</td>
                        <td>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold
                            ${ins.status === "Approved" ? "bg-emerald-900/50 text-emerald-400"
                              : ins.status === "Rejected" ? "bg-red-900/50 text-red-400"
                              : "bg-amber-900/50 text-amber-400"}`}>
                            {ins.status}
                          </span>
                        </td>
                        <td className="text-slate-400 text-xs whitespace-nowrap">
                          {new Date(ins.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
