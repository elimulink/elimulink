import { useMemo, useState } from "react";
import {
  BarChart3,
  BookOpenCheck,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  LayoutDashboard,
  Megaphone,
  MessageSquareText,
  Search,
  Shield,
  Sparkles,
  Users,
  UserCog,
  Wallet,
  ScrollText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { auth } from "../lib/firebase";
import { apiUrl } from "../lib/apiUrl";

const MODULES = [
  {
    key: "analytics",
    label: "Analytics",
    description: "Performance and enrollment insights.",
    icon: LayoutDashboard,
  },
  {
    key: "chat",
    label: "Chat Space",
    description: "Admin communication channels.",
    icon: MessageSquareText,
  },
  {
    key: "calendar",
    label: "Calendar",
    description: "Academic scheduling control.",
    icon: CalendarDays,
  },
  {
    key: "subgroups",
    label: "Subgroups",
    description: "Manage academic groups.",
    icon: Users,
  },
  {
    key: "users",
    label: "User Management",
    description: "Create users and assign roles.",
    icon: UserCog,
  },
  {
    key: "courses",
    label: "Course Management",
    description: "Add units and assign lecturers.",
    icon: BookOpenCheck,
  },
  {
    key: "results",
    label: "Results Management",
    description: "Upload and approve grades.",
    icon: FileCheck2,
  },
  {
    key: "attendance",
    label: "Attendance Monitoring",
    description: "Track class participation.",
    icon: ClipboardCheck,
  },
  {
    key: "finance",
    label: "Financial Overview",
    description: "Fee tracking and reports.",
    icon: Wallet,
  },
  {
    key: "announcements",
    label: "Announcement Control",
    description: "Broadcast messages to learners.",
    icon: Megaphone,
  },
  {
    key: "audit",
    label: "Audit Logs",
    description: "Activity and action tracking.",
    icon: ScrollText,
  },
  {
    key: "ai",
    label: "AI Insights",
    description: "Ask data-driven questions.",
    icon: BrainCircuit,
  },
];

function SurfaceCard({ title, subtitle, icon: Icon, right, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <header className="flex items-start justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/60">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {Icon ? (
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <Icon size={18} />
              </span>
            ) : null}
            <h3 className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{title}</h3>
          </div>
          {subtitle ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
        </div>
        {right || null}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function KpiCard({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-slate-100">{value}</div>
      {hint ? <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</div> : null}
    </div>
  );
}

function SideNavButton({ active, icon: Icon, label, description, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full rounded-xl border px-3 py-3 text-left transition",
        active
          ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <span
          className={[
            "mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
            active
              ? "border-white/30 bg-white/20"
              : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
          ].join(" ")}
        >
          <Icon size={18} />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold leading-5">{label}</span>
          <span className={["mt-0.5 block text-xs", active ? "text-indigo-100" : "text-slate-500 dark:text-slate-400"].join(" ")}>
            {description}
          </span>
        </span>
      </div>
    </button>
  );
}

function PlaceholderModule({ module }) {
  return (
    <div className="space-y-4">
      <SurfaceCard
        title={module.label}
        subtitle={module.description}
        icon={module.icon}
        right={
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            <CheckCircle2 size={14} />
            Ready For Build
          </span>
        }
      >
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
          Frontend module shell is ready. We can now add specific workflows and backend integration for this feature.
        </div>
      </SurfaceCard>
    </div>
  );
}

function LineChart({ points }) {
  const width = 760;
  const height = 220;
  const pad = 18;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);

  const x = (index) => pad + (index * (width - pad * 2)) / Math.max(points.length - 1, 1);
  const y = (value) => {
    const ratio = (value - min) / (max - min || 1);
    return height - pad - ratio * (height - pad * 2);
  };

  const path = points
    .map((value, index) => `${index === 0 ? "M" : "L"} ${x(index).toFixed(2)} ${y(value).toFixed(2)}`)
    .join(" ");

  const area =
    `M ${x(0)} ${height - pad} ` +
    points.map((value, index) => `L ${x(index)} ${y(value)}`).join(" ") +
    ` L ${x(points.length - 1)} ${height - pad} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-[220px] w-full">
      {[...Array(5)].map((_, index) => {
        const yy = pad + (index * (height - pad * 2)) / 4;
        return <line key={index} x1={pad} x2={width - pad} y1={yy} y2={yy} stroke="#cbd5e1" strokeWidth="1" />;
      })}
      <path d={area} fill="#4f46e5" opacity="0.14" />
      <path d={path} fill="none" stroke="#4338ca" strokeWidth="3" />
      {points.map((value, index) => (
        <circle key={index} cx={x(index)} cy={y(value)} r="4" fill="#4338ca" />
      ))}
    </svg>
  );
}

export default function AdminAnalyticsLanding({ userRole }) {
  const [active, setActive] = useState("analytics");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiMessages, setAiMessages] = useState([
    {
      role: "assistant",
      text: "AI ready. I can analyze student-portal patterns across performance, attendance, fees, and engagement once data sync is available.",
    },
  ]);

  const activeModule = MODULES.find((item) => item.key === active) || MODULES[0];
  const roleLabel = String(userRole || "department_head").replaceAll("_", " ");

  const kpis = useMemo(
    () => ({
      enrollment: { value: "12,542", hint: "+515 this semester" },
      avgGpa: { value: "3.52", hint: "+0.08 compared to last semester" },
      atRisk: { value: "52", hint: "Students flagged for follow-up" },
      attendance: { value: "84%", hint: "Average participation this month" },
    }),
    []
  );

  const trendPoints = useMemo(() => [14, 18, 21, 27, 34, 31, 41, 45, 48, 52, 58, 63], []);

  const riskRows = useMemo(
    () => [
      { id: "245678", name: "Alice Njuguna", year: 2, attendance: "42%", gpa: "2.10", risk: "High" },
      { id: "234759", name: "Tony Kamau", year: 3, attendance: "55%", gpa: "1.90", risk: "High" },
      { id: "258901", name: "Joy Wanjiku", year: 2, attendance: "58%", gpa: "2.00", risk: "Medium" },
      { id: "262114", name: "Kevin Otieno", year: 1, attendance: "62%", gpa: "2.30", risk: "Medium" },
    ],
    []
  );

  async function sendAI(prompt) {
    const clean = String(prompt || "").trim();
    if (!clean) return;

    setAiMessages((messages) => [...messages, { role: "user", text: clean }]);
    setAiInput("");

    try {
      const token = await auth?.currentUser?.getIdToken(true).catch(() => null);
      if (!token) {
        setAiMessages((messages) => [
          ...messages,
          { role: "assistant", text: "Please sign in to use AI Insights." },
        ]);
        return;
      }

      const response = await fetch(apiUrl("/api/admin/ai"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ prompt: clean }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setAiMessages((messages) => [
          ...messages,
          { role: "assistant", text: `Error (${response.status}): ${data?.message || data?.error || "Request failed"}` },
        ]);
        return;
      }

      setAiMessages((messages) => [...messages, { role: "assistant", text: data?.text || data?.reply || "No response." }]);
    } catch {
      setAiMessages((messages) => [
        ...messages,
        { role: "assistant", text: "Could not reach AI endpoint. Please try again." },
      ]);
    }
  }

  function renderAnalyticsLanding() {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Enrollment" value={kpis.enrollment.value} hint={kpis.enrollment.hint} />
          <KpiCard label="Average GPA" value={kpis.avgGpa.value} hint={kpis.avgGpa.hint} />
          <KpiCard label="At-Risk Learners" value={kpis.atRisk.value} hint={kpis.atRisk.hint} />
          <KpiCard label="Attendance" value={kpis.attendance.value} hint={kpis.attendance.hint} />
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <SurfaceCard
            title="Performance And Enrollment Trend"
            subtitle="Semester-level progress and academic movement."
            icon={BarChart3}
          >
            <LineChart points={trendPoints} />
          </SurfaceCard>

          <SurfaceCard
            title="AI-Aware Context"
            subtitle="AI chat understands student portal signals while you work."
            icon={Sparkles}
          >
            <div className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                Live context includes attendance, fees, grades, and course activity for better administrative decisions.
              </div>
              <button
                type="button"
                onClick={() => setActive("ai")}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                <BrainCircuit size={16} />
                Open AI Insights
              </button>
            </div>
          </SurfaceCard>
        </div>

        <SurfaceCard
          title="At-Risk Students Snapshot"
          subtitle="Flagged learners who need intervention."
          icon={Shield}
        >
          <div className="overflow-auto">
            <table className="min-w-[680px] w-full text-sm">
              <thead className="text-slate-500 dark:text-slate-400">
                <tr className="border-b border-slate-200 dark:border-slate-700 text-left">
                  <th className="py-2 pr-3 font-semibold">Student ID</th>
                  <th className="py-2 pr-3 font-semibold">Name</th>
                  <th className="py-2 pr-3 font-semibold">Year</th>
                  <th className="py-2 pr-3 font-semibold">Attendance</th>
                  <th className="py-2 pr-3 font-semibold">GPA</th>
                  <th className="py-2 pr-3 font-semibold">Risk</th>
                </tr>
              </thead>
              <tbody>
                {riskRows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-2.5 pr-3 text-slate-700 dark:text-slate-300">{row.id}</td>
                    <td className="py-2.5 pr-3 font-medium text-slate-900 dark:text-slate-100">{row.name}</td>
                    <td className="py-2.5 pr-3 text-slate-700 dark:text-slate-300">{row.year}</td>
                    <td className="py-2.5 pr-3 text-slate-700 dark:text-slate-300">{row.attendance}</td>
                    <td className="py-2.5 pr-3 text-slate-700 dark:text-slate-300">{row.gpa}</td>
                    <td className="py-2.5 pr-3">
                      <span
                        className={[
                          "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                          row.risk === "High"
                            ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
                        ].join(" ")}
                      >
                        {row.risk}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SurfaceCard>
      </div>
    );
  }

  function renderAIInsights() {
    return (
      <div className="space-y-5">
        <SurfaceCard
          title="AI Insights"
          subtitle="Ask data-driven questions. AI understands student portal patterns while you use admin tools."
          icon={BrainCircuit}
        >
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 max-h-[320px] overflow-auto space-y-2 dark:border-slate-700 dark:bg-slate-800">
                {aiMessages.map((message, index) => (
                  <div key={index} className="text-sm">
                    <span className="font-bold text-slate-900 dark:text-slate-100">{message.role === "user" ? "You" : "AI"}:</span>{" "}
                    <span className="text-slate-700 dark:text-slate-300">{message.text}</span>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex items-center gap-2">
                <input
                  value={aiInput}
                  onChange={(event) => setAiInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") sendAI(aiInput);
                  }}
                  placeholder="Ask about performance, attendance, fees, risk patterns..."
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-900"
                />
                <button
                  type="button"
                  onClick={() => sendAI(aiInput)}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  <Sparkles size={16} />
                  Send
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {[
                "Show the top departments by attendance risk.",
                "Which courses have the biggest grade decline this semester?",
                "Summarize fee arrears impact on performance.",
                "Recommend interventions for year 1 at-risk learners.",
              ].map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => sendAI(prompt)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </SurfaceCard>
      </div>
    );
  }

  const content =
    active === "analytics"
      ? renderAnalyticsLanding()
      : active === "ai"
        ? renderAIInsights()
        : <PlaceholderModule module={activeModule} />;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto max-w-7xl px-4 py-3 md:px-6 md:py-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-lg font-bold md:text-2xl">Department Admin</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 capitalize">Role: {roleLabel}</div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-4 md:px-6 md:py-6 grid grid-cols-12 gap-4 md:gap-6">
        <aside className="col-span-12 lg:col-span-3 xl:col-span-3">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Admin Modules</div>
              <div className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">{activeModule.label}</div>
            </div>

            <div className="p-3 lg:hidden">
              <button
                type="button"
                onClick={() => setMobileMenuOpen((open) => !open)}
                className="w-full inline-flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <span className="inline-flex items-center gap-2">
                  <Search size={14} />
                  Select Module
                </span>
                {mobileMenuOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>

            <nav className={["space-y-2 p-3", mobileMenuOpen ? "block" : "hidden lg:block"].join(" ")}>
              {MODULES.map((module) => (
                <SideNavButton
                  key={module.key}
                  active={active === module.key}
                  icon={module.icon}
                  label={module.label}
                  description={module.description}
                  onClick={() => {
                    setActive(module.key);
                    setMobileMenuOpen(false);
                  }}
                />
              ))}
            </nav>
          </div>
        </aside>

        <main className="col-span-12 lg:col-span-9 xl:col-span-9">{content}</main>
      </div>
    </div>
  );
}
