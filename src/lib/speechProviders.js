const API_BASE = import.meta.env.VITE_API_BASE || "";

export async function textToSpeechWithFallback({
  text,
  voiceId = "nova",
  speed = 1,
}) {
  const res = await fetch(`${API_BASE}/api/v1/speech/speak`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      voice_id: voiceId,
      speed,
    }),
  });

  if (!res.ok) {
    const data = await res.clone().json().catch(() => null);
    throw new Error(
      data?.detail?.error?.message || data?.error?.message || "Speech generation failed"
    );
  }

  const contentType = (res.headers.get("content-type") || "").split(";", 1)[0].trim().toLowerCase();
  const blob = await res.blob();
  console.debug("[AI_AUDIO][tts]", {
    ok: res.ok,
    status: res.status,
    contentType,
    blobType: blob?.type || "",
    blobSize: blob?.size || 0,
  });

  if (!blob || blob.size <= 0) {
    throw new Error("Speech generation returned empty audio.");
  }

  const normalizedType = String(blob.type || contentType || "").toLowerCase();
  if (!normalizedType.startsWith("audio/")) {
    throw new Error(`Speech generation returned unsupported audio type: ${normalizedType || "unknown"}`);
  }

  return blob;
}
