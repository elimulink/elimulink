import React, { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "../../lib/firebase";

function fmtTimestamp(value) {
  const d = value?.toDate?.();
  return d ? d.toLocaleString() : "--";
}

export default function InstitutionNotebook({
  user,
  userProfile,
  userRole,
  activeDepartmentId,
  activeDepartmentName,
}) {
  const [notes, setNotes] = useState([]);
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const institutionId = userProfile?.institutionId;
  const departmentId = activeDepartmentId || "general";
  const depFilter =
    departmentId === "general" ? ["general"] : Array.from(new Set([departmentId, "general"]));

  const selectedNote = useMemo(
    () => notes.find((n) => n.id === selectedNoteId) || null,
    [notes, selectedNoteId]
  );

  const loadNotes = async () => {
    if (!institutionId || !user?.uid) return;
    setLoading(true);
    setError("");
    try {
      const notesRef = collection(db, "institutions", institutionId, "notes");
      const q = query(
        notesRef,
        where("ownerUid", "==", user.uid),
        where("departmentId", "in", depFilter),
        orderBy("updatedAt", "desc"),
        limit(50)
      );
      const snap = await getDocs(q);
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setNotes(rows);
      if (!selectedNoteId && rows.length) {
        setSelectedNoteId(rows[0].id);
      }
    } catch (e) {
      setError("Failed to load notes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [institutionId, user?.uid, departmentId]);

  useEffect(() => {
    if (!selectedNote) {
      setTitle("");
      setContent("");
      return;
    }
    setTitle(selectedNote.title || "");
    setContent(selectedNote.content || "");
  }, [selectedNote]);

  const handleNew = () => {
    setSelectedNoteId(null);
    setTitle("");
    setContent("");
  };

  const handleSave = async () => {
    if (!institutionId || !user?.uid) {
      setError("Not authenticated");
      return;
    }
    setError("");
    try {
      const payload = {
        ownerUid: user.uid,
        ownerName: user?.displayName || "",
        departmentId,
        title: title || "Untitled note",
        content: content || "",
        updatedAt: serverTimestamp(),
      };

      if (selectedNoteId) {
        await setDoc(doc(db, "institutions", institutionId, "notes", selectedNoteId), payload, {
          merge: true,
        });
      } else {
        const created = await addDoc(collection(db, "institutions", institutionId, "notes"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        setSelectedNoteId(created.id);
      }
      await loadNotes();
    } catch (e) {
      setError("Failed to save note");
    }
  };

  const handleDelete = async () => {
    if (!institutionId || !selectedNoteId) return;
    setError("");
    try {
      await deleteDoc(doc(db, "institutions", institutionId, "notes", selectedNoteId));
      setSelectedNoteId(null);
      setTitle("");
      setContent("");
      await loadNotes();
    } catch (e) {
      setError("Failed to delete note");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="p-4 border-b border-white/10 text-xl font-bold text-sky-400">
        Notebook - {activeDepartmentName || "General"}
      </header>
      {error ? <div className="px-4 py-2 text-xs text-red-300">{error}</div> : null}

      <div className="flex flex-1 min-h-0">
        <aside className="w-full max-w-sm border-r border-white/10 p-4 overflow-y-auto">
          <button
            className="w-full mb-3 rounded border border-white/10 bg-slate-900 px-3 py-2 text-sm hover:bg-white/5"
            onClick={handleNew}
          >
            New
          </button>
          {loading ? <div className="text-xs text-slate-400">Loading...</div> : null}
          <div className="space-y-2">
            {notes.map((n) => (
              <button
                key={n.id}
                className={`w-full text-left rounded border p-3 ${
                  selectedNoteId === n.id
                    ? "border-sky-500 bg-sky-900/30"
                    : "border-white/10 bg-slate-900 hover:bg-white/5"
                }`}
                onClick={() => setSelectedNoteId(n.id)}
              >
                <div className="truncate text-sm font-semibold">{n.title || "Untitled note"}</div>
                <div className="mt-1 text-[11px] text-slate-400">{fmtTimestamp(n.updatedAt)}</div>
              </button>
            ))}
          </div>
        </aside>

        <main className="flex-1 p-4 flex flex-col gap-3">
          <input
            className="rounded border border-white/10 bg-slate-900 px-3 py-2 text-sm"
            placeholder="Note title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="flex-1 min-h-[260px] rounded border border-white/10 bg-slate-900 px-3 py-2 text-sm"
            placeholder="Write your note..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <button
              className="rounded bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
              onClick={handleSave}
            >
              Save
            </button>
            <button
              className="rounded border border-white/10 px-4 py-2 text-sm hover:bg-white/5 disabled:opacity-50"
              disabled={!selectedNoteId}
              onClick={handleDelete}
            >
              Delete
            </button>
            <div className="ml-auto text-xs text-slate-500">{userRole}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
