import React, { useState, useEffect } from "react";
import {
  TrendingUp, TrendingDown, AlertTriangle, Calendar,
  Zap, Package, Wrench, ArrowUp, ArrowDown, Minus,
} from "lucide-react";
import { enterpriseAPI } from "../services/api";
import { SkeletonChart } from "./SkeletonLoader";

export default function PredictiveSection() {
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    enterpriseAPI.predictive()
      .then((r) => setData(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <SkeletonChart />;
  if (!data)   return null;

  const trendUp   = data.trend_pct >= 0;
  const qualityUp = data.quality_trend === "Improving";
  const riskColor = { High: "text-red-400 bg-red-900/20 border-red-800", Medium: "text-amber-400 bg-amber-900/20 border-amber-800", Low: "text-emerald-400 bg-emerald-900/20 border-emerald-800" };

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-5">
        <Zap className="w-5 h-5 text-purple-400" />
        <h3 className="font-bold text-white">AI Predictive Quality Analytics</h3>
        <span className="text-xs bg-purple-900/40 text-purple-400 border border-purple-800 px-2 py-0.5 rounded-full font-medium ml-auto">
          AI Forecast
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {/* Next week forecast */}
        <ForecastCard
          icon={Calendar} color="blue"
          label="Expected Next Week"
          value={data.expected_next_week}
          suffix=" inspections"
          trend={trendUp ? "up" : "down"}
          trendVal={`${Math.abs(data.trend_pct)}%`}
          sub={trendUp ? "vs last week" : "vs last week"}
        />

        {/* Failure risk */}
        <div className={`p-4 rounded-xl border ${riskColor[data.failure_risk]}`}>
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle className="w-4 h-4" />
            <p className="text-xs font-bold uppercase tracking-wide">Failure Risk</p>
          </div>
          <p className="text-2xl font-black">{data.failure_risk}</p>
          <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-current rounded-full opacity-60"
              style={{ width: `${data.failure_risk_pct}%`, transition: "width 1s ease" }} />
          </div>
          <p className="text-xs mt-1 opacity-70">{data.failure_risk_pct}% probability</p>
        </div>

        {/* Quality trend */}
        <ForecastCard
          icon={qualityUp ? TrendingUp : TrendingDown}
          color={qualityUp ? "green" : "red"}
          label="Quality Trend"
          value={data.quality_trend}
          trend={qualityUp ? "up" : "down"}
          trendVal={`${Math.abs(data.quality_trend_pct)}%`}
          sub="vs last 7 days"
        />

        {/* Monthly forecast */}
        <ForecastCard
          icon={Calendar} color="purple"
          label="Monthly Forecast"
          value={data.monthly_forecast}
          suffix=" inspections"
          sub="30-day projection"
        />
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-700 pt-4">
        {/* Top recurring */}
        {data.top_recurring_defect && (
          <div className="bg-orange-900/10 border border-orange-800/40 rounded-xl p-3">
            <p className="text-xs text-orange-400 font-bold uppercase mb-1">Top Recurring Defect</p>
            <p className="text-white font-bold capitalize">{data.top_recurring_defect.defect?.replace("_", " ")}</p>
            <p className="text-slate-400 text-xs">{data.top_recurring_defect.product_name} · {data.top_recurring_defect.count}×</p>
          </div>
        )}

        {/* Most problematic */}
        {data.most_problematic_product && (
          <div className="bg-red-900/10 border border-red-800/40 rounded-xl p-3">
            <p className="text-xs text-red-400 font-bold uppercase mb-1">Most Critical Product</p>
            <p className="text-white font-bold">{data.most_problematic_product.product_name}</p>
            <p className="text-slate-400 text-xs">{data.most_problematic_product.critical_count} critical defects</p>
          </div>
        )}

        {/* Next maintenance */}
        {data.maintenance_schedule?.[0] && (
          <div className="bg-blue-900/10 border border-blue-800/40 rounded-xl p-3">
            <p className="text-xs text-blue-400 font-bold uppercase mb-1">Next Maintenance</p>
            <p className="text-white font-bold text-sm">{data.maintenance_schedule[0].task}</p>
            <p className="text-slate-400 text-xs">{data.maintenance_schedule[0].due}</p>
          </div>
        )}
      </div>

      {/* Maintenance schedule */}
      {data.maintenance_schedule?.length > 0 && (
        <div className="mt-4 border-t border-slate-700 pt-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Wrench className="w-3.5 h-3.5" /> Suggested Preventive Maintenance Schedule
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {data.maintenance_schedule.map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 bg-slate-700/30 rounded-lg">
                <div className={`w-2 h-2 rounded-full flex-shrink-0
                  ${item.priority === "High" ? "bg-red-400" : item.priority === "Medium" ? "bg-amber-400" : "bg-emerald-400"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-slate-200 text-xs font-medium truncate">{item.task}</p>
                  <p className="text-slate-500 text-[11px]">{item.due}</p>
                </div>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0
                  ${item.priority === "High" ? "text-red-400 bg-red-900/30" : item.priority === "Medium" ? "text-amber-400 bg-amber-900/30" : "text-emerald-400 bg-emerald-900/30"}`}>
                  {item.priority}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ForecastCard({ icon: Icon, color, label, value, suffix = "", trend, trendVal, sub }) {
  const colors = {
    blue:   "text-blue-400 bg-blue-900/20 border-blue-800/40",
    green:  "text-emerald-400 bg-emerald-900/20 border-emerald-800/40",
    red:    "text-red-400 bg-red-900/20 border-red-800/40",
    purple: "text-purple-400 bg-purple-900/20 border-purple-800/40",
  };
  const TrendIcon = trend === "up" ? ArrowUp : trend === "down" ? ArrowDown : Minus;
  const trendColor = trend === "up" ? "text-emerald-400" : trend === "down" ? "text-red-400" : "text-slate-400";

  return (
    <div className={`p-4 rounded-xl border ${colors[color]}`}>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className="w-4 h-4" />
        <p className="text-xs font-bold uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-2xl font-black text-white">{value}{suffix}</p>
      {trend && (
        <div className={`flex items-center gap-1 mt-1 ${trendColor}`}>
          <TrendIcon className="w-3 h-3" />
          <span className="text-xs font-semibold">{trendVal}</span>
          <span className="text-slate-500 text-xs">{sub}</span>
        </div>
      )}
      {!trend && sub && <p className="text-slate-500 text-xs mt-1">{sub}</p>}
    </div>
  );
}
