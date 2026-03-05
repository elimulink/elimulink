import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "../lib/apiClient";
import { auth } from "../lib/firebase";
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Download,
  Printer,
  GraduationCap,
  BookOpen,
  Info,
  Sparkles,
  Target,
  SlidersHorizontal,
  FileText,
  X,
  ChevronDown,
  ChevronUp,
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
  gpa: 3.52,
  cgpa: 3.31,
  credits: 74,
  standing: "Good Standing",
};
const DEFAULT_SEMESTER_ROWS = [
  { code: "CSC 210", name: "Data Structures", cat: 18, exam: 42, total: 60, grade: "B", credits: 3, remark: "Pass" },
  { code: "MAT 201", name: "Calculus II", cat: 14, exam: 31, total: 45, grade: "C", credits: 3, remark: "Pass" },
  { code: "STA 205", name: "Probability", cat: 11, exam: 28, total: 39, grade: "D", credits: 3, remark: "Repeat" },
  { code: "CSC 220", name: "OOP (Java)", cat: 20, exam: 48, total: 68, grade: "B+", credits: 3, remark: "Pass" },
  { code: "COM 212", name: "Technical Writing", cat: 22, exam: 50, total: 72, grade: "A-", credits: 2, remark: "Pass" },
];

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

export default function ResultsPage() {
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

  const gpaTrend = useMemo(() => [2.9, 3.1, 3.15, 3.22, 3.31, 3.52], []);
  const creditsTrend = useMemo(() => [12, 15, 15, 16, 16, 0], []);
  const gradeDist = useMemo(
    () => ({ A: 6, B: 9, C: 3, D: 1, E: 0 }),
    []
  );

  const [semesterRows, setSemesterRows] = useState(DEFAULT_SEMESTER_ROWS);

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

  function openCourse(row) {
    setSelectedCourse(row);
    setDrawerOpen(true);
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
          <LineChart points={gpaTrend} />
        </Card>

        <Card title="Credits Trend" subtitle="Credits taken per semester (sample)" icon={BarChart3}>
          <div className="space-y-3">
            {creditsTrend.map((c, i) => (
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
        <Card title="Unofficial Transcript" subtitle="Download or print (backend later)" icon={FileText}>
          <div className="space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              Shows all semesters, grades, credits, and CGPA. (PDF generation later)
            </div>
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
        const data = await apiGet(`/api/results/${userId}`);
        if (!active) return;
        const nextSnapshot = {
          ...DEFAULT_SNAPSHOT,
          gpa: Number.isFinite(Number(data?.gpa)) ? Number(data.gpa) : DEFAULT_SNAPSHOT.gpa,
          cgpa: Number.isFinite(Number(data?.cgpa)) ? Number(data.cgpa) : DEFAULT_SNAPSHOT.cgpa,
        };
        setSnapshot(nextSnapshot);
        if (Array.isArray(data?.semester) && data.semester.length > 0) {
          const mapped = data.semester.map((item, idx) => {
            const gradeText = String(item?.grade || "B");
            return {
              code: String(item?.course || `COURSE ${idx + 1}`),
              name: String(item?.course || `Course ${idx + 1}`),
              cat: item?.cat ?? 0,
              exam: item?.exam ?? 0,
              total: item?.total ?? 0,
              grade: gradeText,
              credits: item?.credits ?? 3,
              remark: item?.remark || (gradeText.includes("F") ? "Repeat" : "Pass"),
            };
          });
          setSemesterRows(mapped);
        }
      } catch (error) {
        if (!active) return;
        setResultsError(error?.message || "Failed to load results.");
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

  function handleMobileTabSelect(nextTab) {
    setTab(nextTab);
    setMobileTabsCollapsed(true);
    if (isMobileViewport) {
      setMobileTabFullscreen(true);
      updateResultsHistory(nextTab, true, "push");
    }
  }

  return (
    <div className="w-full bg-slate-100 p-4 md:p-6 h-[100dvh] overflow-hidden flex flex-col md:min-h-[100dvh] md:h-auto md:overflow-visible">
      {!hideMobilePageHeader ? (
        <>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="text-xl font-extrabold text-slate-900">Results</div>
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
