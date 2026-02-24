import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, getDocs, setDoc, getDoc, updateDoc, serverTimestamp, addDoc, query, orderBy } from "firebase/firestore";
import { browserLocalPersistence, getAuth, setPersistence } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const firebaseEnvVarMap = {
  VITE_FIREBASE_API_KEY: firebaseConfig.apiKey,
  VITE_FIREBASE_AUTH_DOMAIN: firebaseConfig.authDomain,
  VITE_FIREBASE_PROJECT_ID: firebaseConfig.projectId,
  VITE_FIREBASE_STORAGE_BUCKET: firebaseConfig.storageBucket,
  VITE_FIREBASE_MESSAGING_SENDER_ID: firebaseConfig.messagingSenderId,
  VITE_FIREBASE_APP_ID: firebaseConfig.appId,
  VITE_FIREBASE_MEASUREMENT_ID: firebaseConfig.measurementId,
};

const missingFirebaseVars = Object.entries(firebaseEnvVarMap)
  .filter(([, value]) => value === undefined || value === null || String(value).trim() === '')
  .map(([key]) => key);

if (missingFirebaseVars.length > 0) {
  console.error(`[FIREBASE] Missing Firebase env vars: ${missingFirebaseVars.join(', ')}`);
}

let app = null;
let db = null;
let auth = null;
let firebaseInitError = null;

if (missingFirebaseVars.length === 0) {
  try {
    console.log("FIREBASE projectId:", firebaseConfig.projectId);
    console.log("FIREBASE authDomain:", firebaseConfig.authDomain);
    console.log("FIREBASE apiKey first10:", (firebaseConfig.apiKey || "").slice(0, 10));
    console.log("FIREBASE apiKey last6:", (firebaseConfig.apiKey || "").slice(-6));
    console.log("USING FIREBASE API KEY:", import.meta.env.VITE_FIREBASE_API_KEY);
    console.log("USING AUTH DOMAIN:", import.meta.env.VITE_FIREBASE_AUTH_DOMAIN);
    console.log("ENV CHECK:", {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      mode: import.meta.env.MODE,
      baseUrl: import.meta.env.BASE_URL,
    });
    if (!import.meta.env.VITE_FIREBASE_API_KEY) {
      console.error("Missing VITE_FIREBASE_API_KEY. Check .env.local is being loaded.");
    }
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    await setPersistence(auth, browserLocalPersistence);
  } catch (error) {
    firebaseInitError = String(error?.message || error);
    console.error('[FIREBASE] Initialization failed:', firebaseInitError);
  }
}

export { app, db, auth };
export const appId = import.meta.env.VITE_APP_ID || 'elimulink-pro-v2';
export const firebaseMissingEnvVars = missingFirebaseVars;
export const firebaseInitErrorMessage = firebaseInitError;
