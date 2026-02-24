import React, { useEffect, useMemo, useState } from "react";
import {
  Timestamp,
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "../../lib/firebase";

const STAFF_ROLES = ["staff", "departmentAdmin", "institution_admin", "superAdmin"];

function fmtDate(value) {
  const d = value?.toDate?.();
  return d ? d.toLocaleDateString() : "--";
}

export default function InstitutionAssignments({
  user,
  userProfile,
  userRole,
  activeDepartmentId,
  activeDepartmentName,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");

  const institutionId = userProfile?.institutionId;
  const departmentId = activeDepartmentId || "general";
  const canCreate = STAFF_ROLES.includes(userRole);
  const depFilter =
    departmentId === "general" ? ["general"] : Array.from(new Set([departmentId, "general"]));

  const loadAssignments = async () => {
    if (!institutionId) return;
    setLoading(true);
    setError("");
    try {
      const ref = collection(db, "institutions", institutionId, "assignments");
      const q = query(
        ref,
        where("departmentId", "in", depFilter),
        orderBy("createdAt", "desc"),
        limit(50)
      );
      const snap = await getDocs(q);
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      setError("Failed to load assignments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [institutionId, departmentId]);

  const handleCreate = async () => {
    if (!canCreate || !institutionId || !user?.uid || !title.trim()) return;
    setError("");
    try {
      await addDoc(collection(db, "institutions", institutionId, "assignments"), {
        departmentId: departmentId || "general",
        title: title.trim(),
        description: description.trim(),
        dueAt: dueDate ? Timestamp.fromDate(new Date(`${dueDate}T00:00:00`)) : null,
        createdAt: serverTimestamp(),
        createdByUid: user.uid,
        createdByRole: userRole,
      });
      setTitle("");
      setDescription("");
      setDueDate("");
      await loadAssignments();
    } catch (e) {
      setError("Failed to create assignment");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="p-4 border-b border-white/10 text-xl font-bold text-sky-400">
        Assignments - {activeDepartmentName || "General"}
      </header>
      {error ? <div className="px-4 py-2 text-xs text-red-300">{error}</div> : null}

      <div className="p-4 space-y-4">
        {canCreate ? (
          <div className="rounded border border-white/10 bg-slate-900 p-4">
            <div className="text-sm font-semibold mb-3">Create Assignment</div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              <input
                className="rounded border border-white/10 bg-slate-950 px-3 py-2 text-sm"
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <input
                className="rounded border border-white/10 bg-slate-950 px-3 py-2 text-sm"
                placeholder="Due date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
              <button
                className="rounded bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
                onClick={handleCreate}
              >
                Create
              </button>
            </div>
            <textarea
              className="mt-2 w-full rounded border border-white/10 bg-slate-950 px-3 py-2 text-sm"
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        ) : null}

        <div className="space-y-2">
          {loading ? <div className="text-xs text-slate-400">Loading...</div> : null}
          {!loading && !items.length ? (
            <div className="rounded border border-white/10 bg-slate-900 p-4 text-sm text-slate-400">
              No assignments yet.
            </div>
          ) : null}
          {items.map((a) => (
            <div key={a.id} className="rounded border border-white/10 bg-slate-900 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold">{a.title}</div>
                <div className="text-xs text-slate-400">Due: {fmtDate(a.dueAt)}</div>
              </div>
              <div className="mt-2 text-sm text-slate-300 whitespace-pre-wrap">{a.description || "-"}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
