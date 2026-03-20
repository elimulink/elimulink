import React from "react";
import { formatAudioTime } from "./useAudioPlayer";

function PlayIcon({ playing }) {
  return playing ? (
    <svg viewBox="0 0 24 24" className="elu-audio-icon" fill="currentColor" aria-hidden="true">
      <rect x="7" y="5" width="3.5" height="14" rx="1.2" />
      <rect x="13.5" y="5" width="3.5" height="14" rx="1.2" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="elu-audio-icon" fill="currentColor" aria-hidden="true">
      <path d="M8 5.6v12.8l9.8-6.4L8 5.6Z" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" className="elu-audio-icon elu-audio-icon--small" fill="currentColor" aria-hidden="true">
      <circle cx="6.5" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="17.5" cy="12" r="1.5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="elu-audio-icon elu-audio-icon--small" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </svg>
  );
}

export default function AudioPlaybackBar({
  isPlaying,
  currentTime,
  duration,
  onTogglePlay,
  onSeek,
  onClose,
  onOpenSettings,
}) {
  return (
    <div className="elu-audio-bar" role="region" aria-label="Audio playback controls">
      <button type="button" className="elu-audio-play" onClick={onTogglePlay} aria-label={isPlaying ? "Pause audio" : "Play audio"}>
        <PlayIcon playing={isPlaying} />
      </button>

      <div className="elu-audio-main">
        <div className="elu-audio-track-row">
          <span className="elu-audio-time">{formatAudioTime(currentTime)}</span>
          <input
            className="elu-audio-range"
            type="range"
            min="0"
            max={Math.max(duration || 0, 1)}
            step="0.1"
            value={currentTime}
            onChange={(event) => onSeek(event.target.value)}
            aria-label="Seek audio position"
          />
          <span className="elu-audio-time">{formatAudioTime(duration)}</span>
        </div>
      </div>

      <button type="button" className="elu-audio-icon-btn" onClick={onOpenSettings} aria-label="Open audio settings">
        <MoreIcon />
      </button>

      <button type="button" className="elu-audio-icon-btn" onClick={onClose} aria-label="Close audio player">
        <CloseIcon />
      </button>
    </div>
  );
}
