import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, fetchResultDetail, fetchResultsSummary } from "../lib/apiClient";
import { auth } from "../lib/firebase";
import ResultsDesktopLanding from "./ResultsDesktopLanding";
import MobileFeatureLandingShell from "../shared/feature-landing/MobileFeatureLandingShell";
import {
  ArrowLeft,
  Archive,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Download,
  Printer,
  GraduationCap,
  BookOpen,
  Copy,
  Info,
  Sparkles,
  Target,
  SlidersHorizontal,
  FileText,
  PenLine,
  Rows3,
  Trash2,
  X,
  ChevronDown,
  ChevronUp,
  Plus,
} from "lucide-react";

const DESKTOP_TABS = [
  { key: "overview", label: "Overview", icon: TrendingUp },
  { key: "semester", label: "Semester Results", icon: BookOpen },
  { key: "trends", label: "Trends", icon: BarChart3 },
  { key: "insights", label: "Insights", icon: Sparkles },
  { key: "transcript", label: "Transcript", icon: FileText },
];

const MOBILE_TABS = [
  { key: "overview", label: "Overview", icon: TrendingUp },
  { key: "semester", label: "Semester", icon: BookOpen },
  { key: "trends", label: "Trends", icon: BarChart3 },
  { key: "insights", label: "Insights", icon: Sparkles },
  { key: "transcript", label: "Transcript", icon: FileText },
];

const RESULTS_HISTORY_KEY = "resultsMobileState";
const DEFAULT_SNAPSHOT = {
  gpa: 0,
  cgpa: 0,
  credits: 0,
  standing: "No published results",
};

function resolveBackendUserId() {
  const uid = String(auth?.currentUser?.uid || "");
  const digits = uid.match(/\d+/g)?.join("") || "";
  const numeric = Number.parseInt(digits, 10);
  if (Number.isFinite(numeric) && numeric > 0) return numeric;
  return 1;
}

function TabButton({ active, icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className={[
        "inline-flex items-center gap-2 rounded-full whitespace-nowrap px-4 py-2 text-sm font-semibold transition",
        active
          ? "bg-indigo-600 text-white shadow-sm"
          : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50",
      ].join(" ")}
    >
      {Icon ? <Icon size={16} /> : null}
      {label}
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
            <div className="text-sm font-extrabold text-slate-900">{title}</div>
          </div>
          {subtitle ? <div className="mt-1 text-xs text-slate-500">{subtitle}</div> : null}
        </div>
        {right ? right : null}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4">
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-extrabold text-slate-900">{value}</div>
      {sub ? <div className="mt-1 text-xs text-slate-500">{sub}</div> : null}
    </div>
  );
}

function Badge({ tone = "gray", children }) {
  const map = {
    gray: "bg-slate-100 text-slate-700",
    green: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    red: "bg-red-100 text-red-700",
    indigo: "bg-indigo-100 text-indigo-700",
  };
  return (
    <span className={["inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold", map[tone]].join(" ")}>
      {children}
    </span>
  );
}

function PrimaryButton({ icon: Icon, children, onClick, disabled = false }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold shadow-sm",
        disabled ? "bg-indigo-400 text-white/80 cursor-not-allowed" : "bg-indigo-600 text-white hover:bg-indigo-700",
      ].join(" ")}
    >
      {Icon ? <Icon size={16} /> : null}
      {children}
    </button>
  );
}

function GhostButton({ icon: Icon, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
    >
      {Icon ? <Icon size={16} /> : null}
      {children}
    </button>
  );
}

function Input({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <label className="block">
      <div className="text-xs font-semibold text-slate-600 mb-1">{label}</div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-200"
      />
    </label>
  );
}

function MiniBar({ label, value, max = 100 }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 text-xs font-semibold text-slate-600">{label}</div>
      <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full bg-indigo-600" style={{ width: `${pct}%` }} />
      </div>
      <div className="w-10 text-right text-xs font-semibold text-slate-600">{value}</div>
    </div>
  );
}

function LineChart({ points }) {
  const w = 760;
  const h = 220;
  const pad = 18;

  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);

  const sx = (i) => pad + (i * (w - pad * 2)) / (points.length - 1);
  const sy = (v) => {
    const t = (v - min) / (max - min || 1);
    return h - pad - t * (h - pad * 2);
  };

  const d = points
    .map((v, i) => `${i === 0 ? "M" : "L"} ${sx(i).toFixed(2)} ${sy(v).toFixed(2)}`)
    .join(" ");

  const areaD =
    `M ${sx(0)} ${h - pad} ` +
    points.map((v, i) => `L ${sx(i)} ${sy(v)}`).join(" ") +
    ` L ${sx(points.length - 1)} ${h - pad} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[220px]">
      {[...Array(5)].map((_, i) => {
        const y = pad + (i * (h - pad * 2)) / 4;
        return <line key={i} x1={pad} x2={w - pad} y1={y} y2={y} stroke="#e2e8f0" strokeWidth="1" />;
      })}
      <path d={areaD} fill="#4f46e5" opacity="0.12" />
      <path d={d} fill="none" stroke="#4f46e5" strokeWidth="3" />
      {points.map((v, i) => (
        <circle key={i} cx={sx(i)} cy={sy(v)} r="4" fill="#4f46e5" />
      ))}
    </svg>
  );
}

function Drawer({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/35" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full sm:w-[520px] bg-white shadow-2xl border-l border-slate-200 flex flex-col">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-sm font-extrabold text-slate-900 truncate">{title}</div>
            <div className="text-xs text-slate-500">Course breakdown (frontend only)</div>
          </div>
          <button
            onClick={onClose}
            className="h-10 w-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-5 overflow-auto">{children}</div>
      </div>
    </div>
  );
}

export default function ResultsPage({ onOpenMainMenu, audience = "institution" }) {
  const isStudentAudience = audience === "student";
  const [tab, setTab] = useState("overview");
  const [mobileTabsCollapsed, setMobileTabsCollapsed] = useState(true);
  const [mobileTabFullscreen, setMobileTabFullscreen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 767px)").matches : false
  );
  const [aiInput, setAiInput] = useState("");
  const [aiMsgs, setAiMsgs] = useState([
    { role: "assistant", text: "Hi! I can explain your results and suggest what to improve." },
  ]);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState("");

  const [year, setYear] = useState("2025/2026");
  const [semester, setSemester] = useState("Semester 2");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);

  const [snapshot, setSnapshot] = useState(DEFAULT_SNAPSHOT);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsError, setResultsError] = useState("");

  const [gpaTrend, setGpaTrend] = useState([]);
  const [creditsTrend, setCreditsTrend] = useState([]);
  const [gradeDist, setGradeDist] = useState({ A: 0, B: 0, C: 0, D: 0, E: 0 });
  const [transcriptTerms, setTranscriptTerms] = useState([]);

  const [semesterRows, setSemesterRows] = useState([]);

  const risks = useMemo(
    () => [
      { code: "STA 205", name: "Probability", issue: "Low total score + weak exam section", tone: "red" },
      { code: "MAT 201", name: "Calculus II", issue: "Attendance drop correlates with lower exam score", tone: "amber" },
      { code: "CSC 210", name: "Data Structures", issue: "Stronger in theory than implementation tasks", tone: "indigo" },
    ],
    []
  );

  const skills = useMemo(
    () => [
      { label: "Analytical Skills", level: "Strong", tone: "green" },
      { label: "Writing Skills", level: "Moderate", tone: "amber" },
      { label: "Quantitative Skills", level: "Needs Work", tone: "red" },
    ],
    []
  );

  const courseBreakdowns = useMemo(
    () => ({
      "CSC 210": {
        composition: [
          { k: "CAT 1", w: 10, s: 7 },
          { k: "CAT 2", w: 10, s: 6 },
          { k: "Assignment", w: 10, s: 8 },
          { k: "Attendance", w: 5, s: 4 },
          { k: "Final Exam", w: 65, s: 35 },
        ],
        compare: { classAvg: 58, yours: 60, percentile: 62, difficulty: "Medium" },
      },
      "MAT 201": {
        composition: [
          { k: "CAT 1", w: 10, s: 6 },
          { k: "CAT 2", w: 10, s: 5 },
          { k: "Assignment", w: 10, s: 3 },
          { k: "Attendance", w: 5, s: 2 },
          { k: "Final Exam", w: 65, s: 29 },
        ],
        compare: { classAvg: 52, yours: 45, percentile: 41, difficulty: "High" },
      },
      "STA 205": {
        composition: [
          { k: "CAT 1", w: 10, s: 4 },
          { k: "CAT 2", w: 10, s: 3 },
          { k: "Assignment", w: 10, s: 4 },
          { k: "Attendance", w: 5, s: 3 },
          { k: "Final Exam", w: 65, s: 25 },
        ],
        compare: { classAvg: 50, yours: 39, percentile: 28, difficulty: "High" },
      },
    }),
    []
  );

  const [targetCgpa, setTargetCgpa] = useState("3.50");
  const [nextCredits, setNextCredits] = useState("18");
  const [nextGpaGuess, setNextGpaGuess] = useState("3.70");
  const [showDesktopLanding, setShowDesktopLanding] = useState(
    () => !(typeof window !== "undefined" ? window.matchMedia("(max-width: 767px)").matches : false)
  );
  const [showMobileLanding, setShowMobileLanding] = useState(
    () => typeof window !== "undefined" ? window.matchMedia("(max-width: 767px)").matches : false
  );
  const [activeMobileSection, setActiveMobileSection] = useState("overview");
  const [isMobileSectionMenuOpen, setIsMobileSectionMenuOpen] = useState(false);
  const [isLandingMenuOpen, setIsLandingMenuOpen] = useState(false);
  const [isLandingShareOpen, setIsLandingShareOpen] = useState(false);
  const [isLandingSettingsOpen, setIsLandingSettingsOpen] = useState(false);
  const [isLandingUtilityMenuOpen, setIsLandingUtilityMenuOpen] = useState(false);
  const [landingRowMenuId, setLandingRowMenuId] = useState(null);
  const [landingMoveMenuId, setLandingMoveMenuId] = useState(null);
  const [landingShareInvite, setLandingShareInvite] = useState("");
  const [landingShareAccess, setLandingShareAccess] = useState("institution only");
  const [landingShareStatus, setLandingShareStatus] = useState("");
  const [landingWorkspaceStatus, setLandingWorkspaceStatus] = useState("");
  const [landingDeleteOpen, setLandingDeleteOpen] = useState(false);
  const [landingWorkspaceSettings, setLandingWorkspaceSettings] = useState({
    name: "Results Workspace",
    description: "Review semester performance, transcripts, and trends in one calm results workspace.",
    linkedInstitution: isStudentAudience ? "Your academic record" : "ElimuLink University",
    defaultView: "semester results",
    collaboration: isStudentAudience ? "personal review" : "institution review",
  });

  function openCourse(row) {
    setSelectedCourse(row);
    setDrawerOpen(true);
  }

  const landingRows = useMemo(
    () =>
      semesterRows.map((row) => ({
        id: row.code,
        title: row.name,
        preview: `${row.code} • ${semester} • Grade ${row.grade || "N/A"} • ${row.remark || "Published result"}`,
        meta: row.total != null ? `${row.total} total` : "Published",
        source: row,
      })),
    [semesterRows, semester]
  );

  function openLandingResultRow(item) {
    const userId = resolveBackendUserId();
    fetchResultDetail(userId, item.id)
      .then((data) => {
        setTab("semester");
        openCourse(data?.result || item.source);
        setShowDesktopLanding(false);
        setShowMobileLanding(false);
      })
      .catch(() => {
        setTab("semester");
        openCourse(item.source);
        setShowDesktopLanding(false);
        setShowMobileLanding(false);
      });
  }

  function renameLandingResultRow(rowId) {
    const target = semesterRows.find((row) => row.code === rowId);
    if (!target) return;
    setLandingWorkspaceStatus(`${target.name} is an official published result and cannot be renamed here.`);
  }

  function moveLandingResultRow(rowId, destination) {
    const target = semesterRows.find((row) => row.code === rowId);
    if (!target) return;
    setLandingWorkspaceStatus(`${target.name} is prepared to move into ${destination} as a safe frontend-first Results action.`);
  }

  function archiveLandingResultRow(rowId) {
    const target = semesterRows.find((row) => row.code === rowId);
    if (!target) return;
    setLandingWorkspaceStatus(`${target.name} is an official published result and cannot be archived here.`);
  }

  function deleteLandingResultRow(rowId) {
    const target = semesterRows.find((row) => row.code === rowId);
    if (!target) return;
    setLandingWorkspaceStatus(`${target.name} is an official published result and cannot be deleted here.`);
  }

  function renameResultsWorkspace() {
    const nextName = window.prompt("Rename results workspace", landingWorkspaceSettings.name);
    if (!nextName) return;
    const normalized = nextName.trim();
    if (!normalized) return;
    setLandingWorkspaceSettings((prev) => ({ ...prev, name: normalized }));
    setLandingWorkspaceStatus("Results workspace renamed.");
  }

  function moveResultsWorkspace() {
    setLandingWorkspaceStatus("Move to workspace is prepared here as a safe frontend-first Results action.");
  }

  function archiveResultsWorkspace() {
    setLandingWorkspaceStatus("Archive is prepared here as a safe frontend-first Results action.");
  }

  async function sendAI(text) {
    const clean = text.trim();
    if (!clean || aiBusy) return;
    setAiMsgs((m) => [...m, { role: "user", text: clean }]);
    setAiInput("");
    setAiBusy(true);
    setAiError("");
    try {
      const data = await apiPost("/api/ai/chat", { message: clean });
      const reply = String(data?.response || data?.message || "No response available.");
      setAiMsgs((m) => [...m, { role: "assistant", text: reply }]);
    } catch (error) {
      const message = error?.message || "AI request failed.";
      setAiError(message);
      setAiMsgs((m) => [...m, { role: "assistant", text: `Error: ${message}` }]);
    } finally {
      setAiBusy(false);
    }
  }

  const standingTone =
    snapshot.standing.includes("Good") ? "green" : snapshot.standing.includes("Warning") ? "amber" : "red";

  function Overview() {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat label="Current GPA" value={snapshot.gpa.toFixed(2)} sub={`Semester: ${semester}`} />
          <Stat label="Cumulative GPA (CGPA)" value={snapshot.cgpa.toFixed(2)} sub={`Academic year: ${year}`} />
          <Stat label="Credits Earned" value={snapshot.credits} sub="Updated this semester" />
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4">
            <div className="text-xs font-semibold text-slate-500">Academic Standing</div>
            <div className="mt-2">
              <Badge tone={standingTone}>{snapshot.standing}</Badge>
            </div>
            <div className="mt-2 text-xs text-slate-500">Based on your institution policy</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card title="GPA Trend" subtitle="Per semester (sample)" icon={TrendingUp} right={<Badge tone="indigo">Trending up</Badge>}>
            <LineChart points={gpaTrend} />
          </Card>

          <Card title="Grade Distribution" subtitle="Your grade count (sample)" icon={BarChart3}>
            <div className="space-y-3">
              <MiniBar label="A" value={gradeDist.A} max={12} />
              <MiniBar label="B" value={gradeDist.B} max={12} />
              <MiniBar label="C" value={gradeDist.C} max={12} />
              <MiniBar label="D" value={gradeDist.D} max={12} />
              <MiniBar label="E" value={gradeDist.E} max={12} />
            </div>
          </Card>

          <Card title="Academic Risk Indicators" subtitle="What may be pulling down your GPA" icon={AlertTriangle}>
            <div className="space-y-3">
              {risks.map((r) => (
                <div key={r.code} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-extrabold text-slate-900">{r.code}</div>
                      <div className="text-xs text-slate-600 truncate">{r.name}</div>
                    </div>
                    <Badge tone={r.tone}>{r.tone === "red" ? "High" : r.tone === "amber" ? "Medium" : "Info"}</Badge>
                  </div>
                  <div className="mt-2 text-xs text-slate-600">{r.issue}</div>
                  <div className="mt-3">
                    <GhostButton
                      icon={Info}
                      onClick={() => {
                        const row = semesterRows.find((x) => x.code === r.code);
                        if (row) openCourse(row);
                      }}
                    >
                      View breakdown
                    </GhostButton>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  function SemesterResults() {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-lg font-extrabold text-slate-900">Semester Results</div>
            <div className="text-sm text-slate-600">Filter and open course breakdown.</div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
              <SlidersHorizontal size={16} className="text-slate-500" />
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="text-sm outline-none bg-transparent text-slate-800"
              >
                <option>2025/2026</option>
                <option>2024/2025</option>
                <option>2023/2024</option>
              </select>
              <span className="text-slate-300">|</span>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="text-sm outline-none bg-transparent text-slate-800"
              >
                <option>Semester 1</option>
                <option>Semester 2</option>
              </select>
            </div>

            <GhostButton icon={Printer} onClick={() => window.print()}>
              Print
            </GhostButton>
            <GhostButton icon={Download} onClick={() => alert("Download PDF (backend later)")}>
              Download PDF
            </GhostButton>
          </div>
        </div>

        <Card title="Results Table" subtitle={`${year} • ${semester}`} icon={BookOpen}>
          <div className="space-y-3 md:hidden">
            {semesterRows.map((r) => {
              const gradeText = String(r.grade || "N/A");
              const gradeTone = gradeText.includes("A")
                ? "green"
                : gradeText.includes("B")
                ? "indigo"
                : gradeText === "C"
                ? "amber"
                : "red";
              const remark = r.remark || (gradeText.includes("F") ? "Repeat" : "Pass");
              return (
                <div key={r.code} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900">{r.name}</div>
                      <div className="mt-1 text-xs text-slate-600">{r.code}</div>
                    </div>
                    <Badge tone={gradeTone}>{gradeText}</Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <div>
                      CAT/Assgn: <span className="font-semibold text-slate-800">{r.cat ?? "-"}</span>
                    </div>
                    <div>
                      Exam: <span className="font-semibold text-slate-800">{r.exam ?? "-"}</span>
                    </div>
                    <div>
                      Total: <span className="font-semibold text-slate-900">{r.total ?? "-"}</span>
                    </div>
                    <div>
                      Credits: <span className="font-semibold text-slate-800">{r.credits ?? "-"}</span>
                    </div>
                  </div>
                  <div className="mt-2">
                    {remark === "Pass" ? (
                      <span className="inline-flex items-center gap-2 text-emerald-700 font-semibold text-xs">
                        <CheckCircle2 size={14} /> Pass
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 text-red-700 font-semibold text-xs">
                        <AlertTriangle size={14} /> Repeat
                      </span>
                    )}
                  </div>
                  <div className="mt-3">
                    <GhostButton onClick={() => openCourse(r)} icon={Info}>
                      Breakdown
                    </GhostButton>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden md:block overflow-auto">
            <table className="min-w-[900px] w-full text-sm">
              <thead className="text-slate-500">
                <tr className="text-left border-b border-slate-200">
                  <th className="py-2 pr-3 font-semibold">Course Code</th>
                  <th className="py-2 pr-3 font-semibold">Course Name</th>
                  <th className="py-2 pr-3 font-semibold">CAT/Assgn</th>
                  <th className="py-2 pr-3 font-semibold">Exam</th>
                  <th className="py-2 pr-3 font-semibold">Total</th>
                  <th className="py-2 pr-3 font-semibold">Grade</th>
                  <th className="py-2 pr-3 font-semibold">Credits</th>
                  <th className="py-2 pr-3 font-semibold">Remarks</th>
                  <th className="py-2 pr-3 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {semesterRows.map((r) => {
                  const gradeText = String(r.grade || "N/A");
                  const gradeTone = gradeText.includes("A")
                    ? "green"
                    : gradeText.includes("B")
                    ? "indigo"
                    : gradeText === "C"
                    ? "amber"
                    : "red";
                  const remark = r.remark || (gradeText.includes("F") ? "Repeat" : "Pass");
                  return (
                    <tr key={r.code} className="border-b border-slate-100">
                      <td className="py-3 pr-3 text-slate-800 font-semibold">{r.code}</td>
                      <td className="py-3 pr-3 text-slate-700">{r.name}</td>
                      <td className="py-3 pr-3 text-slate-700">{r.cat ?? "-"}</td>
                      <td className="py-3 pr-3 text-slate-700">{r.exam ?? "-"}</td>
                      <td className="py-3 pr-3 text-slate-900 font-extrabold">{r.total ?? "-"}</td>
                      <td className="py-3 pr-3">
                        <Badge tone={gradeTone}>{gradeText}</Badge>
                      </td>
                      <td className="py-3 pr-3 text-slate-700">{r.credits ?? "-"}</td>
                      <td className="py-3 pr-3">
                        {remark === "Pass" ? (
                          <span className="inline-flex items-center gap-2 text-emerald-700 font-semibold">
                            <CheckCircle2 size={16} /> Pass
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2 text-red-700 font-semibold">
                            <AlertTriangle size={16} /> Repeat
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-3 text-right">
                        <GhostButton onClick={() => openCourse(r)} icon={Info}>
                          Breakdown
                        </GhostButton>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  }

  function Trends() {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="GPA Trend" subtitle="Historical GPA per semester" icon={TrendingUp} right={<Badge tone="indigo">Trend</Badge>}>
          <LineChart points={gpaTrend.length ? gpaTrend : [0]} />
        </Card>

        <Card title="Credits Trend" subtitle="Credits recorded per published term" icon={BarChart3}>
          <div className="space-y-3">
            {(creditsTrend.length ? creditsTrend : [0]).map((c, i) => (
              <MiniBar key={i} label={`S${i + 1}`} value={c} max={18} />
            ))}
          </div>
        </Card>

        <Card title="Risk Summary" subtitle="How to improve quickly" icon={AlertTriangle}>
          <div className="space-y-3">
            {[
              { t: "Fix weak exam topics", d: "Focus on STA 205 exam sections (probability rules, distributions)." },
              { t: "Attendance discipline", d: "Aim 80%+ attendance for better score stability." },
              { t: "Weekly practice plan", d: "3 short sessions/week for Calculus problems." },
            ].map((x) => (
              <div key={x.t} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-sm font-extrabold text-slate-900">{x.t}</div>
                <div className="mt-1 text-xs text-slate-600">{x.d}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  function Insights() {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="Performance Insights" subtitle="AI-ready insights (mock)" icon={Sparkles}>
          <div className="space-y-3 text-sm text-slate-700">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              Your GPA improved by <b>0.21</b> compared to last semester.
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              You perform better in <b>practical / project units</b> than heavy theory units.
            </div>
          </div>
        </Card>

        <Card title="Planning Tools" subtitle="Interactive tools (frontend only)" icon={Target}>
          <div className="space-y-3">
            <Input label="Target CGPA" value={targetCgpa} onChange={setTargetCgpa} placeholder="3.50" type="number" />
            <Input label="Next credits" value={nextCredits} onChange={setNextCredits} placeholder="18" type="number" />
            <Input label="Expected next GPA" value={nextGpaGuess} onChange={setNextGpaGuess} placeholder="3.70" type="number" />
          </div>
        </Card>

        <Card title="AI Academic Advisor" subtitle="Ask questions about your results" icon={Sparkles}>
          <div className="space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 max-h-[190px] overflow-auto space-y-2">
              {aiMsgs.map((m, i) => (
                <div key={i} className="text-sm">
                  <span className="font-extrabold text-slate-800">{m.role === "user" ? "You" : "AI"}:</span>{" "}
                  <span className="text-slate-700">{m.text}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendAI(aiInput)}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="Type a question..."
              />
              <PrimaryButton onClick={() => sendAI(aiInput)} disabled={aiBusy}>
                {aiBusy ? "Sending..." : "Send"}
              </PrimaryButton>
            </div>
            {aiError ? <div className="text-xs font-semibold text-rose-600">{aiError}</div> : null}
          </div>
        </Card>
      </div>
    );
  }

  function Transcript() {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="Unofficial Transcript" subtitle="Published terms and units from the current backend source" icon={FileText}>
          <div className="space-y-3">
            {transcriptTerms.length ? (
              <div className="space-y-3">
                {transcriptTerms.map((term) => (
                  <div key={term.term} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-slate-900">{term.term}</span>
                      <Badge tone="indigo">{Number(term.gpa || 0).toFixed(2)}</Badge>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {term.courses} units • {term.credits} credits
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                No transcript rows are available from the current backend source yet.
              </div>
            )}
            <div className="flex gap-2 flex-wrap">
              <PrimaryButton icon={Download} onClick={() => alert("Generate PDF (backend later)")}>
                Download PDF
              </PrimaryButton>
              <GhostButton icon={Printer} onClick={() => window.print()}>
                Print
              </GhostButton>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const breakdown = selectedCourse ? courseBreakdowns[selectedCourse.code] : null;
  const activeMobileTab = useMemo(
    () => MOBILE_TABS.find((item) => item.key === tab) || MOBILE_TABS[0],
    [tab]
  );
  const hideMobilePageHeader = isMobileViewport && mobileTabFullscreen;

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
      setMobileTabFullscreen(false);
      setMobileTabsCollapsed(true);
      setShowMobileLanding(false);
    }
  }, [isMobileViewport]);

  useEffect(() => {
    if (isMobileViewport) {
      setShowDesktopLanding(false);
    } else {
      setShowMobileLanding(false);
    }
  }, [isMobileViewport]);

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
    let active = true;
    const loadResults = async () => {
      setResultsLoading(true);
      setResultsError("");
      const userId = resolveBackendUserId();
      try {
        const data = await fetchResultsSummary(userId);
        if (!active) return;
        const nextSnapshot = {
          ...DEFAULT_SNAPSHOT,
          gpa: Number.isFinite(Number(data?.gpa)) ? Number(data.gpa) : DEFAULT_SNAPSHOT.gpa,
          cgpa: Number.isFinite(Number(data?.cgpa)) ? Number(data.cgpa) : DEFAULT_SNAPSHOT.cgpa,
          credits: Number.isFinite(Number(data?.credits)) ? Number(data.credits) : DEFAULT_SNAPSHOT.credits,
          standing: String(data?.standing || DEFAULT_SNAPSHOT.standing),
        };
        setSnapshot(nextSnapshot);
        setSemester(data?.current_term || "Published results");
        setSemesterRows(Array.isArray(data?.semester) ? data.semester : []);
        setTranscriptTerms(Array.isArray(data?.transcript) ? data.transcript : []);
        setGpaTrend(Array.isArray(data?.trends?.gpa) ? data.trends.gpa : []);
        setCreditsTrend(Array.isArray(data?.trends?.credits) ? data.trends.credits : []);
        setGradeDist(
          data?.grade_distribution && typeof data.grade_distribution === "object"
            ? {
                A: Number(data.grade_distribution.A || 0),
                B: Number(data.grade_distribution.B || 0),
                C: Number(data.grade_distribution.C || 0),
                D: Number(data.grade_distribution.D || 0),
                E: Number(data.grade_distribution.E || 0),
              }
            : { A: 0, B: 0, C: 0, D: 0, E: 0 }
        );
      } catch (error) {
        if (!active) return;
        setResultsError(error?.message || "Failed to load results.");
        setSemesterRows([]);
        setTranscriptTerms([]);
        setGpaTrend([]);
        setCreditsTrend([]);
        setGradeDist({ A: 0, B: 0, C: 0, D: 0, E: 0 });
      } finally {
        if (active) setResultsLoading(false);
      }
    };

    loadResults();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onPopState = (event) => {
      const snapshot = event?.state?.[RESULTS_HISTORY_KEY];
      if (!snapshot || typeof snapshot !== "object") {
        setMobileTabFullscreen(false);
        return;
      }
      const nextTab = MOBILE_TABS.some((item) => item.key === snapshot.tab) ? snapshot.tab : "overview";
      setTab(nextTab);
      setMobileTabFullscreen(Boolean(snapshot.fullscreen));
      setMobileTabsCollapsed(!Boolean(snapshot.fullscreen));
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  function updateResultsHistory(nextTab, nextFullscreen, mode = "replace") {
    if (typeof window === "undefined") return;
    const payload = {
      tab: nextTab,
      fullscreen: Boolean(nextFullscreen),
    };
    const nextState = {
      ...(window.history.state || {}),
      [RESULTS_HISTORY_KEY]: payload,
    };
    if (mode === "push") {
      window.history.pushState(nextState, "", window.location.href);
      return;
    }
    window.history.replaceState(nextState, "", window.location.href);
  }

  useEffect(() => {
    updateResultsHistory(tab, mobileTabFullscreen, "replace");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, mobileTabFullscreen]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (
        event.target?.closest?.("[data-results-landing-menu]") ||
        event.target?.closest?.("[data-results-utility-menu]") ||
        event.target?.closest?.("[data-results-row-menu]")
      ) {
        return;
      }
      setIsLandingMenuOpen(false);
      setIsLandingUtilityMenuOpen(false);
      setLandingRowMenuId(null);
      setLandingMoveMenuId(null);
    };

    const handleKeyDown = (event) => {
      if (event.key !== "Escape") return;
      setIsLandingMenuOpen(false);
      setIsLandingUtilityMenuOpen(false);
      setLandingRowMenuId(null);
      setLandingMoveMenuId(null);
      setIsLandingShareOpen(false);
      setIsLandingSettingsOpen(false);
      setLandingDeleteOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function handleMobileTabSelect(nextTab) {
    setTab(nextTab);
    setMobileTabsCollapsed(true);
    if (isMobileViewport) {
      setMobileTabFullscreen(true);
      updateResultsHistory(nextTab, true, "push");
    }
  }

  const mobileSectionItems = useMemo(
    () => [
      { key: "overview", label: "Overview", icon: TrendingUp },
      { key: "semester", label: "Semester", icon: BookOpen },
      { key: "trends", label: "Trends", icon: BarChart3 },
      { key: "insights", label: "Insights", icon: Sparkles },
      { key: "transcript", label: "Transcript", icon: FileText },
    ],
    []
  );

  function openMobileSection(sectionKey) {
    setIsMobileSectionMenuOpen(false);
    setActiveMobileSection(sectionKey);
    setTab(sectionKey);
    setMobileTabsCollapsed(true);
    setMobileTabFullscreen(false);
    setShowMobileLanding(false);
  }

  if (!isMobileViewport && showDesktopLanding) {
    return (
      <ResultsDesktopLanding
        isLandingMenuOpen={isLandingMenuOpen}
        setIsLandingMenuOpen={setIsLandingMenuOpen}
        isLandingShareOpen={isLandingShareOpen}
        setIsLandingShareOpen={setIsLandingShareOpen}
        isLandingSettingsOpen={isLandingSettingsOpen}
        setIsLandingSettingsOpen={setIsLandingSettingsOpen}
        isLandingUtilityMenuOpen={isLandingUtilityMenuOpen}
        setIsLandingUtilityMenuOpen={setIsLandingUtilityMenuOpen}
        landingRowMenuId={landingRowMenuId}
        setLandingRowMenuId={setLandingRowMenuId}
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
        landingRows={landingRows}
        resultsLoading={resultsLoading}
        snapshot={snapshot}
        onOpenRow={openLandingResultRow}
        onPrimaryAction={() => {
          setTab("semester");
          setShowDesktopLanding(false);
        }}
        onQuickSemester={() => {
          setTab("semester");
          setShowDesktopLanding(false);
        }}
        onQuickTranscript={() => {
          setTab("transcript");
          setShowDesktopLanding(false);
        }}
        onQuickTrends={() => {
          setTab("trends");
          setShowDesktopLanding(false);
        }}
        onQuickSubgroup={() => {
          setLandingWorkspaceStatus("Subgroup routing is prepared here as a safe frontend-first Results shortcut.");
          setIsLandingSettingsOpen(true);
        }}
        onRenameWorkspace={renameResultsWorkspace}
        onMoveWorkspace={moveResultsWorkspace}
        onArchiveWorkspace={archiveResultsWorkspace}
        onRenameRow={renameLandingResultRow}
        onMoveRow={moveLandingResultRow}
        onArchiveRow={archiveLandingResultRow}
        onDeleteRow={deleteLandingResultRow}
      />
    );
  }

  if (isMobileViewport && showMobileLanding) {
    return (
      <MobileFeatureLandingShell
        featureName="Results"
        featureSubtitle="Semester performance and calmer review"
        featureDescription={isStudentAudience ? "Scan your published results, jump into transcript or trends, and open a focused review section only when you need more detail." : "Scan published results, jump into transcript or trends, and enter the full results workspace only when deeper analysis is needed."}
        featureIcon={GraduationCap}
        featureStyle="soft"
        workspaceLabel={landingWorkspaceSettings.name}
        workspaceHint={landingWorkspaceSettings.description}
        workspaceBadge={isStudentAudience ? "Student workspace" : "Institution workspace"}
        hideInstitutionStrip
        quickActions={[
          { key: "latest", label: "Latest results", icon: BookOpen, onClick: () => openMobileSection("semester") },
          { key: "transcript", label: "Transcript", icon: FileText, onClick: () => openMobileSection("transcript") },
          { key: "trends", label: "Trends", icon: TrendingUp, onClick: () => openMobileSection("trends") },
          { key: "insights", label: "AI insights", icon: Sparkles, onClick: () => openMobileSection("insights") },
        ]}
        quickActionsStyle="rows"
        utilityActions={[
          { key: "rename-workspace", label: "Rename workspace", icon: PenLine, onClick: renameResultsWorkspace },
          { key: "move-workspace", label: "Move workspace", icon: Rows3, onClick: moveResultsWorkspace },
          { key: "archive-workspace", label: "Archive workspace", icon: Archive, onClick: archiveResultsWorkspace },
          {
            key: "delete-workspace",
            label: "Delete workspace",
            icon: Trash2,
            destructive: true,
            onClick: () => {
              setLandingWorkspaceStatus("Delete stays protected in the full results workspace.");
              setShowMobileLanding(false);
            },
          },
        ]}
        shareConfig={{
          title: "Share Results",
          description: "Choose who can access this results workspace and keep the share flow readable on mobile.",
          emailLabel: "Invite reviewer",
          emailPlaceholder: "advisor@example.com",
          accessLabel: "Access level",
          accessOptions: [
            { value: "institution only", label: isStudentAudience ? "Private" : "Institution only" },
            { value: "published summary", label: "Published summary" },
            { value: "review access", label: "Review access" },
          ],
          defaultAccess: landingShareAccess,
          membersTitle: "Results owner",
          members: [{ key: "owner", label: "Results workspace", role: "Owner" }],
          privacyNote: "Results sharing remains frontend-first here, but the share experience is now a full mobile surface.",
          submitLabel: "Save share setup",
        }}
        items={landingRows.map((item) => ({
          ...item,
          actions: [
            { key: "share", label: "Share", icon: Copy, onClick: () => setLandingShareStatus(`Sharing for "${item.title}" is prepared here as a safe frontend-first action.`) },
            { key: "open", label: "Open result", icon: BookOpen, onClick: () => openLandingResultRow(item) },
            { key: "rename", label: "Rename", icon: PenLine, onClick: () => renameLandingResultRow(item.id) },
            { key: "move", label: "Move", icon: Rows3, onClick: () => moveLandingResultRow(item.id, "Transcript") },
            { key: "archive", label: "Archive", icon: Archive, onClick: () => archiveLandingResultRow(item.id) },
            { key: "delete", label: "Delete", icon: Trash2, destructive: true, onClick: () => deleteLandingResultRow(item.id) },
          ],
        }))}
        listStyle="plain"
        inputPlaceholder="Ask about your results"
        inputValue={aiInput}
        onInputChange={setAiInput}
        onInputSubmit={(value) => {
          openMobileSection("insights");
          sendAI(value);
        }}
        onMenu={onOpenMainMenu || (() => {
          setTab("overview");
          setShowMobileLanding(false);
        })}
        onShare={() => {
          setLandingWorkspaceStatus("Share is prepared here as a safe frontend-first Results action.");
          setShowMobileLanding(false);
        }}
        onShareSubmit={async ({ email, access }) => {
          setLandingShareInvite(email);
          setLandingShareAccess(access);
          setLandingShareStatus(email ? `Results sharing prepared for ${email}.` : `Results access saved as ${access}.`);
          return { status: email ? `Results sharing prepared for ${email}.` : `Results access saved as ${access}.` };
        }}
        onSettings={() => {
          openMobileSection("overview");
        }}
        onNewWork={() => {
          openMobileSection("semester");
        }}
        onStartCall={() => {
          openMobileSection("insights");
        }}
        onOpenItem={(item) => {
          openMobileSection("semester");
          openLandingResultRow(item);
        }}
        emptyStateTitle="No results published yet"
        emptyState="Published result rows will appear here once the semester data is ready."
      />
    );
  }

  if (isMobileViewport) {
    const activeMobileMeta = mobileSectionItems.find((item) => item.key === activeMobileSection) || mobileSectionItems[0];

    return (
      <div className="relative min-h-[100dvh] overflow-x-hidden bg-[radial-gradient(circle_at_top,#162846_0%,#10192f_58%,#0b1220_100%)] px-5 pb-28 pt-5 text-white">
        <div className="space-y-6">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Results</div>
            <div className="mt-2 text-[30px] font-semibold leading-[1.08] text-white">
              {activeMobileSection === "overview" ? "Results Overview" : null}
              {activeMobileSection === "semester" ? "Semester Results" : null}
              {activeMobileSection === "trends" ? "Performance Trends" : null}
              {activeMobileSection === "insights" ? "Insights" : null}
              {activeMobileSection === "transcript" ? "Transcript" : null}
            </div>
            <div className="mt-2 max-w-[34ch] text-[15px] leading-7 text-slate-300">
              {activeMobileSection === "overview" ? "A calmer result summary with your GPA, credits, and current standing." : null}
              {activeMobileSection === "semester" ? "Read the current semester results without the old mobile section boxes." : null}
              {activeMobileSection === "trends" ? "Follow GPA and credits patterns in one cleaner view." : null}
              {activeMobileSection === "insights" ? "Keep risks, strengths, and AI explanation in one focused place." : null}
              {activeMobileSection === "transcript" ? "Review published terms in a simpler transcript view." : null}
            </div>
          </div>

          {resultsLoading ? <div className="text-sm font-medium text-slate-400">Loading results...</div> : null}
          {resultsError ? <div className="text-sm font-medium text-rose-300">{resultsError}</div> : null}
          {aiError ? <div className="text-sm font-medium text-rose-300">{aiError}</div> : null}

          {activeMobileSection === "overview" ? (
            <div className="space-y-5">
              <div className="space-y-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Current standing</div>
                <div className="text-[28px] font-semibold leading-tight text-white">{snapshot.standing || "No published results"}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">GPA</div>
                  <div className="mt-2 text-[24px] font-semibold text-white">{snapshot.gpa ?? 0}</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">CGPA</div>
                  <div className="mt-2 text-[24px] font-semibold text-white">{snapshot.cgpa ?? 0}</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Credits</div>
                  <div className="mt-2 text-[24px] font-semibold text-white">{snapshot.credits ?? 0}</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Year</div>
                  <div className="mt-2 text-[18px] font-medium text-slate-200">{year}</div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">At risk</div>
                {risks.map((risk) => (
                  <div key={risk.code}>
                    <div className="text-base font-semibold text-white">{risk.code} - {risk.name}</div>
                    <div className="mt-1 text-sm leading-6 text-slate-300">{risk.issue}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {activeMobileSection === "semester" ? (
            <div className="space-y-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Academic year</div>
                  <div className="mt-2 text-[16px] text-white">{year}</div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Semester</div>
                  <div className="mt-2 text-[16px] text-white">{semester}</div>
                </div>
              </div>
              <div className="space-y-4">
                {semesterRows.map((row) => (
                  <button
                    key={row.code}
                    type="button"
                    onClick={() => openCourse(row)}
                    className="block w-full text-left"
                  >
                    <div className="text-base font-semibold text-white">{row.code} - {row.name}</div>
                    <div className="mt-1 text-sm leading-6 text-slate-300">
                      Grade {row.grade || "N/A"} • Total {row.total ?? "N/A"} • {row.remark || "Published result"}
                    </div>
                  </button>
                ))}
                {!semesterRows.length && !resultsLoading ? (
                  <div className="text-[15px] leading-7 text-slate-300">No semester rows are available yet.</div>
                ) : null}
              </div>
            </div>
          ) : null}

          {activeMobileSection === "trends" ? (
            <div className="space-y-6">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">GPA trend</div>
                <div className="mt-3 rounded-[28px] bg-white/[0.03] p-3">
                  <LineChart points={gpaTrend.length ? gpaTrend : [0, 0, 0, 0]} />
                </div>
              </div>
              <div className="space-y-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Credits trend</div>
                {(creditsTrend.length ? creditsTrend : [0]).map((value, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-10 text-xs font-semibold text-slate-400">{`S${index + 1}`}</div>
                    <div className="h-2 flex-1 rounded-full bg-white/[0.08]">
                      <div className="h-full rounded-full bg-cyan-400" style={{ width: `${Math.max(8, Math.min(100, (value / 18) * 100))}%` }} />
                    </div>
                    <div className="w-8 text-right text-xs font-semibold text-slate-300">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {activeMobileSection === "insights" ? (
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Skills</div>
                {skills.map((skill) => (
                  <div key={skill.label}>
                    <div className="text-base font-semibold text-white">{skill.label}</div>
                    <div className="mt-1 text-sm leading-6 text-slate-300">{skill.level}</div>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Ask AI</div>
                <label className="block">
                  <textarea
                    value={aiInput}
                    onChange={(event) => setAiInput(event.target.value)}
                    placeholder="Ask about your results..."
                    rows={5}
                    className="w-full border-0 bg-white/[0.04] px-0 py-0 text-[15px] leading-7 text-white outline-none placeholder:text-slate-500"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => sendAI(aiInput)}
                  disabled={aiBusy}
                  className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(90deg,#2563eb,#14b8a6)] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <Sparkles size={16} />
                  {aiBusy ? "Thinking..." : "Explain results"}
                </button>
                {aiMsgs.slice(-3).map((message, index) => (
                  <div key={`${message.role}-${index}`} className="text-[15px] leading-7 text-slate-300">
                    {message.text}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {activeMobileSection === "transcript" ? (
            <div className="space-y-6">
              {transcriptTerms.map((term) => (
                <div key={term.term} className="space-y-3">
                  <div>
                    <div className="text-base font-semibold text-white">{term.term}</div>
                    <div className="mt-1 text-sm leading-6 text-slate-300">
                      GPA {term.gpa ?? "N/A"} • Credits {term.credits ?? "N/A"}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {(term.rows || []).map((row) => (
                      <div key={`${term.term}-${row.code}`} className="text-sm leading-6 text-slate-300">
                        {row.code} - {row.name} • {row.grade || "N/A"}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {!transcriptTerms.length && !resultsLoading ? (
                <div className="text-[15px] leading-7 text-slate-300">No transcript terms are available yet.</div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-end px-5 pb-8">
          <div className="relative pointer-events-auto">
            {isMobileSectionMenuOpen ? (
              <div className="absolute bottom-20 right-0 flex flex-col items-end gap-3">
                {[...mobileSectionItems].reverse().map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => openMobileSection(item.key)}
                      className="inline-flex items-center gap-3 rounded-full bg-[#066b2f] px-5 py-4 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(6,107,47,0.34)]"
                    >
                      <Icon size={18} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => setIsMobileSectionMenuOpen((prev) => !prev)}
              className="inline-flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#066b2f] text-white shadow-[0_18px_42px_rgba(6,107,47,0.34)]"
              aria-label={isMobileSectionMenuOpen ? "Close sections" : "Open sections"}
              title={activeMobileMeta.label}
            >
              <Plus size={28} className={isMobileSectionMenuOpen ? "rotate-45 transition-transform" : "transition-transform"} />
            </button>
          </div>
        </div>

        <Drawer
          open={drawerOpen}
          title={selectedCourse ? `${selectedCourse.code} • ${selectedCourse.name}` : "Course Breakdown"}
          onClose={() => setDrawerOpen(false)}
        >
          {!selectedCourse || !breakdown ? (
            <div className="text-sm text-slate-600">No breakdown data yet.</div>
          ) : (
            <div className="space-y-4">
              <Card title="Grade Composition" subtitle="Weights vs achieved score (sample)" icon={BookOpen}>
                <div className="space-y-3">
                  {breakdown.composition.map((x) => (
                    <div key={x.k} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-extrabold text-slate-900">{x.k}</div>
                        <Badge tone="indigo">{x.w}%</Badge>
                      </div>
                      <div className="mt-2 text-sm text-slate-700">
                        Score contribution: <b>{x.s}</b>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </Drawer>
      </div>
    );
  }

  return (
    <div className="w-full bg-slate-100 p-4 md:p-6 h-[100dvh] overflow-hidden flex flex-col md:min-h-[100dvh] md:h-auto md:overflow-visible">
      {!hideMobilePageHeader ? (
        <>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              {!isMobileViewport ? (
                <div className="mb-2">
                  <button
                    type="button"
                    onClick={() => setShowDesktopLanding(true)}
                    className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <ArrowLeft size={12} />
                    Workspace
                  </button>
                </div>
              ) : null}
              <div className="text-xl font-extrabold text-slate-900">Results</div>
              {isMobileViewport ? (
                <button
                  type="button"
                  onClick={() => setShowMobileLanding(true)}
                  className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Landing
                </button>
              ) : null}
              <div className="text-sm text-slate-600">
                Understand your performance with trends, breakdowns, and improvement guidance.
              </div>
              {resultsLoading ? <div className="mt-2 text-xs font-semibold text-slate-500">Loading results...</div> : null}
              {resultsError ? <div className="mt-2 text-xs font-semibold text-rose-600">{resultsError}</div> : null}
            </div>

            <div className="hidden md:flex items-center gap-2 flex-wrap">
              {DESKTOP_TABS.map((t) => (
                <TabButton key={t.key} active={tab === t.key} icon={t.icon} label={t.label} onClick={() => setTab(t.key)} />
              ))}
            </div>
          </div>

          <div className="w-full md:hidden">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={() => setMobileTabsCollapsed((prev) => !prev)}
                className="w-full px-4 py-3 flex items-center justify-between gap-3 bg-slate-50"
              >
                <div className="min-w-0 text-left">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Result Sections</div>
                  <div className="text-sm font-semibold text-slate-900 truncate">{activeMobileTab?.label || "Overview"}</div>
                </div>
                {mobileTabsCollapsed ? <ChevronDown size={18} className="text-slate-500" /> : <ChevronUp size={18} className="text-slate-500" />}
              </button>

              {!mobileTabsCollapsed ? (
                <div className="border-t border-slate-200 p-2">
                  <div className="grid grid-cols-2 gap-2">
                    {MOBILE_TABS.map((t, idx) => {
                      const Icon = t.icon;
                      const active = tab === t.key;
                      const shouldSpanTwo = MOBILE_TABS.length % 2 === 1 && idx === MOBILE_TABS.length - 1;
                      return (
                        <button
                          key={t.key}
                          type="button"
                          onClick={() => handleMobileTabSelect(t.key)}
                          className={[
                            "inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition",
                            shouldSpanTwo ? "col-span-2" : "",
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
              ) : null}
            </div>
          </div>
        </>
      ) : null}

      <div
        className={[
          hideMobilePageHeader ? "mt-0 fixed inset-0 z-40 bg-slate-100 p-4 pb-8 overflow-y-auto" : "mt-5 flex-1 min-h-0 overflow-y-auto md:overflow-visible",
          "md:static md:p-0",
        ].join(" ")}
      >
        {hideMobilePageHeader ? (
          <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-4 border-b border-slate-200 bg-white/95 backdrop-blur">
            <div className="px-4 py-3 flex items-center justify-end gap-3">
              <div className="min-w-0 text-right">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Result Section</div>
                <div className="text-sm font-semibold text-slate-900 truncate">{activeMobileTab?.label}</div>
              </div>
            </div>
          </div>
        ) : null}
        
        <div className="md:mt-0">
          {tab === "overview" ? <Overview /> : null}
          {tab === "semester" ? <SemesterResults /> : null}
          {tab === "trends" ? <Trends /> : null}
          {tab === "insights" ? <Insights /> : null}
          {tab === "transcript" ? <Transcript /> : null}
        </div>
      </div>

      <Drawer
        open={drawerOpen}
        title={selectedCourse ? `${selectedCourse.code} • ${selectedCourse.name}` : "Course Breakdown"}
        onClose={() => setDrawerOpen(false)}
      >
        {!selectedCourse || !breakdown ? (
          <div className="text-sm text-slate-600">No breakdown data yet.</div>
        ) : (
          <div className="space-y-4">
            <Card title="Grade Composition" subtitle="Weights vs achieved score (sample)" icon={BookOpen}>
              <div className="space-y-3">
                {breakdown.composition.map((x) => (
                  <div key={x.k} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-extrabold text-slate-900">{x.k}</div>
                      <Badge tone="indigo">{x.w}%</Badge>
                    </div>
                    <div className="mt-2 text-sm text-slate-700">
                      Score contribution: <b>{x.s}</b>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Comparison" subtitle="Your score vs class baseline (sample)" icon={TrendingUp}>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-sm font-semibold text-slate-800">Your total</div>
                  <Badge tone="indigo">{breakdown.compare.yours}</Badge>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-sm font-semibold text-slate-800">Class average</div>
                  <Badge tone="gray">{breakdown.compare.classAvg}</Badge>
                </div>
              </div>
            </Card>
          </div>
        )}
      </Drawer>
    </div>
  );
}
