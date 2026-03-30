import React, { useEffect, useRef, useState } from "react";

export default function LiveTextOverlay({
  open,
  onClose,
  onSend,
  placeholder = "Type a message",
  busy = false,
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setValue("");
    }
  }, [open]);

  if (!open) return null;

  async function handleSend() {
    const text = value.trim();
    if (!text || busy) return;
    await onSend?.(text);
    setValue("");
    onClose?.();
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="el-live-text-overlay-backdrop" onClick={onClose}>
      <div
        className="el-live-text-overlay"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="el-live-text-overlay-header">
          <span>Chat</span>
          <button type="button" onClick={onClose} aria-label="Close text input">
            ✕
          </button>
        </div>

        <div className="el-live-text-overlay-composer">
          <textarea
            ref={inputRef}
            rows={2}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
          />
          <button
            type="button"
            className="el-live-text-send"
            onClick={handleSend}
            disabled={busy || !value.trim()}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
