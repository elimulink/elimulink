import React from "react";

export default function RecordingPreviewCard({
  videoUrl,
  onDownload,
  onClear,
}) {
  if (!videoUrl) return null;

  return (
    <div className="rounded-[32px] border border-black/8 bg-white/88 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.10)] backdrop-blur-xl dark:border-white/10 dark:bg-white/6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-[#111827] dark:text-white">
            Screen recording
          </div>
          <div className="text-xs text-black/50 dark:text-white/55">
            Preview and export your recording
          </div>
        </div>

        <button
          type="button"
          onClick={onClear}
          className="rounded-full border border-black/5 bg-black/[0.04] px-3 py-1.5 text-xs font-medium text-[#111827] dark:border-white/10 dark:bg-white/8 dark:text-white"
        >
          Clear
        </button>
      </div>

      <video
        src={videoUrl}
        controls
        className="mb-3 w-full rounded-2xl border border-black/5 dark:border-white/10"
      />

      <button
        type="button"
        onClick={onDownload}
        className="rounded-full border border-blue-500 bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(59,130,246,0.35)]"
      >
        Download recording
      </button>
    </div>
  );
}
