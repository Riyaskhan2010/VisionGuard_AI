import React from "react";
import { AlertTriangle } from "lucide-react";
import LoadingSpinner from "./LoadingSpinner";

export default function ConfirmDialog({
  isOpen, onClose, onConfirm, title, message,
  confirmLabel = "Confirm", confirmClass = "btn-primary",
  loading = false, icon: Icon = AlertTriangle,
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-slate-800 border border-slate-700
                      rounded-2xl shadow-2xl animate-fade-in p-6">
        <div className="flex flex-col items-center text-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-amber-900/30 border border-amber-800
                          flex items-center justify-center">
            <Icon className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <p className="text-slate-400 text-sm mt-1">{message}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} disabled={loading} className="btn-secondary flex-1">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading} className={`${confirmClass} flex-1`}>
            {loading ? <LoadingSpinner size="sm" /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
