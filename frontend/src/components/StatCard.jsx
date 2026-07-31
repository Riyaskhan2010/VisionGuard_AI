import React from "react";

export default function StatCard({ title, value, icon: Icon, color = "blue", subtitle = "" }) {
  const colorMap = {
    blue: "text-blue-400 bg-blue-900/30 border-blue-800",
    green: "text-emerald-400 bg-emerald-900/30 border-emerald-800",
    red: "text-red-400 bg-red-900/30 border-red-800",
    yellow: "text-amber-400 bg-amber-900/30 border-amber-800",
    purple: "text-purple-400 bg-purple-900/30 border-purple-800",
    orange: "text-orange-400 bg-orange-900/30 border-orange-800",
  };

  const iconStyle = colorMap[color] || colorMap.blue;

  return (
    <div className="stat-card animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">{title}</p>
          <p className="text-3xl font-bold text-white mt-1">
            {value ?? <span className="text-slate-600">—</span>}
          </p>
          {subtitle && <p className="text-slate-500 text-xs mt-1">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-lg border ${iconStyle}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  );
}
