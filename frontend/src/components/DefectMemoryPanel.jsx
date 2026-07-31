import React, { useState, useEffect } from "react";
import { Database, CheckCircle, XCircle, Clock, ZoomIn, X, ChevronDown, ChevronUp } from "lucide-react";
import { analysisAPI, inspectionAPI } from "../services/api";
import LoadingSpinner from "./LoadingSpinner";
import { StatusBadge } from "./SeverityBadge";

export default function DefectMemoryPanel({ inspectionId, defect }) {
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen]   = useState(false);
  const [zoomedImg, setZoomedImg] = useState(null);

  const load = () => {
    if (!inspectionId || loading) return;
    setLoading(true);
    analysisAPI.defectMemory(inspectionId)
      .then((r) => { setData(r.data.data); setOpen(true); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  if (!defect || defect === "none") return null;

  return (
    <div className="border border-slate-700 rounded-xl overflow-hidden">
      {/* Toggle header */}
      <button
        onClick={() => { if (!data) load(); else setOpen(!open); }}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/60
                   hover:bg-slate-700/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-white text-sm">Similar Previous Defects</span>
          {data && (
            <span className="text-xs bg-cyan-900/40 text-cyan-400 border border-cyan-800 px-2 py-0.5 rounded-full ml-1">
              {data.all_time_count} cases
            </span>
          )}
        </div>
        {loading
          ? <LoadingSpinner size="sm" />
          : open
            ? <ChevronUp className="w-4 h-4 text-slate-400" />
            : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {open && data && (
        <div className="px-4 pb-4 pt-1 space-y-4 animate-fade-in">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            <StatPill label="Total Cases" value={data.all_time_count} color="text-blue-400" />
            <StatPill label="Success Rate" value={data.success_rate != null ? `${data.success_rate}%` : "N/A"} color="text-emerald-400" />
            <StatPill label="Avg Confidence" value={data.avg_confidence ? `${data.avg_confidence}%` : "N/A"} color="text-amber-400" />
          </div>

          {/* Root cause */}
          <div className="p-3 bg-yellow-900/10 border border-yellow-800/40 rounded-xl">
            <p className="text-[10px] font-bold text-yellow-400 uppercase tracking-wide mb-1">Primary Root Cause</p>
            <p className="text-slate-200 text-sm">{data.primary_root_cause}</p>
          </div>

          {/* Recommended fix */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-blue-900/10 border border-blue-800/40 rounded-xl">
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wide mb-1">Recommended Fix</p>
              <p className="text-slate-300 text-xs leading-relaxed line-clamp-3">{data.recommended_fix}</p>
            </div>
            <div className="p-3 bg-emerald-900/10 border border-emerald-800/40 rounded-xl">
              <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide mb-1">Preventive Action</p>
              <p className="text-slate-300 text-xs leading-relaxed line-clamp-3">{data.preventive_action}</p>
            </div>
          </div>

          {/* Similar cases */}
          {data.similar_cases?.length > 0 ? (
            <div>
              <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Similar Cases</p>
              <div className="space-y-2">
                {data.similar_cases.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-xl
                                              border border-slate-700/50 hover:bg-slate-700/50 transition-colors">
                    {/* Thumbnail */}
                    <div
                      className="w-12 h-12 rounded-lg overflow-hidden bg-slate-700 flex-shrink-0 cursor-pointer group relative"
                      onClick={() => setZoomedImg(inspectionAPI.imageUrl(c.detected_image || c.original_image))}
                    >
                      <img
                        src={inspectionAPI.imageUrl(c.original_image)}
                        alt=""
                        className="w-full h-full object-cover group-hover:opacity-70 transition-opacity"
                        onError={(e) => { e.target.style.display = "none"; }}
                      />
                      <ZoomIn className="absolute inset-0 m-auto w-4 h-4 text-white opacity-0 group-hover:opacity-100" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{c.product_name}</p>
                      <p className="text-xs text-slate-400">{c.worker_name} · {new Date(c.created_at).toLocaleDateString()}</p>
                      {c.confidence && (
                        <p className="text-xs text-slate-500">Confidence: {(c.confidence * 100).toFixed(1)}%</p>
                      )}
                    </div>

                    <div className="flex-shrink-0">
                      <StatusBadge status={c.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-slate-500 text-sm text-center py-3">No similar cases found in memory.</p>
          )}
        </div>
      )}

      {/* Zoom */}
      {zoomedImg && (
        <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setZoomedImg(null)}>
          <img src={zoomedImg} alt="zoom" className="max-w-full max-h-full rounded-xl" />
          <button className="absolute top-4 right-4 p-2 bg-slate-800 rounded-lg text-white"
            onClick={() => setZoomedImg(null)}><X className="w-5 h-5" /></button>
        </div>
      )}
    </div>
  );
}

function StatPill({ label, value, color }) {
  return (
    <div className="bg-slate-700/40 rounded-xl p-2.5 text-center">
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      <p className="text-slate-500 text-[10px] mt-0.5">{label}</p>
    </div>
  );
}
