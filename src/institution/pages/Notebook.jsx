import React, { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export default function Notebook({ user }) {
  const uid = user?.uid || null;
  const [notes, setNotes] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    if (!uid) {
      setNotes([]);
      setActiveId(null);
      return;
    }

    const notesRef = collection(db, 'users', uid, 'notes');
    const unsubscribe = onSnapshot(notesRef, (snapshot) => {
      const rows = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
      setNotes(rows);
      if (!activeId && rows.length) setActiveId(rows[0].id);
    });
    return () => unsubscribe();
  }, [uid, activeId]);

  const activeNote = useMemo(() => notes.find((n) => n.id === activeId) || null, [notes, activeId]);

  useEffect(() => {
    if (activeNote) {
      setTitle(activeNote.title || '');
      setContent(activeNote.content || '');
    } else {
      setTitle('');
      setContent('');
    }
  }, [activeNote]);

  const onCreate = async () => {
    if (!uid) return;
    const created = await addDoc(collection(db, 'users', uid, 'notes'), {
      title: 'Untitled',
      content: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    setActiveId(created.id);
  };

  const onSave = async () => {
    if (!uid || !activeId) return;
    await setDoc(
      doc(db, 'users', uid, 'notes', activeId),
      {
        title: title || 'Untitled',
        content: content || '',
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-1 rounded-xl border border-white/10 bg-slate-900/50 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Notebook</h2>
          <button type="button" onClick={onCreate} className="px-3 py-1.5 rounded-lg bg-sky-600 text-white text-sm hover:bg-sky-500">
            New
          </button>
        </div>
        <div className="space-y-2">
          {!notes.length ? (
            <p className="text-slate-300 text-sm">No notes yet.</p>
          ) : (
            notes.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => setActiveId(n.id)}
                className={`w-full text-left rounded-lg px-3 py-2 border border-white/10 hover:bg-white/5 ${n.id === activeId ? 'bg-white/5' : ''}`}
              >
                <div className="text-sm font-medium text-slate-100">{n.title || 'Untitled'}</div>
                <div className="text-xs text-slate-400 line-clamp-1">{n.content || ''}</div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="lg:col-span-2 rounded-xl border border-white/10 bg-slate-900/50 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">{activeId ? 'Edit Note' : 'Select a note'}</h3>
          <button
            type="button"
            onClick={onSave}
            disabled={!activeId}
            className="px-3 py-1.5 rounded-lg bg-sky-600 text-white text-sm hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save
          </button>
        </div>
        <div className="space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            disabled={!activeId}
            className="w-full rounded-lg bg-slate-950/60 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-500/40 disabled:opacity-60"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your note..."
            disabled={!activeId}
            rows={12}
            className="w-full rounded-lg bg-slate-950/60 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-500/40 disabled:opacity-60"
          />
          {!uid ? <p className="text-xs text-amber-300">Please login to use notebook.</p> : null}
        </div>
      </div>
    </div>
  );
}
