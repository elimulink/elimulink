import React from "react";

export default function SourcesDrawer({
  open,
  onClose,
  title = "Sources",
  sources = [],
  loading = false,
  error = "",
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        className="absolute inset-0 bg-slate-950/55"
        onClick={onClose}
        aria-label="Close sources drawer overlay"
      />

      <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-2xl rounded-t-[28px] border border-slate-200 bg-white text-slate-900 shadow-2xl dark:border-white/10 dark:bg-slate-950 dark:text-white sm:bottom-4 sm:right-4 sm:left-auto sm:w-[460px] sm:rounded-[28px]">
        <div className="mx-auto mt-3 h-1.5 w-14 rounded-full bg-slate-200 dark:bg-white/20 sm:hidden" />
        <div className="flex items-center justify-between px-5 pb-3 pt-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-full px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="max-h-[70vh] space-y-3 overflow-y-auto px-5 pb-6">
          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-white/60">
              Loading sources...
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
              {error}
            </div>
          ) : sources.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-white/60">
              No sources available.
            </div>
          ) : (
            sources.map((source, index) => (
              <div
                key={source.id ?? index}
                className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4 dark:border-white/10 dark:bg-white/5"
              >
                <div className="mb-1 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {source.title}
                    </p>
                    <p className="truncate text-xs text-slate-500 dark:text-white/50">{source.domain}</p>
                  </div>
                  {source.url ? (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 rounded-full border border-slate-200 px-3 py-1 text-xs text-sky-600 hover:bg-slate-100 dark:border-white/10 dark:text-sky-300 dark:hover:bg-white/10"
                    >
                      Open
                    </a>
                  ) : null}
                </div>
                {source.snippet ? (
                  <p className="text-sm leading-6 text-slate-600 dark:text-white/70">
                    {source.snippet}
                  </p>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
