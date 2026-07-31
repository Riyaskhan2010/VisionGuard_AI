import React from "react";
import { CheckCircle, XCircle, AlertCircle, Info, X } from "lucide-react";

const icons = {
  success: <CheckCircle className="w-5 h-5 text-emerald-400" />,
  error: <XCircle className="w-5 h-5 text-red-400" />,
  warning: <AlertCircle className="w-5 h-5 text-amber-400" />,
  info: <Info className="w-5 h-5 text-blue-400" />,
};

const borders = {
  success: "border-emerald-700 bg-emerald-900/30",
  error: "border-red-700 bg-red-900/30",
  warning: "border-amber-700 bg-amber-900/30",
  info: "border-blue-700 bg-blue-900/30",
};

export default function Toast({ toasts, removeToast }) {
  if (!toasts.length) return null;
  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start gap-3 p-4 rounded-xl border ${borders[t.type]} 
                      backdrop-blur-sm shadow-xl animate-fade-in`}
        >
          <div className="flex-shrink-0 mt-0.5">{icons[t.type]}</div>
          <p className="text-sm text-slate-200 flex-1">{t.message}</p>
          <button
            onClick={() => removeToast(t.id)}
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
