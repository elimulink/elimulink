import React from "react";

export default function AudioSettingsPanel({
  playbackRate,
  setPlaybackRate,
  voice,
  setVoice,
  language,
  setLanguage,
  onDone,
  voices = ["Default", "Caspian", "Nova", "Atlas"],
  languages = ["English", "Swahili", "French"],
}) {
  return (
    <div className="elu-audio-settings">
      <div className="elu-audio-settings__section">
        <div className="elu-audio-settings__label">Speed</div>
        <div className="elu-audio-speed-row">
          <span>0.5x</span>
          <input
            className="elu-audio-speed-range"
            type="range"
            min="0.5"
            max="2"
            step="0.25"
            value={playbackRate}
            onChange={(e) => setPlaybackRate(Number(e.target.value))}
          />
          <span>{playbackRate}x</span>
        </div>
      </div>

      <div className="elu-audio-settings__section">
        <div className="elu-audio-settings__label">Speaker Voice</div>
        <select
          className="elu-audio-select"
          value={voice}
          onChange={(e) => setVoice(e.target.value)}
        >
          {voices.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      <div className="elu-audio-settings__section">
        <div className="elu-audio-settings__label">Language</div>
        <select
          className="elu-audio-select"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
        >
          {languages.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      <button type="button" className="elu-audio-done" onClick={onDone}>
        Done
      </button>
    </div>
  );
}
