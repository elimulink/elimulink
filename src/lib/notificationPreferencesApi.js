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

export async function fetchInstitutionNotificationPreferences() {
  return apiFetchWithAuth("/api/v1/settings/notification-preferences");
}

export async function saveInstitutionNotificationPreferences({
  muteNotifications = false,
  notificationDelivery = {},
} = {}) {
  return apiFetchWithAuth("/api/v1/settings/notification-preferences", {
    method: "PUT",
    body: JSON.stringify({
      mute_notifications: !!muteNotifications,
      delivery: notificationDelivery || {},
    }),
  });
}
