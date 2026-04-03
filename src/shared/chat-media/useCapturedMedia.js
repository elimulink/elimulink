import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const MAX_IMAGE_ATTACHMENTS = 10;

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
  if (source === "camera" || source === "scan") return false;

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

function probeImageDimensions(file) {
  return new Promise((resolve) => {
    if (!file || !String(file.type || "").startsWith("image/")) {
      resolve(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const width = Number(image.naturalWidth || 0);
      const height = Number(image.naturalHeight || 0);
      URL.revokeObjectURL(objectUrl);
      resolve(width > 0 && height > 0 ? { width, height } : null);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(null);
    };
    image.src = objectUrl;
  });
}

function looksLikeScreenshotDimensions(dimensions) {
  if (!dimensions) return false;
  const width = Number(dimensions.width || 0);
  const height = Number(dimensions.height || 0);
  const largest = Math.max(width, height);
  const smallest = Math.max(1, Math.min(width, height));
  const ratio = largest / smallest;
  const commonScreenSize =
    largest >= 1080 &&
    smallest >= 720 &&
    largest <= 4200 &&
    smallest <= 2600;
  return commonScreenSize && ratio >= 1.3 && ratio <= 2.6;
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
  const [mediaNotice, setMediaNotice] = useState("");
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
    setMediaNotice("");
    const candidates = Array.from(fileList).map((file) => normalizeItem(file, source));
    const currentImageCount = mediaRef.current.filter((item) => item?.isImage).length;
    let usedImageSlots = currentImageCount;
    const next = [];
    let imageLimitReached = false;

    candidates.forEach((item) => {
      if (item.isImage) {
        if (usedImageSlots >= MAX_IMAGE_ATTACHMENTS) {
          revokeItemUrl(item);
          imageLimitReached = true;
          return;
        }
        usedImageSlots += 1;
      }
      next.push(item);
    });

    if (imageLimitReached) {
      setMediaNotice(`You can upload up to ${MAX_IMAGE_ATTACHMENTS} images per message.`);
    }

    if (!next.length) return [];
    setMediaItems((prev) => [...prev, ...next]);
    const screenshotCandidate = next.find((item) => item.isScreenshot);
    if (screenshotCandidate) setToastItem(screenshotCandidate);

    next.forEach((item) => {
      if (item.isScreenshot || !item.isImage || !item.file || source === "camera" || source === "scan") {
        return;
      }
      probeImageDimensions(item.file).then((dimensions) => {
        if (!looksLikeScreenshotDimensions(dimensions)) return;
        setMediaItems((prev) =>
          prev.map((entry) => (entry.id === item.id ? { ...entry, isScreenshot: true } : entry))
        );
        setToastItem((current) => current || { ...item, isScreenshot: true });
      });
    });

    return next;
  }, []);

  const removeMedia = useCallback((id) => {
    setMediaNotice("");
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
    setMediaNotice("");
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
      mediaNotice,
      addFiles,
      removeMedia,
      clearMedia,
      openPreview,
      openEditor,
      applyEditedMedia,
      closePreview: () => setPreviewItem(null),
      closeEditor: () => setEditorItem(null),
      dismissToast: () => setToastItem(null),
      dismissMediaNotice: () => setMediaNotice(""),
      handlePaste,
    }),
    [addFiles, applyEditedMedia, clearMedia, editorItem, handlePaste, mediaItems, mediaNotice, openEditor, openPreview, previewItem, removeMedia, toastItem],
  );
}
