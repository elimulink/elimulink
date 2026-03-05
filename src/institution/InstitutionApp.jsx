import { useEffect, useState } from "react";
import NewChatLanding from "../pages/NewChatLanding";
import AdminAnalyticsLanding from "../pages/AdminAnalyticsLanding";

const INSTITUTION_HISTORY_KEY = "institutionMode";

function resolveModeFromHistory() {
  if (typeof window === "undefined") return "institution";
  return window.history.state?.[INSTITUTION_HISTORY_KEY] === "admin" ? "admin" : "institution";
}

export default function InstitutionApp({ userRole }) {
  const [mode, setMode] = useState(() => resolveModeFromHistory()); // institution | admin

  useEffect(() => {
    if (typeof window === "undefined") return;
    const currentState = window.history.state || {};
    const currentMode = currentState[INSTITUTION_HISTORY_KEY];
    if (currentMode !== "institution" && currentMode !== "admin") {
      window.history.replaceState(
        { ...currentState, [INSTITUTION_HISTORY_KEY]: "institution" },
        "",
        window.location.href
      );
    }

    const onPopState = () => {
      setMode(resolveModeFromHistory());
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  function openAdmin() {
    if (typeof window !== "undefined") {
      const currentState = window.history.state || {};
      window.history.pushState(
        { ...currentState, [INSTITUTION_HISTORY_KEY]: "admin" },
        "",
        window.location.href
      );
    }
    setMode("admin");
  }

  return mode === "admin" ? (
    <AdminAnalyticsLanding userRole={userRole} />
  ) : (
    <NewChatLanding onOpenAdmin={openAdmin} userRole={userRole} />
  );
}
