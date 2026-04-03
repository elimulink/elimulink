import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Info,
  Link2,
  Mail,
  Menu,
  Plus,
  QrCode,
  Rows3,
  ScanLine,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";

const trendValues = [78, 82, 85, 84, 88, 86];
const breakdownValues = [
  { label: "Present", value: 86, tone: "emerald" },
  { label: "Absent", value: 9, tone: "rose" },
  { label: "Late", value: 5, tone: "amber" },
];
const unitValues = [
  { label: "CSC 320", value: 94 },
  { label: "MAT 214", value: 89 },
  { label: "RES 201", value: 84 },
];
const historyRows = [
  { id: "h1", date: "2026-03-30", unit: "CSC 320", lecturer: "Dr. Miriam Wanjiku", status: "Present", checkInTime: "09:02 AM", method: "QR" },
  { id: "h2", date: "2026-03-28", unit: "MAT 214", lecturer: "Mr. James Kariuki", status: "Present", checkInTime: "10:58 AM", method: "Code" },
  { id: "h3", date: "2026-03-27", unit: "RES 201", lecturer: "Ms. Ruth Njeri", status: "Late", checkInTime: "02:12 PM", method: "Link" },
  { id: "h4", date: "2026-03-25", unit: "BUS 110", lecturer: "Mr. Peter Mutiso", status: "Absent", checkInTime: "--", method: "Manual" },
];

const SECTION_ITEMS = [
  { key: "overview", label: "Overview" },
  { key: "session", label: "Session" },
  { key: "trends", label: "Trends" },
  { key: "history", label: "History" },
  { key: "guidance", label: "Guidance" },
];

const toneMap = {
  slate: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:border-white/10",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/12 dark:text-emerald-200 dark:border-emerald-400/20",
  rose: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/12 dark:text-rose-200 dark:border-rose-400/20",
  amber: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/12 dark:text-amber-200 dark:border-amber-400/20",
  sky: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/12 dark:text-sky-200 dark:border-sky-400/20",
};

function fmtDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function statusTone(status) {
  if (status === "Present") return "emerald";
  if (status === "Late") return "amber";
  if (status === "Absent") return "rose";
  return "sky";
}

function Pill({ value, tone = "slate" }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${toneMap[tone] || toneMap.slate}`}>{value}</span>;
}

function ReadLine({ label, value, icon: Icon }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-200/80 py-3 last:border-b-0 dark:border-white/10">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">
        {Icon ? <Icon size={13} /> : null}
        {label}
      </div>
      <div className="text-right text-sm font-medium text-slate-950 dark:text-slate-50">{value}</div>
    </div>
  );
}

function AttendanceTrendChart() {
  const max = Math.max(...trendValues, 1);
  const points = trendValues
    .map((value, index) => `${(index / Math.max(trendValues.length - 1, 1)) * 100},${100 - (value / max) * 75}`)
    .join(" ");

  return (
    <div className="pt-2">
      <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">Monthly attendance trend</div>
      <div className="mt-2 text-sm text-slate-700 dark:text-slate-300">A cleaner academic graph of your last six recorded sessions.</div>
      <div className="mt-5 rounded-[28px] border border-slate-200/80 bg-white/70 p-4 dark:border-white/10 dark:bg-[#101c31]">
        <svg viewBox="0 0 100 100" className="h-44 w-full">
          <polyline fill="none" stroke="currentColor" strokeWidth="3" className="text-sky-500" points={points} />
          {trendValues.map((value, index) => (
            <circle
              key={`${value}-${index}`}
              cx={(index / Math.max(trendValues.length - 1, 1)) * 100}
              cy={100 - (value / max) * 75}
              r="2.6"
              className="fill-current text-sky-500"
            />
          ))}
        </svg>
        <div className="mt-3 grid grid-cols-6 gap-1 text-center text-xs text-slate-500 dark:text-slate-400">
          {["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"].map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function AttendanceBreakdown() {
  return (
    <div className="pt-2">
      <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">Attendance mix</div>
      <div className="mt-2 text-sm text-slate-700 dark:text-slate-300">Present, absent, and late records for the current term.</div>
      <div className="mt-5">
        <div className="flex h-4 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          {breakdownValues.map((item) => (
            <div
              key={item.label}
              className={item.tone === "emerald" ? "bg-emerald-500" : item.tone === "rose" ? "bg-rose-500" : "bg-amber-500"}
              style={{ width: `${item.value}%` }}
            />
          ))}
        </div>
        <div className="mt-5 space-y-3">
          {breakdownValues.map((item) => (
            <div key={item.label} className="flex items-center justify-between border-b border-slate-200/80 pb-3 last:border-b-0 dark:border-white/10">
              <div className="text-sm font-medium text-slate-900 dark:text-slate-50">{item.label}</div>
              <Pill value={`${item.value}%`} tone={item.tone} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AttendanceByUnit() {
  return (
    <div className="pt-2">
      <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">Attendance by unit</div>
      <div className="mt-2 text-sm text-slate-700 dark:text-slate-300">A plain view of how you are tracking across current units.</div>
      <div className="mt-5 space-y-4">
        {unitValues.map((item) => (
          <div key={item.label}>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-900 dark:text-slate-50">{item.label}</span>
              <span className="text-slate-600 dark:text-slate-300">{item.value}%</span>
            </div>
            <div className="mt-2 h-2.5 rounded-full bg-slate-200 dark:bg-slate-800">
              <div className="h-2.5 rounded-full bg-slate-900 dark:bg-sky-500" style={{ width: `${item.value}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FloatingSectionPicker({ open, items, activeSection, onToggle, onSelect, mobile = false }) {
  return (
    <div className={mobile ? "fixed bottom-6 right-5 z-30" : "fixed bottom-8 left-8 z-30"}>
      <div className="flex flex-col items-start gap-3">
        {open ? (
          <div className="mb-1 flex flex-col items-start gap-3">
            <div className="px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">Sections</div>
            <div className="flex flex-col items-start gap-3">
              {items.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onSelect(item.key)}
                  className={[
                    "inline-flex min-w-[118px] items-center justify-center rounded-full px-5 py-4 text-center text-[14px] font-semibold shadow-[0_14px_34px_rgba(5,150,105,0.22)] transition",
                    activeSection === item.key
                      ? "bg-emerald-800 text-white"
                      : "bg-emerald-700 text-white hover:bg-emerald-600",
                  ].join(" ")}
                  style={!mobile ? { marginLeft: `${items.findIndex((entry) => entry.key === item.key) * 14}px` } : undefined}
                >
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex h-16 w-16 items-center justify-center rounded-[24px] bg-emerald-700 text-white shadow-[0_18px_42px_rgba(5,150,105,0.32)] transition hover:bg-emerald-600"
          aria-label="Open attendance sections"
        >
          {open ? <X size={24} /> : <Plus size={28} />}
        </button>
      </div>
    </div>
  );
}

function SectionPage({ eyebrow, title, description, children }) {
  return (
    <section className="pt-2">
      <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">{eyebrow}</div>
      <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-slate-50">{title}</h2>
      <p className="mt-3 max-w-3xl text-base leading-8 text-slate-700 dark:text-slate-300">{description}</p>
      <div className="mt-8">{children}</div>
    </section>
  );
}

function AttendanceFeatureLanding({ currentRate, onOpenSection, onOpenMainMenu, mobile = false }) {
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={onOpenMainMenu}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-[0_12px_30px_rgba(15,23,42,0.06)] hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            <Menu size={18} />
          </button>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">Attendance workspace</div>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-slate-50">Attendance</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-700 dark:text-slate-300">
              Keep check-in readiness, attendance trends, and session history in one calm workspace without the old boxed layout.
            </p>
          </div>
        </div>
        <Pill value={`${currentRate}% current`} tone="sky" />
      </div>

      <div className={mobile ? "space-y-4" : "grid gap-4 md:grid-cols-3"}>
        {[
          ["Current attendance", `${currentRate}%`, "Term performance"],
          ["Late records", "2", "Recorded this term"],
          ["Open session", "1", "Ready for check-in"],
        ].map(([label, value, note]) => (
          <div key={label} className="border-b border-slate-200/80 pb-4 dark:border-white/10">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">{label}</div>
            <div className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-slate-50">{value}</div>
            <div className="mt-1 text-sm text-slate-700 dark:text-slate-300">{note}</div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {[
          ["Overview", "See your attendance profile and main term signals.", "overview"],
          ["Live session", "Open current session details and check-in actions.", "session"],
          ["Trends", "Review attendance graphs and unit breakdowns.", "trends"],
        ].map(([label, desc, key]) => (
          <button
            key={key}
            type="button"
            onClick={() => onOpenSection(key)}
            className="flex w-full items-center justify-between border-b border-slate-200/80 py-4 text-left transition hover:text-slate-950 dark:border-white/10 dark:hover:text-white"
          >
            <div>
              <div className="text-base font-semibold text-slate-900 dark:text-slate-50">{label}</div>
              <div className="mt-1 text-sm text-slate-700 dark:text-slate-300">{desc}</div>
            </div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">Open</div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function StudentAttendancePage({ user, profile, onBack = null, onOpenMainMenu = null }) {
  const [stagedAction, setStagedAction] = useState("");
  const [isCompactMobile, setIsCompactMobile] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 767px)").matches : false
  );
  const [showFeatureLanding, setShowFeatureLanding] = useState(() =>
    !(typeof window !== "undefined" ? window.matchMedia("(max-width: 767px)").matches : false)
  );
  const [activeSection, setActiveSection] = useState("overview");
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const media = window.matchMedia("(max-width: 767px)");
    const sync = (event) => {
      const next = Boolean(event.matches);
      setIsCompactMobile(next);
      setShowFeatureLanding(!next);
    };
    sync(media);
    media.addEventListener?.("change", sync);
    return () => media.removeEventListener?.("change", sync);
  }, []);

  const identity = useMemo(
    () => ({
      fullName: profile?.name || user?.name || "Student Name",
      email: profile?.email || user?.email || "student@elimulink.co.ke",
      registrationNumber: profile?.registrationNumber || "CSC/24/0097",
      gender: profile?.gender || "Male",
      program: profile?.program || "BSc Computer Science",
      department: profile?.department || "School of Computing",
      yearCohort: profile?.yearCohort || "Year 1 • Cohort 2024",
    }),
    [profile, user]
  );

  const currentSession = {
    unit: "CSC 320 - Advanced Database Systems",
    lecturer: "Dr. Miriam Wanjiku",
    sessionTitle: "Morning Lecture Attendance",
    date: "2026-03-30",
    time: "08:45 AM - 10:00 AM",
    status: "Open",
  };

  const latestCheckIn = {
    message: "Checked in successfully",
    recordedTime: "09:02 AM",
    method: "QR",
    status: "Present",
    summary: `${currentSession.unit} • ${fmtDate(currentSession.date)}`,
  };

  const guidance = {
    title: "On Track",
    tone: "emerald",
    body: "Your attendance is healthy this month. One unit is slightly below your strongest performance, so keep checking in early.",
  };

  const openSection = (sectionKey) => {
    setActiveSection(sectionKey);
    setShowFeatureLanding(false);
    setPickerOpen(false);
  };

  const stagedMessage = stagedAction
    ? stagedAction === "Session Info"
      ? "Session details are shown in the page, but expanded session help or live session metadata is not wired yet."
      : stagedAction === "Scan QR"
      ? "QR scanning is not connected in this frontend-only task. The button is staged honestly as an interface entry point."
      : stagedAction === "Enter Code"
      ? "Code entry flow is not connected to a validation endpoint yet, so this action is staged."
      : stagedAction === "Open Attendance Link"
      ? "Attendance link check-in is represented in the UI, but no backend or validation flow has been wired in this task."
      : "This action is prepared in the frontend and can be connected to real attendance services next."
    : "";

  return (
    <>
      <div className="min-h-[100dvh] bg-[linear-gradient(180deg,#f8fafc_0%,#f4f7fb_48%,#eef3f9_100%)] dark:bg-[linear-gradient(180deg,#06111f_0%,#0a1527_48%,#0c1830_100%)]">
        <div className={["mx-auto max-w-6xl", isCompactMobile ? "px-4 py-5 pb-28" : "px-6 py-6 pb-24"].join(" ")}>
          {showFeatureLanding ? (
            <AttendanceFeatureLanding
              currentRate={86}
              mobile={isCompactMobile}
              onOpenSection={openSection}
              onOpenMainMenu={() => {
                if (onOpenMainMenu) onOpenMainMenu();
              }}
            />
          ) : (
            <div className="space-y-8">
              <SectionPage
                eyebrow="Attendance section"
                title={
                  activeSection === "overview"
                    ? "Attendance overview"
                    : activeSection === "session"
                    ? "Live session"
                    : activeSection === "trends"
                    ? "Attendance trends"
                    : activeSection === "history"
                    ? "Attendance history"
                    : "Guidance"
                }
                description={
                  activeSection === "overview"
                    ? "Keep your attendance identity, current rate, and latest check-in in one plain workspace."
                    : activeSection === "session"
                    ? "Review the active session and use the staged check-in actions from one calm page."
                    : activeSection === "trends"
                    ? "Read your attendance graph and unit distribution without the old boxed dashboard."
                    : activeSection === "history"
                    ? "A clean historical record of attendance entries and methods used."
                    : "Read the main attendance recommendation and current academic signal."
                }
              >
                {activeSection === "overview" ? (
                  <div className="grid gap-8 xl:grid-cols-[1fr_0.9fr]">
                    <div>
                      <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">Identity summary</div>
                      <div className="mt-4">
                        <ReadLine label="Full name" value={identity.fullName} icon={UserRound} />
                        <ReadLine label="Email address" value={identity.email} icon={Mail} />
                        <ReadLine label="Registration number" value={identity.registrationNumber} icon={Info} />
                        <ReadLine label="Program" value={identity.program} />
                        <ReadLine label="Department" value={identity.department} />
                        <ReadLine label="Year / cohort" value={identity.yearCohort} />
                      </div>
                    </div>
                    <div className="space-y-6">
                      <div>
                        <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">Current signals</div>
                        <div className="mt-4 space-y-3">
                          {[
                            ["Attendance percentage", "86%", "Current term"],
                            ["Present count", "28", "Recorded sessions"],
                            ["Absent count", "3", "Missed sessions"],
                            ["Late count", "2", "Late arrivals"],
                          ].map(([label, value, note]) => (
                            <div key={label} className="border-b border-slate-200/80 pb-3 last:border-b-0 dark:border-white/10">
                              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">{label}</div>
                              <div className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-slate-50">{value}</div>
                              <div className="mt-1 text-sm text-slate-700 dark:text-slate-300">{note}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">Latest check-in</div>
                        <div className="mt-4">
                          <ReadLine label="Status" value={latestCheckIn.message} icon={CheckCircle2} />
                          <ReadLine label="Recorded time" value={latestCheckIn.recordedTime} icon={Clock3} />
                          <ReadLine label="Method" value={latestCheckIn.method} icon={QrCode} />
                          <ReadLine label="Session summary" value={latestCheckIn.summary} />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {activeSection === "session" ? (
                  <div className="grid gap-8 xl:grid-cols-[1fr_0.85fr]">
                    <div>
                      <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">Current attendance session</div>
                      <div className="mt-4">
                        <ReadLine label="Unit / course" value={currentSession.unit} icon={CalendarDays} />
                        <ReadLine label="Lecturer" value={currentSession.lecturer} />
                        <ReadLine label="Session title" value={currentSession.sessionTitle} />
                        <ReadLine label="Date" value={fmtDate(currentSession.date)} />
                        <ReadLine label="Time" value={currentSession.time} icon={Clock3} />
                        <ReadLine label="Session status" value={currentSession.status} />
                      </div>
                    </div>
                    <div>
                      <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">Check-in actions</div>
                      <div className="mt-4 flex flex-col gap-3">
                        {[
                          ["Session Info", Info],
                          ["Scan QR", ScanLine],
                          ["Enter Code", QrCode],
                          ["Open Attendance Link", Link2],
                        ].map(([label, Icon]) => (
                          <button
                            key={label}
                            type="button"
                            onClick={() => setStagedAction(label)}
                            className="flex items-center justify-between border-b border-slate-200/80 py-3 text-left transition hover:text-slate-950 dark:border-white/10 dark:hover:text-white"
                          >
                            <span className="flex items-center gap-3 text-sm font-medium text-slate-900 dark:text-slate-50">
                              <Icon size={16} />
                              {label}
                            </span>
                            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">Open</span>
                          </button>
                        ))}
                      </div>
                      <div className="mt-5 text-sm leading-7 text-slate-700 dark:text-slate-300">
                        Check-in actions are shown as frontend entry points only. No scanner, code validation, or attendance link backend is wired in this task.
                      </div>
                    </div>
                  </div>
                ) : null}

                {activeSection === "trends" ? (
                  <div className="grid gap-10 xl:grid-cols-[1.1fr_0.9fr]">
                    <AttendanceTrendChart />
                    <div className="space-y-10">
                      <AttendanceBreakdown />
                      <AttendanceByUnit />
                    </div>
                  </div>
                ) : null}

                {activeSection === "history" ? (
                  <div>
                    <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">History table</div>
                    <div className="mt-5 space-y-4">
                      {historyRows.map((row) => (
                        <div key={row.id} className="border-b border-slate-200/80 pb-4 last:border-b-0 dark:border-white/10">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <div className="text-base font-semibold text-slate-900 dark:text-slate-50">{row.unit}</div>
                              <div className="mt-1 text-sm text-slate-700 dark:text-slate-300">{fmtDate(row.date)} • {row.lecturer}</div>
                            </div>
                            <Pill value={row.status} tone={statusTone(row.status)} />
                          </div>
                          <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-700 dark:text-slate-300">
                            <span>Check-in: {row.checkInTime}</span>
                            <span>Method: {row.method}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {activeSection === "guidance" ? (
                  <div className="max-w-3xl">
                    <div className="flex items-start gap-4">
                      <div className={`grid h-12 w-12 place-items-center rounded-2xl ${guidance.tone === "emerald" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/12 dark:text-emerald-200" : "bg-amber-50 text-amber-700 dark:bg-amber-500/12 dark:text-amber-200"}`}>
                        {guidance.tone === "emerald" ? <ShieldCheck size={22} /> : <AlertCircle size={22} />}
                      </div>
                      <div>
                        <div className="text-2xl font-semibold text-slate-950 dark:text-slate-50">{guidance.title}</div>
                        <div className="mt-3 text-base leading-8 text-slate-700 dark:text-slate-300">{guidance.body}</div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </SectionPage>
            </div>
          )}
        </div>

        <FloatingSectionPicker
          open={pickerOpen}
          items={SECTION_ITEMS}
          activeSection={activeSection}
          onToggle={() => setPickerOpen((prev) => !prev)}
          onSelect={openSection}
          mobile={isCompactMobile}
        />
      </div>

      {stagedAction ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/35 px-4 backdrop-blur-[1px]">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#0d182b]">
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 dark:border-white/10">
              <div>
                <div className="text-lg font-semibold text-slate-950 dark:text-slate-50">{stagedAction}</div>
                <div className="mt-1 text-sm text-slate-500 dark:text-slate-300">Frontend state is prepared for this action.</div>
              </div>
              <button
                type="button"
                onClick={() => setStagedAction("")}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-5 py-5">
              <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700 dark:bg-[#101c31] dark:text-slate-300">{stagedMessage}</div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
