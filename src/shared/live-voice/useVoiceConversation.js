import { useCallback, useEffect, useRef, useState } from "react";
import { textToSpeechWithFallback } from "../../lib/speechProviders";
import { loadVoiceSettings } from "../audio/voiceSettings";

export function useVoiceConversation({
  onUserTurn,
  language = "en-US",
  autoRestartListening = true,
  initialMuted = false,
  context = null,
  settingsUid = null,
}) {
  const [mode, setMode] = useState("idle");
  const [supported, setSupported] = useState({
    speechRecognition: false,
    speechSynthesis: false,
  });
  const [muted, setMuted] = useState(initialMuted);
  const [transcript, setTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [responseText, setResponseText] = useState("");
  const [error, setError] = useState("");

  const recognitionRef = useRef(null);
  const audioRef = useRef(null);
  const audioUrlRef = useRef("");
  const speakingRef = useRef(false);
  const stoppedManuallyRef = useRef(false);
  const mountedRef = useRef(true);
  const awaitingAIRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    const SpeechRecognition =
      typeof window !== "undefined" &&
      (window.SpeechRecognition || window.webkitSpeechRecognition);

    const speechRecognitionSupported = !!SpeechRecognition;
    const speechSynthesisSupported =
      typeof window !== "undefined" && "speechSynthesis" in window;

    setSupported({
      speechRecognition: speechRecognitionSupported,
      speechSynthesis: speechSynthesisSupported,
    });

    if (speechRecognitionSupported) {
      const recognition = new SpeechRecognition();
      recognition.lang = language;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        if (!mountedRef.current) return;
        setError("");
        setMode("listening");
      };

      recognition.onresult = (event) => {
        if (!mountedRef.current) return;

        let interim = "";
        let finalText = "";

        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          const text = result[0]?.transcript || "";
          if (result.isFinal) {
            finalText += `${text} `;
          } else {
            interim += text;
          }
        }

        if (interim) {
          setTranscript(interim.trim());
        }

        if (finalText.trim()) {
          const normalized = finalText.trim();
          setTranscript("");
          setFinalTranscript(normalized);
          handleUserTurn(normalized);
        }
      };

      recognition.onerror = (event) => {
        if (!mountedRef.current) return;

        const message = event?.error || "speech-recognition-error";
        setError(message);

        if (message === "aborted" || message === "no-speech") {
          if (!stoppedManuallyRef.current) {
            setMode("idle");
          }
          return;
        }

        setMode("error");
      };

      recognition.onend = () => {
        if (!mountedRef.current) return;
        recognitionRef.current = recognition;

        if (stoppedManuallyRef.current) {
          setMode("idle");
          return;
        }

        if (awaitingAIRef.current || speakingRef.current) {
          return;
        }

        if (autoRestartListening) {
          try {
            recognition.start();
          } catch {
            setMode("idle");
          }
        } else {
          setMode("idle");
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      mountedRef.current = false;
      stoppedManuallyRef.current = true;

      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore
      }

      try {
        window.speechSynthesis?.cancel();
      } catch {
        // ignore
      }

      try {
        audioRef.current?.pause();
      } catch {
        // ignore
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = "";
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = language;
    }
  }, [language]);

  const stopRecognition = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }
  }, []);

  const startRecognition = useCallback(() => {
    if (!supported.speechRecognition || !recognitionRef.current) {
      setError("Speech recognition is not supported on this device/browser.");
      setMode("error");
      return;
    }

    stoppedManuallyRef.current = false;
    setError("");
    setTranscript("");

    try {
      recognitionRef.current.start();
    } catch (err) {
      setError(err?.message || "Failed to start listening.");
      setMode("error");
    }
  }, [supported.speechRecognition]);

  const speakText = useCallback(
    async (text) => {
      if (!text) return;

      setResponseText(text);

      const voiceSettings = loadVoiceSettings(settingsUid);

      if (!voiceSettings.autoPlayReplies || muted) {
        setMode("idle");
        if (autoRestartListening && !stoppedManuallyRef.current) {
          startRecognition();
        }
        return;
      }

      try {
        speakingRef.current = true;
        setMode("speaking");
        const blob = await textToSpeechWithFallback({
          text,
          voiceId: voiceSettings.voiceId,
          speed: voiceSettings.speechRate,
        });
        if (audioUrlRef.current) {
          URL.revokeObjectURL(audioUrlRef.current);
          audioUrlRef.current = "";
        }
        const url = URL.createObjectURL(blob);
        audioUrlRef.current = url;
        const audio = new Audio(url);
        audioRef.current = audio;

        audio.onended = () => {
          speakingRef.current = false;
          URL.revokeObjectURL(url);
          if (audioUrlRef.current === url) {
            audioUrlRef.current = "";
          }
          if (!mountedRef.current) return;

          setMode("idle");

          if (autoRestartListening && !stoppedManuallyRef.current) {
            startRecognition();
          }
        };

        audio.onerror = () => {
          speakingRef.current = false;
          URL.revokeObjectURL(url);
          if (audioUrlRef.current === url) {
            audioUrlRef.current = "";
          }
          if (!mountedRef.current) return;

          setMode("idle");

          if (autoRestartListening && !stoppedManuallyRef.current) {
            startRecognition();
          }
        };

        await audio.play();
      } catch (err) {
        speakingRef.current = false;
        setError(err?.message || "Failed to play AI voice response.");
        setMode("error");
      }
    },
    [autoRestartListening, muted, settingsUid, startRecognition]
  );

  const interruptSpeaking = useCallback(() => {
    try {
      window.speechSynthesis?.cancel();
    } catch {
      // ignore
    }
    try {
      audioRef.current?.pause();
    } catch {
      // ignore
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = "";
    }
    speakingRef.current = false;

    if (!stoppedManuallyRef.current && autoRestartListening) {
      startRecognition();
    } else {
      setMode("idle");
    }
  }, [autoRestartListening, startRecognition]);

  const handleUserTurn = useCallback(
    async (text) => {
      if (!text || awaitingAIRef.current) return;

      awaitingAIRef.current = true;
      setMode("thinking");
      stopRecognition();

      try {
        const result = await onUserTurn({
          text,
          context,
        });

        const aiText =
          typeof result === "string"
            ? result
            : result?.text || "I heard you, but I do not have a response yet.";

        awaitingAIRef.current = false;
        await speakText(aiText);
      } catch (err) {
        awaitingAIRef.current = false;
        setError(err?.message || "Failed to get AI voice response.");
        setMode("error");
      }
    },
    [context, onUserTurn, speakText, stopRecognition]
  );

  const startVoiceChat = useCallback(() => {
    setFinalTranscript("");
    setResponseText("");
    setError("");
    startRecognition();
  }, [startRecognition]);

  const stopListening = useCallback(
    (options = {}) => {
      const shouldSubmitInterim = options.submitInterim !== false;
      const pendingTranscript = transcript.trim();

      stoppedManuallyRef.current = true;
      stopRecognition();

      if (
        shouldSubmitInterim &&
        pendingTranscript &&
        !awaitingAIRef.current &&
        mode === "listening"
      ) {
        setTranscript("");
        setFinalTranscript(pendingTranscript);
        handleUserTurn(pendingTranscript);
      } else if (!awaitingAIRef.current && !speakingRef.current) {
        setMode("idle");
      }
    },
    [handleUserTurn, mode, stopRecognition, transcript]
  );

  const submitTextTurn = useCallback(
    async (text) => {
      const normalized = `${text || ""}`.trim();
      if (!normalized) return false;

      setTranscript("");
      setFinalTranscript(normalized);
      setError("");
      stoppedManuallyRef.current = false;
      await handleUserTurn(normalized);
      return true;
    },
    [handleUserTurn]
  );

  const endVoiceChat = useCallback(() => {
    stoppedManuallyRef.current = true;
    awaitingAIRef.current = false;
    speakingRef.current = false;

    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }

    try {
      window.speechSynthesis?.cancel();
    } catch {
      // ignore
    }
    try {
      audioRef.current?.pause();
    } catch {
      // ignore
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = "";
    }

    setMode("idle");
  }, []);

  const retryListen = useCallback(() => {
    setTranscript("");
    setFinalTranscript("");
    setError("");
    startRecognition();
  }, [startRecognition]);

  return {
    mode,
    supported,
    muted,
    transcript,
    finalTranscript,
    responseText,
    error,
    startVoiceChat,
    endVoiceChat,
    retryListen,
    interruptSpeaking,
    stopListening,
    submitTextTurn,
    setMuted,
    setTranscript,
    setFinalTranscript,
    setResponseText,
  };
}
