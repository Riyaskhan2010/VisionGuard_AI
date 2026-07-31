import React, { useState, useEffect } from "react";
import {
  X, Brain, Zap, Target, Clock, ShieldAlert, Eye,
  ChevronDown, ChevronUp, Lightbulb, Info, ZoomIn,
} from "lucide-react";
import { analysisAPI, inspectionAPI } from "../services/api";
import { SeverityBadge } from "./SeverityBadge";
import DefectBadge from "./DefectBadge";
import { QualityScoreInline } from "./QualityScoreMeter";
import LoadingSpinner from "./LoadingSpinner";

const CONF_COLOR = (c) =>
  c >= 0.8 ? "text-emerald-400" : c >= 0.6 ? "text-amber-400" : "text-red-400";

const SEV_BAR = { Critical: "bg-red-500 w-full", Medium: "bg-amber-500 w-3/4", Low: "bg-blue-500 w-1/2", None: "bg-emerald-500 w-1/4" };

export default function AIAnalysisDrawer({ inspectionId, onClose }) {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);
  const [zoomedImg, setZoomedImg] = useState(null);
  const [explainOpen, setExplainOpen] = useState(true);

  useEffect(() => {
    if (!inspectionId) return;
    setLoading(true); setError(null);
    analysisAPI.explain(inspectionId)
      .then((r) => setData(r.data.data))
      .catch(() => setError("Failed to load AI analysis."))
      .finally(() => setLoading(false));
  }, [inspectionId]);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-slate-900 border-l
                      border-slate-700 shadow-2xl flex flex-col overflow-hidden
                      animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700
                        bg-gradient-to-r from-blue-900/30 to-purple-900/30 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg
                            flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">AI Analysis</p>
              <p className="text-slate-400 text-xs">Inspection #{inspectionId}</p>
            </div>
          </div>
          <button onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {loading && (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <LoadingSpinner size="lg" />
              <p className="text-slate-400 text-sm">Loading AI analysis…</p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-900/20 border border-red-800 rounded-xl">
              <ShieldAlert className="w-5 h-5 text-red-400" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {data && (
            <div className="space-y-5 animate-fade-in">
              {/* Images */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Original Image",  key: "original_image" },
                  { label: "Detected Image",  key: "detected_image" },
                ].map(({ label, key }) => (
                  <div key={key}>
                    <p className="text-xs text-slate-400 font-medium mb-1.5">{label}</p>
                    <div
                      className="relative group cursor-zoom-in rounded-xl overflow-hidden border border-slate-600"
                      onClick={() => setZoomedImg(inspectionAPI.imageUrl(data[key]))}
                    >
                      <img
                        src={inspectionAPI.imageUrl(data[key])}
                        alt={label}
                        className="w-full h-40 object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100
                                      transition-opacity flex items-center justify-center">
                        <ZoomIn className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Heatmap note */}
              <div className="flex items-start gap-2 p-3 bg-blue-900/15 border border-blue-800/40 rounded-xl">
                <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-blue-300 text-xs leading-relaxed">
                  The detected image contains bounding box overlays highlighting defect regions.
                  Heatmap intensity corresponds to detection confidence — brighter regions indicate
                  higher certainty zones.
                </p>
              </div>

              {/* Detection metrics */}
              <div className="grid grid-cols-2 gap-3">
                <MetricCard icon={Target} label="Defect Type" color="text-red-400">
                  <DefectBadge defect={data.defect} />
                </MetricCard>
                <MetricCard icon={Zap} label="Confidence Score" color="text-blue-400">
                  <span className={`text-xl font-bold ${CONF_COLOR(data.confidence || 0)}`}>
                    {data.confidence ? `${(data.confidence * 100).toFixed(1)}%` : "N/A"}
                  </span>
                </MetricCard>
                <MetricCard icon={ShieldAlert} label="Severity" color="text-orange-400">
                  <SeverityBadge severity={data.severity} />
                </MetricCard>
                <MetricCard icon={Clock} label="Detection Time" color="text-emerald-400">
                  <span className="text-xl font-bold text-white">
                    {data.detection_time_ms ? `${data.detection_time_ms}ms` : "—"}
                  </span>
                </MetricCard>
              </div>

              {/* Confidence bar */}
              {data.confidence != null && (
                <div className="p-3 bg-slate-800/60 border border-slate-700 rounded-xl">
                  <div className="flex justify-between text-xs text-slate-400 mb-2">
                    <span className="flex items-center gap-1">
                      <Target className="w-3.5 h-3.5" /> Detection Confidence
                    </span>
                    <span className={`font-bold ${CONF_COLOR(data.confidence)}`}>
                      {(data.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2.5 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ease-out
                                  ${data.confidence >= 0.8 ? "bg-emerald-500"
                                    : data.confidence >= 0.6 ? "bg-amber-500" : "bg-red-500"}`}
                      style={{ width: `${(data.confidence * 100).toFixed(1)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Severity Risk Bar */}
              <div className="p-3 bg-slate-800/60 border border-slate-700 rounded-xl">
                <p className="text-xs text-slate-400 mb-2 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" /> Severity Risk Level
                </p>
                <div className="h-2.5 bg-slate-700 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-1000 ${SEV_BAR[data.severity] || SEV_BAR.None}`} />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>Low</span><span>Medium</span><span>High</span><span>Critical</span>
                </div>
              </div>

              {/* Bounding boxes */}
              {data.bounding_boxes?.length > 0 && (
                <div className="p-3 bg-slate-800/60 border border-slate-700 rounded-xl">
                  <p className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-blue-400" /> Bounding Box Coordinates
                  </p>
                  {data.bounding_boxes.map((box, i) => (
                    <div key={i} className="text-xs text-slate-400 bg-slate-700/40 rounded-lg p-2 mb-1.5 last:mb-0 font-mono">
                      [{box.x1}, {box.y1}] → [{box.x2}, {box.y2}]
                      <span className="ml-2 text-blue-400">conf: {(box.confidence * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              )}

              {/* AI Explanation */}
              {data.explanation && (
                <div className="border border-purple-800/50 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExplainOpen(!explainOpen)}
                    className="w-full flex items-center justify-between px-4 py-3
                               bg-purple-900/20 hover:bg-purple-900/30 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-purple-400" />
                      <span className="font-semibold text-white text-sm">Explain AI Decision</span>
                    </div>
                    {explainOpen
                      ? <ChevronUp className="w-4 h-4 text-slate-400" />
                      : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </button>

                  {explainOpen && (
                    <div className="p-4 space-y-3 animate-fade-in">
                      <ExplainRow label="Decision Basis" value={data.explanation.decision_basis} />
                      <ExplainRow label="Confidence Reasoning" value={data.explanation.confidence_reasoning} />
                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                          Key Feature Highlights
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {data.explanation.feature_highlights?.map((f) => (
                            <span key={f} className="text-xs bg-slate-700 text-slate-300
                                                      border border-slate-600 px-2.5 py-1 rounded-lg">
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-4 pt-1">
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase">Model</p>
                          <p className="text-xs text-slate-300 font-medium">{data.explanation.model_version}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase">False Positive Rate</p>
                          <p className="text-xs text-slate-300 font-medium">{data.explanation.false_positive_rate}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Recommendation summary */}
              {data.recommendation && (
                <div className="p-4 bg-slate-800/60 border border-slate-700 rounded-xl space-y-2">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Brain className="w-3.5 h-3.5 text-blue-400" /> AI Recommendation Summary
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-700/40 rounded-lg p-2">
                      <p className="text-slate-500 mb-0.5">Priority</p>
                      <p className={`font-bold ${
                        data.recommendation.maintenance_priority === "Critical" ? "text-red-400"
                        : data.recommendation.maintenance_priority === "Medium" ? "text-amber-400"
                        : "text-blue-400"}`}>
                        {data.recommendation.maintenance_priority}
                      </p>
                    </div>
                    <div className="bg-slate-700/40 rounded-lg p-2">
                      <p className="text-slate-500 mb-0.5">Repair Time</p>
                      <p className="text-white font-medium">{data.recommendation.estimated_repair_time}</p>
                    </div>
                    <div className="col-span-2 bg-slate-700/40 rounded-lg p-2">
                      <p className="text-slate-500 mb-0.5">Corrective Action</p>
                      <p className="text-slate-200 leading-relaxed line-clamp-3">{data.recommendation.corrective_action}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Quality */}
              {data.quality_score != null && (
                <div className="flex items-center gap-3 p-3 bg-slate-800/60 border border-slate-700 rounded-xl">
                  <p className="text-xs text-slate-400">Quality Score:</p>
                  <QualityScoreInline score={data.quality_score} label={data.quality_label} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Zoom overlay */}
      {zoomedImg && (
        <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setZoomedImg(null)}>
          <img src={zoomedImg} alt="zoom" className="max-w-full max-h-full rounded-xl" />
          <button className="absolute top-4 right-4 p-2 bg-slate-800 rounded-lg text-white"
            onClick={() => setZoomedImg(null)}>
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </>
  );
}

function MetricCard({ icon: Icon, label, color, children }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3">
      <p className={`text-[10px] font-bold uppercase tracking-wide mb-1.5 flex items-center gap-1 ${color}`}>
        <Icon className="w-3 h-3" /> {label}
      </p>
      {children}
    </div>
  );
}

function ExplainRow({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-slate-200 text-xs leading-relaxed">{value}</p>
    </div>
  );
}
