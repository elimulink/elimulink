import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import HostRouter from './routing/HostRouter.jsx';
import './lib/apiUrl';
import './index.css';
import { applyThemeMode, getStoredThemeMode } from './lib/theme';
import { PREFS_SETTINGS_KEY, getStoredLanguage, isRtlLanguage } from './lib/userSettings';

function ThemeBootstrap() {
  useEffect(() => {
    const syncTheme = () => applyThemeMode(getStoredThemeMode());
    const syncLanguage = () => {
      const language = getStoredLanguage("en");
      document.documentElement.setAttribute("lang", language);
      document.documentElement.setAttribute("dir", isRtlLanguage(language) ? "rtl" : "ltr");
    };
    const sync = () => {
      syncTheme();
      syncLanguage();
    };
    sync();

    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    const onMediaChange = () => {
      if (getStoredThemeMode() === "system") syncTheme();
    };
    const onStorage = (event) => {
      if (event.key === "elimulink_theme_mode") syncTheme();
      if (event.key === PREFS_SETTINGS_KEY) syncLanguage();
    };
    const onThemeEvent = () => syncTheme();
    const onPrefsEvent = () => syncLanguage();

    media?.addEventListener?.("change", onMediaChange);
    window.addEventListener("storage", onStorage);
    window.addEventListener("elimulink-theme-change", onThemeEvent);
    window.addEventListener("elimulink-preferences-change", onPrefsEvent);
    return () => {
      media?.removeEventListener?.("change", onMediaChange);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("elimulink-theme-change", onThemeEvent);
      window.removeEventListener("elimulink-preferences-change", onPrefsEvent);
    };
  }, []);

  return <HostRouter />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeBootstrap />
  </React.StrictMode>,
);
