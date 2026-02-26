import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

export const firebaseMissingEnvVars = Object.entries(firebaseConfig)
  .filter(([, value]) => value === undefined || value === null || String(value).trim() === "")
  .map(([key]) => key);

let initError = null;

export const app = (() => {
  if (firebaseMissingEnvVars.length > 0) return null;
  try {
    return initializeApp(firebaseConfig);
  } catch (error) {
    initError = error;
    return null;
  }
})();

export const db = app ? getFirestore(app) : null;

export const auth = app ? getAuth(app) : null;

if (auth) {
  setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.error("[FIREBASE] Failed to set auth persistence:", error);
  });
}

export const appId = import.meta.env.VITE_APP_ID || "elimulink-pro-v2";

export const firebaseInitErrorMessage = initError
  ? String(initError?.message || initError)
  : (firebaseMissingEnvVars.length > 0
    ? `[FIREBASE] Missing Firebase env vars: ${firebaseMissingEnvVars.join(", ")}`
    : null);
