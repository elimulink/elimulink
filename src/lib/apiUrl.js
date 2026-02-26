import { getApiBase } from "./runtimeConfig";

export function apiBase() {
  return getApiBase();
}

export function apiUrl(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const base = apiBase();
  const fullUrl = base ? `${base}${normalizedPath}` : normalizedPath;

  if (normalizedPath === "/api/ai/student") {
    console.log("[AI_FETCH]", fullUrl);
  }

  return fullUrl;
}

if (typeof window !== "undefined" && !window.__ELIMULINK_ENV_RUNTIME_LOGGED__) {
  console.log("[API_BASE]", getApiBase());
  console.log("[AI_URL]", apiUrl("/api/ai/student"));
  console.log("[ENV_RUNTIME]", {
    MODE: import.meta.env.MODE,
    VITE_API_BASE: import.meta.env.VITE_API_BASE,
  });
  window.__ELIMULINK_ENV_RUNTIME_LOGGED__ = true;
}
