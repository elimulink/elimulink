import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const LANGUAGE_MAP = {
  English: "en-US",
  Swahili: "sw-KE",
  French: "fr-FR",
};

function sanitizeSpokenText(text) {
  return String(text || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1800);
}

function estimateDuration(text, rate = 1) {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean).length;
  if (!words) return 0;
  const wordsPerMinute = 165 * Math.max(0.5, Number(rate) || 1);
  return Math.max(2, (words / wordsPerMinute) * 60);
}

function resolveLanguageCode(language) {
  return LANGUAGE_MAP[language] || language || "en-US";
}

function pickVoice(voices, voiceName, language) {
  const code = resolveLanguageCode(language).toLowerCase();
  const base = code.split("-")[0];
  const list = Array.isArray(voices) ? voices : [];
  return (
    list.find((item) => String(item.name || "").toLowerCase() === String(voiceName || "").toLowerCase()) ||
    list.find((item) => String(item.lang || "").toLowerCase().startsWith(code)) ||
    list.find((item) => String(item.lang || "").toLowerCase().startsWith(base)) ||
    list[0] ||
    null
  );
}

export function formatAudioTime(seconds = 0) {
  const safe = Math.max(0, Math.floor(seconds || 0));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function useAudioPlayer({
  src = "",
  defaultRate = 1,
  defaultVoice = "Default",
  defaultLanguage = "English",
} = {}) {
  const audioRef = useRef(null);
  const utteranceRef = useRef(null);
  const tickerRef = useRef(null);
  const playbackStateRef = useRef({ baseTime: 0, startedAt: 0 });
  const [isOpen, setIsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(defaultRate);
  const [voice, setVoice] = useState(defaultVoice);
  const [language, setLanguage] = useState(defaultLanguage);
  const [activeText, setActiveText] = useState("");
  const [availableVoices, setAvailableVoices] = useState(["Default", "Caspian", "Nova", "Atlas"]);

  const availableLanguages = useMemo(() => ["English", "Swahili", "French"], []);

  const stopTicker = useCallback(() => {
    if (tickerRef.current) {
      window.clearInterval(tickerRef.current);
      tickerRef.current = null;
    }
  }, []);

  const startTicker = useCallback((baseTime) => {
    stopTicker();
    playbackStateRef.current = {
      baseTime,
      startedAt: Date.now(),
    };
    tickerRef.current = window.setInterval(() => {
      const elapsed = (Date.now() - playbackStateRef.current.startedAt) / 1000;
      setCurrentTime(Math.min(duration || 0, playbackStateRef.current.baseTime + elapsed));
    }, 250);
  }, [duration, stopTicker]);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return undefined;
    const synth = window.speechSynthesis;
    const updateVoices = () => {
      const next = synth.getVoices();
      if (next.length) setAvailableVoices(next.map((item) => item.name));
    };
    updateVoices();
    synth.addEventListener?.("voiceschanged", updateVoices);
    return () => synth.removeEventListener?.("voiceschanged", updateVoices);
  }, []);

  useEffect(() => {
    if (!src) return undefined;
    const audio = new Audio(src);
    audio.preload = "metadata";
    audio.playbackRate = playbackRate;
    audioRef.current = audio;

    const onLoaded = () => setDuration(audio.duration || 0);
    const onTime = () => setCurrentTime(audio.currentTime || 0);
    const onEnded = () => setIsPlaying(false);
    const onPause = () => setIsPlaying(false);
    const onPlay = () => setIsPlaying(true);

    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("play", onPlay);

    return () => {
      audio.pause();
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("play", onPlay);
    };
  }, [src, playbackRate]);

  const stopSpeech = useCallback(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
    stopTicker();
    setIsPlaying(false);
  }, [stopTicker]);

  const playText = useCallback((text, seekTime = 0) => {
    if (!("speechSynthesis" in window)) return;
    const cleaned = sanitizeSpokenText(text);
    if (!cleaned) return;

    const nextDuration = estimateDuration(cleaned, playbackRate);
    const targetTime = Math.min(Math.max(0, Number(seekTime) || 0), nextDuration);
    const startRatio = nextDuration > 0 ? targetTime / nextDuration : 0;
    const startIndex = Math.min(cleaned.length, Math.floor(cleaned.length * startRatio));
    const sliced = cleaned.slice(startIndex);
    if (!sliced) return;

    stopSpeech();
    setActiveText(cleaned);
    setDuration(nextDuration);
    setCurrentTime(targetTime);
    setIsOpen(true);

    const utterance = new SpeechSynthesisUtterance(sliced);
    const synthVoices = "speechSynthesis" in window ? window.speechSynthesis.getVoices() : [];
    const selectedVoice = pickVoice(synthVoices, voice, language);
    utterance.rate = playbackRate;
    utterance.lang = resolveLanguageCode(language);
    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.onstart = () => {
      setIsPlaying(true);
      startTicker(targetTime);
    };
    utterance.onpause = () => {
      stopTicker();
      setIsPlaying(false);
    };
    utterance.onresume = () => {
      setIsPlaying(true);
      startTicker(currentTime);
    };
    utterance.onboundary = (event) => {
      if (!event?.charIndex || !sliced.length) return;
      const remaining = nextDuration - targetTime;
      const progress = event.charIndex / sliced.length;
      setCurrentTime(Math.min(nextDuration, targetTime + remaining * progress));
    };
    utterance.onend = () => {
      stopTicker();
      setCurrentTime(nextDuration);
      setIsPlaying(false);
    };
    utterance.onerror = () => {
      stopTicker();
      setIsPlaying(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, [currentTime, language, playbackRate, startTicker, stopSpeech, stopTicker, voice]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const openPlayer = useCallback(() => setIsOpen(true), []);

  const closePlayer = useCallback(() => {
    if (audioRef.current) audioRef.current.pause();
    stopSpeech();
    setIsSettingsOpen(false);
    setIsOpen(false);
    setCurrentTime(0);
  }, [stopSpeech]);

  const togglePlay = useCallback(async () => {
    if (src && audioRef.current) {
      if (audioRef.current.paused) {
        await audioRef.current.play();
      } else {
        audioRef.current.pause();
      }
      return;
    }

    if (!activeText) return;
    if (!("speechSynthesis" in window)) return;

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
      startTicker(currentTime);
      return;
    }

    playText(activeText, currentTime);
  }, [activeText, currentTime, playText, src, startTicker, stopTicker]);

  const seekTo = useCallback((value) => {
    const next = Number(value);
    if (src && audioRef.current) {
      audioRef.current.currentTime = next;
      setCurrentTime(next);
      return;
    }
    if (!activeText) return;
    playText(activeText, next);
  }, [activeText, playText, src]);

  useEffect(() => {
    if (!isOpen || !activeText || !isPlaying || src) return;
    playText(activeText, currentTime);
  }, [playbackRate, voice, language]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => closePlayer(), [closePlayer]);

  return {
    isOpen,
    isSettingsOpen,
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    voice,
    language,
    activeText,
    voices: availableVoices,
    languages: availableLanguages,
    setPlaybackRate,
    setVoice,
    setLanguage,
    setIsSettingsOpen,
    openPlayer,
    closePlayer,
    togglePlay,
    seekTo,
    playText,
  };
}
