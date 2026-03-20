import React from "react";

function PreviewIcon() {
  return (
    <svg viewBox="0 0 24 24" className="elu-audio-icon elu-audio-icon--small" fill="currentColor" aria-hidden="true">
      <path d="M8 6v12l10-6-10-6Z" />
    </svg>
  );
}

export default function AudioSettingsPanel({
  playbackRate,
  playbackRates = [],
  setPlaybackRate,
  voiceId,
  setVoice,
  language,
  setLanguage,
  languages = [],
  voices = [],
  onPreviewVoice,
  isPreviewingVoice = false,
  previewVoiceId = "",
  followAppLanguage = true,
  isSupported = true,
  onDone,
}) {
  return (
    <div className="elu-audio-settings" role="dialog" aria-modal="false" aria-label="Audio settings">
      <div className="elu-audio-settings__header">
        <div>
          <div className="elu-audio-settings__title">Audio settings</div>
          <div className="elu-audio-settings__subtitle">
            {isSupported ? "Playback uses available device voices." : "Text-to-speech is unavailable in this browser."}
          </div>
        </div>
        <button type="button" className="elu-audio-done-inline" onClick={onDone}>
          Done
        </button>
      </div>

      <div className="elu-audio-settings__section">
        <div className="elu-audio-settings__label">Playback speed</div>
        <div className="elu-audio-chip-row">
          {playbackRates.map((item) => (
            <button
              key={item}
              type="button"
              className={`elu-audio-chip ${Number(item) === Number(playbackRate) ? "is-active" : ""}`}
              onClick={() => setPlaybackRate(item)}
            >
              {item}x
            </button>
          ))}
        </div>
      </div>

      <div className="elu-audio-settings__section">
        <div className="elu-audio-settings__label">Language</div>
        <select className="elu-audio-select" value={language} onChange={(event) => setLanguage(event.target.value)} disabled={!isSupported}>
          {languages.map((item) => (
            <option key={item.code} value={item.code}>
              {item.label}
            </option>
          ))}
        </select>
        <div className="elu-audio-settings__hint">
          {followAppLanguage ? "Following your app language." : "Using a custom voice language for read-aloud."}
        </div>
      </div>

      <div className="elu-audio-settings__section">
        <div className="elu-audio-settings__label">Speaker voice</div>
        {voices.length ? (
          <div className="elu-audio-voice-list">
            {voices.map((item) => (
              <div key={item.id} className={`elu-audio-voice-card ${item.id === voiceId ? "is-active" : ""}`}>
                <button
                  type="button"
                  className="elu-audio-voice-main"
                  onClick={() => setVoice(item.id)}
                  disabled={!isSupported}
                >
                  <span className="elu-audio-voice-name">{item.name}</span>
                  <span className="elu-audio-voice-meta">
                    {item.languageLabel}
                    {item.tone === "neutral" ? "" : ` • ${item.tone}`}
                  </span>
                </button>
                <button
                  type="button"
                  className="elu-audio-preview-btn"
                  onClick={() => onPreviewVoice(item.id)}
                  disabled={!isSupported}
                  aria-label={`Preview ${item.name}`}
                >
                  <PreviewIcon />
                  <span>{isPreviewingVoice && item.id === previewVoiceId ? "Playing" : "Preview"}</span>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="elu-audio-empty-state">No compatible voices are currently available for this language.</div>
        )}
      </div>

      <button type="button" className="elu-audio-done" onClick={onDone}>
        Done
      </button>
    </div>
  );
}
