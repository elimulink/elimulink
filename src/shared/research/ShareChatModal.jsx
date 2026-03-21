import React, { useEffect, useState } from "react";

export default function ShareChatModal({
  open,
  onClose,
  shareUrl = "",
  onCreateLink,
  onDeleteLink,
  isCreating = false,
  isDeleting = false,
  error = "",
  allowDelete = false,
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  if (!open) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error("Failed to copy share link", error);
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <button
        className="absolute inset-0 bg-slate-950/55"
        onClick={onClose}
        aria-label="Close share chat modal overlay"
      />

      <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[28px] border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl dark:border-white/10 dark:bg-slate-950 dark:text-white">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Share chat</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-white/60">
              Create a shareable copy of this conversation.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="space-y-3">
          <button
            onClick={onCreateLink}
            disabled={isCreating}
            className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-3 text-sm font-semibold text-white hover:opacity-95"
          >
            {isCreating ? "Creating link..." : "Create share link"}
          </button>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
            <p className="mb-2 text-xs uppercase tracking-wide text-slate-400 dark:text-white/40">
              Share link
            </p>
            <p className="break-all text-sm text-slate-600 dark:text-white/75">
              {shareUrl || "No link created yet."}
            </p>
          </div>

          <button
            onClick={handleCopy}
            disabled={!shareUrl}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:text-white/80 dark:hover:bg-white/10"
          >
            {copied ? "Copied" : "Copy link"}
          </button>

          {allowDelete ? (
            <button
              onClick={onDeleteLink}
              disabled={!shareUrl || isDeleting}
              className="w-full rounded-2xl border border-rose-200 px-4 py-3 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-rose-500/30 dark:text-rose-200 dark:hover:bg-rose-500/10"
            >
              {isDeleting ? "Revoking..." : "Revoke link"}
            </button>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
              {error}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
