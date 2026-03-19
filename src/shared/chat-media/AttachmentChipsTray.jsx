import React from "react";
import { Image as ImageIcon, Paperclip, X } from "lucide-react";
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
        <div key={item.id} className="chat-media-chip">
          <button
            type="button"
            className="chat-media-chip-main"
            onClick={() => onPreview?.(item)}
          >
            {item.isImage ? (
              <img src={item.url} alt={item.name} className="chat-media-chip-thumb" />
            ) : (
              <span className="chat-media-chip-icon">
                <Paperclip size={14} />
              </span>
            )}
            <span className="chat-media-chip-copy">
              <span className="chat-media-chip-name">{item.name}</span>
              <span className="chat-media-chip-meta">
                {item.isImage ? <ImageIcon size={12} /> : null}
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
