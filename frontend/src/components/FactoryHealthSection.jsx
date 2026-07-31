import React, { useState, useEffect } from "react";
import {
  Activity, Cpu, Users, TrendingUp, Target,
  CheckCircle, AlertTriangle, Clock, Zap,
} from "lucide-react";
import { enterpriseAPI } from "../services/api";
import CircularGauge from "./CircularGauge";
import ProgressBar from "./ProgressBar";
import AnimatedCounter from "./AnimatedCounter";
import { SkeletonStats } from "./SkeletonLoader";

const GAUGE_COLOR = (val) =>
  val >= 80 ? "#10b981" : val >= 60 ? "#f59e0b" : "#ef4444";

export default function FactoryHealthSection() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    enterpriseAPI.factoryHealth()
      .then((r) => setHealth(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <SkeletonStats count={4} />;
  if (!health) return null;

  const kpis = [
    { label: "Inspection Completion", value: health.inspection_completion_rate, suffix: "%", icon: CheckCircle, color: "green" },
    { label: "AI Accuracy",           value: health.ai_accuracy,               suffix: "%", icon: Cpu,         color: "blue"  },
    { label: "Rejection Rate",        value: health.rejection_rate,             suffix: "%", icon: AlertTriangle,color:"red"   },
    { label: "Worker Productivity",   value: health.worker_productivity,        suffix: "/day",icon: Users,     color: "purple"},
  ];

  return (
    <div className="card mb-6">
      <div className="flex items-center gap-2 mb-5">
        <Activity className="w-5 h-5 text-blue-400" />
        <h2 className="font-bold text-white">Factory Health Dashboard</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6 items-start">
        {/* Main gauge */}
        <div className="flex flex-col items-center gap-3">
          <CircularGauge
            value={health.overall_health_score}
            size={140} strokeWidth={12}
            color={GAUGE_COLOR(health.overall_health_score)}
            label="Overall Health"
            sublabel="Factory Score"
          />
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-slate-700/40 rounded-xl p-2.5">
              <p className="text-blue-400 font-bold text-lg">
                <AnimatedCounter value={health.today_inspections} />
              </p>
              <p className="text-slate-500 text-[10px]">Today</p>
            </div>
            <div className="bg-slate-700/40 rounded-xl p-2.5">
              <p className="text-amber-400 font-bold text-lg">
                <AnimatedCounter value={health.pending_reviews} />
              </p>
              <p className="text-slate-500 text-[10px]">Pending</p>
            </div>
          </div>
        </div>

        {/* KPI progress bars */}
        <div className="space-y-4">
          {kpis.map(({ label, value, suffix, icon: Icon, color }) => (
            <div key={label}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Icon className={`w-3.5 h-3.5 text-${color}-400`} />
                  <span className="text-slate-300 text-sm">{label}</span>
                </div>
                <span className={`text-sm font-bold text-${color}-400`}>
                  <AnimatedCounter value={value} suffix={suffix} />
                </span>
              </div>
              <ProgressBar
                value={suffix === "/day" ? Math.min(value * 10, 100) : value}
                color={color}
                showValue={false}
                size="md"
              />
            </div>
          ))}

          {/* Mini KPI row */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-700">
            {[
              { label: "Total Inspections", value: health.total_inspections, color: "text-blue-400" },
              { label: "Active Workers",    value: health.active_workers,    color: "text-purple-400" },
              { label: "Today Approved",    value: health.today_approved,    color: "text-emerald-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center">
                <p className={`text-xl font-bold ${color}`}>
                  <AnimatedCounter value={value} />
                </p>
                <p className="text-slate-500 text-[10px]">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
