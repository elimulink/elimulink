import { apiUrl } from "./apiUrl";
import { auth } from "./firebase";

let blockedAuth = {
  active: false,
  status: null,
  tokenSig: null,
};

function tokenSignature(token) {
  if (!token) return "anon";
  return String(token).slice(0, 24);
}

export function notifyAuthChanged() {
  blockedAuth = { active: false, status: null, tokenSig: null };
}

export async function apiPost(path, body, { token } = {}) {
  const url = apiUrl(path);
  let resolvedToken = token;
  if (!resolvedToken && auth?.currentUser) {
    resolvedToken = await auth.currentUser.getIdToken(true).catch(() => null);
  }

  const requiresAuth = path.startsWith("/api/chat") || path.startsWith("/api/ai/");
  const hasUser = Boolean(auth?.currentUser);
  const hasToken = Boolean(resolvedToken);

  if (import.meta.env.DEV) {
    console.log("[API_AUTH_DEBUG]", {
      endpoint: path,
      hasUser,
      hasToken,
      tokenLength: hasToken ? String(resolvedToken).length : 0,
    });
  }

  if (requiresAuth && !resolvedToken) {
    const err = new Error("Please sign in");
    err.status = 401;
    err.code = "AUTH_MISSING";
    throw err;
  }

  const tokenSig = tokenSignature(resolvedToken);

  if (blockedAuth.active && blockedAuth.tokenSig === tokenSig) {
    const err = new Error("Please sign in");
    err.status = blockedAuth.status || 401;
    err.code = "AUTH_BLOCKED";
    throw err;
  }

  if (import.meta.env.DEV) {
    console.log("[API_CALL]", "POST", url, hasToken);
  }

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(resolvedToken ? { Authorization: `Bearer ${resolvedToken}` } : {}),
      },
      body: JSON.stringify(body ?? {}),
    });
  } catch (error) {
    const err = new Error("Network request failed");
    err.status = 0;
    err.cause = error;
    throw err;
  }

  const contentType = response.headers.get("content-type") || "";
  let data = {};
  if (contentType.includes("application/json")) {
    data = await response.json().catch(() => ({}));
  } else {
    const rawText = await response.text().catch(() => "");
    data = rawText ? { raw: rawText } : {};
  }
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      blockedAuth = {
        active: true,
        status: response.status,
        tokenSig,
      };
    }
    const err = new Error(data?.error || data?.message || data?.raw || `Request failed (${response.status})`);
    err.status = response.status;
    err.body = data;
    throw err;
  }

  blockedAuth = { active: false, status: null, tokenSig: null };
  return data;
}

export async function apiGet(path, { token } = {}) {
  const url = apiUrl(path);
  let resolvedToken = token;
  if (!resolvedToken && auth?.currentUser) {
    resolvedToken = await auth.currentUser.getIdToken(true).catch(() => null);
  }

  const requiresAuth = path.startsWith("/api/chat") || path.startsWith("/api/ai/");
  const hasToken = Boolean(resolvedToken);

  if (requiresAuth && !resolvedToken) {
    const err = new Error("Please sign in");
    err.status = 401;
    err.code = "AUTH_MISSING";
    throw err;
  }

  const tokenSig = tokenSignature(resolvedToken);

  if (blockedAuth.active && blockedAuth.tokenSig === tokenSig) {
    const err = new Error("Please sign in");
    err.status = blockedAuth.status || 401;
    err.code = "AUTH_BLOCKED";
    throw err;
  }

  let response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        ...(resolvedToken ? { Authorization: `Bearer ${resolvedToken}` } : {}),
      },
    });
  } catch (error) {
    const err = new Error("Network request failed");
    err.status = 0;
    err.cause = error;
    throw err;
  }

  const contentType = response.headers.get("content-type") || "";
  let data = {};
  if (contentType.includes("application/json")) {
    data = await response.json().catch(() => ({}));
  } else {
    const rawText = await response.text().catch(() => "");
    data = rawText ? { raw: rawText } : {};
  }
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      blockedAuth = {
        active: true,
        status: response.status,
        tokenSig,
      };
    }
    const err = new Error(data?.error || data?.message || data?.raw || `Request failed (${response.status})`);
    err.status = response.status;
    err.body = data;
    throw err;
  }

  blockedAuth = { active: false, status: null, tokenSig: null };
  return data;
}

async function apiRequest(method, path, body, { token } = {}) {
  const url = apiUrl(path);
  let resolvedToken = token;
  if (!resolvedToken && auth?.currentUser) {
    resolvedToken = await auth.currentUser.getIdToken(true).catch(() => null);
  }

  const requiresAuth = path.startsWith("/api/chat") || path.startsWith("/api/ai/");
  if (requiresAuth && !resolvedToken) {
    const err = new Error("Please sign in");
    err.status = 401;
    err.code = "AUTH_MISSING";
    throw err;
  }

  const tokenSig = tokenSignature(resolvedToken);
  if (blockedAuth.active && blockedAuth.tokenSig === tokenSig) {
    const err = new Error("Please sign in");
    err.status = blockedAuth.status || 401;
    err.code = "AUTH_BLOCKED";
    throw err;
  }

  let response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(resolvedToken ? { Authorization: `Bearer ${resolvedToken}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body ?? {}) }),
    });
  } catch (error) {
    const err = new Error("Network request failed");
    err.status = 0;
    err.cause = error;
    throw err;
  }

  const contentType = response.headers.get("content-type") || "";
  let data = {};
  if (contentType.includes("application/json")) {
    data = await response.json().catch(() => ({}));
  } else {
    const rawText = await response.text().catch(() => "");
    data = rawText ? { raw: rawText } : {};
  }
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      blockedAuth = {
        active: true,
        status: response.status,
        tokenSig,
      };
    }
    const err = new Error(data?.error || data?.message || data?.raw || `Request failed (${response.status})`);
    err.status = response.status;
    err.body = data;
    throw err;
  }

  blockedAuth = { active: false, status: null, tokenSig: null };
  return data;
}

export async function apiPatch(path, body, options) {
  return apiRequest("PATCH", path, body, options);
}

export async function apiDelete(path, options) {
  return apiRequest("DELETE", path, undefined, options);
}

export async function listAssignments(options) {
  return apiGet("/api/assignments", options);
}

export async function createAssignmentRecord(body, options) {
  return apiPost("/api/assignments/create", body, options);
}

export async function fetchAssignmentRecord(assignmentId, options) {
  return apiGet(`/api/assignments/${assignmentId}`, options);
}

export async function updateAssignmentRecord(assignmentId, body, options) {
  return apiPatch(`/api/assignments/${assignmentId}`, body, options);
}

export async function deleteAssignmentRecord(assignmentId, options) {
  return apiDelete(`/api/assignments/${assignmentId}`, options);
}

export async function fetchResultsSummary(userId, options) {
  return apiGet(`/api/results/${userId}`, options);
}

export async function fetchResultDetail(userId, unitCode, options) {
  return apiGet(`/api/results/${userId}/units/${encodeURIComponent(unitCode)}`, options);
}

export async function fetchFinanceSummary(userId, options) {
  return apiGet(`/api/finance/${userId}`, options);
}

export async function listCourses(options) {
  return apiGet("/api/courses", options);
}

export async function fetchCoursesSummary(userId, options) {
  return apiGet(`/api/courses/${userId}`, options);
}
