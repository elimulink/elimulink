import React from "react";

export default function LiveSceneHints({
  hints = [],
  onSelectHint,
  visible = true,
}) {
  if (!visible || !hints.length) return null;

  return (
    <div className="el-live-scene-hints" aria-label="Scene hints">
      {hints.map((hint, index) => (
        <button
          key={hint.id || `${hint.label}-${index}`}
          type="button"
          className="el-live-scene-chip"
          onClick={() => onSelectHint?.(hint)}
        >
          {hint.label}
        </button>
      ))}
    </div>
  );
}
