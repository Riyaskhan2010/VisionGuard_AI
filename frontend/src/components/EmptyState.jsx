import React from "react";
import { Inbox } from "lucide-react";

export default function EmptyState({ title = "No data", description = "", icon: Icon = Inbox }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 bg-slate-700 rounded-full flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-slate-400" />
      </div>
      <h3 className="text-slate-300 font-semibold mb-1">{title}</h3>
      {description && <p className="text-slate-500 text-sm max-w-xs">{description}</p>}
    </div>
  );
}
