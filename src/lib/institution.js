import {
  collection,
  doc,
  getDocs,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
  addDoc,
  query,
  orderBy
} from "firebase/firestore";
import { db } from "./firebase";

// Get all departments for an institution
export async function getDepartments(institutionId) {
  const q = collection(db, `institutions/${institutionId}/departments`);
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Get or create a case for a student/department
export async function getOrCreateCase(institutionId, studentId, departmentId) {
  const caseId = `${studentId}_${departmentId}`;
  const caseRef = doc(db, `institutions/${institutionId}/cases/${caseId}`);
  const caseSnap = await getDoc(caseRef);
  if (!caseSnap.exists()) {
    await setDoc(caseRef, {
      institutionId,
      departmentId,
      studentId,
      status: "open",
      rating: null,
      createdAt: serverTimestamp(),
      lastMessageAt: serverTimestamp(),
      lastMessagePreview: "",
    });
  }
  return { id: caseId, ref: caseRef };
}

// Append a message to a case
export async function appendCaseMessage(institutionId, caseId, { from, text, tags, sentiment }) {
  const msgRef = collection(db, `institutions/${institutionId}/cases/${caseId}/messages`);
  await addDoc(msgRef, {
    from,
    text,
    tags: tags || [],
    sentiment: sentiment || null,
    createdAt: serverTimestamp(),
  });
}

// Update case meta fields
export async function updateCaseMeta(institutionId, caseId, meta) {
  const caseRef = doc(db, `institutions/${institutionId}/cases/${caseId}`);
  await updateDoc(caseRef, {
    ...meta,
    lastMessageAt: meta.lastMessageAt || serverTimestamp(),
  });
}
