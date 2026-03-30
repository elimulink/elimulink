import React, { useMemo, useState } from "react";
import { Copy, ExternalLink, Link2, Trash2, X } from "lucide-react";
import "./desktop-settings-workspace.css";

function formatSharedDate(value) {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function DesktopSharedLinksManager({
  open,
  onClose,
  items = [],
  onDeleteLink,
  mode = "preview",
  title = "Shared links",
  description = "Manage conversation links available from this workspace.",
}) {
  const [copyingId, setCopyingId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const left = new Date(a?.dateShared || 0).getTime();
      const right = new Date(b?.dateShared || 0).getTime();
      return right - left;
    });
  }, [items]);

  if (!open) return null;

  const hasRows = sortedItems.length > 0;
  const hasRemovableRows = sortedItems.some((item) => item?.canDelete);
  const resolvedMode =
    mode === "live" && hasRows && !hasRemovableRows
      ? "partial"
      : mode;
  const statusLabel =
    resolvedMode === "live" ? "Live" : resolvedMode === "partial" ? "Partial" : "Preview";
  const statusCopy =
    resolvedMode === "live"
      ? "Rows below come from real share-link data on this desktop workspace."
      : resolvedMode === "partial"
        ? "Some share-link behavior is available here, but not every action is connected on this surface."
        : "This desktop surface does not currently expose a real shared-links source.";

  async function handleCopy(item) {
    if (!item?.url) return;
    setError("");
    setCopyingId(item.id);
    try {
      await navigator.clipboard.writeText(item.url);
      window.setTimeout(() => setCopyingId(""), 900);
    } catch (copyError) {
      setError(String(copyError?.message || "Failed to copy shared link."));
      setCopyingId("");
    }
  }

  async function handleDelete(item) {
    if (!item?.id || !onDeleteLink) return;
    const confirmed = window.confirm(`Remove the shared link for "${item.name}"?`);
    if (!confirmed) return;
    setError("");
    setDeletingId(item.id);
    try {
      await onDeleteLink(item);
    } catch (deleteError) {
      setError(String(deleteError?.message || "Failed to remove shared link."));
    } finally {
      setDeletingId("");
    }
  }

  return (
    <div className="dsw-manager-overlay" role="dialog" aria-modal="true" aria-label="Shared links manager">
      <button
        type="button"
        className="dsw-manager-backdrop"
        aria-label="Close shared links manager"
        onClick={onClose}
      />

      <div className="dsw-manager-panel">
        <div className="dsw-manager-header">
          <div>
            <div className="dsw-manager-title-row">
              <h3 className="dsw-manager-title">{title}</h3>
              <span className={`dsw-status-chip ${resolvedMode === "live" ? "is-live" : ""}`}>
                {statusLabel}
              </span>
            </div>
            <p className="dsw-manager-copy">{description}</p>
          </div>

          <button type="button" className="dsw-manager-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className={`dsw-status-note ${resolvedMode !== "live" ? "is-preview" : ""}`}>
          <span className="dsw-status-chip">{statusLabel}</span>
          {statusCopy}
        </div>

        {sortedItems.length ? (
          <div className="dsw-manager-table-wrap">
            <div className="dsw-manager-table-head">
              <div>Name</div>
              <div>Type</div>
              <div>Date shared</div>
              <div>Actions</div>
            </div>

            <div className="dsw-manager-table-body">
              {sortedItems.map((item) => (
                <div key={item.id} className="dsw-manager-row">
                  <div className="dsw-manager-name-cell">
                    <div className="dsw-manager-name">{item.name}</div>
                    {item.url ? <div className="dsw-manager-link-preview">{item.url}</div> : null}
                  </div>
                  <div className="dsw-manager-meta">{item.type || "Conversation"}</div>
                  <div className="dsw-manager-meta">{formatSharedDate(item.dateShared)}</div>
                  <div className="dsw-manager-actions">
                    <a
                      href={item.url || "#"}
                      target="_blank"
                      rel="noreferrer"
                      className={`dsw-button ${!item.url ? "is-disabled" : ""}`}
                      aria-disabled={!item.url}
                      onClick={(event) => {
                        if (!item.url) event.preventDefault();
                      }}
                    >
                      <ExternalLink size={14} />
                      View
                    </a>
                    <button
                      type="button"
                      className="dsw-button"
                      disabled={!item.url || copyingId === item.id}
                      onClick={() => handleCopy(item)}
                    >
                      <Copy size={14} />
                      {copyingId === item.id ? "Copied" : "Copy"}
                    </button>
                    <button
                      type="button"
                      className="dsw-button dsw-button-danger-outline"
                      disabled={!item.canDelete || deletingId === item.id}
                      onClick={() => handleDelete(item)}
                      title={item.canDelete ? "Remove shared link" : "Remove is not available on this surface"}
                    >
                      <Trash2 size={14} />
                      {item.canDelete
                        ? deletingId === item.id
                          ? "Removing..."
                          : "Remove"
                        : "Unavailable"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="dsw-manager-empty">
            <div className="dsw-manager-empty-icon">
              <Link2 size={18} />
            </div>
            <div className="dsw-manager-empty-title">No shared links yet</div>
            <div className="dsw-manager-empty-copy">
              {resolvedMode === "live"
                ? "Create a share link from a conversation, then manage it here."
                : resolvedMode === "partial"
                  ? "This surface can display shared links when they become available, but some actions may stay unavailable."
                  : "This desktop surface does not have reusable shared-link records yet."}
            </div>
          </div>
        )}

        {error ? <div className="dsw-inline-note">{error}</div> : null}
      </div>
    </div>
  );
}
