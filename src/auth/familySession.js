import { apiUrl } from "../lib/apiUrl";
import { notifyAuthChanged } from "../lib/apiClient";
import { clearAppSession, loadAppSession, saveAppSession } from "./appSession";
import { getFirebaseIdToken, logoutFirebase } from "./firebaseAuth";

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

  return {
    allowed,
    uid,
    email,
    role,
    institution_id,
    app_access,
    default_app,
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
    profile,
    verifiedAt: Date.now(),
  };
}

export function canAccessApp(session, appName) {
  const normalizedApp = resolveAppName(appName);
  const access = Array.isArray(session?.app_access) ? session.app_access : [];
  return session?.allowed === true && access.includes(normalizedApp);
}

export async function verifyFamilySession(firebaseUser, appName) {
  if (!firebaseUser) return null;
  const normalizedApp = resolveAppName(appName);
  const token = await getFirebaseIdToken(true);
  if (!token) throw new Error("Missing Firebase ID token");
  const verifyUrl = apiUrl("/api/auth/verify-app-access");

  const response = await fetch(verifyUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ app: normalizedApp }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.detail || data?.error || data?.message || `Verify app access failed (${response.status})`;
    const error = new Error(message);
    error.status = response.status;
    error.verifyUrl = verifyUrl;
    error.appName = normalizedApp;
    throw error;
  }

  const normalized = normalizeVerifyResponse(data, {
    appName: normalizedApp,
    firebaseUser,
  });
  const session = buildFamilySession(normalized, { firebaseUser });
  saveAppSession(session);
  notifyAuthChanged();
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
