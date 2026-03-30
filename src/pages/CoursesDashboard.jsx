import { useEffect, useMemo, useState } from "react";
import { fetchCoursesSummary } from "../lib/apiClient";
import { auth } from "../lib/firebase";
import CoursesDesktopLanding from "./CoursesDesktopLanding";
import MobileFeatureLandingShell from "../shared/feature-landing/MobileFeatureLandingShell";
import { Archive, BookOpen, Copy, GraduationCap, PenLine, Plus, Rows3, Sparkles, Trash2, TrendingUp, X } from "lucide-react";

function Surface({ className = "", children }) {
  return (
    <div className={`rounded-[24px] border border-white/8 bg-white/[0.04] shadow-[0_18px_40px_rgba(2,8,23,0.18)] md:border-slate-200 md:bg-white md:shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function MetricTile({ title, value, sub, accent = false }) {
  return (
    <div className={`rounded-2xl px-4 py-3 ${accent ? "bg-cyan-400/10 md:bg-sky-50" : "bg-white/[0.03] md:bg-slate-50"}`}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 md:text-slate-500">{title}</div>
      <div className="mt-1 text-2xl font-bold text-white md:text-slate-900">{value}</div>
      {sub ? <div className="mt-1 text-xs text-slate-400 md:text-slate-500">{sub}</div> : null}
    </div>
  );
}

function Tag({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold text-slate-200 md:border-slate-200 md:bg-slate-50 md:text-slate-700">
      {children}
    </span>
  );
}

function SelectField({ label, value, onChange, options, compact = false }) {
  return (
    <label className="block">
      <div className={`text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 md:text-slate-500 ${compact ? "mb-1" : "mb-1.5"}`}>{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={[
          "w-full rounded-2xl border outline-none transition",
          compact
            ? "border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white md:border-slate-200 md:bg-white md:text-slate-800"
            : "border-white/10 bg-white/[0.04] px-4 py-3 text-base text-white md:border-slate-200 md:bg-white md:text-slate-800",
        ].join(" ")}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="text-slate-900">
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TabButton({ active, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className={[
        "rounded-full border px-3 py-2 text-sm font-semibold transition md:px-4",
        active
          ? "border-cyan-400/30 bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-[0_10px_24px_rgba(37,99,235,0.22)]"
          : "border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.06] md:border-slate-200 md:bg-white md:text-slate-700 md:hover:bg-slate-50",
      ].join(" ")}
      type="button"
    >
      {label}
    </button>
  );
}

function LineChart({ points = [], compact = false }) {
  const w = 640;
  const h = compact ? 156 : 210;
  const pad = compact ? 12 : 16;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const x = (i) => pad + (i * (w - pad * 2)) / (Math.max(points.length - 1, 1));
  const y = (v) => {
    const t = (v - min) / (max - min || 1);
    return h - pad - t * (h - pad * 2);
  };
  const line = points.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(2)} ${y(v).toFixed(2)}`).join(" ");
  const area = `M ${x(0)} ${h - pad} ${points.map((v, i) => `L ${x(i)} ${y(v)}`).join(" ")} L ${x(points.length - 1)} ${h - pad} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={compact ? "h-[156px] w-full" : "h-[210px] w-full"}>
      {[0, 1, 2, 3, 4].map((n) => {
        const gy = pad + (n * (h - pad * 2)) / 4;
        return <line key={n} x1={pad} x2={w - pad} y1={gy} y2={gy} stroke="currentColor" strokeOpacity="0.18" strokeWidth="1" className="text-white md:text-slate-400" />;
      })}
      <path d={area} fill="#2563eb" opacity="0.14" />
      <path d={line} fill="none" stroke="#3b82f6" strokeWidth="3" />
    </svg>
  );
}

function ComboTrendChart({ gradePoints = [], attendancePoints = [], compact = false }) {
  const width = 760;
  const height = compact ? 230 : 320;
  const padX = compact ? 28 : 42;
  const padTop = compact ? 20 : 28;
  const padBottom = compact ? 32 : 40;
  const chartHeight = height - padTop - padBottom;
  const count = Math.max(gradePoints.length, attendancePoints.length, 1);
  const step = count > 1 ? (width - padX * 2) / (count - 1) : 0;
  const columns = gradePoints.length ? gradePoints : new Array(count).fill(0);
  const linePoints = attendancePoints.length ? attendancePoints : new Array(count).fill(0);
  const xAt = (index) => padX + step * index;
  const yForPercent = (value) => padTop + chartHeight - (Math.max(0, Math.min(100, value)) / 100) * chartHeight;
  const linePath = linePoints
    .map((value, index) => `${index === 0 ? "M" : "L"} ${xAt(index).toFixed(2)} ${yForPercent(value).toFixed(2)}`)
    .join(" ");
  const areaPath = `${linePath} L ${xAt(linePoints.length - 1).toFixed(2)} ${(height - padBottom).toFixed(2)} L ${xAt(0).toFixed(2)} ${(height - padBottom).toFixed(2)} Z`;
  const yTicks = [0, 25, 50, 75, 100];

  return (
    <div className={compact ? "w-full" : "w-full"}>
      <svg viewBox={`0 0 ${width} ${height}`} className={compact ? "h-[230px] w-full" : "h-[320px] w-full"}>
        <defs>
          <linearGradient id={`course-bars-${compact ? "compact" : "desktop"}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.45" />
          </linearGradient>
          <linearGradient id={`course-area-${compact ? "compact" : "desktop"}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {yTicks.map((tick) => {
          const y = yForPercent(tick);
          return (
            <g key={tick}>
              <line x1={padX} x2={width - padX} y1={y} y2={y} stroke="currentColor" strokeOpacity="0.12" strokeWidth="1" className="text-white md:text-slate-400" />
              <text x={padX - 10} y={y + 4} textAnchor="end" className="fill-slate-400 text-[12px] md:fill-slate-500">
                {tick}
              </text>
            </g>
          );
        })}

        {columns.map((value, index) => {
          const barWidth = compact ? 34 : 42;
          const x = xAt(index) - barWidth / 2;
          const y = yForPercent(value);
          return (
            <rect
              key={`bar-${index}`}
              x={x}
              y={y}
              width={barWidth}
              height={height - padBottom - y}
              rx="12"
              fill={`url(#course-bars-${compact ? "compact" : "desktop"})`}
              opacity="0.95"
            />
          );
        })}

        <path d={areaPath} fill={`url(#course-area-${compact ? "compact" : "desktop"})`} />
        <path d={linePath} fill="none" stroke="#22d3ee" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />

        {linePoints.map((value, index) => (
          <circle key={`pt-${index}`} cx={xAt(index)} cy={yForPercent(value)} r="4.5" fill="#06111f" stroke="#67e8f9" strokeWidth="2" />
        ))}

        {new Array(count).fill(null).map((_, index) => (
          <text
            key={`label-${index}`}
            x={xAt(index)}
            y={height - 10}
            textAnchor="middle"
            className="fill-slate-400 text-[12px] md:fill-slate-500"
          >
            {`W${index + 1}`}
          </text>
        ))}
      </svg>
    </div>
  );
}

function DonutChart({ segments = [], centerLabel = "", centerValue = "" }) {
  const size = 220;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let offsetAccumulator = 0;

  return (
    <div className="flex items-center gap-5">
      <div className="relative h-[220px] w-[220px] shrink-0">
        <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth={strokeWidth} className="text-white md:text-slate-300" />
          {segments.map((segment) => {
            const dash = (segment.value / 100) * circumference;
            const dashArray = `${dash} ${circumference - dash}`;
            const dashOffset = -offsetAccumulator;
            offsetAccumulator += dash;
            return (
              <circle
                key={segment.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth={strokeWidth}
                strokeDasharray={dashArray}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 md:text-slate-500">{centerLabel}</div>
          <div className="mt-1 text-3xl font-semibold text-white md:text-slate-950">{centerValue}</div>
        </div>
      </div>
      <div className="space-y-3">
        {segments.map((segment) => (
          <div key={segment.label} className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: segment.color }} />
            <span className="text-sm text-slate-200 md:text-slate-700">{segment.label}</span>
            <span className="text-sm font-semibold text-white md:text-slate-950">{segment.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HorizontalComparisonChart({ items = [] }) {
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="text-slate-200 md:text-slate-700">{item.label}</span>
            <span className="font-semibold text-white md:text-slate-950">{item.value}%</span>
          </div>
          <div className="h-3 rounded-full bg-white/8 md:bg-slate-200">
            <div
              className="h-3 rounded-full"
              style={{
                width: `${item.value}%`,
                background: item.color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function Bars({ values }) {
  return (
    <div className="flex h-[150px] items-end gap-2 md:h-[180px]">
      {values.map((value, index) => (
        <div key={index} className="flex-1 rounded-lg bg-white/15 md:bg-slate-200" style={{ height: `${Math.max(8, (value / 100) * 180)}px` }} />
      ))}
    </div>
  );
}

function InsightItem({ title, body }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 md:border-slate-200 md:bg-slate-50">
      <div className="text-base font-semibold text-white md:text-slate-900">{title}</div>
      <div className="mt-1.5 text-sm leading-6 text-slate-300 md:text-slate-600">{body}</div>
    </div>
  );
}

function InsightsPanel({ open, onToggle, items }) {
  return (
    <Surface className="overflow-hidden lg:sticky lg:top-4">
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-4 md:border-slate-200 md:bg-slate-50">
        <div className="text-lg font-semibold text-white md:text-slate-800">Smart Insights</div>
        <button
          onClick={onToggle}
          className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-200 md:border-slate-200 md:bg-white md:text-slate-700"
          type="button"
        >
          {open ? "Hide" : "Show"}
        </button>
      </div>
      {open ? (
        <div className="space-y-3 p-4">
          {items.map((item) => (
            <InsightItem key={item.title} title={item.title} body={item.body} />
          ))}
          <button className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-3 text-sm font-semibold text-white">
            Ask AI about this course
          </button>
        </div>
      ) : (
        <div className="p-4 text-sm text-slate-400 md:text-slate-500">Insights collapsed.</div>
      )}
    </Surface>
  );
}

export default function CoursesDashboard({ onBack, onOpenMainMenu, audience = "institution" }) {
  const isStudentAudience = audience === "student";
  const COURSES_MOBILE_VIEW_KEY = "coursesMobileView";
  const COURSES_DESKTOP_VIEW_KEY = "coursesDesktopView";

  function resolveBackendUserId() {
    const uid = String(auth?.currentUser?.uid || "");
    const digits = uid.match(/\d+/g)?.join("") || "";
    const numeric = Number.parseInt(digits, 10);
    if (Number.isFinite(numeric) && numeric > 0) return numeric;
    return 1;
  }

  const [tab, setTab] = useState("personal");
  const [course, setCourse] = useState("");
  const [semester, setSemester] = useState("2025_s2");
  const [dateRange, setDateRange] = useState("semester");
  const [assessmentType, setAssessmentType] = useState("all");
  const [cohort, setCohort] = useState("year2");
  const [targetRole, setTargetRole] = useState("backend");
  const [skillLevel, setSkillLevel] = useState("intermediate");
  const [insightsOpen, setInsightsOpen] = useState(true);
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 767px)").matches : false
  );
  const [showDesktopLanding, setShowDesktopLanding] = useState(
    () => !(typeof window !== "undefined" ? window.matchMedia("(max-width: 767px)").matches : false)
  );
  const [showMobileLanding, setShowMobileLanding] = useState(
    () => typeof window !== "undefined" ? window.matchMedia("(max-width: 767px)").matches : false
  );
  const [activeDesktopSection, setActiveDesktopSection] = useState("trends");
  const [isDesktopSectionMenuOpen, setIsDesktopSectionMenuOpen] = useState(false);
  const [activeMobileSection, setActiveMobileSection] = useState("trends");
  const [isMobileSectionMenuOpen, setIsMobileSectionMenuOpen] = useState(false);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [coursesError, setCoursesError] = useState("");
  const [coursesSummary, setCoursesSummary] = useState(null);
  const [landingInputValue, setLandingInputValue] = useState("");
  const [isLandingMenuOpen, setIsLandingMenuOpen] = useState(false);
  const [isLandingShareOpen, setIsLandingShareOpen] = useState(false);
  const [isLandingSettingsOpen, setIsLandingSettingsOpen] = useState(false);
  const [isLandingUtilityMenuOpen, setIsLandingUtilityMenuOpen] = useState(false);
  const [landingShareInvite, setLandingShareInvite] = useState("");
  const [landingShareAccess, setLandingShareAccess] = useState("institution only");
  const [landingShareStatus, setLandingShareStatus] = useState("");
  const [landingWorkspaceStatus, setLandingWorkspaceStatus] = useState("");
  const [landingDeleteOpen, setLandingDeleteOpen] = useState(false);
  const [landingWorkspaceSettings, setLandingWorkspaceSettings] = useState({
    name: "Courses Workspace",
    description: "Review course analytics, attendance patterns, and guided next steps from a calm desktop entry point.",
    linkedInstitution: isStudentAudience ? "Your study workspace" : "ElimuLink University",
    defaultView: "personal analysis",
    semesterLabel: "2025 Sem 2",
    focus: "course dashboard",
    insightsMode: "smart insights",
  });

  const courses = useMemo(() => {
    const rows = Array.isArray(coursesSummary?.courses) ? coursesSummary.courses : [];
    return rows.map((item) => ({
      value: String(item.code || "").toLowerCase(),
      label: `${item.code}: ${item.name}`,
      code: item.code,
      name: item.name,
      term: item.term,
    }));
  }, [coursesSummary]);

  const selectedCourseLabel = useMemo(
    () => courses.find((item) => item.value === course)?.label || "Selected course",
    [course, courses]
  );

  const landingOverviewMetrics = useMemo(
    () => [
      { label: "Registered Units", value: String(coursesSummary?.overview?.registered_units ?? 0), sub: "Current backend source" },
      { label: "Materials", value: String(coursesSummary?.overview?.materials_count ?? 0), sub: "Available units" },
      { label: "Terms Tracked", value: String(coursesSummary?.overview?.terms_tracked ?? 0), sub: coursesSummary?.overview?.active_term || "Current term" },
      { label: "Status", value: String(coursesSummary?.overview?.status || "Active"), sub: "Academic record status" },
    ],
    [coursesSummary]
  );

  const landingPlanItems = useMemo(
    () => [
      { title: "Materials focus", body: `${coursesSummary?.materials?.length || 0} course material entries are available from the current backend course source.` },
      { title: "Registered units context", body: `${coursesSummary?.registered_units?.length || 0} registered units are currently linked to this learner profile.` },
      { title: "Next step", body: selectedCourseLabel !== "Selected course" ? `Use ${selectedCourseLabel} as the active course context before switching to deeper analysis.` : "Select a course to anchor the dashboard context." },
    ],
    [coursesSummary, selectedCourseLabel]
  );

  const trendSeries = useMemo(() => {
    const map = {
      all: {
        grades: [58, 64, 68, 72, 76, 79],
        attendance: [71, 74, 78, 76, 82, 86],
        distribution: [
          { label: "Exam", value: 40, color: "#8b5cf6" },
          { label: "CAT", value: 30, color: "#3b82f6" },
          { label: "Lab", value: 18, color: "#14b8a6" },
          { label: "Participation", value: 12, color: "#f59e0b" },
        ],
        comparisons: [
          { label: "Attendance", value: 86, color: "linear-gradient(90deg,#22d3ee,#06b6d4)" },
          { label: "Assignment completion", value: 74, color: "linear-gradient(90deg,#60a5fa,#2563eb)" },
          { label: "Quiz accuracy", value: 69, color: "linear-gradient(90deg,#a78bfa,#7c3aed)" },
        ],
      },
      cat: {
        grades: [50, 56, 61, 66, 71, 75],
        attendance: [69, 72, 75, 73, 78, 81],
        distribution: [
          { label: "CAT 1", value: 34, color: "#8b5cf6" },
          { label: "CAT 2", value: 28, color: "#3b82f6" },
          { label: "CAT 3", value: 22, color: "#14b8a6" },
          { label: "Oral", value: 16, color: "#f59e0b" },
        ],
        comparisons: [
          { label: "CAT readiness", value: 75, color: "linear-gradient(90deg,#22d3ee,#06b6d4)" },
          { label: "Revision consistency", value: 68, color: "linear-gradient(90deg,#60a5fa,#2563eb)" },
          { label: "Question accuracy", value: 71, color: "linear-gradient(90deg,#a78bfa,#7c3aed)" },
        ],
      },
      exam: {
        grades: [55, 59, 63, 70, 74, 82],
        attendance: [72, 73, 76, 79, 83, 88],
        distribution: [
          { label: "Theory", value: 46, color: "#8b5cf6" },
          { label: "Problem solving", value: 24, color: "#3b82f6" },
          { label: "Revision", value: 20, color: "#14b8a6" },
          { label: "Recall gaps", value: 10, color: "#f59e0b" },
        ],
        comparisons: [
          { label: "Exam confidence", value: 82, color: "linear-gradient(90deg,#22d3ee,#06b6d4)" },
          { label: "Coverage", value: 77, color: "linear-gradient(90deg,#60a5fa,#2563eb)" },
          { label: "Past-paper strength", value: 72, color: "linear-gradient(90deg,#a78bfa,#7c3aed)" },
        ],
      },
      lab: {
        grades: [61, 65, 67, 71, 76, 80],
        attendance: [76, 78, 81, 84, 88, 91],
        distribution: [
          { label: "Lab tasks", value: 44, color: "#8b5cf6" },
          { label: "Project work", value: 26, color: "#3b82f6" },
          { label: "Debugging", value: 18, color: "#14b8a6" },
          { label: "Collaboration", value: 12, color: "#f59e0b" },
        ],
        comparisons: [
          { label: "Lab attendance", value: 91, color: "linear-gradient(90deg,#22d3ee,#06b6d4)" },
          { label: "Hands-on output", value: 80, color: "linear-gradient(90deg,#60a5fa,#2563eb)" },
          { label: "Debugging fluency", value: 73, color: "linear-gradient(90deg,#a78bfa,#7c3aed)" },
        ],
      },
    };
    return map[assessmentType] || map.all;
  }, [assessmentType]);

  const desktopInsights = useMemo(() => {
    if (activeDesktopSection === "trends" || activeDesktopSection === "plan") {
      return [
        { title: "This week focus", body: "Revise Trees + Hashing and complete one lab revision set." },
        { title: "Why your grade dropped", body: "Attendance dipped during CAT week and late submissions impacted score." },
        { title: "Next best action", body: "Do 8 tree problems and attend the next discussion section." },
      ];
    }
    if (activeDesktopSection === "units" || activeDesktopSection === "materials" || activeDesktopSection === "insights") {
      return [
        { title: "Cohort signal", body: "Concepts students struggle with: Trees, Recursion, and Hashing." },
        { title: "Assessment impact", body: "Exams currently drive pass or fail more than CAT or Lab in this cohort." },
      ];
    }
    return [
      { title: "Career move", body: "Build a portfolio project with API plus data structures to increase role alignment." },
      { title: "Prerequisite graph", body: "Master recursion and hashing before advanced system design topics." },
      { title: "Internship relevance", body: "Data structures plus debugging are top tags in internship postings." },
    ];
  }, [activeDesktopSection]);

  const desktopSectionItems = useMemo(
    () => [
      { key: "trends", label: "Trends" },
      { key: "plan", label: "Plan" },
      { key: "units", label: "Units" },
      { key: "materials", label: "Materials" },
      { key: "insights", label: "Insights" },
      { key: "career", label: "Career" },
    ],
    []
  );

  const mobileSectionItems = useMemo(
    () => [
      { key: "trends", label: "Trends", icon: TrendingUp },
      { key: "plan", label: "Plan", icon: Sparkles },
      { key: "units", label: "Units", icon: Rows3 },
      { key: "materials", label: "Materials", icon: GraduationCap },
      { key: "insights", label: "Insights", icon: BookOpen },
      { key: "career", label: "Career", icon: BookOpen },
    ],
    []
  );

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
    if (isMobileViewport) {
      setShowDesktopLanding(false);
    } else {
      setShowMobileLanding(false);
    }
  }, [isMobileViewport]);

  useEffect(() => {
    if (typeof window === "undefined" || !isMobileViewport) return undefined;

    const currentState = window.history.state || {};
    if (showMobileLanding) {
      if (currentState?.[COURSES_MOBILE_VIEW_KEY] === "dashboard") {
        const nextState = { ...currentState };
        delete nextState[COURSES_MOBILE_VIEW_KEY];
        window.history.replaceState(nextState, "", window.location.href);
      }
      return undefined;
    }

    if (currentState?.[COURSES_MOBILE_VIEW_KEY] !== "dashboard") {
      window.history.pushState(
        { ...currentState, [COURSES_MOBILE_VIEW_KEY]: "dashboard" },
        "",
        window.location.href
      );
    }

    return undefined;
  }, [isMobileViewport, showMobileLanding]);

  useEffect(() => {
    if (typeof window === "undefined" || isMobileViewport) return undefined;

    const currentState = window.history.state || {};
    if (showDesktopLanding) {
      if (currentState?.[COURSES_DESKTOP_VIEW_KEY] === "dashboard") {
        const nextState = { ...currentState };
        delete nextState[COURSES_DESKTOP_VIEW_KEY];
        window.history.replaceState(nextState, "", window.location.href);
      }
      return undefined;
    }

    if (currentState?.[COURSES_DESKTOP_VIEW_KEY] !== "dashboard") {
      window.history.pushState(
        { ...currentState, [COURSES_DESKTOP_VIEW_KEY]: "dashboard" },
        "",
        window.location.href
      );
    }

    return undefined;
  }, [isMobileViewport, showDesktopLanding]);

  useEffect(() => {
    if (typeof window === "undefined" || !isMobileViewport) return undefined;

    const handlePopState = () => {
      setShowMobileLanding(true);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isMobileViewport]);

  useEffect(() => {
    if (typeof window === "undefined" || isMobileViewport) return undefined;

    const handlePopState = (event) => {
      const nextState = event?.state || window.history.state || {};
      setShowDesktopLanding(nextState?.[COURSES_DESKTOP_VIEW_KEY] !== "dashboard");
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isMobileViewport]);

  useEffect(() => {
    let active = true;

    async function loadCourses() {
      setCoursesLoading(true);
      setCoursesError("");
      try {
        const data = await fetchCoursesSummary(resolveBackendUserId());
        if (!active) return;
        setCoursesSummary(data);
        const nextCourses = Array.isArray(data?.courses) ? data.courses : [];
        if (nextCourses.length > 0) {
          setCourse((prev) => prev || String(nextCourses[0].code || "").toLowerCase());
        }
        if (data?.overview?.active_term) {
          setLandingWorkspaceSettings((prev) => ({ ...prev, semesterLabel: data.overview.active_term }));
        }
      } catch (error) {
        if (!active) return;
        setCoursesSummary({ courses: [], overview: null, materials: [], registered_units: [] });
        setCoursesError(error?.message || "Failed to load courses.");
      } finally {
        if (active) setCoursesLoading(false);
      }
    }

    loadCourses();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (
        event.target?.closest?.("[data-courses-landing-menu]") ||
        event.target?.closest?.("[data-courses-utility-menu]")
      ) {
        return;
      }
      setIsLandingMenuOpen(false);
      setIsLandingUtilityMenuOpen(false);
    };

    const handleKeyDown = (event) => {
      if (event.key !== "Escape") return;
      setIsLandingMenuOpen(false);
      setIsLandingUtilityMenuOpen(false);
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

  function renameCoursesWorkspace() {
    const nextName = window.prompt("Rename courses workspace", landingWorkspaceSettings.name);
    if (!nextName) return;
    const normalized = nextName.trim();
    if (!normalized) return;
    setLandingWorkspaceSettings((prev) => ({ ...prev, name: normalized }));
    setLandingWorkspaceStatus("Courses workspace renamed.");
  }

  function moveCoursesWorkspace() {
    setLandingWorkspaceStatus("Move to workspace is prepared here as a safe frontend-first Courses action.");
  }

  function archiveCoursesWorkspace() {
    setLandingWorkspaceStatus("Archive is prepared here as a safe frontend-first Courses action.");
  }

  function openMobileDashboard() {
    setShowMobileLanding(false);
  }

  function openDesktopDashboard() {
    setShowDesktopLanding(false);
  }

  function openMobileSection(sectionKey) {
    setActiveMobileSection(sectionKey);
    setIsMobileSectionMenuOpen(false);
    setShowMobileLanding(false);
  }

  if (!isMobileViewport && showDesktopLanding) {
    return (
      <CoursesDesktopLanding
        isLandingMenuOpen={isLandingMenuOpen}
        setIsLandingMenuOpen={setIsLandingMenuOpen}
        isLandingShareOpen={isLandingShareOpen}
        setIsLandingShareOpen={setIsLandingShareOpen}
        isLandingSettingsOpen={isLandingSettingsOpen}
        setIsLandingSettingsOpen={setIsLandingSettingsOpen}
        isLandingUtilityMenuOpen={isLandingUtilityMenuOpen}
        setIsLandingUtilityMenuOpen={setIsLandingUtilityMenuOpen}
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
        selectedCourseLabel={selectedCourseLabel}
        overviewMetrics={landingOverviewMetrics}
        planItems={landingPlanItems}
        onOpenDashboard={openDesktopDashboard}
        onOpenMainMenu={onOpenMainMenu}
        onQuickMaterials={() => {
          setLandingWorkspaceStatus(`${coursesSummary?.materials?.length || 0} course material entries are available from the backend course source.`);
        }}
        onQuickRegisteredUnits={() => {
          setLandingWorkspaceStatus(`${coursesSummary?.registered_units?.length || 0} registered units are available from the backend course source.`);
        }}
        onQuickTemplates={() => {
          setLandingWorkspaceStatus("Templates is prepared here as a safe frontend-first Courses shortcut.");
        }}
        onQuickSubgroup={() => {
          setLandingWorkspaceStatus("Subgroup routing is prepared here as a safe frontend-first Courses shortcut.");
        }}
        onRenameWorkspace={renameCoursesWorkspace}
        onMoveWorkspace={moveCoursesWorkspace}
        onArchiveWorkspace={archiveCoursesWorkspace}
      />
    );
  }

  if (isMobileViewport && showMobileLanding) {
    return (
      <MobileFeatureLandingShell
        featureName="Courses"
        featureSubtitle="Course analytics and study direction"
        featureDescription={isStudentAudience ? "Review your course progress, jump into materials or units, and open a focused study section only when you need more detail." : "Review course health, jump into materials or units, and enter the full dashboard only when you need deeper analysis."}
        featureIcon={BookOpen}
        featureStyle="soft"
        workspaceLabel={landingWorkspaceSettings.name}
        workspaceHint={landingWorkspaceSettings.description}
        workspaceBadge={isStudentAudience ? "Student workspace" : "Institution workspace"}
        hideInstitutionStrip
        quickActions={[
          { key: "dashboard", label: "Trends", icon: TrendingUp, onClick: () => openMobileSection("trends") },
          { key: "materials", label: "Materials", icon: GraduationCap, onClick: () => openMobileSection("materials") },
          { key: "units", label: "Registered units", icon: Rows3, onClick: () => openMobileSection("units") },
          { key: "insights", label: "Insights", icon: Sparkles, onClick: () => openMobileSection("insights") },
        ]}
        quickActionsStyle="rows"
        utilityActions={[
          { key: "rename-workspace", label: "Rename workspace", icon: PenLine, onClick: renameCoursesWorkspace },
          { key: "move-workspace", label: "Move workspace", icon: Rows3, onClick: moveCoursesWorkspace },
          { key: "archive-workspace", label: "Archive workspace", icon: Archive, onClick: archiveCoursesWorkspace },
          {
            key: "delete-workspace",
            label: "Delete workspace",
            icon: Trash2,
            destructive: true,
            onClick: () => {
              setLandingWorkspaceStatus("Delete stays protected in the full Courses workspace.");
              openMobileSection("trends");
            },
          },
        ]}
        shareConfig={{
          title: "Share Courses",
          description: "Invite someone into the courses workspace with a clean mobile share flow.",
          emailLabel: "Invite by email",
          emailPlaceholder: "mentor@example.com",
          accessLabel: "Access level",
          accessOptions: [
            { value: "institution only", label: isStudentAudience ? "Private" : "Institution only" },
            { value: "members can view", label: "Members can view" },
            { value: "members can contribute", label: "Members can contribute" },
          ],
          defaultAccess: landingShareAccess,
          membersTitle: "Workspace owner",
          members: [{ key: "owner", label: "Courses workspace", role: "Owner" }],
          privacyNote: "Course sharing stays frontend-first here, but the mobile share interaction is now standardized.",
          submitLabel: "Save share setup",
        }}
        items={landingPlanItems.map((item, index) => ({
          id: item.title,
          title: item.title,
          preview: item.body,
          meta: index === 0 ? "Focus" : index === 1 ? "Context" : "Next step",
          actions: [
            { key: "share", label: "Share", icon: Copy, onClick: () => setLandingShareStatus(`Sharing for "${item.title}" is prepared here as a safe frontend-first action.`) },
            { key: "open", label: "Open", icon: BookOpen, onClick: () => openMobileSection("trends") },
          ],
        }))}
        listStyle="plain"
        inputPlaceholder="Add course focus"
        inputValue={landingInputValue}
        onInputChange={setLandingInputValue}
        onInputSubmit={(value) => {
          setLandingWorkspaceStatus(`Saved "${value}" as the next course focus.`);
          openMobileSection("plan");
          setLandingInputValue("");
        }}
        onMenu={onOpenMainMenu || onBack || openMobileDashboard}
        onShare={() => {
          setLandingShareStatus("Share is prepared here as a safe frontend-first Courses action.");
          openMobileDashboard();
        }}
        onShareSubmit={async ({ email, access }) => {
          setLandingShareInvite(email);
          setLandingShareAccess(access);
          setLandingShareStatus(email ? `Courses sharing prepared for ${email}.` : `Courses access saved as ${access}.`);
          return { status: email ? `Courses sharing prepared for ${email}.` : `Courses access saved as ${access}.` };
        }}
        onSettings={() => {
          setInsightsOpen(true);
          openMobileSection("insights");
        }}
        onNewWork={() => openMobileSection("plan")}
        onStartCall={() => openMobileSection("insights")}
        onOpenItem={() => openMobileSection("trends")}
        emptyStateTitle="No course direction yet"
        emptyState="Your course guidance and selected dashboard context will appear here."
      />
    );
  }

  if (isMobileViewport) {
    return (
      <div className="relative min-h-[100dvh] overflow-x-hidden bg-[radial-gradient(circle_at_top,#162846_0%,#10192f_58%,#0b1220_100%)] px-5 pb-28 pt-5 text-white">
        <div className="space-y-5">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Courses</div>
            <div className="mt-2 text-[30px] font-semibold leading-[1.08] text-white">
              {activeMobileSection === "trends" ? "Grade & Attendance Trends" : null}
              {activeMobileSection === "plan" ? "Strengths, Weaknesses & Plan" : null}
              {activeMobileSection === "units" ? "Registered Units" : null}
              {activeMobileSection === "materials" ? "Materials" : null}
              {activeMobileSection === "insights" ? "Insights" : null}
              {activeMobileSection === "career" ? "Career Advantage" : null}
            </div>
            <div className="mt-2 max-w-[34ch] text-[15px] leading-7 text-slate-300">
              {activeMobileSection === "trends" ? "A clean performance view with your main graph and assessment filter." : null}
              {activeMobileSection === "plan" ? "Keep strengths, areas that need work, and your next actions in one focused place." : null}
              {activeMobileSection === "units" ? "Review the registered units context without dashboard clutter." : null}
              {activeMobileSection === "materials" ? "See the current material status from the backend source in one simple place." : null}
              {activeMobileSection === "insights" ? "Read your course insights without the rest of the dashboard competing for attention." : null}
              {activeMobileSection === "career" ? "Focus on role alignment, prerequisites, and portfolio outputs." : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <SelectField
              compact
              label="Semester"
              value={semester}
              onChange={setSemester}
              options={[
                { value: "2025_s1", label: "Sem 1" },
                { value: "2025_s2", label: "Sem 2" },
              ]}
            />
            <SelectField
              compact
              label="Date range"
              value={dateRange}
              onChange={setDateRange}
              options={[
                { value: "4w", label: "Last 4 weeks" },
                { value: "semester", label: "Semester" },
                { value: "custom", label: "Custom" },
              ]}
            />
          </div>

          {coursesLoading ? <div className="text-sm font-medium text-slate-400">Loading courses...</div> : null}
          {coursesError ? <div className="text-sm font-medium text-rose-300">{coursesError}</div> : null}

          {activeMobileSection === "trends" ? (
            <div className="space-y-5">
              <div className="max-w-[9rem]">
                <SelectField
                  label="Assessment"
                  compact
                  value={assessmentType}
                  onChange={setAssessmentType}
                  options={[
                    { value: "all", label: "All" },
                    { value: "cat", label: "CAT" },
                    { value: "exam", label: "Exam" },
                    { value: "lab", label: "Lab" },
                  ]}
                />
              </div>
              <div className="space-y-4 pt-1">
                <div>
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Performance overview</div>
                  <ComboTrendChart compact gradePoints={trendSeries.grades} attendancePoints={trendSeries.attendance} />
                </div>
                <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
                  <div>
                    <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Assessment mix</div>
                    <DonutChart segments={trendSeries.distribution} centerLabel="Focus" centerValue={assessmentType === "all" ? "Mixed" : assessmentType.toUpperCase()} />
                  </div>
                  <div>
                    <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Key comparisons</div>
                    <HorizontalComparisonChart items={trendSeries.comparisons} />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Registered units</div>
                  <div className="mt-2 text-4xl font-semibold text-white">{String(coursesSummary?.overview?.registered_units ?? 0)}</div>
                  <div className="mt-1 text-sm text-slate-400">{coursesSummary?.overview?.active_term || "Current term"}</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Status</div>
                  <div className="mt-2 text-4xl font-semibold text-white">{String(coursesSummary?.overview?.status || "Active")}</div>
                  <div className="mt-1 text-sm text-slate-400">Academic record</div>
                </div>
              </div>
            </div>
          ) : null}

          {activeMobileSection === "plan" ? (
            <div className="space-y-6">
              <div>
                <div className="text-sm font-semibold text-white">Strengths</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Tag>Arrays</Tag>
                  <Tag>Big-O basics</Tag>
                  <Tag>Stacks</Tag>
                </div>
              </div>
              <div>
                <div className="text-sm font-semibold text-white">Needs work</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Tag>Trees</Tag>
                  <Tag>Hashing</Tag>
                  <Tag>Graph traversal</Tag>
                </div>
              </div>
              <div>
                <div className="text-sm font-semibold text-white">Plan</div>
                <div className="mt-3 space-y-3 text-[16px] leading-7 text-slate-200">
                  <div>Revise Trees 30 mins/day</div>
                  <div>Solve 10 hashing problems</div>
                  <div>Attend next lab session</div>
                </div>
              </div>
            </div>
          ) : null}

          {activeMobileSection === "units" ? (
            <div className="space-y-5">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Registered now</div>
                <div className="mt-2 text-5xl font-semibold text-white">{String(coursesSummary?.overview?.registered_units ?? 0)}</div>
              </div>
              <div className="text-[15px] leading-7 text-slate-300">
                {coursesSummary?.registered_units?.length
                  ? coursesSummary.registered_units.map((unit) => unit.code || unit.name || String(unit)).join(", ")
                  : "No registered units are currently linked to this learner profile."}
              </div>
            </div>
          ) : null}

          {activeMobileSection === "materials" ? (
            <div className="space-y-5">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Materials available</div>
                <div className="mt-2 text-5xl font-semibold text-white">{String(coursesSummary?.overview?.materials_count ?? 0)}</div>
              </div>
              <div className="text-[15px] leading-7 text-slate-300">
                {coursesSummary?.materials?.length
                  ? coursesSummary.materials.map((item) => item.title || item.name || item.code || "Course material").join(", ")
                  : "No course material entries are available from the current backend course source."}
              </div>
            </div>
          ) : null}

          {activeMobileSection === "insights" ? (
            <div className="space-y-5">
              {insights.map((item) => (
                <div key={item.title}>
                  <div className="text-sm font-semibold text-white">{item.title}</div>
                  <div className="mt-2 text-[15px] leading-7 text-slate-300">{item.body}</div>
                </div>
              ))}
            </div>
          ) : null}

          {activeMobileSection === "career" ? (
            <div className="space-y-5">
              <div>
                <div className="text-sm font-semibold text-white">Prerequisite graph</div>
                <div className="mt-2 text-[15px] leading-7 text-slate-300">
                  Arrays / Stacks {"->"} Trees / Hashing {"->"} Graphs {"->"} System Design Foundations
                </div>
              </div>
              <div>
                <div className="text-sm font-semibold text-white">Internship relevance</div>
                <div className="mt-2 text-[15px] leading-7 text-slate-300">
                  High relevance for backend internships requiring data structures, APIs, testing, and debugging.
                </div>
              </div>
              <div>
                <div className="text-sm font-semibold text-white">Portfolio outputs</div>
                <div className="mt-2 space-y-3 text-[15px] leading-7 text-slate-300">
                  <div>Build Library Management API (8 to 10 hrs)</div>
                  <div>Create DSA Practice Tracker dashboard (6 to 8 hrs)</div>
                  <div>Publish README, tests, and demo screenshots</div>
                </div>
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
    <div className="min-h-[100dvh] overflow-x-hidden bg-white p-6 text-slate-900 dark:bg-[#10192f] dark:text-slate-50">
      <div className="mx-auto max-w-[1380px] pb-28">
        <div className="border-b border-slate-200 pb-8 dark:border-white/10">
          <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.2fr)_minmax(420px,0.8fr)] xl:items-end">
            <div className="space-y-5">
              <div className="space-y-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">Courses Workspace</div>
                <div className="text-[36px] font-semibold leading-[1.02] tracking-[-0.03em] text-slate-950 dark:text-slate-50">
                  Clean course analysis for faster academic review
                </div>
                <div className="max-w-3xl text-[16px] leading-8 text-slate-800 dark:text-slate-200">
                  Keep the selected course, semester context, and key academic signals in one modern header before moving into deeper section views.
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 xl:grid-cols-4">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">Selected course</div>
                  <div className="mt-2 text-lg font-semibold text-slate-950 dark:text-slate-50">{selectedCourseLabel !== "Selected course" ? selectedCourseLabel : "No course selected"}</div>
                  <div className="mt-1 text-sm text-slate-700 dark:text-slate-200">Current analysis scope</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">Registered units</div>
                  <div className="mt-2 text-3xl font-semibold text-slate-950 dark:text-slate-50">{String(coursesSummary?.overview?.registered_units ?? 0)}</div>
                  <div className="mt-1 text-sm text-slate-700 dark:text-slate-200">{coursesSummary?.overview?.active_term || "Current term"}</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">Materials</div>
                  <div className="mt-2 text-3xl font-semibold text-slate-950 dark:text-slate-50">{String(coursesSummary?.overview?.materials_count ?? 0)}</div>
                  <div className="mt-1 text-sm text-slate-700 dark:text-slate-200">Current backend source</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">Status</div>
                  <div className="mt-2 text-3xl font-semibold text-slate-950 dark:text-slate-50">{String(coursesSummary?.overview?.status || "Active")}</div>
                  <div className="mt-1 text-sm text-slate-700 dark:text-slate-200">Academic record</div>
                </div>
              </div>
            </div>

            <div className="space-y-4 xl:pl-6">
              <SelectField label="Course" value={course} onChange={setCourse} options={courses} />
              {coursesLoading ? <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">Loading courses...</div> : null}
              {coursesError ? <div className="text-xs font-semibold text-rose-600">{coursesError}</div> : null}
              <div className="grid grid-cols-2 gap-3">
                <SelectField
                  label="Semester"
                  compact
                  value={semester}
                  onChange={setSemester}
                  options={[
                    { value: "2025_s1", label: "Sem 1" },
                    { value: "2025_s2", label: "Sem 2" },
                  ]}
                />
                <SelectField
                  label="Date range"
                  compact
                  value={dateRange}
                  onChange={setDateRange}
                  options={[
                    { value: "4w", label: "Last 4 weeks" },
                    { value: "semester", label: "Semester" },
                    { value: "custom", label: "Custom" },
                  ]}
                />
              </div>
              <div className="flex items-center gap-3 pt-1">
                <button className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100">
                  Export
                </button>
                <button className="rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-2 text-sm font-semibold text-white">
                  Ask AI
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-10">
          <div className="max-w-4xl border-b border-slate-200 pb-7">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-800">Courses Section</div>
            <div className="mt-3 text-[42px] font-semibold leading-[1.02] tracking-[-0.04em] text-slate-950">
              {activeDesktopSection === "trends" ? "Grade & Attendance Trends" : null}
              {activeDesktopSection === "plan" ? "Strengths, Weaknesses & Plan" : null}
              {activeDesktopSection === "units" ? "Registered Units" : null}
              {activeDesktopSection === "materials" ? "Materials" : null}
              {activeDesktopSection === "insights" ? "Insights" : null}
              {activeDesktopSection === "career" ? "Career Advantage" : null}
            </div>
            <div className="mt-4 max-w-3xl text-[18px] leading-8 text-slate-800 dark:text-slate-200">
              {activeDesktopSection === "trends" ? "A clean desktop performance view with the main graph and assessment filter kept in one place." : null}
              {activeDesktopSection === "plan" ? "Keep strengths, weaker areas, and next study actions in one calm study plan view." : null}
              {activeDesktopSection === "units" ? "Review your registered units without the old crowded dashboard stack." : null}
              {activeDesktopSection === "materials" ? "See material availability from the current backend source in a simpler workspace." : null}
              {activeDesktopSection === "insights" ? "Read the important signals and cohort context without multiple boxes competing for attention." : null}
              {activeDesktopSection === "career" ? "Focus on role alignment, skill path, and portfolio outputs in one desktop section." : null}
            </div>
          </div>

          {activeDesktopSection === "trends" ? (
            <div className="mt-10 space-y-8">
              <div className="grid grid-cols-2 gap-6 xl:grid-cols-4">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">Registered Units</div>
                  <div className="mt-2 text-3xl font-semibold text-slate-950 dark:text-slate-50">{String(coursesSummary?.overview?.registered_units ?? 0)}</div>
                  <div className="mt-1 text-sm text-slate-700 dark:text-slate-200">{coursesSummary?.overview?.active_term || "Current term"}</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">Materials</div>
                  <div className="mt-2 text-3xl font-semibold text-slate-950 dark:text-slate-50">{String(coursesSummary?.overview?.materials_count ?? 0)}</div>
                  <div className="mt-1 text-sm text-slate-700 dark:text-slate-200">Current backend source</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">Terms Tracked</div>
                  <div className="mt-2 text-3xl font-semibold text-slate-950 dark:text-slate-50">{String(coursesSummary?.overview?.terms_tracked ?? 0)}</div>
                  <div className="mt-1 text-sm text-slate-700 dark:text-slate-200">Academic history</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">Status</div>
                  <div className="mt-2 text-3xl font-semibold text-slate-950 dark:text-slate-50">{String(coursesSummary?.overview?.status || "Active")}</div>
                  <div className="mt-1 text-sm text-slate-700 dark:text-slate-200">Academic record</div>
                </div>
              </div>
              <div className="max-w-[180px]">
                <SelectField
                  label="Assessment"
                  compact
                  value={assessmentType}
                  onChange={setAssessmentType}
                  options={[
                    { value: "all", label: "All" },
                    { value: "cat", label: "CAT" },
                    { value: "exam", label: "Exam" },
                    { value: "lab", label: "Lab" },
                  ]}
                />
              </div>
              <div className="grid gap-10 border-t border-slate-200 pt-8 xl:grid-cols-[1.6fr_1fr]">
                <div className="space-y-5">
                  <div>
                    <div className="mb-3 text-[13px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">Grade & attendance overview</div>
                    <ComboTrendChart gradePoints={trendSeries.grades} attendancePoints={trendSeries.attendance} />
                  </div>
                  <div className="grid gap-8 xl:grid-cols-2">
                    <div>
                      <div className="mb-3 text-[13px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">Assessment mix</div>
                      <DonutChart
                        segments={trendSeries.distribution}
                        centerLabel="Assessment"
                        centerValue={assessmentType === "all" ? "All" : assessmentType.toUpperCase()}
                      />
                    </div>
                    <div>
                      <div className="mb-3 text-[13px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">Performance signals</div>
                      <HorizontalComparisonChart items={trendSeries.comparisons} />
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="text-[13px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">Reading this graph</div>
                  <div className="space-y-4 text-[16px] leading-8 text-slate-700 dark:text-slate-200">
                    <div>Bars show grade movement across recent study weeks.</div>
                    <div>The cyan line shows attendance consistency over the same period.</div>
                    <div>Use the assessment filter to compare CAT, Exam, Lab, or your mixed course view.</div>
                    <div>The smaller charts surface where marks are coming from and which signals deserve attention next.</div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {activeDesktopSection === "plan" ? (
            <div className="mt-10 space-y-8">
              <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
                <div>
                  <div className="text-sm font-semibold text-slate-950">Strengths</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Tag>Arrays</Tag>
                    <Tag>Big-O basics</Tag>
                    <Tag>Stacks</Tag>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-950">Needs work</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Tag>Trees</Tag>
                    <Tag>Hashing</Tag>
                    <Tag>Graph traversal</Tag>
                  </div>
                </div>
              </div>
              <div className="space-y-3 border-t border-slate-200 pt-6">
                {["Revise Trees 30 mins/day", "Solve 10 hashing problems", "Attend next lab session"].map((item) => (
                  <div key={item} className="text-[16px] leading-8 text-slate-700">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {activeDesktopSection === "units" ? (
            <div className="mt-10 space-y-5">
              <div className="text-[13px] font-semibold uppercase tracking-[0.16em] text-slate-500">Units currently linked</div>
              <div className="text-5xl font-semibold tracking-[-0.04em] text-slate-950">{String(coursesSummary?.overview?.registered_units ?? 0)}</div>
              <div className="text-base text-slate-700">{coursesSummary?.overview?.active_term || "Current term"}</div>
              <div className="space-y-3 border-t border-slate-200 pt-6">
                {coursesSummary?.registered_units?.length
                  ? coursesSummary.registered_units.map((unit, index) => (
                      <div key={`${unit.code || unit.name || index}`} className="text-[16px] leading-8 text-slate-700">
                        {unit.code || unit.name || String(unit)}
                      </div>
                    ))
                  : <div className="text-[16px] leading-8 text-slate-600">No registered units are currently linked to this learner profile.</div>}
              </div>
            </div>
          ) : null}

          {activeDesktopSection === "materials" ? (
            <div className="mt-10 space-y-5">
              <div className="text-[13px] font-semibold uppercase tracking-[0.16em] text-slate-500">Materials available</div>
              <div className="text-5xl font-semibold tracking-[-0.04em] text-slate-950">{String(coursesSummary?.overview?.materials_count ?? 0)}</div>
              <div className="text-base text-slate-700">Current backend source</div>
              <div className="space-y-3 border-t border-slate-200 pt-6">
                {coursesSummary?.materials?.length
                  ? coursesSummary.materials.map((item, index) => (
                      <div key={`${item.title || item.name || item.code || index}`} className="text-[16px] leading-8 text-slate-700">
                        {item.title || item.name || item.code || "Course material"}
                      </div>
                    ))
                  : <div className="text-[16px] leading-8 text-slate-600">No course material entries are available from the current backend course source.</div>}
              </div>
            </div>
          ) : null}

          {activeDesktopSection === "insights" ? (
            <div className="mt-10 space-y-8">
              <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
                <div>
                  <div className="mb-3 text-sm font-semibold text-slate-950">Pass-rate trend</div>
                  <LineChart compact points={[62, 65, 61, 70, 73, 71]} />
                </div>
                <div>
                  <div className="mb-3 text-sm font-semibold text-slate-950">Attendance distribution</div>
                  <Bars values={[22, 30, 44, 58, 66, 72, 69, 51, 34, 24]} />
                </div>
              </div>
              <div className="space-y-4 border-t border-slate-200 pt-6">
                {desktopInsights.map((item) => (
                  <div key={item.title}>
                    <div className="text-sm font-semibold text-slate-950">{item.title}</div>
                    <div className="mt-1 text-[16px] leading-8 text-slate-600">{item.body}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {activeDesktopSection === "career" ? (
            <div className="mt-10 space-y-8">
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <SelectField
                  compact
                  label="Target career path"
                  value={targetRole}
                  onChange={setTargetRole}
                  options={[
                    { value: "backend", label: "Software Eng (Backend)" },
                    { value: "data", label: "Data" },
                    { value: "ai", label: "AI" },
                    { value: "cyber", label: "Cyber" },
                  ]}
                />
                <SelectField
                  compact
                  label="Skill level"
                  value={skillLevel}
                  onChange={setSkillLevel}
                  options={[
                    { value: "beginner", label: "Beginner" },
                    { value: "intermediate", label: "Intermediate" },
                    { value: "advanced", label: "Advanced" },
                  ]}
                />
              </div>
              <div className="grid grid-cols-2 gap-6 xl:grid-cols-4">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Role Alignment</div>
                  <div className="mt-2 text-3xl font-semibold text-slate-950">78%</div>
                  <div className="mt-1 text-sm text-slate-500">Backend Dev</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Skills Gained</div>
                  <div className="mt-2 text-3xl font-semibold text-slate-950">8</div>
                  <div className="mt-1 text-sm text-slate-500">Mapped</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Projects</div>
                  <div className="mt-2 text-3xl font-semibold text-slate-950">3</div>
                  <div className="mt-1 text-sm text-slate-500">Portfolio-ready</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Certifications</div>
                  <div className="mt-2 text-3xl font-semibold text-slate-950">2</div>
                  <div className="mt-1 text-sm text-slate-500">Suggested</div>
                </div>
              </div>
              <div className="space-y-3 border-t border-slate-200 pt-6 text-[16px] leading-8 text-slate-700">
                <div>Arrays / Stacks {"->"} Trees / Hashing {"->"} Graphs {"->"} System Design Foundations</div>
                <div>High relevance for backend internships requiring data structures, APIs, testing, and debugging.</div>
                <div>Build Library Management API, create a DSA tracker dashboard, and publish tests with a clear README.</div>
              </div>
            </div>
          ) : null}
        </div>

        {isDesktopSectionMenuOpen ? (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40 bg-slate-950/12"
              aria-label="Close sections menu"
              onClick={() => setIsDesktopSectionMenuOpen(false)}
            />
            <div className="fixed bottom-24 left-6 z-50 flex flex-col items-start gap-3">
              {desktopSectionItems.map((item, index) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setActiveDesktopSection(item.key);
                    setIsDesktopSectionMenuOpen(false);
                  }}
                  className="inline-flex items-center gap-3 rounded-full bg-[#066b2f] px-5 py-3 text-[15px] font-medium text-white shadow-[0_16px_34px_rgba(6,107,47,0.24)]"
                  style={{ marginLeft: `${index * 12}px` }}
                >
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </>
        ) : null}

        <button
          type="button"
          onClick={() => setIsDesktopSectionMenuOpen((value) => !value)}
          className="fixed bottom-6 left-6 z-50 inline-flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#066b2f] text-white shadow-[0_18px_34px_rgba(6,107,47,0.24)] transition hover:bg-[#055b28]"
          aria-label={isDesktopSectionMenuOpen ? "Close sections menu" : "Open sections menu"}
        >
          {isDesktopSectionMenuOpen ? <X size={26} /> : <Plus size={28} />}
        </button>
      </div>
    </div>
  );
}
