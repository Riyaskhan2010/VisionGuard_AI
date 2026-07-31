import React from "react";

const SCORE_CONFIG = [
  { min: 90, label: "Excellent", color: "#10b981", ring: "ring-emerald-500", text: "text-emerald-400", bg: "bg-emerald-900/20" },
  { min: 75, label: "Good",      color: "#3b82f6", ring: "ring-blue-500",    text: "text-blue-400",    bg: "bg-blue-900/20" },
  { min: 50, label: "Needs Attention", color: "#f59e0b", ring: "ring-amber-500", text: "text-amber-400", bg: "bg-amber-900/20" },
  { min: 0,  label: "Poor",      color: "#ef4444", ring: "ring-red-500",     text: "text-red-400",     bg: "bg-red-900/20" },
];

function getConfig(score) {
  return SCORE_CONFIG.find((c) => score >= c.min) || SCORE_CONFIG[3];
}

export default function QualityScoreMeter({ score, label, size = "md" }) {
  if (score == null) return null;
  const cfg = getConfig(score);
  const radius = size === "lg" ? 52 : 36;
  const stroke = size === "lg" ? 8 : 6;
  const svgSize = (radius + stroke) * 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (score / 100) * circumference;

  const fontSize = size === "lg" ? "text-3xl" : "text-xl";
  const subSize = size === "lg" ? "text-sm" : "text-xs";

  return (
    <div className={`flex flex-col items-center gap-2 p-4 rounded-xl ${cfg.bg} ring-1 ${cfg.ring}/30`}>
      <div className="relative" style={{ width: svgSize, height: svgSize }}>
        <svg width={svgSize} height={svgSize} className="-rotate-90">
          {/* Track */}
          <circle
            cx={svgSize / 2} cy={svgSize / 2} r={radius}
            fill="none" stroke="#1e293b" strokeWidth={stroke}
          />
          {/* Progress */}
          <circle
            cx={svgSize / 2} cy={svgSize / 2} r={radius}
            fill="none" stroke={cfg.color} strokeWidth={stroke}
            strokeDasharray={`${dash} ${circumference}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 0.8s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`${fontSize} font-bold text-white leading-none`}>{Math.round(score)}</span>
          <span className={`${subSize} text-slate-400`}>/100</span>
        </div>
      </div>
      <div className="text-center">
        <p className={`font-semibold ${cfg.text} text-sm`}>{label || cfg.label}</p>
        <p className="text-xs text-slate-500">Quality Score</p>
      </div>
    </div>
  );
}

export function QualityScoreInline({ score, label }) {
  if (score == null) return <span className="text-slate-500 text-sm">N/A</span>;
  const cfg = getConfig(score);
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${cfg.text}`}>
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cfg.color }} />
      {Math.round(score)}/100
      <span className="text-xs font-normal text-slate-400">({label || cfg.label})</span>
    </span>
  );
}
