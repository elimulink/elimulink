import React from "react";

export default function CitationChip({ label, onClick, active = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition sm:text-sm",
        active
          ? "border-sky-400/40 bg-sky-500/10 text-sky-600 dark:text-sky-200"
          : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white",
      ].join(" ")}
    >
      <span className="h-2 w-2 rounded-full bg-sky-400" />
      <span className="max-w-[140px] truncate">{label}</span>
    </button>
  );
}
