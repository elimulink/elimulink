import {
  collection,
  doc,
  getDocs,
  setDoc,
  getDoc,
  serverTimestamp,
  addDoc,
  query,
  orderBy,
  where,
  limit,
} from "firebase/firestore";

// List cases for one or more departments.
export async function listCases(db, institutionId, departmentIdsOrId) {
  if (!institutionId || !departmentIdsOrId) return [];
  const departmentIds = Array.isArray(departmentIdsOrId) ? departmentIdsOrId.filter(Boolean) : [departmentIdsOrId];
  if (!departmentIds.length) return [];

  const col = collection(db, "institutions", institutionId, "cases");
  if (departmentIds.length > 1) {
    const snaps = await getDocs(col);
    return snaps.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((c) => departmentIds.includes(c.departmentId))
      .sort((a, b) => (b.lastUpdated?.seconds || 0) - (a.lastUpdated?.seconds || 0));
  }

  const q = query(col, where("departmentId", "==", departmentIds[0]), orderBy("lastUpdated", "desc"), limit(50));
  const snaps = await getDocs(q);
  return snaps.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Get a case and its messages.
export async function getCaseWithMessages(db, institutionId, caseId) {
  if (!institutionId || !caseId) return null;
  const caseRef = doc(db, "institutions", institutionId, "cases", caseId);
  const snap = await getDoc(caseRef);
  const caseData = snap.exists() ? { id: snap.id, ...snap.data() } : null;
  if (!caseData) return null;

  const col = collection(db, "institutions", institutionId, "cases", caseId, "messages");
  const q = query(col, orderBy("createdAt", "asc"), limit(500));
  const snaps = await getDocs(q);
  const messages = snaps.docs.map((d) => ({ id: d.id, ...d.data() }));
  return { caseData, messages };
}

// Add an admin remark (message).
export async function addAdminRemark(db, institutionId, caseId, payload) {
  const caseRef = doc(db, "institutions", institutionId, "cases", caseId);
  const caseSnap = await getDoc(caseRef);
  const caseData = caseSnap.exists() ? caseSnap.data() : null;
  if (!caseData) return;

  const col = collection(db, "institutions", institutionId, "cases", caseId, "messages");
  await addDoc(col, {
    from: payload?.from || "admin",
    text: payload?.text || "",
    createdAt: serverTimestamp(),
    departmentId: caseData.departmentId || payload?.departmentId || "general",
    visibility: payload?.visibility || "internal",
    ...(payload?.tags ? { tags: payload.tags } : {}),
    ...(payload?.sentiment ? { sentiment: payload.sentiment } : {}),
  });

  await setDoc(caseRef, { lastUpdated: serverTimestamp() }, { merge: true });
}

// Update case fields (status, rating, etc).
export async function updateCaseFields(db, institutionId, caseId, meta) {
  const caseRef = doc(db, "institutions", institutionId, "cases", caseId);
  await setDoc(caseRef, { ...meta, lastUpdated: serverTimestamp() }, { merge: true });
}

export function getInstitutionProfile() {
  return {};
}

export const listDepartmentCases = listCases;
export async function getCaseMessages(db, institutionId, caseId) {
  const data = await getCaseWithMessages(db, institutionId, caseId);
  return data?.messages || [];
}
export const appendCaseMessage = addAdminRemark;
export const updateCaseMeta = updateCaseFields;
