const SESSION_KEY = "elimulink_family_session";

export function saveAppSession(session) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // ignore storage failures
  }
}

export function loadAppSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearAppSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore storage failures
  }
}

export { SESSION_KEY };
