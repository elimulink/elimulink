const SESSION_KEY = "elimulink_family_session";
const SESSION_CHANGE_EVENT = "elimulink_family_session_changed";

function emitSessionChange(action) {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(
      new CustomEvent(SESSION_CHANGE_EVENT, {
        detail: { action, session: loadAppSession() },
      }),
    );
  } catch {
    // ignore event dispatch failures
  }
}

export function saveAppSession(session) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    emitSessionChange("save");
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
    emitSessionChange("clear");
  } catch {
    // ignore storage failures
  }
}

export function subscribeAppSessionChanges(handler) {
  if (typeof window === "undefined") return () => {};

  const notify = (action, payload = {}) => {
    handler?.({
      action,
      source: payload.source || "local",
      newValue: payload.newValue ?? null,
      oldValue: payload.oldValue ?? null,
      session: payload.session ?? loadAppSession(),
    });
  };

  const onStorage = (event) => {
    if (event.key !== SESSION_KEY) return;
    notify(event.newValue ? "save" : "clear", {
      source: "storage",
      newValue: event.newValue,
      oldValue: event.oldValue,
    });
  };

  const onCustom = (event) => {
    const detail = event?.detail || {};
    notify(detail.action || "change", {
      source: "local",
      session: detail.session || loadAppSession(),
    });
  };

  window.addEventListener("storage", onStorage);
  window.addEventListener(SESSION_CHANGE_EVENT, onCustom);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(SESSION_CHANGE_EVENT, onCustom);
  };
}

export { SESSION_KEY };
