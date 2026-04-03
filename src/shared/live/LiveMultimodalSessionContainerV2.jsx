import React, { useEffect, useMemo, useRef, useState } from "react";
import LiveVoiceOverlayV2 from "./LiveVoiceOverlayV2.jsx";
import ScreenShareIndicator from "./ScreenShareIndicator.jsx";
import RecordingPreviewCard from "./RecordingPreviewCard.jsx";
import useLiveVoiceSession from "../live-voice/useLiveVoiceSession.js";
import { loadVoiceSettings } from "../audio/voiceSettings";
import { analyzeVisualContext } from "../../lib/visionApi.js";

export default function LiveMultimodalSessionContainerV2({
  open,
  onClose,
  family,
  app,
  language = "en-US",
  onAskAI,
  title,
  subtitle,
  settingsUid = null,
}) {
  const liveCopy = useMemo(() => {
    const defaults = {
      institution: {
        title: "Institution Live",
        subtitle: "Talk through learning, coursework, and campus tasks with AI.",
      },
      student: {
        title: "Study Live",
        subtitle: "Talk naturally with AI about revision, notes, and assignments.",
      },
      public: {
        title: "Live AI",
        subtitle: "Talk naturally with AI in a simple live conversation.",
      },
    };
    const fallback = defaults[app] || defaults.public;
    return {
      title: title || fallback.title,
      subtitle: subtitle || fallback.subtitle,
    };
  }, [app, subtitle, title]);

  const voiceSettings = useMemo(() => loadVoiceSettings(settingsUid), [settingsUid]);
  const [toastMessage, setToastMessage] = useState("");
  const [textOverlayOpen, setTextOverlayOpen] = useState(false);
  const [backendSceneHints, setBackendSceneHints] = useState([]);
  const askAIRef = useRef(onAskAI);
  const photoUploadInputRef = useRef(null);
  const hintRequestKeyRef = useRef("");

  useEffect(() => {
    askAIRef.current = onAskAI;
  }, [onAskAI]);

  const liveVoice = useLiveVoiceSession({
    language,
    settingsUid,
    onAskVision: async ({ imageDataUrl, prompt }) =>
      analyzeVisualContext({ imageDataUrl, prompt, family, app }),
    onUserTurn: async ({ text, context }) => {
      const result = await askAIRef.current?.({ text, context, family, app });
      if (typeof result === "string") return { text: result };
      return result || { text: "I heard you." };
    },
  });

  useEffect(() => {
    if (open && !liveVoice.open) {
      liveVoice.openSession();
      return;
    }
    if (!open && liveVoice.open) {
      liveVoice.endSession();
    }
  }, [liveVoice.endSession, liveVoice.open, liveVoice.openSession, open]);

  useEffect(() => {
    if (!liveVoice.lastError) return undefined;

    const nextMessage = normalizeLiveMessage(liveVoice.lastError, {
      screenShareSupported: liveVoice.screenShareSupported,
      screenRecordingSupported: liveVoice.screenRecordingSupported,
      mobileBrowserRuntime: liveVoice.mobileBrowserRuntime,
    });

    setToastMessage(nextMessage);

    const timeoutId = window.setTimeout(() => {
      setToastMessage("");
    }, 3600);

    return () => window.clearTimeout(timeoutId);
  }, [
    liveVoice.lastError,
    liveVoice.mobileBrowserRuntime,
    liveVoice.screenRecordingSupported,
    liveVoice.screenShareSupported,
  ]);

  const handleClose = () => {
    setTextOverlayOpen(false);
    liveVoice.endSession();
    onClose?.();
  };

  const handleTakePhoto = async () => {
    const capture = await liveVoice.takePhoto();
    if (!capture) return;
    await liveVoice.highlightLatestCapture("Analyze this camera image and highlight the important area.");
  };

  const handleUploadPhoto = () => {
    photoUploadInputRef.current?.click();
  };

  const handlePhotoFileSelect = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const capture = await liveVoice.uploadPhoto?.(file);
    if (!capture) return;
    const guidedCapture = await liveVoice.highlightLatestCapture(
      "Analyze this uploaded photo and point out the most important details."
    );
    const visualSummary = String(guidedCapture?.answer || "").trim();
    await liveVoice.submitTextMessage?.(
      visualSummary
        ? `Explain this uploaded photo clearly and tell me what to focus on. Vision summary: ${visualSummary}`
        : `Explain this uploaded photo clearly, mention important visible details, and tell me what to focus on: ${capture.title || "Uploaded photo"}`
    );
  };

  const handleTakeScreenshot = async () => {
    const capture = await liveVoice.takeScreenshot();
    if (!capture) return;
    await liveVoice.highlightLatestCapture("Analyze this screen and show the user what to tap next.");
  };

  const cameraActive = liveVoice.cameraEnabled;

  const latestGuidedCapture = useMemo(() => {
    const reversed = [...(liveVoice.captures || [])].reverse();
    return (
      reversed.find((item) => Array.isArray(item?.highlights) && item.highlights.length) || null
    );
  }, [liveVoice.captures]);

  const liveVisionHints = useMemo(() => {
    if (!cameraActive) return [];
    const answer = String(latestGuidedCapture?.answer || "").trim();
    return answer ? [{ id: "vision-answer", label: answer }] : [];
  }, [cameraActive, latestGuidedCapture]);

  const fallbackSceneHints = useMemo(() => {
    if (!cameraActive) return [];
    return [
      { id: "hint_laptop", label: "I can see a laptop" },
      { id: "hint_books", label: "I can see books" },
      { id: "hint_screen", label: "I can see a screen" },
      { id: "hint_explain", label: "Explain this screen" },
      { id: "hint_object", label: "What is this object?" },
    ];
  }, [cameraActive]);

  useEffect(() => {
    if (!open || app !== "institution" || !cameraActive || textOverlayOpen || liveVoice.mode !== "idle") {
      setBackendSceneHints([]);
      hintRequestKeyRef.current = "";
      return;
    }

    if (liveVoice.transcript || liveVoice.responseText || liveVisionHints.length) {
      setBackendSceneHints([]);
      hintRequestKeyRef.current = "";
      return;
    }

    const recentCaptureKey = liveVoice.captures
      .slice(-2)
      .map((item) => `${item.type}:${item.title}:${item.answer || ""}`)
      .join("|");
    const requestKey = `${liveVoice.cameraFacingMode}:${recentCaptureKey}`;
    if (hintRequestKeyRef.current === requestKey && backendSceneHints.length) {
      return;
    }
    hintRequestKeyRef.current = requestKey;

    let ignore = false;
    const timeoutId = window.setTimeout(async () => {
      try {
        const result = await askAIRef.current?.({
          text:
            "Generate 4 short, natural live-camera suggestion chips for a student using AI vision right now. Return one suggestion per line only, no numbering, each under 6 words.",
          context: {
            mode: "live-scene-suggestions",
            cameraEnabled: liveVoice.cameraEnabled,
            cameraFacingMode: liveVoice.cameraFacingMode,
            captures: liveVoice.captures.slice(-3).map((item) => ({
              type: item.type,
              title: item.title,
              answer: item.answer || "",
            })),
          },
          family,
          app,
        });
        if (ignore) return;
        const lines = String(result?.text || result || "")
          .split(/\r?\n/)
          .map((line) => line.replace(/^[\s\d\-•.)]+/, "").trim())
          .filter((line) => line && line.length <= 52)
          .slice(0, 4);
        setBackendSceneHints(lines.map((label, index) => ({ id: `ai-hint-${index}-${label}`, label })));
      } catch {
        if (!ignore) setBackendSceneHints([]);
      }
    }, 450);

    return () => {
      ignore = true;
      window.clearTimeout(timeoutId);
    };
  }, [
    app,
    cameraActive,
    family,
    liveVisionHints.length,
    backendSceneHints.length,
    liveVoice.cameraEnabled,
    liveVoice.cameraFacingMode,
    liveVoice.captures,
    liveVoice.mode,
    liveVoice.responseText,
    liveVoice.transcript,
    open,
    textOverlayOpen,
  ]);

  const sceneHints = liveVisionHints.length
    ? liveVisionHints
    : backendSceneHints.length
    ? backendSceneHints
    : fallbackSceneHints;

  const liveGuidanceHighlights = useMemo(
    () => normalizeGuidanceHighlights(latestGuidedCapture),
    [latestGuidedCapture]
  );

  async function handleSendTextOverlay(text) {
    if (!text?.trim()) return;
    await liveVoice.submitTextMessage?.(text.trim());
  }

  async function handleSelectSceneHint(hint) {
    if (!hint?.label) return;
    await liveVoice.submitTextMessage?.(hint.label);
  }

  return (
    <>
      <ScreenShareIndicator
        isSharing={liveVoice.screenSharing}
        shareSurface={liveVoice.shareSurface}
        onStop={liveVoice.stopScreenShare}
      />
      {toastMessage ? (
        <div className="fixed left-4 right-4 top-20 z-[120] mx-auto max-w-sm rounded-2xl border border-white/10 bg-[#131c30]/88 px-4 py-3 text-sm text-white/90 shadow-[0_18px_40px_rgba(2,6,23,0.38)] backdrop-blur-xl">
          {toastMessage}
        </div>
      ) : null}
      {liveVoice.recordedUrl ? (
        <div className="fixed bottom-4 left-4 right-4 z-[115] mx-auto max-w-xl">
          <RecordingPreviewCard
            videoUrl={liveVoice.recordedUrl}
            onDownload={() =>
              liveVoice.downloadRecording("elimulink-live-recording.webm")
            }
            onClear={liveVoice.clearRecording}
          />
        </div>
      ) : null}
      <input
        ref={photoUploadInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoFileSelect}
      />
      <LiveVoiceOverlayV2
        open={liveVoice.open}
        onClose={handleClose}
        mode={liveVoice.mode}
        title={liveCopy.title}
        subtitle={liveCopy.subtitle}
        transcript={voiceSettings.captionsEnabled ? liveVoice.transcript : ""}
        responseText={voiceSettings.captionsEnabled ? liveVoice.responseText : ""}
        cameraEnabled={liveVoice.cameraEnabled}
        cameraStream={liveVoice.cameraStream}
        captures={liveVoice.captures}
        muted={liveVoice.muted}
        recordingScreen={liveVoice.recordingScreen}
        isSharing={liveVoice.screenSharing}
        shareSurface={liveVoice.shareSurface}
        screenShareSupported={liveVoice.screenShareSupported}
        screenRecordingSupported={liveVoice.screenRecordingSupported}
        cameraFacingMode={liveVoice.cameraFacingMode}
        onStartScreenShare={liveVoice.startScreenShare}
        onStopScreenShare={liveVoice.stopScreenShare}
        onToggleMute={liveVoice.toggleMute}
        onPrimaryMic={liveVoice.togglePrimaryTalk}
        onToggleCamera={liveVoice.toggleCamera}
        onSwitchCamera={liveVoice.switchCamera}
        onTakePhoto={handleTakePhoto}
        onUploadPhoto={handleUploadPhoto}
        onTakeScreenshot={handleTakeScreenshot}
        onToggleScreenRecording={liveVoice.toggleScreenRecording}
        onSubmitTextMessage={liveVoice.submitTextMessage}
        sceneHints={sceneHints}
        onSelectSceneHint={handleSelectSceneHint}
        textOverlayOpen={textOverlayOpen}
        onOpenTextOverlay={() => setTextOverlayOpen(true)}
        onCloseTextOverlay={() => setTextOverlayOpen(false)}
        onSendTextOverlay={handleSendTextOverlay}
        guidanceHighlights={liveGuidanceHighlights}
        cameraModeActive={cameraActive}
        appMode={app}
        onInterrupt={liveVoice.interrupt}
        onRetryListen={liveVoice.retryListen}
        onStartVoice={liveVoice.startVoice}
        onEnd={handleClose}
      />
    </>
  );
}

function normalizeLiveMessage(message, support) {
  const raw = `${message || ""}`.trim();

  if (
    raw === "Screen capture is not supported on this device/browser." ||
    raw === "Screen capture is not supported on this device/browser"
  ) {
    if (support.mobileBrowserRuntime && !support.screenShareSupported) {
      return "Screen share isn't available in this mobile browser.";
    }
    return "This browser doesn't support screen sharing.";
  }

  if (raw.includes("No active shared screen")) {
    return "Start sharing your screen first.";
  }

  if (raw.includes("Speech recognition is not supported")) {
    return "Voice input isn't available in this browser.";
  }

  return raw;
}

function normalizeGuidanceHighlights(capture) {
  const highlights = Array.isArray(capture?.highlights) ? capture.highlights : [];
  const width = Number(capture?.width || 0);
  const height = Number(capture?.height || 0);

  if (!highlights.length || width <= 0 || height <= 0) return [];

  return highlights
    .map((item, index) => {
      const label = String(item?.label || "").trim();

      if (item?.type === "circle") {
        const radius = Number(item?.radius ?? Math.max(item?.width || 0, item?.height || 0) / 2);
        const diameter = radius * 2;
        return {
          id: item?.id || `guide-${index}`,
          shape: "circle",
          x: clampPercent(((Number(item?.x || 0) - radius) / width) * 100),
          y: clampPercent(((Number(item?.y || 0) - radius) / height) * 100),
          width: clampPercent((diameter / width) * 100),
          height: clampPercent((diameter / height) * 100),
          label,
        };
      }

      return {
        id: item?.id || `guide-${index}`,
        shape: item?.type === "spotlight" ? "spotlight" : "rect",
        x: clampPercent((Number(item?.x || 0) / width) * 100),
        y: clampPercent((Number(item?.y || 0) / height) * 100),
        width: clampPercent((Number(item?.width || 0) / width) * 100),
        height: clampPercent((Number(item?.height || 0) / height) * 100),
        label,
      };
    })
    .filter((item) => item.width > 0 && item.height > 0);
}

function clampPercent(value) {
  const next = Number(value || 0);
  if (!Number.isFinite(next)) return 0;
  return Math.max(0, Math.min(100, next));
}
