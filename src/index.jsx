import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import HostRouter from './routing/HostRouter.jsx';
import './lib/apiUrl';
import './index.css';
import { applyThemeMode, getStoredThemeMode } from './lib/theme';

function ThemeBootstrap() {
  useEffect(() => {
    const sync = () => applyThemeMode(getStoredThemeMode());
    sync();

    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    const onMediaChange = () => {
      if (getStoredThemeMode() === "system") sync();
    };
    const onStorage = (event) => {
      if (event.key === "elimulink_theme_mode") sync();
    };
    const onThemeEvent = () => sync();

    media?.addEventListener?.("change", onMediaChange);
    window.addEventListener("storage", onStorage);
    window.addEventListener("elimulink-theme-change", onThemeEvent);
    return () => {
      media?.removeEventListener?.("change", onMediaChange);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("elimulink-theme-change", onThemeEvent);
    };
  }, []);

  return <HostRouter />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeBootstrap />
  </React.StrictMode>,
);
