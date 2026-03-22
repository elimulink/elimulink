import { VOICE_OPTIONS } from "./voiceOptions";
import { DEFAULT_VOICE_SETTINGS, loadVoiceSettings, saveVoiceSettings } from "./voiceSettings";

export const AUDIO_SETTINGS_KEY = "elimulink_audio_settings_v2";
export const AUDIO_SPEED_OPTIONS = [0.75, 0.85, 0.95, 1, 1.05, 1.15, 1.25];

const LANGUAGE_LABELS = {
  en: "English",
  "en-US": "English",
  "en-KE": "English",
  sw: "Swahili",
  "sw-KE": "Swahili",
  fr: "French",
  "fr-FR": "French",
  ar: "Arabic",
  "ar-SA": "Arabic",
};

export function normalizeLanguageCode(languageCode) {
  const raw = String(languageCode || "en-US").trim().replace(/_/g, "-");
  const lower = raw.toLowerCase();
  if (!lower) return "en-US";
  if (lower === "en") return "en-US";
  if (lower === "sw") return "sw-KE";
  if (lower === "fr") return "fr-FR";
  if (lower === "ar") return "ar-SA";
  if (raw.length === 2) return raw.toLowerCase();
  const [lang, region] = raw.split("-");
  if (!region) return lang.toLowerCase();
  return `${lang.toLowerCase()}-${region.toUpperCase()}`;
}

export function getLanguageLabel(languageCode) {
  const normalized = normalizeLanguageCode(languageCode);
  return LANGUAGE_LABELS[normalized] || LANGUAGE_LABELS[normalized.split("-")[0]] || "English";
}

function normalizeStoredSettings(value = {}, appLanguage = "en-US") {
  const voice = {
    ...DEFAULT_VOICE_SETTINGS,
    ...loadVoiceSettings(),
    ...value,
  };

  return {
    playbackRate: AUDIO_SPEED_OPTIONS.includes(Number(voice.speechRate)) ? Number(voice.speechRate) : 1,
    language: normalizeLanguageCode(value?.language || appLanguage),
    voiceId: String(voice.voiceId || DEFAULT_VOICE_SETTINGS.voiceId),
    followAppLanguage: value?.followAppLanguage !== false,
    captionsEnabled: Boolean(voice.captionsEnabled),
    autoPlayReplies:
      typeof voice.autoPlayReplies === "boolean" ? voice.autoPlayReplies : DEFAULT_VOICE_SETTINGS.autoPlayReplies,
  };
}

export function readAudioSettings(uid = null, appLanguage = "en-US") {
  return normalizeStoredSettings(loadVoiceSettings(uid), appLanguage);
}

export function saveAudioSettings(settings, uid = null) {
  const normalized = normalizeStoredSettings(settings, settings?.language || "en-US");
  saveVoiceSettings(
    {
      voiceId: normalized.voiceId,
      speechRate: normalized.playbackRate,
      captionsEnabled: normalized.captionsEnabled,
      autoPlayReplies: normalized.autoPlayReplies,
    },
    uid
  );
}

export function getVoiceCatalog() {
  return VOICE_OPTIONS.map((voice) => ({
    id: voice.id,
    name: voice.name,
    tone: voice.tone,
    range: voice.range,
    personality: voice.personality,
    sampleText: voice.sampleText,
    language: "en-US",
    languageLabel: getLanguageLabel("en-US"),
  }));
}

export function getLanguageOptions(_voiceCatalog = [], preferredLanguage = "en-US") {
  const normalized = normalizeLanguageCode(preferredLanguage);
  return [
    {
      code: normalized,
      label: getLanguageLabel(normalized),
    },
  ];
}

export function getVoicesForLanguage(voiceCatalog = [], _languageCode = "en-US") {
  return voiceCatalog.length ? voiceCatalog : getVoiceCatalog();
}

export function pickVoiceForLanguage(voiceCatalog = [], voiceId = "", _languageCode = "en-US") {
  const list = voiceCatalog.length ? voiceCatalog : getVoiceCatalog();
  return (
    list.find((voice) => voice.id === voiceId) ||
    list.find((voice) => voice.id === DEFAULT_VOICE_SETTINGS.voiceId) ||
    list[0] ||
    null
  );
}

export function getPreviewText(languageCode = "en-US") {
  const label = getLanguageLabel(languageCode);
  return `This is a short ElimuLink ${label} voice preview.`;
}
