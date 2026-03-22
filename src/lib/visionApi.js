const API_BASE = import.meta.env.VITE_API_BASE || "";

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const err = new Error(
      data?.detail?.error?.message || data?.error?.message || "Vision request failed"
    );
    err.code = data?.detail?.error?.code || data?.error?.code || "VISION_FAILED";
    err.status = res.status;
    err.payload = data;
    throw err;
  }

  return data;
}

export async function analyzeVisualContext({
  imageDataUrl,
  prompt,
  family,
  app,
}) {
  return apiFetch("/api/v1/vision/analyze", {
    method: "POST",
    body: JSON.stringify({
      image_data_url: imageDataUrl,
      prompt,
      family,
      app,
    }),
  });
}
