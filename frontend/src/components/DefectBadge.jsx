import React from "react";

const DEFECT_LABELS = {
  crack: "Crack",
  scratch: "Scratch",
  dent: "Dent",
  missing_component: "Missing Component",
  surface_damage: "Surface Damage",
  burn_mark: "Burn Mark",
  none: "No Defect",
};

const DEFECT_STYLES = {
  crack:             "bg-red-900/50 text-red-400 border-red-800",
  scratch:           "bg-yellow-900/50 text-yellow-400 border-yellow-800",
  dent:              "bg-blue-900/50 text-blue-400 border-blue-800",
  missing_component: "bg-purple-900/50 text-purple-400 border-purple-800",
  surface_damage:    "bg-orange-900/50 text-orange-400 border-orange-800",
  burn_mark:         "bg-rose-900/50 text-rose-400 border-rose-800",
  none:              "bg-emerald-900/50 text-emerald-400 border-emerald-800",
};

export default function DefectBadge({ defect }) {
  const key = defect || "none";
  const style = DEFECT_STYLES[key] || DEFECT_STYLES.none;
  const label = DEFECT_LABELS[key] || key;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style}`}>
      {label}
    </span>
  );
}
