import React, { useMemo, useState } from "react";
import { Archive, ExternalLink, RotateCcw, Trash2, X } from "lucide-react";
import "./desktop-settings-workspace.css";

function formatArchivedDate(value) {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function DesktopArchivedChatsManager({
  open,
  onClose,
  items = [],
  mode = "preview",
  onOpenChat,
  onRestoreChat,
  onDeleteChat,
}) {
  const [restoringId, setRestoringId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");

  const sortedItems = useMemo(
    () =>
      [...items].sort((a, b) => {
        const left = new Date(a?.dateArchived || 0).getTime();
        const right = new Date(b?.dateArchived || 0).getTime();
        return right - left;
      }),
    [items],
  );

  if (!open) return null;

  const hasRows = sortedItems.length > 0;
  const resolvedMode = hasRows ? mode : mode === "live" ? "partial" : mode;
  const statusLabel =
    resolvedMode === "live" ? "Live" : resolvedMode === "partial" ? "Partial" : "Preview";
  const statusCopy =
    resolvedMode === "live"
      ? "Archived conversation rows below come from the real archived-conversation source for this desktop workspace."
      : resolvedMode === "partial"
        ? "This manager is connected to desktop conversation history, but archived records or archive actions are only partially available on this surface."
        : "A real archived-conversation source is not available on this desktop surface yet.";

  async function handleRestore(item) {
    if (!item?.id || !item?.canRestore || !onRestoreChat) return;
    setError("");
    setRestoringId(item.id);
    try {
      await onRestoreChat(item);
    } catch (restoreError) {
      setError(String(restoreError?.message || "Failed to restore archived chat."));
    } finally {
      setRestoringId("");
    }
  }

  async function handleDelete(item) {
    if (!item?.id || !item?.canDelete || !onDeleteChat) return;
    const confirmed = window.confirm(`Permanently delete "${item.title || "this archived chat"}"?`);
    if (!confirmed) return;
    setError("");
    setDeletingId(item.id);
    try {
      await onDeleteChat(item);
    } catch (deleteError) {
      setError(String(deleteError?.message || "Failed to delete archived chat."));
    } finally {
      setDeletingId("");
    }
  }

  return (
    <div className="dsw-manager-overlay" role="dialog" aria-modal="true" aria-label="Archived chats manager">
      <button
        type="button"
        className="dsw-manager-backdrop"
        aria-label="Close archived chats manager"
        onClick={onClose}
      />

      <div className="dsw-manager-panel">
        <div className="dsw-manager-header">
          <div>
            <div className="dsw-manager-title-row">
              <h3 className="dsw-manager-title">Archived chats</h3>
              <span className={`dsw-status-chip ${resolvedMode === "live" ? "is-live" : ""}`}>
                {statusLabel}
              </span>
            </div>
            <p className="dsw-manager-copy">
              Review archived conversation records when they are available, and reopen or restore them only on surfaces where archive behavior is safely connected.
            </p>
          </div>

          <button type="button" className="dsw-manager-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className={`dsw-status-note ${resolvedMode !== "live" ? "is-preview" : ""}`}>
          <span className="dsw-status-chip">{statusLabel}</span>
          {statusCopy}
        </div>

        {hasRows ? (
          <div className="dsw-manager-table-wrap">
            <div className="dsw-manager-table-head">
              <div>Title</div>
              <div>Preview</div>
              <div>Date archived</div>
              <div>Actions</div>
            </div>

            <div className="dsw-manager-table-body">
              {sortedItems.map((item) => (
                <div key={item.id} className="dsw-manager-row">
                  <div className="dsw-manager-name-cell">
                    <div className="dsw-manager-name">{item.title || "Archived conversation"}</div>
                  </div>
                  <div className="dsw-manager-meta">{item.preview || "No preview available"}</div>
                  <div className="dsw-manager-meta">{formatArchivedDate(item.dateArchived)}</div>
                  <div className="dsw-manager-actions">
                    <button
                      type="button"
                      className={`dsw-button ${!item.canOpen ? "is-disabled" : ""}`}
                      disabled={!item.canOpen}
                      onClick={() => item.canOpen && onOpenChat?.(item)}
                      title={item.canOpen ? "Open conversation" : "Open is not available on this surface"}
                    >
                      <ExternalLink size={14} />
                      {item.canOpen ? "Open" : "Unavailable"}
                    </button>
                    <button
                      type="button"
                      className="dsw-button"
                      disabled={!item.canRestore || restoringId === item.id}
                      onClick={() => handleRestore(item)}
                      title={item.canRestore ? "Restore archived conversation" : "Restore is not available on this surface"}
                    >
                      <RotateCcw size={14} />
                      {item.canRestore
                        ? restoringId === item.id
                          ? "Restoring..."
                          : "Restore"
                        : "Unavailable"}
                    </button>
                    <button
                      type="button"
                      className="dsw-button dsw-button-danger-outline"
                      disabled={!item.canDelete || deletingId === item.id}
                      onClick={() => handleDelete(item)}
                      title={item.canDelete ? "Delete permanently" : "Permanent delete is not available on this surface"}
                    >
                      <Trash2 size={14} />
                      {item.canDelete
                        ? deletingId === item.id
                          ? "Deleting..."
                          : "Delete"
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
              <Archive size={18} />
            </div>
            <div className="dsw-manager-empty-title">No archived chats</div>
            <div className="dsw-manager-empty-copy">
              {resolvedMode === "live"
                ? "Archived conversations will appear here when this workspace exposes archived records."
                : resolvedMode === "partial"
                  ? "This desktop workspace can reuse conversation history, but archived records are not currently available."
                  : "Archived conversations will appear here once a real archive source is connected to this desktop surface."}
            </div>
          </div>
        )}

        {error ? <div className="dsw-inline-note">{error}</div> : null}
      </div>
    </div>
  );
}
