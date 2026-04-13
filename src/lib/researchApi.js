import { apiUrl } from "./apiUrl";
import { auth } from "./firebase";

function logInstitutionBackgroundTiming(label, startedAt, meta = {}) {
  console.debug("[AI_TIMING][institution][background]", {
    label,
    elapsedMs: Math.round(performance.now() - startedAt),
    ...meta,
  });
}

async function timedInstitutionBackgroundCall(label, fn, meta = {}) {
  const startedAt = performance.now();
  try {
    const result = await fn();
    logInstitutionBackgroundTiming(label, startedAt, { ok: true, ...meta });
    return result;
  } catch (error) {
    logInstitutionBackgroundTiming(label, startedAt, {
      ok: false,
      status: error?.status || null,
      code: error?.code || null,
      ...meta,
    });
    throw error;
  }
}

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
  const token = currentUser ? await currentUser.getIdToken(true).catch(() => "") : "";
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
  const token = currentUser ? await currentUser.getIdToken(true).catch(() => "") : "";
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
  return timedInstitutionBackgroundCall("createInstitutionConversation", () =>
    apiFetch("/api/v1/ai/institution/conversations", {
      method: "POST",
      body: JSON.stringify({ title, owner_uid: ownerUid }),
    })
  );
}

export async function fetchInstitutionConversation(conversationId) {
  return timedInstitutionBackgroundCall(
    "fetchInstitutionConversation",
    () => apiFetch(`/api/v1/ai/institution/conversations/${conversationId}`),
    { conversationId }
  );
}

export async function createInstitutionConversationMessage(conversationId, payload) {
  return timedInstitutionBackgroundCall(
    "createInstitutionConversationMessage",
    () =>
      apiFetch(`/api/v1/ai/institution/conversations/${conversationId}/messages`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    { conversationId }
  );
}

export async function fetchInstitutionNotebookWorkspace({ baseUrl } = {}) {
  const query = baseUrl ? `?base_url=${encodeURIComponent(baseUrl)}` : "";
  return timedInstitutionBackgroundCall("fetchInstitutionNotebookWorkspace", () =>
    apiFetchWithAuth(`/api/v1/ai/institution/notebook-workspace${query}`)
  );
}

export async function updateInstitutionNotebookWorkspace(payload, { baseUrl } = {}) {
  const query = baseUrl ? `?base_url=${encodeURIComponent(baseUrl)}` : "";
  return timedInstitutionBackgroundCall("updateInstitutionNotebookWorkspace", () =>
    apiFetchWithAuth(`/api/v1/ai/institution/notebook-workspace${query}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    })
  );
}

export async function deleteInstitutionNotebookWorkspace() {
  return timedInstitutionBackgroundCall("deleteInstitutionNotebookWorkspace", () =>
    apiFetchWithAuth("/api/v1/ai/institution/notebook-workspace", {
      method: "DELETE",
    })
  );
}

export async function fetchInstitutionNotebookItems({ includeArchived = false } = {}) {
  const params = new URLSearchParams();
  if (includeArchived) params.set("include_archived", "true");
  const query = params.toString() ? `?${params.toString()}` : "";
  return timedInstitutionBackgroundCall("fetchInstitutionNotebookItems", () =>
    apiFetchWithAuth(`/api/v1/ai/institution/notebook-workspace/items${query}`)
  );
}

export async function createInstitutionNotebookItem(payload) {
  return timedInstitutionBackgroundCall("createInstitutionNotebookItem", () =>
    apiFetchWithAuth("/api/v1/ai/institution/notebook-workspace/items", {
      method: "POST",
      body: JSON.stringify({
        title: payload?.title,
        content: payload?.content ?? "",
      }),
    })
  );
}

export async function fetchInstitutionNotebookItem(itemId) {
  return timedInstitutionBackgroundCall(
    "fetchInstitutionNotebookItem",
    () => apiFetchWithAuth(`/api/v1/ai/institution/notebook-workspace/items/${itemId}`),
    { itemId }
  );
}

export async function updateInstitutionNotebookItem(itemId, payload) {
  return timedInstitutionBackgroundCall(
    "updateInstitutionNotebookItem",
    () =>
      apiFetchWithAuth(`/api/v1/ai/institution/notebook-workspace/items/${itemId}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: payload?.title,
          content: payload?.content,
          archived: payload?.archived,
        }),
      }),
    { itemId }
  );
}

export async function deleteInstitutionNotebookItem(itemId) {
  return timedInstitutionBackgroundCall(
    "deleteInstitutionNotebookItem",
    () =>
      apiFetchWithAuth(`/api/v1/ai/institution/notebook-workspace/items/${itemId}`, {
        method: "DELETE",
      }),
    { itemId }
  );
}

export async function fetchInstitutionSubgroups({ query = "", limit = 20 } = {}) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  params.set("limit", String(limit));
  return apiFetchWithAuth(`/api/groups?${params.toString()}`);
}

export async function fetchInstitutionArchivedChats({ limit = 50 } = {}) {
  const query = new URLSearchParams({ limit: String(limit) });
  return timedInstitutionBackgroundCall("fetchInstitutionArchivedChats", () =>
    apiFetchWithAuth(`/api/v1/ai/institution/archived-chats?${query.toString()}`)
  );
}

export async function archiveInstitutionConversation(conversationId) {
  return timedInstitutionBackgroundCall(
    "archiveInstitutionConversation",
    () =>
      apiFetchWithAuth(`/api/v1/ai/institution/conversations/${conversationId}/archive`, {
        method: "PATCH",
        body: JSON.stringify({ archived: true }),
      }),
    { conversationId }
  );
}

export async function restoreInstitutionConversation(conversationId) {
  return timedInstitutionBackgroundCall(
    "restoreInstitutionConversation",
    () =>
      apiFetchWithAuth(`/api/v1/ai/institution/conversations/${conversationId}/restore`, {
        method: "PATCH",
      }),
    { conversationId }
  );
}

export async function archiveAllInstitutionConversations() {
  return timedInstitutionBackgroundCall("archiveAllInstitutionConversations", () =>
    apiFetchWithAuth("/api/v1/ai/institution/conversations/archive-all", {
      method: "PATCH",
    })
  );
}

export async function deleteAllInstitutionConversations() {
  return timedInstitutionBackgroundCall("deleteAllInstitutionConversations", () =>
    apiFetchWithAuth("/api/v1/ai/institution/conversations", {
      method: "DELETE",
    })
  );
}

export async function exportInstitutionData({ baseUrl } = {}) {
  const query = baseUrl ? `?base_url=${encodeURIComponent(baseUrl)}` : "";
  return apiFetchBlobWithAuth(`/api/v1/ai/institution/export-data${query}`, {
    method: "GET",
  });
}

export async function fetchInstitutionMessageSources(messageId) {
  return timedInstitutionBackgroundCall(
    "fetchInstitutionMessageSources",
    () => apiFetch(`/api/v1/ai/institution/messages/${messageId}/sources`),
    { messageId }
  );
}

export async function fetchInstitutionSourceById(sourceId) {
  return timedInstitutionBackgroundCall(
    "fetchInstitutionSourceById",
    () => apiFetch(`/api/v1/ai/institution/sources/${sourceId}`),
    { sourceId }
  );
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
  return timedInstitutionBackgroundCall("createInstitutionShareLink", () =>
    apiFetchWithAuth(`/api/v1/ai/institution/share-links${query}`, {
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
    }),
  );
}

export async function fetchInstitutionShareLinks({ limit = 100, baseUrl } = {}) {
  const params = new URLSearchParams();
  if (limit) params.set("limit", String(limit));
  if (baseUrl) params.set("base_url", String(baseUrl));
  const query = params.toString() ? `?${params.toString()}` : "";
  return timedInstitutionBackgroundCall("fetchInstitutionShareLinks", () =>
    apiFetchWithAuth(`/api/v1/ai/institution/share-links${query}`)
  );
}

export async function fetchInstitutionShareLink(shareId) {
  return timedInstitutionBackgroundCall(
    "fetchInstitutionShareLink",
    () => apiFetch(`/api/v1/ai/institution/share-links/${shareId}`),
    { shareId }
  );
}

export async function deleteInstitutionShareLink(shareId) {
  return timedInstitutionBackgroundCall(
    "deleteInstitutionShareLink",
    () =>
      apiFetchWithAuth(`/api/v1/ai/institution/share-links/${shareId}`, {
        method: "DELETE",
      }),
    { shareId }
  );
}

export async function updateInstitutionShareLink(shareId, payload, { baseUrl } = {}) {
  const query = baseUrl ? `?base_url=${encodeURIComponent(baseUrl)}` : "";
  return timedInstitutionBackgroundCall(
    "updateInstitutionShareLink",
    () =>
      apiFetchWithAuth(`/api/v1/ai/institution/share-links/${shareId}${query}`, {
        method: "PATCH",
        body: JSON.stringify({
          access_level: payload?.accessLevel,
          invited_emails: payload?.invitedEmails,
          subgroup_id: payload?.subgroupId,
          subgroup_name: payload?.subgroupName,
        }),
      }),
    { shareId }
  );
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
