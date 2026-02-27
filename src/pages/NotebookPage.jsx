import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ClipboardPaste,
  Copy,
  FileImage,
  Highlighter,
  Italic,
  List,
  ListOrdered,
  Palette,
  PaintBucket,
  Paintbrush,
  PencilLine,
  Plus,
  Replace,
  Rows3,
  Scissors,
  Search,
  Sparkles,
  StickyNote,
  Subscript,
  Superscript,
  Type,
  Trash2,
  Underline,
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

const NOTEBOOK_TABS = [
  { key: "file", label: "File" },
  { key: "home", label: "Home" },
  { key: "insert", label: "Insert" },
  { key: "draw", label: "Draw" },
  { key: "design", label: "Design" },
  { key: "layout", label: "Layout" },
];

const THEME_FONT_OPTIONS = [
  { key: "calibri-light", label: "Calibri Light", family: "'Calibri Light', Calibri, sans-serif", meta: "(Headings)" },
  { key: "calibri-body", label: "Calibri", family: "Calibri, sans-serif", meta: "(Body)" },
];

const ALL_FONT_OPTIONS = [
  { key: "calibri", label: "Calibri", family: "Calibri, sans-serif" },
  { key: "aptos", label: "Aptos", family: "Aptos, 'Segoe UI', sans-serif" },
  { key: "aptos-display", label: "Aptos Display", family: "'Aptos Display', Aptos, 'Segoe UI', sans-serif" },
  { key: "segoe-ui", label: "Segoe UI", family: "'Segoe UI', sans-serif" },
  { key: "times", label: "Times New Roman", family: "'Times New Roman', serif" },
  { key: "agency-fb", label: "Agency FB", family: "'Agency FB', 'Segoe UI', sans-serif" },
  { key: "algerian", label: "Algerian", family: "Algerian, 'Times New Roman', serif" },
  { key: "arial", label: "Arial", family: "Arial, sans-serif" },
  { key: "arial-black", label: "Arial Black", family: "'Arial Black', Arial, sans-serif" },
  { key: "arial-narrow", label: "Arial Narrow", family: "'Arial Narrow', Arial, sans-serif" },
  { key: "bahnschrift", label: "Bahnschrift", family: "Bahnschrift, 'Segoe UI', sans-serif" },
  { key: "georgia", label: "Georgia", family: "Georgia, serif" },
  { key: "cambria", label: "Cambria", family: "Cambria, serif" },
  { key: "garamond", label: "Garamond", family: "Garamond, serif" },
  { key: "tahoma", label: "Tahoma", family: "Tahoma, sans-serif" },
  { key: "verdana", label: "Verdana", family: "Verdana, sans-serif" },
];

const FONT_SIZE_PRESETS = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72];

const BULLET_LIBRARY = [
  { key: "none", label: "None", symbol: "", preview: "∅" },
  { key: "disc", label: "Solid Dot", symbol: "•", preview: "•" },
  { key: "circle", label: "Circle", symbol: "◦", preview: "◦" },
  { key: "square", label: "Square", symbol: "▪", preview: "▪" },
  { key: "diamond", label: "Diamond", symbol: "◆", preview: "◆" },
  { key: "star", label: "Star", symbol: "★", preview: "★" },
  { key: "arrow", label: "Arrow", symbol: "➤", preview: "➤" },
  { key: "check", label: "Check", symbol: "✓", preview: "✓" },
];

const NUMBERING_LIBRARY = [
  { key: "none", label: "None", style: "none", sample: "None" },
  { key: "decimal-dot", label: "1. 2. 3.", style: "decimal-dot", sample: "1. 2. 3." },
  { key: "decimal-paren", label: "1) 2) 3)", style: "decimal-paren", sample: "1) 2) 3)" },
  { key: "upper-roman", label: "I. II. III.", style: "upper-roman", sample: "I. II. III." },
  { key: "upper-alpha", label: "A. B. C.", style: "upper-alpha", sample: "A. B. C." },
  { key: "lower-alpha-paren", label: "a) b) c)", style: "lower-alpha-paren", sample: "a) b) c)" },
  { key: "lower-alpha-dot", label: "a. b. c.", style: "lower-alpha-dot", sample: "a. b. c." },
  { key: "lower-roman", label: "i. ii. iii.", style: "lower-roman", sample: "i. ii. iii." },
];

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatTime(ts) {
  return new Date(ts).toLocaleString();
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    if (char === "&") return "&amp;";
    if (char === "<") return "&lt;";
    if (char === ">") return "&gt;";
    if (char === '"') return "&quot;";
    return "&#39;";
  });
}

function toSafeFilename(value) {
  const normalized = String(value || "note")
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "")
    .replace(/\s+/g, "_");
  return normalized || "note";
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function downloadBlob(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  triggerDownload(blob, filename);
}

function normalizePdfText(value) {
  return String(value ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "?");
}

function escapePdfText(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrapLineByChars(line, maxChars) {
  const source = String(line ?? "");
  if (!source) return [""];
  const wrapped = [];
  let remaining = source;

  while (remaining.length > maxChars) {
    let splitAt = remaining.lastIndexOf(" ", maxChars);
    if (splitAt < Math.floor(maxChars * 0.45)) {
      splitAt = maxChars;
    }
    wrapped.push(remaining.slice(0, splitAt).trimEnd());
    remaining = remaining.slice(splitAt).trimStart();
  }

  wrapped.push(remaining);
  return wrapped;
}

function createPdfBlob({ title, body, exportedAt }) {
  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 48;
  const lineHeight = 16;
  const maxLinesPerPage = Math.max(1, Math.floor((pageHeight - margin * 2) / lineHeight));

  const safeTitle = normalizePdfText(title || "Untitled Note");
  const safeBody = normalizePdfText(body || "");
  const safeExportTime = normalizePdfText(exportedAt || "");

  const composedLines = [
    ...wrapLineByChars(safeTitle, 70),
    "",
    ...safeBody.split("\n").flatMap((line) => wrapLineByChars(line, 92)),
    "",
    `Exported: ${safeExportTime}`,
  ];

  const pages = [];
  for (let i = 0; i < composedLines.length; i += maxLinesPerPage) {
    pages.push(composedLines.slice(i, i + maxLinesPerPage));
  }
  if (pages.length === 0) pages.push([""]);

  const pageCount = pages.length;
  const fontObjectNumber = 3 + pageCount * 2;
  const objects = new Array(fontObjectNumber + 1).fill("");

  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = `<< /Type /Pages /Count ${pageCount} /Kids [${pages
    .map((_, pageIndex) => `${3 + pageIndex * 2} 0 R`)
    .join(" ")}] >>`;

  const encoder = new TextEncoder();
  const byteLength = (value) => encoder.encode(value).length;

  pages.forEach((pageLines, pageIndex) => {
    const pageObjectNumber = 3 + pageIndex * 2;
    const contentObjectNumber = 4 + pageIndex * 2;
    const streamLines = ["BT", "/F1 12 Tf", `${margin} ${pageHeight - margin} Td`];

    pageLines.forEach((line, lineIndex) => {
      if (lineIndex > 0) streamLines.push(`0 -${lineHeight} Td`);
      streamLines.push(`(${escapePdfText(line)}) Tj`);
    });

    streamLines.push("ET");
    const streamBody = streamLines.join("\n");

    objects[pageObjectNumber] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] ` +
      `/Resources << /Font << /F1 ${fontObjectNumber} 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`;
    objects[contentObjectNumber] = `<< /Length ${byteLength(streamBody)} >>\nstream\n${streamBody}\nendstream`;
  });

  objects[fontObjectNumber] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";

  const pdfHeader = "%PDF-1.4\n%\u00E2\u00E3\u00CF\u00D3\n";
  const offsets = new Array(fontObjectNumber + 1).fill(0);
  const parts = [pdfHeader];
  let currentOffset = byteLength(pdfHeader);

  for (let objectNumber = 1; objectNumber <= fontObjectNumber; objectNumber += 1) {
    offsets[objectNumber] = currentOffset;
    const objectBody = `${objectNumber} 0 obj\n${objects[objectNumber]}\nendobj\n`;
    parts.push(objectBody);
    currentOffset += byteLength(objectBody);
  }

  const xrefOffset = currentOffset;
  let xrefTable = `xref\n0 ${fontObjectNumber + 1}\n0000000000 65535 f \n`;
  for (let objectNumber = 1; objectNumber <= fontObjectNumber; objectNumber += 1) {
    xrefTable += `${String(offsets[objectNumber]).padStart(10, "0")} 00000 n \n`;
  }

  const trailer = `trailer\n<< /Size ${fontObjectNumber + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  parts.push(xrefTable, trailer);

  return new Blob(parts, { type: "application/pdf" });
}

function toRoman(value, lowercase = false) {
  const n = Number(value);
  if (!n || n < 1) return "";
  const map = [
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let num = n;
  let out = "";
  for (const [v, s] of map) {
    while (num >= v) {
      out += s;
      num -= v;
    }
  }
  return lowercase ? out.toLowerCase() : out;
}

function toAlpha(value, uppercase = false) {
  let num = Number(value);
  if (!num || num < 1) return "";
  let out = "";
  while (num > 0) {
    num -= 1;
    out = String.fromCharCode((num % 26) + 97) + out;
    num = Math.floor(num / 26);
  }
  return uppercase ? out.toUpperCase() : out;
}

function RibbonIconButton({ icon: Icon, label, onClick, active = false }) {
  return (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      title={label}
      className={[
        "group relative inline-flex h-8 w-8 items-center justify-center rounded-md border transition",
        active
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
      ].join(" ")}
    >
      <Icon size={13} />
      <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-1.5 py-0.5 text-[10px] text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
        {label}
      </span>
    </button>
  );
}

export default function NotebookPage({ onBack }) {
  const [noteTitle, setNoteTitle] = useState("Note_ElimuLink_1_2026");
  const [noteBody, setNoteBody] = useState("");
  const [activeNotebookTab, setActiveNotebookTab] = useState("home");
  const [penTheme, setPenTheme] = useState("slate");
  const [customPenColor, setCustomPenColor] = useState("#1e40af");
  const [headerSearch, setHeaderSearch] = useState("");
  const [fontFamily, setFontFamily] = useState("Calibri, sans-serif");
  const [fontSizePx, setFontSizePx] = useState(16);
  const [fontSizeInput, setFontSizeInput] = useState("16");
  const [recentFonts, setRecentFonts] = useState(["Times New Roman"]);
  const [isFontMenuOpen, setIsFontMenuOpen] = useState(false);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [hasTextEffect, setHasTextEffect] = useState(false);
  const [fontColor, setFontColor] = useState("#0f172a");
  const [highlightColor, setHighlightColor] = useState("#fef3c7");
  const [editorAlign, setEditorAlign] = useState("left");
  const [isEditorShaded, setIsEditorShaded] = useState(false);
  const [hasEditorBorder, setHasEditorBorder] = useState(true);
  const [copiedFormat, setCopiedFormat] = useState(null);
  const [isFormatPainterArmed, setIsFormatPainterArmed] = useState(false);
  const [isBulletMenuOpen, setIsBulletMenuOpen] = useState(false);
  const [bulletSymbol, setBulletSymbol] = useState("-");
  const [bulletLevel, setBulletLevel] = useState(0);
  const [isNumberMenuOpen, setIsNumberMenuOpen] = useState(false);
  const [numberingStyle, setNumberingStyle] = useState("decimal-dot");
  const [numberingLevel, setNumberingLevel] = useState(0);
  const [lineSpacing, setLineSpacing] = useState("normal");
  const [pageWidth, setPageWidth] = useState("normal");
  const [pageTone, setPageTone] = useState("plain");
  const [downloadFormat, setDownloadFormat] = useState("pdf");
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
  const colorInputRef = useRef(null);
  const highlightColorInputRef = useRef(null);
  const fontColorInputRef = useRef(null);
  const fontMenuRef = useRef(null);
  const bulletMenuRef = useRef(null);
  const numberMenuRef = useRef(null);
  const noteBodyRef = useRef(null);
  const selectionRangeRef = useRef(null);
  const activePen = useMemo(
    () => PEN_THEMES.find((theme) => theme.key === penTheme) ?? PEN_THEMES[0],
    [penTheme]
  );
  const lineSpacingClass =
    lineSpacing === "tight" ? "leading-6" : lineSpacing === "wide" ? "leading-9" : "leading-8";
  const pageWidthClass =
    pageWidth === "compact" ? "max-w-3xl" : pageWidth === "wide" ? "max-w-none" : "max-w-4xl";
  const pageToneClass =
    pageTone === "warm" ? "bg-amber-50" : pageTone === "cool" ? "bg-sky-50" : "bg-white";
  const editorBorderClass = hasEditorBorder ? "border-slate-200" : "border-transparent";

  useEffect(() => {
    setFontSizeInput(String(fontSizePx));
  }, [fontSizePx]);

  useEffect(() => {
    const onDocumentMouseDown = (event) => {
      const target = event.target;
      if (fontMenuRef.current && !fontMenuRef.current.contains(target)) {
        setIsFontMenuOpen(false);
      }
      if (bulletMenuRef.current && !bulletMenuRef.current.contains(target)) {
        setIsBulletMenuOpen(false);
      }
      if (numberMenuRef.current && !numberMenuRef.current.contains(target)) {
        setIsNumberMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocumentMouseDown);
    return () => document.removeEventListener("mousedown", onDocumentMouseDown);
  }, []);

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

  const renameNoteById = (noteId) => {
    const target = notes.find((note) => note.id === noteId);
    if (!target) return;
    const nextTitle = window.prompt("Edit note title", target.title || "Untitled Note");
    if (nextTitle === null) return;
    const normalized = nextTitle.trim();
    if (!normalized) return;
    setNotes((prev) =>
      prev.map((note) =>
        note.id === noteId ? { ...note, title: normalized, updatedAt: Date.now() } : note
      )
    );
  };

  const deleteNoteById = (noteId) => {
    setNotes((prev) => prev.filter((note) => note.id !== noteId));
  };

  const syncEditorTextState = () => {
    const editor = noteBodyRef.current;
    if (!editor) return "";
    const text = (editor.innerText || "").replace(/\u00A0/g, " ");
    setNoteBody(text);
    return text;
  };

  const saveSelectionRange = () => {
    const editor = noteBodyRef.current;
    if (!editor) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return;
    selectionRangeRef.current = range.cloneRange();
  };

  const restoreSelectionRange = () => {
    const editor = noteBodyRef.current;
    const cachedRange = selectionRangeRef.current;
    if (!editor || !cachedRange) return;
    const selection = window.getSelection();
    if (!selection) return;
    selection.removeAllRanges();
    selection.addRange(cachedRange);
  };

  const hasSelectionInEditor = () => {
    const editor = noteBodyRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) return false;
    const range = selection.getRangeAt(0);
    return editor.contains(range.commonAncestorContainer) && !range.collapsed;
  };

  const runEditorCommand = (
    command,
    value = null,
    { requireSelection = false, emptySelectionMessage = "Select text first." } = {}
  ) => {
    const editor = noteBodyRef.current;
    if (!editor) return false;
    editor.focus();
    restoreSelectionRange();
    if (requireSelection && !hasSelectionInEditor()) {
      window.alert(emptySelectionMessage);
      return false;
    }
    document.execCommand("styleWithCSS", false, true);
    const applied = document.execCommand(command, false, value);
    if (!applied && command === "hiliteColor") {
      document.execCommand("backColor", false, value);
    }
    saveSelectionRange();
    syncEditorTextState();
    return true;
  };

  const insertTextAtCursor = (text) => {
    runEditorCommand("insertText", text);
  };

  const handleCopySelection = async () => {
    const editor = noteBodyRef.current;
    if (!editor) return;
    editor.focus();
    restoreSelectionRange();
    const selection = window.getSelection();
    const selected = selection?.toString() || "";
    if (!selected) return;
    try {
      await navigator.clipboard.writeText(selected);
    } catch {
      // no-op for unsupported environments
    }
  };

  const handleCutSelection = async () => {
    const editor = noteBodyRef.current;
    if (!editor) return;
    editor.focus();
    restoreSelectionRange();
    const selection = window.getSelection();
    const selected = selection?.toString() || "";
    if (!selected) return;
    try {
      await navigator.clipboard.writeText(selected);
    } catch {
      // no-op
    }
    runEditorCommand("delete", null, {
      requireSelection: true,
      emptySelectionMessage: "Select text to cut.",
    });
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) insertTextAtCursor(text);
    } catch {
      window.alert("Clipboard read not allowed in this browser yet.");
    }
  };

  const copyCurrentFormat = () => {
    setCopiedFormat({
      fontFamily,
      fontSizePx,
      isBold,
      isItalic,
      isUnderline,
      hasTextEffect,
      fontColor,
      highlightColor,
      lineSpacing,
      editorAlign,
    });
    setIsFormatPainterArmed(true);
  };

  const applyCopiedFormat = () => {
    if (!copiedFormat) return;
    const legacySize =
      copiedFormat.fontSizePx <= 10 ? 1 :
      copiedFormat.fontSizePx <= 13 ? 2 :
      copiedFormat.fontSizePx <= 16 ? 3 :
      copiedFormat.fontSizePx <= 18 ? 4 :
      copiedFormat.fontSizePx <= 24 ? 5 :
      copiedFormat.fontSizePx <= 32 ? 6 : 7;
    const fontName = copiedFormat.fontFamily.split(",")[0].replace(/['"]/g, "");
    const applied = runEditorCommand("fontName", fontName, {
      requireSelection: true,
      emptySelectionMessage: "Select text to apply copied format.",
    });
    if (!applied) return;
    runEditorCommand("fontSize", String(legacySize));
    if (copiedFormat.isBold) runEditorCommand("bold");
    if (copiedFormat.isItalic) runEditorCommand("italic");
    if (copiedFormat.isUnderline) runEditorCommand("underline");
    if (copiedFormat.fontColor) runEditorCommand("foreColor", copiedFormat.fontColor);
    if (copiedFormat.highlightColor) runEditorCommand("hiliteColor", copiedFormat.highlightColor);

    setFontFamily(copiedFormat.fontFamily);
    setFontSizePx(copiedFormat.fontSizePx);
    setIsBold(copiedFormat.isBold);
    setIsItalic(copiedFormat.isItalic);
    setIsUnderline(copiedFormat.isUnderline);
    setHasTextEffect(copiedFormat.hasTextEffect);
    setFontColor(copiedFormat.fontColor);
    setHighlightColor(copiedFormat.highlightColor);
    setLineSpacing(copiedFormat.lineSpacing);
    setEditorAlign(copiedFormat.editorAlign);
    setIsFormatPainterArmed(false);
  };

  const setFontAndTrack = (nextFamily, nextLabel) => {
    const fontName = nextLabel || nextFamily.split(",")[0].replace(/['"]/g, "");
    const applied = runEditorCommand("fontName", fontName, {
      requireSelection: true,
      emptySelectionMessage: "Select text to apply this font.",
    });
    if (!applied) return;
    setFontFamily(nextFamily);
    if (nextLabel) {
      setRecentFonts((prev) => {
        const deduped = [nextLabel, ...prev.filter((item) => item !== nextLabel)];
        return deduped.slice(0, 5);
      });
    }
    setIsFontMenuOpen(false);
  };

  const applyFontSize = (value) => {
    const next = Number(value);
    if (!Number.isFinite(next)) return;
    const clamped = Math.max(8, Math.min(144, Math.round(next)));
    const legacySize =
      clamped <= 10 ? 1 :
      clamped <= 13 ? 2 :
      clamped <= 16 ? 3 :
      clamped <= 18 ? 4 :
      clamped <= 24 ? 5 :
      clamped <= 32 ? 6 : 7;
    const applied = runEditorCommand("fontSize", String(legacySize), {
      requireSelection: true,
      emptySelectionMessage: "Select text to apply this size.",
    });
    if (!applied) return;
    setFontSizePx(clamped);
    setFontSizeInput(String(clamped));
  };

  const applyListStyleToSelection = (tagName, listStyleType) => {
    if (!listStyleType) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    let node = range.commonAncestorContainer;
    if (node.nodeType === Node.TEXT_NODE) {
      node = node.parentElement;
    }
    const listElement = node?.closest?.(tagName);
    if (listElement) {
      listElement.style.listStyleType = listStyleType;
    }
  };

  const resolveBulletListStyle = (bulletKey) => {
    if (bulletKey === "circle") return "circle";
    if (bulletKey === "square") return "square";
    return "disc";
  };

  const resolveNumberingListStyle = (style) => {
    if (style === "upper-roman") return "upper-roman";
    if (style === "upper-alpha") return "upper-alpha";
    if (style === "lower-alpha-paren" || style === "lower-alpha-dot") return "lower-alpha";
    if (style === "lower-roman") return "lower-roman";
    return "decimal";
  };

  const handleFontSizeInputKeyDown = (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    applyFontSize(fontSizeInput);
  };

  const stripLinePrefix = (line) =>
    line.replace(/^\s*([-*•◦▪◆★➤✓]|o|\[\]|<>|->|v|\d+[.)]|[A-Za-z]+[.)]|[ivxlcdm]+[.)])\s+/i, "");
  const removeListFormatting = (text) =>
    text
      .split("\n")
      .map((line) => (line.trim() ? stripLinePrefix(line) : line))
      .join("\n");

  const formatNumberToken = (index, style, customTemplate = null) => {
    const n = index + 1;
    if (customTemplate) return customTemplate.replace(/\{n\}/g, String(n));
    if (style === "decimal-dot") return `${n}.`;
    if (style === "decimal-paren") return `${n})`;
    if (style === "upper-roman") return `${toRoman(n)}.`;
    if (style === "upper-alpha") return `${toAlpha(n, true)}.`;
    if (style === "lower-alpha-paren") return `${toAlpha(n)})`;
    if (style === "lower-alpha-dot") return `${toAlpha(n)}.`;
    if (style === "lower-roman") return `${toRoman(n, true)}.`;
    return `${n}.`;
  };

  const applyBulletList = (symbol = bulletSymbol, bulletKey = null) => {
    if (!symbol || bulletKey === "none") {
      runEditorCommand("insertUnorderedList", null, {
        requireSelection: true,
        emptySelectionMessage: "Select text to apply bullet formatting.",
      });
      return;
    }
    setBulletSymbol(symbol);
    const applied = runEditorCommand("insertUnorderedList", null, {
      requireSelection: true,
      emptySelectionMessage: "Select text to apply bullet formatting.",
    });
    if (applied) {
      applyListStyleToSelection("ul", resolveBulletListStyle(bulletKey));
    }
  };

  const applyNumberedList = (style = numberingStyle) => {
    if (style === "none") {
      runEditorCommand("insertOrderedList", null, {
        requireSelection: true,
        emptySelectionMessage: "Select text to apply numbering.",
      });
      return;
    }
    setNumberingStyle(style);
    const applied = runEditorCommand("insertOrderedList", null, {
      requireSelection: true,
      emptySelectionMessage: "Select text to apply numbering.",
    });
    if (applied) {
      applyListStyleToSelection("ol", resolveNumberingListStyle(style));
    }
  };

  const defineCustomBullet = () => {
    const next = window.prompt("Define new bullet symbol", bulletSymbol || "-");
    if (next === null) return;
    const normalized = next.trim();
    if (!normalized) return;
    setBulletSymbol(normalized);
    applyBulletList(normalized, "custom");
    setIsBulletMenuOpen(false);
  };

  const defineCustomNumberFormat = () => {
    const template = window.prompt('Define number format (use "{n}" placeholder)', "{n})");
    if (template === null) return;
    const normalized = template.trim();
    if (!normalized || !normalized.includes("{n}")) return;
    window.alert("Custom numbering templates are not supported in rich mode yet. Applied decimal numbering.");
    applyNumberedList("decimal-dot");
    setIsNumberMenuOpen(false);
  };

  const selectEditorTextRangeByOffsets = (startOffset, endOffset) => {
    const editor = noteBodyRef.current;
    if (!editor) return false;
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
    let currentOffset = 0;
    let startNode = null;
    let endNode = null;
    let startInNode = 0;
    let endInNode = 0;
    let node = walker.nextNode();

    while (node) {
      const length = node.nodeValue?.length || 0;
      const nodeStart = currentOffset;
      const nodeEnd = currentOffset + length;

      if (!startNode && startOffset <= nodeEnd) {
        startNode = node;
        startInNode = Math.max(0, startOffset - nodeStart);
      }

      if (startNode && endOffset <= nodeEnd) {
        endNode = node;
        endInNode = Math.max(0, endOffset - nodeStart);
        break;
      }

      currentOffset = nodeEnd;
      node = walker.nextNode();
    }

    if (!startNode) return false;
    if (!endNode) {
      endNode = startNode;
      endInNode = startInNode;
    }

    const selection = window.getSelection();
    if (!selection) return false;
    const range = document.createRange();
    range.setStart(startNode, startInNode);
    range.setEnd(endNode, endInNode);
    selection.removeAllRanges();
    selection.addRange(range);
    selectionRangeRef.current = range.cloneRange();
    editor.focus();
    return true;
  };

  const handleFind = () => {
    const query = window.prompt("Find text");
    if (!query) return;
    const text = syncEditorTextState();
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx < 0) {
      window.alert(`"${query}" not found.`);
      return;
    }
    const selected = selectEditorTextRangeByOffsets(idx, idx + query.length);
    if (!selected) {
      window.alert("Could not highlight match, but it was found.");
    }
  };

  const handleReplace = () => {
    const query = window.prompt("Find text");
    if (!query) return;
    const replacement = window.prompt("Replace with", "");
    if (replacement === null) return;
    const regex = new RegExp(escapeRegExp(query), "gi");
    const currentText = syncEditorTextState();
    const matches = currentText.match(regex) || [];
    if (matches.length === 0) {
      window.alert(`"${query}" not found.`);
      return;
    }
    const editor = noteBodyRef.current;
    if (!editor) return;
    const nextText = currentText.replace(regex, replacement);
    editor.textContent = nextText;
    setNoteBody(nextText);
    selectionRangeRef.current = null;
    window.alert(`Replaced ${matches.length} occurrence(s).`);
  };

  const handleDownloadNote = () => {
    const baseName = toSafeFilename(noteTitle);
    const title = noteTitle?.trim() || "Untitled Note";
    const body = syncEditorTextState() || "";
    const exportedAt = new Date().toLocaleString();

    if (downloadFormat === "pdf") {
      const pdfBlob = createPdfBlob({ title, body, exportedAt });
      triggerDownload(pdfBlob, `${baseName}.pdf`);
      return;
    }

    if (downloadFormat === "txt") {
      const plainText = `${title}\n\n${body}\n\nExported: ${exportedAt}\n`;
      downloadBlob(plainText, `${baseName}.txt`, "text/plain;charset=utf-8");
      return;
    }

    const htmlTitle = escapeHtml(title);
    const htmlBody = escapeHtml(body).replace(/\n/g, "<br>");
    const htmlTime = escapeHtml(exportedAt);
    const docContent = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${htmlTitle}</title>
  </head>
  <body>
    <h1>${htmlTitle}</h1>
    <p>${htmlBody}</p>
    <hr />
    <p><strong>Exported:</strong> ${htmlTime}</p>
  </body>
</html>`;
    downloadBlob(docContent, `${baseName}.doc`, "application/msword;charset=utf-8");
  };

  const applyStylePreset = (preset) => {
    if (preset === "normal") {
      runEditorCommand("removeFormat", null, {
        requireSelection: true,
        emptySelectionMessage: "Select text to apply style.",
      });
      return;
    }
    if (preset === "nospacing") {
      runEditorCommand("removeFormat", null, {
        requireSelection: true,
        emptySelectionMessage: "Select text to apply style.",
      });
      return;
    }
    if (preset === "heading") {
      runEditorCommand("formatBlock", "H2", {
        requireSelection: true,
        emptySelectionMessage: "Select text to apply style.",
      });
    }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-100 p-4 md:p-6">
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="sticky top-0 z-30">
          <div className="border-b border-slate-700 bg-slate-950 px-3 py-2 text-white">
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
              <div className="inline-flex items-center gap-2 min-w-0">
                <span className="h-7 w-7 rounded-md bg-emerald-500 text-white text-xs font-semibold inline-flex items-center justify-center shrink-0">
                  E
                </span>
                <span className="text-xs font-semibold tracking-wide text-white">ElimuLink</span>
              </div>

              <div className="px-2">
                <input
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  className="mx-auto block h-9 w-full max-w-[420px] rounded-lg border border-slate-700 bg-slate-900 px-3 text-center text-xs font-semibold text-white outline-none placeholder:text-slate-400 focus:border-sky-400"
                  placeholder="Note title"
                />
              </div>

              <div className="relative min-w-[190px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                <input
                  value={headerSearch}
                  onChange={(e) => setHeaderSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && headerSearch.trim()) {
                      window.alert(`Search "${headerSearch}" will be wired to backend later.`);
                    }
                  }}
                  className="h-9 w-full rounded-lg border border-slate-700 bg-slate-900 pl-9 pr-3 text-xs text-white outline-none placeholder:text-slate-400 focus:border-sky-400"
                  placeholder="Search"
                />
              </div>
            </div>
          </div>

          <div className="border-b border-slate-200 bg-white px-2 pt-2">
            <div className="flex flex-wrap items-center gap-1">
              {NOTEBOOK_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveNotebookTab(tab.key)}
                  className={[
                    "rounded-t-lg px-3 py-2 text-sm font-medium border",
                    activeNotebookTab === tab.key
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100",
                  ].join(" ")}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="mt-2 border-t border-slate-200 bg-slate-50 p-3">
              {activeNotebookTab === "file" ? (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setNotes((prev) => [{ id: makeId(), title: "Untitled Note", updatedAt: Date.now() }, ...prev])}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    New
                  </button>
                  <button
                    type="button"
                    onClick={() => window.alert("Save is local for now. Backend later.")}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Save
                  </button>
                  <select
                    value={downloadFormat}
                    onChange={(e) => setDownloadFormat(e.target.value)}
                    className="h-[42px] rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none"
                    title="Download format"
                  >
                    <option value="pdf">PDF (.pdf)</option>
                    <option value="doc">Word (.doc)</option>
                    <option value="txt">Text (.txt)</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleDownloadNote}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Download
                  </button>
                </div>
              ) : null}

              {activeNotebookTab === "home" ? (
                <div className="rounded-lg border border-slate-200 bg-white px-2 py-1.5">
                  <div className="flex flex-wrap items-center gap-1">
                    <div className="flex items-center gap-1 pr-2 mr-1 border-r border-slate-200">
                      <RibbonIconButton icon={ClipboardPaste} label="Paste" onClick={handlePasteClipboard} />
                      <RibbonIconButton icon={Scissors} label="Cut" onClick={handleCutSelection} />
                      <RibbonIconButton icon={Copy} label="Copy" onClick={handleCopySelection} />
                      <RibbonIconButton
                        icon={Paintbrush}
                        label={isFormatPainterArmed ? "Apply Format Painter" : "Format Painter"}
                        onClick={() => (isFormatPainterArmed ? applyCopiedFormat() : copyCurrentFormat())}
                        active={isFormatPainterArmed}
                      />
                    </div>

                    <div className="flex items-center gap-1 pr-2 mr-1 border-r border-slate-200">
                      <div ref={fontMenuRef} className="relative">
                        <button
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => setIsFontMenuOpen((prev) => !prev)}
                          className="h-8 w-[130px] rounded-md border border-slate-200 bg-slate-50 px-2 text-xs text-slate-700 outline-none inline-flex items-center justify-between hover:bg-slate-100"
                          title="Font family"
                        >
                          <span className="truncate">{fontFamily.split(",")[0].replace(/['"]/g, "")}</span>
                          <ChevronDown size={12} />
                        </button>
                        {isFontMenuOpen ? (
                          <div className="absolute left-0 top-9 z-30 w-[250px] rounded-lg border border-slate-200 bg-white shadow-lg p-2">
                            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 px-1">Theme Fonts</div>
                            <div className="mt-1 space-y-1">
                              {THEME_FONT_OPTIONS.map((font) => (
                                <button
                                  key={font.key}
                                  type="button"
                                  onMouseDown={(event) => event.preventDefault()}
                                  onClick={() => setFontAndTrack(font.family, font.label)}
                                  className="w-full rounded-md px-2 py-1.5 text-left hover:bg-slate-100"
                                >
                                  <div className="text-xs text-slate-800" style={{ fontFamily: font.family }}>{font.label}</div>
                                  <div className="text-[10px] text-slate-500">{font.meta}</div>
                                </button>
                              ))}
                            </div>

                            {recentFonts.length > 0 ? (
                              <>
                                <div className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 px-1">Recently Used Fonts</div>
                                <div className="mt-1 space-y-1">
                                  {recentFonts.map((label) => {
                                    const found = [...THEME_FONT_OPTIONS, ...ALL_FONT_OPTIONS].find((f) => f.label === label);
                                    return (
                                      <button
                                        key={`recent-${label}`}
                                        type="button"
                                        onMouseDown={(event) => event.preventDefault()}
                                        onClick={() => setFontAndTrack(found?.family || fontFamily, label)}
                                        className="w-full rounded-md px-2 py-1.5 text-left text-xs text-slate-800 hover:bg-slate-100"
                                        style={{ fontFamily: found?.family || "inherit" }}
                                      >
                                        {label}
                                      </button>
                                    );
                                  })}
                                </div>
                              </>
                            ) : null}

                            <div className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 px-1">All Fonts</div>
                            <div className="mt-1 max-h-40 overflow-auto smart-scrollbar space-y-1">
                              {ALL_FONT_OPTIONS.map((font) => (
                                <button
                                  key={font.key}
                                  type="button"
                                  onMouseDown={(event) => event.preventDefault()}
                                  onClick={() => setFontAndTrack(font.family, font.label)}
                                  className="w-full rounded-md px-2 py-1.5 text-left text-xs text-slate-800 hover:bg-slate-100"
                                  style={{ fontFamily: font.family }}
                                >
                                  {font.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>

                      <div className="relative">
                        <input
                          value={fontSizeInput}
                          onChange={(e) => setFontSizeInput(e.target.value)}
                          onBlur={() => setFontSizeInput(String(fontSizePx))}
                          onKeyDown={handleFontSizeInputKeyDown}
                          list="font-size-presets"
                          className="h-8 w-[62px] rounded-md border border-slate-200 bg-slate-50 px-2 text-xs text-slate-700 outline-none"
                          title="Font size"
                        />
                        <datalist id="font-size-presets">
                          {FONT_SIZE_PRESETS.map((size) => (
                            <option key={size} value={size} />
                          ))}
                        </datalist>
                      </div>

                      <RibbonIconButton
                        icon={Bold}
                        label="Bold"
                        onClick={() =>
                          runEditorCommand("bold", null, {
                            requireSelection: true,
                            emptySelectionMessage: "Select text to make bold.",
                          })
                        }
                        active={false}
                      />
                      <RibbonIconButton
                        icon={Italic}
                        label="Italic"
                        onClick={() =>
                          runEditorCommand("italic", null, {
                            requireSelection: true,
                            emptySelectionMessage: "Select text to italicize.",
                          })
                        }
                        active={false}
                      />
                      <RibbonIconButton
                        icon={Underline}
                        label="Underline"
                        onClick={() =>
                          runEditorCommand("underline", null, {
                            requireSelection: true,
                            emptySelectionMessage: "Select text to underline.",
                          })
                        }
                        active={false}
                      />
                      <RibbonIconButton
                        icon={Subscript}
                        label="Subscript"
                        onClick={() =>
                          runEditorCommand("subscript", null, {
                            requireSelection: true,
                            emptySelectionMessage: "Select text to apply subscript.",
                          })
                        }
                      />
                      <RibbonIconButton
                        icon={Superscript}
                        label="Superscript"
                        onClick={() =>
                          runEditorCommand("superscript", null, {
                            requireSelection: true,
                            emptySelectionMessage: "Select text to apply superscript.",
                          })
                        }
                      />
                      <RibbonIconButton
                        icon={Type}
                        label="Text Effects"
                        onClick={() =>
                          runEditorCommand("hiliteColor", highlightColor, {
                            requireSelection: true,
                            emptySelectionMessage: "Select text to apply text effect.",
                          })
                        }
                        active={false}
                      />
                      <RibbonIconButton icon={Highlighter} label="Highlight Color" onClick={() => highlightColorInputRef.current?.click()} />
                      <RibbonIconButton icon={Palette} label="Font Color" onClick={() => fontColorInputRef.current?.click()} />
                    </div>

                    <div className="flex items-center gap-1 pr-2 mr-1 border-r border-slate-200">
                      <div ref={bulletMenuRef} className="relative">
                        <RibbonIconButton icon={List} label="Bullets" onClick={() => setIsBulletMenuOpen((prev) => !prev)} active={isBulletMenuOpen} />
                        {isBulletMenuOpen ? (
                          <div className="absolute left-0 top-9 z-30 w-[260px] rounded-lg border border-slate-200 bg-white shadow-lg p-2">
                            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 px-1">Bullet Library</div>
                            <div className="mt-1 grid grid-cols-2 gap-1">
                              {BULLET_LIBRARY.map((item) => (
                                <button
                                  key={item.key}
                                  type="button"
                                  onMouseDown={(event) => event.preventDefault()}
                                  onClick={() => {
                                    setBulletSymbol(item.symbol);
                                    setIsBulletMenuOpen(false);
                                    applyBulletList(item.symbol, item.key);
                                  }}
                                  className={[
                                    "rounded-md border px-2 py-1.5 text-left text-xs transition",
                                    bulletSymbol === item.symbol
                                      ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                                      : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
                                  ].join(" ")}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="inline-flex h-5 w-5 items-center justify-center rounded border border-slate-200 bg-white text-sm leading-none">
                                      {item.preview}
                                    </span>
                                    <span>{item.label}</span>
                                  </div>
                                </button>
                              ))}
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                              <button
                                type="button"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => setBulletLevel((prev) => Math.max(0, prev - 1))}
                                className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-100"
                              >
                                Level -
                              </button>
                              <span className="text-[11px] text-slate-500">Level {bulletLevel + 1}</span>
                              <button
                                type="button"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => setBulletLevel((prev) => Math.min(5, prev + 1))}
                                className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-100"
                              >
                                Level +
                              </button>
                            </div>
                            <button
                              type="button"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={defineCustomBullet}
                              className="mt-2 w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100"
                            >
                              Define New Bullet...
                            </button>
                          </div>
                        ) : null}
                      </div>

                      <div ref={numberMenuRef} className="relative">
                        <RibbonIconButton icon={ListOrdered} label="Numbering" onClick={() => setIsNumberMenuOpen((prev) => !prev)} active={isNumberMenuOpen} />
                        {isNumberMenuOpen ? (
                          <div className="absolute left-0 top-9 z-30 w-[290px] rounded-lg border border-slate-200 bg-white shadow-lg p-2">
                            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 px-1">Numbering Library</div>
                            <div className="mt-1 grid grid-cols-2 gap-1">
                              {NUMBERING_LIBRARY.map((item) => (
                                <button
                                  key={item.key}
                                  type="button"
                                  onMouseDown={(event) => event.preventDefault()}
                                  onClick={() => {
                                    setNumberingStyle(item.style);
                                    setIsNumberMenuOpen(false);
                                    applyNumberedList(item.style);
                                  }}
                                  className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100"
                                >
                                  {item.sample}
                                </button>
                              ))}
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                              <button
                                type="button"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => setNumberingLevel((prev) => Math.max(0, prev - 1))}
                                className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-100"
                              >
                                Level -
                              </button>
                              <span className="text-[11px] text-slate-500">Level {numberingLevel + 1}</span>
                              <button
                                type="button"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => setNumberingLevel((prev) => Math.min(5, prev + 1))}
                                className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-100"
                              >
                                Level +
                              </button>
                            </div>
                            <button
                              type="button"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={defineCustomNumberFormat}
                              className="mt-2 w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100"
                            >
                              Define New Number Format...
                            </button>
                          </div>
                        ) : null}
                      </div>
                      <RibbonIconButton
                        icon={AlignLeft}
                        label="Align Left"
                        onClick={() => {
                          setEditorAlign("left");
                          runEditorCommand("justifyLeft");
                        }}
                        active={editorAlign === "left"}
                      />
                      <RibbonIconButton
                        icon={AlignCenter}
                        label="Align Center"
                        onClick={() => {
                          setEditorAlign("center");
                          runEditorCommand("justifyCenter");
                        }}
                        active={editorAlign === "center"}
                      />
                      <RibbonIconButton
                        icon={AlignRight}
                        label="Align Right"
                        onClick={() => {
                          setEditorAlign("right");
                          runEditorCommand("justifyRight");
                        }}
                        active={editorAlign === "right"}
                      />
                      <select
                        value={lineSpacing}
                        onChange={(e) => setLineSpacing(e.target.value)}
                        className="h-8 w-[82px] rounded-md border border-slate-200 bg-slate-50 px-2 text-xs text-slate-700 outline-none"
                        title="Line spacing"
                      >
                        <option value="tight">Tight</option>
                        <option value="normal">Normal</option>
                        <option value="wide">Wide</option>
                      </select>
                      <RibbonIconButton icon={PaintBucket} label="Shading" onClick={() => setIsEditorShaded((prev) => !prev)} active={isEditorShaded} />
                      <RibbonIconButton icon={Rows3} label="Borders" onClick={() => setHasEditorBorder((prev) => !prev)} active={hasEditorBorder} />
                    </div>

                    <div className="flex items-center gap-1">
                      <select
                        onChange={(e) => applyStylePreset(e.target.value)}
                        defaultValue="normal"
                        className="h-8 w-[106px] rounded-md border border-slate-200 bg-slate-50 px-2 text-xs text-slate-700 outline-none"
                        title="Styles"
                      >
                        <option value="normal">Normal</option>
                        <option value="nospacing">No Spacing</option>
                        <option value="heading">Heading</option>
                      </select>
                      <RibbonIconButton icon={Search} label="Find" onClick={handleFind} />
                      <RibbonIconButton icon={Replace} label="Replace" onClick={handleReplace} />
                      <RibbonIconButton
                        icon={Sparkles}
                        label="ElimuLinkAI for Notebook"
                        onClick={() => insertTextAtCursor("\n\nElimuLinkAI: Suggested structure, examples, and key revision points.")}
                      />
                    </div>
                  </div>
                  <input
                    ref={highlightColorInputRef}
                    type="color"
                    value={highlightColor}
                    onChange={(e) => {
                      const next = e.target.value;
                      setHighlightColor(next);
                      runEditorCommand("hiliteColor", next, {
                        requireSelection: true,
                        emptySelectionMessage: "Select text to apply highlight.",
                      });
                    }}
                    className="sr-only"
                  />
                  <input
                    ref={fontColorInputRef}
                    type="color"
                    value={fontColor}
                    onChange={(e) => {
                      const next = e.target.value;
                      setFontColor(next);
                      runEditorCommand("foreColor", next, {
                        requireSelection: true,
                        emptySelectionMessage: "Select text to apply font color.",
                      });
                    }}
                    className="sr-only"
                  />
                </div>
              ) : null}

              {activeNotebookTab === "insert" ? (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <FileImage size={16} />
                    Upload Image
                  </button>
                  <button
                    type="button"
                    onClick={() => insertTextAtCursor(`\n${new Date().toLocaleString()}`)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Insert Date/Time
                  </button>
                </div>
              ) : null}

              {activeNotebookTab === "draw" ? (
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={penTheme}
                    onChange={(e) => {
                      const next = e.target.value;
                      setPenTheme(next);
                      if (next === "custom") {
                        setTimeout(() => colorInputRef.current?.click(), 0);
                      }
                    }}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                  >
                    {PEN_THEMES.map((theme) => (
                      <option key={theme.key} value={theme.key}>
                        Pen: {theme.name}
                      </option>
                    ))}
                    <option value="custom">Pen: Custom</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => {
                      setPenTheme("custom");
                      colorInputRef.current?.click();
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    title="More pen colors"
                  >
                    <Palette size={16} />
                    More Colors
                  </button>
                </div>
              ) : null}

              {activeNotebookTab === "design" ? (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPageTone("plain")}
                    className={[
                      "rounded-lg border px-3 py-2 text-sm",
                      pageTone === "plain"
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    Plain
                  </button>
                  <button
                    type="button"
                    onClick={() => setPageTone("warm")}
                    className={[
                      "rounded-lg border px-3 py-2 text-sm",
                      pageTone === "warm"
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    Warm
                  </button>
                  <button
                    type="button"
                    onClick={() => setPageTone("cool")}
                    className={[
                      "rounded-lg border px-3 py-2 text-sm",
                      pageTone === "cool"
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    Cool
                  </button>
                </div>
              ) : null}

              {activeNotebookTab === "layout" ? (
                <div className="flex flex-wrap items-center gap-2">
                  <label className="text-sm text-slate-600">Line spacing</label>
                  <select
                    value={lineSpacing}
                    onChange={(e) => setLineSpacing(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                  >
                    <option value="tight">Tight</option>
                    <option value="normal">Normal</option>
                    <option value="wide">Wide</option>
                  </select>

                  <label className="text-sm text-slate-600 ml-2">Page width</label>
                  <select
                    value={pageWidth}
                    onChange={(e) => setPageWidth(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                  >
                    <option value="compact">Compact</option>
                    <option value="normal">Normal</option>
                    <option value="wide">Wide</option>
                  </select>
                </div>
              ) : null}
            </div>
            <input
              ref={colorInputRef}
              type="color"
              value={customPenColor}
              onChange={(e) => {
                setCustomPenColor(e.target.value);
                setPenTheme("custom");
              }}
              className="sr-only"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => addAttachment(e.target.files)}
            />
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4 p-4">
          <section className={`col-span-12 ${isPanelCollapsed ? "lg:col-span-11" : "lg:col-span-9"}`}>
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
            <div className={`mx-auto ${pageWidthClass}`}>
              <div
                ref={noteBodyRef}
                contentEditable
                suppressContentEditableWarning
                onInput={syncEditorTextState}
                onMouseUp={saveSelectionRange}
                onKeyUp={saveSelectionRange}
                onFocus={saveSelectionRange}
                onBlur={saveSelectionRange}
                style={{
                  textAlign: editorAlign,
                  color: penTheme === "custom" ? customPenColor : undefined,
                  backgroundColor: isEditorShaded ? highlightColor : undefined,
                }}
                className={`min-h-[520px] w-full whitespace-pre-wrap rounded-xl border ${editorBorderClass} ${pageToneClass} px-4 py-3 text-sm outline-none ${lineSpacingClass} ${penTheme === "custom" ? "" : activePen.textClass}`}
                data-placeholder="Start writing your note here..."
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
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">{note.title}</p>
                        <p className="mt-1 text-xs text-slate-500">{formatTime(note.updatedAt)}</p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => renameNoteById(note.id)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                          title="Edit note title"
                        >
                          <PencilLine size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteNoteById(note.id)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                          title="Delete note"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
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
          ) : (
            <div className="flex flex-col items-center gap-2 p-2">
              <button
                type="button"
                onClick={() => setNotes((prev) => [{ id: makeId(), title: "Untitled Note", updatedAt: Date.now() }, ...prev])}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                title="New Note"
              >
                <Plus size={16} />
              </button>
              <button
                type="button"
                onClick={() => setIsPanelCollapsed(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                title="Open Notes Panel"
              >
                <PencilLine size={16} />
              </button>
              <button
                type="button"
                onClick={addSticky}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                title="Add Sticky"
              >
                <StickyNote size={16} />
              </button>
            </div>
          )}
        </div>
          </aside>
        </div>
    </div>
    </div>
  );
}
