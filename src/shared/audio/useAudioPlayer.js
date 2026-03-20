import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AUDIO_SPEED_OPTIONS,
  getLanguageOptions,
  getPreviewText,
  getVoiceCatalog,
  getVoicesForLanguage,
  normalizeLanguageCode,
  pickVoiceForLanguage,
  readAudioSettings,
  saveAudioSettings,
} from "./audioSettings";

function sanitizeSpokenText(text) {
  return String(text || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 2400);
}

function estimateDuration(text, rate = 1) {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean).length;
  if (!words) return 0;
  const wordsPerMinute = 168 * Math.max(0.8, Number(rate) || 1);
  return Math.max(2, (words / wordsPerMinute) * 60);
}

export function formatAudioTime(seconds = 0) {
  const safe = Math.max(0, Math.floor(seconds || 0));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function useAudioPlayer({
  uid = null,
  appLanguage = "en-US",
  defaultRate = 1,
} = {}) {
  const utteranceRef = useRef(null);
  const tickerRef = useRef(null);
  const playbackStateRef = useRef({ baseTime: 0, startedAt: 0 });
  const previewingRef = useRef(false);
  const savedSettingsRef = useRef(readAudioSettings(uid, appLanguage));

  const [isOpen, setIsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeText, setActiveText] = useState("");
  const [availableVoices, setAvailableVoices] = useState([]);
  const [isPreviewingVoice, setIsPreviewingVoice] = useState(false);
  const [previewVoiceId, setPreviewVoiceId] = useState("");
  const [playbackRate, setPlaybackRateState] = useState(savedSettingsRef.current.playbackRate || defaultRate);
  const [language, setLanguageState] = useState(savedSettingsRef.current.language || normalizeLanguageCode(appLanguage));
  const [voiceId, setVoiceIdState] = useState(savedSettingsRef.current.voiceId || "");
  const [followAppLanguage, setFollowAppLanguage] = useState(savedSettingsRef.current.followAppLanguage !== false);

  const isSupported = typeof window !== "undefined" && "speechSynthesis" in window;
  const normalizedAppLanguage = useMemo(() => normalizeLanguageCode(appLanguage), [appLanguage]);
  const voiceCatalog = useMemo(() => getVoiceCatalog(availableVoices), [availableVoices]);
  const languageOptions = useMemo(() => getLanguageOptions(voiceCatalog, normalizedAppLanguage), [normalizedAppLanguage, voiceCatalog]);
  const voiceOptions = useMemo(() => getVoicesForLanguage(voiceCatalog, language), [language, voiceCatalog]);
  const selectedVoice = useMemo(() => pickVoiceForLanguage(voiceCatalog, voiceId, language), [language, voiceCatalog, voiceId]);

  const persistSettings = useCallback((next) => {
    if (!uid) return;
    saveAudioSettings(next, uid);
    savedSettingsRef.current = next;
  }, [uid]);

  const stopTicker = useCallback(() => {
    if (tickerRef.current && typeof window !== "undefined") {
      window.clearInterval(tickerRef.current);
      tickerRef.current = null;
    }
  }, []);

  const startTicker = useCallback((baseTime, nextDuration) => {
    stopTicker();
    playbackStateRef.current = {
      baseTime,
      startedAt: Date.now(),
    };
    tickerRef.current = window.setInterval(() => {
      const elapsed = (Date.now() - playbackStateRef.current.startedAt) / 1000;
      setCurrentTime(Math.min(nextDuration || 0, playbackStateRef.current.baseTime + elapsed));
    }, 180);
  }, [stopTicker]);

  const stopSpeech = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
    previewingRef.current = false;
    stopTicker();
    setIsPlaying(false);
    setIsPreviewingVoice(false);
  }, [stopTicker]);

  const speakWithVoice = useCallback((text, { seekTime = 0, preview = false, previewVoiceId = "" } = {}) => {
    if (!isSupported) return false;
    const cleaned = sanitizeSpokenText(text);
    if (!cleaned) return false;

    const nextDuration = estimateDuration(cleaned, playbackRate);
    const targetTime = Math.min(Math.max(0, Number(seekTime) || 0), nextDuration);
    const startRatio = nextDuration > 0 ? targetTime / nextDuration : 0;
    const startIndex = Math.min(cleaned.length, Math.floor(cleaned.length * startRatio));
    const sliced = cleaned.slice(startIndex);
    if (!sliced) return false;

    stopSpeech();

    if (!preview) {
      setActiveText(cleaned);
      setDuration(nextDuration);
      setCurrentTime(targetTime);
      setIsOpen(true);
    } else {
      setIsPreviewingVoice(true);
      setPreviewVoiceId(previewVoiceId || voiceId);
      previewingRef.current = true;
    }

    const utterance = new SpeechSynthesisUtterance(sliced);
    const actualVoice = pickVoiceForLanguage(voiceCatalog, previewVoiceId || voiceId, language);
    utterance.rate = playbackRate;
    utterance.lang = actualVoice?.language || language;
    if (actualVoice) utterance.voice = availableVoices.find((voice) => (voice.voiceURI || voice.name) === actualVoice.id) || null;

    utterance.onstart = () => {
      if (preview) {
        setIsPreviewingVoice(true);
        return;
      }
      setIsPlaying(true);
      startTicker(targetTime, nextDuration);
    };
    utterance.onpause = () => {
      if (!preview) {
        stopTicker();
        setIsPlaying(false);
      }
    };
    utterance.onresume = () => {
      if (!preview) {
        setIsPlaying(true);
        startTicker(currentTime, nextDuration);
      }
    };
    utterance.onboundary = (event) => {
      if (preview || !event?.charIndex || !sliced.length) return;
      const remaining = nextDuration - targetTime;
      const progress = event.charIndex / sliced.length;
      setCurrentTime(Math.min(nextDuration, targetTime + remaining * progress));
    };
    utterance.onend = () => {
      if (preview) {
        previewingRef.current = false;
        setIsPreviewingVoice(false);
        setPreviewVoiceId("");
        return;
      }
      stopTicker();
      setCurrentTime(nextDuration);
      setIsPlaying(false);
    };
    utterance.onerror = () => {
      if (preview) {
        previewingRef.current = false;
        setIsPreviewingVoice(false);
        setPreviewVoiceId("");
        return;
      }
      stopTicker();
      setIsPlaying(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    return true;
  }, [availableVoices, currentTime, isSupported, language, playbackRate, startTicker, stopSpeech, stopTicker, voiceCatalog, voiceId]);

  useEffect(() => {
    if (!isSupported) return undefined;
    const synth = window.speechSynthesis;
    const updateVoices = () => {
      const next = synth.getVoices();
      if (next.length) setAvailableVoices(next);
    };
    updateVoices();
    synth.addEventListener?.("voiceschanged", updateVoices);
    return () => synth.removeEventListener?.("voiceschanged", updateVoices);
  }, [isSupported]);

  useEffect(() => {
    const next = readAudioSettings(uid, normalizedAppLanguage);
    savedSettingsRef.current = next;
    setPlaybackRateState(next.playbackRate || defaultRate);
    setLanguageState(next.language || normalizedAppLanguage);
    setVoiceIdState(next.voiceId || "");
    setFollowAppLanguage(next.followAppLanguage !== false);
  }, [defaultRate, normalizedAppLanguage, uid]);

  useEffect(() => {
    if (!followAppLanguage) return;
    setLanguageState((current) => {
      const currentNormalized = normalizeLanguageCode(current);
      if (currentNormalized === normalizedAppLanguage) return currentNormalized;
      return normalizedAppLanguage;
    });
  }, [followAppLanguage, normalizedAppLanguage]);

  useEffect(() => {
    if (!languageOptions.length) return;
    const normalized = normalizeLanguageCode(language);
    const currentSupported = languageOptions.some((item) => item.code === normalized || item.base === normalized.split("-")[0].toLowerCase());
    if (!currentSupported) {
      setLanguageState(languageOptions[0].code);
    }
  }, [language, languageOptions]);

  useEffect(() => {
    const supportedVoice = pickVoiceForLanguage(voiceCatalog, voiceId, language);
    if (supportedVoice && supportedVoice.id !== voiceId) {
      setVoiceIdState(supportedVoice.id);
      return;
    }
    if (!supportedVoice && voiceId) {
      setVoiceIdState("");
    }
  }, [language, voiceCatalog, voiceId]);

  useEffect(() => {
    const next = {
      playbackRate,
      language,
      voiceId,
      followAppLanguage,
    };
    persistSettings(next);
  }, [followAppLanguage, language, persistSettings, playbackRate, voiceId]);

  const openPlayer = useCallback(() => setIsOpen(true), []);

  const closePlayer = useCallback(() => {
    stopSpeech();
    setIsSettingsOpen(false);
    setIsOpen(false);
    setCurrentTime(0);
    setDuration(0);
    setActiveText("");
  }, [stopSpeech]);

  const playText = useCallback((text, options = {}) => {
    speakWithVoice(text, { seekTime: 0, preview: false, ...options });
  }, [speakWithVoice]);

  const previewVoice = useCallback((nextVoiceId) => {
    const sample = getPreviewText(language);
    speakWithVoice(sample, { preview: true, previewVoiceId: nextVoiceId || voiceId });
  }, [language, speakWithVoice, voiceId]);

  const togglePlay = useCallback(() => {
    if (!activeText || !isSupported) return;
    const synth = window.speechSynthesis;
    if (synth.speaking && !synth.paused) {
      synth.pause();
      setIsPlaying(false);
      stopTicker();
      return;
    }
    if (synth.paused) {
      synth.resume();
      setIsPlaying(true);
      startTicker(currentTime, duration);
      return;
    }
    speakWithVoice(activeText, { seekTime: currentTime });
  }, [activeText, currentTime, duration, isSupported, speakWithVoice, startTicker, stopTicker]);

  const seekTo = useCallback((value) => {
    const next = Number(value);
    if (!activeText) return;
    speakWithVoice(activeText, { seekTime: next });
  }, [activeText, speakWithVoice]);

  const setPlaybackRate = useCallback((value) => {
    const next = AUDIO_SPEED_OPTIONS.includes(Number(value)) ? Number(value) : 1;
    setPlaybackRateState(next);
  }, []);

  const setLanguage = useCallback((nextLanguage) => {
    setFollowAppLanguage(false);
    setLanguageState(normalizeLanguageCode(nextLanguage));
  }, []);

  const setVoice = useCallback((nextVoiceId) => {
    setVoiceIdState(String(nextVoiceId || "").trim());
  }, []);

  useEffect(() => {
    if (!isOpen || !activeText || !isPlaying) return;
    speakWithVoice(activeText, { seekTime: currentTime });
  }, [language, playbackRate, voiceId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => closePlayer(), [closePlayer]);

  return {
    isSupported,
    isOpen,
    isSettingsOpen,
    isPlaying,
    isPreviewingVoice,
    currentTime,
    duration,
    playbackRate,
    playbackRates: AUDIO_SPEED_OPTIONS,
    voiceId,
    language,
    activeText,
    selectedVoice,
    voiceOptions,
    languages: languageOptions,
    followAppLanguage,
    setPlaybackRate,
    setVoice,
    setLanguage,
    setIsSettingsOpen,
    setFollowAppLanguage,
    openPlayer,
    closePlayer,
    togglePlay,
    seekTo,
    playText,
    previewVoice,
    previewVoiceId,
  };
}
