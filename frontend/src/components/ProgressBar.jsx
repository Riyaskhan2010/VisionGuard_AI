import React from "react";

export default function ProgressBar({ value = 0, max = 100, label = "", color = "blue",
  showValue = true, size = "md", animated = true }) {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100);
  const colors = {
    blue:   "bg-blue-500",
    green:  "bg-emerald-500",
    red:    "bg-red-500",
    yellow: "bg-amber-500",
    purple: "bg-purple-500",
    orange: "bg-orange-500",
    gradient: "bg-gradient-to-r from-blue-600 to-cyan-500",
  };
  const heights = { sm: "h-1.5", md: "h-2", lg: "h-3" };

  return (
    <div className="w-full">
      {(label || showValue) && (
        <div className="flex justify-between items-center mb-1">
          {label && <span className="text-xs text-slate-400">{label}</span>}
          {showValue && (
            <span className="text-xs font-semibold text-slate-300">{Math.round(pct)}%</span>
          )}
        </div>
      )}
      <div className={`w-full bg-slate-700 rounded-full overflow-hidden ${heights[size]}`}>
        <div
          className={`${heights[size]} ${colors[color] || colors.blue} rounded-full
                      ${animated ? "transition-all duration-700 ease-out" : ""}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
