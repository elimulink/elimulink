import { apiUrl } from "./apiUrl";

async function apiFetch(path, options = {}) {
  const response = await fetch(apiUrl(path), {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMessage =
      data?.detail?.error?.message ||
      data?.error?.message ||
      data?.message ||
      "Request failed";
    const errorCode =
      data?.detail?.error?.code || data?.error?.code || "REQUEST_FAILED";

    const error = new Error(errorMessage);
    error.code = errorCode;
    error.status = response.status;
    error.payload = data;
    throw error;
  }

  if (data?.ok === false) {
    const error = new Error(data?.error?.message || "Request failed");
    error.code = data?.error?.code || "REQUEST_FAILED";
    error.payload = data;
    throw error;
  }

  return data;
}

export async function createConversation({ family, app, title = "New conversation" }) {
  return apiFetch("/api/v1/conversations", {
    method: "POST",
    body: JSON.stringify({ family, app, title }),
  });
}

export async function createInstitutionConversation({ title = "New conversation", ownerUid = null }) {
  return apiFetch("/api/v1/ai/institution/conversations", {
    method: "POST",
    body: JSON.stringify({ title, owner_uid: ownerUid }),
  });
}

export async function fetchInstitutionConversation(conversationId) {
  return apiFetch(`/api/v1/ai/institution/conversations/${conversationId}`);
}

export async function createInstitutionConversationMessage(conversationId, payload) {
  return apiFetch(`/api/v1/ai/institution/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchInstitutionMessageSources(messageId) {
  return apiFetch(`/api/v1/ai/institution/messages/${messageId}/sources`);
}

export async function fetchInstitutionSourceById(sourceId) {
  return apiFetch(`/api/v1/ai/institution/sources/${sourceId}`);
}

export async function createInstitutionShareLink({
  conversationId,
  messageIds,
  visibility = "unlisted",
  allowContinueChat = true,
  expiresInDays = 30,
  baseUrl,
}) {
  const query = baseUrl ? `?base_url=${encodeURIComponent(baseUrl)}` : "";
  return apiFetch(`/api/v1/ai/institution/share-links${query}`, {
    method: "POST",
    body: JSON.stringify({
      conversation_id: conversationId,
      message_ids: messageIds,
      visibility,
      allow_continue_chat: allowContinueChat,
      expires_in_days: expiresInDays,
    }),
  });
}

export async function fetchInstitutionShareLink(shareId) {
  return apiFetch(`/api/v1/ai/institution/share-links/${shareId}`);
}

export async function deleteInstitutionShareLink(shareId) {
  return apiFetch(`/api/v1/ai/institution/share-links/${shareId}`, {
    method: "DELETE",
  });
}

export async function fetchConversation(conversationId) {
  return apiFetch(`/api/v1/conversations/${conversationId}`);
}

export async function createConversationMessage(conversationId, content) {
  return apiFetch(`/api/v1/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

export async function fetchMessageSources(messageId) {
  return apiFetch(`/api/v1/messages/${messageId}/sources`);
}

export async function fetchSourceById(sourceId) {
  return apiFetch(`/api/v1/sources/${sourceId}`);
}

export async function createShareLink({
  family,
  app,
  conversationId,
  messageIds,
  visibility = "unlisted",
  allowContinueChat = true,
  expiresInDays = 30,
  baseUrl,
}) {
  const query = baseUrl ? `?base_url=${encodeURIComponent(baseUrl)}` : "";

  return apiFetch(`/api/v1/share-links${query}`, {
    method: "POST",
    body: JSON.stringify({
      family,
      app,
      conversation_id: conversationId,
      message_ids: messageIds,
      visibility,
      allow_continue_chat: allowContinueChat,
      expires_in_days: expiresInDays,
    }),
  });
}

export async function fetchShareLink(shareId) {
  return apiFetch(`/api/v1/share-links/${shareId}`);
}

export async function deleteShareLink(shareId) {
  return apiFetch(`/api/v1/share-links/${shareId}`, {
    method: "DELETE",
  });
}
