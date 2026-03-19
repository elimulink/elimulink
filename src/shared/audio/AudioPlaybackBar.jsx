import React from "react";
import { formatAudioTime } from "./useAudioPlayer";

function PlayIcon({ playing }) {
  return playing ? (
    <svg viewBox="0 0 24 24" className="elu-audio-icon" fill="currentColor">
      <rect x="6" y="5" width="4" height="14" rx="1.4" />
      <rect x="14" y="5" width="4" height="14" rx="1.4" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="elu-audio-icon" fill="currentColor">
      <path d="M8 5.5v13l10-6.5-10-6.5Z" />
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
    <div className="elu-audio-bar">
      <button type="button" className="elu-audio-play" onClick={onTogglePlay}>
        <PlayIcon playing={isPlaying} />
      </button>

      <span className="elu-audio-time">{formatAudioTime(currentTime)}</span>

      <input
        className="elu-audio-range"
        type="range"
        min="0"
        max={Math.max(duration || 0, 1)}
        step="0.1"
        value={currentTime}
        onChange={(e) => onSeek(e.target.value)}
      />

      <span className="elu-audio-time">{formatAudioTime(duration)}</span>

      <button type="button" className="elu-audio-more" onClick={onOpenSettings} aria-label="Open audio settings">
        ⋯
      </button>

      <button type="button" className="elu-audio-close" onClick={onClose} aria-label="Close audio player">
        ×
      </button>
    </div>
  );
}
