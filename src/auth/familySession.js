import { apiUrl } from "../lib/apiUrl";
import { notifyAuthChanged } from "../lib/apiClient";
import { clearAppSession, loadAppSession, saveAppSession } from "./appSession";
import { getFirebaseIdToken, logoutFirebase } from "./firebaseAuth";

const VERIFY_SESSION_TIMEOUT_MS = 15000;

function normalizeRole(role) {
  const value = String(role || "").trim().toLowerCase();
  if (!value) return "public_user";
  if (value === "superadmin") return "super_admin";
  if (value === "institutionadmin") return "institution_admin";
  if (value === "departmentadmin") return "department_head";
  return value;
}

function normalizeAppAccess(appAccess, fallbackApp) {
  const raw = Array.isArray(appAccess) ? appAccess : [];
  const normalized = raw
    .map((item) => String(item || "").trim().toLowerCase())
    .filter(Boolean);
  if (fallbackApp && !normalized.includes(fallbackApp)) {
    normalized.push(fallbackApp);
  }
  return normalized;
}

function normalizeAccessMode(accessMode, { allowed = false } = {}) {
  const value = String(accessMode || "").trim().toLowerCase();
  if (value === "verified" || value === "temporary" || value === "denied") return value;
  return allowed ? "verified" : "denied";
}

export function resolveAppName(hostMode) {
  const value = String(hostMode || "public").trim().toLowerCase();
  if (value === "institution") return "institution";
  if (value === "student") return "student";
  return "public";
}

export function normalizeVerifyResponse(data = {}, { appName, firebaseUser } = {}) {
  const normalizedApp = resolveAppName(appName);
  const allowed = data?.allowed === true;
  const uid = data?.uid || firebaseUser?.uid || null;
  const email = data?.email || firebaseUser?.email || null;
  const role = normalizeRole(data?.role || (allowed && normalizedApp === "public" ? "public_user" : null));
  const institution_id = data?.institution_id ?? null;
  const app_access = normalizeAppAccess(data?.app_access, allowed ? normalizedApp : null);
  const default_app = String(data?.default_app || normalizedApp || "public").trim().toLowerCase();
  const access_mode = normalizeAccessMode(data?.access_mode, { allowed });
  const temporary_reason = data?.temporary_reason || null;

  return {
    allowed,
    uid,
    email,
    role,
    institution_id,
    app_access,
    default_app,
    access_mode,
    temporary_reason,
  };
}

export function buildFamilySession(verifyData, { firebaseUser } = {}) {
  const profile = {
    uid: verifyData.uid,
    email: verifyData.email,
    role: verifyData.role,
    institution_id: verifyData.institution_id,
    institutionId: verifyData.institution_id,
    app_access: verifyData.app_access,
    default_app: verifyData.default_app,
    access_mode: verifyData.access_mode,
    temporary_reason: verifyData.temporary_reason,
    displayName: firebaseUser?.displayName || "",
  };

  return {
    allowed: verifyData.allowed,
    uid: verifyData.uid,
    email: verifyData.email,
    role: verifyData.role,
    institution_id: verifyData.institution_id,
    app_access: verifyData.app_access,
    default_app: verifyData.default_app,
    access_mode: verifyData.access_mode,
    temporary_reason: verifyData.temporary_reason,
    profile,
    verifiedAt: Date.now(),
  };
}

export function canAccessApp(session, appName) {
  const normalizedApp = resolveAppName(appName);
  const access = Array.isArray(session?.app_access) ? session.app_access : [];
  const accessMode = normalizeAccessMode(session?.access_mode, { allowed: session?.allowed === true });
  return session?.allowed === true && access.includes(normalizedApp) && accessMode !== "denied";
}

export async function verifyFamilySession(firebaseUser, appName) {
  if (!firebaseUser) return null;
  const normalizedApp = resolveAppName(appName);
  console.info("[FAMILY_SESSION] verify:start", {
    uid: firebaseUser.uid,
    email: firebaseUser.email || null,
    app: normalizedApp,
  });
  const token = await getFirebaseIdToken(true);
  if (!token) throw new Error("Missing Firebase ID token");
  const verifyUrl = apiUrl("/api/auth/verify-app-access");
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeoutId = controller
    ? window.setTimeout(() => controller.abort(new Error("Verify session timed out")), VERIFY_SESSION_TIMEOUT_MS)
    : null;

  let response;
  try {
    response = await fetch(verifyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ app: normalizedApp }),
      ...(controller ? { signal: controller.signal } : {}),
    });
  } catch (error) {
    if (timeoutId) window.clearTimeout(timeoutId);
    const err = new Error(
      error?.name === "AbortError"
        ? `Workspace verification timed out after ${Math.round(VERIFY_SESSION_TIMEOUT_MS / 1000)}s`
        : String(error?.message || error || "Workspace verification failed")
    );
    err.status = 0;
    err.verifyUrl = verifyUrl;
    err.appName = normalizedApp;
    console.error("[FAMILY_SESSION] verify:network_error", {
      app: normalizedApp,
      verifyUrl,
      message: err.message,
    });
    throw err;
  }

  if (timeoutId) window.clearTimeout(timeoutId);
  console.info("[FAMILY_SESSION] verify:response", {
    app: normalizedApp,
    status: response.status,
    ok: response.ok,
    verifyUrl,
  });

  let data = {};
  try {
    data = await response.json();
  } catch (error) {
    const err = new Error(
      response.ok
        ? "Workspace verification returned invalid JSON"
        : `Verify app access failed (${response.status})`
    );
    err.status = response.status;
    err.verifyUrl = verifyUrl;
    err.appName = normalizedApp;
    console.error("[FAMILY_SESSION] verify:invalid_json", {
      app: normalizedApp,
      status: response.status,
      verifyUrl,
      message: String(error?.message || error || "Invalid JSON"),
    });
    throw err;
  }
  if (!response.ok) {
    const message = data?.detail || data?.error || data?.message || `Verify app access failed (${response.status})`;
    const error = new Error(message);
    error.status = response.status;
    error.verifyUrl = verifyUrl;
    error.appName = normalizedApp;
    console.error("[FAMILY_SESSION] verify:failed", {
      app: normalizedApp,
      status: response.status,
      verifyUrl,
      message,
      body: data,
    });
    throw error;
  }

  const normalized = normalizeVerifyResponse(data, {
    appName: normalizedApp,
    firebaseUser,
  });
  const session = buildFamilySession(normalized, { firebaseUser });
  saveAppSession(session);
  notifyAuthChanged();
  console.info("[FAMILY_SESSION] verify:success", {
    app: normalizedApp,
    uid: session.uid,
    role: session.role,
    allowed: session.allowed,
    accessMode: session.access_mode,
    temporaryReason: session.temporary_reason,
    access: session.app_access,
  });
  return session;
}

export function loadFamilySession(uid = null) {
  const session = loadAppSession();
  if (!session) return null;
  if (uid && session.uid !== uid) return null;
  return session;
}

export function clearFamilySession() {
  clearAppSession();
  notifyAuthChanged();
}

export async function logoutFamilySession({ clearKeys = [] } = {}) {
  clearFamilySession();
  for (const key of clearKeys) {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore storage failures
    }
  }
  await logoutFirebase().catch(() => {});
}
