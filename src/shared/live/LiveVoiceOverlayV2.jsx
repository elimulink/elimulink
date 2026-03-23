import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  ImagePlus,
  Keyboard,
  Mic,
  Monitor,
  MonitorUp,
  PhoneOff,
  RotateCw,
  Send,
  Square,
  Volume2,
  VolumeX,
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
  screenShareSupported = true,
  screenRecordingSupported = true,
  onStartScreenShare,
  onStopScreenShare,
  onToggleMute,
  onPrimaryMic,
  onToggleCamera,
  onSwitchCamera,
  onTakePhoto,
  onTakeScreenshot,
  onToggleScreenRecording,
  onSubmitTextMessage,
  onInterrupt,
  onRetryListen,
  onStartVoice,
  onEnd,
}) {
  const videoRef = useRef(null);
  const [selectedCaptureId, setSelectedCaptureId] = useState(null);
  const [textComposerOpen, setTextComposerOpen] = useState(false);
  const [textDraft, setTextDraft] = useState("");
  const [sendingText, setSendingText] = useState(false);

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

  const handleSubmitText = async () => {
    const normalized = textDraft.trim();
    if (!normalized || sendingText) return;

    try {
      setSendingText(true);
      await onSubmitTextMessage?.(normalized);
      setTextDraft("");
      setTextComposerOpen(false);
    } finally {
      setSendingText(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden bg-[#04070f] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(96,165,250,0.24)_0%,rgba(59,130,246,0.12)_22%,rgba(59,130,246,0.04)_42%,transparent_72%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.96)_0%,rgba(2,6,23,0.18)_24%,rgba(2,6,23,0.12)_64%,rgba(2,6,23,0.88)_100%)]" />

      <div className="relative flex h-full flex-col lg:mx-auto lg:max-w-7xl">
        <Header
          title={title}
          subtitle={subtitle}
          muted={muted}
          onToggleMute={onToggleMute}
          onClose={onClose}
        />

        <div className="flex min-h-0 flex-1 flex-col lg:px-8 lg:pb-5 lg:pt-2">
          <div className="relative mx-auto flex min-h-0 w-full flex-1 flex-col lg:max-w-6xl lg:flex-row lg:gap-6">
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
              <aside className="hidden w-full lg:block lg:max-w-sm">
                <CapturePanel
                  captures={captures}
                  selectedCaptureId={selectedCaptureId}
                  onSelect={setSelectedCaptureId}
                  selectedCapture={selectedCapture}
                />
              </aside>
            ) : null}

            <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center lg:hidden">
              <div className="pointer-events-auto">
                <MobileUtilityStack
                  cameraEnabled={cameraEnabled}
                  recordingScreen={recordingScreen}
                  isSharing={isSharing}
                  screenShareSupported={screenShareSupported}
                  screenRecordingSupported={screenRecordingSupported}
                  onStartScreenShare={onStartScreenShare}
                  onStopScreenShare={onStopScreenShare}
                  onToggleCamera={onToggleCamera}
                  onSwitchCamera={onSwitchCamera}
                  onTakePhoto={onTakePhoto}
                  onTakeScreenshot={onTakeScreenshot}
                  onToggleScreenRecording={onToggleScreenRecording}
                />
              </div>
            </div>

            {captures.length > 0 ? (
              <div className="absolute bottom-40 left-4 right-24 md:hidden">
                <MobileCaptureRail
                  captures={captures}
                  selectedCaptureId={selectedCaptureId}
                  onSelect={setSelectedCaptureId}
                />
              </div>
            ) : null}
          </div>

          <BottomControls
            mode={mode}
            textComposerOpen={textComposerOpen}
            textDraft={textDraft}
            sendingText={sendingText}
            setTextComposerOpen={setTextComposerOpen}
            setTextDraft={setTextDraft}
            onSubmitText={handleSubmitText}
            onPrimaryMic={onPrimaryMic || onStartVoice}
            onInterrupt={onInterrupt}
            onRetryListen={onRetryListen}
            onEnd={onEnd}
            cameraEnabled={cameraEnabled}
            recordingScreen={recordingScreen}
            isSharing={isSharing}
            screenShareSupported={screenShareSupported}
            screenRecordingSupported={screenRecordingSupported}
            onStartScreenShare={onStartScreenShare}
            onStopScreenShare={onStopScreenShare}
            onToggleCamera={onToggleCamera}
            onSwitchCamera={onSwitchCamera}
            onTakePhoto={onTakePhoto}
            onTakeScreenshot={onTakeScreenshot}
            onToggleScreenRecording={onToggleScreenRecording}
          />
        </div>
      </div>
    </div>
  );
}

function Header({ title, subtitle, muted, onToggleMute, onClose }) {
  return (
    <div className="absolute inset-x-0 top-0 z-20 flex items-start justify-between px-4 pb-2 pt-4 sm:px-6 lg:static lg:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleMute}
          className={`flex h-11 w-11 items-center justify-center rounded-full backdrop-blur-xl transition ${
            muted
              ? "bg-white/14 text-white ring-1 ring-white/12"
              : "bg-black/28 text-white shadow-[0_10px_30px_rgba(0,0,0,0.28)] ring-1 ring-white/8"
          }`}
          aria-label={muted ? "Turn AI voice back on" : "Mute AI voice replies"}
          title={muted ? "AI voice off" : "AI voice on"}
        >
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
        <div className="rounded-full bg-black/20 px-4 py-2.5 backdrop-blur-xl ring-1 ring-white/8">
          <div className="text-base font-semibold tracking-tight sm:text-xl">{title}</div>
          <div className="max-w-[220px] text-[11px] text-white/55 sm:max-w-none sm:text-xs">
            {subtitle}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white shadow-[0_10px_30px_rgba(0,0,0,0.28)] ring-1 ring-white/10 backdrop-blur-xl transition hover:bg-white/14"
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
      <div className="relative flex min-h-screen flex-1 flex-col overflow-hidden bg-black lg:min-h-[44vh] lg:rounded-[40px] lg:bg-[#0a0f1d] lg:ring-1 lg:ring-white/10 lg:shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
        <div className="relative flex-1 overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
          />
          <div className="absolute left-4 top-20 rounded-full bg-black/32 px-3 py-1.5 text-xs text-white/88 backdrop-blur lg:top-4">
            Live camera
          </div>
          {isSharing ? (
            <div className="absolute left-4 top-32 rounded-full bg-emerald-500/16 px-3 py-1.5 text-xs text-emerald-100 backdrop-blur ring-1 ring-emerald-300/16 lg:left-auto lg:right-4 lg:top-4">
              {getShareSurfaceLabel(shareSurface)}
            </div>
          ) : null}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-[linear-gradient(180deg,transparent_0%,rgba(2,6,23,0.14)_20%,rgba(2,6,23,0.92)_100%)]" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-1 flex-col items-center justify-center overflow-hidden bg-[#04070f] px-6 py-10 text-center lg:min-h-[44vh] lg:rounded-[40px] lg:bg-[#0a0f1d] lg:ring-1 lg:ring-white/10 lg:shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(96,165,250,0.25)_0%,rgba(59,130,246,0.13)_24%,rgba(59,130,246,0.05)_44%,transparent_72%)]" />
      {isSharing ? (
        <div className="absolute left-4 top-32 rounded-full bg-emerald-500/16 px-3 py-1.5 text-xs text-emerald-100 backdrop-blur ring-1 ring-emerald-300/16 lg:left-auto lg:right-4 lg:top-4">
          {getShareSurfaceLabel(shareSurface)}
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-[linear-gradient(180deg,transparent_0%,rgba(2,6,23,0.14)_20%,rgba(2,6,23,0.92)_100%)]" />

      <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center gap-5 sm:gap-6">
        <StatusOrb mode={mode} />
        <div className="text-5xl font-light tracking-tight text-white/92 md:text-6xl">
          {mode === "idle" && "Ready"}
          {mode === "listening" && "Listening"}
          {mode === "thinking" && "Thinking"}
          {mode === "speaking" && "Speaking"}
        </div>

        {transcript ? <TextPill label="You" text={transcript} /> : null}
        {responseText ? <TextPill label="AI" text={responseText} /> : null}
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
        <Mic size={24} />
      </div>
    </div>
  );
}

function TextPill({ label, text }) {
  return (
    <div className="w-full max-w-xl rounded-3xl bg-white/8 px-4 py-3 text-left text-white/92 backdrop-blur md:ring-1 md:ring-white/10">
      <div className="mb-1 text-[11px] uppercase tracking-[0.2em] text-white/50">{label}</div>
      <div className="text-sm leading-6 text-white/90">{text}</div>
    </div>
  );
}

function CapturePanel({ captures, selectedCaptureId, onSelect, selectedCapture }) {
  return (
    <div className="h-full rounded-[32px] bg-white/88 p-3 shadow-[0_18px_50px_rgba(15,23,42,0.10)] backdrop-blur-xl ring-1 ring-black/8 dark:bg-white/6 dark:ring-white/10">
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
  textComposerOpen,
  textDraft,
  sendingText,
  setTextComposerOpen,
  setTextDraft,
  onSubmitText,
  onPrimaryMic,
  onInterrupt,
  onRetryListen,
  onEnd,
  cameraEnabled,
  recordingScreen,
  isSharing,
  screenShareSupported,
  screenRecordingSupported,
  onStartScreenShare,
  onStopScreenShare,
  onToggleCamera,
  onSwitchCamera,
  onTakePhoto,
  onTakeScreenshot,
  onToggleScreenRecording,
}) {
  const showStopReply = mode === "speaking";
  const showListenAgain = mode !== "listening";
  const micLabel =
    mode === "listening"
      ? "Stop"
      : mode === "thinking"
      ? "Thinking"
      : mode === "speaking"
      ? "Replying"
      : "Talk";

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col gap-3 px-4 pb-[max(16px,env(safe-area-inset-bottom))] lg:static lg:mt-5 lg:flex-col lg:gap-4 lg:px-0 lg:pb-0">
      <div className="pointer-events-auto mx-auto hidden w-full max-w-3xl items-center justify-center gap-3 overflow-x-auto rounded-[34px] bg-white/6 px-3 py-3 shadow-[0_18px_50px_rgba(15,23,42,0.10)] ring-1 ring-white/10 backdrop-blur-xl lg:flex">
        <DesktopUtilityRow
          cameraEnabled={cameraEnabled}
          recordingScreen={recordingScreen}
          isSharing={isSharing}
          screenShareSupported={screenShareSupported}
          screenRecordingSupported={screenRecordingSupported}
          onStartScreenShare={onStartScreenShare}
          onStopScreenShare={onStopScreenShare}
          onToggleCamera={onToggleCamera}
          onSwitchCamera={onSwitchCamera}
          onTakePhoto={onTakePhoto}
          onTakeScreenshot={onTakeScreenshot}
          onToggleScreenRecording={onToggleScreenRecording}
        />
      </div>

      {textComposerOpen ? (
        <div className="pointer-events-auto mx-auto flex w-full max-w-lg items-center gap-2 rounded-full bg-[#101828]/88 px-3 py-2.5 shadow-[0_22px_44px_rgba(2,6,23,0.42)] ring-1 ring-white/10 backdrop-blur-xl lg:max-w-xl">
          <button
            type="button"
            onClick={() => setTextComposerOpen(false)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/8 text-white/80 ring-1 ring-white/10 transition hover:bg-white/12"
            aria-label="Close text input"
          >
            <Keyboard size={18} />
          </button>
          <input
            type="text"
            value={textDraft}
            onChange={(event) => setTextDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onSubmitText();
              }
            }}
            placeholder="Type a message"
            className="min-w-0 flex-1 bg-transparent px-2 text-sm text-white outline-none placeholder:text-white/45"
          />
          <button
            type="button"
            onClick={onSubmitText}
            disabled={!textDraft.trim() || sendingText}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition ${
              textDraft.trim() && !sendingText
                ? "bg-blue-600 text-white shadow-[0_10px_24px_rgba(59,130,246,0.32)]"
                : "bg-white/8 text-white/35 ring-1 ring-white/8"
            }`}
            aria-label="Send text to live AI"
          >
            <Send size={18} />
          </button>
        </div>
      ) : null}

      <div className="pointer-events-auto mx-auto flex w-full max-w-md items-center justify-center gap-2.5 lg:hidden">
        {showStopReply ? (
          <ActionChip onClick={onInterrupt}>Stop reply</ActionChip>
        ) : null}
        {showListenAgain ? (
          <ActionChip onClick={onRetryListen}>Listen again</ActionChip>
        ) : null}
      </div>

      <div className="pointer-events-auto mx-auto flex w-full max-w-md items-center justify-center gap-3 lg:hidden">
        <DockIconButton
          icon={<Keyboard size={20} />}
          label="Text"
          onClick={() => setTextComposerOpen((value) => !value)}
          active={textComposerOpen}
        />
        <MainMicButton mode={mode} label={micLabel} onClick={onPrimaryMic} />
        <DangerDockButton onClick={onEnd} />
      </div>

      <div className="pointer-events-auto mx-auto hidden w-full max-w-3xl items-center justify-center gap-3 lg:flex">
        <ActionChip onClick={onPrimaryMic} emphasized>
          {mode === "listening" ? "Stop listening" : "Start voice"}
        </ActionChip>
        {showStopReply ? <ActionChip onClick={onInterrupt}>Stop reply</ActionChip> : null}
        {showListenAgain ? <ActionChip onClick={onRetryListen}>Listen again</ActionChip> : null}
        <ActionChip onClick={() => setTextComposerOpen((value) => !value)}>Text</ActionChip>
        <DangerAction onClick={onEnd}>End</DangerAction>
      </div>
    </div>
  );
}

function MobileUtilityStack({
  cameraEnabled,
  recordingScreen,
  isSharing,
  screenShareSupported,
  screenRecordingSupported,
  onStartScreenShare,
  onStopScreenShare,
  onToggleCamera,
  onSwitchCamera,
  onTakePhoto,
  onTakeScreenshot,
  onToggleScreenRecording,
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <UtilityIconButton
        label={isSharing ? "Stop sharing" : "Share screen"}
        icon={isSharing ? <Monitor size={18} /> : <MonitorUp size={18} />}
        onClick={isSharing ? onStopScreenShare : onStartScreenShare}
        active={isSharing}
        dimmed={!screenShareSupported}
      />
      <UtilityIconButton
        label={cameraEnabled ? "Turn camera off" : "Turn camera on"}
        icon={<Camera size={18} />}
        onClick={onToggleCamera}
        active={cameraEnabled}
      />
      <UtilityIconButton
        label="Switch camera"
        icon={<RotateCw size={18} />}
        onClick={onSwitchCamera}
      />
      <UtilityIconButton label="Take photo" icon={<ImagePlus size={18} />} onClick={onTakePhoto} />
      <UtilityIconButton label="Take screenshot" icon={<Monitor size={18} />} onClick={onTakeScreenshot} />
      <UtilityIconButton
        label={recordingScreen ? "Stop recording" : "Record screen"}
        icon={<Square size={18} />}
        onClick={onToggleScreenRecording}
        active={recordingScreen}
        dimmed={!screenRecordingSupported}
      />
    </div>
  );
}

function DesktopUtilityRow(props) {
  return (
    <>
      <DesktopUtilityButton
        label={props.isSharing ? "Sharing" : "Share"}
        icon={props.isSharing ? <Monitor size={18} /> : <MonitorUp size={18} />}
        onClick={props.isSharing ? props.onStopScreenShare : props.onStartScreenShare}
        active={props.isSharing}
        dimmed={!props.screenShareSupported}
      />
      <DesktopUtilityButton
        label="Camera"
        icon={<Camera size={18} />}
        onClick={props.onToggleCamera}
        active={props.cameraEnabled}
      />
      <DesktopUtilityButton label="Switch" icon={<RotateCw size={18} />} onClick={props.onSwitchCamera} />
      <DesktopUtilityButton label="Photo" icon={<ImagePlus size={18} />} onClick={props.onTakePhoto} />
      <DesktopUtilityButton label="Shot" icon={<Monitor size={18} />} onClick={props.onTakeScreenshot} />
      <DesktopUtilityButton
        label="Record"
        icon={<Square size={18} />}
        onClick={props.onToggleScreenRecording}
        active={props.recordingScreen}
        dimmed={!props.screenRecordingSupported}
      />
    </>
  );
}

function UtilityIconButton({ icon, label, onClick, active = false, dimmed = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-14 w-14 items-center justify-center rounded-2xl backdrop-blur-xl transition ${
        active
          ? "bg-blue-600 text-white shadow-[0_12px_28px_rgba(59,130,246,0.32)]"
          : "bg-black/24 text-white shadow-[0_14px_26px_rgba(2,6,23,0.24)] ring-1 ring-white/10"
      } ${dimmed && !active ? "opacity-55" : ""}`}
      aria-label={label}
      title={label}
    >
      {icon}
    </button>
  );
}

function DesktopUtilityButton({ icon, label, onClick, active = false, dimmed = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[64px] min-w-[76px] flex-col items-center justify-center rounded-[22px] px-2 py-2.5 text-center transition ${
        active
          ? "bg-blue-600 text-white shadow-[0_8px_24px_rgba(59,130,246,0.35)]"
          : "bg-white/8 text-white ring-1 ring-white/10 hover:bg-white/12"
      } ${dimmed && !active ? "opacity-60" : ""}`}
      title={label}
      aria-label={label}
    >
      <span className="text-lg">{icon}</span>
      <span className="mt-1 text-[10px] font-medium leading-tight">{label}</span>
    </button>
  );
}

function MainMicButton({ mode, label, onClick }) {
  const active = mode === "listening";
  const thinking = mode === "thinking";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-[74px] min-w-[124px] items-center justify-center gap-3 rounded-full px-6 text-white transition ${
        active
          ? "bg-blue-600 shadow-[0_16px_36px_rgba(59,130,246,0.34)]"
          : thinking
          ? "bg-white/12 ring-1 ring-white/10"
          : "bg-white/10 ring-1 ring-white/10 backdrop-blur-xl"
      }`}
      aria-label={active ? "Stop listening and send your voice turn" : "Start talking"}
    >
      <Mic size={24} />
      <span className="text-sm font-semibold">{label}</span>
    </button>
  );
}

function DockIconButton({ icon, label, onClick, active = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-[68px] w-[68px] items-center justify-center rounded-full backdrop-blur-xl transition ${
        active
          ? "bg-white/16 text-white shadow-[0_12px_28px_rgba(15,23,42,0.24)] ring-1 ring-white/12"
          : "bg-white/10 text-white ring-1 ring-white/10"
      }`}
      aria-label={label}
      title={label}
    >
      {icon}
    </button>
  );
}

function ActionChip({ children, onClick, emphasized = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2.5 text-sm font-medium transition ${
        emphasized
          ? "bg-blue-600 text-white shadow-[0_8px_24px_rgba(59,130,246,0.28)]"
          : "bg-black/24 text-white/88 ring-1 ring-white/10 backdrop-blur-xl"
      }`}
    >
      {children}
    </button>
  );
}

function DangerDockButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-[68px] min-w-[110px] items-center justify-center gap-2 rounded-full bg-red-500 px-6 text-white shadow-[0_14px_34px_rgba(239,68,68,0.28)] transition hover:bg-red-400"
      aria-label="End live mode"
    >
      <PhoneOff size={20} />
      <span className="text-sm font-semibold">End</span>
    </button>
  );
}

function MobileCaptureRail({ captures, selectedCaptureId, onSelect }) {
  return (
    <div className="flex gap-2 overflow-x-auto rounded-3xl bg-black/28 px-2.5 py-2 backdrop-blur-xl">
      {captures.map((item) => {
        const active = item.id === selectedCaptureId;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={`h-16 w-16 shrink-0 overflow-hidden rounded-2xl transition ${
              active ? "ring-2 ring-sky-400/80" : "ring-1 ring-white/10"
            }`}
          >
            {item.previewUrl ? (
              <img
                src={item.previewUrl}
                alt={item.title || "Capture"}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-white/10 text-white/75">
                <ImagePlus size={16} />
              </div>
            )}
          </button>
        );
      })}
    </div>
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
