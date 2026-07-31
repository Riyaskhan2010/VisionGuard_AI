import React, { useState, useEffect, useCallback } from "react";
import { inspectionAPI, adminAPI } from "../../services/api";
import { SeverityBadge, StatusBadge } from "../../components/SeverityBadge";
import DefectBadge from "../../components/DefectBadge";
import { QualityScoreInline } from "../../components/QualityScoreMeter";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorAlert from "../../components/ErrorAlert";
import EmptyState from "../../components/EmptyState";
import Pagination from "../../components/Pagination";
import Modal from "../../components/Modal";
import AIAnalysisDrawer from "../../components/AIAnalysisDrawer";
import DefectMemoryPanel from "../../components/DefectMemoryPanel";
import InspectionQR from "../../components/InspectionQR";
import { useToast } from "../../hooks/useToast";
import Toast from "../../components/Toast";
import {
  History, RefreshCw, Eye, ZoomIn, X,
  AlertTriangle, Download, Timer, Brain,
} from "lucide-react";

const STATUS_OPTS = ["", "Pending", "Approved", "Rejected"];

export default function WorkerHistory() {
  const { toasts, toast, removeToast } = useToast();
  const [inspections, setInspections] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState(null);
  const [zoomedImage, setZoomedImage] = useState(null);
  const [aiDrawerId, setAiDrawerId] = useState(null);

  const fetchData = useCallback(async (page = 1) => {
    setLoading(true); setError(null);
    try {
      const params = { page, per_page: 12 };
      if (statusFilter) params.status = statusFilter;
      const res = await inspectionAPI.history(params);
      const d = res.data.data;
      setInspections(d.inspections || []);
      setTotal(d.total || 0);
      setPages(d.pages || 1);
      setCurrentPage(page);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load history.");
    } finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { fetchData(1); }, [statusFilter]);

  const handleDownload = async (ins) => {
    try {
      const url = adminAPI.reportUrl(ins.id);
      const token = localStorage.getItem("vg_token");
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      const ext = blob.type.includes("pdf") ? "pdf" : "txt";
      a.download = `VisionGuard_Report_${ins.id}.${ext}`;
      a.click();
      toast.success("Report downloaded.");
    } catch {
      toast.error("Failed to download report.");
    }
  };

  return (
    <div className="animate-fade-in">
      <Toast toasts={toasts} removeToast={removeToast} />
      <div className="page-header flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Inspection History</h1>
          <p className="page-subtitle">{total} total inspection{total !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-700 overflow-hidden">
            {STATUS_OPTS.map((s) => (
              <button key={s || "all"} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors
                            ${statusFilter === s
                              ? "bg-blue-600 text-white"
                              : "text-slate-400 hover:text-white hover:bg-slate-700"}`}>
                {s || "All"}
              </button>
            ))}
          </div>
          <button onClick={() => fetchData(currentPage)} className="btn-secondary !px-3 !py-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {error && <div className="mb-6"><ErrorAlert message={error} onRetry={() => fetchData(currentPage)} /></div>}

      {loading ? (
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" text="Loading history…" /></div>
      ) : inspections.length === 0 ? (
        <div className="card">
          <EmptyState title="No inspections found"
            description={statusFilter ? `No ${statusFilter.toLowerCase()} inspections.` : "Start by uploading a product image."}
            icon={History} />
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product</th>
                  <th>Defect</th>
                  <th>Confidence</th>
                  <th>Severity</th>
                  <th>Quality</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {inspections.map((ins) => (
                  <tr key={ins.id}>
                    <td className="text-slate-500 font-mono text-xs">{ins.id}</td>
                    <td>
                      <p className="font-medium text-white">{ins.product?.product_name || "—"}</p>
                      <p className="text-xs text-slate-500 font-mono">{ins.product?.product_id}</p>
                    </td>
                    <td>
                      <div className="flex items-center gap-1 flex-wrap">
                        <DefectBadge defect={ins.defect} />
                        {ins.is_recurring && <AlertTriangle className="w-3.5 h-3.5 text-orange-400" title="Recurring" />}
                      </div>
                    </td>
                    <td>{ins.confidence ? `${(ins.confidence * 100).toFixed(1)}%` : "—"}</td>
                    <td><SeverityBadge severity={ins.severity} /></td>
                    <td><QualityScoreInline score={ins.quality_score} label={ins.quality_label} /></td>
                    <td>
                      <div>
                        <StatusBadge status={ins.status} />
                        {ins.status === "Rejected" && ins.reject_reason && (
                          <p className="text-xs text-red-400 mt-0.5">{ins.reject_reason}</p>
                        )}
                      </div>
                    </td>
                    <td className="text-slate-400 text-xs whitespace-nowrap">
                      {new Date(ins.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setSelected(ins)}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded"
                          title="View details">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => setAiDrawerId(ins.id)}
                          className="p-1.5 text-purple-400 hover:text-purple-300 hover:bg-purple-900/20 rounded"
                          title="AI Analysis">
                          <Brain className="w-4 h-4" />
                        </button>
                        <InspectionQR inspectionId={ins.id} status={ins.status} />
                        <button onClick={() => handleDownload(ins)}
                          className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded"
                          title="Download report">
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination currentPage={currentPage} totalPages={pages}
            onPageChange={(p) => fetchData(p)} />
        </>
      )}

      <InspectionDetailModal inspection={selected} onClose={() => setSelected(null)}
        onZoom={setZoomedImage} onDownload={handleDownload} />

      {zoomedImage && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setZoomedImage(null)}>
          <img src={zoomedImage} alt="zoomed" className="max-w-full max-h-full rounded-xl" />
          <button className="absolute top-4 right-4 p-2 bg-slate-800 rounded-lg text-white"
            onClick={() => setZoomedImage(null)}>
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {aiDrawerId && (
        <AIAnalysisDrawer inspectionId={aiDrawerId} onClose={() => setAiDrawerId(null)} />
      )}
    </div>
  );
}

function InspectionDetailModal({ inspection: ins, onClose, onZoom, onDownload }) {
  if (!ins) return null;
  return (
    <Modal isOpen={!!ins} onClose={onClose} title={`Inspection #${ins.id}`} size="lg">
      <div className="space-y-4">
        {ins.status === "Rejected" && (
          <div className="p-3 bg-red-900/20 border border-red-800 rounded-xl">
            <p className="text-red-300 text-sm font-semibold">Rejected — Re-inspection Required</p>
            <p className="text-red-400 text-sm mt-0.5">Reason: {ins.reject_reason}</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          {[{ label: "Original Image", key: "original_image" },
            { label: "Detected Image", key: "detected_image" }].map(({ label, key }) => (
            <div key={key}>
              <p className="text-xs text-slate-400 mb-2 font-medium">{label}</p>
              <div className="relative group cursor-pointer rounded-xl overflow-hidden border border-slate-600"
                onClick={() => onZoom(inspectionAPI.imageUrl(ins[key]))}>
                <img src={inspectionAPI.imageUrl(ins[key])} alt={label} className="w-full h-40 object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100
                                transition-opacity flex items-center justify-center">
                  <ZoomIn className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            { label: "Product",     value: ins.product?.product_name },
            { label: "Defect",      value: <DefectBadge defect={ins.defect} /> },
            { label: "Confidence",  value: ins.confidence ? `${(ins.confidence * 100).toFixed(1)}%` : "—" },
            { label: "Severity",    value: <SeverityBadge severity={ins.severity} /> },
            { label: "Status",      value: <StatusBadge status={ins.status} /> },
            { label: "Quality",     value: <QualityScoreInline score={ins.quality_score} label={ins.quality_label} /> },
          ].map(({ label, value }) => (
            <div key={label} className="p-3 bg-slate-700/40 rounded-xl">
              <p className="text-xs text-slate-400 mb-1">{label}</p>
              <div className="text-white font-medium">{value}</div>
            </div>
          ))}
        </div>
        <div className="p-3 bg-slate-700/40 rounded-xl">
          <p className="text-xs text-slate-400 mb-1">Recommendation</p>
          <p className="text-white font-medium">{ins.recommendation || "No Action Required"}</p>
        </div>
        {ins.detection_time_ms && (
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <Timer className="w-3 h-3" /> Detection time: {ins.detection_time_ms} ms
          </p>
        )}
        <button onClick={() => onDownload(ins)} className="btn-secondary w-full">
          <Download className="w-4 h-4" /> Download Report
        </button>
      </div>
    </Modal>
  );
}
