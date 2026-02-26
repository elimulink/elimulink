import { useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  FileImage,
  PencilLine,
  Plus,
  Sparkles,
  StickyNote,
  Trash2,
} from "lucide-react";

const PEN_THEMES = [
  { key: "slate", name: "Slate", textClass: "text-slate-800" },
  { key: "blue", name: "Blue", textClass: "text-sky-800" },
  { key: "green", name: "Green", textClass: "text-emerald-800" },
  { key: "violet", name: "Violet", textClass: "text-violet-800" },
];

const STICKY_COLORS = [
  "bg-yellow-100 border-yellow-200",
  "bg-blue-100 border-blue-200",
  "bg-pink-100 border-pink-200",
  "bg-green-100 border-green-200",
];

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatTime(ts) {
  return new Date(ts).toLocaleString();
}

export default function NotebookPage({ onBack }) {
  const [noteTitle, setNoteTitle] = useState("Notebook Draft");
  const [noteBody, setNoteBody] = useState("");
  const [penTheme, setPenTheme] = useState("slate");
  const [attachments, setAttachments] = useState([]);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [notes, setNotes] = useState([
    { id: makeId(), title: "Intro to Biology", updatedAt: Date.now() },
    { id: makeId(), title: "Assignment Ideas", updatedAt: Date.now() - 3600_000 },
  ]);
  const [stickies, setStickies] = useState([
    { id: makeId(), text: "Review chapter 4", color: STICKY_COLORS[0] },
    { id: makeId(), text: "Ask tutor about lab", color: STICKY_COLORS[1] },
  ]);

  const fileInputRef = useRef(null);
  const activePen = useMemo(
    () => PEN_THEMES.find((theme) => theme.key === penTheme) ?? PEN_THEMES[0],
    [penTheme]
  );

  const addAttachment = (files) => {
    if (!files || files.length === 0) return;
    const next = Array.from(files).map((file) => ({ id: makeId(), name: file.name }));
    setAttachments((prev) => [...prev, ...next]);
  };

  const addSticky = () => {
    setStickies((prev) => [
      { id: makeId(), text: "New sticky", color: STICKY_COLORS[prev.length % STICKY_COLORS.length] },
      ...prev,
    ]);
  };

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12">
        <button
          type="button"
          onClick={() => onBack?.()}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <ChevronLeft size={16} />
          Back to NewChat
        </button>
      </div>
      <section className={`col-span-12 ${isPanelCollapsed ? "lg:col-span-11" : "lg:col-span-9"}`}>
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 p-4 flex flex-wrap items-center gap-2 justify-between">
            <div className="min-w-[260px] flex-1">
              <input
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 outline-none"
                placeholder="Notebook title"
              />
              <p className="mt-1 text-xs text-slate-500">Typing space with quick tools for notes and AI drafting.</p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={penTheme}
                onChange={(e) => setPenTheme(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                {PEN_THEMES.map((theme) => (
                  <option key={theme.key} value={theme.key}>
                    Pen: {theme.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <FileImage size={16} />
                Upload Image
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => addAttachment(e.target.files)}
              />

              <button
                type="button"
                onClick={() => setNoteBody((prev) => `${prev}\n\nAI Suggestion: Expand this section with key points and an example.`)}
                className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800"
              >
                <Sparkles size={16} />
                AI Inside
              </button>
            </div>
          </div>

          {attachments.length > 0 ? (
            <div className="border-b border-slate-200 px-4 py-3">
              <p className="mb-2 text-xs font-semibold text-slate-500">Attached Images</p>
              <div className="flex flex-wrap gap-2">
                {attachments.map((attachment) => (
                  <span key={attachment.id} className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700">
                    {attachment.name}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="p-4">
            <textarea
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
              className={`min-h-[520px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed outline-none ${activePen.textClass}`}
              placeholder="Start writing your note here..."
            />
          </div>
        </div>
      </section>

      <aside className={`col-span-12 ${isPanelCollapsed ? "lg:col-span-1" : "lg:col-span-3"}`}>
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm h-full">
          <div className="border-b border-slate-200 bg-slate-50 p-3 flex items-center justify-between">
            {!isPanelCollapsed ? <p className="text-sm font-semibold text-slate-800">My Notes</p> : null}
            <button
              type="button"
              onClick={() => setIsPanelCollapsed((prev) => !prev)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              title={isPanelCollapsed ? "Expand" : "Collapse"}
            >
              {isPanelCollapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </button>
          </div>

          {!isPanelCollapsed ? (
            <div className="space-y-3 p-3">
              <button
                type="button"
                onClick={() => setNotes((prev) => [{ id: makeId(), title: "Untitled Note", updatedAt: Date.now() }, ...prev])}
                className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Plus size={16} />
                New Note
              </button>

              <div className="space-y-2">
                {notes.map((note) => (
                  <div key={note.id} className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                    <p className="truncate text-sm font-medium text-slate-800">{note.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatTime(note.updatedAt)}</p>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-200 pt-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800 inline-flex items-center gap-1">
                    <StickyNote size={16} />
                    Sticky Notes
                  </p>
                  <button
                    type="button"
                    onClick={addSticky}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                  >
                    <Plus size={12} />
                    Add
                  </button>
                </div>

                <div className="space-y-2">
                  {stickies.map((sticky) => (
                    <div key={sticky.id} className={`rounded-lg border p-2 ${sticky.color}`}>
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <PencilLine size={14} className="text-slate-600" />
                        <button
                          type="button"
                          onClick={() => setStickies((prev) => prev.filter((item) => item.id !== sticky.id))}
                          className="rounded p-1 text-slate-600 hover:bg-white/70"
                          title="Delete sticky"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <textarea
                        value={sticky.text}
                        onChange={(e) =>
                          setStickies((prev) =>
                            prev.map((item) =>
                              item.id === sticky.id ? { ...item, text: e.target.value } : item
                            )
                          )
                        }
                        className="min-h-[64px] w-full resize-none rounded border border-white/70 bg-white/65 p-2 text-xs text-slate-700 outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
