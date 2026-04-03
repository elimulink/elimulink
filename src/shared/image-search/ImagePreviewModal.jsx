import React, { useEffect } from "react";
import { ExternalLink, X } from "lucide-react";
import "./image-search.css";

export default function ImagePreviewModal({
  result,
  onClose,
}) {
  useEffect(() => {
    if (!result) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [result, onClose]);

  const imageUrl = result?.image || result?.thumbnail || "";
  if (!result || !imageUrl) return null;

  return (
    <div className="image-search-modal-backdrop" onClick={onClose}>
      <div className="image-search-modal" onClick={(event) => event.stopPropagation()}>
        <div className="image-search-modal-header">
          <div>
            <div className="image-search-modal-title">{result.title || "Image preview"}</div>
            <a
              href={result.link}
              target="_blank"
              rel="noreferrer"
              className="image-search-modal-link"
            >
              {result.sourceTitle || "Open source"}
              <ExternalLink size={14} />
            </a>
          </div>
          <button type="button" className="image-search-modal-close" onClick={onClose} aria-label="Close image preview">
            <X size={16} />
          </button>
        </div>
        <div className="image-search-modal-body">
          <img src={imageUrl} alt={result.title || "Image preview"} className="image-search-modal-image" />
        </div>
      </div>
    </div>
  );
}
