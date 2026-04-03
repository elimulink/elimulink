import React from "react";

function SourceLogo({ faviconUrl = "", label = "", active = false }) {
  const fallback = String(label || "S").trim().slice(0, 1).toUpperCase() || "S";

  if (faviconUrl) {
    return (
      <span className="grid h-5 w-5 shrink-0 place-items-center overflow-hidden rounded-full border border-slate-200/80 bg-white dark:border-white/10 dark:bg-white/10">
        <img src={faviconUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
      </span>
    );
  }

  return (
    <span
      className={[
        "grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-semibold",
        active
          ? "bg-sky-500/15 text-sky-700 dark:text-sky-100"
          : "bg-slate-200/70 text-slate-700 dark:bg-white/10 dark:text-slate-200",
      ].join(" ")}
    >
      {fallback}
    </span>
  );
}

export default function CitationChip({
  label,
  onClick,
  active = false,
  faviconUrl = "",
  countLabel = "",
  indexLabel = "",
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs transition sm:text-sm",
        active
          ? "border-sky-400/40 bg-sky-500/10 text-sky-600 dark:text-sky-200"
          : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white",
      ].join(" ")}
    >
      <SourceLogo faviconUrl={faviconUrl} label={label} active={active} />
      {indexLabel ? (
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400 dark:text-white/45">
          {indexLabel}
        </span>
      ) : null}
      <span className="max-w-[108px] truncate">{label}</span>
      {countLabel ? (
        <span className="rounded-full bg-slate-200/60 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-100">
          {countLabel}
        </span>
      ) : null}
    </button>
  );
}
