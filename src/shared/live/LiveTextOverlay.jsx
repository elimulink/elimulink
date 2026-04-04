import React, { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, Monitor } from "lucide-react";

export default function LiveTextOverlay({
  open,
  onClose,
  onSend,
  placeholder = "Type a message",
  busy = false,
  title = "Live",
  subtitle = "Talk naturally with AI",
  mode = "idle",
  onTakePhoto,
  onUploadPhoto,
  onTakeScreenshot,
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
      <div className="el-live-text-overlay" onClick={(e) => e.stopPropagation()}>
        <div className="el-live-text-overlay-header">
          <div className="min-w-0">
            <div className="el-live-text-overlay-title">{title}</div>
            <div className="el-live-text-overlay-subtitle">
              {mode === "listening" ? "Listening" : mode === "thinking" ? "Thinking" : subtitle}
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close text input" className="el-live-text-overlay-close">
            ×
          </button>
        </div>

        <div className="el-live-text-overlay-tools">
          {typeof onTakePhoto === "function" ? (
            <ToolChip icon={<Camera size={14} />} label="Photo" onClick={onTakePhoto} />
          ) : null}
          {typeof onUploadPhoto === "function" ? (
            <ToolChip icon={<ImagePlus size={14} />} label="Upload" onClick={onUploadPhoto} />
          ) : null}
          {typeof onTakeScreenshot === "function" ? (
            <ToolChip icon={<Monitor size={14} />} label="Shot" onClick={onTakeScreenshot} />
          ) : null}
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

function ToolChip({ icon, label, onClick }) {
  return (
    <button type="button" className="el-live-text-tool" onClick={onClick}>
      <span className="el-live-text-tool-icon">{icon}</span>
      <span>{label}</span>
    </button>
  );
}
