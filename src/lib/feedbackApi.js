import { apiUrl } from "./apiUrl";
import { auth } from "./firebase";

async function apiFetchWithAuth(path, options = {}) {
  const currentUser = auth?.currentUser || null;
  const token = currentUser ? await currentUser.getIdToken() : "";
  const response = await fetch(apiUrl(path), {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      data?.detail?.error?.message ||
      data?.error?.message ||
      data?.message ||
      "Request failed";
    const error = new Error(message);
    error.status = response.status;
    error.payload = data;
    throw error;
  }

  return data;
}

export async function submitInstitutionBugReport({
  message,
  sourceSurface = "settings/report-bug",
  metadata = {},
} = {}) {
  return apiFetchWithAuth("/api/v1/feedback/bug-reports", {
    method: "POST",
    body: JSON.stringify({
      message,
      source_surface: sourceSurface,
      app: "institution",
      metadata,
    }),
  });
}
