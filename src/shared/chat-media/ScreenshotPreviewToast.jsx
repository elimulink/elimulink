import React from "react";
import { Eye, X } from "lucide-react";
import MediaActionButton from "./MediaActionButton.jsx";
import "./chat-media.css";

export default function ScreenshotPreviewToast({
  item,
  onPreview,
  onDismiss,
}) {
  if (!item) return null;

  const sourceLabel =
    item.source === "clipboard"
      ? "Pasted image"
      : item.source === "scan"
        ? "Scanned image"
        : item.source === "camera"
          ? "Camera image"
          : "Image ready";

  return (
    <div className="chat-media-toast" role="status" aria-live="polite">
      <div className="chat-media-toast-thumb-wrap">
        <img src={item.url} alt={item.name} className="chat-media-toast-thumb" />
      </div>
      <div className="chat-media-toast-copy">
        <div className="chat-media-toast-title">{item.isScreenshot ? "Screenshot preview ready" : sourceLabel}</div>
        <div className="chat-media-toast-subtitle">{item.name}</div>
      </div>
      <div className="chat-media-toast-actions">
        <MediaActionButton onClick={() => onPreview?.(item)} aria-label="Preview image">
          <Eye size={14} />
        </MediaActionButton>
        <MediaActionButton onClick={onDismiss} aria-label="Dismiss preview">
          <X size={14} />
        </MediaActionButton>
      </div>
    </div>
  );
}
