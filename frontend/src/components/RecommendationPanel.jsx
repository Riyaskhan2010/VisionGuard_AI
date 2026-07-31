import React, { useEffect, useState } from "react";
import {
  Brain, AlertTriangle, Wrench, Clock, Users, Shield,
  ChevronDown, ChevronUp, RefreshCw, Lightbulb, Zap,
} from "lucide-react";
import { enterpriseAPI } from "../services/api";
import LoadingSpinner from "./LoadingSpinner";

const PRIORITY_STYLES = {
  Critical: { bg: "bg-red-900/20",    border: "border-red-800",    text: "text-red-400",    badge: "bg-red-900/50 text-red-400 border-red-800" },
  High:     { bg: "bg-orange-900/20", border: "border-orange-800", text: "text-orange-400", badge: "bg-orange-900/50 text-orange-400 border-orange-800" },
  Medium:   { bg: "bg-amber-900/20",  border: "border-amber-800",  text: "text-amber-400",  badge: "bg-amber-900/50 text-amber-400 border-amber-800" },
  Low:      { bg: "bg-blue-900/20",   border: "border-blue-800",   text: "text-blue-400",   badge: "bg-blue-900/50 text-blue-400 border-blue-800" },
};

export default function RecommendationPanel({ inspectionId, defect, autoLoad = false }) {
  const [rec, setRec]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState(null);
  const [expanded, setExpanded] = useState(true);

  const load = async () => {
    if (!inspectionId) return;
    setLoading(true); setError(null);
    try {
      const res = await enterpriseAPI.recommendation(inspectionId);
      setRec(res.data.data);
    } catch (e) {
      setError("Failed to load recommendation.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (autoLoad && inspectionId) load(); }, [inspectionId]);

  const style = PRIORITY_STYLES[rec?.maintenance_priority] || PRIORITY_STYLES.Low;

  return (
    <div className={`border rounded-xl overflow-hidden transition-all duration-300
                     ${rec ? `${style.border} ${style.bg}` : "border-slate-700 bg-slate-800/40"}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/60">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-400" />
          <span className="font-semibold text-white text-sm">AI Smart Recommendation</span>
          {rec && (
            <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${style.badge}`}>
              {rec.maintenance_priority} Priority
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!rec && !loading && (
            <button onClick={load} className="btn-secondary !px-3 !py-1.5 text-xs gap-1.5">
              <Brain className="w-3.5 h-3.5" /> Analyze
            </button>
          )}
          {rec && (
            <>
              <button onClick={load} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setExpanded(!expanded)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg">
                {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Body */}
      {loading && (
        <div className="flex items-center justify-center py-8 gap-3">
          <LoadingSpinner size="sm" />
          <span className="text-slate-400 text-sm">Analyzing defect patterns…</span>
        </div>
      )}
      {error && <p className="text-red-400 text-sm px-4 py-3">{error}</p>}

      {rec && expanded && (
        <div className="p-4 space-y-4 animate-fade-in">
          {/* Safety Warning */}
          {rec.safety_warning && (
            <div className="flex items-start gap-3 p-3 bg-red-900/30 border border-red-700 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-300 text-xs font-bold uppercase tracking-wide mb-0.5">Safety Warning</p>
                <p className="text-red-200 text-sm leading-relaxed">{rec.safety_warning}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Root Cause */}
            <RecCard icon={Lightbulb} title="Primary Root Cause" color="text-yellow-400"
              bg="bg-yellow-900/10" border="border-yellow-800/40">
              <p className="text-slate-200 text-sm">{rec.root_cause_primary}</p>
              {rec.root_causes_all?.length > 1 && (
                <ul className="mt-2 space-y-1">
                  {rec.root_causes_all.slice(1).map((c, i) => (
                    <li key={i} className="text-slate-400 text-xs flex items-start gap-1.5">
                      <span className="text-slate-600 mt-0.5">•</span>{c}
                    </li>
                  ))}
                </ul>
              )}
            </RecCard>

            {/* Corrective Action */}
            <RecCard icon={Wrench} title="Corrective Action" color="text-blue-400"
              bg="bg-blue-900/10" border="border-blue-800/40">
              <p className="text-slate-200 text-sm leading-relaxed">{rec.corrective_action}</p>
            </RecCard>

            {/* Repair Time */}
            <RecCard icon={Clock} title="Estimated Repair Time" color="text-emerald-400"
              bg="bg-emerald-900/10" border="border-emerald-800/40">
              <p className="text-2xl font-bold text-white">{rec.estimated_repair_time}</p>
            </RecCard>

            {/* Maintenance Team */}
            <RecCard icon={Users} title="Suggested Team" color="text-purple-400"
              bg="bg-purple-900/10" border="border-purple-800/40">
              <p className="text-slate-200 text-sm font-medium">{rec.maintenance_team}</p>
            </RecCard>
          </div>

          {/* Preventive Maintenance */}
          <RecCard icon={Shield} title="Preventive Maintenance Recommendation"
            color="text-cyan-400" bg="bg-cyan-900/10" border="border-cyan-800/40">
            <p className="text-slate-200 text-sm leading-relaxed">{rec.preventive_maintenance}</p>
          </RecCard>

          {/* Recurring badge */}
          {rec.is_recurring && (
            <div className="flex items-center gap-2 p-3 bg-orange-900/20 border border-orange-800/60 rounded-xl">
              <Zap className="w-4 h-4 text-orange-400 flex-shrink-0" />
              <p className="text-orange-300 text-sm">
                <span className="font-bold">Recurring Issue:</span> This defect has occurred{" "}
                {rec.recurrence_count}× on this product. Immediate process investigation recommended.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Placeholder when not yet loaded */}
      {!rec && !loading && !error && (
        <div className="flex flex-col items-center py-8 gap-2 text-center px-6">
          <Brain className="w-8 h-8 text-slate-600" />
          <p className="text-slate-400 text-sm">Click "Analyze" to generate AI recommendations for this inspection.</p>
        </div>
      )}
    </div>
  );
}

function RecCard({ icon: Icon, title, color, bg, border, children }) {
  return (
    <div className={`p-3 rounded-xl border ${bg} ${border}`}>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className={`w-3.5 h-3.5 ${color}`} />
        <p className={`text-xs font-semibold uppercase tracking-wide ${color}`}>{title}</p>
      </div>
      {children}
    </div>
  );
}
