import {
  EmailAuthProvider,
  GoogleAuthProvider,
  OAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
} from "firebase/auth";

const LOCK_STATE_KEY = "elimulink_secure_lock_state";
const DEFAULT_IDLE_TIMEOUT_MS = 15 * 60 * 1000;
const DEFAULT_RESUME_TIMEOUT_MS = 90 * 1000;

function getStorage() {
  if (typeof window === "undefined") return null;
  return window.sessionStorage;
}

function parseStoredLockState() {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(LOCK_STATE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeLockState(state) {
  const storage = getStorage();
  if (!storage) return;
  try {
    if (!state) {
      storage.removeItem(LOCK_STATE_KEY);
      return;
    }
    storage.setItem(LOCK_STATE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage failures
  }
}

function buildProvider(user, providerId) {
  if (providerId === "google.com") return new GoogleAuthProvider();
  if (providerId === "apple.com") return new OAuthProvider("apple.com");
  if (providerId === "microsoft.com") return new OAuthProvider("microsoft.com");
  const primaryProvider = user?.providerData?.find((item) => item?.providerId && item.providerId !== "firebase");
  if (!primaryProvider?.providerId) return null;
  return buildProvider(user, primaryProvider.providerId);
}

function getRpId() {
  if (typeof window === "undefined") return undefined;
  const host = String(window.location.hostname || "").trim().toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".localhost")) return undefined;
  return host;
}

function createChallenge() {
  const bytes = new Uint8Array(32);
  window.crypto.getRandomValues(bytes);
  return bytes;
}

function getProviderIds(user) {
  return Array.from(new Set((user?.providerData || []).map((item) => String(item?.providerId || "").trim()).filter(Boolean)));
}

export function getSecureLockConfig() {
  return {
    idleTimeoutMs: Number(import.meta.env.VITE_SECURE_LOCK_IDLE_MS || DEFAULT_IDLE_TIMEOUT_MS),
    resumeTimeoutMs: Number(import.meta.env.VITE_SECURE_LOCK_RESUME_MS || DEFAULT_RESUME_TIMEOUT_MS),
  };
}

export function requestSessionLock({ uid, family = "ai", reason = "manual" } = {}) {
  if (!uid) return null;
  const nextState = {
    locked: true,
    uid,
    family,
    reason,
    lockedAt: Date.now(),
  };
  writeLockState(nextState);
  return nextState;
}

export function readSessionLock(uid = null) {
  const state = parseStoredLockState();
  if (!state?.locked) return null;
  if (uid && state.uid !== uid) return null;
  return state;
}

export function clearSessionLock(uid = null) {
  const state = parseStoredLockState();
  if (!state) return;
  if (uid && state.uid !== uid) return;
  writeLockState(null);
}

export function requestPostSignupLock(uid, family = "ai") {
  return requestSessionLock({ uid, family, reason: "post_signup" });
}

export function emitSessionLock(reason = "manual") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("elimulink:lock-session", { detail: { reason } }));
}

export function getSecureUnlockCapabilities(user) {
  const providerIds = getProviderIds(user);
  const hasWebAuthn = typeof window !== "undefined" && !!window.PublicKeyCredential && !!window.navigator?.credentials?.get;
  const hasPasswordProvider = providerIds.includes("password");
  const hasFederatedProvider = providerIds.some((providerId) => ["google.com", "apple.com", "microsoft.com"].includes(providerId));

  return {
    password: hasPasswordProvider,
    passkey: hasWebAuthn,
    biometrics: hasWebAuthn || hasFederatedProvider,
    federatedProvider: hasFederatedProvider,
    providerIds,
  };
}

export async function unlockWithPassword(user, password) {
  const email = String(user?.email || "").trim();
  if (!user || !email) throw new Error("Password unlock is not available for this account.");
  if (!password) throw new Error("Enter your password to continue.");
  const credential = EmailAuthProvider.credential(email, password);
  await reauthenticateWithCredential(user, credential);
}

export async function unlockWithPasskey() {
  if (typeof window === "undefined" || !window.PublicKeyCredential || !window.navigator?.credentials?.get) {
    throw new Error("Passkeys are not supported in this browser.");
  }

  const publicKey = {
    challenge: createChallenge(),
    timeout: 60_000,
    userVerification: "required",
    rpId: getRpId(),
  };

  const credential = await window.navigator.credentials.get({
    mediation: "optional",
    publicKey,
  });

  if (!credential) throw new Error("No passkey was available for this device.");
  return credential;
}

export async function unlockWithBiometrics(user) {
  const capabilities = getSecureUnlockCapabilities(user);
  if (capabilities.passkey) {
    return unlockWithPasskey();
  }

  if (!capabilities.federatedProvider) {
    throw new Error("Biometric unlock is not available for this account on this device.");
  }

  const provider = buildProvider(user);
  if (!provider) throw new Error("Biometric unlock is not available for this sign-in method.");
  await reauthenticateWithPopup(user, provider);
}

