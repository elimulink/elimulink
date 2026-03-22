import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function makeId(file) {
  return `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(16).slice(2)}`;
}

const SCREENSHOT_NAME_PATTERNS = [
  /\bscreenshot\b/,
  /\bscreen shot\b/,
  /\bscreen-shot\b/,
  /\bscreen_shot\b/,
  /\bscreen capture\b/,
  /\bscreencap\b/,
  /\bcapture\b/,
  /\bsnip\b/,
  /\bsnipping tool\b/,
];

const CLIPBOARD_SCREENSHOT_NAME_PATTERNS = [
  /^image\.(png|jpe?g|webp)$/i,
  /^image$/i,
  /^clipboard/i,
  /^pasted image/i,
];

function isScreenshotLike(file, source) {
  const rawName = String(file?.name || "").trim();
  const name = rawName.toLowerCase();
  const normalizedName = name.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  const type = String(file?.type || "").toLowerCase();
  if (!type.startsWith("image/")) return false;
  if (source === "camera" || source === "photo" || source === "scan") return false;

  let score = 0;

  if (SCREENSHOT_NAME_PATTERNS.some((pattern) => pattern.test(normalizedName))) {
    score += 3;
  }

  if (source === "clipboard") {
    if (!rawName) score += 2;
    if (CLIPBOARD_SCREENSHOT_NAME_PATTERNS.some((pattern) => pattern.test(rawName))) {
      score += 2;
    }
  }

  return score >= 2;
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

function revokeItemUrl(item) {
  try {
    if (item?.url) URL.revokeObjectURL(item.url);
  } catch {
    // ignore cleanup failures
  }
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
  const [editorItem, setEditorItem] = useState(null);
  const [toastItem, setToastItem] = useState(null);
  const mediaRef = useRef([]);

  useEffect(() => {
    mediaRef.current = mediaItems;
  }, [mediaItems]);

  useEffect(() => {
    return () => {
      mediaRef.current.forEach((item) => {
        revokeItemUrl(item);
      });
    };
  }, []);

  const addFiles = useCallback((fileList, source = "file") => {
    if (!fileList || fileList.length === 0) return [];
    const next = Array.from(fileList).map((file) => normalizeItem(file, source));
    setMediaItems((prev) => [...prev, ...next]);
    const screenshotCandidate = next.find((item) => item.isScreenshot);
    if (screenshotCandidate) setToastItem(screenshotCandidate);
    return next;
  }, []);

  const removeMedia = useCallback((id) => {
    setMediaItems((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) revokeItemUrl(target);
      return prev.filter((item) => item.id !== id);
    });
    setPreviewItem((prev) => (prev?.id === id ? null : prev));
    setEditorItem((prev) => (prev?.id === id ? null : prev));
    setToastItem((prev) => (prev?.id === id ? null : prev));
  }, []);

  const clearMedia = useCallback(() => {
    setMediaItems((prev) => {
      prev.forEach((item) => revokeItemUrl(item));
      return [];
    });
    setPreviewItem(null);
    setEditorItem(null);
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

  const openEditor = useCallback((itemOrId) => {
    if (!itemOrId) return;
    if (typeof itemOrId === "string") {
      const target = mediaRef.current.find((item) => item.id === itemOrId);
      if (target) setEditorItem(target);
      return;
    }
    setEditorItem(itemOrId);
  }, []);

  const applyEditedMedia = useCallback(async (id, file) => {
    if (!id || !file) return null;

    let updatedItem = null;

    setMediaItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const nextItem = {
          ...normalizeItem(file, item.source),
          id: item.id,
          source: item.source,
          isScreenshot: item.isScreenshot,
          addedAt: item.addedAt,
          editedAt: Date.now(),
          originalName: item.originalName || item.name,
        };
        revokeItemUrl(item);
        updatedItem = nextItem;
        return nextItem;
      })
    );

    setPreviewItem((prev) => (prev?.id === id ? updatedItem : prev));
    setEditorItem(updatedItem);
    setToastItem((prev) => (prev?.id === id ? updatedItem : prev));
    return updatedItem;
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
      editorItem,
      toastItem,
      addFiles,
      removeMedia,
      clearMedia,
      openPreview,
      openEditor,
      applyEditedMedia,
      closePreview: () => setPreviewItem(null),
      closeEditor: () => setEditorItem(null),
      dismissToast: () => setToastItem(null),
      handlePaste,
    }),
    [addFiles, applyEditedMedia, clearMedia, editorItem, handlePaste, mediaItems, openEditor, openPreview, previewItem, removeMedia, toastItem],
  );
}
