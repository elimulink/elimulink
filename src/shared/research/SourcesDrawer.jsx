import React from "react";

function SourceAvatar({ source, index }) {
  const faviconUrl = String(source?.faviconUrl || source?.favicon_url || "").trim();
  const domain = String(source?.domain || source?.title || "").trim();
  const fallback = domain.slice(0, 1).toUpperCase() || String(index + 1);

  if (faviconUrl) {
    return (
      <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-2xl border border-slate-200/80 bg-white dark:border-white/10 dark:bg-white/10">
        <img src={faviconUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
      </div>
    );
  }

  return (
    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-slate-100 text-sm font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-100">
      {fallback}
    </div>
  );
}

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
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Close sources drawer overlay"
      />

      <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-2xl rounded-t-[28px] border border-slate-200 bg-white/98 text-slate-900 shadow-[0_-20px_60px_rgba(15,23,42,0.22)] dark:border-white/10 dark:bg-slate-950/98 dark:text-white sm:bottom-4 sm:right-4 sm:left-auto sm:w-[460px] sm:rounded-[28px]">
        <div className="mx-auto mt-3 h-1.5 w-14 rounded-full bg-slate-200 dark:bg-white/20 sm:hidden" />
        <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-4">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold tracking-[-0.03em]">{title}</h3>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-white/55">
              {sources.length === 1 ? "1 reference" : `${sources.length} references`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-slate-200/80 bg-slate-50 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="max-h-[70vh] space-y-3 overflow-y-auto px-4 pb-6 pt-1">
          {loading ? (
            <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-white/60">
              Loading sources...
            </div>
          ) : error ? (
            <div className="rounded-[22px] border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
              {error}
            </div>
          ) : sources.length === 0 ? (
            <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-white/60">
              No sources available.
            </div>
          ) : (
            sources.map((source, index) => (
              <div
                key={source.id ?? index}
                className="rounded-[24px] border border-slate-200/90 bg-slate-50/70 p-4 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.06]"
              >
                <div className="flex items-start gap-3">
                  <SourceAvatar source={source} index={index} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        {source.sourceName ? (
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-white/45">
                            {source.sourceName}
                          </p>
                        ) : null}
                        <p className="line-clamp-2 text-sm font-semibold leading-6 text-slate-900 dark:text-white">
                          {source.title || source.domain || `Source ${index + 1}`}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-white/50">
                          [{index + 1}] {source.domain || "Reference"}
                        </p>
                      </div>
                      {source.url ? (
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-sky-200 dark:hover:bg-white/10"
                        >
                          Open
                        </a>
                      ) : null}
                    </div>
                    {source.snippet ? (
                      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-white/70">
                        {source.snippet}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
