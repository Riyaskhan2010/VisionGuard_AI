import React, { useState, useEffect, useCallback } from "react";
import { adminAPI, inspectionAPI } from "../../services/api";
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
  Eye, CheckCircle, XCircle, RefreshCw, AlertTriangle,
  ZoomIn, X, History, Download, Timer, Brain,
} from "lucide-react";

const STATUS_OPTS = ["", "Pending", "Approved", "Rejected"];
const REJECT_REASONS_DEFAULT = [
  "Image Blur", "Wrong Product", "Wrong Angle",
  "Lighting Issue", "Manual Inspection Required",
  "AI Misclassification", "Other",
];

export default function AdminInspections() {
  const { toasts, toast, removeToast } = useToast();
  const [inspections, setInspections] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("Pending");
  const [selected, setSelected] = useState(null);
  const [zoomedImage, setZoomedImage] = useState(null);
  const [actionModal, setActionModal] = useState(null);
  const [aiDrawerId, setAiDrawerId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReasons, setRejectReasons] = useState(REJECT_REASONS_DEFAULT);

  useEffect(() => {
    adminAPI.rejectReasons()
      .then((r) => setRejectReasons(r.data.data || REJECT_REASONS_DEFAULT))
      .catch(() => {});
  }, []);

  const fetchData = useCallback(async (page = 1) => {
    setLoading(true); setError(null);
    try {
      const params = { page, per_page: 12 };
      if (statusFilter) params.status = statusFilter;
      const res = await adminAPI.inspections(params);
      const d = res.data.data;
      setInspections(d.inspections || []);
      setTotal(d.total || 0);
      setPages(d.pages || 1);
      setCurrentPage(page);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load inspections.");
    } finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { fetchData(1); }, [statusFilter]);

  const handleApprove = async () => {
    if (!actionModal) return;
    setActionLoading(true);
    try {
      await adminAPI.approve(actionModal.inspection.id);
      toast.success(`Inspection #${actionModal.inspection.id} approved.`);
      setActionModal(null);
      if (selected?.id === actionModal.inspection.id) setSelected(null);
      fetchData(currentPage);
    } catch (err) {
      toast.error(err.response?.data?.message || "Approval failed.");
    } finally { setActionLoading(false); }
  };

  const handleReject = async () => {
    if (!rejectReason) { toast.error("Please select a reject reason."); return; }
    setActionLoading(true);
    try {
      await adminAPI.reject(actionModal.inspection.id, rejectReason);
      toast.success(`Inspection #${actionModal.inspection.id} rejected.`);
      setActionModal(null); setRejectReason("");
      if (selected?.id === actionModal.inspection.id) setSelected(null);
      fetchData(currentPage);
    } catch (err) {
      toast.error(err.response?.data?.message || "Rejection failed.");
    } finally { setActionLoading(false); }
  };

  const handleDownload = async (ins) => {
    try {
      const url = adminAPI.reportUrl(ins.id);
      const token = localStorage.getItem("vg_token");
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `VisionGuard_Report_${ins.id}.${blob.type.includes("pdf") ? "pdf" : "txt"}`;
      a.click();
      toast.success("Report downloaded.");
    } catch { toast.error("Download failed."); }
  };

  return (
    <div className="animate-fade-in">
      <Toast toasts={toasts} removeToast={removeToast} />

      <div className="page-header flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Inspections</h1>
          <p className="page-subtitle">{total} inspection{total !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-700 overflow-hidden">
            {STATUS_OPTS.map((s) => (
              <button key={s || "all"} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors
                            ${statusFilter === s ? "bg-blue-600 text-white"
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
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" text="Loading…" /></div>
      ) : inspections.length === 0 ? (
        <div className="card">
          <EmptyState title="No inspections"
            description={statusFilter ? `No ${statusFilter.toLowerCase()} inspections.` : "No inspections yet."}
            icon={History} />
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th><th>Product</th><th>Worker</th><th>Defect</th>
                  <th>Conf.</th><th>Severity</th><th>Quality</th><th>Status</th>
                  <th>Date</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {inspections.map((ins) => (
                  <tr key={ins.id}>
                    <td className="text-slate-500 font-mono text-xs">{ins.id}</td>
                    <td>
                      <p className="font-medium text-white text-sm">{ins.product?.product_name || "—"}</p>
                      <p className="text-xs text-slate-500 font-mono">{ins.product?.product_id}</p>
                    </td>
                    <td className="text-sm text-slate-300">{ins.worker?.name || "—"}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        <DefectBadge defect={ins.defect} />
                        {ins.is_recurring && <AlertTriangle className="w-3.5 h-3.5 text-orange-400" title="Recurring" />}
                      </div>
                    </td>
                    <td className="text-sm">{ins.confidence ? `${(ins.confidence * 100).toFixed(1)}%` : "—"}</td>
                    <td><SeverityBadge severity={ins.severity} /></td>
                    <td><QualityScoreInline score={ins.quality_score} label={ins.quality_label} /></td>
                    <td><StatusBadge status={ins.status} /></td>
                    <td className="text-slate-400 text-xs whitespace-nowrap">
                      {new Date(ins.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="flex items-center gap-1 flex-wrap">
                        <button onClick={() => setSelected(ins)}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded" title="View">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => setAiDrawerId(ins.id)}
                          className="p-1.5 text-purple-400 hover:text-purple-300 hover:bg-purple-900/20 rounded" title="AI Analysis">
                          <Brain className="w-4 h-4" />
                        </button>
                        <InspectionQR inspectionId={ins.id} status={ins.status} />
                        <button onClick={() => handleDownload(ins)}
                          className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded" title="Download report">
                          <Download className="w-4 h-4" />
                        </button>
                        {ins.status === "Pending" && (<>
                          <button onClick={() => setActionModal({ type: "approve", inspection: ins })}
                            className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/20 rounded" title="Approve">
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button onClick={() => { setActionModal({ type: "reject", inspection: ins }); setRejectReason(""); }}
                            className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded" title="Reject">
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination currentPage={currentPage} totalPages={pages} onPageChange={(p) => fetchData(p)} />
        </>
      )}

      {/* Detail modal */}
      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={`Inspection #${selected?.id}`} size="lg">
        {selected && (
          <InspectionDetail ins={selected} onZoom={setZoomedImage}
            onApprove={() => setActionModal({ type: "approve", inspection: selected })}
            onReject={() => { setActionModal({ type: "reject", inspection: selected }); setRejectReason(""); }}
            onDownload={() => handleDownload(selected)} />
        )}
      </Modal>

      {/* Approve modal */}
      <Modal isOpen={actionModal?.type === "approve"} onClose={() => setActionModal(null)}
        title="Approve Inspection" size="sm">
        <p className="text-slate-300 text-sm mb-6">
          Approve inspection <span className="font-semibold text-white">#{actionModal?.inspection?.id}</span>?
        </p>
        <div className="flex gap-3">
          <button onClick={() => setActionModal(null)} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleApprove} disabled={actionLoading} className="btn-success flex-1">
            {actionLoading ? <LoadingSpinner size="sm" /> : <><CheckCircle className="w-4 h-4" /> Approve</>}
          </button>
        </div>
      </Modal>

      {/* Reject modal */}
      <Modal isOpen={actionModal?.type === "reject"} onClose={() => setActionModal(null)}
        title="Reject Inspection" size="sm">
        <div className="space-y-4">
          <p className="text-slate-300 text-sm">
            Rejecting inspection <span className="font-semibold text-white">#{actionModal?.inspection?.id}</span>
          </p>
          <div>
            <label className="label">Reject Reason *</label>
            <select value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="input">
              <option value="">— Select reason —</option>
              {rejectReasons.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setActionModal(null)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleReject} disabled={actionLoading || !rejectReason} className="btn-danger flex-1">
              {actionLoading ? <LoadingSpinner size="sm" /> : <><XCircle className="w-4 h-4" /> Reject</>}
            </button>
          </div>
        </div>
      </Modal>

      {/* Zoom */}
      {zoomedImage && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setZoomedImage(null)}>
          <img src={zoomedImage} alt="zoomed" className="max-w-full max-h-full rounded-xl" />
          <button className="absolute top-4 right-4 p-2 bg-slate-800 rounded-lg text-white"
            onClick={() => setZoomedImage(null)}><X className="w-5 h-5" /></button>
        </div>
      )}

      {/* AI Analysis Drawer */}
      {aiDrawerId && (
        <AIAnalysisDrawer inspectionId={aiDrawerId} onClose={() => setAiDrawerId(null)} />
      )}
    </div>
  );
}

function InspectionDetail({ ins, onZoom, onApprove, onReject, onDownload }) {
  return (
    <div className="space-y-4">
      {ins.is_recurring && (
        <div className="flex items-center gap-2 p-3 bg-orange-900/20 border border-orange-800 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-orange-400" />
          <p className="text-orange-300 text-sm font-medium">Recurring Defect — {ins.recurrence_count}× detected</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        {[{ label: "Original Image", key: "original_image" },
          { label: "Detected Image", key: "detected_image" }].map(({ label, key }) => (
          <div key={key}>
            <p className="text-xs text-slate-400 mb-2">{label}</p>
            <div className="relative group cursor-pointer rounded-xl overflow-hidden border border-slate-600"
              onClick={() => onZoom(inspectionAPI.imageUrl(ins[key]))}>
              <img src={inspectionAPI.imageUrl(ins[key])} alt={label} className="w-full h-44 object-cover" />
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
          { label: "Product",    value: ins.product?.product_name },
          { label: "Worker",     value: ins.worker?.name },
          { label: "Defect",     value: <DefectBadge defect={ins.defect} /> },
          { label: "Confidence", value: ins.confidence ? `${(ins.confidence * 100).toFixed(1)}%` : "—" },
          { label: "Severity",   value: <SeverityBadge severity={ins.severity} /> },
          { label: "Quality",    value: <QualityScoreInline score={ins.quality_score} label={ins.quality_label} /> },
          { label: "Status",     value: <StatusBadge status={ins.status} /> },
          { label: "Detection",  value: ins.detection_time_ms ? `${ins.detection_time_ms} ms` : "—" },
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
      {ins.status === "Rejected" && ins.reject_reason && (
        <div className="p-3 bg-red-900/20 border border-red-800 rounded-xl">
          <p className="text-xs text-red-400 mb-1">Reject Reason</p>
          <p className="text-red-300 font-medium">{ins.reject_reason}</p>
        </div>
      )}
      <div className="flex gap-3 pt-2 flex-wrap">
        {ins.status === "Pending" && (<>
          <button onClick={onApprove} className="btn-success flex-1">
            <CheckCircle className="w-4 h-4" /> Approve
          </button>
          <button onClick={onReject} className="btn-danger flex-1">
            <XCircle className="w-4 h-4" /> Reject
          </button>
        </>)}
        <button onClick={onDownload} className="btn-secondary flex-1">
          <Download className="w-4 h-4" /> Download Report
        </button>
      </div>

      {/* Defect Memory Panel */}
      <DefectMemoryPanel inspectionId={ins.id} defect={ins.defect} />
    </div>
  );
}
