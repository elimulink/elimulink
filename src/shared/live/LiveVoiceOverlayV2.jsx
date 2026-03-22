import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  ImagePlus,
  Mic,
  MicOff,
  Monitor,
  MonitorUp,
  PhoneOff,
  RotateCw,
  Square,
  Volume2,
  X,
} from "lucide-react";

export default function LiveVoiceOverlayV2({
  open,
  onClose,
  mode = "idle",
  title = "Live",
  subtitle = "Talk naturally with AI",
  transcript = "",
  responseText = "",
  cameraEnabled = false,
  cameraStream = null,
  captures = [],
  muted = false,
  recordingScreen = false,
  isSharing = false,
  shareSurface = "unknown",
  onStartScreenShare,
  onStopScreenShare,
  onToggleMute,
  onToggleCamera,
  onSwitchCamera,
  onTakePhoto,
  onTakeScreenshot,
  onToggleScreenRecording,
  onInterrupt,
  onRetryListen,
  onStartVoice,
  onEnd,
}) {
  const videoRef = useRef(null);
  const [selectedCaptureId, setSelectedCaptureId] = useState(null);

  useEffect(() => {
    if (!open || !cameraEnabled || !cameraStream || !videoRef.current) return;
    videoRef.current.srcObject = cameraStream;
  }, [open, cameraEnabled, cameraStream]);

  const selectedCapture = useMemo(
    () =>
      captures.find((capture) => capture.id === selectedCaptureId) ||
      captures[captures.length - 1] ||
      null,
    [captures, selectedCaptureId]
  );

  useEffect(() => {
    if (!selectedCaptureId && captures.length) {
      setSelectedCaptureId(captures[captures.length - 1].id);
    }
  }, [captures, selectedCaptureId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden bg-[linear-gradient(180deg,#f8fbff_0%,#eff4fb_48%,#e8eef8_100%)] text-[#111827] dark:bg-[#0b1020] dark:text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,#ffffff_0%,rgba(255,255,255,0.72)_28%,transparent_64%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18)_0%,rgba(59,130,246,0.08)_30%,transparent_72%)]" />
      <div className="relative mx-auto flex h-full max-w-7xl flex-col">
        <Header title={title} subtitle={subtitle} onClose={onClose} />

        <div className="flex min-h-0 flex-1 flex-col px-4 pb-5 pt-2 sm:px-6 lg:px-8">
          <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-4 lg:flex-row lg:gap-6">
            <div className="flex min-h-0 flex-1 flex-col">
              <MainStage
                mode={mode}
                transcript={transcript}
                responseText={responseText}
                cameraEnabled={cameraEnabled}
                videoRef={videoRef}
                isSharing={isSharing}
                shareSurface={shareSurface}
              />
            </div>

            {captures.length > 0 ? (
              <aside className="w-full lg:max-w-sm">
                <CapturePanel
                  captures={captures}
                  selectedCaptureId={selectedCaptureId}
                  onSelect={setSelectedCaptureId}
                  selectedCapture={selectedCapture}
                />
              </aside>
            ) : null}
          </div>

          <BottomControls
            mode={mode}
            muted={muted}
            cameraEnabled={cameraEnabled}
            recordingScreen={recordingScreen}
            isSharing={isSharing}
            onStartScreenShare={onStartScreenShare}
            onStopScreenShare={onStopScreenShare}
            onToggleMute={onToggleMute}
            onToggleCamera={onToggleCamera}
            onSwitchCamera={onSwitchCamera}
            onTakePhoto={onTakePhoto}
            onTakeScreenshot={onTakeScreenshot}
            onToggleScreenRecording={onToggleScreenRecording}
            onInterrupt={onInterrupt}
            onRetryListen={onRetryListen}
            onStartVoice={onStartVoice}
            onEnd={onEnd}
          />
        </div>
      </div>
    </div>
  );
}

function Header({ title, subtitle, onClose }) {
  return (
    <div className="flex items-center justify-between px-4 pb-2 pt-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-black/8 bg-white/80 text-[#2563eb] shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/12 dark:bg-white/8 dark:text-white dark:shadow-[0_10px_28px_rgba(0,0,0,0.28)]">
          <Volume2 size={18} />
        </div>
        <div>
          <div className="text-xl font-semibold tracking-tight">{title}</div>
          <div className="text-xs text-black/50 dark:text-white/55">{subtitle}</div>
        </div>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="flex h-12 w-12 items-center justify-center rounded-full border border-black/8 bg-white/80 text-[#111827] shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-xl transition hover:bg-white dark:border-white/12 dark:bg-white/8 dark:text-white dark:shadow-[0_10px_28px_rgba(0,0,0,0.28)]"
        aria-label="Close live mode"
      >
        <X size={18} />
      </button>
    </div>
  );
}

function MainStage({ mode, transcript, responseText, cameraEnabled, videoRef, isSharing, shareSurface }) {
  if (cameraEnabled) {
    return (
      <div className="relative flex min-h-[44vh] flex-1 flex-col overflow-hidden rounded-[40px] border border-black/8 bg-[#0a0f1d] shadow-[0_24px_80px_rgba(15,23,42,0.22)] dark:border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(96,165,250,0.42)_0%,rgba(59,130,246,0.18)_26%,rgba(59,130,246,0.08)_44%,transparent_72%)]" />
        <div className="relative flex-1 overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover opacity-95"
          />
          <div className="absolute left-4 top-4 rounded-full bg-black/35 px-3 py-1.5 text-xs text-white backdrop-blur">
            Live camera
          </div>
          {isSharing ? (
            <div className="absolute right-4 top-4 rounded-full border border-emerald-300/20 bg-emerald-500/15 px-3 py-1.5 text-xs text-emerald-100 backdrop-blur">
              {getShareSurfaceLabel(shareSurface)}
            </div>
          ) : null}
          <div className="absolute bottom-4 right-4 hidden h-24 w-16 rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur md:block md:h-28 md:w-20" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-[44vh] flex-1 flex-col items-center justify-center overflow-hidden rounded-[40px] border border-black/8 bg-[#0a0f1d] px-6 py-10 text-center shadow-[0_24px_80px_rgba(15,23,42,0.22)] dark:border-white/10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(96,165,250,0.42)_0%,rgba(59,130,246,0.18)_26%,rgba(59,130,246,0.08)_44%,transparent_72%)]" />
      {isSharing ? (
        <div className="absolute right-4 top-4 rounded-full border border-emerald-300/20 bg-emerald-500/15 px-3 py-1.5 text-xs text-emerald-100 backdrop-blur">
          {getShareSurfaceLabel(shareSurface)}
        </div>
      ) : null}

      <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center gap-6">
        <StatusOrb mode={mode} />
        <div className="text-4xl font-light tracking-tight text-white/85 md:text-6xl">
          {mode === "idle" && "Start talking"}
          {mode === "listening" && "Listening"}
          {mode === "thinking" && "Thinking"}
          {mode === "speaking" && "Speaking"}
        </div>

        {transcript ? <TextPill label="You said" text={transcript} /> : null}
        {responseText ? <TextPill label="AI response" text={responseText} /> : null}
      </div>
    </div>
  );
}

function StatusOrb({ mode }) {
  const pulse =
    mode === "idle"
      ? "scale-100"
      : mode === "listening"
      ? "scale-110"
      : mode === "thinking"
      ? "scale-105"
      : "scale-110";

  return (
    <div className="relative flex h-32 w-32 items-center justify-center md:h-36 md:w-36">
      <div
        className={`absolute h-32 w-32 rounded-full bg-[radial-gradient(circle,#60a5fa_0%,#3b82f6_32%,rgba(59,130,246,0.18)_60%,transparent_75%)] blur-2xl transition duration-500 md:h-36 md:w-36 ${pulse}`}
      />
      <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/15 backdrop-blur md:h-24 md:w-24">
        {mode === "idle" && <Volume2 size={24} />}
        {mode === "listening" && <Mic size={24} />}
        {mode === "thinking" && <div className="text-3xl leading-none">...</div>}
        {mode === "speaking" && <Volume2 size={24} />}
      </div>
    </div>
  );
}

function TextPill({ label, text }) {
  return (
    <div className="w-full max-w-xl rounded-3xl bg-white/10 px-4 py-3 text-left text-white ring-1 ring-white/10 backdrop-blur">
      <div className="mb-1 text-[11px] uppercase tracking-[0.2em] text-white/50">
        {label}
      </div>
      <div className="text-sm leading-6 text-white/90">{text}</div>
    </div>
  );
}

function CapturePanel({ captures, selectedCaptureId, onSelect, selectedCapture }) {
  return (
    <div className="h-full rounded-[32px] border border-black/8 bg-white/88 p-3 shadow-[0_18px_50px_rgba(15,23,42,0.10)] backdrop-blur-xl dark:border-white/10 dark:bg-white/6">
      <div className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-black/45 dark:text-white/45">
        Visual context
      </div>

      <div className="mb-4 flex gap-3 overflow-x-auto pb-1 lg:max-h-[220px] lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden">
        {captures.map((item) => {
          const active = item.id === selectedCaptureId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={`min-w-[92px] overflow-hidden rounded-2xl p-2 text-left ring-1 transition ${
                active
                  ? "bg-blue-50 ring-blue-300 dark:bg-white/10 dark:ring-cyan-400/60"
                  : "bg-black/[0.03] ring-black/5 dark:bg-white/5 dark:ring-white/10"
              }`}
            >
              {item.previewUrl ? (
                <img
                  src={item.previewUrl}
                  alt={item.title || "Capture"}
                  className="mb-2 h-16 w-full rounded-xl object-cover"
                />
              ) : (
                <div className="mb-2 flex h-16 w-full items-center justify-center rounded-xl bg-black/[0.04] text-xl dark:bg-white/8">
                  <ImagePlus size={18} />
                </div>
              )}
              <div className="truncate text-xs font-medium text-black/75 dark:text-white/80">
                {item.title || "Capture"}
              </div>
            </button>
          );
        })}
      </div>

      {selectedCapture ? (
        <div className="rounded-3xl bg-black/[0.03] p-3 ring-1 ring-black/5 dark:bg-white/5 dark:ring-white/10">
          <div className="mb-2 text-sm font-semibold text-black/80 dark:text-white">
            {selectedCapture.title || "Selected capture"}
          </div>
          {selectedCapture.previewUrl ? (
            <img
              src={selectedCapture.previewUrl}
              alt={selectedCapture.title || "Selected capture"}
              className="w-full rounded-2xl object-contain"
            />
          ) : (
            <div className="rounded-2xl bg-black/[0.04] p-6 text-sm text-black/55 dark:bg-white/6 dark:text-white/60">
              No preview available.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function BottomControls({
  mode,
  muted,
  cameraEnabled,
  recordingScreen,
  isSharing,
  onStartScreenShare,
  onStopScreenShare,
  onToggleMute,
  onToggleCamera,
  onSwitchCamera,
  onTakePhoto,
  onTakeScreenshot,
  onToggleScreenRecording,
  onInterrupt,
  onRetryListen,
  onStartVoice,
  onEnd,
}) {
  return (
    <div className="mt-4 flex flex-col gap-3 md:mt-5 md:gap-4">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-center gap-3 overflow-x-auto rounded-[34px] border border-black/8 bg-white/88 px-3 py-3 shadow-[0_18px_50px_rgba(15,23,42,0.10)] backdrop-blur-xl dark:border-white/10 dark:bg-white/6">
        <IconButton
          label={isSharing ? "Sharing" : "Share"}
          active={isSharing}
          onClick={isSharing ? onStopScreenShare : onStartScreenShare}
          icon={<MonitorUp size={18} />}
        />
        <IconButton
          label="Camera"
          active={cameraEnabled}
          onClick={onToggleCamera}
          icon={<Camera size={18} />}
        />
        <IconButton label="Switch" onClick={onSwitchCamera} icon={<RotateCw size={18} />} />
        <IconButton label="Photo" onClick={onTakePhoto} icon={<ImagePlus size={18} />} />
        <IconButton
          label="Screenshot"
          onClick={onTakeScreenshot}
          icon={<Monitor size={18} />}
        />
        <IconButton
          label="Record"
          active={recordingScreen}
          onClick={onToggleScreenRecording}
          icon={<Square size={18} />}
        />
        <IconButton
          label="Mic"
          active={!muted}
          onClick={onToggleMute}
          icon={muted ? <MicOff size={18} /> : <Mic size={18} />}
        />
      </div>

      <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-center gap-2.5 sm:gap-3">
        {mode === "idle" ? (
          <PrimaryAction onClick={onStartVoice}>Start</PrimaryAction>
        ) : (
          <PrimaryAction onClick={onInterrupt}>Stop reply</PrimaryAction>
        )}

        <SecondaryAction onClick={onRetryListen}>Listen again</SecondaryAction>
        <DangerAction onClick={onEnd}>End</DangerAction>
      </div>
    </div>
  );
}

function IconButton({ icon, label, active = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[64px] flex-col items-center justify-center rounded-[22px] px-2 py-2.5 text-center transition ${
        active
          ? "bg-blue-600 text-white shadow-[0_8px_24px_rgba(59,130,246,0.35)]"
          : "bg-black/[0.04] text-[#111827] ring-1 ring-black/5 hover:bg-black/[0.07] dark:bg-white/8 dark:text-white dark:ring-white/10 dark:hover:bg-white/12"
      }`}
      title={label}
      aria-label={label}
    >
      <span className="text-lg">{icon}</span>
      <span className="mt-1 text-[10px] font-medium leading-tight">{label}</span>
    </button>
  );
}

function PrimaryAction({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full bg-blue-600 px-7 py-3.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(59,130,246,0.35)] transition hover:bg-blue-500 sm:px-8 sm:py-4"
    >
      {children}
    </button>
  );
}

function SecondaryAction({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full bg-black/[0.04] px-6 py-3.5 text-sm font-semibold text-[#111827] ring-1 ring-black/5 transition hover:bg-black/[0.07] dark:bg-white/8 dark:text-white dark:ring-white/10 dark:hover:bg-white/12 sm:px-7 sm:py-4"
    >
      {children}
    </button>
  );
}

function DangerAction({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full bg-red-500 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-red-400 sm:px-8 sm:py-4"
    >
      <PhoneOff size={16} />
      {children}
    </button>
  );
}

function getShareSurfaceLabel(surface) {
  if (surface === "monitor") return "Entire screen sharing";
  if (surface === "window") return "App/window sharing";
  if (surface === "browser") return "Tab/app sharing";
  return "Screen sharing active";
}
