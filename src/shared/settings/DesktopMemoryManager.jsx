import React, { useMemo, useState } from "react";
import { History, Lightbulb, Trash2, X } from "lucide-react";
import "./desktop-settings-workspace.css";

function formatDate(value) {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function DesktopMemoryManager({
  open,
  onClose,
  memorySaved = true,
  memoryHistory = true,
  onToggleMemorySaved,
  onToggleMemoryHistory,
  savedMemoryItems = [],
  onRemoveMemoryItem,
  onClearMemoryItems,
  historyItems = [],
}) {
  const [removingId, setRemovingId] = useState("");
  const [error, setError] = useState("");

  const sortedMemories = useMemo(
    () =>
      [...savedMemoryItems].sort((a, b) => {
        const left = new Date(a?.updatedAt || a?.createdAt || 0).getTime();
        const right = new Date(b?.updatedAt || b?.createdAt || 0).getTime();
        return right - left;
      }),
    [savedMemoryItems],
  );

  const sortedHistory = useMemo(
    () =>
      [...historyItems].sort((a, b) => {
        const left = new Date(a?.updatedAt || 0).getTime();
        const right = new Date(b?.updatedAt || 0).getTime();
        return right - left;
      }),
    [historyItems],
  );

  if (!open) return null;

  async function handleRemoveMemory(item) {
    if (!item?.id || !onRemoveMemoryItem) return;
    setError("");
    setRemovingId(item.id);
    try {
      await onRemoveMemoryItem(item);
    } catch (removeError) {
      setError(String(removeError?.message || "Failed to remove memory item."));
    } finally {
      setRemovingId("");
    }
  }

  async function handleClearPreviewMemories() {
    if (!onClearMemoryItems || !sortedMemories.length) return;
    const confirmed = window.confirm("Clear all preview memory items from this desktop workspace?");
    if (!confirmed) return;
    setError("");
    try {
      await onClearMemoryItems();
    } catch (clearError) {
      setError(String(clearError?.message || "Failed to clear preview memory items."));
    }
  }

  return (
    <div className="dsw-manager-overlay" role="dialog" aria-modal="true" aria-label="Memory manager">
      <button
        type="button"
        className="dsw-manager-backdrop"
        aria-label="Close memory manager"
        onClick={onClose}
      />

      <div className="dsw-manager-panel">
        <div className="dsw-manager-header">
          <div>
            <div className="dsw-manager-title-row">
              <h3 className="dsw-manager-title">Memory</h3>
              <span className="dsw-status-chip">Mixed</span>
            </div>
            <p className="dsw-manager-copy">
              Reference controls are available now. Saved memories remain preview-only until a real memory source is connected,
              while chat history below reuses your existing workspace conversations.
            </p>
          </div>

          <button type="button" className="dsw-manager-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="dsw-card">
          <div className="dsw-status-note is-preview">
            <span className="dsw-status-chip">Mixed</span>
            Saved memories are preview-only. Chat history references below are derived from real desktop conversation history.
          </div>
          <div className="dsw-row">
            <div>
              <div className="dsw-row-label">Reference saved memories</div>
              <div className="dsw-row-help">Enable future memory recall once a real memory store is connected.</div>
            </div>
            <label className="dsw-switch">
              <input type="checkbox" checked={memorySaved} onChange={onToggleMemorySaved} />
              <span className="dsw-switch-track" />
            </label>
          </div>

          <div className="dsw-divider" />

          <div className="dsw-row">
            <div>
              <div className="dsw-row-label">Reference chat history</div>
              <div className="dsw-row-help">Use your existing workspace conversation history as context when available.</div>
            </div>
            <label className="dsw-switch">
              <input type="checkbox" checked={memoryHistory} onChange={onToggleMemoryHistory} />
              <span className="dsw-switch-track" />
            </label>
          </div>
        </div>

        <div className="dsw-card">
          <div className="dsw-manager-section-head">
            <div>
              <div className="dsw-row-label">Saved memory items</div>
              <div className="dsw-row-help">Preview structure for future remembered facts and preferences.</div>
            </div>
            <span className="dsw-status-chip">Preview</span>
          </div>

          <div className="dsw-status-note is-preview">
            <span className="dsw-status-chip">Preview</span>
            Remove and clear actions in this section only affect local preview memory items. They do not change any real backend memory store.
          </div>

          {sortedMemories.length ? (
            <>
              <div className="dsw-manager-actions-row dsw-manager-actions-row-start">
                <button
                  type="button"
                  className="dsw-button dsw-button-danger-outline"
                  disabled={!onClearMemoryItems}
                  onClick={handleClearPreviewMemories}
                >
                  <Trash2 size={14} />
                  Clear preview items
                </button>
              </div>
              <div className="dsw-list-grid">
                {sortedMemories.map((item) => (
                  <div key={item.id} className="dsw-list-item">
                    <div className="dsw-list-item-icon is-amber">
                      <Lightbulb size={16} />
                    </div>
                    <div className="dsw-list-item-copy">
                      <div className="dsw-list-item-title">{item.title || "Memory item"}</div>
                      <div className="dsw-list-item-meta">{item.value || "No details provided."}</div>
                    </div>
                    <div className="dsw-list-item-side">
                      <div className="dsw-list-item-date">{formatDate(item.updatedAt || item.createdAt)}</div>
                      <button
                        type="button"
                        className="dsw-button dsw-button-danger-outline"
                        disabled={!onRemoveMemoryItem || removingId === item.id}
                        onClick={() => handleRemoveMemory(item)}
                        title="Remove this preview memory item"
                      >
                        <Trash2 size={14} />
                        {removingId === item.id ? "Removing..." : "Remove preview"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="dsw-manager-empty">
              <div className="dsw-manager-empty-icon">
                <Lightbulb size={18} />
              </div>
              <div className="dsw-manager-empty-title">No saved memories yet</div>
              <div className="dsw-manager-empty-copy">
                A real memory source has not been connected yet, so this manager stays safely in preview mode.
              </div>
            </div>
          )}
        </div>

        <div className="dsw-card">
          <div className="dsw-manager-section-head">
            <div>
              <div className="dsw-row-label">Recent chat history</div>
              <div className="dsw-row-help">Existing conversations currently available to this desktop workspace.</div>
            </div>
            <span className="dsw-status-chip is-live">Live</span>
          </div>

          <div className="dsw-status-note">
            <span className="dsw-status-chip is-live">Live</span>
            This list is built from the current desktop workspace conversation history already present in the app.
          </div>

          {sortedHistory.length ? (
            <div className="dsw-list-grid">
              {sortedHistory.map((item) => (
                <div key={item.id} className="dsw-list-item">
                  <div className="dsw-list-item-icon is-blue">
                    <History size={16} />
                  </div>
                  <div className="dsw-list-item-copy">
                    <div className="dsw-list-item-title">{item.title || "Conversation"}</div>
                    <div className="dsw-list-item-meta">
                      {item.messageCount ? `${item.messageCount} messages` : "Conversation history available"}
                    </div>
                  </div>
                  <div className="dsw-list-item-side">
                    <div className="dsw-list-item-date">{formatDate(item.updatedAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="dsw-manager-empty">
              <div className="dsw-manager-empty-icon">
                <History size={18} />
              </div>
              <div className="dsw-manager-empty-title">No chat history available</div>
              <div className="dsw-manager-empty-copy">
                Start a conversation in this workspace and recent chat history will appear here.
              </div>
            </div>
          )}
        </div>

        {error ? <div className="dsw-inline-note">{error}</div> : null}
      </div>
    </div>
  );
}
