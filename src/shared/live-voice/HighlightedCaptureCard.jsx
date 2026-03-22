import React from "react";

export default function HighlightedCaptureCard({
  title = "Visual guidance",
  imageUrl,
  caption,
  onClose,
}) {
  if (!imageUrl) return null;

  return (
    <div className="overflow-hidden rounded-3xl bg-white/6 p-3 ring-1 ring-white/10">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white">{title}</div>
          {caption ? <div className="mt-1 text-sm text-white/60">{caption}</div> : null}
        </div>

        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/80 hover:bg-white/15"
          >
            Close
          </button>
        ) : null}
      </div>

      <img
        src={imageUrl}
        alt={title}
        className="w-full rounded-2xl object-contain ring-1 ring-white/10"
      />
    </div>
  );
}
