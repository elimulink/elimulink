export const PROFILE_SETTINGS_KEY = "elimulink_profile_settings_v1";
export const PREFS_SETTINGS_KEY = "elimulink_preferences_v1";

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // no-op
  }
}

export function getStoredProfile(defaults = {}) {
  const stored = readJSON(PROFILE_SETTINGS_KEY, {});
  return { ...defaults, ...stored };
}

export function saveStoredProfile(profile) {
  writeJSON(PROFILE_SETTINGS_KEY, profile || {});
}

export function getStoredPreferences(defaults = {}) {
  const stored = readJSON(PREFS_SETTINGS_KEY, {});
  return { ...defaults, ...stored };
}

export function saveStoredPreferences(preferences) {
  writeJSON(PREFS_SETTINGS_KEY, preferences || {});
}

