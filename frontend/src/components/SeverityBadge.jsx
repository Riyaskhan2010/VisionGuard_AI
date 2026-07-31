import React from "react";

export function SeverityBadge({ severity }) {
  const map = {
    Critical: "bg-red-900/50 text-red-400 border border-red-800",
    Medium:   "bg-yellow-900/50 text-yellow-400 border border-yellow-800",
    Low:      "bg-blue-900/50 text-blue-400 border border-blue-800",
    None:     "bg-emerald-900/50 text-emerald-400 border border-emerald-800",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold
                      ${map[severity] || map.None}`}>
      {severity || "None"}
    </span>
  );
}

export function StatusBadge({ status }) {
  const map = {
    Pending:  "bg-amber-900/50 text-amber-400 border border-amber-800",
    Approved: "bg-emerald-900/50 text-emerald-400 border border-emerald-800",
    Rejected: "bg-red-900/50 text-red-400 border border-red-800",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold
                      ${map[status] || map.Pending}`}>
      {status || "Pending"}
    </span>
  );
}

// Re-export DefectBadge from new file so existing imports still work
export { default as DefectBadge } from "./DefectBadge";
