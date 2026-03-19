import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function makeId(file) {
  return `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(16).slice(2)}`;
}

function isScreenshotLike(file, source) {
  const name = String(file?.name || "").toLowerCase();
  const type = String(file?.type || "").toLowerCase();
  if (source === "clipboard") return type.startsWith("image/");
  return /screenshot|screen-shot|screen_shot|capture|snip/.test(name) || source === "scan";
}

function normalizeItem(file, source = "file") {
  return {
    id: makeId(file),
    name: file.name,
    size: file.size,
    type: file.type || "application/octet-stream",
    url: URL.createObjectURL(file),
    file,
    source,
    isImage: String(file.type || "").startsWith("image/"),
    isScreenshot: isScreenshotLike(file, source),
    addedAt: Date.now(),
  };
}

export function formatMediaSize(bytes) {
  if (bytes == null) return "";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export default function useCapturedMedia() {
  const [mediaItems, setMediaItems] = useState([]);
  const [previewItem, setPreviewItem] = useState(null);
  const [toastItem, setToastItem] = useState(null);
  const mediaRef = useRef([]);

  useEffect(() => {
    mediaRef.current = mediaItems;
  }, [mediaItems]);

  useEffect(() => {
    return () => {
      mediaRef.current.forEach((item) => {
        try {
          URL.revokeObjectURL(item.url);
        } catch {
          // ignore cleanup failures
        }
      });
    };
  }, []);

  const addFiles = useCallback((fileList, source = "file") => {
    if (!fileList || fileList.length === 0) return [];
    const next = Array.from(fileList).map((file) => normalizeItem(file, source));
    setMediaItems((prev) => [...prev, ...next]);
    const screenshotCandidate = next.find((item) => item.isImage);
    if (screenshotCandidate) setToastItem(screenshotCandidate);
    return next;
  }, []);

  const removeMedia = useCallback((id) => {
    setMediaItems((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) {
        try {
          URL.revokeObjectURL(target.url);
        } catch {
          // ignore cleanup failures
        }
      }
      return prev.filter((item) => item.id !== id);
    });
    setPreviewItem((prev) => (prev?.id === id ? null : prev));
    setToastItem((prev) => (prev?.id === id ? null : prev));
  }, []);

  const clearMedia = useCallback(() => {
    setMediaItems((prev) => {
      prev.forEach((item) => {
        try {
          URL.revokeObjectURL(item.url);
        } catch {
          // ignore cleanup failures
        }
      });
      return [];
    });
    setPreviewItem(null);
    setToastItem(null);
  }, []);

  const openPreview = useCallback((itemOrId) => {
    if (!itemOrId) return;
    if (typeof itemOrId === "string") {
      const target = mediaRef.current.find((item) => item.id === itemOrId);
      if (target) setPreviewItem(target);
      return;
    }
    setPreviewItem(itemOrId);
  }, []);

  const handlePaste = useCallback(
    (event) => {
      const clipboardItems = Array.from(event?.clipboardData?.items || []);
      const files = clipboardItems
        .filter((item) => item.kind === "file")
        .map((item) => item.getAsFile())
        .filter(Boolean);

      if (!files.length) return false;
      addFiles(files, "clipboard");
      event.preventDefault();
      return true;
    },
    [addFiles],
  );

  return useMemo(
    () => ({
      mediaItems,
      previewItem,
      toastItem,
      addFiles,
      removeMedia,
      clearMedia,
      openPreview,
      closePreview: () => setPreviewItem(null),
      dismissToast: () => setToastItem(null),
      handlePaste,
    }),
    [addFiles, clearMedia, handlePaste, mediaItems, openPreview, previewItem, removeMedia, toastItem],
  );
}
