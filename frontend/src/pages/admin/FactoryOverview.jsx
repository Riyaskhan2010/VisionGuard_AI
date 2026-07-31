import React, { useState, useEffect } from "react";
import {
  Settings2, Zap, Paintbrush, ShieldCheck, Package,
  Warehouse, Factory, AlertTriangle, CheckCircle, Clock,
  RefreshCw, ChevronRight, X, Activity, TrendingUp,
  Thermometer, Gauge, Cpu,
} from "lucide-react";
import { enterpriseAPI, analysisAPI } from "../../services/api";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorAlert from "../../components/ErrorAlert";
import { SkeletonCard } from "../../components/SkeletonLoader";
import Modal from "../../components/Modal";
import { SeverityBadge, StatusBadge } from "../../components/SeverityBadge";
import DefectBadge from "../../components/DefectBadge";
import { inspectionAPI } from "../../services/api";

const ICON_MAP = {
  Settings2, Zap, Paintbrush, ShieldCheck, Package, Warehouse, Factory,
};

const HEALTH_CONFIG = {
  Healthy:  { color: "text-emerald-400", bg: "bg-emerald-900/20", border: "border-emerald-800/60", dot: "bg-emerald-400", ring: "ring-emerald-500/20", emoji: "🟢" },
  Warning:  { color: "text-amber-400",   bg: "bg-amber-900/20",   border: "border-amber-800/60",   dot: "bg-amber-400",   ring: "ring-amber-500/20",   emoji: "🟡" },
  Critical: { color: "text-red-400",     bg: "bg-red-900/20",     border: "border-red-800/60",     dot: "bg-red-400",     ring: "ring-red-500/20",     emoji: "🔴" },
};

export default function FactoryOverview() {
  const [zones, setZones]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail]   = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [machineData, setMachineData] = useState(null);
  const [machineLoading, setMachineLoading] = useState(true);

  const fetchZones = async () => {
    setLoading(true); setError(null);
    try {
      const res = await enterpriseAPI.factoryZones();
      setZones(res.data.data || []);
    } catch (e) {
      setError("Failed to load factory zones.");
    } finally {
      setLoading(false);
    }
  };

  const openZone = async (zone) => {
    setSelected(zone);
    setDetailLoading(true);
    try {
      const res = await enterpriseAPI.zoneDetail(zone.id);
      setDetail(res.data.data);
    } catch { setDetail(null); }
    finally { setDetailLoading(false); }
  };

  useEffect(() => {
    fetchZones();
    analysisAPI.machineHealth()
      .then((r) => setMachineData(r.data.data))
      .catch(() => {})
      .finally(() => setMachineLoading(false));
  }, []);

  const healthCounts = zones.reduce((acc, z) => {
    acc[z.health_status] = (acc[z.health_status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Factory className="w-6 h-6 text-blue-400" /> Factory Overview
          </h1>
          <p className="page-subtitle">Real-time status across all production zones</p>
        </div>
        <button onClick={fetchZones} className="btn-secondary !px-3 !py-2">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error && <div className="mb-6"><ErrorAlert message={error} onRetry={fetchZones} /></div>}

      {/* Summary strip */}
      {!loading && zones.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Healthy Zones",  count: healthCounts.Healthy  || 0, cfg: HEALTH_CONFIG.Healthy  },
            { label: "Warning Zones",  count: healthCounts.Warning  || 0, cfg: HEALTH_CONFIG.Warning  },
            { label: "Critical Zones", count: healthCounts.Critical || 0, cfg: HEALTH_CONFIG.Critical },
          ].map(({ label, count, cfg }) => (
            <div key={label} className={`card ${cfg.bg} border ${cfg.border} flex items-center gap-3`}>
              <div className={`w-3 h-3 rounded-full ${cfg.dot} animate-pulse`} />
              <div>
                <p className={`text-2xl font-bold ${cfg.color}`}>{count}</p>
                <p className="text-slate-400 text-xs">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Zone grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {zones.map((zone) => <ZoneCard key={zone.id} zone={zone} onOpen={() => openZone(zone)} />)}
        </div>
      )}

      )}

      {/* ── Machine Digital Twin ── */}
      {!machineLoading && machineData && (
        <div className="mt-8 card">
          <div className="flex items-center gap-2 mb-5">
            <Cpu className="w-5 h-5 text-blue-400" />
            <h2 className="font-bold text-white">Machine Digital Twin</h2>
            <span className="text-xs bg-blue-900/40 text-blue-400 border border-blue-800 px-2 py-0.5 rounded-full ml-auto">
              Live Status
            </span>
          </div>

          {/* Overall health bar */}
          <div className="flex items-center gap-4 mb-5 p-3 bg-slate-700/30 rounded-xl border border-slate-700">
            <div className="text-center">
              <p className={`text-2xl font-black ${machineData.overall_health >= 80 ? "text-emerald-400" : machineData.overall_health >= 60 ? "text-amber-400" : "text-red-400"}`}>
                {machineData.overall_health}%
              </p>
              <p className="text-slate-500 text-xs">Overall</p>
            </div>
            <div className="flex-1">
              <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-1000
                  ${machineData.overall_health >= 80 ? "bg-gradient-to-r from-emerald-600 to-emerald-400"
                    : machineData.overall_health >= 60 ? "bg-gradient-to-r from-amber-600 to-amber-400"
                    : "bg-gradient-to-r from-red-600 to-red-400"}`}
                  style={{ width: `${machineData.overall_health}%` }} />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>🔴 {machineData.critical_count} Critical</span>
                <span>🟡 {machineData.warning_count} Warning</span>
                <span>🟢 {machineData.healthy_count} Healthy</span>
              </div>
            </div>
          </div>

          {/* Machine grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {machineData.machines.map((m) => (
              <MachineCard key={m.id} machine={m} />
            ))}
          </div>
        </div>
      )}

      {/* Detail modal */}
      <Modal isOpen={!!selected} onClose={() => { setSelected(null); setDetail(null); }}
        title={selected?.name || ""} size="lg">
        {detailLoading ? (
          <div className="flex justify-center py-12"><LoadingSpinner text="Loading zone details…" /></div>
        ) : detail ? (
          <ZoneDetail zone={selected} detail={detail} />
        ) : (
          <p className="text-slate-400 text-center py-8">No detail available.</p>
        )}
      </Modal>
    </div>
  );
}

/* ── Zone card ──────────────────────────────────────────────────────── */
function ZoneCard({ zone, onOpen }) {
  const cfg = HEALTH_CONFIG[zone.health_status] || HEALTH_CONFIG.Healthy;
  const Icon = ICON_MAP[zone.icon] || Factory;
  const approvalRate = zone.total_inspections > 0
    ? Math.round((zone.approved / zone.total_inspections) * 100) : 0;

  return (
    <button onClick={onOpen}
      className={`card text-left hover:scale-[1.02] transition-all duration-200 cursor-pointer
                  hover:border-slate-500 ring-1 ${cfg.ring} border ${cfg.border} group`}>
      {/* Top row */}
      <div className="flex items-start justify-between mb-4">
        <div className={`w-11 h-11 rounded-xl ${cfg.bg} border ${cfg.border}
                         flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${cfg.color}`} />
        </div>
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${cfg.dot} ${zone.health_status !== "Healthy" ? "animate-pulse" : ""}`} />
          <span className={`text-xs font-semibold ${cfg.color}`}>{zone.health_status}</span>
        </div>
      </div>

      <h3 className="font-bold text-white mb-0.5">{zone.name}</h3>
      <p className="text-slate-400 text-xs mb-4 line-clamp-1">{zone.description}</p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: "Inspections", value: zone.total_inspections, color: "text-blue-400" },
          { label: "Pending",     value: zone.pending,           color: "text-amber-400" },
          { label: "Critical",    value: zone.critical_defects,  color: "text-red-400"  },
        ].map(({ label, value, color }) => (
          <div key={label} className="text-center bg-slate-700/30 rounded-lg p-2">
            <p className={`text-lg font-bold ${color}`}>{value}</p>
            <p className="text-slate-500 text-[10px]">{label}</p>
          </div>
        ))}
      </div>

      {/* Quality bar */}
      <div className="mb-2">
        <div className="flex justify-between text-xs text-slate-400 mb-1">
          <span>Avg Quality Score</span>
          <span className="font-semibold text-white">{zone.avg_quality_score}/100</span>
        </div>
        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700
                        ${zone.avg_quality_score >= 80 ? "bg-emerald-500"
                          : zone.avg_quality_score >= 60 ? "bg-amber-500" : "bg-red-500"}`}
            style={{ width: `${zone.avg_quality_score}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        <span className="text-slate-500 text-xs">Approval rate: {approvalRate}%</span>
        <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
      </div>
    </button>
  );
}

/* ── Zone detail modal body ─────────────────────────────────────────── */
function ZoneDetail({ zone, detail }) {
  const cfg = HEALTH_CONFIG[zone.health_status] || HEALTH_CONFIG.Healthy;
  const Icon = ICON_MAP[zone.icon] || Factory;
  const recent = detail.recent_inspections || [];

  return (
    <div className="space-y-5">
      {/* Zone header */}
      <div className={`flex items-center gap-4 p-4 rounded-xl ${cfg.bg} border ${cfg.border}`}>
        <div className={`w-12 h-12 rounded-xl ${cfg.bg} border ${cfg.border} flex items-center justify-center`}>
          <Icon className={`w-6 h-6 ${cfg.color}`} />
        </div>
        <div>
          <h3 className="font-bold text-white text-lg">{zone.name}</h3>
          <p className="text-slate-400 text-sm">{zone.description}</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot} animate-pulse`} />
          <span className={`font-bold ${cfg.color}`}>{zone.health_status}</span>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Inspections", value: zone.total_inspections, color: "text-blue-400" },
          { label: "Pending",           value: zone.pending,           color: "text-amber-400" },
          { label: "Critical Defects",  value: zone.critical_defects,  color: "text-red-400"  },
          { label: "Avg Quality",       value: `${zone.avg_quality_score}/100`, color: "text-emerald-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-slate-700/30 rounded-xl p-3 text-center">
            <p className={`text-xl font-bold ${color}`}>{value}</p>
            <p className="text-slate-500 text-xs mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Recent inspections */}
      <div>
        <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-400" /> Recent Inspections
        </h4>
        {recent.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-6">No inspections yet.</p>
        ) : (
          <div className="space-y-2">
            {recent.map((ins) => (
              <div key={ins.id}
                className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-xl border border-slate-700/50">
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-700 flex-shrink-0">
                  {ins.original_image
                    ? <img src={inspectionAPI.imageUrl(ins.original_image)} alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.style.display = "none"; }} />
                    : <Factory className="w-5 h-5 text-slate-500 m-auto mt-2.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {ins.product?.product_name || `Product #${ins.product_id}`}
                  </p>
                  <p className="text-xs text-slate-400">{new Date(ins.created_at).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <DefectBadge defect={ins.defect} />
                  <StatusBadge status={ins.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Machine Card ───────────────────────────────────────────────────── */
function MachineCard({ machine: m }) {
  const hcfg = HEALTH_CONFIG[m.health_status] || HEALTH_CONFIG.Healthy;
  return (
    <div className={`p-4 rounded-xl border ${hcfg.border} ${hcfg.bg} transition-all hover:scale-[1.01]`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-bold text-white text-sm">{m.name}</p>
          <p className="text-slate-400 text-xs">{m.zone}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${hcfg.dot} ${m.health_status !== "Healthy" ? "animate-pulse" : ""}`} />
          <span className={`text-xs font-semibold ${hcfg.color}`}>{m.health_status}</span>
        </div>
      </div>

      {/* Health score bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-slate-400">Health</span>
          <span className={`font-bold ${hcfg.color}`}>{m.health_score}%</span>
        </div>
        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700
            ${m.health_score >= 80 ? "bg-emerald-500" : m.health_score >= 60 ? "bg-amber-500" : "bg-red-500"}`}
            style={{ width: `${m.health_score}%` }} />
        </div>
      </div>

      {/* Sensor readings */}
      <div className="grid grid-cols-3 gap-1.5 text-center">
        <div className="bg-slate-800/60 rounded-lg p-1.5">
          <Gauge className="w-3 h-3 text-blue-400 mx-auto mb-0.5" />
          <p className="text-xs font-bold text-white">{m.utilization}%</p>
          <p className="text-[10px] text-slate-500">Util.</p>
        </div>
        <div className="bg-slate-800/60 rounded-lg p-1.5">
          <Thermometer className="w-3 h-3 text-orange-400 mx-auto mb-0.5" />
          <p className="text-xs font-bold text-white">{m.temperature}°C</p>
          <p className="text-[10px] text-slate-500">Temp</p>
        </div>
        <div className="bg-slate-800/60 rounded-lg p-1.5">
          <Zap className="w-3 h-3 text-yellow-400 mx-auto mb-0.5" />
          <p className="text-xs font-bold text-white">{m.vibration}</p>
          <p className="text-[10px] text-slate-500">Vib.</p>
        </div>
      </div>

      <p className="text-[10px] text-slate-500 mt-2 text-right">
        Next maint: {new Date(m.next_maintenance).toLocaleDateString()}
      </p>
    </div>
  );
}
