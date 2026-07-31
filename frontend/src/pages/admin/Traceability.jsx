import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  QrCode, Search, Package, Download, ChevronDown,
  CheckCircle, XCircle, Clock, AlertTriangle, ZoomIn, X, FileText,
} from "lucide-react";
import { enterpriseAPI, authAPI, inspectionAPI, adminAPI } from "../../services/api";
import { SeverityBadge, StatusBadge } from "../../components/SeverityBadge";
import DefectBadge from "../../components/DefectBadge";
import { QualityScoreInline } from "../../components/QualityScoreMeter";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorAlert from "../../components/ErrorAlert";
import EmptyState from "../../components/EmptyState";
import { useToast } from "../../hooks/useToast";
import Toast from "../../components/Toast";

/* QR code drawn on a canvas using a simple URL-based approach */
function QRCodeDisplay({ value, size = 160 }) {
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&bgcolor=1e293b&color=e2e8f0&format=svg`;
  return (
    <div className="bg-slate-700 rounded-xl p-3 flex items-center justify-center border border-slate-600"
         style={{ width: size + 24, height: size + 24 }}>
      <img src={url} alt={`QR for ${value}`} width={size} height={size}
           className="rounded-lg" onError={(e) => { e.target.style.display = "none"; }} />
    </div>
  );
}

export default function Traceability() {
  const { toasts, toast, removeToast } = useToast();
  const [searchParams] = useSearchParams();
  const [products, setProducts]   = useState([]);
  const [selected, setSelected]   = useState("");
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [zoomedImage, setZoomedImage] = useState(null);

  useEffect(() => {
    authAPI.products().then((r) => setProducts(r.data.data || []));
    const pid = searchParams.get("product");
    if (pid) { setSelected(pid); fetchTraceability(pid); }
  }, []);

  const fetchTraceability = async (pid) => {
    if (!pid) return;
    setLoading(true); setError(null);
    try {
      const res = await enterpriseAPI.traceability(pid);
      setData(res.data.data);
    } catch (e) {
      setError("Product not found or no inspection data available.");
    } finally { setLoading(false); }
  };

  const handleSearch = () => fetchTraceability(selected);

  const handleDownloadReport = async (insId) => {
    try {
      const url = adminAPI.reportUrl(insId);
      const token = localStorage.getItem("vg_token");
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `VisionGuard_Report_${insId}.${blob.type.includes("pdf") ? "pdf" : "txt"}`;
      a.click();
      toast.success("Report downloaded.");
    } catch { toast.error("Download failed."); }
  };

  const traceUrl = data?.product ? `${window.location.origin}/admin/traceability?product=${data.product.product_id}` : "";

  return (
    <div className="animate-fade-in">
      <Toast toasts={toasts} removeToast={removeToast} />

      <div className="page-header">
        <h1 className="page-title flex items-center gap-2">
          <QrCode className="w-6 h-6 text-blue-400" /> Product QR Traceability
        </h1>
        <p className="page-subtitle">Full inspection history, QR code, and traceability chain per product</p>
      </div>

      {/* Search bar */}
      <div className="card mb-6">
        <div className="flex gap-3 flex-wrap">
          <select value={selected} onChange={(e) => setSelected(e.target.value)}
            className="input flex-1 min-w-[200px]">
            <option value="">— Select a product —</option>
            {products.map((p) => (
              <option key={p.id} value={p.product_id}>{p.product_name} ({p.product_id})</option>
            ))}
          </select>
          <button onClick={handleSearch} disabled={!selected || loading}
            className="btn-primary !px-6">
            {loading ? <LoadingSpinner size="sm" /> : <><Search className="w-4 h-4" /> Trace</>}
          </button>
        </div>
      </div>

      {error && <div className="mb-6"><ErrorAlert message={error} /></div>}

      {loading && (
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" text="Loading traceability data…" /></div>
      )}

      {data && !loading && (
        <div className="space-y-6 animate-fade-in">
          {/* Product header + QR */}
          <div className="card">
            <div className="flex flex-wrap gap-6 items-start">
              {/* QR */}
              <div className="flex flex-col items-center gap-2">
                <QRCodeDisplay value={traceUrl} size={140} />
                <p className="text-xs text-slate-400 text-center">Scan to trace</p>
                <a href={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(traceUrl)}&bgcolor=1e293b&color=e2e8f0`}
                  download={`QR_${data.product.product_id}.svg`}
                  className="btn-secondary !px-3 !py-1.5 text-xs">
                  <Download className="w-3 h-3" /> Download QR
                </a>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-2 mb-1">
                  <Package className="w-5 h-5 text-blue-400" />
                  <h2 className="text-xl font-bold text-white">{data.product.product_name}</h2>
                </div>
                <p className="text-slate-400 text-sm font-mono mb-4">{data.product.product_id}</p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Total",    value: data.summary.total,    color: "text-blue-400" },
                    { label: "Approved", value: data.summary.approved, color: "text-emerald-400" },
                    { label: "Rejected", value: data.summary.rejected, color: "text-red-400" },
                    { label: "Avg Quality", value: `${data.summary.avg_quality_score}/100`, color: "text-purple-400" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-slate-700/40 rounded-xl p-3 text-center">
                      <p className={`text-xl font-bold ${color}`}>{value}</p>
                      <p className="text-slate-500 text-xs">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Defect summary pills */}
                {Object.keys(data.summary.defect_summary).length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {Object.entries(data.summary.defect_summary).map(([d, c]) => (
                      <span key={d} className="text-xs bg-slate-700 text-slate-300 px-2.5 py-1 rounded-full border border-slate-600">
                        {d.replace("_", " ")} × {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Inspection timeline */}
          <div>
            <h3 className="font-bold text-white mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              Inspection Timeline — {data.inspections.length} record{data.inspections.length !== 1 ? "s" : ""}
            </h3>

            {data.inspections.length === 0 ? (
              <div className="card"><EmptyState title="No inspections" icon={Package} /></div>
            ) : (
              <div className="relative pl-8">
                <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-slate-700" />
                {data.inspections.map((ins, idx) => (
                  <TimelineEntry key={ins.id} ins={ins} idx={idx}
                    total={data.inspections.length}
                    onZoom={setZoomedImage}
                    onDownload={handleDownloadReport} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {!data && !loading && !error && (
        <div className="card">
          <EmptyState title="Select a product to trace"
            description="Choose a product from the dropdown and click Trace to view its full inspection history and QR code."
            icon={QrCode} />
        </div>
      )}

      {/* Zoom modal */}
      {zoomedImage && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setZoomedImage(null)}>
          <img src={zoomedImage} alt="zoomed" className="max-w-full max-h-full rounded-xl" />
          <button className="absolute top-4 right-4 p-2 bg-slate-800 rounded-lg text-white"
            onClick={() => setZoomedImage(null)}><X className="w-5 h-5" /></button>
        </div>
      )}
    </div>
  );
}

function TimelineEntry({ ins, idx, total, onZoom, onDownload }) {
  const [expanded, setExpanded] = useState(idx === 0);
  const dotColor = ins.status === "Approved" ? "bg-emerald-400"
    : ins.status === "Rejected" ? "bg-red-400" : "bg-amber-400";

  return (
    <div className="relative mb-4 last:mb-0">
      <div className={`absolute -left-5 top-4 w-3.5 h-3.5 rounded-full border-2
                        border-slate-900 ${dotColor} z-10`} />
      <div className={`border rounded-xl overflow-hidden transition-all duration-200
                       ${ins.severity === "Critical" ? "border-red-800/50" : "border-slate-700"}`}>
        {/* Summary row — always visible */}
        <button onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700/20 transition-colors text-left">
          <span className="text-slate-500 text-xs font-mono w-6 flex-shrink-0">#{total - idx}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <DefectBadge defect={ins.defect} />
              <StatusBadge status={ins.status} />
              <SeverityBadge severity={ins.severity} />
              {ins.is_recurring && <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {ins.worker?.name} · {new Date(ins.created_at).toLocaleString()}
            </p>
          </div>
          <QualityScoreInline score={ins.quality_score} label={ins.quality_label} />
          <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
        </button>

        {/* Expanded detail */}
        {expanded && (
          <div className="px-4 pb-4 pt-0 border-t border-slate-700/50 animate-fade-in">
            <div className="grid grid-cols-2 gap-3 mt-3">
              {[{ label: "Original", key: "original_image" },
                { label: "Detected", key: "detected_image" }].map(({ label, key }) => (
                <div key={key}>
                  <p className="text-xs text-slate-400 mb-1.5">{label}</p>
                  <div className="relative group cursor-pointer rounded-xl overflow-hidden border border-slate-600"
                    onClick={() => onZoom(inspectionAPI.imageUrl(ins[key]))}>
                    <img src={inspectionAPI.imageUrl(ins[key])} alt={label}
                      className="w-full h-32 object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100
                                    transition-opacity flex items-center justify-center">
                      <ZoomIn className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
              <div className="text-xs text-slate-400 space-y-0.5">
                {ins.confidence && <p>Confidence: {(ins.confidence * 100).toFixed(1)}%</p>}
                {ins.detection_time_ms && <p>Detection: {ins.detection_time_ms} ms</p>}
                {ins.reject_reason && <p className="text-red-400">Reject reason: {ins.reject_reason}</p>}
                <p>{ins.recommendation}</p>
              </div>
              <button onClick={() => onDownload(ins.id)}
                className="btn-secondary !px-3 !py-1.5 text-xs gap-1.5">
                <FileText className="w-3.5 h-3.5" /> PDF Report
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
