import { apiUrl } from "../lib/apiUrl";
import { notifyAuthChanged } from "../lib/apiClient";
import { clearAppSession, loadAppSession, saveAppSession } from "./appSession";
import { getFirebaseIdToken, logoutFirebase } from "./firebaseAuth";

const VERIFY_SESSION_TIMEOUT_MS = 30000;
const STARTUP_VERIFY_TIMEOUT_MS = 45000;
const BACKGROUND_VERIFY_TIMEOUT_MS = 45000;
const SESSION_BOOTSTRAP_MAX_AGE_MS = 1000 * 60 * 60 * 12;
const SESSION_DEFERRED_REUSE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7;
const INSTITUTION_SESSION_BOOTSTRAP_MAX_AGE_MS = 1000 * 60 * 60 * 24;
const INSTITUTION_SESSION_DEFERRED_REUSE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 14;
const VERIFY_NETWORK_RETRY_DELAY_MS = 2500;
const VERIFY_NETWORK_RETRY_COUNT = 2;
const VERIFY_RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);
const inFlightVerifyRequests = new Map();

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function buildVerifyNetworkError(error, { timeoutMs, verifyUrl, appName } = {}) {
  const err = new Error(
    error?.name === "AbortError"
      ? `Workspace verification timed out after ${Math.round(timeoutMs / 1000)}s`
      : String(error?.message || error || "Workspace verification failed")
  );
  err.status = 0;
  err.verifyUrl = verifyUrl;
  err.appName = appName;
  err.temporary = true;
  return err;
}

function isRetryableVerifyStatus(status) {
  return VERIFY_RETRYABLE_STATUS.has(Number(status || 0));
}

export function isTemporaryVerifyFailure(error) {
  const status = Number(error?.status || 0);
  if (status === 401 || status === 403) return false;
  if (status === 0) return true;
  return isRetryableVerifyStatus(status) || error?.temporary === true;
}

function buildInFlightVerifyKey(firebaseUser, normalizedApp, forceRefreshToken) {
  return [
    firebaseUser?.uid || "anonymous",
    normalizedApp,
    forceRefreshToken ? "refresh" : "cached",
  ].join(":");
}

function getSessionBootstrapMaxAgeMs(appName) {
  return resolveAppName(appName) === "institution"
    ? INSTITUTION_SESSION_BOOTSTRAP_MAX_AGE_MS
    : SESSION_BOOTSTRAP_MAX_AGE_MS;
}

function getDeferredSessionMaxAgeMs(appName) {
  return resolveAppName(appName) === "institution"
    ? INSTITUTION_SESSION_DEFERRED_REUSE_MAX_AGE_MS
    : SESSION_DEFERRED_REUSE_MAX_AGE_MS;
}

async function runVerifyFamilySession(
  firebaseUser,
  normalizedApp,
  { timeoutMs, forceRefreshToken, networkRetryCount, networkRetryDelayMs }
) {
  const maxRetries = Number.isFinite(networkRetryCount)
    ? Math.max(0, Number(networkRetryCount))
    : VERIFY_NETWORK_RETRY_COUNT;
  const retryDelayMs = Number.isFinite(networkRetryDelayMs)
    ? Math.max(0, Number(networkRetryDelayMs))
    : VERIFY_NETWORK_RETRY_DELAY_MS;
  const verifyUrl = apiUrl("/api/auth/verify-app-access");
  const tokenStart = performance.now();
  let token = await getFirebaseIdToken(forceRefreshToken);
  console.debug("[ENTRY_TIMING][frontend]", {
    app: normalizedApp,
    marker: "token_fetch_done",
    durationMs: Math.round(performance.now() - tokenStart),
    forceRefreshToken,
  });
  if (!token) throw new Error("Missing Firebase ID token");
  let retriedWithFreshToken = false;
  let response;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timeoutId = controller
      ? window.setTimeout(() => controller.abort(new Error("Verify session timed out")), timeoutMs)
      : null;

    try {
      const requestStartedAt = performance.now();
      console.debug("[ENTRY_TIMING][frontend]", {
        app: normalizedApp,
        marker: "verify_request_sent",
        attempt: attempt + 1,
        verifyUrl,
      });
      response = await fetch(verifyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ app: normalizedApp }),
        ...(controller ? { signal: controller.signal } : {}),
      });
      console.debug("[ENTRY_TIMING][frontend]", {
        app: normalizedApp,
        marker: "verify_response_received",
        attempt: attempt + 1,
        status: response.status,
        durationMs: Math.round(performance.now() - requestStartedAt),
      });
      if (timeoutId) window.clearTimeout(timeoutId);
    } catch (error) {
      if (timeoutId) window.clearTimeout(timeoutId);
      const err = buildVerifyNetworkError(error, {
        timeoutMs,
        verifyUrl,
        appName: normalizedApp,
      });
      const canRetry = attempt < maxRetries;
      console.error("[FAMILY_SESSION] verify:network_error", {
        app: normalizedApp,
        verifyUrl,
        message: err.message,
        attempt: attempt + 1,
        retrying: canRetry,
      });
      if (!canRetry) {
        throw err;
      }
      await wait(retryDelayMs * (attempt + 1));
      continue;
    }

    console.info("[FAMILY_SESSION] verify:response", {
      app: normalizedApp,
      status: response.status,
      ok: response.ok,
      verifyUrl,
      attempt: attempt + 1,
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
      err.temporary = isRetryableVerifyStatus(response.status);
      console.error("[FAMILY_SESSION] verify:invalid_json", {
        app: normalizedApp,
        status: response.status,
        verifyUrl,
        message: String(error?.message || error || "Invalid JSON"),
      });
      throw err;
    }

    if (!response.ok) {
      if (
        (response.status === 401 || response.status === 403) &&
        !forceRefreshToken &&
        !retriedWithFreshToken
      ) {
        retriedWithFreshToken = true;
        token = await getFirebaseIdToken(true);
        if (!token) throw new Error("Missing Firebase ID token");
        console.warn("[FAMILY_SESSION] verify:auth_refresh_retry", {
          app: normalizedApp,
          verifyUrl,
          status: response.status,
          attempt: attempt + 1,
        });
        continue;
      }
      const message = data?.detail || data?.error || data?.message || `Verify app access failed (${response.status})`;
      const error = new Error(message);
      error.status = response.status;
      error.verifyUrl = verifyUrl;
      error.appName = normalizedApp;
      error.temporary = isRetryableVerifyStatus(response.status);
      const canRetry = error.temporary && attempt < maxRetries;
      console.error("[FAMILY_SESSION] verify:failed", {
        app: normalizedApp,
        status: response.status,
        verifyUrl,
        message,
        body: data,
        attempt: attempt + 1,
        retrying: canRetry,
      });
      if (!canRetry) {
        throw error;
      }
      await wait(retryDelayMs * (attempt + 1));
      continue;
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

  throw new Error("Workspace verification did not complete");
}

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
    username: firebaseUser?.displayName || "",
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

export function isStartupSessionReusable(session, { firebaseUser, appName } = {}) {
  if (!session || !firebaseUser?.uid) return false;
  if (session.uid !== firebaseUser.uid) return false;
  if (!canAccessApp(session, appName)) return false;

  const verifiedAt = Number(session.verifiedAt || 0);
  if (!verifiedAt) return false;

  const ageMs = Date.now() - verifiedAt;
  return ageMs >= 0 && ageMs <= getSessionBootstrapMaxAgeMs(appName);
}

export function isDeferredSessionReusable(session, { firebaseUser, appName } = {}) {
  if (!session || !firebaseUser?.uid) return false;
  if (session.uid !== firebaseUser.uid) return false;
  if (!canAccessApp(session, appName)) return false;

  const verifiedAt = Number(session.verifiedAt || 0);
  if (!verifiedAt) return false;

  const ageMs = Date.now() - verifiedAt;
  return ageMs >= 0 && ageMs <= getDeferredSessionMaxAgeMs(appName);
}

export function resolveFamilySessionReuse(firebaseUser, appName) {
  const session = loadAppSession();
  if (!session || !firebaseUser?.uid) {
    return {
      session: null,
      allowed: false,
      reuseKind: "none",
    };
  }
  if (session.uid !== firebaseUser.uid) {
    return {
      session,
      allowed: false,
      reuseKind: "uid_mismatch",
    };
  }

  const allowed = canAccessApp(session, appName);
  if (!allowed) {
    return {
      session,
      allowed: false,
      reuseKind: "denied",
    };
  }

  if (isStartupSessionReusable(session, { firebaseUser, appName })) {
    return {
      session,
      allowed: true,
      reuseKind: "startup",
    };
  }

  if (isDeferredSessionReusable(session, { firebaseUser, appName })) {
    return {
      session,
      allowed: true,
      reuseKind: "deferred",
    };
  }

  return {
    session,
    allowed: true,
    reuseKind: "stale",
  };
}

export async function verifyFamilySession(firebaseUser, appName, options = {}) {
  if (!firebaseUser) return null;
  const normalizedApp = resolveAppName(appName);
  const timeoutMs = Number(options.timeoutMs || VERIFY_SESSION_TIMEOUT_MS);
  const forceRefreshToken = options.forceRefreshToken !== false;
  const networkRetryCount = Number.isFinite(options.networkRetryCount)
    ? Math.max(0, Number(options.networkRetryCount))
    : VERIFY_NETWORK_RETRY_COUNT;
  const networkRetryDelayMs = Number.isFinite(options.networkRetryDelayMs)
    ? Math.max(0, Number(options.networkRetryDelayMs))
    : VERIFY_NETWORK_RETRY_DELAY_MS;
  console.info("[FAMILY_SESSION] verify:start", {
    uid: firebaseUser.uid,
    email: firebaseUser.email || null,
    app: normalizedApp,
    timeoutMs,
    forceRefreshToken,
  });
  const inFlightKey = buildInFlightVerifyKey(firebaseUser, normalizedApp, forceRefreshToken);
  if (inFlightVerifyRequests.has(inFlightKey)) {
    return inFlightVerifyRequests.get(inFlightKey);
  }

  const requestPromise = runVerifyFamilySession(firebaseUser, normalizedApp, {
    timeoutMs,
    forceRefreshToken,
    networkRetryCount,
    networkRetryDelayMs,
  }).finally(() => {
    inFlightVerifyRequests.delete(inFlightKey);
  });

  inFlightVerifyRequests.set(inFlightKey, requestPromise);
  return requestPromise;
}

export function getStartupVerifyTimeoutMs() {
  return STARTUP_VERIFY_TIMEOUT_MS;
}

export function getBackgroundVerifyTimeoutMs() {
  return BACKGROUND_VERIFY_TIMEOUT_MS;
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
