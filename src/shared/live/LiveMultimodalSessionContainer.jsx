import { useEffect } from "react";
import LiveVoiceOverlay from "../live-voice/LiveVoiceOverlay.jsx";
import useLiveVoiceSession from "../live-voice/useLiveVoiceSession.js";

export default function LiveMultimodalSessionContainer({
  open,
  onClose,
  family = "ai",
  app = "public",
  language = "en-US",
  onAskAI,
  onAskVision,
}) {
  const liveVoice = useLiveVoiceSession({
    language,
    onUserTurn: async ({ text, context }) => {
      const result = await onAskAI?.({ text, context, family, app });
      if (typeof result === "string") {
        return { text: result };
      }
      return result || { text: "" };
    },
    onAskVision,
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

  return (
    <LiveVoiceOverlay
      open={liveVoice.open}
      onClose={handleClose}
      mode={liveVoice.mode}
      transcript={liveVoice.transcript}
      responseText={liveVoice.responseText}
      cameraEnabled={liveVoice.cameraEnabled}
      cameraStream={liveVoice.cameraStream}
      captures={liveVoice.captures}
      muted={liveVoice.muted}
      recordingScreen={liveVoice.recordingScreen}
      screenSharing={liveVoice.screenSharing}
      torchSupported={liveVoice.torchSupported}
      torchEnabled={liveVoice.torchEnabled}
      highlightLoading={liveVoice.highlightLoading}
      highlightedCapture={liveVoice.highlightedCapture}
      lastError={liveVoice.lastError}
      dualCameraMode={liveVoice.dualCameraMode}
      onToggleMute={liveVoice.toggleMute}
      onToggleCamera={liveVoice.toggleCamera}
      onSwitchCamera={liveVoice.switchCamera}
      onToggleTorch={liveVoice.toggleTorch}
      onToggleScreenShare={liveVoice.toggleScreenShare}
      onTakeScreenshot={liveVoice.takeScreenshot}
      onHighlightCapture={() => liveVoice.highlightLatestCapture()}
      onToggleScreenRecording={liveVoice.toggleScreenRecording}
      onInterrupt={liveVoice.interrupt}
      onRetryListen={liveVoice.retryListen}
      onStartVoice={liveVoice.startVoice}
      onEnd={handleClose}
    />
  );
}
