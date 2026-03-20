import { readScopedJson, writeScopedJson } from "../../lib/userScopedStorage";

export const AUDIO_SETTINGS_KEY = "elimulink_audio_settings_v1";
export const AUDIO_SPEED_OPTIONS = [0.8, 1, 1.2, 1.5, 1.8];

const LANGUAGE_LABELS = {
  ar: "Arabic",
  "ar-SA": "Arabic",
  en: "English",
  "en-GB": "English",
  "en-KE": "English",
  "en-US": "English",
  fr: "French",
  "fr-FR": "French",
  sw: "Swahili",
  "sw-KE": "Swahili",
};

const LANGUAGE_PREVIEW_TEXT = {
  ar: "هذا نموذج صوت قصير من ElimuLink.",
  en: "This is a short ElimuLink voice preview.",
  fr: "Ceci est un court aperçu vocal ElimuLink.",
  sw: "Huu ni mfano mfupi wa sauti ya ElimuLink.",
};

const FEMALE_HINTS = ["female", "woman", "samantha", "victoria", "ava", "nova", "zira", "aria", "susan", "siri", "hazel"];
const MALE_HINTS = ["male", "man", "david", "daniel", "alex", "fred", "atlas", "thomas", "jorge", "ralph"];

function baseOf(languageCode) {
  return String(languageCode || "en-US").trim().split("-")[0].toLowerCase() || "en";
}

function titleCase(value) {
  return String(value || "")
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function normalizeStoredSettings(value = {}) {
  return {
    playbackRate: AUDIO_SPEED_OPTIONS.includes(Number(value?.playbackRate)) ? Number(value.playbackRate) : 1,
    language: normalizeLanguageCode(value?.language || "en-US"),
    voiceId: String(value?.voiceId || "").trim(),
    followAppLanguage: value?.followAppLanguage !== false,
  };
}

export function normalizeLanguageCode(languageCode) {
  const raw = String(languageCode || "en-US").trim();
  const normalized = raw.replace(/_/g, "-");
  const lower = normalized.toLowerCase();

  if (!lower) return "en-US";
  if (lower === "en") return "en-US";
  if (lower === "en-ke") return "en-KE";
  if (lower === "sw") return "sw-KE";
  if (lower === "fr") return "fr-FR";
  if (lower === "ar") return "ar-SA";
  if (normalized.length === 2) return normalized.toLowerCase();

  const [lang, region] = normalized.split("-");
  if (!region) return lang.toLowerCase();
  return `${lang.toLowerCase()}-${region.toUpperCase()}`;
}

export function getLanguageLabel(languageCode) {
  const normalized = normalizeLanguageCode(languageCode);
  return LANGUAGE_LABELS[normalized] || LANGUAGE_LABELS[baseOf(normalized)] || titleCase(baseOf(normalized));
}

export function getPreviewText(languageCode) {
  const normalized = normalizeLanguageCode(languageCode);
  return LANGUAGE_PREVIEW_TEXT[normalized] || LANGUAGE_PREVIEW_TEXT[baseOf(normalized)] || LANGUAGE_PREVIEW_TEXT.en;
}

export function readAudioSettings(uid = null, appLanguage = "en-US") {
  const fallback = normalizeStoredSettings({ language: appLanguage });
  const stored = uid ? readScopedJson(uid, AUDIO_SETTINGS_KEY, null) : null;
  if (stored && typeof stored === "object") {
    return normalizeStoredSettings(stored);
  }
  return fallback;
}

export function saveAudioSettings(settings, uid = null) {
  if (!uid) return;
  writeScopedJson(uid, AUDIO_SETTINGS_KEY, normalizeStoredSettings(settings));
}

export function getVoiceCatalog(speechVoices = []) {
  const seen = new Set();
  return (Array.isArray(speechVoices) ? speechVoices : [])
    .map((voice) => {
      const id = String(voice?.voiceURI || voice?.name || "").trim();
      if (!id || seen.has(id)) return null;
      seen.add(id);
      const language = normalizeLanguageCode(voice?.lang || "en-US");
      const lowerName = String(voice?.name || "").toLowerCase();
      const tone = FEMALE_HINTS.some((hint) => lowerName.includes(hint))
        ? "female"
        : MALE_HINTS.some((hint) => lowerName.includes(hint))
          ? "male"
          : "neutral";

      return {
        id,
        name: String(voice?.name || "Default Voice").trim() || "Default Voice",
        language,
        languageLabel: getLanguageLabel(language),
        tone,
        localService: Boolean(voice?.localService),
        default: Boolean(voice?.default),
        label: `${String(voice?.name || "Default Voice").trim() || "Default Voice"}${tone === "neutral" ? "" : ` • ${tone}`}`,
        searchText: `${voice?.name || ""} ${language} ${tone}`.toLowerCase(),
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (a.default !== b.default) return a.default ? -1 : 1;
      if (a.language !== b.language) return a.language.localeCompare(b.language);
      return a.name.localeCompare(b.name);
    });
}

export function getLanguageOptions(voiceCatalog = [], preferredLanguage = "en-US") {
  const preferred = normalizeLanguageCode(preferredLanguage);
  const map = new Map();
  voiceCatalog.forEach((voice) => {
    const key = voice.language;
    if (!map.has(key)) {
      map.set(key, {
        code: key,
        label: getLanguageLabel(key),
        base: baseOf(key),
      });
    }
  });

  if (!map.size) {
    map.set(preferred, {
      code: preferred,
      label: getLanguageLabel(preferred),
      base: baseOf(preferred),
    });
  } else if (!map.has(preferred)) {
    const sameBase = Array.from(map.values()).find((item) => item.base === baseOf(preferred));
    if (!sameBase) {
      map.set(preferred, {
        code: preferred,
        label: getLanguageLabel(preferred),
        base: baseOf(preferred),
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    if (a.code === preferred) return -1;
    if (b.code === preferred) return 1;
    return a.label.localeCompare(b.label);
  });
}

export function getVoicesForLanguage(voiceCatalog = [], languageCode = "en-US") {
  const normalized = normalizeLanguageCode(languageCode);
  const base = baseOf(normalized);
  const exact = voiceCatalog.filter((voice) => voice.language === normalized);
  if (exact.length) return exact;
  return voiceCatalog.filter((voice) => baseOf(voice.language) === base);
}

export function pickVoiceForLanguage(voiceCatalog = [], voiceId = "", languageCode = "en-US") {
  const list = getVoicesForLanguage(voiceCatalog, languageCode);
  if (!list.length) return null;
  const selected = list.find((voice) => voice.id === voiceId);
  if (selected) return selected;
  return list.find((voice) => voice.default) || list.find((voice) => voice.localService) || list[0];
}
