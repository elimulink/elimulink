import { readScopedJson, writeScopedJson } from "../../lib/userScopedStorage";

const PREVIEW_SETTINGS_KEY = "elimulink_desktop_settings_preview_v1";

export function getDesktopSettingsPreviewState(sectionKey, defaults = {}, uid = null) {
  const root =
    (uid ? readScopedJson(uid, PREVIEW_SETTINGS_KEY, null) : null) ||
    readFallbackPreviewState() ||
    {};
  const sectionState =
    root && typeof root === "object" && root[sectionKey] && typeof root[sectionKey] === "object"
      ? root[sectionKey]
      : {};
  return { ...defaults, ...sectionState };
}

export function saveDesktopSettingsPreviewState(sectionKey, value, uid = null) {
  const nextRoot = {
    ...(uid ? readScopedJson(uid, PREVIEW_SETTINGS_KEY, null) : null),
    ...(readFallbackPreviewState() || {}),
  };
  nextRoot[sectionKey] = { ...(value || {}) };

  try {
    localStorage.setItem(PREVIEW_SETTINGS_KEY, JSON.stringify(nextRoot));
  } catch {
    // ignore storage errors
  }

  if (uid) {
    writeScopedJson(uid, PREVIEW_SETTINGS_KEY, nextRoot);
  }

  return nextRoot[sectionKey];
}

function readFallbackPreviewState() {
  try {
    const raw = localStorage.getItem(PREVIEW_SETTINGS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}
