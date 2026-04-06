import { useEffect, useState } from "react";
import { readScopedJson, writeScopedJson } from "../../lib/userScopedStorage";

const ASSISTANT_STYLE_KEY = "assistant_style_preference_v1";
const DEFAULT_STYLE = "default";

function normalizeStyle(value) {
  const clean = String(value || "").trim().toLowerCase();
  if (["default", "friendly", "concise", "formal"].includes(clean)) return clean;
  return DEFAULT_STYLE;
}

export function useAssistantStylePreference(uid) {
  const [style, setStyleState] = useState(DEFAULT_STYLE);

  useEffect(() => {
    const stored = uid ? readScopedJson(ASSISTANT_STYLE_KEY, uid, null) : null;
    setStyleState(normalizeStyle(stored || DEFAULT_STYLE));
  }, [uid]);

  const setStyle = (nextStyle) => {
    const normalized = normalizeStyle(nextStyle);
    setStyleState(normalized);
    if (uid) {
      writeScopedJson(ASSISTANT_STYLE_KEY, uid, normalized);
    }
  };

  return [style, setStyle];
}
