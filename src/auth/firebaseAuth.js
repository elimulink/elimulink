import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../lib/firebase";

export function watchFirebaseAuth(callback, errorCallback) {
  if (!auth) return () => {};
  return onAuthStateChanged(auth, callback, errorCallback);
}

export function getFirebaseUser() {
  return auth?.currentUser || null;
}

export async function getFirebaseIdToken(forceRefresh = false) {
  const user = auth?.currentUser || null;
  if (!user) return null;
  return user.getIdToken(forceRefresh);
}

export async function logoutFirebase() {
  if (!auth) return;
  await signOut(auth);
}
