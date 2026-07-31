import React from "react";

export default function CircularGauge({ value = 0, max = 100, size = 100, strokeWidth = 10,
  color = "#3b82f6", trackColor = "#1e293b", label = "", sublabel = "", showValue = true }) {
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const pct = Math.min(Math.max(value / max, 0), 1);
  const dash = pct * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
            strokeDasharray={`${dash} ${circumference}`} strokeLinecap="round"
            style={{ transition: "stroke-dasharray 1s ease" }} />
        </svg>
        {showValue && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-white font-bold" style={{ fontSize: size * 0.2 }}>{Math.round(value)}</span>
            {max !== 100 && <span className="text-slate-400" style={{ fontSize: size * 0.12 }}>/{max}</span>}
          </div>
        )}
      </div>
      {label && <p className="text-white text-xs font-semibold text-center">{label}</p>}
      {sublabel && <p className="text-slate-500 text-[11px] text-center">{sublabel}</p>}
    </div>
  );
}
