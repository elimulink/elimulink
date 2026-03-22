import React, { useEffect, useMemo } from "react";
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

  const liveVoice = useLiveVoiceSession({
    language,
    settingsUid,
    onAskVision: async ({ imageDataUrl, prompt }) =>
      analyzeVisualContext({ imageDataUrl, prompt, family, app }),
    onUserTurn: async ({ text, context }) => {
      const result = await onAskAI?.({ text, context, family, app });
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

  const handleClose = () => {
    liveVoice.endSession();
    onClose?.();
  };

  const handleTakePhoto = async () => {
    const capture = await liveVoice.takePhoto();
    if (!capture) return;
    await liveVoice.highlightLatestCapture("Analyze this camera image and highlight the important area.");
  };

  const handleTakeScreenshot = async () => {
    const capture = await liveVoice.takeScreenshot();
    if (!capture) return;
    await liveVoice.highlightLatestCapture("Analyze this screen and show the user what to tap next.");
  };

  return (
    <>
      <ScreenShareIndicator
        isSharing={liveVoice.screenSharing}
        shareSurface={liveVoice.shareSurface}
        onStop={liveVoice.stopScreenShare}
      />
      {liveVoice.lastError ? (
        <div className="fixed left-4 right-4 top-20 z-[120] mx-auto max-w-xl rounded-2xl border border-red-300/40 bg-red-500/95 px-4 py-3 text-sm text-white shadow-lg">
          {liveVoice.lastError}
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
        onStartScreenShare={liveVoice.startScreenShare}
        onStopScreenShare={liveVoice.stopScreenShare}
        onToggleMute={liveVoice.toggleMute}
        onToggleCamera={liveVoice.toggleCamera}
        onSwitchCamera={liveVoice.switchCamera}
        onTakePhoto={handleTakePhoto}
        onTakeScreenshot={handleTakeScreenshot}
        onToggleScreenRecording={liveVoice.toggleScreenRecording}
        onInterrupt={liveVoice.interrupt}
        onRetryListen={liveVoice.retryListen}
        onStartVoice={liveVoice.startVoice}
        onEnd={handleClose}
      />
    </>
  );
}
