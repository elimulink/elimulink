import React, { useEffect, useMemo, useState } from "react";
import { Loader2, Send, Settings2, Share2, Download, X } from "lucide-react";
import { auth } from "../../lib/firebase";
import imageAPI from "../../services/imageAPI.js";
import { shareMediaItem } from "./shareMediaItem.js";
import "./chat-media.css";

function dataUrlToFile(dataUrl, filename = "edited-image.png") {
  const match = String(dataUrl || "").match(/^data:(.+);base64,(.+)$/);
  if (!match) return null;
  const mimeType = match[1];
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new File([bytes], filename, { type: mimeType });
}

export default function AIImageEditModal({
  open,
  item,
  onClose,
  onApply,
}) {
  const [currentImageUrl, setCurrentImageUrl] = useState("");
  const [prompt, setPrompt] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [statusText, setStatusText] = useState("");

  useEffect(() => {
    if (!open || !item) return;
    setCurrentImageUrl(item.url || "");
    setPrompt("");
    setIsEditing(false);
    setStatusText("");
  }, [item, open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  const canSubmit = useMemo(
    () => Boolean(String(prompt || "").trim()) && Boolean(currentImageUrl) && !isEditing,
    [currentImageUrl, isEditing, prompt]
  );

  if (!open || !item?.isImage) return null;

  const currentFile = item.file || dataUrlToFile(currentImageUrl, item.name || "edited-image.png");

  const handleDownload = () => {
    if (!currentImageUrl) return;
    const link = document.createElement("a");
    link.href = currentImageUrl;
    link.download = item.name || "elimulink-edited-image.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = async () => {
    if (!currentFile) {
      setStatusText("Sharing is not supported on this device.");
      return;
    }
    try {
      setStatusText("");
      await shareMediaItem({
        ...item,
        file: currentFile,
        isScreenshot: false,
      });
      setStatusText("Shared");
    } catch (error) {
      setStatusText(error?.message || "Sharing is not supported on this device.");
    }
  };

  const handleSubmit = async () => {
    const cleanPrompt = String(prompt || "").trim();
    if (!cleanPrompt || !currentImageUrl) return;
    setIsEditing(true);
    setStatusText("");
    try {
      const idToken = await auth?.currentUser?.getIdToken().catch(() => null);
      const result = await imageAPI.editImage({
        imageDataUrl: currentImageUrl,
        prompt: cleanPrompt,
        idToken,
      });
      const nextUrl = result.image;
      const nextFile = dataUrlToFile(nextUrl, item.name || "edited-image.png");
      setCurrentImageUrl(nextUrl);
      setPrompt("");
      setStatusText(result.text || "Edited image ready.");
      await onApply?.({
        imageUrl: nextUrl,
        file: nextFile,
        prompt: cleanPrompt,
        text: result.text || "Here is the edited image.",
        previousItem: item,
      });
    } catch (error) {
      setStatusText(error?.message || "Image editing failed.");
    } finally {
      setIsEditing(false);
    }
  };

  return (
    <div className="chat-media-ai-editor-backdrop" onClick={onClose}>
      <div className="chat-media-ai-editor" onClick={(event) => event.stopPropagation()}>
        <div className="chat-media-ai-editor-topbar">
          <button type="button" className="chat-media-ai-editor-pill" onClick={onClose}>
            <X size={18} />
            <span>Close</span>
          </button>
          <div className="chat-media-ai-editor-actions">
            <button type="button" className="chat-media-ai-editor-pill" onClick={handleDownload}>
              <Download size={18} />
              <span>Save</span>
            </button>
            <button type="button" className="chat-media-ai-editor-pill is-primary" onClick={handleShare}>
              <Share2 size={18} />
              <span>Share</span>
            </button>
          </div>
        </div>

        <div className="chat-media-ai-editor-stage">
          {currentImageUrl ? (
            <img
              src={currentImageUrl}
              alt={item.name || "Editable image"}
              className="chat-media-ai-editor-image"
            />
          ) : null}
          {isEditing ? (
            <div className="chat-media-ai-editor-loading">
              <Loader2 size={18} className="animate-spin" />
              <span>Applying edits...</span>
            </div>
          ) : null}
        </div>

        <div className="chat-media-ai-editor-bottom">
          <div className="chat-media-ai-editor-composer">
            <button type="button" className="chat-media-ai-editor-tool" aria-label="Editing tools">
              <Settings2 size={18} />
            </button>
            <input
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Describe edits"
              className="chat-media-ai-editor-input"
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSubmit();
                }
              }}
            />
            <button
              type="button"
              className="chat-media-ai-editor-send"
              onClick={handleSubmit}
              disabled={!canSubmit}
              aria-label="Apply image edits"
            >
              {isEditing ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
          {statusText ? <div className="chat-media-ai-editor-status">{statusText}</div> : null}
        </div>
      </div>
    </div>
  );
}
