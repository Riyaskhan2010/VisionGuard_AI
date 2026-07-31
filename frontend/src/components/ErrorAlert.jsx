import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function ErrorAlert({ message, onRetry }) {
  return (
    <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-red-300 text-sm font-medium">Error</p>
        <p className="text-red-400 text-sm mt-0.5">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300
                     px-2.5 py-1.5 rounded-lg hover:bg-red-900/40 transition-colors flex-shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry
        </button>
      )}
    </div>
  );
}
