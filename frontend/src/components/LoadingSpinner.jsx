import React from "react";

export default function LoadingSpinner({ size = "md", text = "" }) {
  const sizes = { sm: "w-4 h-4", md: "w-8 h-8", lg: "w-12 h-12" };
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={`${sizes[size]} border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin`}
      />
      {text && <p className="text-slate-400 text-sm">{text}</p>}
    </div>
  );
}

export function PageLoader({ text = "Loading..." }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <LoadingSpinner size="lg" text={text} />
    </div>
  );
}
