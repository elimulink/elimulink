import React, { useEffect, useState } from "react";
import { Download, Share2, X } from "lucide-react";
import { shareMediaItem } from "./shareMediaItem.js";
import "./chat-media.css";

export default function ImagePreviewModal({
  item,
  onClose,
  onAnnotate,
  onEditImage,
}) {
  const [shareStatus, setShareStatus] = useState("");

  useEffect(() => {
    if (!item) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [item, onClose]);

  useEffect(() => {
    setShareStatus("");
  }, [item]);

  if (!item) return null;

  const handleShare = async () => {
    try {
      setShareStatus("");
      await shareMediaItem(item);
      setShareStatus("Shared");
    } catch (error) {
      setShareStatus(error?.message || "Sharing is not supported on this device.");
    }
  };

  return (
    <div className="chat-media-modal-backdrop" onClick={onClose}>
      <div className="chat-media-modal" onClick={(event) => event.stopPropagation()}>
        <div className="chat-media-modal-header">
          <div>
            <div className="chat-media-modal-title">{item.name}</div>
            <div className="chat-media-modal-subtitle">{item.source || "attachment"}</div>
          </div>
          <button type="button" className="chat-media-modal-close" onClick={onClose} aria-label="Close preview">
            <X size={16} />
          </button>
        </div>

        <div className="chat-media-modal-actions-row">
          <div className="chat-media-modal-actions">
            {item.isImage ? (
              <button
                type="button"
                onClick={() => onAnnotate?.(item)}
                className="chat-media-modal-link"
              >
                <span>Annotate</span>
              </button>
            ) : null}
            {item.isImage ? (
              <button
                type="button"
                onClick={() => onEditImage?.(item)}
                className="chat-media-modal-link"
              >
                <span>AI Edit</span>
              </button>
            ) : null}
            {item.isScreenshot ? (
              <button
                type="button"
                onClick={handleShare}
                className="chat-media-modal-link"
              >
                <Share2 size={15} />
                <span>Share screenshot</span>
              </button>
            ) : null}
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
          </div>
        </div>
        <div className="chat-media-modal-body">
          {shareStatus ? (
            <div className="mb-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              {shareStatus}
            </div>
          ) : null}
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
