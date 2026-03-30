import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Archive,
  Bold,
  BookOpen,
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
  Menu,
  MoreHorizontal,
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
  X,
} from "lucide-react";
import MobileFeatureLandingShell from "../shared/feature-landing/MobileFeatureLandingShell";
import { auth } from "../lib/firebase";
import {
  createInstitutionNotebookItem,
  createInstitutionShareLink,
  deleteInstitutionNotebookItem,
  deleteInstitutionNotebookWorkspace,
  deleteInstitutionShareLink,
  fetchInstitutionNotebookItem,
  fetchInstitutionNotebookItems,
  fetchInstitutionNotebookWorkspace,
  fetchInstitutionSubgroups,
  updateInstitutionNotebookItem,
  updateInstitutionNotebookWorkspace,
  updateInstitutionShareLink,
} from "../lib/researchApi";

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

function mapNotebookItem(item) {
  if (!item) return null;
  return {
    id: item.id,
    title: String(item.title || "Untitled Note"),
    content: String(item.content || ""),
    updatedAt: item.updated_at ? new Date(item.updated_at).getTime() : Date.now(),
    createdAt: item.created_at ? new Date(item.created_at).getTime() : null,
    isArchived: Boolean(item.is_archived),
    preview: String(item.preview || ""),
  };
}

function buildNotePreview(content) {
  const text = String(content || "").replace(/\s+/g, " ").trim();
  if (!text) return "Open this note to continue writing.";
  return text.length > 72 ? `${text.slice(0, 69).trimEnd()}...` : text;
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

function NotebookWorkspaceModal({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm">
      <button
        type="button"
        aria-label={`Close ${title}`}
        className="absolute inset-0"
        onClick={onClose}
      />
      <div className="relative z-[1] w-full max-w-3xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_28px_70px_rgba(15,23,42,0.18)]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50/90 px-6 py-5">
          <div>
            <div className="text-lg font-semibold text-slate-900">{title}</div>
            <div className="mt-1 text-sm text-slate-500">Frontend-first workspace flow for Institution Notebook.</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            aria-label={`Close ${title}`}
          >
            <X size={16} />
          </button>
        </div>
        <div className="max-h-[78vh] overflow-y-auto px-6 py-6">{children}</div>
      </div>
    </div>
  );
}

function MobileNotebookSheet({ open, title, onClose, children, footer = null }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80]">
      <button
        type="button"
        aria-label={`Close ${title}`}
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div className="absolute inset-x-0 bottom-0 max-h-[82vh] overflow-hidden rounded-t-[28px] border border-slate-200 bg-white shadow-[0_-20px_60px_rgba(15,23,42,0.18)]">
        <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-slate-200" />
        <div className="flex items-center justify-between gap-4 px-5 pb-4 pt-4">
          <div>
            <div className="text-base font-semibold text-slate-900">{title}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            aria-label={`Close ${title}`}
          >
            <X size={16} />
          </button>
        </div>
        <div className="max-h-[calc(82vh-7.5rem)] overflow-y-auto px-5 pb-5">{children}</div>
        {footer ? <div className="border-t border-slate-100 px-5 py-4">{footer}</div> : null}
      </div>
    </div>
  );
}

function NotebookSubgroupPicker({
  selectedId = "",
  selectedLabel = "",
  searchValue = "",
  onSearchChange,
  results = [],
  loading = false,
  error = "",
  onSelect,
  onClear,
  helperText = "",
}) {
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search subgroup by name"
          className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-900 outline-none focus:border-sky-300"
        />
      </div>

      {selectedId ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-sky-200 bg-sky-50/80 px-4 py-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-slate-900">{selectedLabel || "Selected subgroup"}</div>
            <div className="mt-1 text-xs text-slate-500">Subgroup #{selectedId}</div>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Clear
          </button>
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white">
        {loading ? <div className="px-4 py-4 text-sm text-slate-500">Loading subgroups...</div> : null}
        {!loading && error ? <div className="px-4 py-4 text-sm text-rose-700">{error}</div> : null}
        {!loading && !error && results.length === 0 ? (
          <div className="px-4 py-4 text-sm text-slate-500">No matching subgroups found.</div>
        ) : null}
        {!loading && !error && results.length > 0 ? (
          <div className="max-h-52 overflow-y-auto p-2">
            {results.map((group) => (
              <button
                key={group.id}
                type="button"
                onClick={() => onSelect(group)}
                className={[
                  "flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-3 text-left hover:bg-slate-50",
                  String(selectedId) === String(group.id) ? "bg-sky-50 text-slate-900" : "text-slate-700",
                ].join(" ")}
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{group.name}</div>
                  <div className="mt-1 text-xs text-slate-400">Subgroup #{group.id}</div>
                </div>
                {group.is_admin ? (
                  <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Admin
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {helperText ? <div className="text-xs text-slate-500">{helperText}</div> : null}
    </div>
  );
}

export default function NotebookPage({
  onBack,
  onOpenMainMenu,
  onOpenLive = null,
  onSaveNote = null,
  embedded = false,
  enableDesktopLanding = false,
  initialTitle = "",
  initialBody = "",
  loadToken = "",
}) {
  const initialIsCompactMobile =
    typeof window !== "undefined" ? window.matchMedia("(max-width: 820px)").matches : false;
  const [noteTitle, setNoteTitle] = useState(() => String(initialTitle || "Note_ElimuLink_1_2026"));
  const [noteBody, setNoteBody] = useState(() => String(initialBody || ""));
  const [activeNotebookTab, setActiveNotebookTab] = useState("home");
  const [isCompactMobile, setIsCompactMobile] = useState(initialIsCompactMobile);
  const [showMobileLanding, setShowMobileLanding] = useState(initialIsCompactMobile && !embedded);
  const [isMobileFormatSheetOpen, setIsMobileFormatSheetOpen] = useState(false);
  const [isMobileInsertSheetOpen, setIsMobileInsertSheetOpen] = useState(false);
  const [isMobileMoreSheetOpen, setIsMobileMoreSheetOpen] = useState(false);
  const [isMobileExportSheetOpen, setIsMobileExportSheetOpen] = useState(false);
  const [isMobileAssistSheetOpen, setIsMobileAssistSheetOpen] = useState(false);
  const [landingInputValue, setLandingInputValue] = useState("");
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
  const [saveMessage, setSaveMessage] = useState("");
  const [currentNoteId, setCurrentNoteId] = useState(null);
  const [showDesktopLanding, setShowDesktopLanding] = useState(
    () => !initialIsCompactMobile && !embedded && enableDesktopLanding
  );
  const [isDesktopLandingMenuOpen, setIsDesktopLandingMenuOpen] = useState(false);
  const [isDesktopUtilityMenuOpen, setIsDesktopUtilityMenuOpen] = useState(false);
  const [activeDesktopNoteMenuId, setActiveDesktopNoteMenuId] = useState(null);
  const [activeDesktopMoveMenuId, setActiveDesktopMoveMenuId] = useState(null);
  const [isDesktopShareOpen, setIsDesktopShareOpen] = useState(false);
  const [isDesktopSettingsOpen, setIsDesktopSettingsOpen] = useState(false);
  const [desktopShareInvite, setDesktopShareInvite] = useState("");
  const [desktopShareAccess, setDesktopShareAccess] = useState("only-invited");
  const [desktopShareStatus, setDesktopShareStatus] = useState("");
  const [desktopWorkspaceSettings, setDesktopWorkspaceSettings] = useState({
    name: "ElimuLink Notebook",
    instructions: "",
    visibility: "institution",
    permissions: "members-can-view",
    linkedInstitution: "ElimuLink University",
    linkedSubgroupId: "",
    linkedSubgroup: "Not linked",
    memoryBehavior: "workspace-default",
  });
  const [desktopWorkspaceStatus, setDesktopWorkspaceStatus] = useState("");
  const [desktopWorkspaceConversationId, setDesktopWorkspaceConversationId] = useState("");
  const [desktopWorkspaceShareLink, setDesktopWorkspaceShareLink] = useState(null);
  const [isDesktopWorkspaceLoading, setIsDesktopWorkspaceLoading] = useState(false);
  const [isDesktopShareBusy, setIsDesktopShareBusy] = useState(false);
  const [isDesktopSettingsBusy, setIsDesktopSettingsBusy] = useState(false);
  const [isDesktopDeleteConfirmOpen, setIsDesktopDeleteConfirmOpen] = useState(false);
  const [desktopDeleteConfirmText, setDesktopDeleteConfirmText] = useState("");
  const [desktopSubgroupQuery, setDesktopSubgroupQuery] = useState("");
  const [desktopSubgroupResults, setDesktopSubgroupResults] = useState([]);
  const [isDesktopSubgroupLoading, setIsDesktopSubgroupLoading] = useState(false);
  const [desktopSubgroupError, setDesktopSubgroupError] = useState("");
  const [notes, setNotes] = useState([]);
  const [isNotebookItemsLoading, setIsNotebookItemsLoading] = useState(false);
  const [notebookItemsError, setNotebookItemsError] = useState("");
  const [isNotebookItemSaving, setIsNotebookItemSaving] = useState(false);
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
  const currentNoteRequestRef = useRef(0);
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
  const showNotebookDesktopLanding = !embedded && !isCompactMobile && enableDesktopLanding && showDesktopLanding;
  const currentNote = useMemo(
    () => notes.find((note) => note.id === currentNoteId) || null,
    [currentNoteId, notes]
  );
  const notebookLandingItems = useMemo(
    () =>
      [...notes]
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
        .map((note) => ({
          id: note.id,
          title: note.title,
          preview: note.preview || buildNotePreview(note.content),
          meta: note.updatedAt ? new Date(note.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "",
          updatedAt: note.updatedAt,
          actions: [
            { key: "share", label: "Share", icon: Copy, onClick: handleNotebookShare },
            { key: "open", label: "Open note", icon: BookOpen, onClick: () => openNotebookNote(note.id) },
            { key: "rename", label: "Rename", icon: PencilLine, onClick: () => renameNoteById(note.id) },
            { key: "archive", label: "Archive", icon: Archive, onClick: () => archiveNoteById(note.id) },
            { key: "delete", label: "Delete", icon: Trash2, destructive: true, onClick: () => confirmDeleteNoteById(note.id) },
          ],
        })),
    [notes]
  );
  const notebookOwnerLabel = useMemo(
    () =>
      String(
        auth?.currentUser?.displayName ||
          auth?.currentUser?.email ||
          "You"
      ).trim() || "You",
    []
  );
  const notebookOwnerEmail = String(auth?.currentUser?.email || "").trim().toLowerCase();
  const desktopWorkspaceMembers = useMemo(() => {
    const invited = Array.isArray(desktopWorkspaceShareLink?.invited_emails)
      ? desktopWorkspaceShareLink.invited_emails
      : [];
    return [
      { key: "owner", label: notebookOwnerLabel, role: "Owner", removable: false },
      ...invited.map((email) => ({
        key: email,
        label: email,
        role: "Invited",
        removable: true,
      })),
    ];
  }, [desktopWorkspaceShareLink?.invited_emails, notebookOwnerLabel]);

  useEffect(() => {
    setFontSizeInput(String(fontSizePx));
  }, [fontSizePx]);

  useEffect(() => {
    if (typeof window === "undefined" || embedded) return undefined;
    const mediaQuery = window.matchMedia("(max-width: 820px)");
    const syncViewportMode = () => {
      const nextIsCompact = mediaQuery.matches;
      setIsCompactMobile(nextIsCompact);
      if (!nextIsCompact) {
        setShowMobileLanding(false);
      }
    };
    syncViewportMode();
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", syncViewportMode);
      return () => mediaQuery.removeEventListener("change", syncViewportMode);
    }
    mediaQuery.addListener(syncViewportMode);
    return () => mediaQuery.removeListener(syncViewportMode);
  }, [embedded]);

  useEffect(() => {
    const editor = noteBodyRef.current;
    if (!editor) return;
    const current = (editor.innerText || "").replace(/\u00A0/g, " ");
    const next = String(noteBody || "");
    if (current === next) return;
    editor.innerText = next;
  }, [noteBody, loadToken]);

  useEffect(() => {
    if (!loadToken) return;
    setCurrentNoteId(null);
    setNoteTitle(String(initialTitle || "Note_ElimuLink_1_2026"));
    setNoteBody(String(initialBody || ""));
    setSaveMessage("");
    setShowMobileLanding(false);
  }, [initialBody, initialTitle, loadToken]);

  useEffect(() => {
    if (!isCompactMobile) {
      setIsMobileFormatSheetOpen(false);
      setIsMobileInsertSheetOpen(false);
      setIsMobileMoreSheetOpen(false);
      setIsMobileExportSheetOpen(false);
      setIsMobileAssistSheetOpen(false);
    }
  }, [isCompactMobile]);

  useEffect(() => {
    if (isCompactMobile || embedded || !enableDesktopLanding) {
      setShowDesktopLanding(false);
    }
  }, [embedded, enableDesktopLanding, isCompactMobile]);

  useEffect(() => {
    if (!enableDesktopLanding || embedded || isCompactMobile) return;
    if (!currentNoteId) {
      setShowDesktopLanding(true);
    }
  }, [currentNoteId, embedded, enableDesktopLanding, isCompactMobile]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!target.closest("[data-desktop-landing-menu]")) {
        setIsDesktopLandingMenuOpen(false);
      }
      if (!target.closest("[data-desktop-utility-menu]")) {
        setIsDesktopUtilityMenuOpen(false);
      }
      if (!target.closest("[data-desktop-note-menu]")) {
        setActiveDesktopNoteMenuId(null);
        setActiveDesktopMoveMenuId(null);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key !== "Escape") return;
      setIsDesktopLandingMenuOpen(false);
      setIsDesktopUtilityMenuOpen(false);
      setActiveDesktopNoteMenuId(null);
      setActiveDesktopMoveMenuId(null);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const workspaceName = currentNoteId ? String(noteTitle || "Untitled Note") : "ElimuLink Notebook";
    setDesktopWorkspaceSettings((prev) => ({ ...prev, name: workspaceName }));
  }, [currentNoteId, noteTitle]);

  useEffect(() => {
    if (!enableDesktopLanding || embedded || isCompactMobile) return undefined;
    let cancelled = false;
    setIsDesktopWorkspaceLoading(true);
    fetchInstitutionNotebookWorkspace({
      baseUrl: typeof window !== "undefined" ? window.location.origin : undefined,
    })
      .then((response) => {
        if (cancelled) return;
        applyDesktopWorkspacePayload(response?.workspace || null);
      })
      .catch((error) => {
        if (cancelled) return;
        setDesktopWorkspaceStatus(error?.message || "Unable to load workspace details right now.");
      })
      .finally(() => {
        if (cancelled) return;
        setIsDesktopWorkspaceLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [embedded, enableDesktopLanding, isCompactMobile]);

  useEffect(() => {
    let cancelled = false;
    setIsNotebookItemsLoading(true);
    setNotebookItemsError("");
    fetchInstitutionNotebookItems()
      .then((response) => {
        if (cancelled) return;
        const nextItems = Array.isArray(response?.items) ? response.items.map(mapNotebookItem).filter(Boolean) : [];
        setNotes(nextItems);
      })
      .catch((error) => {
        if (cancelled) return;
        setNotes([]);
        setNotebookItemsError(error?.message || "Unable to load notebook items right now.");
      })
      .finally(() => {
        if (cancelled) return;
        setIsNotebookItemsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!enableDesktopLanding || embedded || isCompactMobile) return undefined;
    if (!isDesktopShareOpen && !isDesktopSettingsOpen) return undefined;

    let cancelled = false;
    const timeoutId = setTimeout(() => {
      setIsDesktopSubgroupLoading(true);
      setDesktopSubgroupError("");
      fetchInstitutionSubgroups({
        query: desktopSubgroupQuery,
        limit: 24,
      })
        .then((response) => {
          if (cancelled) return;
          setDesktopSubgroupResults(Array.isArray(response?.groups) ? response.groups : []);
        })
        .catch((error) => {
          if (cancelled) return;
          setDesktopSubgroupResults([]);
          setDesktopSubgroupError(error?.message || "Unable to load subgroups right now.");
        })
        .finally(() => {
          if (cancelled) return;
          setIsDesktopSubgroupLoading(false);
        });
    }, desktopSubgroupQuery ? 180 : 0);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [
    desktopSubgroupQuery,
    embedded,
    enableDesktopLanding,
    isCompactMobile,
    isDesktopSettingsOpen,
    isDesktopShareOpen,
  ]);

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

  useEffect(() => {
    if (!currentNoteId) return;
    const normalizedTitle = String(noteTitle || "").trim() || "Untitled Note";
    const normalizedBody = String(noteBody || "");
    setNotes((prev) =>
      prev.map((note) =>
        note.id === currentNoteId
          ? {
              ...note,
              title: normalizedTitle,
              content: normalizedBody,
              updatedAt: Date.now(),
            }
          : note
      )
    );
  }, [currentNoteId, noteBody, noteTitle]);

  const showNotebookLanding = !embedded && isCompactMobile && showMobileLanding;

  const loadNotebookItems = async ({ quiet = false } = {}) => {
    if (!quiet) {
      setIsNotebookItemsLoading(true);
    }
    setNotebookItemsError("");
    try {
      const response = await fetchInstitutionNotebookItems();
      const nextItems = Array.isArray(response?.items) ? response.items.map(mapNotebookItem).filter(Boolean) : [];
      setNotes(nextItems);
      return nextItems;
    } catch (error) {
      const message = error?.message || "Unable to load notebook items right now.";
      setNotebookItemsError(message);
      return [];
    } finally {
      if (!quiet) {
        setIsNotebookItemsLoading(false);
      }
    }
  };

  const createNotebookNote = async (seedTitle = "") => {
    const normalized = String(seedTitle || "").trim();
    setNotebookItemsError("");
    try {
      const response = await createInstitutionNotebookItem({
        title: normalized || "Untitled Note",
        content: "",
      });
      const nextNote = mapNotebookItem(response?.item);
      if (!nextNote) throw new Error("Unable to create note right now.");
      setNotes((prev) => [nextNote, ...prev.filter((item) => item.id !== nextNote.id)]);
      setCurrentNoteId(nextNote.id);
      setNoteTitle(nextNote.title);
      setNoteBody(nextNote.content);
      setActiveNotebookTab("home");
      setSaveMessage("Note created.");
      setLandingInputValue("");
      setShowMobileLanding(false);
      setShowDesktopLanding(false);
      setTimeout(() => setSaveMessage(""), 2000);
      return nextNote;
    } catch (error) {
      const message = error?.message || "Unable to create note right now.";
      setNotebookItemsError(message);
      setSaveMessage(message);
      setTimeout(() => setSaveMessage(""), 2200);
      return null;
    }
  };

  const openNotebookNote = async (noteOrId) => {
    const noteId = typeof noteOrId === "object" ? noteOrId?.id : noteOrId;
    const target = notes.find((note) => note.id === noteId);
    if (!noteId) return;
    const requestId = Date.now();
    currentNoteRequestRef.current = requestId;
    setSaveMessage("");
    setNotebookItemsError("");
    setShowMobileLanding(false);
    setShowDesktopLanding(false);
    if (target) {
      setCurrentNoteId(target.id);
      setNoteTitle(target.title || "Untitled Note");
      setNoteBody(target.content || "");
    }
    try {
      const response = await fetchInstitutionNotebookItem(noteId);
      if (currentNoteRequestRef.current !== requestId) return;
      const nextNote = mapNotebookItem(response?.item);
      if (!nextNote) return;
      setNotes((prev) => {
        const rest = prev.filter((item) => item.id !== nextNote.id);
        return [nextNote, ...rest];
      });
      setCurrentNoteId(nextNote.id);
      setNoteTitle(nextNote.title);
      setNoteBody(nextNote.content || "");
    } catch (error) {
      if (currentNoteRequestRef.current !== requestId) return;
      const message = error?.message || "Unable to open this note right now.";
      setNotebookItemsError(message);
      if (!target) {
        setCurrentNoteId(null);
      }
    }
  };

  const openNotebookSettings = () => {
    if (!embedded && !isCompactMobile && enableDesktopLanding) {
      setIsDesktopSettingsOpen(true);
      setDesktopWorkspaceStatus("");
      return;
    }
    setActiveNotebookTab("file");
    setShowMobileLanding(false);
  };

  const handleNotebookShare = async () => {
    const shareTitle = currentNoteId ? noteTitle : "ElimuLink Notebook";
    const sharePayload = {
      title: shareTitle,
      text: currentNoteId
        ? `Continue working on "${shareTitle}" in ElimuLink Notebook.`
        : "Continue working in ElimuLink Notebook.",
      url: typeof window !== "undefined" ? window.location.href : "",
    };
    if (navigator.share) {
      try {
        await navigator.share(sharePayload);
        return;
      } catch {
        // fall through to clipboard copy
      }
    }
    try {
      await navigator.clipboard.writeText(sharePayload.url || sharePayload.text);
      setSaveMessage("Link copied.");
      setTimeout(() => setSaveMessage(""), 2000);
    } catch {
      setSaveMessage("Share unavailable on this device.");
      setTimeout(() => setSaveMessage(""), 2000);
    }
  };

  const handleMobileNotebookShareSubmit = async ({ email, access }) => {
    if (!embedded && !isCompactMobile && enableDesktopLanding) {
      return { status: "Desktop workspace share is already available here.", closeOnSuccess: true };
    }
    const nextAccess = String(access || desktopShareAccess || "only-invited").trim();
    const nextEmail = String(email || "").trim().toLowerCase();
    const invitedEmails = nextEmail
      ? Array.from(
          new Set([
            ...(Array.isArray(desktopWorkspaceShareLink?.invited_emails) ? desktopWorkspaceShareLink.invited_emails : []),
            nextEmail,
          ])
        )
      : Array.isArray(desktopWorkspaceShareLink?.invited_emails)
        ? desktopWorkspaceShareLink.invited_emails
        : [];

    try {
      const shareLink = await syncDesktopShareLink({
        accessLevel: nextAccess,
        invitedEmails,
      });
      const shareUrl = String(shareLink?.url || "").trim();
      if (shareUrl && navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      }
      return {
        status: nextEmail ? `Shared with ${nextEmail}. Link copied.` : "Workspace sharing updated. Link copied.",
      };
    } catch (error) {
      return {
        status: error?.message || "Unable to update notebook sharing right now.",
      };
    }
  };

  const openNotebookDesktopLanding = () => {
    setShowDesktopLanding(true);
    setSaveMessage("");
  };

  const applyDesktopWorkspacePayload = (workspace) => {
    if (!workspace) return null;
    const settings = workspace.settings || {};
    setDesktopWorkspaceConversationId(workspace.conversation_id || "");
    setDesktopWorkspaceShareLink(workspace.share_link || null);
    setDesktopWorkspaceSettings({
      name: workspace.title || "ElimuLink Notebook",
      instructions: settings.instructions || "",
      visibility: settings.visibility || "institution",
      permissions: settings.permissions || "members-can-view",
      linkedInstitution: settings.linked_institution || "ElimuLink University",
      linkedSubgroupId:
        settings.linked_subgroup_id === null || settings.linked_subgroup_id === undefined
          ? ""
          : String(settings.linked_subgroup_id),
      linkedSubgroup:
        settings.linked_subgroup_label || settings.linked_subgroup || "Not linked",
      memoryBehavior: settings.memory_behavior || "workspace-default",
    });
    if (workspace.share_link?.access_level) {
      setDesktopShareAccess(workspace.share_link.access_level);
    }
    return workspace;
  };

  const loadDesktopWorkspace = async ({ quiet = false } = {}) => {
    if (!enableDesktopLanding || embedded || isCompactMobile) return null;
    if (!quiet) {
      setIsDesktopWorkspaceLoading(true);
    }
    try {
      const response = await fetchInstitutionNotebookWorkspace({
        baseUrl: typeof window !== "undefined" ? window.location.origin : undefined,
      });
      return applyDesktopWorkspacePayload(response?.workspace || null);
    } catch (error) {
      const message = error?.message || "Unable to load workspace details right now.";
      setDesktopWorkspaceStatus(message);
      setDesktopShareStatus(message);
      return null;
    } finally {
      if (!quiet) {
        setIsDesktopWorkspaceLoading(false);
      }
    }
  };

  const ensureDesktopWorkspace = async () => {
    if (desktopWorkspaceConversationId) {
      return {
        conversation_id: desktopWorkspaceConversationId,
        share_link: desktopWorkspaceShareLink,
      };
    }
    return loadDesktopWorkspace({ quiet: false });
  };

  const syncDesktopShareLink = async ({ accessLevel, invitedEmails, subgroupName } = {}) => {
    const workspace = await ensureDesktopWorkspace();
    const conversationId = workspace?.conversation_id || desktopWorkspaceConversationId;
    if (!conversationId) {
      throw new Error("Workspace share is not ready yet.");
    }

    const nextAccessLevel = accessLevel || desktopShareAccess;
    const nextInvitedEmails =
      invitedEmails ||
      (Array.isArray(desktopWorkspaceShareLink?.invited_emails)
        ? desktopWorkspaceShareLink.invited_emails
        : []);
    const nextSubgroupName =
      typeof subgroupName === "string"
        ? subgroupName
        : desktopWorkspaceShareLink?.subgroup_name ||
          (desktopWorkspaceSettings.linkedSubgroup === "Not linked" ? "" : desktopWorkspaceSettings.linkedSubgroup);
    const nextSubgroupId =
      desktopWorkspaceShareLink?.subgroup_id ??
      (desktopWorkspaceSettings.linkedSubgroupId ? Number(desktopWorkspaceSettings.linkedSubgroupId) : null);

    const response = desktopWorkspaceShareLink?.id
      ? await updateInstitutionShareLink(
          desktopWorkspaceShareLink.id,
          {
            accessLevel: nextAccessLevel,
            invitedEmails: nextInvitedEmails,
            subgroupId: nextSubgroupId,
            subgroupName: nextSubgroupName || null,
          },
          { baseUrl: typeof window !== "undefined" ? window.location.origin : undefined }
        )
      : await createInstitutionShareLink({
          conversationId,
          messageIds: [],
          accessLevel: nextAccessLevel,
          invitedEmails: nextInvitedEmails,
          subgroupId: nextSubgroupId,
          subgroupName: nextSubgroupName || null,
          baseUrl: typeof window !== "undefined" ? window.location.origin : undefined,
        });

    const nextShareLink = response?.share_link || null;
    setDesktopWorkspaceShareLink(nextShareLink);
    if (nextShareLink?.access_level) {
      setDesktopShareAccess(nextShareLink.access_level);
    }
    return nextShareLink;
  };

  const handleDesktopShareAccessChange = async (nextAccessLevel) => {
    setDesktopShareAccess(nextAccessLevel);
    setDesktopShareStatus("");
    setIsDesktopShareBusy(true);
    try {
      const shareLink = await syncDesktopShareLink({ accessLevel: nextAccessLevel });
      const subgroupMessage =
        nextAccessLevel === "subgroup-only"
          ? ` Only the owner and members of subgroup #${shareLink?.subgroup_id || desktopWorkspaceSettings.linkedSubgroupId} can open it.`
          : "";
      setDesktopShareStatus(`Access level saved as ${shareLink?.access_level || nextAccessLevel}.${subgroupMessage}`);
    } catch (error) {
      setDesktopShareStatus(error?.message || "Unable to save share access right now.");
    } finally {
      setIsDesktopShareBusy(false);
    }
  };

  const handleDesktopShareCopyLink = async () => {
    setDesktopShareStatus("");
    setIsDesktopShareBusy(true);
    try {
      const shareLink = await syncDesktopShareLink();
      if (!shareLink?.url) {
        throw new Error("Share link is not available yet.");
      }
      await navigator.clipboard.writeText(shareLink.url);
      setDesktopShareStatus("Workspace link copied.");
    } catch (error) {
      setDesktopShareStatus(error?.message || "Unable to copy the workspace link.");
    } finally {
      setIsDesktopShareBusy(false);
    }
  };

  const handleDesktopShareInvite = async () => {
    const normalized = String(desktopShareInvite || "").trim().toLowerCase();
    if (!normalized) {
      setDesktopShareStatus("Add an email first.");
      return;
    }
    if (!normalized.includes("@")) {
      setDesktopShareStatus("Enter a valid invite email.");
      return;
    }
    setDesktopShareStatus("");
    setIsDesktopShareBusy(true);
    try {
      const currentInvites = Array.isArray(desktopWorkspaceShareLink?.invited_emails)
        ? desktopWorkspaceShareLink.invited_emails
        : [];
      const nextInvites = Array.from(new Set([...currentInvites, normalized]));
      const shareLink = await syncDesktopShareLink({ invitedEmails: nextInvites });
      setDesktopShareInvite("");
      const subgroupMessage =
        shareLink?.access_level === "subgroup-only"
          ? " Invite list is kept for visibility, but subgroup membership is the enforcement source of truth."
          : "";
      setDesktopShareStatus(`Invite added for ${normalized}.${subgroupMessage}`);
    } catch (error) {
      setDesktopShareStatus(error?.message || "Unable to add that invite right now.");
    } finally {
      setIsDesktopShareBusy(false);
    }
  };

  const handleDesktopShareRemoveInvite = async (email) => {
    setDesktopShareStatus("");
    setIsDesktopShareBusy(true);
    try {
      const currentInvites = Array.isArray(desktopWorkspaceShareLink?.invited_emails)
        ? desktopWorkspaceShareLink.invited_emails
        : [];
      const nextInvites = currentInvites.filter((item) => item !== email);
      await syncDesktopShareLink({ invitedEmails: nextInvites });
      setDesktopShareStatus(`${email} no longer has invited access.`);
    } catch (error) {
      setDesktopShareStatus(error?.message || "Unable to remove that invite right now.");
    } finally {
      setIsDesktopShareBusy(false);
    }
  };

  const handleDesktopShareRemoveAccess = async () => {
    if (!desktopWorkspaceShareLink?.id) {
      setDesktopShareStatus("No active share link to remove.");
      return;
    }
    setDesktopShareStatus("");
    setIsDesktopShareBusy(true);
    try {
      await deleteInstitutionShareLink(desktopWorkspaceShareLink.id);
      setDesktopWorkspaceShareLink(null);
      setDesktopShareAccess("only-invited");
      setDesktopShareStatus("Workspace share access removed.");
    } catch (error) {
      setDesktopShareStatus(error?.message || "Unable to remove workspace access right now.");
    } finally {
      setIsDesktopShareBusy(false);
    }
  };

  const selectDesktopSubgroup = (group) => {
    setDesktopWorkspaceSettings((prev) => ({
      ...prev,
      linkedSubgroupId: String(group?.id || ""),
      linkedSubgroup: String(group?.name || "Not linked"),
    }));
    setDesktopSubgroupQuery(String(group?.name || ""));
    setDesktopSubgroupError("");
  };

  const clearDesktopSubgroupSelection = () => {
    setDesktopWorkspaceSettings((prev) => ({
      ...prev,
      linkedSubgroupId: "",
      linkedSubgroup: "Not linked",
    }));
    setDesktopSubgroupQuery("");
    setDesktopSubgroupError("");
  };

  const handleDesktopShareSubgroupSelect = async (group) => {
    selectDesktopSubgroup(group);
    setDesktopShareStatus("");
    setIsDesktopShareBusy(true);
    try {
      const workspaceResponse = await updateInstitutionNotebookWorkspace({
        linked_subgroup_id: Number(group.id),
        linked_subgroup: group.name,
      });
      applyDesktopWorkspacePayload(workspaceResponse?.workspace || null);
      if (desktopShareAccess === "subgroup-only") {
        const shareLink = await syncDesktopShareLink({
          subgroupName: group.name,
        });
        setDesktopShareStatus(`Subgroup ${group.name} is now enforced for this workspace share.`);
        if (shareLink?.subgroup_id) {
          setDesktopWorkspaceSettings((prev) => ({
            ...prev,
            linkedSubgroupId: String(shareLink.subgroup_id),
            linkedSubgroup: shareLink.subgroup_name || group.name,
          }));
        }
      } else {
        setDesktopShareStatus(`Workspace subgroup updated to ${group.name}.`);
      }
    } catch (error) {
      setDesktopShareStatus(error?.message || "Unable to update subgroup selection right now.");
    } finally {
      setIsDesktopShareBusy(false);
    }
  };

  const handleDesktopWorkspaceSave = async () => {
    setDesktopWorkspaceStatus("");
    setIsDesktopSettingsBusy(true);
    try {
      const response = await updateInstitutionNotebookWorkspace({
        title: desktopWorkspaceSettings.name,
        instructions: desktopWorkspaceSettings.instructions,
        visibility: desktopWorkspaceSettings.visibility,
        permissions: desktopWorkspaceSettings.permissions,
        linked_institution: desktopWorkspaceSettings.linkedInstitution,
        linked_subgroup: desktopWorkspaceSettings.linkedSubgroup,
        linked_subgroup_id: desktopWorkspaceSettings.linkedSubgroupId
          ? Number(desktopWorkspaceSettings.linkedSubgroupId)
          : null,
        memory_behavior: desktopWorkspaceSettings.memoryBehavior,
      });
      applyDesktopWorkspacePayload(response?.workspace || null);
      setDesktopWorkspaceStatus("Workspace settings saved.");
    } catch (error) {
      setDesktopWorkspaceStatus(error?.message || "Unable to save workspace settings right now.");
    } finally {
      setIsDesktopSettingsBusy(false);
    }
  };

  const handleDesktopWorkspaceArchive = async () => {
    setDesktopWorkspaceStatus("");
    setIsDesktopSettingsBusy(true);
    try {
      const response = await updateInstitutionNotebookWorkspace({
        project_archived: true,
      });
      applyDesktopWorkspacePayload(response?.workspace || null);
      setDesktopWorkspaceStatus("Workspace archived in project settings.");
    } catch (error) {
      setDesktopWorkspaceStatus(error?.message || "Unable to archive this workspace right now.");
    } finally {
      setIsDesktopSettingsBusy(false);
    }
  };

  const handleDesktopWorkspaceDelete = async () => {
    setDesktopWorkspaceStatus("");
    setIsDesktopSettingsBusy(true);
    try {
      const response = await deleteInstitutionNotebookWorkspace();
      setDesktopWorkspaceConversationId("");
      setDesktopWorkspaceShareLink(null);
      setDesktopShareAccess("only-invited");
      setDesktopShareInvite("");
      setDesktopDeleteConfirmText("");
      setIsDesktopDeleteConfirmOpen(false);
      setIsDesktopSettingsOpen(false);
      setDesktopWorkspaceSettings({
        name: "ElimuLink Notebook",
        instructions: "",
        visibility: "institution",
        permissions: "members-can-view",
        linkedInstitution: "ElimuLink University",
        linkedSubgroupId: "",
        linkedSubgroup: "Not linked",
        memoryBehavior: "workspace-default",
      });
      setDesktopWorkspaceStatus(
        response?.message || "Workspace metadata deleted. Local notebook notes were not deleted."
      );
      void loadNotebookItems({ quiet: true });
    } catch (error) {
      setDesktopWorkspaceStatus(error?.message || "Unable to delete this workspace right now.");
    } finally {
      setIsDesktopSettingsBusy(false);
    }
  };

  const renameDesktopWorkspace = async () => {
    const nextName = window.prompt("Rename workspace", desktopWorkspaceSettings.name || "ElimuLink Notebook");
    if (nextName === null) return;
    const normalized = nextName.trim();
    if (!normalized) return;
    setDesktopWorkspaceStatus("");
    setIsDesktopSettingsBusy(true);
    try {
      const response = await updateInstitutionNotebookWorkspace({
        title: normalized,
        instructions: desktopWorkspaceSettings.instructions,
        visibility: desktopWorkspaceSettings.visibility,
        permissions: desktopWorkspaceSettings.permissions,
        linked_institution: desktopWorkspaceSettings.linkedInstitution,
        linked_subgroup: desktopWorkspaceSettings.linkedSubgroup,
        linked_subgroup_id: desktopWorkspaceSettings.linkedSubgroupId
          ? Number(desktopWorkspaceSettings.linkedSubgroupId)
          : null,
        memory_behavior: desktopWorkspaceSettings.memoryBehavior,
      });
      applyDesktopWorkspacePayload(response?.workspace || null);
      setDesktopWorkspaceStatus("Workspace renamed.");
    } catch (error) {
      setDesktopWorkspaceStatus(error?.message || "Unable to rename this workspace right now.");
    } finally {
      setIsDesktopSettingsBusy(false);
    }
  };

  const moveWorkspaceToProject = () => {
    setDesktopWorkspaceStatus("Move to workspace is prepared here as a safe frontend-first action.");
  };

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

  const renameNoteById = async (noteId) => {
    const target = notes.find((note) => note.id === noteId);
    if (!target) return;
    const nextTitle = window.prompt("Edit note title", target.title || "Untitled Note");
    if (nextTitle === null) return;
    const normalized = nextTitle.trim();
    if (!normalized) return;
    try {
      const response = await updateInstitutionNotebookItem(noteId, { title: normalized });
      const nextNote = mapNotebookItem(response?.item);
      if (!nextNote) throw new Error("Unable to rename this note right now.");
      setNotes((prev) => prev.map((note) => (note.id === noteId ? nextNote : note)));
      if (currentNoteId === noteId) {
        setNoteTitle(nextNote.title);
        setNoteBody(nextNote.content || "");
      }
      setSaveMessage("Note renamed.");
    } catch (error) {
      setSaveMessage(error?.message || "Unable to rename this note right now.");
    }
    setTimeout(() => setSaveMessage(""), 2200);
  };

  const archiveNoteById = async (noteId) => {
    const target = notes.find((note) => note.id === noteId);
    if (!target) return;
    try {
      await updateInstitutionNotebookItem(noteId, { archived: true });
      setNotes((prev) => prev.filter((note) => note.id !== noteId));
      if (currentNoteId === noteId) {
        setCurrentNoteId(null);
        setNoteTitle("Note_ElimuLink_1_2026");
        setNoteBody("");
        if (isCompactMobile && !embedded) {
          setShowMobileLanding(true);
        }
      }
      setSaveMessage(`"${target.title}" archived.`);
    } catch (error) {
      setSaveMessage(error?.message || "Unable to archive this note right now.");
    }
    setTimeout(() => setSaveMessage(""), 2200);
  };

  const deleteNoteById = async (noteId) => {
    try {
      await deleteInstitutionNotebookItem(noteId);
      setNotes((prev) => prev.filter((note) => note.id !== noteId));
      if (currentNoteId === noteId) {
        setCurrentNoteId(null);
        setNoteTitle("Note_ElimuLink_1_2026");
        setNoteBody("");
        if (isCompactMobile && !embedded) {
          setShowMobileLanding(true);
        }
      }
      setSaveMessage("Note deleted.");
    } catch (error) {
      setSaveMessage(error?.message || "Unable to delete this note right now.");
    }
    setTimeout(() => setSaveMessage(""), 2200);
  };

  const confirmDeleteNoteById = (noteId) => {
    const target = notes.find((note) => note.id === noteId);
    if (!target) return;
    const confirmed = window.confirm(`Delete "${target.title}"? This removes it from the current Notebook list.`);
    if (!confirmed) return;
    void deleteNoteById(noteId);
    setActiveDesktopMoveMenuId(null);
    setActiveDesktopNoteMenuId(null);
  };

  const moveNoteById = (noteId, destination) => {
    const target = notes.find((note) => note.id === noteId);
    if (!target) return;
    const nextDestination = String(destination || "").trim();
    if (!nextDestination) return;
    setSaveMessage(`"${target.title}" is prepared to move to ${nextDestination}.`);
    setTimeout(() => setSaveMessage(""), 2200);
    setActiveDesktopMoveMenuId(null);
    setActiveDesktopNoteMenuId(null);
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

  const handleUndo = () => {
    runEditorCommand("undo");
  };

  const handleRedo = () => {
    runEditorCommand("redo");
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

  const insertChecklistTemplate = () => {
    insertTextAtCursor("\n- [ ] ");
  };

  const removeAttachmentById = (attachmentId) => {
    setAttachments((prev) => prev.filter((item) => item.id !== attachmentId));
    setSaveMessage("Attachment removed.");
    setTimeout(() => setSaveMessage(""), 2000);
  };

  const runAssistInsert = (mode) => {
    const normalized = String(mode || "").trim().toLowerCase();
    let text = "\n\nElimuLinkAI: Suggested structure, examples, and key revision points.";
    if (normalized === "outline") {
      text = "\n\nOutline\n1. Key idea\n2. Supporting evidence\n3. Example\n4. Revision checkpoint";
    } else if (normalized === "summary") {
      text = "\n\nSummary\n- Main concept\n- Important details\n- Revision takeaway";
    } else if (normalized === "questions") {
      text = "\n\nStudy Questions\n1. What is the main idea?\n2. Which example supports it?\n3. What should be revised next?";
    } else if (normalized === "rewrite") {
      text = "\n\nRewrite clearly:\n- Simplify the explanation\n- Keep the core meaning\n- Add one concrete example";
    }
    insertTextAtCursor(text);
    setIsMobileAssistSheetOpen(false);
    setSaveMessage("Assist content inserted.");
    setTimeout(() => setSaveMessage(""), 2000);
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

  const handleSaveNote = async () => {
    const title = String(noteTitle || "").trim() || "Untitled Note";
    const content = syncEditorTextState() || "";
    if (!content.trim()) {
      window.alert("Note is empty.");
      return;
    }
    setIsNotebookItemSaving(true);
    let message = "Saved.";
    try {
      const response = currentNoteId
        ? await updateInstitutionNotebookItem(currentNoteId, { title, content })
        : await createInstitutionNotebookItem({ title, content });
      const savedNote = mapNotebookItem(response?.item);
      if (!savedNote) throw new Error("Unable to save this note right now.");
      setNotes((prev) => [savedNote, ...prev.filter((item) => item.id !== savedNote.id)]);
      setCurrentNoteId(savedNote.id);
      setNoteTitle(savedNote.title);
      setNoteBody(savedNote.content || "");

      const payload = {
        id: savedNote.id,
        title: savedNote.title,
        content: savedNote.content || "",
        createdAt: savedNote.createdAt || Date.now(),
        updatedAt: savedNote.updatedAt || Date.now(),
      };
      if (typeof onSaveNote === "function") {
        try {
          const result = await onSaveNote(payload);
          if (result && typeof result === "object" && typeof result.message === "string" && result.message.trim()) {
            message = result.message.trim();
          }
        } catch {
          message = "Saved note, but linked save failed.";
        }
      }
    } catch (error) {
      message = error?.message || "Unable to save this note right now.";
    } finally {
      setIsNotebookItemSaving(false);
    }
    setSaveMessage(message);
    setTimeout(() => setSaveMessage(""), 2000);
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

  if (showNotebookLanding) {
    return (
      <MobileFeatureLandingShell
        featureName="Notebook"
        featureSubtitle="Notes, drafts, and study structure"
        featureDescription="Capture class notes, continue active drafts, and open the full notebook only when you need the editor."
        featureIcon={BookOpen}
        featureStyle="soft"
        workspaceLabel={desktopWorkspaceSettings.name || "Notebook"}
        workspaceHint={desktopWorkspaceSettings.instructions || "Notebook workspace"}
        workspaceBadge="Institution workspace"
        hideInstitutionStrip
        quickActions={[
          {
            key: "subgroup",
            label: "Subgroup",
            icon: Rows3,
            onClick: () => {
              setDesktopWorkspaceStatus("");
              setDesktopSubgroupQuery(desktopWorkspaceSettings.linkedSubgroup === "Not linked" ? "" : desktopWorkspaceSettings.linkedSubgroup);
              openNotebookSettings();
            },
          },
          {
            key: "template",
            label: "Quick template",
            icon: Sparkles,
            onClick: () => createNotebookNote("Lecture Notes"),
          },
          {
            key: "tools",
            label: "Workspace tools",
            icon: MoreHorizontal,
            onClick: openNotebookSettings,
          },
        ]}
        quickActionsStyle="rows"
        utilityActions={[
          { key: "rename-workspace", label: "Rename workspace", icon: PencilLine, onClick: renameDesktopWorkspace },
          { key: "move-workspace", label: "Move to workspace", icon: Rows3, onClick: moveWorkspaceToProject },
          { key: "archive-workspace", label: "Archive workspace", icon: Archive, onClick: handleDesktopWorkspaceArchive },
          { key: "delete-workspace", label: "Delete workspace", icon: Trash2, destructive: true, onClick: handleDesktopWorkspaceDelete },
        ]}
        shareConfig={{
          title: "Share Notebook",
          description: "Invite collaborators, choose access, and keep Notebook sharing calm and mobile-friendly.",
          emailLabel: "Invite teammate",
          emailPlaceholder: "name@example.com",
          accessLabel: "Who can open this",
          accessOptions: [
            { value: "only-invited", label: "Only invited people" },
            { value: "institution", label: "Institution members" },
            { value: "subgroup-only", label: "Linked subgroup only" },
          ],
          defaultAccess: desktopShareAccess,
          membersTitle: "Owner and members",
          members: desktopWorkspaceMembers,
          privacyNote: "Subgroup-only access stays tied to the linked subgroup when one is available.",
          submitLabel: "Save share access",
        }}
        items={notebookLandingItems}
        listStyle="plain"
        inputPlaceholder="New note"
        inputValue={landingInputValue}
        onInputChange={setLandingInputValue}
        onInputSubmit={(value) => createNotebookNote(value)}
        onMenu={onOpenMainMenu || onBack}
        onShare={handleNotebookShare}
        onShareSubmit={handleMobileNotebookShareSubmit}
        onSettings={openNotebookSettings}
        onNewWork={() => createNotebookNote(landingInputValue)}
        onStartCall={onOpenLive}
        onOpenItem={(item) => openNotebookNote(item.id)}
        emptyStateTitle={
          isNotebookItemsLoading
            ? "Loading notebook"
            : notebookItemsError
              ? "Notebook unavailable"
              : "No notebook work yet"
        }
        emptyState={
          isNotebookItemsLoading
            ? "Fetching your notebook items."
            : notebookItemsError || "No notebook work yet. Start a new note to begin."
        }
        emptyStateActionLabel="Create note"
        onEmptyStateAction={() => createNotebookNote()}
      />
    );
  }

  if (showNotebookDesktopLanding) {
    const desktopInstitutionName =
      desktopWorkspaceSettings.linkedInstitution && desktopWorkspaceSettings.linkedInstitution.trim()
        ? desktopWorkspaceSettings.linkedInstitution
        : "ElimuLink University";
    const desktopInstitutionLine = "Learning together with clarity, structure, and shared academic progress.";
    return (
      <div className="min-h-[100dvh] bg-[linear-gradient(180deg,#f8fafc_0%,#f4f7fb_48%,#eef3f9_100%)] px-6 py-6 dark:bg-[linear-gradient(180deg,#06111f_0%,#0a1527_48%,#0c1830_100%)]">
        <div className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-7xl flex-col gap-6">
          <div className="relative flex items-start justify-between gap-6 bg-transparent px-7 py-6">
            <div className="absolute -left-5 top-1" data-desktop-landing-menu>
              <button
                type="button"
                onClick={() => setIsDesktopLandingMenuOpen((prev) => !prev)}
                aria-expanded={isDesktopLandingMenuOpen}
                aria-label="Toggle workspace menu"
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-[0_12px_30px_rgba(15,23,42,0.06)] hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                {isDesktopLandingMenuOpen ? <X size={18} /> : <Menu size={18} />}
              </button>

              {isDesktopLandingMenuOpen ? (
                <div className="mt-3 w-64 rounded-[24px] border border-slate-200 bg-white p-3 shadow-[0_24px_60px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-[#0d182b] dark:shadow-[0_24px_60px_rgba(2,8,23,0.45)]">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDesktopLandingMenuOpen(false);
                      setShowDesktopLanding(true);
                    }}
                    className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <span>Workspace home</span>
                    <ChevronRight size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDesktopLandingMenuOpen(false);
                      createNotebookNote();
                    }}
                    className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <span>New note</span>
                    <Plus size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setIsDesktopLandingMenuOpen(false);
                      setDesktopWorkspaceStatus("");
                      setDesktopSubgroupQuery(desktopWorkspaceSettings.linkedSubgroup === "Not linked" ? "" : desktopWorkspaceSettings.linkedSubgroup);
                      setDesktopSubgroupError("");
                      setIsDesktopSettingsOpen(true);
                      await loadDesktopWorkspace({ quiet: true });
                    }}
                    className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <span>Workspace settings</span>
                    <Rows3 size={16} />
                  </button>
                </div>
              ) : null}
            </div>

            <div className="max-w-3xl">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300">Institution Workspace</div>
              <div className="mt-3 flex items-center gap-3">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-transparent text-slate-700 dark:text-slate-100">
                  <BookOpen size={22} />
                </span>
                <div>
                  <h1 className="text-3xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-slate-50">Notebook</h1>
                  <p className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-300">
                    Review saved notebook work, open a note, or start a fresh workspace without dropping into the editor immediately.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-full bg-white/70 p-1.5 shadow-[0_8px_22px_rgba(15,23,42,0.04)]" data-desktop-utility-menu>
              <button
                type="button"
                onClick={async () => {
                  setDesktopShareStatus("");
                  setDesktopSubgroupQuery(desktopWorkspaceSettings.linkedSubgroup === "Not linked" ? "" : desktopWorkspaceSettings.linkedSubgroup);
                  setDesktopSubgroupError("");
                  setIsDesktopShareOpen(true);
                  await loadDesktopWorkspace({ quiet: true });
                }}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200/70 bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
              >
                <Copy size={15} />
                Share
              </button>
              <button
                type="button"
                onClick={async () => {
                  setDesktopWorkspaceStatus("");
                  setDesktopSubgroupQuery(desktopWorkspaceSettings.linkedSubgroup === "Not linked" ? "" : desktopWorkspaceSettings.linkedSubgroup);
                  setDesktopSubgroupError("");
                  setIsDesktopSettingsOpen(true);
                  await loadDesktopWorkspace({ quiet: true });
                }}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200/70 bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
              >
                <Rows3 size={15} />
                Settings
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsDesktopUtilityMenuOpen((prev) => !prev)}
                  aria-expanded={isDesktopUtilityMenuOpen}
                  aria-label="More workspace actions"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/70 bg-white text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
                >
                  <MoreHorizontal size={16} />
                </button>

                {isDesktopUtilityMenuOpen ? (
                  <div className="absolute right-0 top-14 z-30 w-72 rounded-[26px] border border-slate-200/80 bg-white p-2.5 shadow-[0_22px_56px_rgba(15,23,42,0.12)]">
                    <button
                      type="button"
                      onClick={async () => {
                        setIsDesktopUtilityMenuOpen(false);
                        await renameDesktopWorkspace();
                      }}
                      className="flex w-full items-center gap-3 rounded-[18px] px-4 py-3 text-left text-[14px] text-slate-700 transition hover:bg-slate-50"
                    >
                      <PencilLine size={16} />
                      <span>Rename</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsDesktopUtilityMenuOpen(false);
                        moveWorkspaceToProject();
                      }}
                      className="flex w-full items-center justify-between gap-3 rounded-[18px] px-4 py-3 text-left text-[14px] text-slate-700 transition hover:bg-slate-50"
                    >
                      <span className="flex items-center gap-3">
                        <Rows3 size={16} />
                        <span>Move to project / workspace</span>
                      </span>
                      <ChevronRight size={15} className="text-slate-400" />
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        setIsDesktopUtilityMenuOpen(false);
                        await handleDesktopWorkspaceArchive();
                      }}
                      className="mt-1 flex w-full items-center gap-3 rounded-[18px] px-4 py-3 text-left text-[14px] text-slate-700 transition hover:bg-slate-50"
                    >
                      <Archive size={16} />
                      <span>Archive</span>
                    </button>
                    <div className="my-2 border-t border-slate-100" />
                    <button
                      type="button"
                      onClick={() => {
                        setIsDesktopUtilityMenuOpen(false);
                        setDesktopDeleteConfirmText("");
                        setIsDesktopDeleteConfirmOpen(true);
                      }}
                      className="flex w-full items-center gap-3 rounded-[18px] px-4 py-3 text-left text-[14px] text-rose-600 transition hover:bg-rose-50"
                    >
                      <Trash2 size={16} />
                      <span>Delete</span>
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid flex-1 grid-cols-12 gap-6">
            <section className="col-span-12 rounded-[30px] border border-slate-200/80 bg-white/92 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-[#0d182b]/96 dark:shadow-[0_20px_50px_rgba(2,8,23,0.34)] lg:col-span-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold text-slate-950 dark:text-slate-50">Saved notes</div>
                  <div className="mt-1 text-sm text-slate-700 dark:text-slate-300">Open any note and continue editing with the existing Notebook flow.</div>
                </div>
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">
                  {isDesktopWorkspaceLoading ? "Syncing workspace..." : `${notebookLandingItems.length} items`}
                </div>
              </div>
              <div className="mt-6 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    ["Notes", String(notebookLandingItems.length), "Saved entries"],
                    ["Workspace", desktopWorkspaceSettings.defaultView || "Notebook", "Current mode"],
                    ["Institution", desktopInstitutionName, "Linked context"],
                    ["Subgroup", desktopWorkspaceSettings.linkedSubgroup || "Not linked", "Shared study flow"],
                  ].map(([label, value, sub]) => (
                    <div key={label} className="rounded-[22px] border border-slate-200/80 bg-white px-4 py-4 dark:border-white/10 dark:bg-[#101c31]">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">{label}</div>
                      <div className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-slate-50">{value}</div>
                      <div className="mt-1 text-sm text-slate-700 dark:text-slate-300">{sub}</div>
                    </div>
                  ))}
                </div>
                <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-[#101c31]">
                  <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-600 dark:text-slate-300">Writing activity</div>
                  <div className="mt-1 text-sm text-slate-700 dark:text-slate-300">A clean snapshot of note volume and current study momentum.</div>
                  <div className="mt-5 flex h-28 items-end gap-3">
                    {["Ideas", "Drafts", "Revision", "Share"].map((label, index) => (
                      <div key={label} className="flex flex-1 flex-col items-center gap-2">
                        <div className="w-full rounded-t-[18px] bg-[linear-gradient(180deg,#2563eb_0%,#14b8a6_100%)]" style={{ height: `${[48, 68, 82, 54][index]}%` }} />
                        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600 dark:text-slate-400">{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6">
                {notebookLandingItems.length ? (
                  notebookLandingItems.map((item) => (
                    <div
                      key={item.id}
                      data-desktop-note-menu
                      className="group relative flex items-start justify-between gap-4 border-t border-slate-200/70 bg-transparent px-5 py-5 transition hover:bg-slate-50/75 first:border-t-0"
                    >
                      <button
                        type="button"
                        onClick={() => openNotebookNote(item.id)}
                        className="min-w-0 flex flex-1 items-start gap-4 text-left focus-visible:outline-none"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-3">
                            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-transparent text-slate-600">
                              <BookOpen size={16} />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="text-base font-semibold text-slate-900">{item.title}</div>
                              <div className="mt-1 text-sm leading-6 text-slate-500">{item.preview}</div>
                            </div>
                          </div>
                        </div>
                      </button>

                      <div className="relative flex shrink-0 items-start gap-2">
                        <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                          Updated {formatTime(item.updatedAt)}
                        </div>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setActiveDesktopMoveMenuId(null);
                            setActiveDesktopNoteMenuId((prev) => (prev === item.id ? null : item.id));
                          }}
                          className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-white hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200 ${
                            activeDesktopNoteMenuId === item.id ? "bg-white text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.08)]" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
                          }`}
                          aria-label="Note actions"
                        >
                          <MoreHorizontal size={16} />
                        </button>

                        {activeDesktopNoteMenuId === item.id ? (
                          <div className="absolute right-0 top-10 z-20 w-60 rounded-[24px] border border-slate-200/80 bg-white p-2.5 shadow-[0_22px_56px_rgba(15,23,42,0.12)]">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                renameNoteById(item.id);
                                setActiveDesktopNoteMenuId(null);
                              }}
                              className="flex w-full items-center gap-3 rounded-[18px] px-4 py-3 text-left text-[14px] text-slate-700 transition hover:bg-slate-50"
                            >
                              <PencilLine size={15} />
                              <span>Rename</span>
                            </button>

                            <div className="relative">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setActiveDesktopMoveMenuId((prev) => (prev === item.id ? null : item.id));
                                }}
                                className="flex w-full items-center justify-between gap-3 rounded-[18px] px-4 py-3 text-left text-[14px] text-slate-700 transition hover:bg-slate-50"
                              >
                                <span className="flex items-center gap-3">
                                  <Rows3 size={15} />
                                  <span>Move note</span>
                                </span>
                                <ChevronRight size={15} />
                              </button>

                              {activeDesktopMoveMenuId === item.id ? (
                                <div className="absolute left-[calc(100%+0.5rem)] top-0 w-52 rounded-[24px] border border-slate-200/80 bg-white p-2.5 shadow-[0_22px_56px_rgba(15,23,42,0.12)]">
                                  {["Assignments", "Subgroup"].map((destination) => (
                                    <button
                                      key={destination}
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        moveNoteById(item.id, destination);
                                      }}
                                      className="flex w-full items-center gap-3 rounded-[18px] px-4 py-3 text-left text-[14px] text-slate-700 transition hover:bg-slate-50"
                                    >
                                      <BookOpen size={15} />
                                      <span>{destination}</span>
                                    </button>
                                  ))}
                                </div>
                              ) : null}
                            </div>

                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                archiveNoteById(item.id);
                                setActiveDesktopNoteMenuId(null);
                              }}
                              className="mt-1 flex w-full items-center gap-3 rounded-[18px] px-4 py-3 text-left text-[14px] text-slate-700 transition hover:bg-slate-50"
                            >
                              <Archive size={15} />
                              <span>Archive</span>
                            </button>
                            <div className="my-2 border-t border-slate-100" />
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                confirmDeleteNoteById(item.id);
                              }}
                              className="flex w-full items-center gap-3 rounded-[18px] px-4 py-3 text-left text-[14px] text-rose-600 transition hover:bg-rose-50"
                            >
                              <Trash2 size={15} />
                              <span>Delete</span>
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50/70 px-6 py-10 text-center">
                    <div className="text-lg font-semibold text-slate-900">No notebook work yet</div>
                    <div className="mt-2 text-sm text-slate-500">Create your first note to start this workspace.</div>
                  </div>
                )}
              </div>
            </section>

            <aside className="col-span-12 flex flex-col gap-6 lg:col-span-4">
              <section className="rounded-[26px] border border-slate-200/70 bg-white/90 px-5 py-3.5 shadow-[0_14px_36px_rgba(15,23,42,0.045)] dark:border-white/10 dark:bg-[#0d182b]/96 dark:shadow-[0_14px_36px_rgba(2,8,23,0.34)]">
                <div className="flex items-start gap-4">
                  <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-transparent text-sm font-semibold text-slate-700 dark:text-slate-100">
                    EL
                  </div>
                  <div className="min-w-0 pt-0.5">
                    <div className="text-sm font-semibold text-slate-950 dark:text-slate-50">{desktopInstitutionName}</div>
                    <div className="mt-0.5 text-sm leading-7 text-slate-700 dark:text-slate-300">{desktopInstitutionLine}</div>
                  </div>
                </div>
              </section>

              <div className="rounded-[30px] border border-slate-200/70 bg-white/92 p-5 shadow-[0_18px_42px_rgba(15,23,42,0.055)] dark:border-white/10 dark:bg-[#0d182b]/96 dark:shadow-[0_18px_42px_rgba(2,8,23,0.34)]">
                <div className="rounded-[24px] border border-slate-200/70 bg-slate-50/70 p-5 dark:border-white/10 dark:bg-[#101c31]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-lg font-semibold text-slate-950 dark:text-slate-50">New work</div>
                      <div className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
                        Start a fresh note and jump straight into the existing editor. Current note handlers stay unchanged.
                      </div>
                    </div>
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-[0_10px_20px_rgba(15,23,42,0.06)] dark:bg-slate-900 dark:text-slate-100 dark:shadow-[0_10px_20px_rgba(2,8,23,0.3)]">
                      <Plus size={18} />
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => createNotebookNote()}
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                  >
                    <Plus size={16} />
                    New note
                  </button>
                </div>

                <div className="mt-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-lg font-semibold text-slate-950 dark:text-slate-50">Workspace snapshot</div>
                    <button
                      type="button"
                      onClick={async () => {
                        setDesktopWorkspaceStatus("");
                        setDesktopSubgroupQuery(desktopWorkspaceSettings.linkedSubgroup === "Not linked" ? "" : desktopWorkspaceSettings.linkedSubgroup);
                        setDesktopSubgroupError("");
                        setIsDesktopSettingsOpen(true);
                        await loadDesktopWorkspace({ quiet: true });
                      }}
                      className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 transition hover:text-slate-700 dark:text-slate-300 dark:hover:text-white"
                    >
                      Open settings
                    </button>
                  </div>
                  <div className="mt-4 space-y-3 text-sm text-slate-700 dark:text-slate-300">
                    <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200/70 dark:bg-[#101c31] dark:ring-white/10">
                      <span>Visibility</span>
                      <span className="font-medium text-slate-950 dark:text-slate-50">{desktopWorkspaceSettings.visibility}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200/70 dark:bg-[#101c31] dark:ring-white/10">
                      <span>Linked institution</span>
                      <span className="font-medium text-slate-950 dark:text-slate-50">{desktopWorkspaceSettings.linkedInstitution}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200/70 dark:bg-[#101c31] dark:ring-white/10">
                      <span>Linked subgroup</span>
                      <span className="font-medium text-right text-slate-950 dark:text-slate-50">
                        {desktopWorkspaceSettings.linkedSubgroupId
                          ? `${desktopWorkspaceSettings.linkedSubgroup} (#${desktopWorkspaceSettings.linkedSubgroupId})`
                          : "Not linked"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200/70 dark:bg-[#101c31] dark:ring-white/10">
                      <span>Memory behavior</span>
                      <span className="font-medium text-slate-950 dark:text-slate-50">{desktopWorkspaceSettings.memoryBehavior}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200/70 dark:bg-[#101c31] dark:ring-white/10">
                      <span>Share access</span>
                      <span className="font-medium text-slate-950 dark:text-slate-50">
                        {desktopWorkspaceShareLink ? desktopShareAccess : "Private workspace"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <section className="rounded-[26px] border border-slate-200/70 bg-white/90 px-5 py-4.5 shadow-[0_14px_36px_rgba(15,23,42,0.045)] dark:border-white/10 dark:bg-[#0d182b]/96 dark:shadow-[0_14px_36px_rgba(2,8,23,0.34)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-slate-950 dark:text-slate-50">Quick actions</div>
                    <div className="mt-1 text-sm text-slate-700 dark:text-slate-300">Lightweight Notebook shortcuts for this workspace.</div>
                  </div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">Notebook</div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                  <button
                    type="button"
                    onClick={async () => {
                      setDesktopWorkspaceStatus("Choose a subgroup in Workspace Settings to link Notebook to a real academic subgroup.");
                      setDesktopSubgroupQuery(desktopWorkspaceSettings.linkedSubgroup === "Not linked" ? "" : desktopWorkspaceSettings.linkedSubgroup);
                      setDesktopSubgroupError("");
                      setIsDesktopSettingsOpen(true);
                      await loadDesktopWorkspace({ quiet: true });
                    }}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-[#101c31] dark:hover:bg-slate-800"
                  >
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-100">
                      <Rows3 size={16} />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-slate-950 dark:text-slate-50">Subgroup</span>
                      <span className="mt-1 block text-xs text-slate-700 dark:text-slate-300">Link a real subgroup for access control.</span>
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => createNotebookNote("Lecture Notes")}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-[#101c31] dark:hover:bg-slate-800"
                  >
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-100">
                      <StickyNote size={16} />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-slate-950 dark:text-slate-50">Quick templates</span>
                      <span className="mt-1 block text-xs text-slate-700 dark:text-slate-300">Start with a ready-to-name lecture note.</span>
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      setDesktopWorkspaceStatus("Workspace tools stay in Settings for now.");
                      setDesktopSubgroupQuery(desktopWorkspaceSettings.linkedSubgroup === "Not linked" ? "" : desktopWorkspaceSettings.linkedSubgroup);
                      setDesktopSubgroupError("");
                      setIsDesktopSettingsOpen(true);
                      await loadDesktopWorkspace({ quiet: true });
                    }}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-[#101c31] dark:hover:bg-slate-800"
                  >
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-100">
                      <Sparkles size={16} />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-slate-950 dark:text-slate-50">Workspace tools</span>
                      <span className="mt-1 block text-xs text-slate-700 dark:text-slate-300">Open archive, memory, and collaboration controls.</span>
                    </span>
                  </button>
                </div>
              </section>
            </aside>
          </div>
        </div>

        <NotebookWorkspaceModal
          open={isDesktopShareOpen}
          title="Share Notebook Workspace"
          onClose={() => setIsDesktopShareOpen(false)}
        >
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-5">
              <label className="block">
                <div className="mb-2 text-sm font-medium text-slate-700">Email invite</div>
                <input
                  value={desktopShareInvite}
                  onChange={(e) => setDesktopShareInvite(e.target.value)}
                  placeholder="name@institution.edu"
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-sky-300"
                />
              </label>

              <label className="block">
                <div className="mb-2 text-sm font-medium text-slate-700">Access level</div>
                <select
                  value={desktopShareAccess}
                  onChange={(e) => {
                    void handleDesktopShareAccessChange(e.target.value);
                  }}
                  disabled={isDesktopShareBusy}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-sky-300"
                >
                  <option value="only-invited">Only invited</option>
                  <option value="anyone-with-link">Anyone with link</option>
                  <option value="institution-only">Institution only</option>
                  <option value="subgroup-only">Subgroup only</option>
                </select>
              </label>

              {desktopShareAccess === "subgroup-only" ? (
                <div>
                  <div className="mb-2 text-sm font-medium text-slate-700">Linked subgroup</div>
                  <NotebookSubgroupPicker
                    selectedId={desktopWorkspaceSettings.linkedSubgroupId}
                    selectedLabel={desktopWorkspaceSettings.linkedSubgroup}
                    searchValue={desktopSubgroupQuery}
                    onSearchChange={setDesktopSubgroupQuery}
                    results={desktopSubgroupResults}
                    loading={isDesktopSubgroupLoading}
                    error={desktopSubgroupError}
                    onSelect={(group) => {
                      void handleDesktopShareSubgroupSelect(group);
                    }}
                    onClear={clearDesktopSubgroupSelection}
                    helperText="Subgroup-only access uses the real subgroup id under the hood. Select a subgroup here before copying or sharing the link."
                  />
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleDesktopShareInvite}
                  disabled={isDesktopShareBusy}
                  className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  {isDesktopShareBusy ? "Saving..." : "Add invite"}
                </button>
                <button
                  type="button"
                  onClick={handleDesktopShareCopyLink}
                  disabled={isDesktopShareBusy}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Copy link
                </button>
              </div>

              <div className="rounded-2xl border border-sky-100 bg-sky-50/80 px-4 py-3 text-sm text-sky-900">
                Privacy note: anyone-with-link, institution-only, invited, and subgroup-only all persist on the real institution share link. Subgroup-only now requires a valid linked subgroup id and only allows the owner or real subgroup members.
              </div>

              {desktopShareStatus ? <div className="text-sm font-medium text-emerald-700">{desktopShareStatus}</div> : null}
            </div>

            <div className="space-y-5">
              <div>
                <div className="text-sm font-medium text-slate-700">Owner and members</div>
                <div className="mt-3 space-y-3">
                  {desktopWorkspaceMembers.map((entry) => (
                    <div key={entry.key} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm text-slate-800">{entry.label}</div>
                        <div className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{entry.role}</div>
                      </div>
                      {entry.removable ? (
                        <button
                          type="button"
                          onClick={() => {
                            void handleDesktopShareRemoveInvite(entry.label);
                          }}
                          disabled={isDesktopShareBusy}
                          className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Remove
                        </button>
                      ) : (
                        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Owner</span>
                      )}
                    </div>
                  ))}
                  {!desktopWorkspaceMembers.some((entry) => entry.removable) ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-4 text-sm text-slate-500">
                      No invited members yet. Add an email invite to share this workspace with specific people.
                    </div>
                  ) : null}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-slate-700">Quick share targets</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {["Email", "Copy link", "Lecturer group", "Subgroup"].map((target) => (
                    <button
                      key={target}
                      type="button"
                      onClick={() => setDesktopShareStatus(`${target} is prepared here as a frontend share shortcut.`)}
                      className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      {target}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleDesktopShareRemoveAccess}
                disabled={!desktopWorkspaceShareLink?.id || isDesktopShareBusy}
                className="inline-flex items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700 hover:bg-rose-100"
              >
                Remove access link
              </button>
            </div>
          </div>
        </NotebookWorkspaceModal>

        <NotebookWorkspaceModal
          open={isDesktopSettingsOpen}
          title="Notebook Workspace Settings"
          onClose={() => setIsDesktopSettingsOpen(false)}
        >
          <div className="grid gap-6 lg:grid-cols-2">
            <label className="block">
              <div className="mb-2 text-sm font-medium text-slate-700">Workspace / project name</div>
              <input
                value={desktopWorkspaceSettings.name}
                onChange={(e) => setDesktopWorkspaceSettings((prev) => ({ ...prev, name: e.target.value }))}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-sky-300"
              />
            </label>

            <label className="block">
              <div className="mb-2 text-sm font-medium text-slate-700">Visibility</div>
              <select
                value={desktopWorkspaceSettings.visibility}
                onChange={(e) => setDesktopWorkspaceSettings((prev) => ({ ...prev, visibility: e.target.value }))}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-sky-300"
              >
                <option value="institution">Institution</option>
                <option value="private">Private</option>
                <option value="subgroup">Subgroup</option>
              </select>
            </label>

            <label className="block lg:col-span-2">
              <div className="mb-2 text-sm font-medium text-slate-700">Instructions / context</div>
              <textarea
                value={desktopWorkspaceSettings.instructions}
                onChange={(e) => setDesktopWorkspaceSettings((prev) => ({ ...prev, instructions: e.target.value }))}
                rows={4}
                placeholder="Add guidance for how this notebook workspace should be used."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-300"
              />
            </label>

            <label className="block">
              <div className="mb-2 text-sm font-medium text-slate-700">Collaboration permissions</div>
              <select
                value={desktopWorkspaceSettings.permissions}
                onChange={(e) => setDesktopWorkspaceSettings((prev) => ({ ...prev, permissions: e.target.value }))}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-sky-300"
              >
                <option value="members-can-view">Members can view</option>
                <option value="members-can-comment">Members can comment</option>
                <option value="members-can-edit">Members can edit</option>
              </select>
            </label>

            <label className="block">
              <div className="mb-2 text-sm font-medium text-slate-700">Memory behavior</div>
              <select
                value={desktopWorkspaceSettings.memoryBehavior}
                onChange={(e) => setDesktopWorkspaceSettings((prev) => ({ ...prev, memoryBehavior: e.target.value }))}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-sky-300"
              >
                <option value="workspace-default">Workspace default</option>
                <option value="reference-history">Reference history</option>
                <option value="minimal-memory">Minimal memory</option>
              </select>
            </label>

            <label className="block">
              <div className="mb-2 text-sm font-medium text-slate-700">Linked institution</div>
              <input
                value={desktopWorkspaceSettings.linkedInstitution}
                onChange={(e) => setDesktopWorkspaceSettings((prev) => ({ ...prev, linkedInstitution: e.target.value }))}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-sky-300"
              />
            </label>

            <div className="block">
              <div className="mb-2 text-sm font-medium text-slate-700">Linked subgroup</div>
              <NotebookSubgroupPicker
                selectedId={desktopWorkspaceSettings.linkedSubgroupId}
                selectedLabel={desktopWorkspaceSettings.linkedSubgroup}
                searchValue={desktopSubgroupQuery}
                onSearchChange={setDesktopSubgroupQuery}
                results={desktopSubgroupResults}
                loading={isDesktopSubgroupLoading}
                error={desktopSubgroupError}
                onSelect={selectDesktopSubgroup}
                onClear={clearDesktopSubgroupSelection}
                helperText="Selecting a subgroup stores its real subgroup id for backend enforcement. The label is only shown for readability."
              />
            </div>

            <div className="lg:col-span-2 flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleDesktopWorkspaceSave}
                disabled={isDesktopSettingsBusy}
                className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                {isDesktopSettingsBusy ? "Saving..." : "Save settings"}
              </button>
              <button
                type="button"
                onClick={handleDesktopWorkspaceArchive}
                disabled={isDesktopSettingsBusy}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Archive project
              </button>
              <button
                type="button"
                onClick={() => {
                  setDesktopDeleteConfirmText("");
                  setIsDesktopDeleteConfirmOpen(true);
                }}
                disabled={isDesktopSettingsBusy}
                className="inline-flex items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700 hover:bg-rose-100"
              >
                Delete project
              </button>
            </div>

            {desktopWorkspaceStatus ? <div className="lg:col-span-2 text-sm font-medium text-emerald-700">{desktopWorkspaceStatus}</div> : null}
          </div>
        </NotebookWorkspaceModal>

        <NotebookWorkspaceModal
          open={isDesktopDeleteConfirmOpen}
          title="Delete Notebook Workspace"
          onClose={() => {
            if (isDesktopSettingsBusy) return;
            setIsDesktopDeleteConfirmOpen(false);
            setDesktopDeleteConfirmText("");
          }}
        >
          <div className="space-y-5">
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-6 text-rose-900">
              This deletes the persisted Institution Notebook workspace metadata layer only.
              It removes:
              workspace settings, linked subgroup selection, archive state, and active share links.
              It does not delete your current local notebook notes or editor content in this frontend flow.
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600">
              Type <span className="font-semibold text-slate-900">DELETE</span> to confirm workspace deletion.
            </div>

            <label className="block">
              <div className="mb-2 text-sm font-medium text-slate-700">Confirmation</div>
              <input
                value={desktopDeleteConfirmText}
                onChange={(event) => setDesktopDeleteConfirmText(event.target.value)}
                placeholder="DELETE"
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none focus:border-rose-300"
              />
            </label>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleDesktopWorkspaceDelete}
                disabled={isDesktopSettingsBusy || desktopDeleteConfirmText.trim() !== "DELETE"}
                className="inline-flex items-center justify-center rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDesktopSettingsBusy ? "Deleting..." : "Delete workspace metadata"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsDesktopDeleteConfirmOpen(false);
                  setDesktopDeleteConfirmText("");
                }}
                disabled={isDesktopSettingsBusy}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </NotebookWorkspaceModal>
      </div>
    );
  }

  if (isCompactMobile && !embedded) {
    const noteWordCount = String(noteBody || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;

    return (
      <div className="min-h-[100dvh] bg-slate-50">
        <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex items-center justify-between gap-2 px-4 py-3">
            <button
              type="button"
              onClick={() => setShowMobileLanding(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              aria-label="Back to notes"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="min-w-0 flex-1 px-1">
              <input
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                className="w-full border-0 bg-transparent px-0 text-center text-base font-semibold text-slate-950 outline-none placeholder:text-slate-400"
                placeholder="Note title"
              />
              <div className="mt-0.5 text-center text-[11px] font-medium text-slate-500">
                {isNotebookItemSaving ? "Saving..." : saveMessage || "Notebook"}
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleSaveNote}
                disabled={isNotebookItemSaving}
                className="inline-flex h-10 items-center rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                {isNotebookItemSaving ? "Saving" : "Save"}
              </button>
              <button
                type="button"
                onClick={handleUndo}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                aria-label="Undo"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={handleRedo}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                aria-label="Redo"
              >
                <ChevronRight size={16} />
              </button>
              <button
                type="button"
                onClick={() => setIsMobileInsertSheetOpen(true)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 text-white hover:bg-slate-800"
                aria-label="Insert"
              >
                <Plus size={18} />
              </button>
              <button
                type="button"
                onClick={() => setIsMobileMoreSheetOpen(true)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                aria-label="More note actions"
              >
                <MoreHorizontal size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="px-4 pb-28 pt-4">
          {attachments.length > 0 ? (
            <div className="mb-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Attachments</div>
              <div className="space-y-2">
                {attachments.map((attachment) => (
                  <div key={attachment.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2.5">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-800">{attachment.name}</div>
                      <div className="mt-0.5 text-xs text-slate-500">Image attachment</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachmentById(attachment.id)}
                      className="inline-flex h-8 items-center rounded-full border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="rounded-[28px] border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">Notebook editor</div>
                <div className="mt-0.5 text-xs text-slate-500">Focused mobile writing surface</div>
              </div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                {noteWordCount} words
              </div>
            </div>

            <div className="p-4">
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
                className={`min-h-[58vh] w-full whitespace-pre-wrap rounded-2xl border ${editorBorderClass} ${pageToneClass} px-4 py-4 text-[15px] outline-none ${lineSpacingClass} ${penTheme === "custom" ? "" : activePen.textClass}`}
                data-placeholder="Start writing your note here..."
              />
            </div>
          </div>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-3 backdrop-blur">
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setIsMobileFormatSheetOpen(true)}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Type size={16} />
              Aa
            </button>
            <button
              type="button"
              onClick={insertChecklistTemplate}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <List size={16} />
              Checklist
            </button>
            <button
              type="button"
              onClick={() => setIsMobileAssistSheetOpen(true)}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Sparkles size={16} />
              Assist
            </button>
          </div>
        </div>

        <MobileNotebookSheet open={isMobileFormatSheetOpen} title="Format note" onClose={() => setIsMobileFormatSheetOpen(false)}>
          <div className="space-y-5">
            <section>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Text styles</div>
              <div className="grid grid-cols-3 gap-2">
                <button type="button" onClick={() => applyStylePreset("normal")} className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700">Body</button>
                <button type="button" onClick={() => applyStylePreset("heading")} className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700">Heading</button>
                <button type="button" onClick={() => applyStylePreset("nospacing")} className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700">No spacing</button>
              </div>
            </section>

            <section>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Quick formatting</div>
              <div className="grid grid-cols-4 gap-2">
                <button type="button" onClick={() => runEditorCommand("bold", null, { requireSelection: true, emptySelectionMessage: "Select text to make bold." })} className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700">Bold</button>
                <button type="button" onClick={() => runEditorCommand("italic", null, { requireSelection: true, emptySelectionMessage: "Select text to italicize." })} className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700">Italic</button>
                <button type="button" onClick={() => runEditorCommand("underline", null, { requireSelection: true, emptySelectionMessage: "Select text to underline." })} className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700">Underline</button>
                <button type="button" onClick={() => runEditorCommand("justifyLeft")} className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700">Left</button>
                <button type="button" onClick={() => applyBulletList(bulletSymbol, "disc")} className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700">Bullets</button>
                <button type="button" onClick={() => applyNumberedList(numberingStyle)} className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700">Numbering</button>
                <button type="button" onClick={() => { setEditorAlign("center"); runEditorCommand("justifyCenter"); }} className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700">Center</button>
                <button type="button" onClick={() => { setEditorAlign("right"); runEditorCommand("justifyRight"); }} className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700">Right</button>
              </div>
            </section>

            <section className="space-y-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Size and spacing</div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-medium text-slate-600">Font size</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[14, 16, 18, 22].map((size) => (
                    <button key={size} type="button" onClick={() => applyFontSize(size)} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">{size}</button>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-medium text-slate-600">Line spacing</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[
                    ["tight", "Tight"],
                    ["normal", "Normal"],
                    ["wide", "Wide"],
                  ].map(([value, label]) => (
                    <button key={value} type="button" onClick={() => setLineSpacing(value)} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">{label}</button>
                  ))}
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">More formatting</div>
              <div className="space-y-2">
                <button type="button" onClick={() => setIsFontMenuOpen((prev) => !prev)} className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700"><span>Font family</span><span className="text-slate-500">{fontFamily.split(",")[0].replace(/['"]/g, "")}</span></button>
                {isFontMenuOpen ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2">
                    <div className="max-h-48 space-y-1 overflow-y-auto">
                      {ALL_FONT_OPTIONS.map((font) => (
                        <button key={font.key} type="button" onClick={() => setFontAndTrack(font.family, font.label)} className="w-full rounded-xl px-3 py-2 text-left text-sm text-slate-700 hover:bg-white" style={{ fontFamily: font.family }}>
                          {font.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                <button type="button" onClick={() => fontColorInputRef.current?.click()} className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700"><span>Text color</span><span className="h-4 w-4 rounded-full border border-slate-200" style={{ backgroundColor: fontColor }} /></button>
                <button type="button" onClick={() => highlightColorInputRef.current?.click()} className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700"><span>Highlight color</span><span className="h-4 w-4 rounded-full border border-slate-200" style={{ backgroundColor: highlightColor }} /></button>
                <button type="button" onClick={() => runEditorCommand("subscript", null, { requireSelection: true, emptySelectionMessage: "Select text to apply subscript." })} className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700"><span>Subscript</span><Subscript size={16} /></button>
                <button type="button" onClick={() => runEditorCommand("superscript", null, { requireSelection: true, emptySelectionMessage: "Select text to apply superscript." })} className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700"><span>Superscript</span><Superscript size={16} /></button>
                <button type="button" onClick={() => setHasEditorBorder((prev) => !prev)} className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700"><span>Editor border</span><span>{hasEditorBorder ? "On" : "Off"}</span></button>
                <button type="button" onClick={() => setIsEditorShaded((prev) => !prev)} className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700"><span>Shading</span><span>{isEditorShaded ? "On" : "Off"}</span></button>
                <button type="button" onClick={() => setPageTone((prev) => prev === "plain" ? "warm" : prev === "warm" ? "cool" : "plain")} className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700"><span>Page tone</span><span className="capitalize">{pageTone}</span></button>
                <button type="button" onClick={() => setPageWidth((prev) => prev === "compact" ? "normal" : prev === "normal" ? "wide" : "compact")} className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700"><span>Page width</span><span className="capitalize">{pageWidth}</span></button>
                <button type="button" onClick={() => (isFormatPainterArmed ? applyCopiedFormat() : copyCurrentFormat())} className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700"><span>Format painter</span><span>{isFormatPainterArmed ? "Apply" : "Copy"}</span></button>
              </div>
            </section>
          </div>
        </MobileNotebookSheet>

        <MobileNotebookSheet open={isMobileInsertSheetOpen} title="Insert into note" onClose={() => setIsMobileInsertSheetOpen(false)}>
          <div className="space-y-2">
            <button type="button" onClick={() => fileInputRef.current?.click()} className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700"><FileImage size={16} /><span>Upload image</span></button>
            <button type="button" onClick={() => { setSaveMessage("Camera capture is prepared here for a later safe pass."); setTimeout(() => setSaveMessage(""), 2200); setIsMobileInsertSheetOpen(false); }} className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700"><BookOpen size={16} /><span>Camera</span></button>
            <button type="button" onClick={() => { insertChecklistTemplate(); setIsMobileInsertSheetOpen(false); }} className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700"><List size={16} /><span>Checklist</span></button>
            <button type="button" onClick={() => { insertTextAtCursor(`\n${new Date().toLocaleString()}`); setIsMobileInsertSheetOpen(false); }} className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700"><Search size={16} /><span>Date and time</span></button>
            <button type="button" onClick={() => { setIsMobileInsertSheetOpen(false); setSaveMessage("Drawing tools stay available later as a deeper notebook action."); setTimeout(() => setSaveMessage(""), 2200); }} className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700"><Palette size={16} /><span>Drawing tools</span></button>
            <button type="button" onClick={() => { setIsMobileInsertSheetOpen(false); setIsMobileAssistSheetOpen(true); }} className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700"><Sparkles size={16} /><span>Assist insert</span></button>
          </div>
        </MobileNotebookSheet>

        <MobileNotebookSheet open={isMobileAssistSheetOpen} title="Assist with note" onClose={() => setIsMobileAssistSheetOpen(false)}>
          <div className="space-y-2">
            <button type="button" onClick={() => runAssistInsert("outline")} className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700"><Sparkles size={16} /><span>Generate outline</span></button>
            <button type="button" onClick={() => runAssistInsert("summary")} className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700"><Sparkles size={16} /><span>Summarize note</span></button>
            <button type="button" onClick={() => runAssistInsert("questions")} className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700"><Sparkles size={16} /><span>Create study questions</span></button>
            <button type="button" onClick={() => runAssistInsert("rewrite")} className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700"><Sparkles size={16} /><span>Rewrite clearly</span></button>
          </div>
          <div className="mt-4 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-900">
            Assist remains frontend-light here. It inserts structured note content and does not claim full generation.
          </div>
        </MobileNotebookSheet>

        <MobileNotebookSheet open={isMobileMoreSheetOpen} title="More note actions" onClose={() => setIsMobileMoreSheetOpen(false)}>
          <div className="space-y-5">
            <section>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Note actions</div>
              <div className="space-y-2">
                <button type="button" onClick={async () => { await handleNotebookShare(); setIsMobileMoreSheetOpen(false); }} className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700"><Copy size={16} /><span>Share note</span></button>
                <button type="button" onClick={async () => { if (currentNoteId) await renameNoteById(currentNoteId); setIsMobileMoreSheetOpen(false); }} className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700"><PencilLine size={16} /><span>Rename note</span></button>
                <button type="button" onClick={() => { if (currentNoteId) moveNoteById(currentNoteId, "Assignments"); setIsMobileMoreSheetOpen(false); }} className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700"><Rows3 size={16} /><span>Move note</span></button>
                <button type="button" onClick={() => { setIsMobileMoreSheetOpen(false); setIsMobileExportSheetOpen(true); }} className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700"><Copy size={16} /><span>Export / download</span></button>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <div className="font-medium text-slate-800">Note details</div>
                  <div className="mt-1">Words: {noteWordCount}</div>
                  <div className="mt-1">Current note: {currentNote?.title || noteTitle || "Untitled Note"}</div>
                  <div className="mt-1">Updated: {currentNote?.updatedAt ? formatTime(currentNote.updatedAt) : "Not saved yet"}</div>
                </div>
              </div>
            </section>

            <section>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Danger zone</div>
              <div className="space-y-2">
                <button type="button" onClick={async () => { if (currentNoteId) await archiveNoteById(currentNoteId); setIsMobileMoreSheetOpen(false); }} className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700"><Archive size={16} /><span>Archive note</span></button>
                <button type="button" onClick={async () => { if (currentNoteId) await deleteNoteById(currentNoteId); setIsMobileMoreSheetOpen(false); }} className="flex w-full items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-left text-sm text-rose-700"><Trash2 size={16} /><span>Delete note</span></button>
              </div>
            </section>
          </div>
        </MobileNotebookSheet>

        <MobileNotebookSheet open={isMobileExportSheetOpen} title="Export note" onClose={() => setIsMobileExportSheetOpen(false)}>
          <div className="space-y-2">
            {[
              ["pdf", "PDF document"],
              ["doc", "Word document"],
              ["txt", "Plain text"],
            ].map(([format, label]) => (
              <button
                key={format}
                type="button"
                onClick={() => {
                  setDownloadFormat(format);
                  setTimeout(() => handleDownloadNote(), 0);
                  setIsMobileExportSheetOpen(false);
                  setIsMobileMoreSheetOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700"
              >
                <span>{label}</span>
                <span className="uppercase text-slate-400">{format}</span>
              </button>
            ))}
          </div>
        </MobileNotebookSheet>

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
    );
  }

  return (
    <div className={embedded ? "bg-slate-100" : "min-h-[100dvh] bg-slate-100 p-4 md:p-6"}>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="sticky top-0 z-30">
          <div className="border-b border-slate-700 bg-slate-950 px-3 py-2 text-white">
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
              <div className="inline-flex items-center gap-2 min-w-0">
                {isCompactMobile && !embedded ? (
                  <button
                    type="button"
                    onClick={() => setShowMobileLanding(true)}
                    className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2 text-[11px] font-medium text-slate-200 hover:bg-slate-800"
                  >
                    <ChevronLeft size={12} />
                    Notes
                  </button>
                ) : null}
                {!isCompactMobile && !embedded && enableDesktopLanding ? (
                  <button
                    type="button"
                    onClick={openNotebookDesktopLanding}
                    className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2 text-[11px] font-medium text-slate-200 hover:bg-slate-800"
                  >
                    <ChevronLeft size={12} />
                    Workspace
                  </button>
                ) : null}
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
                    onClick={() => createNotebookNote()}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    New
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveNote}
                    disabled={isNotebookItemSaving}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {isNotebookItemSaving ? "Saving..." : "Save"}
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
                  {saveMessage ? <div className="text-xs text-emerald-700">{saveMessage}</div> : null}
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
                onClick={() => createNotebookNote()}
                className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Plus size={16} />
                New Note
              </button>

              <div className="space-y-2">
                {isNotebookItemsLoading ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">
                    Loading notebook items...
                  </div>
                ) : notebookItemsError ? (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-700">
                    {notebookItemsError}
                  </div>
                ) : notes.length ? (
                  notes.map((note) => (
                    <div
                      key={note.id}
                      className={[
                        "rounded-lg border p-2",
                        currentNoteId === note.id
                          ? "border-sky-200 bg-sky-50/80"
                          : "border-slate-200 bg-slate-50",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => openNotebookNote(note.id)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <p className="truncate text-sm font-medium text-slate-800">{note.title}</p>
                          <p className="mt-1 text-xs text-slate-500">{formatTime(note.updatedAt)}</p>
                          <p className="mt-1 text-xs text-slate-500">{note.preview || buildNotePreview(note.content)}</p>
                        </button>

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
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
                    No notebook items yet.
                  </div>
                )}
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
                onClick={() => createNotebookNote()}
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
