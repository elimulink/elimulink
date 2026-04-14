let cachedUid = "";
let cachedToken = "";
let cachedTokenExpiresAt = 0;

function decodeJwtExpiryMs(token) {
  try {
    const part = String(token || "").split(".")[1];
    if (!part) return 0;
    const normalized = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const payload = JSON.parse(atob(padded));
    const exp = Number(payload?.exp || 0);
    return Number.isFinite(exp) && exp > 0 ? exp * 1000 : 0;
  } catch {
    return 0;
  }
}

export function clearCachedIdToken() {
  cachedUid = "";
  cachedToken = "";
  cachedTokenExpiresAt = 0;
}

export function primeCachedIdToken(uid, token) {
  const resolvedUid = String(uid || "").trim();
  const resolvedToken = String(token || "").trim();
  if (!resolvedUid || !resolvedToken) {
    clearCachedIdToken();
    return;
  }
  cachedUid = resolvedUid;
  cachedToken = resolvedToken;
  cachedTokenExpiresAt = decodeJwtExpiryMs(resolvedToken);
}

export function getCachedIdToken(uid) {
  const resolvedUid = String(uid || "").trim();
  if (!resolvedUid || !cachedToken || cachedUid !== resolvedUid) return "";
  if (cachedTokenExpiresAt && Date.now() > cachedTokenExpiresAt - 60_000) return "";
  return cachedToken;
}

export async function resolveWarmIdToken(auth) {
  const uid = String(auth?.currentUser?.uid || "").trim();
  const cached = getCachedIdToken(uid);
  if (cached) return cached;
  const user = auth?.currentUser || null;
  if (!user) return null;
  let token = await user.getIdToken().catch(() => null);
  if (!token) {
    token = await user.getIdToken(true).catch(() => null);
  }
  if (token) {
    primeCachedIdToken(uid, token);
  }
  return token;
}
