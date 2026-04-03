import React, { useState } from "react";
import { Eye, MessageSquareText, Pencil, Share2, X } from "lucide-react";
import MediaActionButton from "./MediaActionButton.jsx";
import { shareMediaItem } from "./shareMediaItem.js";
import "./chat-media.css";

export default function ScreenshotPreviewToast({
  item,
  onPreview,
  onAnnotate,
  onAskAI,
  onDismiss,
}) {
  const [shareStatus, setShareStatus] = useState("");

  if (!item) return null;

  const sourceLabel =
    item.source === "clipboard"
      ? "Pasted image"
      : item.source === "camera"
        ? "Camera image"
        : "Image ready";

  const handleShare = async () => {
    try {
      setShareStatus("");
      const status = await shareMediaItem(item);
      setShareStatus(status || "Shared");
      window.setTimeout(() => setShareStatus(""), 1600);
    } catch (error) {
      setShareStatus(error?.message || "Sharing is not supported on this device.");
    }
  };

  return (
    <div className="chat-media-toast" role="status" aria-live="polite">
      <div className="chat-media-toast-thumb-wrap">
        <img src={item.url} alt={item.name} className="chat-media-toast-thumb" />
      </div>
      <div className="chat-media-toast-copy">
        <div className="chat-media-toast-title">
          {item.isScreenshot ? "Detected this screenshot" : sourceLabel}
        </div>
        <div className="chat-media-toast-subtitle">
          {item.isScreenshot ? "Preview, share, annotate, or ask AI about it." : item.name}
        </div>
        {item.isScreenshot ? (
          <div className="mt-1 text-[11px] text-slate-400">{item.name}</div>
        ) : null}
        {shareStatus ? (
          <div className="mt-1 text-[11px] text-slate-500">{shareStatus}</div>
        ) : null}
      </div>
      <div className="chat-media-toast-actions">
        <MediaActionButton onClick={() => onPreview?.(item)} aria-label="Preview image">
          <Eye size={14} />
        </MediaActionButton>
        <MediaActionButton onClick={handleShare} aria-label="Share screenshot">
          <Share2 size={14} />
        </MediaActionButton>
        {onAnnotate ? (
          <MediaActionButton onClick={() => onAnnotate?.(item)} aria-label="Annotate screenshot">
            <Pencil size={14} />
          </MediaActionButton>
        ) : null}
        {onAskAI ? (
          <MediaActionButton onClick={() => onAskAI?.(item)} aria-label="Ask AI about screenshot">
            <MessageSquareText size={14} />
          </MediaActionButton>
        ) : null}
        <MediaActionButton onClick={onDismiss} aria-label="Dismiss preview">
          <X size={14} />
        </MediaActionButton>
      </div>
    </div>
  );
}
