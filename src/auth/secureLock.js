import {
  EmailAuthProvider,
  GoogleAuthProvider,
  OAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
} from "firebase/auth";
import { readScopedJson, writeScopedJson } from "../lib/userScopedStorage";

const LOCK_STATE_KEY = "elimulink_secure_lock_state";
const PASSKEY_SETTINGS_KEY = "elimulink_passkey_settings_v1";
const DEFAULT_IDLE_TIMEOUT_MS = 15 * 60 * 1000;
const DEFAULT_RESUME_TIMEOUT_MS = 90 * 1000;
const PASSKEY_FRIENDLY_PROVIDER_LABELS = {
  "google.com": "Google",
  "apple.com": "Apple",
  "microsoft.com": "Microsoft",
  password: "Password",
};

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

function toBase64Url(bufferLike) {
  const bytes = bufferLike instanceof Uint8Array ? bufferLike : new Uint8Array(bufferLike);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window.btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value) {
  const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  const binary = window.atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function resolvePasskeyStore(uid) {
  return readScopedJson(uid, PASSKEY_SETTINGS_KEY, {
    registered: false,
    credentials: [],
  }) || {
    registered: false,
    credentials: [],
  };
}

function savePasskeyStore(uid, value) {
  writeScopedJson(uid, PASSKEY_SETTINGS_KEY, value);
}

function normalizePasskeyEntries(entries = []) {
  return Array.isArray(entries)
    ? entries
        .map((entry) => ({
          id: String(entry?.id || "").trim(),
          transports: Array.isArray(entry?.transports) ? entry.transports.filter(Boolean) : [],
          label: String(entry?.label || "This device").trim() || "This device",
          createdAt: Number(entry?.createdAt || Date.now()),
        }))
        .filter((entry) => entry.id)
    : [];
}

function getFirstFederatedProviderId(user) {
  return getProviderIds(user).find((providerId) => ["google.com", "apple.com", "microsoft.com"].includes(providerId)) || null;
}

export function getProviderDisplayName(providerId) {
  return PASSKEY_FRIENDLY_PROVIDER_LABELS[String(providerId || "").trim()] || "Provider";
}

export function getFederatedReauthProviderId(user) {
  return getFirstFederatedProviderId(user);
}

export function getRegisteredPasskeys(uid) {
  if (!uid) return [];
  return normalizePasskeyEntries(resolvePasskeyStore(uid).credentials);
}

export function clearRegisteredPasskeys(uid) {
  if (!uid) return;
  savePasskeyStore(uid, {
    registered: false,
    credentials: [],
    updatedAt: Date.now(),
  });
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
  const federatedProviderId = getFirstFederatedProviderId(user);
  const hasFederatedProvider = Boolean(federatedProviderId);
  const passkeyStore = user?.uid ? resolvePasskeyStore(user.uid) : { registered: false, credentials: [] };
  const credentials = normalizePasskeyEntries(passkeyStore.credentials);
  const hasRegisteredPasskey = hasWebAuthn && credentials.length > 0;

  return {
    password: hasPasswordProvider,
    passkeySupported: hasWebAuthn,
    passkey: hasRegisteredPasskey,
    biometrics: hasRegisteredPasskey,
    federatedProvider: hasFederatedProvider,
    federatedProviderId,
    federatedLabel: federatedProviderId ? getProviderDisplayName(federatedProviderId) : "",
    forgotPassword: hasPasswordProvider,
    credentials,
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

export async function registerPasskey(user, { label = "This device" } = {}) {
  if (!user?.uid) throw new Error("Sign in again before setting up a passkey.");
  if (typeof window === "undefined" || !window.PublicKeyCredential || !window.navigator?.credentials?.create) {
    throw new Error("Passkeys are not supported in this browser.");
  }

  const email = String(user.email || "").trim();
  const displayName = String(user.displayName || email || "ElimuLink User").trim();
  const publicKey = {
    challenge: createChallenge(),
    rp: {
      id: getRpId(),
      name: "ElimuLink",
    },
    user: {
      id: createChallenge(),
      name: email || `${user.uid}@elimulink.local`,
      displayName,
    },
    pubKeyCredParams: [
      { type: "public-key", alg: -7 },
      { type: "public-key", alg: -257 },
    ],
    timeout: 60_000,
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "required",
    },
    attestation: "none",
  };

  const credential = await window.navigator.credentials.create({ publicKey });
  const credentialId = credential?.rawId ? toBase64Url(credential.rawId) : "";
  if (!credentialId) throw new Error("Passkey setup did not return a usable credential.");

  const transports =
    typeof credential?.response?.getTransports === "function"
      ? credential.response.getTransports()
      : [];

  const current = resolvePasskeyStore(user.uid);
  const credentials = normalizePasskeyEntries(current.credentials).filter((entry) => entry.id !== credentialId);
  credentials.push({
    id: credentialId,
    transports,
    label: label || "This device",
    createdAt: Date.now(),
  });
  savePasskeyStore(user.uid, {
    registered: credentials.length > 0,
    credentials,
    updatedAt: Date.now(),
  });

  return {
    id: credentialId,
    label: label || "This device",
  };
}

export async function unlockWithPasskey(user) {
  if (!user?.uid) throw new Error("Your session is no longer available. Please sign in again.");
  if (typeof window === "undefined" || !window.PublicKeyCredential || !window.navigator?.credentials?.get) {
    throw new Error("Passkeys are not supported in this browser.");
  }

  const stored = resolvePasskeyStore(user.uid);
  const credentials = normalizePasskeyEntries(stored.credentials);
  if (!credentials.length) {
    throw new Error("No passkey is set up for this account on this device yet.");
  }

  const publicKey = {
    challenge: createChallenge(),
    timeout: 60_000,
    userVerification: "required",
    rpId: getRpId(),
    allowCredentials: credentials.map((entry) => ({
      type: "public-key",
      id: fromBase64Url(entry.id),
      transports: entry.transports.length ? entry.transports : undefined,
    })),
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
  if (capabilities.biometrics) {
    return unlockWithPasskey(user);
  }

  throw new Error("Biometric unlock is not set up on this device yet.");
}

export async function unlockWithProvider(user, providerId = null) {
  const selectedProviderId = providerId || getFirstFederatedProviderId(user);
  if (!selectedProviderId) throw new Error("Provider re-authentication is not available for this account.");
  const provider = buildProvider(user, selectedProviderId);
  if (!provider) throw new Error("Provider re-authentication is not available for this sign-in method.");
  await reauthenticateWithPopup(user, provider);
}
