import { apiUrl } from "./apiUrl";
import { auth } from "./firebase";

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

async function apiFetchWithAuth(path, options = {}) {
  const currentUser = auth?.currentUser || null;
  const token = currentUser ? await currentUser.getIdToken() : "";
  return apiFetch(path, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

async function apiFetchBlobWithAuth(path, options = {}) {
  const currentUser = auth?.currentUser || null;
  const token = currentUser ? await currentUser.getIdToken() : "";
  const response = await fetch(apiUrl(path), {
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
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

  return {
    blob: await response.blob(),
    filename: response.headers.get("Content-Disposition") || "",
    contentType: response.headers.get("Content-Type") || "application/octet-stream",
  };
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

export async function fetchInstitutionNotebookWorkspace({ baseUrl } = {}) {
  const query = baseUrl ? `?base_url=${encodeURIComponent(baseUrl)}` : "";
  return apiFetchWithAuth(`/api/v1/ai/institution/notebook-workspace${query}`);
}

export async function updateInstitutionNotebookWorkspace(payload, { baseUrl } = {}) {
  const query = baseUrl ? `?base_url=${encodeURIComponent(baseUrl)}` : "";
  return apiFetchWithAuth(`/api/v1/ai/institution/notebook-workspace${query}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteInstitutionNotebookWorkspace() {
  return apiFetchWithAuth("/api/v1/ai/institution/notebook-workspace", {
    method: "DELETE",
  });
}

export async function fetchInstitutionNotebookItems({ includeArchived = false } = {}) {
  const params = new URLSearchParams();
  if (includeArchived) params.set("include_archived", "true");
  const query = params.toString() ? `?${params.toString()}` : "";
  return apiFetchWithAuth(`/api/v1/ai/institution/notebook-workspace/items${query}`);
}

export async function createInstitutionNotebookItem(payload) {
  return apiFetchWithAuth("/api/v1/ai/institution/notebook-workspace/items", {
    method: "POST",
    body: JSON.stringify({
      title: payload?.title,
      content: payload?.content ?? "",
    }),
  });
}

export async function fetchInstitutionNotebookItem(itemId) {
  return apiFetchWithAuth(`/api/v1/ai/institution/notebook-workspace/items/${itemId}`);
}

export async function updateInstitutionNotebookItem(itemId, payload) {
  return apiFetchWithAuth(`/api/v1/ai/institution/notebook-workspace/items/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify({
      title: payload?.title,
      content: payload?.content,
      archived: payload?.archived,
    }),
  });
}

export async function deleteInstitutionNotebookItem(itemId) {
  return apiFetchWithAuth(`/api/v1/ai/institution/notebook-workspace/items/${itemId}`, {
    method: "DELETE",
  });
}

export async function fetchInstitutionSubgroups({ query = "", limit = 20 } = {}) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  params.set("limit", String(limit));
  return apiFetchWithAuth(`/api/groups?${params.toString()}`);
}

export async function fetchInstitutionArchivedChats({ limit = 50 } = {}) {
  const query = new URLSearchParams({ limit: String(limit) });
  return apiFetchWithAuth(`/api/v1/ai/institution/archived-chats?${query.toString()}`);
}

export async function archiveInstitutionConversation(conversationId) {
  return apiFetchWithAuth(`/api/v1/ai/institution/conversations/${conversationId}/archive`, {
    method: "PATCH",
    body: JSON.stringify({ archived: true }),
  });
}

export async function restoreInstitutionConversation(conversationId) {
  return apiFetchWithAuth(`/api/v1/ai/institution/conversations/${conversationId}/restore`, {
    method: "PATCH",
  });
}

export async function archiveAllInstitutionConversations() {
  return apiFetchWithAuth("/api/v1/ai/institution/conversations/archive-all", {
    method: "PATCH",
  });
}

export async function deleteAllInstitutionConversations() {
  return apiFetchWithAuth("/api/v1/ai/institution/conversations", {
    method: "DELETE",
  });
}

export async function exportInstitutionData({ baseUrl } = {}) {
  const query = baseUrl ? `?base_url=${encodeURIComponent(baseUrl)}` : "";
  return apiFetchBlobWithAuth(`/api/v1/ai/institution/export-data${query}`, {
    method: "GET",
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
  accessLevel = "anyone-with-link",
  invitedEmails = [],
  subgroupId = null,
  subgroupName = "",
  allowContinueChat = true,
  expiresInDays = 30,
  baseUrl,
}) {
  const query = baseUrl ? `?base_url=${encodeURIComponent(baseUrl)}` : "";
  return apiFetchWithAuth(`/api/v1/ai/institution/share-links${query}`, {
    method: "POST",
    body: JSON.stringify({
      conversation_id: conversationId,
      message_ids: messageIds,
      visibility,
      access_level: accessLevel,
      invited_emails: invitedEmails,
      subgroup_id: subgroupId,
      subgroup_name: subgroupName || null,
      allow_continue_chat: allowContinueChat,
      expires_in_days: expiresInDays,
    }),
  });
}

export async function fetchInstitutionShareLinks({ limit = 100, baseUrl } = {}) {
  const params = new URLSearchParams();
  if (limit) params.set("limit", String(limit));
  if (baseUrl) params.set("base_url", String(baseUrl));
  const query = params.toString() ? `?${params.toString()}` : "";
  return apiFetchWithAuth(`/api/v1/ai/institution/share-links${query}`);
}

export async function fetchInstitutionShareLink(shareId) {
  return apiFetch(`/api/v1/ai/institution/share-links/${shareId}`);
}

export async function deleteInstitutionShareLink(shareId) {
  return apiFetchWithAuth(`/api/v1/ai/institution/share-links/${shareId}`, {
    method: "DELETE",
  });
}

export async function updateInstitutionShareLink(shareId, payload, { baseUrl } = {}) {
  const query = baseUrl ? `?base_url=${encodeURIComponent(baseUrl)}` : "";
  return apiFetchWithAuth(`/api/v1/ai/institution/share-links/${shareId}${query}`, {
    method: "PATCH",
    body: JSON.stringify({
      access_level: payload?.accessLevel,
      invited_emails: payload?.invitedEmails,
      subgroup_id: payload?.subgroupId,
      subgroup_name: payload?.subgroupName,
    }),
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
