import { readScopedJson, writeScopedJson } from "../../lib/userScopedStorage";

export const DEFAULT_VOICE_SETTINGS = {
  voiceId: "nova",
  captionsEnabled: false,
  speechRate: 1,
  autoPlayReplies: true,
};

export const VOICE_SETTINGS_KEY = "elimulink_voice_settings_v2";

function normalizeVoiceSettings(value = {}) {
  const nextRate = Number(value?.speechRate);
  return {
    voiceId: String(value?.voiceId || DEFAULT_VOICE_SETTINGS.voiceId).trim() || DEFAULT_VOICE_SETTINGS.voiceId,
    captionsEnabled: Boolean(value?.captionsEnabled),
    speechRate:
      Number.isFinite(nextRate) && nextRate >= 0.75 && nextRate <= 1.25
        ? Number(nextRate.toFixed(2))
        : DEFAULT_VOICE_SETTINGS.speechRate,
    autoPlayReplies:
      typeof value?.autoPlayReplies === "boolean"
        ? value.autoPlayReplies
        : DEFAULT_VOICE_SETTINGS.autoPlayReplies,
  };
}

export function loadVoiceSettings(uid = null) {
  try {
    const scoped = uid ? readScopedJson(uid, VOICE_SETTINGS_KEY, null) : null;
    if (scoped && typeof scoped === "object") {
      return normalizeVoiceSettings(scoped);
    }

    const raw = localStorage.getItem(VOICE_SETTINGS_KEY);
    if (!raw) return DEFAULT_VOICE_SETTINGS;
    return normalizeVoiceSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_VOICE_SETTINGS;
  }
}

export function saveVoiceSettings(settings, uid = null) {
  const next = normalizeVoiceSettings(settings);
  try {
    localStorage.setItem(VOICE_SETTINGS_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors
  }
  if (uid) {
    writeScopedJson(uid, VOICE_SETTINGS_KEY, next);
  }
  return next;
}

