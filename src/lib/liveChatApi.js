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
      data?.detail?.error?.message || data?.error?.message || "Live chat failed"
    );
    err.code = data?.detail?.error?.code || data?.error?.code || "LIVE_CHAT_FAILED";
    err.status = res.status;
    err.payload = data;
    throw err;
  }

  return data;
}

export async function askExecutiveLiveChat({ text, context }) {
  return apiFetch("/api/v1/executive/live-chat", {
    method: "POST",
    body: JSON.stringify({ text, context }),
  });
}

export async function askInstitutionLiveChat({ text, context }) {
  return apiFetch("/api/v1/ai/institution/live-chat", {
    method: "POST",
    body: JSON.stringify({ text, context }),
  });
}

export async function askStudentLiveChat({ text, context }) {
  return apiFetch("/api/v1/ai/student/live-chat", {
    method: "POST",
    body: JSON.stringify({ text, context }),
  });
}

export async function askPublicLiveChat({ text, context }) {
  return apiFetch("/api/v1/ai/public/live-chat", {
    method: "POST",
    body: JSON.stringify({ text, context }),
  });
}
