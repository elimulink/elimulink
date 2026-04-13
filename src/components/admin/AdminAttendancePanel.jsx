import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Archive,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Copy,
  Download,
  Eye,
  FileDown,
  FileSpreadsheet,
  Filter,
  MoreHorizontal,
  Plus,
  Printer,
  QrCode,
  Search,
  ShieldAlert,
  UserCheck,
  UserRound,
  Users,
  X,
  XCircle,
} from "lucide-react";
import AdminActionMenu from "./AdminActionMenu";

const metrics = [
  ["Total Students", "1,248", "Across monitored departments", Users, "slate"],
  ["Present Today", "1,036", "Checked in across 22 sessions", UserCheck, "emerald"],
  ["Absent Today", "146", "Missing before session close", XCircle, "rose"],
  ["Late Check-ins", "66", "Arrived after grace window", Clock3, "amber"],
  ["Attendance Rate", "83.0%", "Institution reporting average", CheckCircle2, "sky"],
  ["At-Risk Students", "37", "Below 70% attendance", ShieldAlert, "violet"],
];

const sessions = [
  { id: "s1", title: "Advanced Database Systems Attendance", unit: "CSC 320 • Year 3 Class A", lecturer: "Dr. Miriam Wanjiku", date: "2026-03-30", time: "08:00 - 10:00", status: "Live", tone: "emerald" },
  { id: "s2", title: "Procurement Practice Attendance", unit: "BUS 210 • Year 2 Day Class", lecturer: "Mr. Peter Mutiso", date: "2026-03-30", time: "11:00 - 13:00", status: "Scheduled", tone: "amber" },
  { id: "s3", title: "Curriculum Foundations Attendance", unit: "EDU 112 • BED Arts Cohort", lecturer: "Ms. Ruth Njeri", date: "2026-03-29", time: "14:00 - 16:00", status: "Closed", tone: "slate" },
];

const rows = [
  { id: "r1", studentName: "Brian Otieno", registrationNo: "EDU/23/0412", email: "brian.otieno@students.elimulink.ac.ke", gender: "Male", programClass: "BEd Arts • Year 2", department: "School of Education", lecturer: "Dr. Miriam Wanjiku", unit: "CSC 320", cohort: "2023", session: "Morning Lecture", date: "2026-03-30", checkInTime: "07:58 AM", status: "Present", method: "QR", attendanceRate: 94, risk: "Low Risk", presentCount: 28, absentCount: 1, lateCount: 2, trend: [82, 88, 91, 90, 94, 94], unitSummary: [{ unit: "CSC 320", rate: "94%" }, { unit: "MAT 214", rate: "91%" }, { unit: "RES 201", rate: "89%" }], history: [{ unit: "CSC 320", date: "2026-03-30", status: "Present" }, { unit: "MAT 214", date: "2026-03-28", status: "Present" }, { unit: "RES 201", date: "2026-03-27", status: "Late" }] },
  { id: "r2", studentName: "Faith Njeri", registrationNo: "BUS/22/1180", email: "faith.njeri@students.elimulink.ac.ke", gender: "Female", programClass: "BBM • Year 3", department: "School of Business", lecturer: "Mr. Peter Mutiso", unit: "BUS 210", cohort: "2022", session: "Midday Class", date: "2026-03-30", checkInTime: "11:09 AM", status: "Late", method: "Code", attendanceRate: 76, risk: "Watchlist", presentCount: 22, absentCount: 5, lateCount: 4, trend: [78, 80, 74, 72, 76, 76], unitSummary: [{ unit: "BUS 210", rate: "76%" }, { unit: "ACC 220", rate: "81%" }, { unit: "MGT 205", rate: "73%" }], history: [{ unit: "BUS 210", date: "2026-03-30", status: "Late" }, { unit: "ACC 220", date: "2026-03-28", status: "Present" }, { unit: "MGT 205", date: "2026-03-27", status: "Absent" }] },
  { id: "r3", studentName: "Kevin Mwangi", registrationNo: "CSC/24/0097", email: "kevin.mwangi@students.elimulink.ac.ke", gender: "Male", programClass: "BSc Computer Science • Year 1", department: "School of Computing", lecturer: "Dr. Miriam Wanjiku", unit: "CSC 320", cohort: "2024", session: "Morning Lecture", date: "2026-03-30", checkInTime: "08:17 AM", status: "Late", method: "Link", attendanceRate: 68, risk: "High Risk", presentCount: 17, absentCount: 8, lateCount: 6, trend: [74, 71, 70, 69, 68, 68], unitSummary: [{ unit: "CSC 320", rate: "68%" }, { unit: "CSC 110", rate: "72%" }, { unit: "MAT 101", rate: "63%" }], history: [{ unit: "CSC 320", date: "2026-03-30", status: "Late" }, { unit: "CSC 110", date: "2026-03-28", status: "Absent" }, { unit: "MAT 101", date: "2026-03-27", status: "Present" }] },
  { id: "r4", studentName: "Linet Cherono", registrationNo: "EDU/21/0821", email: "linet.cherono@students.elimulink.ac.ke", gender: "Female", programClass: "BEd Science • Year 4", department: "School of Education", lecturer: "Ms. Ruth Njeri", unit: "EDU 112", cohort: "2021", session: "Afternoon Seminar", date: "2026-03-29", checkInTime: "--", status: "Excused", method: "Manual", attendanceRate: 87, risk: "Low Risk", presentCount: 25, absentCount: 2, lateCount: 1, trend: [83, 84, 86, 85, 87, 87], unitSummary: [{ unit: "EDU 112", rate: "87%" }, { unit: "EDU 401", rate: "90%" }, { unit: "RES 402", rate: "82%" }], history: [{ unit: "EDU 112", date: "2026-03-29", status: "Excused" }, { unit: "EDU 401", date: "2026-03-28", status: "Present" }, { unit: "RES 402", date: "2026-03-27", status: "Present" }] },
  { id: "r5", studentName: "Mercy Kiplagat", registrationNo: "BUS/23/0651", email: "mercy.kiplagat@students.elimulink.ac.ke", gender: "Female", programClass: "BBM • Year 2", department: "School of Business", lecturer: "Mr. Peter Mutiso", unit: "BUS 210", cohort: "2023", session: "Midday Class", date: "2026-03-30", checkInTime: "--", status: "Absent", method: "Manual", attendanceRate: 61, risk: "High Risk", presentCount: 16, absentCount: 9, lateCount: 3, trend: [72, 68, 66, 64, 61, 61], unitSummary: [{ unit: "BUS 210", rate: "61%" }, { unit: "MGT 205", rate: "64%" }, { unit: "ACC 220", rate: "69%" }], history: [{ unit: "BUS 210", date: "2026-03-30", status: "Absent" }, { unit: "MGT 205", date: "2026-03-28", status: "Late" }, { unit: "ACC 220", date: "2026-03-27", status: "Present" }] },
];

const filters = {
  department: ["All Departments", "School of Computing", "School of Business", "School of Education"],
  programClass: ["All Classes", "BSc Computer Science • Year 1", "BBM • Year 2", "BBM • Year 3", "BEd Arts • Year 2", "BEd Science • Year 4"],
  unit: ["All Units", "CSC 320", "BUS 210", "EDU 112", "MAT 101"],
  lecturer: ["All Lecturers", "Dr. Miriam Wanjiku", "Mr. Peter Mutiso", "Ms. Ruth Njeri"],
  sessionStatus: ["All Statuses", "Live", "Scheduled", "Closed"],
  attendanceStatus: ["All Attendance", "Present", "Late", "Absent", "Excused"],
};

const insights = [
  { title: "Attendance Trend Over Time", subtitle: "Daily average across monitored sessions", kind: "line", values: [74, 79, 77, 82, 84, 83], labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Today"], footer: "Attendance remains strongest in the morning session block." },
  { title: "Present vs Absent Distribution", subtitle: "Today across filtered records", kind: "stack", values: [{ label: "Present", value: 83, tone: "emerald" }, { label: "Absent", value: 12, tone: "rose" }, { label: "Late", value: 5, tone: "amber" }], footer: "Absences are still concentrated in two business classes." },
  { title: "Attendance by Unit", subtitle: "Top units in current view", kind: "bars", values: [{ label: "CSC 320", value: 92 }, { label: "EDU 112", value: 87 }, { label: "BUS 210", value: 69 }, { label: "MAT 101", value: 63 }], footer: "First-year technical classes remain the biggest intervention area." },
  { title: "At-Risk Student Summary", subtitle: "Grouped by intervention urgency", kind: "summary", values: [{ label: "Immediate follow-up", value: 7 }, { label: "Faculty review", value: 12 }, { label: "Monitoring only", value: 18 }], footer: "Most flagged students are still recoverable this term." },
];

const toneMap = {
  slate: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:border-emerald-400/20",
  rose: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-200 dark:border-rose-400/20",
  amber: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:border-amber-400/20",
  sky: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/15 dark:text-sky-200 dark:border-sky-400/20",
  violet: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/15 dark:text-violet-200 dark:border-violet-400/20",
};

const fmt = (d) => new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
const tone = (v) => toneMap[v] || toneMap.slate;
const statusTone = (v) => ({ Present: "emerald", Late: "amber", Absent: "rose", Excused: "sky", Live: "emerald", Scheduled: "amber", Closed: "slate" }[v] || "slate");
const riskTone = (v) => ({ "High Risk": "rose", Watchlist: "amber", "Low Risk": "emerald" }[v] || "slate");

function Pill({ value, toneKey }) { return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${tone(toneKey)}`}>{value}</span>; }

function Field({ label, value }) {
  return <div><div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">{label}</div><div className="mt-0.5 text-sm font-medium text-slate-700 dark:text-slate-200">{value}</div></div>;
}

function Select({ label, value, options, onChange }) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{label}</span>
      <div className="relative">
        <select value={value} onChange={(e) => onChange(e.target.value)} className="h-11 w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 pr-10 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:focus:ring-slate-800">
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
      </div>
    </label>
  );
}

function Input({ label, value, onChange, type = "text", placeholder, Icon }) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{label}</span>
      <div className="relative">
        {Icon ? <Icon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /> : null}
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:focus:ring-slate-800 ${Icon ? "pl-10" : ""}`} />
      </div>
    </label>
  );
}

function TinyLine({ values, labels }) {
  const max = Math.max(...values, 1);
  const points = values.map((v, i) => `${(i / Math.max(values.length - 1, 1)) * 100},${100 - (v / max) * 75}`).join(" ");
  return (
    <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
      <svg viewBox="0 0 100 100" className="h-36 w-full">
        <polyline fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-900 dark:text-sky-400" points={points} />
        {values.map((v, i) => <circle key={`${v}-${i}`} cx={(i / Math.max(values.length - 1, 1)) * 100} cy={100 - (v / max) * 75} r="2.5" className="fill-current text-slate-900 dark:text-sky-400" />)}
      </svg>
      {labels ? <div className="mt-3 grid grid-cols-6 gap-1 text-center text-xs text-slate-500 dark:text-slate-400">{labels.map((l) => <span key={l}>{l}</span>)}</div> : <div className="mt-2 flex justify-between text-xs text-slate-500 dark:text-slate-400"><span>Oldest</span><span>Latest</span></div>}
    </div>
  );
}

function Insights() {
  return (
    <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {insights.map((card) => (
        <article key={card.title} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="text-lg font-semibold text-slate-950 dark:text-white">{card.title}</div>
          <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{card.subtitle}</div>
          <div className="mt-5">
            {card.kind === "line" ? <TinyLine values={card.values} labels={card.labels} /> : null}
            {card.kind === "stack" ? (
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
                <div className="flex h-4 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">{card.values.map((item) => <div key={item.label} className={item.tone === "emerald" ? "bg-emerald-500" : item.tone === "rose" ? "bg-rose-500" : "bg-amber-500"} style={{ width: `${item.value}%` }} />)}</div>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">{card.values.map((item) => <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"><div className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">{item.label}</div><div className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">{item.value}%</div></div>)}</div>
              </div>
            ) : null}
            {card.kind === "bars" ? (
              <div className="space-y-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">{card.values.map((item) => <div key={item.label}><div className="flex items-center justify-between text-sm"><span className="font-medium text-slate-700 dark:text-slate-200">{item.label}</span><span className="text-slate-500 dark:text-slate-400">{item.value}%</span></div><div className="mt-2 h-2.5 rounded-full bg-slate-200 dark:bg-slate-800"><div className="h-2.5 rounded-full bg-slate-900 dark:bg-sky-500" style={{ width: `${item.value}%` }} /></div></div>)}</div>
            ) : null}
            {card.kind === "summary" ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">{card.values.map((item) => <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950"><div className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">{item.label}</div><div className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{item.value}</div></div>)}</div>
            ) : null}
          </div>
          <div className="mt-4 text-sm text-slate-500 dark:text-slate-400">{card.footer}</div>
        </article>
      ))}
    </section>
  );
}

function StudentPanel({ student, mobile, onClose }) {
  if (!student) return null;
  const panel = (
    <div className="flex h-full flex-col bg-white dark:bg-slate-900">
      <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <div><div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Student Analytics</div><div className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">{student.studentName}</div><div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{student.registrationNo}</div></div>
        <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"><X size={18} /></button>
      </div>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-900 text-white dark:bg-slate-800"><UserRound size={20} /></div><div><div className="font-medium text-slate-900 dark:text-white">{student.studentName}</div><div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{student.programClass} • {student.department} • Cohort {student.cohort}</div></div></div>
            <Pill value={student.risk} toneKey={riskTone(student.risk)} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">{[["Overall Attendance", `${student.attendanceRate}%`], ["Latest Session", student.status], ["Present Count", String(student.presentCount)], ["Absent Count", String(student.absentCount)], ["Late Count", String(student.lateCount)], ["Primary Unit", student.unit]].map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"><div className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">{label}</div><div className="mt-2 text-base font-semibold text-slate-900 dark:text-white">{value}</div></div>)}</div>
        </section>
        <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"><div className="text-sm font-semibold text-slate-900 dark:text-white">Attendance Trend</div><div className="mt-1 text-sm text-slate-500 dark:text-slate-400">Six-session attendance performance snapshot.</div><TinyLine values={student.trend} /></section>
        <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"><div className="text-sm font-semibold text-slate-900 dark:text-white">Attendance by Unit</div><div className="mt-4 space-y-3">{student.unitSummary.map((item) => <div key={item.unit}><div className="flex items-center justify-between text-sm"><span className="font-medium text-slate-700 dark:text-slate-200">{item.unit}</span><span className="text-slate-500 dark:text-slate-400">{item.rate}</span></div><div className="mt-2 h-2 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-2 rounded-full bg-slate-900 dark:bg-sky-500" style={{ width: item.rate }} /></div></div>)}</div></section>
        <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"><div className="text-sm font-semibold text-slate-900 dark:text-white">Recent Attendance History</div><div className="mt-4 space-y-3">{student.history.map((item) => <div key={`${item.unit}-${item.date}`} className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-950"><div className="flex items-start justify-between gap-3"><div><div className="font-medium text-slate-800 dark:text-slate-100">{item.unit}</div><div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{fmt(item.date)}</div></div><Pill value={item.status} toneKey={statusTone(item.status)} /></div></div>)}</div></section>
      </div>
    </div>
  );
  if (mobile) return <div className="fixed inset-0 z-40 bg-slate-900/40 p-4 backdrop-blur-[1px]"><div className="mx-auto flex h-full max-w-xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">{panel}</div></div>;
  return <aside className="hidden xl:block xl:w-[360px] xl:flex-shrink-0"><div className="sticky top-0 h-[calc(100vh-220px)] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">{panel}</div></aside>;
}

function ActionModal({ action, onClose }) {
  if (!action) return null;
  const message =
    action === "Create Session"
      ? "Session creation controls are present in the header and empty-state flow, but they are not yet connected to scheduling or backend session creation."
      : action.includes("Export")
      ? "Export entry points are built into the page, but CSV and PDF generation are still staged until reporting endpoints or file builders are wired."
      : ["Generate QR", "Download QR"].includes(action)
      ? "QR controls are intentionally staged. This task does not invent QR generation without a real attendance session backend."
      : ["Show Code", "Copy Link", "Open Live Monitor"].includes(action)
      ? "This action is represented honestly in the frontend only. No live code, link, or monitor route has been fabricated."
      : ["End Session", "Archive Session"].includes(action)
      ? "Session lifecycle controls are laid out and ready, but they are not yet connected to a persistence layer."
      : action === "Manual Attendance Marking"
      ? "Manual marking is exposed as a report tool entry point, but save logic is still staged."
      : "This frontend control is ready for a real attendance workflow to be connected next.";
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/35 px-4 backdrop-blur-[1px]">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div><div className="text-lg font-semibold text-slate-950 dark:text-white">{action}</div><div className="mt-1 text-sm text-slate-500 dark:text-slate-400">Frontend state is prepared for this action.</div></div>
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Close</button>
        </div>
        <div className="px-5 py-5"><div className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700 dark:bg-slate-950 dark:text-slate-300">{message}</div></div>
      </div>
    </div>
  );
}

export default function AdminAttendancePanel() {
  const [query, setQuery] = useState({ department: "All Departments", programClass: "All Classes", unit: "All Units", lecturer: "All Lecturers", date: "2026-03-30", sessionStatus: "All Statuses", attendanceStatus: "All Attendance", search: "" });
  const [sessionId, setSessionId] = useState("s1");
  const [checked, setChecked] = useState([]);
  const [selected, setSelected] = useState(rows[0]);
  const [mobilePanel, setMobilePanel] = useState(false);
  const [action, setAction] = useState("");

  useEffect(() => {
    const syncViewport = () => setMobilePanel(window.innerWidth < 1280);
    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  const session = useMemo(() => sessions.find((item) => item.id === sessionId) || null, [sessionId]);
  const filtered = useMemo(() => rows.filter((row) => {
    if (query.department !== "All Departments" && row.department !== query.department) return false;
    if (query.programClass !== "All Classes" && row.programClass !== query.programClass) return false;
    if (query.unit !== "All Units" && row.unit !== query.unit) return false;
    if (query.lecturer !== "All Lecturers" && row.lecturer !== query.lecturer) return false;
    if (query.date && row.date !== query.date) return false;
    if (query.attendanceStatus !== "All Attendance" && row.status !== query.attendanceStatus) return false;
    if (query.sessionStatus !== "All Statuses" && session?.status !== query.sessionStatus) return false;
    const search = query.search.trim().toLowerCase();
    if (!search) return true;
    return `${row.studentName} ${row.registrationNo} ${row.email}`.toLowerCase().includes(search);
  }), [query, session]);

  useEffect(() => {
    if (selected && filtered.some((row) => row.id === selected.id)) return;
    setSelected(filtered[0] || null);
  }, [filtered, selected]);

  const allSelected = filtered.length > 0 && filtered.every((row) => checked.includes(row.id));
  const moreTools = [
    { key: "csv", label: "Export CSV", onClick: () => setAction("Export CSV") },
    { key: "pdf", label: "Export PDF", onClick: () => setAction("Export PDF") },
    { key: "manual", label: "Manual Attendance Marking", onClick: () => setAction("Manual Attendance Marking") },
    { key: "archive", label: "Archive Session", onClick: () => setAction("Archive Session") },
  ];

  return (
    <>
      <div className="space-y-4">
        <section className="flex flex-col gap-4 rounded-3xl border border-slate-300/70 bg-white px-4 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:flex-row md:items-start md:justify-between md:px-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"><span className="h-1.5 w-1.5 rounded-full bg-sky-500" />ElimuLink Admin</div>
            <div><h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">Attendance</h1><p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">Track sessions, monitor check-ins, and review attendance performance across the institution.</p></div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setAction("Export")} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"><Download size={16} />Export</button>
            <button type="button" onClick={() => setAction("Create Session")} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500"><Plus size={16} />Create Session</button>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {metrics.map(([label, value, note, Icon, toneKey]) => <article key={label} className="rounded-3xl border border-slate-300/70 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex items-start justify-between gap-3"><div><div className="text-sm font-medium text-slate-600 dark:text-slate-300">{label}</div><div className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{value}</div></div><span className={`inline-flex rounded-2xl border p-2 ${tone(toneKey)}`}><Icon size={16} /></span></div><div className="mt-2 text-xs text-slate-500 dark:text-slate-400">{note}</div></article>)}
        </section>

        <section className="rounded-3xl border border-slate-300/70 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><div className="text-sm font-semibold text-slate-900 dark:text-white">Filters and Search</div><div className="text-sm text-slate-500 dark:text-slate-400">Refine the reporting view by department, unit, session state, and learner identity.</div></div><div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"><Filter size={14} />{filtered.length} records in current view</div></div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Select label="Department" value={query.department} options={filters.department} onChange={(v) => setQuery((s) => ({ ...s, department: v }))} />
            <Select label="Program / Class" value={query.programClass} options={filters.programClass} onChange={(v) => setQuery((s) => ({ ...s, programClass: v }))} />
            <Select label="Unit / Course" value={query.unit} options={filters.unit} onChange={(v) => setQuery((s) => ({ ...s, unit: v }))} />
            <Select label="Lecturer" value={query.lecturer} options={filters.lecturer} onChange={(v) => setQuery((s) => ({ ...s, lecturer: v }))} />
            <Input label="Date" type="date" value={query.date} onChange={(v) => setQuery((s) => ({ ...s, date: v }))} />
            <Select label="Session Status" value={query.sessionStatus} options={filters.sessionStatus} onChange={(v) => setQuery((s) => ({ ...s, sessionStatus: v }))} />
            <Select label="Attendance Status" value={query.attendanceStatus} options={filters.attendanceStatus} onChange={(v) => setQuery((s) => ({ ...s, attendanceStatus: v }))} />
            <Input label="Search" value={query.search} onChange={(v) => setQuery((s) => ({ ...s, search: v }))} placeholder="Student name, reg no., or email" Icon={Search} />
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">{sessions.map((item) => <button key={item.id} type="button" onClick={() => setSessionId(item.id)} className={["rounded-full border px-3 py-1.5 text-sm font-medium", sessionId === item.id ? "border-slate-900 bg-slate-900 text-white dark:border-sky-500 dark:bg-sky-600" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"].join(" ")}>{item.title}</button>)}</div>
          {session ? <section className="rounded-3xl border border-slate-300/70 bg-white px-4 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"><div className="space-y-3"><div className="flex flex-wrap items-center gap-3"><h2 className="text-lg font-semibold text-slate-950 dark:text-white">{session.title}</h2><Pill value={session.status} toneKey={session.tone} /></div><div className="grid grid-cols-1 gap-2 text-sm text-slate-600 dark:text-slate-300 md:grid-cols-2 xl:grid-cols-4"><Field label="Unit / Class" value={session.unit} /><Field label="Lecturer" value={session.lecturer} /><Field label="Date" value={fmt(session.date)} /><Field label="Time" value={session.time} /></div></div><div className="flex flex-wrap gap-2 xl:max-w-[540px] xl:justify-end">{[{ label: "Generate QR", icon: QrCode }, { label: "Show Code", icon: Eye }, { label: "Copy Link", icon: Copy }, { label: "Download QR", icon: Download }, { label: "Open Live Monitor", icon: CalendarDays }, { label: "End Session", icon: AlertCircle, danger: true }].map((item) => <button key={item.label} type="button" onClick={() => setAction(item.label)} className={["inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium", item.danger ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-200" : "border-slate-300/70 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"].join(" ")}><item.icon size={15} />{item.label}</button>)}</div></div></section> : null}
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            <section className="rounded-3xl border border-slate-300/70 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-col gap-3 border-b border-slate-300/70 px-5 py-4 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between"><div><div className="text-lg font-semibold text-slate-950 dark:text-white">Attendance Records</div><div className="text-sm text-slate-600 dark:text-slate-400">Structured register for session-level attendance review, student check-ins, and follow-up actions.</div></div><div className="text-sm text-slate-600 dark:text-slate-400">Select a student row to open detailed attendance analytics.</div></div>
              <div className="overflow-x-auto"><table className="min-w-[1320px] text-sm"><thead className="sticky top-0 z-10 bg-slate-50 text-left text-slate-600 dark:bg-slate-950 dark:text-slate-400"><tr><th className="px-4 py-3 font-medium"><input type="checkbox" checked={allSelected} onChange={() => setChecked(allSelected ? checked.filter((id) => !filtered.some((row) => row.id === id)) : Array.from(new Set([...checked, ...filtered.map((row) => row.id)])))} className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400" /></th><th className="px-4 py-3 font-medium">Student</th><th className="px-4 py-3 font-medium">Registration No.</th><th className="px-4 py-3 font-medium">Email</th><th className="px-4 py-3 font-medium">Gender</th><th className="px-4 py-3 font-medium">Program / Class</th><th className="px-4 py-3 font-medium">Session</th><th className="px-4 py-3 font-medium">Date</th><th className="px-4 py-3 font-medium">Check-in Time</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Method</th><th className="px-4 py-3 font-medium">Actions</th></tr></thead><tbody>{filtered.map((row) => <tr key={row.id} className={["border-t border-slate-200/80 dark:border-slate-800", selected?.id === row.id ? "bg-sky-50/70 dark:bg-sky-500/10" : "bg-white dark:bg-slate-900"].join(" ")}><td className="px-4 py-3 align-top"><input type="checkbox" checked={checked.includes(row.id)} onChange={() => setChecked((s) => s.includes(row.id) ? s.filter((id) => id !== row.id) : [...s, row.id])} className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400" /></td><td className="px-4 py-3"><button type="button" onClick={() => setSelected(row)} className="text-left"><div className="font-medium text-slate-900 dark:text-white">{row.studentName}</div><div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{row.department}</div></button></td><td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{row.registrationNo}</td><td className="px-4 py-3 text-slate-700 dark:text-slate-300">{row.email}</td><td className="px-4 py-3 text-slate-700 dark:text-slate-300">{row.gender}</td><td className="px-4 py-3 text-slate-700 dark:text-slate-300">{row.programClass}</td><td className="px-4 py-3 text-slate-700 dark:text-slate-300"><div>{row.unit}</div><div className="text-xs text-slate-500 dark:text-slate-500">{row.session}</div></td><td className="px-4 py-3 text-slate-700 dark:text-slate-300">{fmt(row.date)}</td><td className="px-4 py-3 text-slate-700 dark:text-slate-300">{row.checkInTime}</td><td className="px-4 py-3"><Pill value={row.status} toneKey={statusTone(row.status)} /></td><td className="px-4 py-3"><Pill value={row.method} toneKey={row.method === "QR" ? "emerald" : row.method === "Code" ? "amber" : row.method === "Link" ? "sky" : "slate"} /></td><td className="px-4 py-3"><div className="flex items-center gap-2"><button type="button" onClick={() => setSelected(row)} className="inline-flex items-center gap-1 rounded-lg border border-slate-300/70 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"><Eye size={14} />View</button><button type="button" className="inline-flex items-center gap-1 rounded-lg border border-slate-300/70 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"><MoreHorizontal size={14} />More</button></div></td></tr>)}</tbody></table></div>
            </section>

            <Insights />

            <section className="rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><div className="text-lg font-semibold text-slate-950 dark:text-white">Report Tools</div><div className="mt-1 text-sm text-slate-500 dark:text-slate-400">Secondary actions are available for reporting, manual review, and session lifecycle control.</div></div><div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => setAction("Export CSV")} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"><FileSpreadsheet size={15} />Export CSV</button><button type="button" onClick={() => setAction("Export PDF")} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"><FileDown size={15} />Export PDF</button><button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"><Printer size={15} />Print Report</button><AdminActionMenu label="More Tools" items={moreTools} align="right" /></div></div></section>
          </div>

          <StudentPanel student={selected} mobile={mobilePanel} onClose={() => setSelected(null)} />
        </section>
      </div>

      <ActionModal action={action} onClose={() => setAction("")} />
    </>
  );
}
