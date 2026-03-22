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
    const data = await res.json().catch(() => null);
    throw new Error(
      data?.detail?.error?.message || data?.error?.message || "Speech generation failed"
    );
  }

  return await res.blob();
}
