import React from "react";
import { Image as ImageIcon, Paperclip, Pencil, X } from "lucide-react";
import { formatMediaSize } from "./useCapturedMedia.js";
import "./chat-media.css";

export default function AttachmentChipsTray({
  items = [],
  onPreview,
  onRemove,
}) {
  if (!items.length) return null;

  return (
    <div className="chat-media-tray">
      {items.map((item) => (
        <div key={item.id} className={`chat-media-chip ${item.isImage ? "chat-media-chip-image" : ""}`.trim()}>
          <button
            type="button"
            className="chat-media-chip-main"
            onClick={() => onPreview?.(item)}
            aria-label={item.isImage ? `Annotate ${item.name}` : `Preview ${item.name}`}
          >
            <span className="chat-media-chip-thumb-wrap">
              {item.isImage ? (
                <img src={item.url} alt={item.name} className="chat-media-chip-thumb" />
              ) : (
                <span className="chat-media-chip-icon">
                  <Paperclip size={14} />
                </span>
              )}
              {item.isImage ? (
                <span className="chat-media-chip-badge">
                  <Pencil size={11} />
                  <span>Edit</span>
                </span>
              ) : null}
            </span>
            <span className="chat-media-chip-copy">
              <span className="chat-media-chip-name">{item.isImage ? "Image" : item.name}</span>
              <span className="chat-media-chip-meta">
                {item.isImage ? <ImageIcon size={11} /> : null}
                {formatMediaSize(item.size)}
              </span>
            </span>
          </button>
          <button
            type="button"
            className="chat-media-chip-remove"
            onClick={() => onRemove?.(item.id)}
            aria-label={`Remove ${item.name}`}
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}
