import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  CameraOff,
  Flame,
  FlipHorizontal2,
  Highlighter,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  Square,
  Volume2,
  Wand2,
  X,
} from "lucide-react";
import HighlightedCaptureCard from "./HighlightedCaptureCard";

export default function LiveVoiceOverlay({
  open,
  onClose,
  mode = "idle",
  transcript = "",
  responseText = "",
  cameraEnabled = false,
  cameraStream = null,
  captures = [],
  muted = false,
  recordingScreen = false,
  screenSharing = false,
  torchSupported = false,
  torchEnabled = false,
  highlightLoading = false,
  highlightedCapture = null,
  lastError = "",
  dualCameraMode = "single-camera-fallback",
  onToggleMute,
  onToggleCamera,
  onSwitchCamera,
  onToggleTorch,
  onToggleScreenShare,
  onTakeScreenshot,
  onHighlightCapture,
  onToggleScreenRecording,
  onInterrupt,
  onRetryListen,
  onStartVoice,
  onEnd,
}) {
  const videoRef = useRef(null);
  const pipVideoRef = useRef(null);
  const [selectedCaptureId, setSelectedCaptureId] = useState(null);

  useEffect(() => {
    if (!open || !cameraEnabled || !cameraStream) return;
    if (videoRef.current) videoRef.current.srcObject = cameraStream;
    if (pipVideoRef.current) pipVideoRef.current.srcObject = cameraStream;
  }, [cameraEnabled, cameraStream, open]);

  const selectedCapture = useMemo(
    () => captures.find((item) => item.id === selectedCaptureId) || captures[captures.length - 1] || null,
    [captures, selectedCaptureId]
  );

  useEffect(() => {
    if (!selectedCaptureId && captures.length > 0) {
      setSelectedCaptureId(captures[captures.length - 1].id);
    }
  }, [captures, selectedCaptureId]);

  if (!open) return null;

  const modeLabelMap = {
    idle: "Ready",
    listening: "Listening",
    thinking: "Thinking",
    speaking: "Speaking",
  };

  const modeDescriptionMap = {
    idle: "Start a natural live conversation.",
    listening: "Speak naturally. ElimuLink is listening.",
    thinking: "Preparing a response.",
    speaking: "Responding with voice.",
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#09111f] text-white">
      <div className="relative flex h-full flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 pb-2 pt-4 sm:px-6">
          <div>
            <div className="text-lg font-semibold tracking-tight">Live Voice</div>
            <div className="text-xs text-white/50">Return to chat anytime</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-11 w-11 place-items-center rounded-full bg-white/8 ring-1 ring-white/10 transition hover:bg-white/12"
            aria-label="Close live voice mode"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-4 pb-5 sm:px-6">
          <div className="flex min-h-0 flex-1 flex-col items-center justify-between gap-6">
            <div className="flex w-full min-h-0 flex-1 items-center justify-center">
              {cameraEnabled ? (
                <CameraStage
                  videoRef={videoRef}
                  pipVideoRef={pipVideoRef}
                  selectedCapture={selectedCapture}
                  dualCameraMode={dualCameraMode}
                />
              ) : (
                <VoiceStage
                  mode={mode}
                  modeLabel={modeLabelMap[mode] || "Ready"}
                  modeDescription={modeDescriptionMap[mode] || ""}
                  transcript={transcript}
                  responseText={responseText}
                  lastError={lastError}
                />
              )}
            </div>

            <div className="w-full max-w-xl shrink-0">
              <CaptureStrip
                captures={captures}
                selectedCaptureId={selectedCaptureId}
                onSelect={setSelectedCaptureId}
              />
              {highlightedCapture?.highlightedDataUrl ? (
                <div className="mb-4">
                  <HighlightedCaptureCard
                    title="AI visual guidance"
                    imageUrl={highlightedCapture.highlightedDataUrl}
                    caption="Latest highlighted screenshot from your live session."
                  />
                </div>
              ) : null}

              <ActionRow
                mode={mode}
                muted={muted}
                cameraEnabled={cameraEnabled}
                recordingScreen={recordingScreen}
                screenSharing={screenSharing}
                torchSupported={torchSupported}
                torchEnabled={torchEnabled}
                highlightLoading={highlightLoading}
                onToggleMute={onToggleMute}
                onToggleCamera={onToggleCamera}
                onSwitchCamera={onSwitchCamera}
                onToggleTorch={onToggleTorch}
                onToggleScreenShare={onToggleScreenShare}
                onTakeScreenshot={onTakeScreenshot}
                onHighlightCapture={onHighlightCapture}
                onToggleScreenRecording={onToggleScreenRecording}
                onInterrupt={onInterrupt}
                onRetryListen={onRetryListen}
                onStartVoice={onStartVoice}
                onEnd={onEnd}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function VoiceStage({
  mode,
  modeLabel,
  modeDescription,
  transcript,
  responseText,
  lastError,
}) {
  return (
    <div className="mx-auto flex min-h-[46vh] max-w-xl flex-col items-center justify-center gap-6 text-center">
      <Orb mode={mode} />

      <div className="space-y-2">
        <div className="text-3xl font-semibold tracking-tight">{modeLabel}</div>
        <div className="mx-auto max-w-md text-sm leading-6 text-white/60">
          {modeDescription}
        </div>
      </div>

      <div className="w-full max-w-lg space-y-3">
        {transcript ? <InfoCard title="You said" text={transcript} /> : null}
        {responseText ? <InfoCard title="AI response" text={responseText} /> : null}
        {lastError ? <InfoCard title="Voice status" text={lastError} subtle /> : null}
      </div>
    </div>
  );
}

function CameraStage({ videoRef, pipVideoRef, selectedCapture, dualCameraMode }) {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <div className="relative overflow-hidden rounded-[28px] bg-black ring-1 ring-white/10 shadow-2xl">
        <div className="aspect-[9/14] w-full bg-black sm:aspect-[16/10]">
          <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
        </div>

        <div className="pointer-events-none absolute left-4 top-4 rounded-full bg-black/35 px-3 py-1.5 text-xs text-white/80 backdrop-blur">
          Live camera
        </div>

        <div className="absolute bottom-4 right-4 h-24 w-16 overflow-hidden rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur sm:h-28 sm:w-20">
          <video ref={pipVideoRef} autoPlay playsInline muted className="h-full w-full object-cover opacity-80" />
        </div>

        <div className="pointer-events-none absolute bottom-4 left-4 rounded-full bg-black/35 px-3 py-1.5 text-[10px] text-white/75 backdrop-blur">
          {dualCameraMode === "single-camera-fallback" ? "PiP fallback: single active camera" : "Dual camera"}
        </div>
      </div>

      {selectedCapture ? (
        <div className="overflow-hidden rounded-3xl bg-white/6 p-3 ring-1 ring-white/10">
          <div className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-white/45">
            Selected visual context
          </div>
          <div className="flex items-center gap-3">
            <CapturePreview item={selectedCapture} className="h-20 w-20 rounded-2xl ring-1 ring-white/10" />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-white">
                {selectedCapture.title || "Captured item"}
              </div>
              <div className="mt-1 text-sm leading-6 text-white/60">
                Keep talking about this while staying in live mode.
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Orb({ mode }) {
  const glowClass =
    mode === "listening"
      ? "from-sky-500 via-cyan-400 to-teal-400"
      : mode === "thinking"
      ? "from-violet-500 via-fuchsia-500 to-sky-500"
      : mode === "speaking"
      ? "from-blue-500 via-cyan-500 to-emerald-400"
      : "from-white/20 via-white/10 to-white/5";

  const pulseClass = mode === "idle" ? "" : "animate-pulse";

  return (
    <div className="relative">
      <div className={`h-40 w-40 rounded-full bg-gradient-to-br ${glowClass} opacity-90 blur-2xl ${pulseClass}`} />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex h-28 w-28 items-center justify-center rounded-full bg-white/8 ring-1 ring-white/15 backdrop-blur">
          <div className="text-4xl">
            {mode === "listening" ? "🎙" : mode === "thinking" ? "⋯" : mode === "speaking" ? "🔊" : "◎"}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ title, text, subtle = false }) {
  return (
    <div
      className={`rounded-3xl px-4 py-3 text-left ring-1 backdrop-blur ${
        subtle ? "bg-white/[0.04] ring-white/5" : "bg-white/6 ring-white/10"
      }`}
    >
      <div className="mb-1 text-xs font-medium uppercase tracking-[0.18em] text-white/45">{title}</div>
      <div className={`text-sm leading-6 ${subtle ? "text-white/70" : "text-white/90"}`}>{text}</div>
    </div>
  );
}

function CaptureStrip({ captures, selectedCaptureId, onSelect }) {
  if (!captures.length) return null;

  return (
    <div className="mb-4">
      <div className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-white/45">Visual context</div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {captures.map((item) => {
          const active = item.id === selectedCaptureId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={`min-w-[88px] overflow-hidden rounded-2xl bg-white/6 p-2 text-left ring-1 transition ${
                active ? "ring-cyan-400/60" : "ring-white/10 hover:ring-white/20"
              }`}
            >
              <CapturePreview item={item} className="mb-2 h-16 w-full rounded-xl" />
              <div className="truncate text-xs font-medium text-white/80">{item.title || "Capture"}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CapturePreview({ item, className = "" }) {
  if (String(item?.type || "").startsWith("video")) {
    return <video src={item.previewUrl} className={`${className} object-cover`} muted playsInline />;
  }
  if (item?.previewUrl) {
    return <img src={item.previewUrl} alt={item.title || "Capture"} className={`${className} object-cover`} />;
  }
  return <div className={`${className} flex items-center justify-center bg-white/8 text-xl`}>🖼</div>;
}

function ActionRow({
  mode,
  muted,
  cameraEnabled,
  recordingScreen,
  screenSharing,
  torchSupported,
  torchEnabled,
  highlightLoading,
  onToggleMute,
  onToggleCamera,
  onSwitchCamera,
  onToggleTorch,
  onToggleScreenShare,
  onTakeScreenshot,
  onHighlightCapture,
  onToggleScreenRecording,
  onInterrupt,
  onRetryListen,
  onStartVoice,
  onEnd,
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-3">
        <IconCircle onClick={onToggleCamera} active={cameraEnabled} label={cameraEnabled ? "Camera on" : "Camera"}>
          {cameraEnabled ? <Camera size={18} /> : <CameraOff size={18} />}
        </IconCircle>
        <IconCircle onClick={onToggleScreenShare} active={screenSharing} label={screenSharing ? "Stop sharing screen" : "Share screen"}>
          <MonitorUp size={18} />
        </IconCircle>
        <IconCircle onClick={onSwitchCamera} label="Switch camera">
          <FlipHorizontal2 size={18} />
        </IconCircle>
        <IconCircle onClick={onTakeScreenshot} label="Take screenshot">
          <Wand2 size={18} />
        </IconCircle>
        <IconCircle
          onClick={onHighlightCapture}
          active={highlightLoading}
          disabled={highlightLoading}
          label={highlightLoading ? "Highlighting screenshot" : "Highlight screenshot"}
        >
          <Highlighter size={18} />
        </IconCircle>
        <IconCircle onClick={onToggleScreenRecording} active={recordingScreen} label={recordingScreen ? "Stop recording" : "Record screen"}>
          {recordingScreen ? <Square size={18} /> : <MonitorUp size={18} />}
        </IconCircle>
        <IconCircle
          onClick={onToggleTorch}
          active={torchEnabled}
          disabled={!torchSupported}
          label={torchSupported ? "Torch" : "Torch unavailable"}
        >
          <Flame size={18} />
        </IconCircle>
      </div>

      <div className="flex items-center justify-center gap-3">
        <IconCircle onClick={onToggleMute} active={!muted} label={muted ? "Unmute microphone" : "Mute microphone"}>
          {muted ? <MicOff size={18} /> : <Mic size={18} />}
        </IconCircle>

        {mode === "idle" ? (
          <BigPrimaryButton onClick={onStartVoice}>Start</BigPrimaryButton>
        ) : (
          <BigPrimaryButton onClick={onInterrupt}>
            <Volume2 size={16} />
            <span>Stop reply</span>
          </BigPrimaryButton>
        )}

        <BigDangerButton onClick={onEnd}>
          <PhoneOff size={16} />
          <span>End</span>
        </BigDangerButton>
      </div>

      <div className="flex items-center justify-center">
        <button
          type="button"
          onClick={onRetryListen}
          className="text-sm text-white/60 underline-offset-4 transition hover:text-white hover:underline"
        >
          Listen again
        </button>
      </div>
    </div>
  );
}

function IconCircle({ children, onClick, active = false, disabled = false, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`flex h-14 w-14 items-center justify-center rounded-full text-lg transition ${
        disabled
          ? "cursor-not-allowed bg-white/5 text-white/25 ring-1 ring-white/5"
          : active
          ? "bg-white text-slate-950"
          : "bg-white/8 text-white ring-1 ring-white/12 hover:bg-white/12"
      }`}
    >
      {children}
    </button>
  );
}

function BigPrimaryButton({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-7 py-4 text-sm font-semibold text-white transition hover:bg-blue-500"
    >
      {children}
    </button>
  );
}

function BigDangerButton({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full bg-white/10 px-7 py-4 text-sm font-semibold text-white ring-1 ring-white/12 transition hover:bg-white/15"
    >
      {children}
    </button>
  );
}
