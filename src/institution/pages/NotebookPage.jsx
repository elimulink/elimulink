import { useEffect, useMemo, useRef, useState } from "react";
import { auth } from "../../lib/firebase";
import { readScopedJson, writeScopedJson } from "../../lib/userScopedStorage";

const THEMES = [
  { key: "classic", name: "Classic", editorBg: "bg-white", boardBg: "bg-slate-100" },
  { key: "calm", name: "Calm", editorBg: "bg-slate-50", boardBg: "bg-slate-100" },
  { key: "paper", name: "Paper", editorBg: "bg-amber-50", boardBg: "bg-slate-100" },
];

const STICKY_COLORS = [
  { key: "yellow", cls: "bg-yellow-100 border-yellow-200" },
  { key: "blue", cls: "bg-blue-100 border-blue-200" },
  { key: "pink", cls: "bg-pink-100 border-pink-200" },
  { key: "green", cls: "bg-green-100 border-green-200" },
];

function nowIso() {
  return new Date().toISOString();
}

function prettyTime(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function uid() {
  return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
}

function defaultNotes(ownerUid) {
  const id = uid();
  return [
    {
      id,
      ownerUid,
      title: "Welcome Note",
      content: "Start writing your unit notes here.\n\nTip: Open the mobile menu for templates, insert, draw, and export tools.",
      pinned: true,
      updatedAt: nowIso(),
      createdAt: nowIso(),
    },
  ];
}

function defaultStickies(ownerUid) {
  return [
    { id: uid(), ownerUid, text: "Buy lab book", color: "yellow", createdAt: nowIso() },
    { id: uid(), ownerUid, text: "Revise Week 3 slides", color: "blue", createdAt: nowIso() },
  ];
}

function normalizeOwned(items, ownerUid) {
  if (!ownerUid || !Array.isArray(items)) return [];
  return items
    .map((item) => ({ ...item, ownerUid: item?.ownerUid || ownerUid }))
    .filter((item) => (item?.ownerUid || ownerUid) === ownerUid);
}

function ToolbarButton({ label, onClick, active = false }) {
  return (
    <button
      onClick={onClick}
      className={[
        "rounded-xl border px-3 py-2 text-sm font-medium transition",
        active
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
      ].join(" ")}
      type="button"
    >
      {label}
    </button>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4 4" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

export default function NotebookPage({ onBack = null }) {
  const [currentUid, setCurrentUid] = useState(auth.currentUser?.uid || null);
  const previousUidRef = useRef(auth.currentUser?.uid || null);
  const [isNotesPanelOpen, setIsNotesPanelOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("notes");
  const [theme, setTheme] = useState("classic");
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileScreen, setMobileScreen] = useState("landing");
  const [notes, setNotes] = useState(() => defaultNotes(currentUid));
  const [stickies, setStickies] = useState(() => defaultStickies(currentUid));
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef(null);
  const notesRef = useRef(notes);

  const themeObj = useMemo(() => THEMES.find((item) => item.key === theme) || THEMES[0], [theme]);

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      const nextUid = firebaseUser?.uid || null;
      const previousUid = previousUidRef.current;
      if (previousUid !== nextUid) {
        setNotes([]);
        setStickies([]);
        setSelectedId("");
        setQuery("");
        setMobileScreen("landing");
      }
      previousUidRef.current = nextUid;
      setCurrentUid(nextUid);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUid) {
      setNotes([]);
      setStickies([]);
      setSelectedId("");
      return;
    }
    const loadedNotes = normalizeOwned(
      readScopedJson(currentUid, "institution_notebook_notes", defaultNotes(currentUid)),
      currentUid
    );
    const loadedStickies = normalizeOwned(
      readScopedJson(currentUid, "elimulink_notebook_stickies", defaultStickies(currentUid)),
      currentUid
    );
    const savedSelected = readScopedJson(currentUid, "elimulink_notebook_selected", null);
    const nextNotes = loadedNotes.length > 0 ? loadedNotes : defaultNotes(currentUid);
    const nextStickies = loadedStickies.length > 0 ? loadedStickies : defaultStickies(currentUid);
    setNotes(nextNotes);
    setStickies(nextStickies);
    setSelectedId(
      nextNotes.some((item) => item.id === savedSelected) ? savedSelected : (nextNotes[0]?.id ?? "")
    );
  }, [currentUid]);

  useEffect(() => {
    if (!currentUid) return;
    writeScopedJson(currentUid, "elimulink_notebook_stickies", normalizeOwned(stickies, currentUid));
  }, [stickies, currentUid]);

  useEffect(() => {
    if (!currentUid || !selectedId) return;
    writeScopedJson(currentUid, "elimulink_notebook_selected", selectedId);
  }, [selectedId, currentUid]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const selectedNote = useMemo(
    () => notes.find((note) => note.id === selectedId) || notes[0] || null,
    [notes, selectedId]
  );

  const filteredNotes = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = [...notes].sort((a, b) => {
      if (a.pinned !== b.pinned) return Number(b.pinned) - Number(a.pinned);
      return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
    });
    if (!q) return list;
    return list.filter((note) => {
      const title = String(note.title || "").toLowerCase();
      const content = String(note.content || "").toLowerCase();
      return title.includes(q) || content.includes(q);
    });
  }, [notes, query]);

  const recentNotes = useMemo(() => filteredNotes.slice(0, 8), [filteredNotes]);
  const stickyPreview = useMemo(() => stickies.slice(0, 3), [stickies]);

  const mobileMenuItems = [
    { key: "notes", label: "Notes" },
    { key: "sticky", label: "Sticky Notes" },
    { key: "recent", label: "Recent Notes" },
    { key: "templates", label: "Templates" },
    { key: "draw", label: "Draw" },
    { key: "insert", label: "Insert" },
    { key: "export", label: "Export / Download" },
    { key: "settings", label: "Settings" },
  ];

  function scheduleSave() {
    if (!currentUid) return;
    setSaving(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      writeScopedJson(
        currentUid,
        "institution_notebook_notes",
        normalizeOwned(notesRef.current || [], currentUid)
      );
      setSaving(false);
    }, 500);
  }

  function createNote() {
    const id = uid();
    const note = {
      id,
      ownerUid: currentUid,
      title: "Untitled Note",
      content: "",
      pinned: false,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    setNotes((prev) => [note, ...prev]);
    setSelectedId(id);
    setMobileScreen("editor");
    setIsMobileMenuOpen(false);
    scheduleSave();
  }

  function deleteNote(id) {
    const next = notes.filter((note) => note.id !== id);
    setNotes(next);
    if (selectedId === id) {
      setSelectedId(next[0]?.id || "");
      setMobileScreen(next.length > 0 ? "editor" : "landing");
    }
    scheduleSave();
  }

  function togglePin(id) {
    if (!id) return;
    setNotes((prev) =>
      prev.map((note) => (note.id === id ? { ...note, pinned: !note.pinned, updatedAt: nowIso() } : note))
    );
    scheduleSave();
  }

  function updateSelected(patch) {
    if (!selectedNote) return;
    setNotes((prev) =>
      prev.map((note) =>
        note.id === selectedNote.id ? { ...note, ...patch, updatedAt: nowIso() } : note
      )
    );
    scheduleSave();
  }

  function addSticky() {
    setStickies((prev) => [
      { id: uid(), ownerUid: currentUid, text: "New sticky note...", color: "yellow", createdAt: nowIso() },
      ...prev,
    ]);
    setMobileScreen("sticky");
  }

  function updateSticky(id, patch) {
    setStickies((prev) => prev.map((sticky) => (sticky.id === id ? { ...sticky, ...patch } : sticky)));
  }

  function removeSticky(id) {
    setStickies((prev) => prev.filter((sticky) => sticky.id !== id));
  }

  function openNote(noteId) {
    setSelectedId(noteId);
    setMobileScreen("editor");
    setIsMobileMenuOpen(false);
  }

  function openStickyScreen() {
    setMobileScreen("sticky");
    setIsMobileMenuOpen(false);
  }

  function handleMobileMenuSelect(key) {
    if (key === "notes" || key === "recent") {
      setMobileScreen("landing");
      setIsMobileMenuOpen(false);
      return;
    }
    if (key === "sticky") {
      openStickyScreen();
      return;
    }
    setIsToolsOpen(true);
    setIsMobileMenuOpen(false);
  }

  return (
    <div className={`flex h-[100dvh] w-full flex-col overflow-x-hidden ${themeObj.boardBg} md:min-h-screen md:h-auto md:overflow-visible`}>
      <div className="md:hidden flex-1 overflow-x-hidden overflow-y-auto bg-[radial-gradient(circle_at_top,#163052_0%,#101a31_58%,#0b1220_100%)] text-white">
        <div className="sticky top-0 z-30 border-b border-white/8 bg-slate-950/78 backdrop-blur-xl">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <button
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/80"
                onClick={() => setIsMobileMenuOpen(true)}
                type="button"
                aria-label="Open notebook menu"
              >
                <MenuIcon />
              </button>
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-200/70">Notebook</div>
                <div className="truncate text-lg font-semibold">
                  {mobileScreen === "editor"
                    ? selectedNote?.title || "New note"
                    : mobileScreen === "sticky"
                      ? "Sticky Notes"
                      : "Notes"}
                </div>
              </div>
            </div>
            <div className="text-[11px] font-medium text-slate-300">
              {saving ? "Saving..." : "Saved"}
            </div>
          </div>
        </div>

        {mobileScreen === "landing" ? (
          <div className="px-4 pb-28 pt-5">
            <section className="rounded-[28px] border border-white/10 bg-white/[0.06] p-4 shadow-[0_18px_48px_rgba(2,8,23,0.28)] backdrop-blur">
              <h1 className="text-3xl font-semibold tracking-[-0.03em] text-white">Notes</h1>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Your notebook is now optimized for quick notes, sticky reminders, and focused writing on mobile.
              </p>
              <div className="relative mt-4">
                <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <SearchIcon />
                </div>
                <input
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/55 py-3 pl-11 pr-4 text-sm text-white outline-none placeholder:text-slate-500"
                  placeholder="Search notes"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </section>

            <section className="mt-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-white">All Notes</h2>
                  <p className="mt-1 text-xs text-slate-400">
                    {recentNotes.length} note{recentNotes.length === 1 ? "" : "s"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openStickyScreen}
                  className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold text-cyan-100"
                >
                  Sticky Notes
                </button>
              </div>

              <div className="space-y-3">
                {recentNotes.map((note) => (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => openNote(note.id)}
                    className="w-full rounded-[24px] border border-white/10 bg-white/[0.06] p-4 text-left shadow-[0_14px_35px_rgba(2,8,23,0.22)] transition hover:bg-white/[0.08]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-base font-semibold text-white">
                          {note.pinned ? "Pinned - " : ""}
                          {note.title || "Untitled Note"}
                        </div>
                        <div className="mt-2 line-clamp-2 text-sm leading-6 text-slate-300">
                          {note.content || "Tap to start writing."}
                        </div>
                      </div>
                      <div className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-slate-300">
                        {prettyTime(note.updatedAt)}
                      </div>
                    </div>
                  </button>
                ))}
                {recentNotes.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-white/12 bg-white/[0.04] px-4 py-10 text-center text-sm text-slate-400">
                    No notes found.
                  </div>
                ) : null}
              </div>
            </section>

            <section className="mt-6 rounded-[24px] border border-white/10 bg-white/[0.05] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-white">Sticky Notes</h2>
                  <p className="mt-1 text-xs text-slate-400">Quick reminders stay close to the top.</p>
                </div>
                <button
                  type="button"
                  onClick={openStickyScreen}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200"
                >
                  Open
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3">
                {stickyPreview.map((sticky) => {
                  const color = STICKY_COLORS.find((item) => item.key === sticky.color) || STICKY_COLORS[0];
                  return (
                    <div key={sticky.id} className={`rounded-[20px] border p-3 text-slate-900 ${color.cls}`}>
                      <div className="line-clamp-3 whitespace-pre-wrap text-sm leading-6">
                        {sticky.text}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <button
              type="button"
              onClick={createNote}
              className="fixed bottom-6 right-4 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-cyan-400 text-white shadow-[0_18px_35px_rgba(14,165,233,0.35)]"
              aria-label="Create new note"
            >
              <PlusIcon />
            </button>
          </div>
        ) : null}

        {mobileScreen === "editor" ? (
          <div className="px-4 pb-8 pt-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setMobileScreen("landing")}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/80"
                aria-label="Back to notes"
              >
                <BackIcon />
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => togglePin(selectedNote?.id)}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200"
                >
                  {selectedNote?.pinned ? "Pinned" : "Pin"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsToolsOpen(true)}
                  className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-100"
                >
                  More
                </button>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.06] shadow-[0_20px_45px_rgba(2,8,23,0.24)]">
              <div className="border-b border-white/8 px-4 py-4">
                <input
                  className="w-full bg-transparent text-xl font-semibold tracking-[-0.03em] text-white outline-none placeholder:text-slate-500"
                  value={selectedNote?.title || ""}
                  onChange={(e) => updateSelected({ title: e.target.value })}
                  placeholder="Untitled note"
                />
                <div className="mt-2 text-xs text-slate-400">
                  {selectedNote ? `Last updated ${prettyTime(selectedNote.updatedAt)}` : "Create a note to begin"}
                </div>
              </div>
              <div className="px-4 py-4">
                <textarea
                  className="min-h-[62dvh] w-full resize-none overflow-x-hidden rounded-[24px] border border-white/8 bg-slate-950/30 px-4 py-4 text-sm leading-7 text-slate-100 outline-none placeholder:text-slate-500"
                  value={selectedNote?.content || ""}
                  onChange={(e) => updateSelected({ content: e.target.value })}
                  placeholder="Write your note here..."
                />
              </div>
            </div>
          </div>
        ) : null}

        {mobileScreen === "sticky" ? (
          <div className="px-4 pb-8 pt-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setMobileScreen("landing")}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/80"
                aria-label="Back to notes"
              >
                <BackIcon />
              </button>
              <button
                type="button"
                onClick={addSticky}
                className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-100"
              >
                Add Sticky
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {stickies.map((sticky) => {
                const color = STICKY_COLORS.find((item) => item.key === sticky.color) || STICKY_COLORS[0];
                return (
                  <div key={sticky.id} className={`rounded-[24px] border p-4 text-slate-900 shadow-sm ${color.cls}`}>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <select
                        className="rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-xs outline-none"
                        value={sticky.color}
                        onChange={(e) => updateSticky(sticky.id, { color: e.target.value })}
                      >
                        {STICKY_COLORS.map((item) => (
                          <option key={item.key} value={item.key}>
                            {item.key}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => removeSticky(sticky.id)}
                        className="rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-700"
                      >
                        Delete
                      </button>
                    </div>

                    <textarea
                      className="min-h-[140px] w-full rounded-[18px] border border-slate-300 bg-white/70 px-3 py-3 text-sm leading-6 text-slate-900 outline-none"
                      value={sticky.text}
                      onChange={(e) => updateSticky(sticky.id, { text: e.target.value })}
                    />

                    <div className="mt-3 text-[11px] text-slate-600">
                      {prettyTime(sticky.createdAt)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {isMobileMenuOpen ? (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40 bg-black/55"
              onClick={() => setIsMobileMenuOpen(false)}
              aria-label="Close notebook menu overlay"
            />
            <aside className="fixed inset-y-0 left-0 z-50 flex w-[84vw] max-w-[320px] flex-col border-r border-white/10 bg-slate-950 px-4 py-5 shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-200/70">Notebook</div>
                  <div className="mt-1 text-xl font-semibold text-white">Workspace</div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/80"
                  aria-label="Close notebook menu"
                >
                  <CloseIcon />
                </button>
              </div>

              <div className="space-y-2">
                {mobileMenuItems.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleMobileMenuSelect(item.key)}
                    className={[
                      "flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-medium transition",
                      (item.key === "notes" && mobileScreen === "landing") ||
                      (item.key === "sticky" && mobileScreen === "sticky")
                        ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-100"
                        : "border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/[0.06]",
                    ].join(" ")}
                  >
                    <span>{item.label}</span>
                    <span className="text-xs text-slate-500">Open</span>
                  </button>
                ))}
              </div>

              <div className="mt-6 rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                <div className="text-sm font-semibold text-white">Quick create</div>
                <button
                  type="button"
                  onClick={createNote}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-400 px-4 py-3 text-sm font-semibold text-white"
                >
                  <PlusIcon />
                  <span>New Note</span>
                </button>
              </div>

              {onBack ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onBack();
                  }}
                  className="mt-auto rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-slate-200"
                >
                  Back
                </button>
              ) : null}
            </aside>
          </>
        ) : null}
      </div>

      <div className="hidden md:block">
        <div className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <button
                className="h-10 w-10 rounded-lg border border-slate-200 hover:bg-slate-50"
                onClick={() => setIsNotesPanelOpen((value) => !value)}
                title={isNotesPanelOpen ? "Collapse panel" : "Expand panel"}
                type="button"
              >
                <MenuIcon />
              </button>
              <div>
                <div className="text-lg font-semibold text-slate-900">Notebook</div>
                <div className="text-xs text-slate-500">
                  {saving ? "Saving..." : "Saved"} {selectedNote ? `- Last edit: ${prettyTime(selectedNote.updatedAt)}` : ""}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
              >
                {THEMES.map((item) => (
                  <option key={item.key} value={item.key}>
                    Theme: {item.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => alert("AI helper: Summarize / Quiz / Rewrite (wire later)")}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                type="button"
              >
                AI Helper
              </button>
              {onBack ? (
                <button
                  onClick={onBack}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  type="button"
                >
                  Back
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="hidden flex-1 overflow-y-auto overscroll-none touch-pan-y md:block md:overflow-visible">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-12 gap-6 px-6 py-6">
          <aside
            className={[
              "col-span-12 transition-all md:col-span-4 lg:col-span-3",
              isNotesPanelOpen ? "" : "md:col-span-1 lg:col-span-1",
            ].join(" ")}
          >
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 p-3">
                <div className="flex gap-2">
                  <button
                    className={[
                      "rounded-lg px-3 py-2 text-sm font-semibold",
                      activeTab === "notes" ? "bg-slate-900 text-white" : "border border-slate-200 bg-white",
                    ].join(" ")}
                    onClick={() => setActiveTab("notes")}
                    type="button"
                  >
                    Notes
                  </button>
                  <button
                    className={[
                      "rounded-lg px-3 py-2 text-sm font-semibold",
                      activeTab === "sticky" ? "bg-slate-900 text-white" : "border border-slate-200 bg-white",
                    ].join(" ")}
                    onClick={() => setActiveTab("sticky")}
                    type="button"
                  >
                    Sticky Notes
                  </button>
                </div>

                <button
                  onClick={activeTab === "notes" ? createNote : addSticky}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50"
                  type="button"
                >
                  {activeTab === "notes" ? "+ New" : "+ Add"}
                </button>
              </div>

              <div className="p-3">
                {activeTab === "notes" ? (
                  <>
                    <input
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none"
                      placeholder="Search notes..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />

                    <div className="mt-3 max-h-[520px] space-y-2 overflow-auto pr-1">
                      {filteredNotes.map((note) => (
                        <button
                          key={note.id}
                          onClick={() => setSelectedId(note.id)}
                          className={[
                            "w-full rounded-xl border p-3 text-left",
                            note.id === selectedId
                              ? "border-sky-300 bg-sky-50"
                              : "border-slate-200 bg-white hover:bg-slate-50",
                          ].join(" ")}
                          type="button"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="truncate font-semibold text-slate-900">
                                {note.pinned ? "Pinned - " : ""}
                                {note.title || "Untitled"}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {prettyTime(note.updatedAt)}
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={(event) => {
                                  event.stopPropagation();
                                  togglePin(note.id);
                                }}
                                className="h-8 w-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
                                title="Pin"
                                type="button"
                              >
                                P
                              </button>
                              <button
                                onClick={(event) => {
                                  event.stopPropagation();
                                  deleteNote(note.id);
                                }}
                                className="h-8 w-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
                                title="Delete"
                                type="button"
                              >
                                X
                              </button>
                            </div>
                          </div>
                        </button>
                      ))}
                      {filteredNotes.length === 0 ? (
                        <div className="p-3 text-sm text-slate-500">No notes found.</div>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <div className="grid max-h-[580px] grid-cols-1 gap-3 overflow-auto pr-1">
                    {stickies.map((sticky) => {
                      const color = STICKY_COLORS.find((item) => item.key === sticky.color) || STICKY_COLORS[0];
                      return (
                        <div key={sticky.id} className={`rounded-2xl border p-3 ${color.cls}`}>
                          <div className="flex items-center justify-between gap-2">
                            <select
                              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
                              value={sticky.color}
                              onChange={(e) => updateSticky(sticky.id, { color: e.target.value })}
                            >
                              {STICKY_COLORS.map((item) => (
                                <option key={item.key} value={item.key}>
                                  {item.key}
                                </option>
                              ))}
                            </select>

                            <button
                              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs hover:bg-slate-50"
                              onClick={() => removeSticky(sticky.id)}
                              type="button"
                            >
                              Remove
                            </button>
                          </div>

                          <textarea
                            className="mt-2 min-h-[90px] w-full rounded-xl border border-slate-200 bg-white/60 px-3 py-2 text-sm outline-none"
                            value={sticky.text}
                            onChange={(e) => updateSticky(sticky.id, { text: e.target.value })}
                          />
                          <div className="mt-2 text-[11px] text-slate-600">
                            {prettyTime(sticky.createdAt)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </aside>

          <main className="col-span-12 md:col-span-8 lg:col-span-9">
            <div className={`overflow-hidden rounded-2xl border border-slate-200 shadow-sm ${themeObj.editorBg}`}>
              <div className="max-h-[40dvh] overflow-auto border-b border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none md:max-w-xl"
                    value={selectedNote?.title || ""}
                    onChange={(e) => updateSelected({ title: e.target.value })}
                    placeholder="Note title..."
                  />

                  <div className="flex flex-wrap gap-2">
                    <ToolbarButton label="Bold" onClick={() => alert("Rich text later (TipTap/Quill)")} />
                    <ToolbarButton label="Italic" onClick={() => alert("Rich text later (TipTap/Quill)")} />
                    <ToolbarButton label="Underline" onClick={() => alert("Rich text later (TipTap/Quill)")} />
                    <ToolbarButton label="Insert Image" onClick={() => alert("Upload or insert image (wire later)")} />
                    <ToolbarButton label="Export" onClick={() => alert("Export PDF or DOCX (later)")} />
                  </div>
                </div>
              </div>

              <div className="p-4">
                <textarea
                  className="min-h-[520px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed outline-none"
                  value={selectedNote?.content || ""}
                  onChange={(e) => updateSelected({ content: e.target.value })}
                  placeholder="Write your note here..."
                />
              </div>
            </div>

            <div className="mt-4 text-xs text-slate-500">
              Phase 1: Local notes and sticky notes. Phase 2: Save to FastAPI and database.
            </div>
          </main>
        </div>
      </div>

      {isToolsOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/45"
            onClick={() => setIsToolsOpen(false)}
            aria-label="Close notebook tools"
          />
          <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-[28px] border border-white/10 bg-slate-950 text-white shadow-2xl md:hidden">
            <div className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-semibold text-white">Notebook Tools</div>
                <button
                  type="button"
                  onClick={() => setIsToolsOpen(false)}
                  className="text-xs text-slate-400"
                >
                  Done
                </button>
              </div>

              <div className="space-y-4">
                <input
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                  value={selectedNote?.title || ""}
                  onChange={(e) => updateSelected({ title: e.target.value })}
                  placeholder="Note title..."
                />

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => alert("Templates (wire later)")}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm font-medium text-slate-100"
                  >
                    Templates
                  </button>
                  <button
                    type="button"
                    onClick={() => alert("Insert image (wire later)")}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm font-medium text-slate-100"
                  >
                    Insert
                  </button>
                  <button
                    type="button"
                    onClick={() => alert("Draw tools (wire later)")}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm font-medium text-slate-100"
                  >
                    Draw
                  </button>
                  <button
                    type="button"
                    onClick={() => alert("Export PDF or DOCX (later)")}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm font-medium text-slate-100"
                  >
                    Export
                  </button>
                </div>

                <select
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-white outline-none"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                >
                  {THEMES.map((item) => (
                    <option key={item.key} value={item.key} className="text-slate-900">
                      Theme: {item.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
