import { useEffect, useMemo, useState } from "react";
import {
  apiPost,
  createAssignmentRecord,
  deleteAssignmentRecord,
  fetchAssignmentRecord,
  listAssignments,
  updateAssignmentRecord,
} from "../lib/apiClient";
import AssignmentsDesktopLanding from "./AssignmentsDesktopLanding";
import MobileFeatureLandingShell from "../shared/feature-landing/MobileFeatureLandingShell";
import {
  Archive,
  BookOpen,
  Copy,
  Upload,
  Wand2,
  Sigma,
  PenLine,
  GraduationCap,
  ClipboardList,
  ListChecks,
  CalendarClock,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  PanelRightClose,
  PanelRightOpen,
  FileText,
  Lightbulb,
  Search,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Menu,
  MoreHorizontal,
  Plus,
  Rows3,
  Trash2,
  X,
} from "lucide-react";

const DESKTOP_TABS = [
  { key: "my", label: "My Assignments", icon: ListChecks },
  { key: "tools", label: "AI Tools", icon: Sparkles },
  { key: "exam", label: "Exam Prep", icon: GraduationCap },
];

const MOBILE_TABS = [
  { key: "my", label: "Assignments", icon: ListChecks },
  { key: "tools", label: "AI Tools", icon: Sparkles },
  { key: "exam", label: "Exam Prep", icon: GraduationCap },
  { key: "history", label: "History", icon: PanelRightOpen },
];

const TOOLS = [
  {
    key: "homework",
    label: "Homework Helper",
    icon: BookOpen,
    description: "Break questions into guided steps.",
  },
  {
    key: "upload",
    label: "Upload & Analyze",
    icon: Upload,
    description: "Review files and improve answers.",
  },
  {
    key: "writing",
    label: "Writing Assistant",
    icon: Wand2,
    description: "Polish tone, structure, and clarity.",
  },
  {
    key: "stem",
    label: "STEM Assistant",
    icon: Sigma,
    description: "Solve math or code with explanations.",
  },
  {
    key: "essay",
    label: "Essay Planner & Draft Builder",
    icon: PenLine,
    description: "Plan thesis, arguments, and flow.",
  },
];

const MOBILE_TOOL_SECTION_META = {
  "tools-homework": {
    title: "Homework Helper",
    description: "Break the question into guided steps and get a cleaner approach.",
    toolKey: "homework",
  },
  "tools-upload": {
    title: "Upload & Analyze",
    description: "Review files, understand the task, and improve the response.",
    toolKey: "upload",
  },
  "tools-writing": {
    title: "Writing Assistant",
    description: "Improve clarity, structure, tone, and academic presentation.",
    toolKey: "writing",
  },
  "tools-stem": {
    title: "STEM Assistant",
    description: "Work through math or code with explanations instead of shortcuts.",
    toolKey: "stem",
  },
  "tools-essay": {
    title: "Essay Planner & Draft Builder",
    description: "Shape the thesis, flow, and outline in one focused place.",
    toolKey: "essay",
  },
};

function Pill({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={[
        "inline-flex items-center gap-2 rounded-full whitespace-nowrap px-3 py-2 text-sm font-semibold transition",
        active
          ? "bg-indigo-600 text-white shadow-sm"
          : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Card({ title, subtitle, icon: Icon, right, children }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {Icon ? (
              <span className="h-9 w-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700">
                <Icon size={18} />
              </span>
            ) : null}
            <div className="text-sm font-semibold text-slate-900">{title}</div>
          </div>
          {subtitle ? <div className="mt-1 text-xs text-slate-500">{subtitle}</div> : null}
        </div>
        {right ? right : null}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Input({ label, value, onChange, placeholder }) {
  return (
    <label className="block">
      <div className="text-xs font-semibold text-slate-600 mb-1">{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-200"
      />
    </label>
  );
}

function Textarea({ label, value, onChange, placeholder, rows = 6 }) {
  return (
    <label className="block">
      <div className="text-xs font-semibold text-slate-600 mb-1">{label}</div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-200"
      />
    </label>
  );
}

function PrimaryButton({ children, onClick, className = "", disabled = false }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold shadow-sm",
        disabled ? "bg-indigo-400 text-white/80 cursor-not-allowed" : "bg-indigo-600 text-white hover:bg-indigo-700",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function GhostButton({ children, onClick, className = "" }) {
  return (
    <button
      onClick={onClick}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function ToolButton({ active, icon: Icon, label, description, onClick }) {
  return (
    <button
      onClick={onClick}
      className={[
        "w-full rounded-xl border px-3 py-3 text-left transition",
        active
          ? "border-indigo-500 bg-indigo-600 text-white shadow-sm"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <span
          className={[
            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
            active ? "border-white/20 bg-white/20" : "border-slate-200 bg-slate-50 text-slate-600",
          ].join(" ")}
        >
          <Icon size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold leading-5">{label}</span>
          <span className={["mt-0.5 block text-xs", active ? "text-indigo-100" : "text-slate-500"].join(" ")}>
            {description}
          </span>
        </span>
        {active ? (
          <span className="mt-0.5 rounded-full border border-white/25 bg-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
            Active
          </span>
        ) : null}
      </div>
    </button>
  );
}

function StatusBadge({ status }) {
  const map = {
    "Not Started": { cls: "bg-slate-100 text-slate-700", Icon: Clock },
    "In Progress": { cls: "bg-amber-100 text-amber-700", Icon: AlertTriangle },
    Submitted: { cls: "bg-emerald-100 text-emerald-700", Icon: CheckCircle2 },
  };
  const cfg = map[status] || map["Not Started"];
  return (
    <span className={["inline-flex items-center gap-2 rounded-full whitespace-nowrap px-3 py-1 text-xs font-semibold", cfg.cls].join(" ")}>
      <cfg.Icon size={14} />
      {status}
    </span>
  );
}

function AssignmentsWorkspaceModal({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-slate-950/30 backdrop-blur-[1px]" onClick={onClose} />
      <div className="absolute inset-x-0 top-0 mx-auto flex min-h-full max-w-3xl items-start justify-center px-4 py-10">
        <div className="w-full rounded-[30px] border border-slate-200/80 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.14)]">
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-5">
            <div>
              <div className="text-lg font-semibold text-slate-900">{title}</div>
              <div className="mt-1 text-sm text-slate-500">Assignments desktop workspace flow.</div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            >
              <X size={18} />
            </button>
          </div>
          <div className="px-6 py-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default function AssignmentsPage({ onOpenMainMenu, audience = "institution" }) {
  const isStudentAudience = audience === "student";
  const normalizeAssignment = (assignment) => ({
    id: String(assignment?.id || `ASSG-${Date.now()}`),
    title: String(assignment?.title || "Untitled Assignment"),
    description: String(assignment?.description || ""),
    course: String(assignment?.course || "General"),
    due: String(assignment?.due || "TBD"),
    status: String(assignment?.status || "Not Started"),
    isArchived: Boolean(assignment?.is_archived || assignment?.isArchived),
    createdAt: assignment?.created_at || assignment?.createdAt || null,
    updatedAt: assignment?.updated_at || assignment?.updatedAt || null,
  });

  const [tab, setTab] = useState("my");
  const [tool, setTool] = useState("homework");
  const [toolSearch, setToolSearch] = useState("");
  const [mobileToolsCollapsed, setMobileToolsCollapsed] = useState(false);
  const [mobileToolFullscreen, setMobileToolFullscreen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 767px)").matches : false
  );
  const [rightOpen, setRightOpen] = useState(true);
  const [isExamHistoryMenuOpen, setIsExamHistoryMenuOpen] = useState(false);
  const [isExamPrepDialogOpen, setIsExamPrepDialogOpen] = useState(false);
  const [examPrepDraft, setExamPrepDraft] = useState({
    title: "",
    name: "",
    course: "Biology 101",
    examDate: "",
    examTime: "",
    notes: "",
  });

  const [history, setHistory] = useState([
    { t: "Homework Helper", d: "Opened step-by-step plan for an assignment." },
    { t: "Writing Assistant", d: "Selected clarity + structure improvements." },
  ]);

  const [assignments, setAssignments] = useState([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [assignmentsError, setAssignmentsError] = useState("");
  const [activeAssignment, setActiveAssignment] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState({
    title: "",
    description: "",
    course: "",
    due: "",
  });
  const [showDesktopLanding, setShowDesktopLanding] = useState(
    () => !(typeof window !== "undefined" ? window.matchMedia("(max-width: 767px)").matches : false)
  );
  const [showMobileLanding, setShowMobileLanding] = useState(
    () => typeof window !== "undefined" ? window.matchMedia("(max-width: 767px)").matches : false
  );
  const [activeMobileSection, setActiveMobileSection] = useState("assignments");
  const [isMobileSectionMenuOpen, setIsMobileSectionMenuOpen] = useState(false);
  const [landingInputValue, setLandingInputValue] = useState("");
  const [isLandingMenuOpen, setIsLandingMenuOpen] = useState(false);
  const [isLandingShareOpen, setIsLandingShareOpen] = useState(false);
  const [isLandingSettingsOpen, setIsLandingSettingsOpen] = useState(false);
  const [isLandingUtilityMenuOpen, setIsLandingUtilityMenuOpen] = useState(false);
  const [landingAssignmentMenuId, setLandingAssignmentMenuId] = useState(null);
  const [landingMoveMenuId, setLandingMoveMenuId] = useState(null);
  const [landingShareInvite, setLandingShareInvite] = useState("");
  const [landingShareAccess, setLandingShareAccess] = useState("institution-only");
  const [landingShareStatus, setLandingShareStatus] = useState("");
  const [landingWorkspaceStatus, setLandingWorkspaceStatus] = useState("");
  const [landingDeleteOpen, setLandingDeleteOpen] = useState(false);
  const [landingWorkspaceSettings, setLandingWorkspaceSettings] = useState({
    name: "Assignments Workspace",
    description: "Track active coursework, due dates, and AI-supported study tasks.",
    linkedInstitution: isStudentAudience ? "Your study workspace" : "ElimuLink University",
    subgroup: "Not linked",
    defaultView: "my assignments",
    reminderMode: "due-date reminders",
    collaboration: "members can view",
  });

  const mobileSectionItems = useMemo(
    () => [
      { key: "assignments", label: "Assignments", icon: ListChecks },
      { key: "tools", label: "AI Tools", icon: Sparkles },
      { key: "exam", label: "Exam Prep", icon: GraduationCap },
      { key: "history", label: "History", icon: PanelRightOpen },
      { key: "new", label: "New", icon: ClipboardList },
    ],
    []
  );

  function logAction(title, detail) {
    setHistory((h) => [{ t: title, d: detail }, ...h].slice(0, 12));
  }

  function openMobileSection(sectionKey) {
    setIsMobileSectionMenuOpen(false);
    if (sectionKey === "new") {
      setCreateOpen(true);
      setActiveMobileSection("assignments");
      return;
    }
    setActiveMobileSection(sectionKey);
    if (sectionKey === "tools" || String(sectionKey).startsWith("tools-")) {
      setTab("tools");
      const matchedTool = MOBILE_TOOL_SECTION_META[sectionKey]?.toolKey;
      if (matchedTool) {
        setTool(matchedTool);
      }
    }
    if (sectionKey === "exam") {
      setTab("exam");
    }
    if (sectionKey === "history") {
      setTab("history");
    }
    if (sectionKey === "assignments") {
      setTab("my");
    }
    setShowMobileLanding(false);
  }

  const [toolBusy, setToolBusy] = useState(false);
  const [toolError, setToolError] = useState("");
  const [toolResponse, setToolResponse] = useState("");

  async function runAssignmentAI(actionLabel, payload, { onSuccess } = {}) {
    setToolBusy(true);
    setToolError("");
    setToolResponse("");
    try {
      const data = await apiPost("/api/assignments/ai", payload || {});
      const message = String(data?.message || "AI processed assignment.");
      setToolResponse(message);
      logAction(actionLabel, message);
      if (onSuccess) onSuccess(message, data);
    } catch (error) {
      const message = error?.message || "AI request failed.";
      setToolError(message);
      logAction(actionLabel, `Error: ${message}`);
    } finally {
      setToolBusy(false);
    }
  }

  async function createAssignment() {
    const title = String(createDraft.title || "").trim();
    const description = String(createDraft.description || "").trim();
    const course = String(createDraft.course || "").trim();
    const due = String(createDraft.due || "").trim();
    if (!title) {
      setAssignmentsError("Assignment title is required.");
      return;
    }
    setAssignmentsLoading(true);
    setAssignmentsError("");
    try {
      const data = await createAssignmentRecord({ title, description, course, due });
      const next = normalizeAssignment(data?.assignment || { id: data?.id, title, description, course, due });
      setAssignments((prev) => [next, ...prev]);
      setActiveAssignment(next);
      logAction("My Assignments", String(data?.message || "Assignment created."));
      setCreateDraft({ title: "", description: "", course: "", due: "" });
      setCreateOpen(false);
    } catch (error) {
      setAssignmentsError(error?.message || "Failed to create assignment.");
    } finally {
      setAssignmentsLoading(false);
    }
  }

  const [homeworkQuestion, setHomeworkQuestion] = useState("");
  const [homeworkPlan, setHomeworkPlan] = useState([
    "Restate the question in your own words.",
    "Identify the topic + key definitions or formulas.",
    "Solve step-by-step and explain why each step is valid.",
    "Check your final answer (units, logic, example).",
  ]);

  const [files, setFiles] = useState([]);
  const [uploadPrompt, setUploadPrompt] = useState("");

  const [writingGoal, setWritingGoal] = useState("Improve clarity and academic tone.");
  const [writingText, setWritingText] = useState("");

  const [stemMode, setStemMode] = useState("math");
  const [stemText, setStemText] = useState("");

  const [essayTopic, setEssayTopic] = useState("");
  const [essayOutline, setEssayOutline] = useState([
    "Introduction: context + thesis",
    "Body 1: main point + evidence",
    "Body 2: main point + evidence",
    "Counterpoint + response",
    "Conclusion: summary + insight",
  ]);

  const [examCourse, setExamCourse] = useState("Biology 101");
  const [weeks, setWeeks] = useState("2");
  const filteredTools = useMemo(() => {
    const query = String(toolSearch || "").trim().toLowerCase();
    if (!query) return TOOLS;
    return TOOLS.filter((item) =>
      `${item.label} ${item.description}`.toLowerCase().includes(query)
    );
  }, [toolSearch]);
  const activeToolMeta = useMemo(() => TOOLS.find((item) => item.key === tool) || TOOLS[0], [tool]);
  const hideMobilePageHeader = isMobileViewport && tab === "tools" && mobileToolFullscreen;

  useEffect(() => {
    let cancelled = false;

    async function loadAssignments() {
      setAssignmentsLoading(true);
      setAssignmentsError("");
      try {
        const data = await listAssignments();
        if (cancelled) return;
        const rows = Array.isArray(data?.assignments) ? data.assignments.map(normalizeAssignment) : [];
        setAssignments(rows);
      } catch (error) {
        if (cancelled) return;
        setAssignments([]);
        setAssignmentsError(error?.message || "Failed to load assignments.");
      } finally {
        if (!cancelled) {
          setAssignmentsLoading(false);
        }
      }
    }

    loadAssignments();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 767px)");
    const syncViewport = () => setIsMobileViewport(media.matches);
    syncViewport();
    media.addEventListener?.("change", syncViewport);
    window.addEventListener("resize", syncViewport);
    return () => {
      media.removeEventListener?.("change", syncViewport);
      window.removeEventListener("resize", syncViewport);
    };
  }, []);

  useEffect(() => {
    if (!isMobileViewport) {
      setMobileToolFullscreen(false);
      setMobileToolsCollapsed(false);
      setShowMobileLanding(false);
    }
  }, [isMobileViewport]);

  useEffect(() => {
    if (tab !== "tools") {
      setMobileToolFullscreen(false);
      setMobileToolsCollapsed(false);
    }
  }, [tab]);

  useEffect(() => {
    if (!hideMobilePageHeader || typeof document === "undefined") return;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [hideMobilePageHeader]);

  useEffect(() => {
    if (isMobileViewport) {
      setShowDesktopLanding(false);
    }
  }, [isMobileViewport]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!target.closest("[data-assignments-landing-menu]")) {
        setIsLandingMenuOpen(false);
      }
      if (!target.closest("[data-assignments-utility-menu]")) {
        setIsLandingUtilityMenuOpen(false);
      }
      if (!target.closest("[data-assignments-row-menu]")) {
        setLandingAssignmentMenuId(null);
        setLandingMoveMenuId(null);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key !== "Escape") return;
      setIsLandingMenuOpen(false);
      setIsLandingUtilityMenuOpen(false);
      setLandingAssignmentMenuId(null);
      setLandingMoveMenuId(null);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const landingAssignments = useMemo(
    () =>
      assignments.map((assignment) => ({
        ...assignment,
        preview: `${assignment.course} • Due ${assignment.due} • ${assignment.status}`,
      })),
    [assignments]
  );

  const dueSoonCount = useMemo(
    () => assignments.filter((assignment) => /(fri|mon|wed|today|tomorrow)/i.test(String(assignment.due || ""))).length,
    [assignments]
  );

  function selectTool(nextToolKey, { openFullscreenOnMobile = false } = {}) {
    setTool(nextToolKey);
    if (isMobileViewport && openFullscreenOnMobile) {
      setMobileToolFullscreen(true);
      setMobileToolsCollapsed(true);
    }
  }

  function openAssignmentLandingTarget(assignment) {
    const assignmentId = assignment?.id;
    if (!assignmentId) return;
    setAssignmentsLoading(true);
    setAssignmentsError("");
    fetchAssignmentRecord(assignmentId)
      .then((data) => {
        const next = normalizeAssignment(data?.assignment || assignment);
        setActiveAssignment(next);
        logAction("Assignments", `Opened assignment workspace for ${next.title}.`);
        setTab("my");
        setShowDesktopLanding(false);
        setShowMobileLanding(false);
      })
      .catch((error) => {
        setAssignmentsError(error?.message || "Failed to open assignment.");
      })
      .finally(() => {
        setAssignmentsLoading(false);
      });
  }

  async function renameAssignmentById(assignmentId) {
    const target = assignments.find((assignment) => assignment.id === assignmentId);
    if (!target) return;
    const nextTitle = window.prompt("Rename assignment", target.title || "Untitled Assignment");
    if (nextTitle === null) return;
    const normalized = nextTitle.trim();
    if (!normalized) return;
    setAssignmentsLoading(true);
    setAssignmentsError("");
    try {
      const data = await updateAssignmentRecord(assignmentId, { title: normalized });
      const next = normalizeAssignment(data?.assignment || { ...target, title: normalized });
      setAssignments((prev) =>
        prev.map((assignment) => (assignment.id === assignmentId ? next : assignment))
      );
      if (activeAssignment?.id === assignmentId) {
        setActiveAssignment(next);
      }
    } catch (error) {
      setAssignmentsError(error?.message || "Failed to rename assignment.");
    } finally {
      setAssignmentsLoading(false);
    }
  }

  function moveAssignmentById(assignmentId, destination) {
    const target = assignments.find((assignment) => assignment.id === assignmentId);
    if (!target) return;
    logAction("Assignments", `"${target.title}" is prepared to move to ${destination}.`);
    setLandingMoveMenuId(null);
    setLandingAssignmentMenuId(null);
  }

  async function archiveAssignmentById(assignmentId) {
    const target = assignments.find((assignment) => assignment.id === assignmentId);
    if (!target) return;
    setAssignmentsLoading(true);
    setAssignmentsError("");
    try {
      await updateAssignmentRecord(assignmentId, { is_archived: true });
      setAssignments((prev) => prev.filter((assignment) => assignment.id !== assignmentId));
      if (activeAssignment?.id === assignmentId) {
        setActiveAssignment(null);
      }
      logAction("Assignments", `Archived "${target.title}".`);
      setLandingAssignmentMenuId(null);
    } catch (error) {
      setAssignmentsError(error?.message || "Failed to archive assignment.");
    } finally {
      setAssignmentsLoading(false);
    }
  }

  async function deleteAssignmentById(assignmentId) {
    const target = assignments.find((assignment) => assignment.id === assignmentId);
    if (!target) return;
    const confirmed = window.confirm(`Delete "${target.title}" from the current assignments list?`);
    if (!confirmed) return;
    setAssignmentsLoading(true);
    setAssignmentsError("");
    try {
      await deleteAssignmentRecord(assignmentId);
      setAssignments((prev) => prev.filter((assignment) => assignment.id !== assignmentId));
      if (activeAssignment?.id === assignmentId) {
        setActiveAssignment(null);
      }
      setLandingMoveMenuId(null);
      setLandingAssignmentMenuId(null);
    } catch (error) {
      setAssignmentsError(error?.message || "Failed to delete assignment.");
    } finally {
      setAssignmentsLoading(false);
    }
  }

  function handleTabChange(nextTab) {
    setTab(nextTab);
    setShowMobileLanding(false);
    if (nextTab === "exam") {
      setIsExamPrepDialogOpen(true);
      return;
    }
    setIsExamHistoryMenuOpen(false);
  }

  function saveExamPrepDraft() {
    const title = String(examPrepDraft.title || "").trim();
    const name = String(examPrepDraft.name || "").trim();
    if (!title) {
      alert("Exam prep title is required.");
      return;
    }
    if (!name) {
      alert("Name is required.");
      return;
    }
    if (examPrepDraft.course) {
      setExamCourse(examPrepDraft.course);
    }
    logAction("Exam Prep", `Saved setup "${title}" for ${name}.`);
    setIsExamPrepDialogOpen(false);
  }

  function MyAssignments() {
    return (
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-lg font-extrabold text-slate-900">My Assignments</div>
            <div className="text-sm text-slate-600">Track deadlines and progress.</div>
            {assignmentsLoading ? (
              <div className="mt-2 text-xs font-semibold text-slate-500">Saving assignment...</div>
            ) : null}
            {assignmentsError ? <div className="mt-2 text-xs font-semibold text-rose-600">{assignmentsError}</div> : null}
          </div>
          <PrimaryButton
            className="w-full sm:w-auto"
            onClick={() => {
              setCreateOpen(true);
            }}
          >
            <ClipboardList size={16} />
            New
          </PrimaryButton>
        </div>

        <Card title="Assignment List" subtitle="Open tools for any assignment" icon={ListChecks}>
          <div className="space-y-3 md:hidden">
            {assignments.map((a) => (
              <div key={a.id} className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="text-sm font-semibold text-slate-900">{a.title}</div>
                <div className="mt-1 text-xs text-slate-600">
                  {a.id} | {a.course}
                </div>
                <div className="mt-1 text-xs text-slate-600">Due: {a.due}</div>
                <div className="mt-2">
                  <StatusBadge status={a.status} />
                </div>
                <div className="mt-3">
                  <GhostButton
                    className="w-full"
                    onClick={() => {
                      setTab("tools");
                      selectTool("homework", { openFullscreenOnMobile: true });
                      logAction("AI Tools", `Opened tools for: ${a.title}`);
                    }}
                  >
                    Open Tools
                  </GhostButton>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md:block overflow-auto">
            <table className="min-w-[760px] w-full text-sm">
              <thead className="text-slate-500">
                <tr className="text-left border-b border-slate-200">
                  <th className="py-2 pr-3 font-semibold">ID</th>
                  <th className="py-2 pr-3 font-semibold">Title</th>
                  <th className="py-2 pr-3 font-semibold">Course</th>
                  <th className="py-2 pr-3 font-semibold">Due</th>
                  <th className="py-2 pr-3 font-semibold">Status</th>
                  <th className="py-2 pr-3 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => (
                  <tr key={a.id} className="border-b border-slate-100">
                    <td className="py-3 pr-3 text-slate-700">{a.id}</td>
                    <td className="py-3 pr-3 text-slate-900 font-semibold">{a.title}</td>
                    <td className="py-3 pr-3 text-slate-700">{a.course}</td>
                    <td className="py-3 pr-3 text-slate-700">{a.due}</td>
                    <td className="py-3 pr-3">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="py-3 pr-3 text-right">
                      <GhostButton
                        onClick={() => {
                          setTab("tools");
                          selectTool("homework", { openFullscreenOnMobile: true });
                          logAction("AI Tools", `Opened tools for: ${a.title}`);
                        }}
                      >
                        Open Tools
                      </GhostButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  }

  function Tools() {
    return (
      <div className="grid grid-cols-12 gap-4 min-h-0">
        <div className={["col-span-12 lg:hidden", mobileToolFullscreen ? "hidden" : ""].join(" ")}>
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => setMobileToolsCollapsed((prev) => !prev)}
              className="w-full px-4 py-3 flex items-center justify-between gap-3 bg-slate-50"
            >
              <div className="min-w-0 text-left">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">AI Tools</div>
                <div className="text-sm font-semibold text-slate-900 truncate">{activeToolMeta?.label || "Select tool"}</div>
              </div>
              {mobileToolsCollapsed ? <ChevronDown size={18} className="text-slate-500" /> : <ChevronUp size={18} className="text-slate-500" />}
            </button>

            {!mobileToolsCollapsed ? (
              <div className="border-t border-slate-200 p-3 space-y-2">
                <label className="relative block">
                  <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={toolSearch}
                    onChange={(e) => setToolSearch(e.target.value)}
                    placeholder="Search tools..."
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-800 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                  />
                </label>
                {filteredTools.map((t) => (
                  <ToolButton
                    key={t.key}
                    active={tool === t.key}
                    icon={t.icon}
                    label={t.label}
                    description={t.description}
                    onClick={() => selectTool(t.key, { openFullscreenOnMobile: true })}
                  />
                ))}
                {filteredTools.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white px-3 py-4 text-center text-xs text-slate-500">
                    No matching tools.
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="hidden lg:block lg:col-span-3 min-h-0">
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
            <div className="border-b border-slate-200 bg-white px-4 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">AI Workspace</div>
              <div className="mt-1 text-sm font-bold text-slate-900">AI Tools</div>
              <div className="mt-1 text-xs text-slate-500">Guidance and explanations with academic-safe guardrails.</div>
              <label className="relative mt-3 block">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={toolSearch}
                  onChange={(e) => setToolSearch(e.target.value)}
                  placeholder="Search tools..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-800 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                />
              </label>
            </div>
            <div className="space-y-2 bg-slate-50/60 p-3">
              {filteredTools.map((t) => (
                <ToolButton
                  key={t.key}
                  active={tool === t.key}
                  icon={t.icon}
                  label={t.label}
                  description={t.description}
                  onClick={() => selectTool(t.key)}
                />
              ))}
              {filteredTools.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white px-3 py-4 text-center text-xs text-slate-500">
                  No matching tools.
                </div>
              ) : null}
            </div>
            <div className="mt-auto border-t border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Best Practice</div>
              <div className="mt-1 text-xs text-slate-600">
                Ask for steps, examples, and verification before final submission.
              </div>
            </div>
          </div>
        </div>

        <div
          className={[
            "col-span-12 lg:col-span-6 space-y-4 min-h-0",
            isMobileViewport && mobileToolFullscreen ? "fixed inset-0 z-40 bg-slate-100 overflow-y-auto p-4 pb-8" : "",
          ].join(" ")}
        >
          {isMobileViewport && mobileToolFullscreen ? (
            <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-4 border-b border-slate-200 bg-white/95 backdrop-blur">
              <div className="px-4 py-3 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setMobileToolFullscreen(false)}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <ArrowLeft size={14} />
                  Back
                </button>
                <div className="min-w-0 text-right">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">AI Tool</div>
                  <div className="text-sm font-semibold text-slate-900 truncate">{activeToolMeta?.label}</div>
                </div>
              </div>
            </div>
          ) : null}

          {toolError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {toolError}
            </div>
          ) : null}
          {toolResponse ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {toolResponse}
            </div>
          ) : null}

          {tool === "homework" ? (
            <Card
              title="Homework Helper"
              subtitle="Breakdown logic + step-by-step guidance"
              icon={BookOpen}
              right={
                <PrimaryButton
                  onClick={() => {
                    runAssignmentAI(
                      "Homework Helper",
                      { tool: "homework", prompt: homeworkQuestion },
                      {
                        onSuccess: (message) => {
                          setHomeworkPlan([
                            "Restate the problem clearly (what is being asked).",
                            "List known facts from your notes.",
                            "Solve step-by-step and explain each step.",
                            `AI: ${message}`,
                          ]);
                        },
                      }
                    );
                  }}
                  disabled={toolBusy}
                >
                  <Lightbulb size={16} />
                  {toolBusy ? "Working..." : "Generate Plan"}
                </PrimaryButton>
              }
            >
              <div className="space-y-4">
                <Textarea
                  label="Paste the homework question"
                  value={homeworkQuestion}
                  onChange={setHomeworkQuestion}
                  placeholder="Example: Explain the role of mitochondria in energy production..."
                  rows={5}
                />
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-bold text-slate-900">Suggested approach</div>
                  <div className="mt-2 space-y-2 text-sm text-slate-700">
                    {homeworkPlan.map((x, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="text-slate-400">•</span>
                        <span>{x}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ) : null}

          {tool === "upload" ? (
            <Card
              title="Upload & Analyze"
              subtitle="Upload and get explanation + improvement suggestions"
              icon={Upload}
              right={
                <PrimaryButton
                  onClick={() => {
                    runAssignmentAI("Upload & Analyze", {
                      tool: "upload",
                      prompt: uploadPrompt,
                      files,
                    });
                  }}
                  disabled={toolBusy}
                >
                  <Sparkles size={16} />
                  {toolBusy ? "Working..." : "Analyze"}
                </PrimaryButton>
              }
            >
              <div className="space-y-4">
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-slate-900">Drop files here</div>
                      <div className="text-xs text-slate-600">Images, PDF, DOCX (wired later)</div>
                    </div>
                    <GhostButton
                      onClick={() => {
                        const name = `Question_${Math.floor(Math.random() * 999)}.jpg`;
                        setFiles((f) => [name, ...f]);
                        logAction("Upload & Analyze", `Added file: ${name}`);
                      }}
                    >
                      <FileText size={16} />
                      Add sample
                    </GhostButton>
                  </div>
                  {files.length ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {files.map((n) => (
                        <span
                          key={n}
                          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
                        >
                          {n}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4 text-sm text-slate-500">No uploads yet.</div>
                  )}
                </div>

                <Textarea
                  label="What should the analysis focus on?"
                  value={uploadPrompt}
                  onChange={setUploadPrompt}
                  placeholder="Example: Explain what it tests, show steps, then suggest how to present the final answer."
                  rows={4}
                />
              </div>
            </Card>
          ) : null}

          {tool === "writing" ? (
            <Card
              title="Writing Assistant"
              subtitle="Grammar • Structure • Clarity • Citation suggestions"
              icon={Wand2}
              right={
                <PrimaryButton
                  onClick={() => {
                    runAssignmentAI("Writing Assistant", {
                      tool: "writing",
                      goal: writingGoal,
                      prompt: writingText,
                    });
                  }}
                  disabled={toolBusy}
                >
                  <Sparkles size={16} />
                  {toolBusy ? "Working..." : "Improve"}
                </PrimaryButton>
              }
            >
              <div className="space-y-4">
                <Input
                  label="Goal"
                  value={writingGoal}
                  onChange={setWritingGoal}
                  placeholder="Example: Improve clarity and academic tone."
                />
                <Textarea
                  label="Paste your draft"
                  value={writingText}
                  onChange={setWritingText}
                  placeholder="Paste a paragraph or essay..."
                  rows={8}
                />
              </div>
            </Card>
          ) : null}

          {tool === "stem" ? (
            <Card
              title="STEM Assistant"
              subtitle="Math + Code help with step explanations"
              icon={Sigma}
              right={
                <PrimaryButton
                  onClick={() => {
                    runAssignmentAI("STEM Assistant", {
                      tool: "stem",
                      mode: stemMode,
                      prompt: stemText,
                    });
                  }}
                  disabled={toolBusy}
                >
                  <Sparkles size={16} />
                  {toolBusy ? "Working..." : "Solve"}
                </PrimaryButton>
              }
            >
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Pill active={stemMode === "math"} onClick={() => setStemMode("math")}>
                    <Sigma size={16} /> Math
                  </Pill>
                  <Pill active={stemMode === "code"} onClick={() => setStemMode("code")}>
                    <FileText size={16} /> Code
                  </Pill>
                </div>
                <Textarea
                  label={stemMode === "math" ? "Enter your math problem" : "Paste your code or error"}
                  value={stemText}
                  onChange={setStemText}
                  placeholder={stemMode === "math" ? "Example: Solve x^2 - 5x + 6 = 0" : "Example: Error: TypeError..."}
                  rows={8}
                />
              </div>
            </Card>
          ) : null}

          {tool === "essay" ? (
            <Card
              title="Essay Planner & Draft Builder"
              subtitle="Plan before writing: thesis, outline, arguments, evidence"
              icon={PenLine}
              right={
                <PrimaryButton
                  onClick={() => {
                    runAssignmentAI(
                      "Essay Builder",
                      { tool: "essay", topic: essayTopic },
                      {
                        onSuccess: (message) => {
                          setEssayOutline([
                            "Hook + context + thesis",
                            "Argument 1: point + evidence + explanation",
                            "Argument 2: point + evidence + explanation",
                            "Counterpoint + rebuttal",
                            "Conclusion: restate thesis + implications",
                            `AI: ${message}`,
                          ]);
                        },
                      }
                    );
                  }}
                  disabled={toolBusy}
                >
                  <Lightbulb size={16} />
                  {toolBusy ? "Working..." : "Generate"}
                </PrimaryButton>
              }
            >
              <div className="space-y-4">
                <Input
                  label="Topic"
                  value={essayTopic}
                  onChange={setEssayTopic}
                  placeholder="Example: Effects of social media on study habits"
                />
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-bold text-slate-900">Outline</div>
                  <div className="mt-2 space-y-2 text-sm text-slate-700">
                    {essayOutline.map((x, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="text-slate-400">•</span>
                        <span>{x}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ) : null}
        </div>

        <div className="hidden lg:block lg:col-span-3 min-h-0">
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <div className="text-sm font-extrabold text-slate-900">Guidance & History</div>
                <div className="text-xs text-slate-500">Academic-safe usage</div>
              </div>
              <button
                onClick={() => setRightOpen((v) => !v)}
                className="h-9 w-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                title={rightOpen ? "Collapse" : "Expand"}
              >
                {rightOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
              </button>
            </div>

            {rightOpen ? (
              <div className="p-4 space-y-4 overflow-auto">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  Prefer explanations and steps over shortcuts. Use Writing Assistant for clarity and citations.
                </div>

                <div className="space-y-2">
                  {history.map((h, i) => (
                    <div key={i} className="rounded-2xl border border-slate-200 bg-white p-3">
                      <div className="text-sm font-bold text-slate-900">{h.t}</div>
                      <div className="mt-1 text-xs text-slate-600">{h.d}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 text-sm text-slate-500">Collapsed.</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  function GuidanceHistoryTab() {
    return (
      <Card title="Guidance & History" subtitle="Academic-safe usage + recent actions" icon={PanelRightOpen}>
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            Prefer explanations and steps over shortcuts. Use Writing Assistant for clarity and citations.
          </div>

          <div className="space-y-2">
            {history.map((h, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 bg-white p-3">
                <div className="text-sm font-bold text-slate-900">{h.t}</div>
                <div className="mt-1 text-xs text-slate-600">{h.d}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  function ExamPrep() {
    return (
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-lg font-extrabold text-slate-900">Exam Prep</div>
            <div className="text-sm text-slate-600">Study plan + practice (backend later).</div>
          </div>
          <div className="flex w-full sm:w-auto items-center gap-2">
            <div className="relative">
              <GhostButton onClick={() => setIsExamHistoryMenuOpen((v) => !v)} className="w-full sm:w-auto">
                <PanelRightOpen size={16} />
                Menu & History
              </GhostButton>
              {isExamHistoryMenuOpen ? (
                <div className="absolute right-0 mt-2 w-72 rounded-xl border border-slate-200 bg-white shadow-xl z-30 overflow-hidden">
                  <div className="px-3 py-2 text-[11px] font-semibold tracking-wider text-slate-500 border-b border-slate-200">
                    EXAM PREP HISTORY
                  </div>
                  <div className="max-h-56 overflow-auto">
                    {history.length === 0 ? (
                      <div className="px-3 py-3 text-xs text-slate-500">No history yet.</div>
                    ) : (
                      history.slice(0, 8).map((h, idx) => (
                        <div key={`${h.t}-${idx}`} className="px-3 py-2 border-b border-slate-100 last:border-0">
                          <div className="text-xs font-semibold text-slate-800">{h.t}</div>
                          <div className="text-xs text-slate-600">{h.d}</div>
                        </div>
                      ))
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setTab("history");
                      setIsExamHistoryMenuOpen(false);
                    }}
                    className="w-full px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 border-t border-slate-200"
                  >
                    Open Full History
                  </button>
                </div>
              ) : null}
            </div>
            <PrimaryButton
              className="w-full sm:w-auto"
              onClick={() => {
                runAssignmentAI("Exam Prep", {
                  tool: "exam_prep",
                  course: examCourse,
                  weeks,
                });
              }}
              disabled={toolBusy}
            >
              <Sparkles size={16} />
              {toolBusy ? "Working..." : "Generate Plan"}
            </PrimaryButton>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card title="Course" subtitle="Select what you are preparing for" icon={BookOpen}>
            <Input label="Course" value={examCourse} onChange={setExamCourse} placeholder="Biology 101" />
          </Card>

          <Card title="Timeline" subtitle="Weeks until the exam" icon={CalendarClock}>
            <Input label="Weeks" value={weeks} onChange={setWeeks} placeholder="2" />
          </Card>

          <Card title="Practice" subtitle="Choose a practice format" icon={GraduationCap}>
            <div className="grid grid-cols-1 gap-2">
                {["MCQ", "Short Answer", "Essay"].map((x) => (
                  <button
                    key={x}
                    onClick={() => {
                    runAssignmentAI("Exam Prep", {
                      tool: "exam_practice",
                      format: x,
                      course: examCourse,
                    });
                    }}
                    className="rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 p-3 text-left"
                  >
                  <div className="text-sm font-bold text-slate-900">{x}</div>
                  <div className="text-xs text-slate-600">Questions + marking guide later.</div>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (!isMobileViewport && showDesktopLanding) {
    return (
      <AssignmentsDesktopLanding
        isLandingMenuOpen={isLandingMenuOpen}
        setIsLandingMenuOpen={setIsLandingMenuOpen}
        isLandingShareOpen={isLandingShareOpen}
        setIsLandingShareOpen={setIsLandingShareOpen}
        isLandingSettingsOpen={isLandingSettingsOpen}
        setIsLandingSettingsOpen={setIsLandingSettingsOpen}
        isLandingUtilityMenuOpen={isLandingUtilityMenuOpen}
        setIsLandingUtilityMenuOpen={setIsLandingUtilityMenuOpen}
        landingAssignmentMenuId={landingAssignmentMenuId}
        setLandingAssignmentMenuId={setLandingAssignmentMenuId}
        landingMoveMenuId={landingMoveMenuId}
        setLandingMoveMenuId={setLandingMoveMenuId}
        landingShareInvite={landingShareInvite}
        setLandingShareInvite={setLandingShareInvite}
        landingShareAccess={landingShareAccess}
        setLandingShareAccess={setLandingShareAccess}
        landingShareStatus={landingShareStatus}
        setLandingShareStatus={setLandingShareStatus}
        landingWorkspaceStatus={landingWorkspaceStatus}
        setLandingWorkspaceStatus={setLandingWorkspaceStatus}
        landingDeleteOpen={landingDeleteOpen}
        setLandingDeleteOpen={setLandingDeleteOpen}
        landingWorkspaceSettings={landingWorkspaceSettings}
        setLandingWorkspaceSettings={setLandingWorkspaceSettings}
        landingAssignments={landingAssignments}
        assignmentsLoading={assignmentsLoading}
        dueSoonCount={dueSoonCount}
        onOpenAssignment={openAssignmentLandingTarget}
        onCreateAssignment={() => {
          setCreateOpen(true);
          setShowDesktopLanding(false);
        }}
        onSubmissionTracker={() => {
          setTab("my");
          setShowDesktopLanding(false);
        }}
        onTemplate={() => {
          setCreateDraft((prev) => ({ ...prev, title: "Essay Planning Draft" }));
          setCreateOpen(true);
          setShowDesktopLanding(false);
        }}
        onSubgroupShortcut={() => {
          setLandingWorkspaceStatus("Subgroup routing is prepared here as a safe frontend-first assignments shortcut.");
          setIsLandingSettingsOpen(true);
        }}
        onRenameWorkspace={() => {
          const nextName = window.prompt("Rename assignments workspace", landingWorkspaceSettings.name);
          if (!nextName) return;
          const normalized = nextName.trim();
          if (!normalized) return;
          setLandingWorkspaceSettings((prev) => ({ ...prev, name: normalized }));
          setLandingWorkspaceStatus("Assignments workspace renamed.");
        }}
        onMoveWorkspace={() => {
          setLandingWorkspaceStatus("Move to workspace is prepared here as a safe frontend-first action.");
        }}
        onArchiveWorkspace={() => {
          setLandingWorkspaceStatus("Archive is prepared here as a safe frontend-first assignments action.");
        }}
        onRenameAssignment={renameAssignmentById}
        onMoveAssignment={moveAssignmentById}
        onArchiveAssignment={archiveAssignmentById}
        onDeleteAssignment={deleteAssignmentById}
      />
    );
  }

  if (isMobileViewport && showMobileLanding) {
    return (
      <MobileFeatureLandingShell
        featureName="Assignments"
        featureSubtitle="Active coursework and guided study help"
        featureDescription={isStudentAudience ? "Review your due work, open AI study tools, and start a fresh draft without crowding the mobile workspace." : "Review due work, jump into assignment tools, and start a fresh draft without dropping directly into the full workspace."}
        featureIcon={ClipboardList}
        featureStyle="soft"
        workspaceLabel={landingWorkspaceSettings.name}
        workspaceHint={landingWorkspaceSettings.description}
        workspaceBadge={isStudentAudience ? "Student workspace" : "Institution workspace"}
        hideInstitutionStrip
        quickActions={[
          { key: "new", label: "New assignment", icon: ClipboardList, onClick: () => openMobileSection("new") },
          { key: "tracker", label: "Assignments", icon: ListChecks, onClick: () => openMobileSection("assignments") },
          { key: "exam", label: "Exam prep", icon: GraduationCap, onClick: () => openMobileSection("exam") },
          { key: "tools", label: "AI tools", icon: Sparkles, onClick: () => openMobileSection("tools") },
        ]}
        quickActionsStyle="rows"
        utilityActions={[
          {
            key: "rename-workspace",
            label: "Rename workspace",
            icon: PenLine,
            onClick: () => {
              const nextName = window.prompt("Rename assignments workspace", landingWorkspaceSettings.name);
              if (!nextName) return;
              const normalized = nextName.trim();
              if (!normalized) return;
              setLandingWorkspaceSettings((prev) => ({ ...prev, name: normalized }));
              setLandingWorkspaceStatus("Assignments workspace renamed.");
            },
          },
          {
            key: "workspace-tools",
            label: "Workspace tools",
            icon: Rows3,
            onClick: () => {
              openMobileSection("tools");
            },
          },
          {
            key: "archive-workspace",
            label: "Archive workspace",
            icon: Archive,
            onClick: () => {
              setLandingWorkspaceStatus("Archive is prepared here as a safe frontend-first assignments action.");
              openMobileSection("assignments");
            },
          },
          {
            key: "delete-workspace",
            label: "Delete workspace",
            icon: Trash2,
            destructive: true,
            onClick: () => {
              setLandingWorkspaceStatus("Delete stays protected in the full assignments workspace.");
              openMobileSection("assignments");
            },
          },
        ]}
        shareConfig={{
          title: "Share Assignments",
          description: "Invite a collaborator or adjust access for this assignments workspace from a clean mobile share surface.",
          emailLabel: "Invite by email",
          emailPlaceholder: "teacher@example.com",
          accessLabel: "Access level",
          accessOptions: [
            { value: "institution-only", label: isStudentAudience ? "Private" : "Institution only" },
            { value: "members-can-view", label: "Members can view" },
            { value: "members-can-edit", label: "Members can edit" },
          ],
          defaultAccess: landingShareAccess,
          membersTitle: "Workspace owner",
          members: [{ key: "owner", label: "Assignments workspace", role: "Owner" }],
          privacyNote: "Assignments sharing remains frontend-first in this pass, but the share flow is now a real mobile surface.",
          submitLabel: "Save share setup",
        }}
        items={landingAssignments.map((assignment) => ({
          id: assignment.id,
          title: assignment.title,
          preview: assignment.preview,
          meta: assignment.status,
          actions: [
            { key: "share", label: "Share", icon: Copy, onClick: () => { setLandingShareStatus(`Sharing for "${assignment.title}" is prepared here as a safe frontend-first action.`); } },
            { key: "open", label: "Open assignment", icon: ClipboardList, onClick: () => openAssignmentLandingTarget(assignment) },
            { key: "rename", label: "Rename", icon: PenLine, onClick: () => renameAssignmentById(assignment.id) },
            { key: "move", label: "Move", icon: Rows3, onClick: () => moveAssignmentById(assignment.id, "Coursework") },
            { key: "archive", label: "Archive", icon: Archive, onClick: () => archiveAssignmentById(assignment.id) },
            { key: "delete", label: "Delete", icon: Trash2, destructive: true, onClick: () => deleteAssignmentById(assignment.id) },
          ],
        }))}
        listStyle="plain"
        inputPlaceholder="New assignment title"
        inputValue={landingInputValue}
        onInputChange={setLandingInputValue}
        onInputSubmit={(value) => {
          setCreateDraft((prev) => ({ ...prev, title: value }));
          openMobileSection("new");
          setLandingInputValue("");
        }}
        onMenu={onOpenMainMenu || (() => {
          setTab("my");
          setShowMobileLanding(false);
        })}
        onShare={() => {
          setLandingWorkspaceStatus("Share is prepared here as a safe frontend-first Assignments action.");
          setShowMobileLanding(false);
        }}
        onShareSubmit={async ({ email, access }) => {
          setLandingShareInvite(email);
          setLandingShareAccess(access);
          setLandingShareStatus(email ? `Assignments sharing prepared for ${email}.` : `Assignments access saved as ${access}.`);
          return { status: email ? `Assignments sharing prepared for ${email}.` : `Assignments access saved as ${access}.` };
        }}
        onSettings={() => {
          openMobileSection("tools");
        }}
        onNewWork={() => {
          openMobileSection("new");
        }}
        onStartCall={() => {
          openMobileSection("tools");
        }}
        onOpenItem={() => openMobileSection("assignments")}
        emptyStateTitle="No assignments yet"
        emptyState="Create a new assignment or jump into the tracker when coursework arrives."
        emptyStateActionLabel="Create assignment"
        onEmptyStateAction={() => {
          openMobileSection("new");
        }}
      />
    );
  }

  if (isMobileViewport) {
    return (
      <div className="relative w-full min-h-[100dvh] overflow-x-hidden bg-[radial-gradient(circle_at_top,#162846_0%,#10192f_58%,#0b1220_100%)] px-5 pb-28 pt-5 text-white">
        <div className="space-y-5">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Assignments</div>
            <div className="mt-2 text-[30px] font-semibold leading-[1.08] text-white">
              {activeMobileSection === "assignments" ? "My Assignments" : null}
              {activeMobileSection === "tools" ? "AI Tools" : null}
              {activeMobileSection === "exam" ? "Exam Prep" : null}
              {activeMobileSection === "history" ? "Guidance & History" : null}
              {MOBILE_TOOL_SECTION_META[activeMobileSection]?.title || null}
            </div>
            <div className="mt-2 max-w-[34ch] text-[15px] leading-7 text-slate-300">
              {activeMobileSection === "assignments" ? "Track deadlines and progress without the extra dashboard blocks." : null}
              {activeMobileSection === "tools" ? "Open the assignment help tools in one cleaner section." : null}
              {activeMobileSection === "exam" ? "Keep revision planning and practice in one focused view." : null}
              {activeMobileSection === "history" ? "Review recent actions and academic-safe guidance in one place." : null}
              {MOBILE_TOOL_SECTION_META[activeMobileSection]?.description || null}
            </div>
          </div>

          {assignmentsLoading ? <div className="text-sm font-medium text-slate-400">Saving assignment...</div> : null}
          {assignmentsError ? <div className="text-sm font-medium text-rose-300">{assignmentsError}</div> : null}
          {toolError ? <div className="text-sm font-medium text-rose-300">{toolError}</div> : null}
          {toolResponse ? <div className="text-sm font-medium text-emerald-300">{toolResponse}</div> : null}

          {activeMobileSection === "assignments" ? (
            <div className="space-y-5">
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(90deg,#2563eb,#14b8a6)] px-5 py-3 text-sm font-semibold text-white"
              >
                <ClipboardList size={16} />
                New assignment
              </button>

              <div className="space-y-4">
                {assignments.map((a) => (
                  <div key={a.id} className="space-y-1">
                    <div className="text-lg font-semibold text-white">{a.title}</div>
                    <div className="text-sm text-slate-300">{a.course} • Due {a.due}</div>
                    <div className="pt-1">
                      <StatusBadge status={a.status} />
                    </div>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setTab("tools");
                          setActiveMobileSection("tools-homework");
                          setTool("homework");
                          logAction("AI Tools", `Opened tools for: ${a.title}`);
                        }}
                        className="text-sm font-medium text-sky-300"
                      >
                        Open tools
                      </button>
                    </div>
                  </div>
                ))}
                {assignments.length === 0 ? (
                  <div className="text-[15px] leading-7 text-slate-300">
                    No assignments yet. Create a new assignment to begin.
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {activeMobileSection === "tools" ? (
            <div className="space-y-6">
              <div>
                <label className="relative block">
                  <Search size={14} className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={toolSearch}
                    onChange={(e) => setToolSearch(e.target.value)}
                    placeholder="Search tools..."
                    className="w-full border-0 bg-transparent py-2 pl-7 pr-0 text-[15px] text-white outline-none placeholder:text-slate-400"
                  />
                </label>
              </div>
              <div className="space-y-5">
                {filteredTools.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => openMobileSection(`tools-${t.key}`)}
                    className="block w-full text-left"
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.06] text-white">
                        <t.icon size={18} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-base font-semibold text-white">{t.label}</span>
                        <span className="mt-1 block text-sm leading-6 text-slate-300">{t.description}</span>
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {activeMobileSection === "tools-homework" ? (
            <div className="space-y-6">
              <button
                type="button"
                onClick={() => openMobileSection("tools")}
                className="inline-flex items-center gap-2 text-sm font-medium text-sky-300"
              >
                <ArrowLeft size={16} />
                Back to AI tools
              </button>
              <Textarea
                label="Paste the homework question"
                value={homeworkQuestion}
                onChange={setHomeworkQuestion}
                placeholder="Example: Explain the role of mitochondria in energy production..."
                rows={6}
              />
              <button
                type="button"
                onClick={() => {
                  runAssignmentAI(
                    "Homework Helper",
                    { tool: "homework", prompt: homeworkQuestion },
                    {
                      onSuccess: (message) => {
                        setHomeworkPlan([
                          "Restate the problem clearly (what is being asked).",
                          "List known facts from your notes.",
                          "Solve step-by-step and explain each step.",
                          `AI: ${message}`,
                        ]);
                      },
                    }
                  );
                }}
                disabled={toolBusy}
                className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(90deg,#2563eb,#14b8a6)] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
              >
                <Lightbulb size={16} />
                {toolBusy ? "Working..." : "Generate plan"}
              </button>
              <div className="space-y-3">
                {homeworkPlan.map((item, index) => (
                  <div key={index} className="text-[15px] leading-7 text-slate-200">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {activeMobileSection === "tools-upload" ? (
            <div className="space-y-6">
              <button
                type="button"
                onClick={() => openMobileSection("tools")}
                className="inline-flex items-center gap-2 text-sm font-medium text-sky-300"
              >
                <ArrowLeft size={16} />
                Back to AI tools
              </button>
              <div className="space-y-4">
                <div className="text-[15px] leading-7 text-slate-300">
                  Add the files you want reviewed, then guide the analysis clearly.
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const name = `Question_${Math.floor(Math.random() * 999)}.jpg`;
                    setFiles((f) => [name, ...f]);
                    logAction("Upload & Analyze", `Added file: ${name}`);
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white"
                >
                  <FileText size={16} />
                  Add sample file
                </button>
                {files.length ? (
                  <div className="space-y-2">
                    {files.map((name) => (
                      <div key={name} className="text-[15px] leading-7 text-slate-200">
                        {name}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[15px] leading-7 text-slate-400">No uploads yet.</div>
                )}
              </div>
              <Textarea
                label="What should the analysis focus on?"
                value={uploadPrompt}
                onChange={setUploadPrompt}
                placeholder="Example: Explain what it tests, show the steps, then improve the final answer."
                rows={5}
              />
              <button
                type="button"
                onClick={() => {
                  runAssignmentAI("Upload & Analyze", {
                    tool: "upload",
                    prompt: uploadPrompt,
                    files,
                  });
                }}
                disabled={toolBusy}
                className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(90deg,#2563eb,#14b8a6)] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
              >
                <Sparkles size={16} />
                {toolBusy ? "Working..." : "Analyze"}
              </button>
            </div>
          ) : null}

          {activeMobileSection === "tools-writing" ? (
            <div className="space-y-6">
              <button
                type="button"
                onClick={() => openMobileSection("tools")}
                className="inline-flex items-center gap-2 text-sm font-medium text-sky-300"
              >
                <ArrowLeft size={16} />
                Back to AI tools
              </button>
              <Input
                label="Goal"
                value={writingGoal}
                onChange={setWritingGoal}
                placeholder="Example: Improve clarity and academic tone."
              />
              <Textarea
                label="Paste your draft"
                value={writingText}
                onChange={setWritingText}
                placeholder="Paste a paragraph or essay..."
                rows={8}
              />
              <button
                type="button"
                onClick={() => {
                  runAssignmentAI("Writing Assistant", {
                    tool: "writing",
                    goal: writingGoal,
                    prompt: writingText,
                  });
                }}
                disabled={toolBusy}
                className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(90deg,#2563eb,#14b8a6)] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
              >
                <Sparkles size={16} />
                {toolBusy ? "Working..." : "Improve"}
              </button>
            </div>
          ) : null}

          {activeMobileSection === "tools-stem" ? (
            <div className="space-y-6">
              <button
                type="button"
                onClick={() => openMobileSection("tools")}
                className="inline-flex items-center gap-2 text-sm font-medium text-sky-300"
              >
                <ArrowLeft size={16} />
                Back to AI tools
              </button>
              <div className="flex flex-wrap gap-3">
                {["math", "code"].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setStemMode(mode)}
                    className={[
                      "rounded-full px-4 py-2 text-sm font-medium transition",
                      stemMode === mode
                        ? "bg-white text-slate-950"
                        : "border border-white/12 bg-white/[0.04] text-slate-200",
                    ].join(" ")}
                  >
                    {mode === "math" ? "Math" : "Code"}
                  </button>
                ))}
              </div>
              <Textarea
                label="Problem"
                value={stemText}
                onChange={setStemText}
                placeholder="Paste the equation, coding issue, or STEM problem..."
                rows={7}
              />
              <button
                type="button"
                onClick={() => {
                  runAssignmentAI("STEM Assistant", {
                    tool: "stem",
                    mode: stemMode,
                    prompt: stemText,
                  });
                }}
                disabled={toolBusy}
                className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(90deg,#2563eb,#14b8a6)] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
              >
                <Sparkles size={16} />
                {toolBusy ? "Working..." : "Solve with steps"}
              </button>
            </div>
          ) : null}

          {activeMobileSection === "tools-essay" ? (
            <div className="space-y-6">
              <button
                type="button"
                onClick={() => openMobileSection("tools")}
                className="inline-flex items-center gap-2 text-sm font-medium text-sky-300"
              >
                <ArrowLeft size={16} />
                Back to AI tools
              </button>
              <Input
                label="Essay topic"
                value={essayTopic}
                onChange={setEssayTopic}
                placeholder="Example: The impact of renewable energy on economic growth."
              />
              <button
                type="button"
                onClick={() => {
                  runAssignmentAI(
                    "Essay Planner & Draft Builder",
                    { tool: "essay", prompt: essayTopic },
                    {
                      onSuccess: (message) => {
                        setEssayOutline((current) => [...current.slice(0, 4), `AI: ${message}`]);
                      },
                    }
                  );
                }}
                disabled={toolBusy}
                className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(90deg,#2563eb,#14b8a6)] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
              >
                <Sparkles size={16} />
                {toolBusy ? "Working..." : "Build outline"}
              </button>
              <div className="space-y-3">
                {essayOutline.map((item, index) => (
                  <div key={index} className="text-[15px] leading-7 text-slate-200">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {activeMobileSection === "exam" ? (
            <div className="space-y-6">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Course</div>
                <div className="mt-2 text-[16px] text-white">{examCourse}</div>
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Weeks</div>
                <div className="mt-2 text-[16px] text-white">{weeks}</div>
              </div>
              <div className="space-y-3">
                {["MCQ", "Short Answer", "Essay"].map((x) => (
                  <button
                    key={x}
                    onClick={() => {
                      runAssignmentAI("Exam Prep", {
                        tool: "exam_practice",
                        format: x,
                        course: examCourse,
                      });
                    }}
                    className="block text-left text-[15px] font-medium text-white"
                  >
                    {x}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  runAssignmentAI("Exam Prep", {
                    tool: "exam_prep",
                    course: examCourse,
                    weeks,
                  });
                }}
                className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(90deg,#2563eb,#14b8a6)] px-5 py-3 text-sm font-semibold text-white"
              >
                <Sparkles size={16} />
                {toolBusy ? "Working..." : "Generate plan"}
              </button>
            </div>
          ) : null}

          {activeMobileSection === "history" ? (
            <div className="space-y-6">
              <div className="text-[15px] leading-7 text-slate-300">
                Prefer explanations and steps over shortcuts. Use Writing Assistant for clarity and citations.
              </div>
              <div className="space-y-4">
                {history.map((h, i) => (
                  <div key={i}>
                    <div className="text-sm font-semibold text-white">{h.t}</div>
                    <div className="mt-1 text-sm leading-6 text-slate-300">{h.d}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {isMobileSectionMenuOpen ? (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40 bg-slate-950/32 backdrop-blur-[2px]"
              aria-label="Close sections menu"
              onClick={() => setIsMobileSectionMenuOpen(false)}
            />
            <div className="fixed bottom-24 right-5 z-50 flex flex-col items-end gap-3">
              {mobileSectionItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => openMobileSection(item.key)}
                    className="inline-flex items-center gap-3 rounded-full bg-emerald-700 px-5 py-3 text-[15px] font-medium text-white shadow-[0_16px_34px_rgba(0,0,0,0.3)] transition hover:bg-emerald-600"
                    style={{ marginRight: `${(mobileSectionItems.length - index - 1) * 12}px` }}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </>
        ) : null}

        <button
          type="button"
          onClick={() => setIsMobileSectionMenuOpen((value) => !value)}
          className="fixed bottom-6 right-5 z-50 inline-flex h-16 w-16 items-center justify-center rounded-[22px] bg-emerald-700 text-white shadow-[0_18px_34px_rgba(0,0,0,0.34)] transition hover:bg-emerald-600"
          aria-label={isMobileSectionMenuOpen ? "Close sections menu" : "Open sections menu"}
        >
          {isMobileSectionMenuOpen ? <X size={26} /> : <Plus size={28} />}
        </button>
      </div>
    );
  }

  return (
    <div className="w-full bg-slate-100 p-4 md:p-6 h-[100dvh] overflow-hidden flex flex-col md:min-h-[100dvh] md:h-auto md:overflow-visible">
      {!hideMobilePageHeader ? (
        <div className="shrink-0 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              {!isMobileViewport ? (
                <button
                  type="button"
                  onClick={() => setShowDesktopLanding(true)}
                  className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <ArrowLeft size={12} />
                  Workspace
                </button>
              ) : null}
              <div className="text-xl font-extrabold text-slate-900">Assignments</div>
              {isMobileViewport ? (
                <button
                  type="button"
                  onClick={() => setShowMobileLanding(true)}
                  className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Landing
                </button>
              ) : null}
            </div>
            <div className="text-sm text-slate-600">
              Guidance-first tools: explanations, structure, and learning support.
            </div>
          </div>

          <div className="hidden md:block">
            <div className="flex items-center gap-2 flex-wrap">
              {DESKTOP_TABS.map((t) => {
                const Icon = t.icon;
                return (
                  <Pill key={t.key} active={tab === t.key} onClick={() => handleTabChange(t.key)}>
                    <Icon size={16} />
                    {t.label}
                  </Pill>
                );
              })}
            </div>
          </div>

          <div className="w-full md:hidden">
            <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
              <div className="grid grid-cols-2 gap-2">
                {MOBILE_TABS.map((t) => {
                  const Icon = t.icon;
                  const active = tab === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => handleTabChange(t.key)}
                      className={[
                        "inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition",
                        active
                          ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
                      ].join(" ")}
                    >
                      <Icon size={16} />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className={[hideMobilePageHeader ? "mt-0" : "mt-4", "flex-1 min-h-0 overflow-y-auto"].join(" ")}>
        {tab === "my" ? <MyAssignments /> : null}
        {tab === "tools" ? <Tools /> : null}
        {tab === "exam" ? <ExamPrep /> : null}
        {tab === "history" ? <GuidanceHistoryTab /> : null}
      </div>

      {isExamPrepDialogOpen ? (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
              <div className="text-lg font-semibold text-slate-900">Exam Prep Setup</div>
              <div className="text-sm text-slate-500">Fill this table before generating a plan.</div>
            </div>
            <div className="p-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                <div className="grid grid-cols-12 border-b border-slate-200 bg-white text-xs font-semibold text-slate-600">
                  <div className="col-span-4 px-3 py-2">Field</div>
                  <div className="col-span-8 px-3 py-2">Value</div>
                </div>

                <label className="grid grid-cols-12 border-b border-slate-200">
                  <div className="col-span-4 px-3 py-2 text-sm text-slate-600">Title</div>
                  <div className="col-span-8 px-3 py-1.5">
                    <input
                      value={examPrepDraft.title}
                      onChange={(e) => setExamPrepDraft((prev) => ({ ...prev, title: e.target.value }))}
                      placeholder="Exam prep title"
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm outline-none"
                    />
                  </div>
                </label>

                <label className="grid grid-cols-12 border-b border-slate-200">
                  <div className="col-span-4 px-3 py-2 text-sm text-slate-600">Name</div>
                  <div className="col-span-8 px-3 py-1.5">
                    <input
                      value={examPrepDraft.name}
                      onChange={(e) => setExamPrepDraft((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Your name"
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm outline-none"
                    />
                  </div>
                </label>

                <label className="grid grid-cols-12 border-b border-slate-200">
                  <div className="col-span-4 px-3 py-2 text-sm text-slate-600">Course</div>
                  <div className="col-span-8 px-3 py-1.5">
                    <input
                      value={examPrepDraft.course}
                      onChange={(e) => setExamPrepDraft((prev) => ({ ...prev, course: e.target.value }))}
                      placeholder="Course name"
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm outline-none"
                    />
                  </div>
                </label>

                <label className="grid grid-cols-12 border-b border-slate-200">
                  <div className="col-span-4 px-3 py-2 text-sm text-slate-600">Exam Date</div>
                  <div className="col-span-8 px-3 py-1.5">
                    <input
                      type="date"
                      value={examPrepDraft.examDate}
                      onChange={(e) => setExamPrepDraft((prev) => ({ ...prev, examDate: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm outline-none"
                    />
                  </div>
                </label>

                <label className="grid grid-cols-12 border-b border-slate-200">
                  <div className="col-span-4 px-3 py-2 text-sm text-slate-600">Exam Time</div>
                  <div className="col-span-8 px-3 py-1.5">
                    <input
                      type="time"
                      value={examPrepDraft.examTime}
                      onChange={(e) => setExamPrepDraft((prev) => ({ ...prev, examTime: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm outline-none"
                    />
                  </div>
                </label>

                <label className="grid grid-cols-12">
                  <div className="col-span-4 px-3 py-2 text-sm text-slate-600">Notes</div>
                  <div className="col-span-8 px-3 py-1.5">
                    <textarea
                      rows={3}
                      value={examPrepDraft.notes}
                      onChange={(e) => setExamPrepDraft((prev) => ({ ...prev, notes: e.target.value }))}
                      placeholder="Any special notes"
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm outline-none"
                    />
                  </div>
                </label>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsExamPrepDialogOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={saveExamPrepDraft}
                className="rounded-xl bg-indigo-600 text-white px-4 py-2 text-sm font-semibold hover:bg-indigo-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {createOpen ? (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
              <div className="text-lg font-semibold text-slate-900">New Assignment</div>
              <div className="text-sm text-slate-500">Create and sync to backend.</div>
            </div>
            <div className="p-5 space-y-4">
              <Input
                label="Title"
                value={createDraft.title}
                onChange={(value) => setCreateDraft((prev) => ({ ...prev, title: value }))}
                placeholder="Assignment title"
              />
              <Input
                label="Course"
                value={createDraft.course}
                onChange={(value) => setCreateDraft((prev) => ({ ...prev, course: value }))}
                placeholder="Course name"
              />
              <Input
                label="Due date"
                value={createDraft.due}
                onChange={(value) => setCreateDraft((prev) => ({ ...prev, due: value }))}
                placeholder="e.g. 2026-03-18 17:00"
              />
              <Textarea
                label="Description"
                value={createDraft.description}
                onChange={(value) => setCreateDraft((prev) => ({ ...prev, description: value }))}
                placeholder="Short instructions or brief"
                rows={4}
              />
            </div>
            <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                disabled={assignmentsLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={createAssignment}
                className="rounded-xl bg-indigo-600 text-white px-4 py-2 text-sm font-semibold hover:bg-indigo-700 disabled:bg-indigo-400 disabled:text-white/80"
                disabled={assignmentsLoading}
              >
                {assignmentsLoading ? "Saving..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
