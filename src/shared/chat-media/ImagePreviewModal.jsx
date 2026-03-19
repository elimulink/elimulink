import React, { useEffect } from "react";
import { Download, X } from "lucide-react";
import "./chat-media.css";

export default function ImagePreviewModal({
  item,
  onClose,
}) {
  useEffect(() => {
    if (!item) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [item, onClose]);

  if (!item) return null;

  return (
    <div className="chat-media-modal-backdrop" onClick={onClose}>
      <div className="chat-media-modal" onClick={(event) => event.stopPropagation()}>
        <div className="chat-media-modal-header">
          <div>
            <div className="chat-media-modal-title">{item.name}</div>
            <div className="chat-media-modal-subtitle">{item.source || "attachment"}</div>
          </div>
          <div className="chat-media-modal-actions">
            <a
              href={item.url}
              download={item.name}
              className="chat-media-modal-link"
              target="_blank"
              rel="noreferrer"
            >
              <Download size={15} />
              <span>Download</span>
            </a>
            <button type="button" className="chat-media-modal-close" onClick={onClose} aria-label="Close preview">
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="chat-media-modal-body">
          {item.isImage ? (
            <img src={item.url} alt={item.name} className="chat-media-modal-image" />
          ) : (
            <div className="chat-media-modal-file">{item.name}</div>
          )}
        </div>
      </div>
    </div>
  );
}
