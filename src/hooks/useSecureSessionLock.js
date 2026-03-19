import { useEffect, useMemo, useState } from "react";
import {
  clearSessionLock,
  getSecureLockConfig,
  getSecureUnlockCapabilities,
  readSessionLock,
  requestSessionLock,
} from "../auth/secureLock";

function now() {
  return Date.now();
}

export default function useSecureSessionLock({ user, family = "ai", enabled = true } = {}) {
  const [lockState, setLockState] = useState(() => readSessionLock(user?.uid));
  const config = useMemo(() => getSecureLockConfig(), []);
  const capabilities = useMemo(() => getSecureUnlockCapabilities(user), [user]);

  useEffect(() => {
    if (!user?.uid || !enabled) {
      setLockState(null);
      return;
    }
    setLockState(readSessionLock(user.uid));
  }, [user?.uid, enabled]);

  useEffect(() => {
    if (!enabled || !user?.uid) return undefined;

    const storageKey = `elimulink_hidden_at:${family}:${user.uid}`;
    let idleTimer = null;

    const refreshIdleTimer = () => {
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => {
        const next = requestSessionLock({ uid: user.uid, family, reason: "idle" });
        setLockState(next);
      }, config.idleTimeoutMs);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        sessionStorage.setItem(storageKey, String(now()));
        return;
      }
      const hiddenAt = Number(sessionStorage.getItem(storageKey) || 0);
      sessionStorage.removeItem(storageKey);
      if (hiddenAt && now() - hiddenAt >= config.resumeTimeoutMs) {
        const next = requestSessionLock({ uid: user.uid, family, reason: "resume" });
        setLockState(next);
      }
      refreshIdleTimer();
    };

    const onLockEvent = (event) => {
      const reason = String(event?.detail?.reason || "manual");
      const next = requestSessionLock({ uid: user.uid, family, reason });
      setLockState(next);
    };

    const onShortcut = (event) => {
      const lockShortcut = (event.ctrlKey || event.metaKey) && event.shiftKey && String(event.key || "").toLowerCase() === "l";
      if (!lockShortcut) return;
      event.preventDefault();
      const next = requestSessionLock({ uid: user.uid, family, reason: "manual" });
      setLockState(next);
    };

    const activityEvents = ["mousemove", "keydown", "pointerdown", "touchstart", "focus"];
    activityEvents.forEach((name) => window.addEventListener(name, refreshIdleTimer, { passive: true }));
    window.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("elimulink:lock-session", onLockEvent);
    window.addEventListener("keydown", onShortcut);
    refreshIdleTimer();

    return () => {
      window.clearTimeout(idleTimer);
      activityEvents.forEach((name) => window.removeEventListener(name, refreshIdleTimer));
      window.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("elimulink:lock-session", onLockEvent);
      window.removeEventListener("keydown", onShortcut);
    };
  }, [config.idleTimeoutMs, config.resumeTimeoutMs, enabled, family, user?.uid]);

  return {
    lockState,
    setLocked(reason = "manual") {
      if (!user?.uid) return null;
      const next = requestSessionLock({ uid: user.uid, family, reason });
      setLockState(next);
      return next;
    },
    clearLock() {
      clearSessionLock(user?.uid);
      setLockState(null);
    },
    capabilities,
  };
}

