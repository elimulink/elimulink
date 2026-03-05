import { useEffect, useMemo, useState } from "react";
import { apiPost } from "../lib/apiClient";
import {
  BookOpen,
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

const DEFAULT_ASSIGNMENTS = [
  { id: "ASSG-1021", title: "Biology 101: Cell Structure", course: "Biology 101", due: "Fri 5:00 PM", status: "In Progress" },
  { id: "ASSG-1140", title: "History 202: Essay Outline", course: "History 202", due: "Mon 9:00 AM", status: "Not Started" },
  { id: "ASSG-1207", title: "CSC 110: Arrays Worksheet", course: "CSC 110", due: "Wed 11:59 PM", status: "Submitted" },
];

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

export default function AssignmentsPage() {
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

  const [assignments, setAssignments] = useState(DEFAULT_ASSIGNMENTS);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [assignmentsError, setAssignmentsError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState({
    title: "",
    description: "",
    course: "",
    due: "",
  });

  function logAction(title, detail) {
    setHistory((h) => [{ t: title, d: detail }, ...h].slice(0, 12));
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
      const data = await apiPost("/api/assignments/create", { title, description, course, due });
      const next = {
        id: data?.id ? String(data.id) : `ASSG-${Date.now()}`,
        title,
        course: course || "General",
        due: due || "TBD",
        status: "Not Started",
      };
      setAssignments((prev) => [next, ...prev]);
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

  function selectTool(nextToolKey, { openFullscreenOnMobile = false } = {}) {
    setTool(nextToolKey);
    if (isMobileViewport && openFullscreenOnMobile) {
      setMobileToolFullscreen(true);
      setMobileToolsCollapsed(true);
    }
  }

  function handleTabChange(nextTab) {
    setTab(nextTab);
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

  return (
    <div className="w-full bg-slate-100 p-4 md:p-6 h-[100dvh] overflow-hidden flex flex-col md:min-h-[100dvh] md:h-auto md:overflow-visible">
      {!hideMobilePageHeader ? (
        <div className="shrink-0 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="text-xl font-extrabold text-slate-900">Assignments</div>
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
