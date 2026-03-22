import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { textToSpeechWithFallback } from "../../lib/speechProviders";
import {
  AUDIO_SPEED_OPTIONS,
  getLanguageOptions,
  getVoiceCatalog,
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
  const savedSettingsRef = useRef(readAudioSettings(uid, appLanguage));
  const audioRef = useRef(null);
  const objectUrlRef = useRef("");

  const [isOpen, setIsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPreviewingVoice, setIsPreviewingVoice] = useState(false);
  const [previewVoiceId, setPreviewVoiceId] = useState("");
  const [previewError, setPreviewError] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeText, setActiveText] = useState("");
  const [playbackRate, setPlaybackRateState] = useState(savedSettingsRef.current.playbackRate || defaultRate);
  const [language, setLanguageState] = useState(savedSettingsRef.current.language || normalizeLanguageCode(appLanguage));
  const [voiceId, setVoiceIdState] = useState(savedSettingsRef.current.voiceId || "");
  const [followAppLanguage, setFollowAppLanguage] = useState(savedSettingsRef.current.followAppLanguage !== false);
  const [captionsEnabled, setCaptionsEnabled] = useState(Boolean(savedSettingsRef.current.captionsEnabled));
  const [autoPlayReplies, setAutoPlayReplies] = useState(
    typeof savedSettingsRef.current.autoPlayReplies === "boolean"
      ? savedSettingsRef.current.autoPlayReplies
      : true
  );

  const isSupported = typeof window !== "undefined" && typeof Audio !== "undefined";
  const normalizedAppLanguage = useMemo(() => normalizeLanguageCode(appLanguage), [appLanguage]);
  const voiceCatalog = useMemo(() => getVoiceCatalog(), []);
  const languageOptions = useMemo(
    () => getLanguageOptions(voiceCatalog, normalizedAppLanguage),
    [normalizedAppLanguage, voiceCatalog]
  );
  const voiceOptions = useMemo(() => voiceCatalog, [voiceCatalog]);
  const selectedVoice = useMemo(
    () => pickVoiceForLanguage(voiceCatalog, voiceId, language),
    [language, voiceCatalog, voiceId]
  );

  const persistSettings = useCallback(
    (next) => {
      saveAudioSettings(next, uid);
      savedSettingsRef.current = next;
    },
    [uid]
  );

  const cleanupObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = "";
    }
  }, []);

  const stopAudio = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    }
    cleanupObjectUrl();
    setIsPlaying(false);
    setIsPreviewingVoice(false);
    setPreviewVoiceId("");
  }, [cleanupObjectUrl]);

  const playBlob = useCallback(
    async (blob, { preview = false, nextVoiceId = "", onStart, onEnd, onError } = {}) => {
      if (!isSupported) return false;

      stopAudio();
      const url = URL.createObjectURL(blob);
      objectUrlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.playbackRate = playbackRate;

      audio.onloadedmetadata = () => {
        if (!preview) {
          setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
        }
      };

      audio.ontimeupdate = () => {
        if (!preview) {
          setCurrentTime(audio.currentTime || 0);
        }
      };

      audio.onplay = () => {
        if (preview) {
          setIsPreviewingVoice(true);
          setPreviewVoiceId(nextVoiceId);
        } else {
          setIsPlaying(true);
        }
        onStart?.();
      };

      audio.onpause = () => {
        if (!preview && !audio.ended) {
          setIsPlaying(false);
        }
      };

      audio.onended = () => {
        if (preview) {
          setIsPreviewingVoice(false);
          setPreviewVoiceId("");
        } else {
          setCurrentTime(Number.isFinite(audio.duration) ? audio.duration : currentTime);
          setIsPlaying(false);
        }
        cleanupObjectUrl();
        onEnd?.();
      };

      audio.onerror = () => {
        if (preview) {
          setIsPreviewingVoice(false);
          setPreviewVoiceId("");
        } else {
          setIsPlaying(false);
        }
        cleanupObjectUrl();
        onError?.();
      };

      await audio.play();
      return true;
    },
    [cleanupObjectUrl, currentTime, isSupported, playbackRate, stopAudio]
  );

  const requestSpeechBlob = useCallback(
    async (text, nextVoiceId = "") => {
      const cleaned = sanitizeSpokenText(text);
      if (!cleaned) return null;
      const voice = pickVoiceForLanguage(voiceCatalog, nextVoiceId || voiceId, language);
      return textToSpeechWithFallback({
        text: cleaned,
        voiceId: voice?.id || voiceId || "nova",
        speed: playbackRate,
      });
    },
    [language, playbackRate, voiceCatalog, voiceId]
  );

  useEffect(() => {
    const next = readAudioSettings(uid, normalizedAppLanguage);
    savedSettingsRef.current = next;
    setPlaybackRateState(next.playbackRate || defaultRate);
    setLanguageState(next.language || normalizedAppLanguage);
    setVoiceIdState(next.voiceId || "");
    setFollowAppLanguage(next.followAppLanguage !== false);
    setCaptionsEnabled(Boolean(next.captionsEnabled));
    setAutoPlayReplies(typeof next.autoPlayReplies === "boolean" ? next.autoPlayReplies : true);
  }, [defaultRate, normalizedAppLanguage, uid]);

  useEffect(() => {
    if (!followAppLanguage) return;
    setLanguageState(normalizedAppLanguage);
  }, [followAppLanguage, normalizedAppLanguage]);

  useEffect(() => {
    const next = {
      playbackRate,
      language,
      voiceId,
      followAppLanguage,
      captionsEnabled,
      autoPlayReplies,
    };
    persistSettings(next);
  }, [autoPlayReplies, captionsEnabled, followAppLanguage, language, persistSettings, playbackRate, voiceId]);

  const openPlayer = useCallback(() => setIsOpen(true), []);

  const closePlayer = useCallback(() => {
    stopAudio();
    setIsSettingsOpen(false);
    setIsOpen(false);
    setCurrentTime(0);
    setDuration(0);
    setActiveText("");
    setPreviewError("");
  }, [stopAudio]);

  const playText = useCallback(
    async (text, options = {}) => {
      const cleaned = sanitizeSpokenText(text);
      if (!cleaned) return false;
      setPreviewError("");
      setActiveText(cleaned);
      setCurrentTime(0);
      setDuration(0);
      setIsOpen(true);
      try {
        const blob = await requestSpeechBlob(cleaned, options.previewVoiceId || "");
        if (!blob) return false;
        return await playBlob(blob, options);
      } catch (error) {
        setPreviewError(String(error?.message || "Audio playback failed."));
        options.onError?.(error);
        return false;
      }
    },
    [playBlob, requestSpeechBlob]
  );

  const previewVoice = useCallback(
    async (nextVoiceId) => {
      const voice = pickVoiceForLanguage(voiceCatalog, nextVoiceId || voiceId, language);
      if (!voice) return false;
      setPreviewError("");
      try {
        const blob = await requestSpeechBlob(voice.sampleText, voice.id);
        if (!blob) return false;
        return await playBlob(blob, {
          preview: true,
          nextVoiceId: voice.id,
          onError: () => setPreviewError("Could not play preview."),
        });
      } catch {
        setPreviewError("Voice preview failed.");
        setIsPreviewingVoice(false);
        setPreviewVoiceId("");
        return false;
      }
    },
    [language, playBlob, requestSpeechBlob, voiceCatalog, voiceId]
  );

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (audio) {
      if (audio.paused) {
        await audio.play();
        return;
      }
      audio.pause();
      return;
    }
    if (activeText) {
      await playText(activeText);
    }
  }, [activeText, playText]);

  const seekTo = useCallback((value) => {
    const audio = audioRef.current;
    if (!audio) return;
    const next = Math.max(0, Number(value) || 0);
    audio.currentTime = next;
    setCurrentTime(next);
  }, []);

  const setPlaybackRate = useCallback((value) => {
    const next = AUDIO_SPEED_OPTIONS.includes(Number(value)) ? Number(value) : 1;
    setPlaybackRateState(next);
    if (audioRef.current) {
      audioRef.current.playbackRate = next;
    }
  }, []);

  const setLanguage = useCallback((nextLanguage) => {
    setFollowAppLanguage(false);
    setLanguageState(normalizeLanguageCode(nextLanguage));
  }, []);

  const setVoice = useCallback((nextVoiceId) => {
    setVoiceIdState(String(nextVoiceId || "").trim());
  }, []);

  useEffect(() => () => closePlayer(), [closePlayer]);

  return {
    isSupported,
    isOpen,
    isSettingsOpen,
    isPlaying,
    isPreviewingVoice,
    previewError,
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
    captionsEnabled,
    autoPlayReplies,
    setPlaybackRate,
    setVoice,
    setLanguage,
    setIsSettingsOpen,
    setFollowAppLanguage,
    setCaptionsEnabled,
    setAutoPlayReplies,
    openPlayer,
    closePlayer,
    togglePlay,
    seekTo,
    playText,
    previewVoice,
    previewVoiceId,
  };
}
