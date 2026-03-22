import React from "react";
import VoiceAudioSettingsPanel from "./VoiceAudioSettingsPanel.jsx";

export default function AudioSettingsPanel({
  playbackRate,
  setPlaybackRate,
  voiceId,
  setVoice,
  language,
  setLanguage,
  followAppLanguage = true,
  setFollowAppLanguage,
  captionsEnabled = false,
  setCaptionsEnabled,
  autoPlayReplies = true,
  setAutoPlayReplies,
  onPreviewVoice,
  isPreviewingVoice = false,
  previewVoiceId = "",
  previewError = "",
  onDone,
}) {
  const settings = {
    voiceId,
    speechRate: playbackRate,
    captionsEnabled,
    autoPlayReplies,
    language,
    followAppLanguage,
  };

  return (
    <div className="elu-audio-settings" role="dialog" aria-modal="false" aria-label="Audio settings">
      <div className="elu-audio-settings__header">
        <div>
          <div className="elu-audio-settings__title">Audio settings</div>
          <div className="elu-audio-settings__subtitle">
            Voice settings here match the main Settings screen.
          </div>
        </div>
        <button type="button" className="elu-audio-done-inline" onClick={onDone}>
          Done
        </button>
      </div>

      <VoiceAudioSettingsPanel
        compact
        settings={settings}
        onChangeSettings={(next) => {
          setPlaybackRate?.(next.speechRate);
          setVoice?.(next.voiceId);
          setCaptionsEnabled?.(next.captionsEnabled);
          setAutoPlayReplies?.(next.autoPlayReplies);
          if (language) {
            setLanguage?.(language);
          }
          if (typeof followAppLanguage === "boolean") {
            setFollowAppLanguage?.(followAppLanguage);
          }
        }}
        onPreviewVoice={(voice) => onPreviewVoice?.(voice.id)}
        previewingVoiceId={isPreviewingVoice ? previewVoiceId : ""}
        previewError={previewError}
      />

      <button type="button" className="elu-audio-done" onClick={onDone}>
        Done
      </button>
    </div>
  );
}
