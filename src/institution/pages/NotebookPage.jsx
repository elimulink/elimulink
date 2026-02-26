import { useEffect, useMemo, useRef, useState } from "react";

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

function ToolbarButton({ label, onClick, active }) {
  return (
    <button
      onClick={onClick}
      className={[
        "px-3 py-2 rounded-lg text-sm border",
        active
          ? "bg-slate-900 text-white border-slate-900"
          : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700",
      ].join(" ")}
      type="button"
    >
      {label}
    </button>
  );
}

export default function NotebookPage({ onBack = null }) {
  const [isNotesPanelOpen, setIsNotesPanelOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("notes");
  const [theme, setTheme] = useState("classic");

  const [notes, setNotes] = useState(() => {
    const saved = localStorage.getItem("elimulink_notebook_notes");
    if (saved) return JSON.parse(saved);
    const id = uid();
    return [
      {
        id,
        title: "Welcome Note",
        content: "Start writing your unit notes here...\n\nTip: Use the toolbar above.",
        pinned: true,
        updatedAt: nowIso(),
        createdAt: nowIso(),
      },
    ];
  });

  const [stickies, setStickies] = useState(() => {
    const saved = localStorage.getItem("elimulink_notebook_stickies");
    if (saved) return JSON.parse(saved);
    return [
      { id: uid(), text: "Buy lab book", color: "yellow", createdAt: nowIso() },
      { id: uid(), text: "Revise Week 3 slides", color: "blue", createdAt: nowIso() },
    ];
  });

  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(() => {
    const last = localStorage.getItem("elimulink_notebook_selected");
    return last || (notes[0]?.id ?? "");
  });

  const [saving, setSaving] = useState(false);
  const saveTimer = useRef(null);

  const selectedNote = useMemo(
    () => notes.find((n) => n.id === selectedId) || notes[0],
    [notes, selectedId]
  );

  const themeObj = useMemo(() => THEMES.find((t) => t.key === theme) || THEMES[0], [theme]);

  useEffect(() => {
    localStorage.setItem("elimulink_notebook_notes", JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    localStorage.setItem("elimulink_notebook_stickies", JSON.stringify(stickies));
  }, [stickies]);

  useEffect(() => {
    if (selectedId) localStorage.setItem("elimulink_notebook_selected", selectedId);
  }, [selectedId]);

  function scheduleSave() {
    setSaving(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setSaving(false), 700);
  }

  function createNote() {
    const id = uid();
    const newNote = {
      id,
      title: "Untitled Note",
      content: "",
      pinned: false,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    setNotes((prev) => [newNote, ...prev]);
    setSelectedId(id);
    scheduleSave();
  }

  function deleteNote(id) {
    const next = notes.filter((n) => n.id !== id);
    setNotes(next);
    if (selectedId === id) setSelectedId(next[0]?.id || "");
    scheduleSave();
  }

  function togglePin(id) {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, pinned: !n.pinned, updatedAt: nowIso() } : n))
    );
    scheduleSave();
  }

  function updateSelected(patch) {
    if (!selectedNote) return;
    setNotes((prev) =>
      prev.map((n) =>
        n.id === selectedNote.id ? { ...n, ...patch, updatedAt: nowIso() } : n
      )
    );
    scheduleSave();
  }

  function addSticky() {
    setStickies((prev) => [
      { id: uid(), text: "New sticky note...", color: "yellow", createdAt: nowIso() },
      ...prev,
    ]);
  }

  function updateSticky(id, patch) {
    setStickies((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function removeSticky(id) {
    setStickies((prev) => prev.filter((s) => s.id !== id));
  }

  const filteredNotes = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = [...notes].sort((a, b) => Number(b.pinned) - Number(a.pinned));
    if (!q) return list;
    return list.filter((n) => (n.title || "").toLowerCase().includes(q));
  }, [notes, query]);

  return (
    <div className={`min-h-screen ${themeObj.boardBg}`}>
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              className="h-10 w-10 rounded-lg border border-slate-200 hover:bg-slate-50"
              onClick={() => setIsNotesPanelOpen((v) => !v)}
              title={isNotesPanelOpen ? "Collapse panel" : "Expand panel"}
              type="button"
            >
              ☰
            </button>
            <div>
              <div className="text-lg font-semibold text-slate-900">Notebook</div>
              <div className="text-xs text-slate-500">
                {saving ? "Saving..." : "Saved"}{" "}
                {selectedNote ? `• Last edit: ${prettyTime(selectedNote.updatedAt)}` : ""}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
            >
              {THEMES.map((t) => (
                <option key={t.key} value={t.key}>
                  Theme: {t.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => alert("AI helper: Summarize / Quiz / Rewrite (wire later)")}
              className="rounded-xl bg-slate-900 text-white px-4 py-2 text-sm font-semibold hover:bg-slate-800"
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

      <div className="mx-auto max-w-7xl px-6 py-6 grid grid-cols-12 gap-6">
        <aside
          className={[
            "col-span-12 md:col-span-4 lg:col-span-3 transition-all",
            isNotesPanelOpen ? "" : "md:col-span-1 lg:col-span-1",
          ].join(" ")}
        >
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  className={[
                    "px-3 py-2 rounded-lg text-sm font-semibold",
                    activeTab === "notes" ? "bg-slate-900 text-white" : "bg-white border border-slate-200",
                  ].join(" ")}
                  onClick={() => setActiveTab("notes")}
                  type="button"
                >
                  Notes
                </button>
                <button
                  className={[
                    "px-3 py-2 rounded-lg text-sm font-semibold",
                    activeTab === "sticky" ? "bg-slate-900 text-white" : "bg-white border border-slate-200",
                  ].join(" ")}
                  onClick={() => setActiveTab("sticky")}
                  type="button"
                >
                  Sticky Notes
                </button>
              </div>

              {activeTab === "notes" ? (
                <button
                  onClick={createNote}
                  className="px-3 py-2 rounded-lg text-sm font-semibold border border-slate-200 bg-white hover:bg-slate-50"
                  type="button"
                >
                  + New
                </button>
              ) : (
                <button
                  onClick={addSticky}
                  className="px-3 py-2 rounded-lg text-sm font-semibold border border-slate-200 bg-white hover:bg-slate-50"
                  type="button"
                >
                  + Add
                </button>
              )}
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

                  <div className="mt-3 space-y-2 max-h-[520px] overflow-auto pr-1">
                    {filteredNotes.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => setSelectedId(n.id)}
                        className={[
                          "w-full text-left rounded-xl border p-3",
                          n.id === selectedId
                            ? "border-sky-300 bg-sky-50"
                            : "border-slate-200 bg-white hover:bg-slate-50",
                        ].join(" ")}
                        type="button"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 truncate">
                              {n.pinned ? "📌 " : ""}
                              {n.title || "Untitled"}
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                              {prettyTime(n.updatedAt)}
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePin(n.id);
                              }}
                              className="h-8 w-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
                              title="Pin"
                              type="button"
                            >
                              📌
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNote(n.id);
                              }}
                              className="h-8 w-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
                              title="Delete"
                              type="button"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      </button>
                    ))}
                    {filteredNotes.length === 0 ? (
                      <div className="text-sm text-slate-500 p-3">No notes found.</div>
                    ) : null}
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-1 gap-3 max-h-[580px] overflow-auto pr-1">
                  {stickies.map((s) => {
                    const col = STICKY_COLORS.find((c) => c.key === s.color) || STICKY_COLORS[0];
                    return (
                      <div key={s.id} className={`rounded-2xl border p-3 ${col.cls}`}>
                        <div className="flex items-center justify-between gap-2">
                          <select
                            className="text-xs rounded-lg border border-slate-200 bg-white px-2 py-1"
                            value={s.color}
                            onChange={(e) => updateSticky(s.id, { color: e.target.value })}
                          >
                            {STICKY_COLORS.map((c) => (
                              <option key={c.key} value={c.key}>
                                {c.key}
                              </option>
                            ))}
                          </select>

                          <button
                            className="text-xs px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
                            onClick={() => removeSticky(s.id)}
                            type="button"
                          >
                            Remove
                          </button>
                        </div>

                        <textarea
                          className="mt-2 w-full min-h-[90px] rounded-xl border border-slate-200 bg-white/60 px-3 py-2 text-sm outline-none"
                          value={s.text}
                          onChange={(e) => updateSticky(s.id, { text: e.target.value })}
                        />
                        <div className="text-[11px] text-slate-600 mt-2">
                          {prettyTime(s.createdAt)}
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
          <div className={`rounded-2xl border border-slate-200 shadow-sm overflow-hidden ${themeObj.editorBg}`}>
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <div className="flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
                <input
                  className="w-full md:max-w-xl rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
                  value={selectedNote?.title || ""}
                  onChange={(e) => updateSelected({ title: e.target.value })}
                  placeholder="Note title..."
                />

                <div className="flex flex-wrap gap-2">
                  <ToolbarButton label="Bold" onClick={() => alert("Rich text later (TipTap/Quill)")} />
                  <ToolbarButton label="Italic" onClick={() => alert("Rich text later (TipTap/Quill)")} />
                  <ToolbarButton label="Underline" onClick={() => alert("Rich text later (TipTap/Quill)")} />
                  <ToolbarButton label="Insert Image" onClick={() => alert("Upload/insert image (wire later)")} />
                  <ToolbarButton label="Export" onClick={() => alert("Export PDF/DOCX (later)")} />
                </div>
              </div>
            </div>

            <div className="p-4">
              <textarea
                className="w-full min-h-[520px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none leading-relaxed"
                value={selectedNote?.content || ""}
                onChange={(e) => updateSelected({ content: e.target.value })}
                placeholder="Write your note here..."
              />
            </div>
          </div>

          <div className="mt-4 text-xs text-slate-500">
            Phase 1: Local notes + sticky notes. Phase 2: Save to FastAPI + database.
          </div>
        </main>
      </div>
    </div>
  );
}

'@ | Set-Content -Path src/institution/pages/NotebookPage.jsx -Encoding utf8"} to=functions.shell_command ￣色.commentary code=json
