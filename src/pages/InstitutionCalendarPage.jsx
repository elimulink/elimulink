import { useEffect, useMemo, useState } from "react";
import MobileFeatureLandingShell from "../shared/feature-landing/MobileFeatureLandingShell";
import {
  Archive,
  ArrowLeft,
  Bell,
  Bot,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  ExternalLink,
  FileText,
  Filter,
  Grid2X2,
  Grip,
  HelpCircle,
  Link2,
  Menu,
  MoreHorizontal,
  PlusCircle,
  PenLine,
  Pin,
  Plus,
  RefreshCw,
  Rows3,
  Search,
  Settings2,
  Sparkles,
  Star,
  Target,
  Users,
  Video,
  Wand2,
  Trash2,
  X,
} from "lucide-react";

function CalendarWorkspaceModal({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-slate-950/30 backdrop-blur-[1px]" onClick={onClose} />
      <div className="absolute inset-x-0 top-0 mx-auto flex min-h-full max-w-3xl items-start justify-center px-4 py-10">
        <div className="w-full rounded-[30px] border border-slate-200/80 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.14)]">
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-5">
            <div>
              <div className="text-lg font-semibold text-slate-900">{title}</div>
              <div className="mt-1 text-sm text-slate-500">Calendar desktop workspace flow.</div>
            </div>
            <button type="button" onClick={onClose} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50">
              <X size={18} />
            </button>
          </div>
          <div className="px-6 py-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

function formatDateLabel(value) {
  return new Date(value).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

function sameDay(a, b) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function shiftDate(dateValue, days) {
  const next = new Date(dateValue);
  next.setDate(next.getDate() + days);
  return next;
}

const DEFAULT_EVENTS = [
  { id: "evt-1", title: "Biology 101 Lecture", date: "2026-03-26T10:00:00", endDate: "2026-03-26T11:30:00", context: "Room B12 • Faculty of Science", type: "Class" },
  { id: "evt-2", title: "CSC 210 Lab Session", date: "2026-03-26T14:00:00", endDate: "2026-03-26T16:00:00", context: "Lab 3 • Practical block", type: "Lab" },
  { id: "evt-3", title: "Assignment Check-in", date: "2026-03-27T09:00:00", endDate: "2026-03-27T09:45:00", context: "With subgroup lead • Online", type: "Reminder" },
  { id: "evt-4", title: "Department Timetable Review", date: "2026-03-28T13:00:00", endDate: "2026-03-28T14:00:00", context: "Academic office • Scheduling review", type: "Meeting" },
  { id: "evt-5", title: "Midterm Exam Window", date: "2026-03-30T08:00:00", endDate: "2026-03-30T10:00:00", context: "Main hall • Arrival 30 mins early", type: "Exam" },
];

const DEFAULT_TASKS = [
  { id: "tsk-1", title: "Review lab submission rubric", date: "2026-03-26T11:45:00", priority: "High", status: "In progress", estimate: "45 min", assignee: "You", list: "My Tasks", type: "Task" },
  { id: "tsk-2", title: "Prepare focus block for revision", date: "2026-03-27T07:30:00", priority: "Medium", status: "Planned", estimate: "1 hr", assignee: "You", list: "Planner", type: "Focus time" },
  { id: "tsk-3", title: "Transcript follow-up with records office", date: "2026-03-28T09:30:00", priority: "Low", status: "Backlog", estimate: "20 min", assignee: "Admin", list: "Academic Ops", type: "Milestone" },
];

const VIEW_OPTIONS = [
  { key: "day", label: "Day", readiness: "ready" },
  { key: "4days", label: "4 days", readiness: "staged" },
  { key: "week", label: "Week", readiness: "ready" },
  { key: "month", label: "Month", readiness: "ready" },
  { key: "schedule", label: "Schedule", readiness: "staged" },
  { key: "year", label: "Year", readiness: "staged" },
];

const CREATE_OPTIONS = [
  { key: "event", label: "Event", description: "Schedule classes, meetings, and exams." },
  { key: "task", label: "Task", description: "Create work that lives inside the calendar." },
  { key: "focus", label: "Focus time", description: "Reserve time for deep academic work." },
  { key: "ooo", label: "Out of office", description: "Block unavailable academic periods." },
  { key: "appointment", label: "Appointment schedule", description: "Offer bookable advising or office-hour slots." },
];

const INTEGRATION_ITEMS = [
  { key: "meet", label: "Google Meet", status: "Ready for event linking" },
  { key: "drive", label: "Drive attachments", status: "Staged honestly" },
  { key: "zoom", label: "Zoom", status: "Connect later" },
];

function startOfMonth(value) {
  const next = new Date(value);
  next.setDate(1);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addMonths(value, delta) {
  const next = new Date(value);
  next.setMonth(next.getMonth() + delta);
  return next;
}

function sameMonth(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function formatMonthYear(value) {
  return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(value);
}

function startOfWeek(value) {
  const next = new Date(value);
  const day = next.getDay();
  next.setDate(next.getDate() - day);
  next.setHours(0, 0, 0, 0);
  return next;
}

function formatTimeRange(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  return `${startDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })} - ${endDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
}

function getMinutesFromDate(value) {
  const date = new Date(value);
  return date.getHours() * 60 + date.getMinutes();
}

function getObjectTone(type) {
  const normalized = String(type || "").toLowerCase();
  if (normalized.includes("focus")) return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (normalized.includes("task")) return "bg-sky-100 text-sky-800 border-sky-200";
  if (normalized.includes("milestone")) return "bg-violet-100 text-violet-800 border-violet-200";
  if (normalized.includes("meeting")) return "bg-cyan-100 text-cyan-800 border-cyan-200";
  if (normalized.includes("reminder")) return "bg-amber-100 text-amber-800 border-amber-200";
  if (normalized.includes("out of office")) return "bg-rose-100 text-rose-800 border-rose-200";
  return "bg-blue-100 text-blue-800 border-blue-200";
}

function buildMonthCells(anchorDate, events, tasks, selectedDate) {
  const monthStart = startOfMonth(anchorDate);
  const gridStart = startOfWeek(monthStart);
  return Array.from({ length: 42 }).map((_, index) => {
    const date = shiftDate(gridStart, index);
    const eventCount = events.filter((item) => sameDay(item.date, date)).length;
    const taskCount = tasks.filter((item) => sameDay(item.date, date)).length;
    return {
      key: `${date.toISOString()}-${index}`,
      date,
      isCurrentMonth: sameMonth(date, monthStart),
      isSelected: sameDay(date, selectedDate),
      eventCount,
      taskCount,
    };
  });
}

export default function InstitutionCalendarPage({ onBack, onOpenMainMenu }) {
  const [isMobileViewport, setIsMobileViewport] = useState(() => typeof window !== "undefined" ? window.matchMedia("(max-width: 767px)").matches : false);
  const [showDesktopLanding, setShowDesktopLanding] = useState(() => !(typeof window !== "undefined" ? window.matchMedia("(max-width: 767px)").matches : false));
  const [showMobileLanding, setShowMobileLanding] = useState(() => typeof window !== "undefined" ? window.matchMedia("(max-width: 767px)").matches : false);
  const [landingInputValue, setLandingInputValue] = useState("");
  const [view, setView] = useState("today");
  const [selectedDate, setSelectedDate] = useState(new Date("2026-03-26T08:00:00"));
  const [events, setEvents] = useState(DEFAULT_EVENTS);
  const [isLandingMenuOpen, setIsLandingMenuOpen] = useState(false);
  const [isLandingShareOpen, setIsLandingShareOpen] = useState(false);
  const [isLandingSettingsOpen, setIsLandingSettingsOpen] = useState(false);
  const [isLandingUtilityMenuOpen, setIsLandingUtilityMenuOpen] = useState(false);
  const [landingEventMenuId, setLandingEventMenuId] = useState(null);
  const [landingShareInvite, setLandingShareInvite] = useState("");
  const [landingShareAccess, setLandingShareAccess] = useState("institution only");
  const [landingShareStatus, setLandingShareStatus] = useState("");
  const [landingWorkspaceStatus, setLandingWorkspaceStatus] = useState("");
  const [landingDeleteOpen, setLandingDeleteOpen] = useState(false);
  const [landingWorkspaceSettings, setLandingWorkspaceSettings] = useState({
    name: "Calendar Workspace",
    description: "Track today’s schedule, academic reminders, and shared timetable signals from one calm calendar entry point.",
    linkedInstitution: "ElimuLink University",
    defaultView: "today schedule",
    reminderMode: "smart reminders",
    subgroup: "Not linked",
  });
  const [tasks, setTasks] = useState(DEFAULT_TASKS);
  const [desktopView, setDesktopView] = useState("week");
  const [calendarMode, setCalendarMode] = useState("calendar");
  const [desktopAnchorDate, setDesktopAnchorDate] = useState(new Date("2026-03-26T08:00:00"));
  const [desktopSearch, setDesktopSearch] = useState("");
  const [selectedWorkspace, setSelectedWorkspace] = useState("ElimuLink Connect");
  const [selectedUtility, setSelectedUtility] = useState("tasks");
  const [selectedCalendarIds, setSelectedCalendarIds] = useState(["my", "academic"]);
  const [selectedTaskFilter, setSelectedTaskFilter] = useState("all");
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createType, setCreateType] = useState("event");
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [isEventDetailOpen, setIsEventDetailOpen] = useState(false);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [isAiNotesOpen, setIsAiNotesOpen] = useState(false);
  const [isSettingsShellOpen, setIsSettingsShellOpen] = useState(false);
  const [isTemplateCenterOpen, setIsTemplateCenterOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: "",
    date: "2026-03-26",
    start: "10:00",
    end: "11:00",
    allDay: false,
    repeat: "Does not repeat",
    timezone: "Africa/Nairobi",
    guests: "",
    location: "",
    description: "",
    calendar: "ElimuLink Calendar",
    visibility: "Default visibility",
    busy: "Busy",
  });

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
    const handlePointerDown = (event) => {
      if (
        event.target?.closest?.("[data-calendar-landing-menu]") ||
        event.target?.closest?.("[data-calendar-utility-menu]") ||
        event.target?.closest?.("[data-calendar-event-menu]") ||
        event.target?.closest?.("[data-calendar-create-menu]")
      ) {
        return;
      }
      setIsLandingMenuOpen(false);
      setIsLandingUtilityMenuOpen(false);
      setLandingEventMenuId(null);
      setIsCreateMenuOpen(false);
    };

    const handleKeyDown = (event) => {
      if (event.key !== "Escape") return;
      setIsLandingMenuOpen(false);
      setIsLandingUtilityMenuOpen(false);
      setLandingEventMenuId(null);
      setIsCreateMenuOpen(false);
      setIsLandingShareOpen(false);
      setIsLandingSettingsOpen(false);
      setLandingDeleteOpen(false);
      setIsCreateModalOpen(false);
      setIsEventDetailOpen(false);
      setIsTaskDetailOpen(false);
      setIsAiNotesOpen(false);
      setIsSettingsShellOpen(false);
      setIsTemplateCenterOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const selectedDateLabel = useMemo(() => formatDateLabel(selectedDate), [selectedDate]);
  const todaysEvents = useMemo(() => events.filter((item) => sameDay(item.date, selectedDate)), [events, selectedDate]);
  const upcomingEvents = useMemo(() => [...events].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 5), [events]);
  const timelineDays = useMemo(
    () =>
      Array.from({ length: 5 }).map((_, index) => {
        const date = shiftDate(selectedDate, index);
        return {
          key: date.toISOString(),
          label: date.toLocaleDateString(undefined, { weekday: "short", day: "numeric" }),
          date,
          count: events.filter((item) => sameDay(item.date, date)).length,
        };
      }),
    [events, selectedDate]
  );
  const desktopMonthLabel = useMemo(() => formatMonthYear(desktopAnchorDate), [desktopAnchorDate]);
  const desktopMonthCells = useMemo(
    () => buildMonthCells(desktopAnchorDate, events, tasks, selectedDate),
    [desktopAnchorDate, events, tasks, selectedDate]
  );
  const selectedEvent = useMemo(
    () => events.find((item) => item.id === selectedEventId) || null,
    [events, selectedEventId]
  );
  const selectedTask = useMemo(
    () => tasks.find((item) => item.id === selectedTaskId) || null,
    [tasks, selectedTaskId]
  );
  const filteredTasks = useMemo(() => {
    if (selectedTaskFilter === "starred") return tasks.filter((item) => item.priority === "High");
    if (selectedTaskFilter === "my") return tasks.filter((item) => item.assignee === "You");
    return tasks;
  }, [selectedTaskFilter, tasks]);
  const calendarCollections = useMemo(
    () => [
      { id: "my", label: "My calendar", color: "bg-blue-500", active: selectedCalendarIds.includes("my") },
      { id: "academic", label: "Academic timetable", color: "bg-cyan-500", active: selectedCalendarIds.includes("academic") },
      { id: "tasks", label: "Tasks and focus", color: "bg-emerald-500", active: selectedCalendarIds.includes("tasks") },
      { id: "holidays", label: "Holiday calendar", color: "bg-amber-500", active: selectedCalendarIds.includes("holidays") },
    ],
    [selectedCalendarIds]
  );
  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }).map((_, index) => {
        const date = shiftDate(startOfWeek(selectedDate), index);
        return {
          key: date.toISOString(),
          date,
          label: date.toLocaleDateString(undefined, { weekday: "short", day: "numeric" }),
        };
      }),
    [selectedDate]
  );
  const gridObjects = useMemo(() => {
    const eventObjects = events.map((item) => ({ ...item, objectType: "event" }));
    const taskObjects = tasks.map((item) => ({
      id: item.id,
      title: item.title,
      date: item.date,
      endDate: new Date(new Date(item.date).getTime() + 45 * 60 * 1000).toISOString(),
      context: `${item.list} • ${item.assignee}`,
      type: item.type,
      objectType: "task",
      priority: item.priority,
      status: item.status,
      estimate: item.estimate,
    }));
    return [...eventObjects, ...taskObjects];
  }, [events, tasks]);
  const viewObjects = useMemo(() => {
    if (desktopView === "month") {
      return gridObjects.filter((item) => sameMonth(new Date(item.date), desktopAnchorDate));
    }
    if (desktopView === "day") {
      return gridObjects.filter((item) => sameDay(item.date, selectedDate));
    }
    return gridObjects.filter((item) => weekDays.some((day) => sameDay(item.date, day.date)));
  }, [desktopAnchorDate, desktopView, gridObjects, selectedDate, weekDays]);

  function openEvent(item) {
    setSelectedDate(new Date(item.date));
    setShowDesktopLanding(false);
    setShowMobileLanding(false);
    setView("today");
  }

  function renameCalendarWorkspace() {
    const nextName = window.prompt("Rename calendar workspace", landingWorkspaceSettings.name);
    if (!nextName) return;
    const normalized = nextName.trim();
    if (!normalized) return;
    setLandingWorkspaceSettings((prev) => ({ ...prev, name: normalized }));
    setLandingWorkspaceStatus("Calendar workspace renamed.");
  }

  function moveCalendarWorkspace() {
    setLandingWorkspaceStatus("Move to workspace is prepared here as a safe frontend-first Calendar action.");
  }

  function archiveCalendarWorkspace() {
    setLandingWorkspaceStatus("Archive is prepared here as a safe frontend-first Calendar action.");
  }

  function renameEvent(id) {
    const target = events.find((item) => item.id === id);
    if (!target) return;
    const nextName = window.prompt("Rename event", target.title);
    if (!nextName) return;
    const normalized = nextName.trim();
    if (!normalized) return;
    setEvents((prev) => prev.map((item) => (item.id === id ? { ...item, title: normalized } : item)));
  }

  function archiveEvent(id) {
    const target = events.find((item) => item.id === id);
    if (!target) return;
    setLandingWorkspaceStatus(`${target.title} is prepared for archive as a safe frontend-first Calendar action.`);
  }

  function deleteEvent(id) {
    const target = events.find((item) => item.id === id);
    if (!target) return;
    const confirmed = window.confirm(`Delete "${target.title}" from this calendar workspace?`);
    if (!confirmed) return;
    setEvents((prev) => prev.filter((item) => item.id !== id));
  }

  function toggleCalendarCollection(id) {
    setSelectedCalendarIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function openCreateFlow(type = "event") {
    setCreateType(type);
    setCreateForm((prev) => ({
      ...prev,
      title: type === "task" ? "New task" : type === "focus" ? "Focus block" : type === "appointment" ? "Office hour schedule" : "New event",
    }));
    setIsCreateMenuOpen(false);
    setIsCreateModalOpen(true);
  }

  function saveCreateFlow() {
    if (createType === "task") {
      const nextTask = {
        id: `tsk-${Date.now()}`,
        title: createForm.title || "New task",
        date: `${createForm.date}T${createForm.start || "09:00"}:00`,
        priority: "Medium",
        status: "Planned",
        estimate: "45 min",
        assignee: "You",
        list: "My Tasks",
        type: "Task",
      };
      setTasks((prev) => [nextTask, ...prev]);
      setLandingWorkspaceStatus(`Task "${nextTask.title}" was added to the planner as a desktop frontend flow.`);
    } else {
      const start = `${createForm.date}T${createForm.start || "09:00"}:00`;
      const end = `${createForm.date}T${createForm.end || "10:00"}:00`;
      const nextEvent = {
        id: `evt-${Date.now()}`,
        title: createForm.title || "New event",
        date: start,
        endDate: end,
        context: createForm.location || "Desktop calendar draft",
        type:
          createType === "focus"
            ? "Focus time"
            : createType === "ooo"
              ? "Out of office"
              : createType === "appointment"
                ? "Appointment"
                : "Event",
      };
      setEvents((prev) => [nextEvent, ...prev]);
      setLandingWorkspaceStatus(`Calendar object "${nextEvent.title}" was added as a desktop frontend flow.`);
    }
    setIsCreateModalOpen(false);
  }

  function openEventDetail(item) {
    setSelectedEventId(item.id);
    setIsEventDetailOpen(true);
  }

  function openTaskDetail(item) {
    setSelectedTaskId(item.id);
    setIsTaskDetailOpen(true);
  }

  if (!isMobileViewport && showDesktopLanding) {
    return (
      <div className="min-h-[100dvh] bg-[linear-gradient(180deg,#f8fafc_0%,#f4f7fb_48%,#eef3f9_100%)] px-6 py-6 dark:bg-[linear-gradient(180deg,#06111f_0%,#0a1527_48%,#0c1830_100%)]">
        <div className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-7xl flex-col gap-6">
          <div className="relative flex items-start justify-between gap-6 bg-transparent px-7 py-6">
            <div className="absolute -left-5 top-1" data-calendar-landing-menu>
              <button type="button" onClick={() => setIsLandingMenuOpen((prev) => !prev)} className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-[0_12px_30px_rgba(15,23,42,0.06)] hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">
                {isLandingMenuOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
              {isLandingMenuOpen ? (
                <div className="mt-3 w-64 rounded-[24px] border border-slate-200 bg-white p-3 shadow-[0_24px_60px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-[#0d182b] dark:shadow-[0_24px_60px_rgba(2,8,23,0.45)]">
                  <button type="button" onClick={() => setIsLandingMenuOpen(false)} className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"><span>Calendar home</span><ChevronDown size={16} /></button>
                  <button type="button" onClick={() => { setIsLandingMenuOpen(false); setShowDesktopLanding(false); setView("today"); }} className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"><span>Today’s schedule</span><Clock3 size={16} /></button>
                  <button type="button" onClick={() => { setIsLandingMenuOpen(false); setShowDesktopLanding(false); setView("week"); }} className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"><span>Open timetable</span><CalendarDays size={16} /></button>
                </div>
              ) : null}
            </div>

            <div className="max-w-3xl">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300">Institution Workspace</div>
              <div className="mt-3 flex items-center gap-3">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-transparent text-slate-700 dark:text-slate-100"><CalendarDays size={22} /></span>
                <div>
                  <h1 className="text-3xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-slate-50">Calendar</h1>
                  <p className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-300">Review upcoming academic events, timetable highlights, and reminders before entering the full calendar workspace.</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-full bg-white/70 p-1.5 shadow-[0_8px_22px_rgba(15,23,42,0.04)]" data-calendar-utility-menu>
              <button type="button" onClick={() => { setLandingShareStatus(""); setIsLandingShareOpen(true); }} className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200/70 bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"><Copy size={15} />Share</button>
              <button type="button" onClick={() => { setLandingWorkspaceStatus(""); setIsLandingSettingsOpen(true); }} className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200/70 bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"><Rows3 size={15} />Settings</button>
              <div className="relative">
                <button type="button" onClick={() => setIsLandingUtilityMenuOpen((prev) => !prev)} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/70 bg-white text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"><MoreHorizontal size={16} /></button>
                {isLandingUtilityMenuOpen ? (
                  <div className="absolute right-0 top-14 z-30 w-72 rounded-[26px] border border-slate-200/80 bg-white p-2.5 shadow-[0_22px_56px_rgba(15,23,42,0.12)]">
                    <button type="button" onClick={() => { setIsLandingUtilityMenuOpen(false); renameCalendarWorkspace(); }} className="flex w-full items-center gap-3 rounded-[18px] px-4 py-3 text-left text-[14px] text-slate-700 transition hover:bg-slate-50"><PenLine size={16} /><span>Rename workspace</span></button>
                    <button type="button" onClick={() => { setIsLandingUtilityMenuOpen(false); moveCalendarWorkspace(); }} className="flex w-full items-center justify-between gap-3 rounded-[18px] px-4 py-3 text-left text-[14px] text-slate-700 transition hover:bg-slate-50"><span className="flex items-center gap-3"><Rows3 size={16} /><span>Move to workspace / project</span></span><ChevronDown size={15} className="-rotate-90 text-slate-400" /></button>
                    <button type="button" onClick={() => { setIsLandingUtilityMenuOpen(false); archiveCalendarWorkspace(); }} className="mt-1 flex w-full items-center gap-3 rounded-[18px] px-4 py-3 text-left text-[14px] text-slate-700 transition hover:bg-slate-50"><Archive size={16} /><span>Archive</span></button>
                    <div className="my-2 border-t border-slate-100" />
                    <button type="button" onClick={() => { setIsLandingUtilityMenuOpen(false); setLandingDeleteOpen(true); }} className="flex w-full items-center gap-3 rounded-[18px] px-4 py-3 text-left text-[14px] text-rose-600 transition hover:bg-rose-50"><Trash2 size={16} /><span>Delete</span></button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid flex-1 grid-cols-12 gap-6">
            <section className="col-span-12 rounded-[30px] border border-slate-200/80 bg-white/92 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-[#0d182b]/96 dark:shadow-[0_20px_50px_rgba(2,8,23,0.34)] lg:col-span-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold text-slate-950 dark:text-slate-50">Upcoming events</div>
                  <div className="mt-1 text-sm text-slate-700 dark:text-slate-300">A clean schedule-first entry point into the Institution calendar workspace.</div>
                </div>
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">{upcomingEvents.length} events</div>
              </div>
              <div className="mt-6 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    ["Today", String(todaysEvents.length), "Events due now"],
                    ["Upcoming", String(upcomingEvents.length), "Scheduled next"],
                    ["Default view", landingWorkspaceSettings.defaultView, "Current mode"],
                    ["Reminder mode", landingWorkspaceSettings.reminderMode, "Notification rhythm"],
                  ].map(([label, value, sub]) => (
                    <div key={label} className="rounded-[22px] border border-slate-200/80 bg-white px-4 py-4 dark:border-white/10 dark:bg-[#101c31]">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">{label}</div>
                      <div className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-slate-50">{value}</div>
                      <div className="mt-1 text-sm text-slate-700 dark:text-slate-300">{sub}</div>
                    </div>
                  ))}
                </div>
                <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-[#101c31]">
                  <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-600 dark:text-slate-300">Week rhythm</div>
                  <div className="mt-1 text-sm text-slate-700 dark:text-slate-300">A quick view of event intensity across the current academic week.</div>
                  <div className="mt-5 flex h-28 items-end gap-3">
                    {["Mon", "Tue", "Wed", "Thu", "Fri"].map((label, index) => (
                      <div key={label} className="flex flex-1 flex-col items-center gap-2">
                        <div className="w-full rounded-t-[18px] bg-[linear-gradient(180deg,#2563eb_0%,#14b8a6_100%)]" style={{ height: `${[44, 62, 78, 56, 70][index]}%` }} />
                        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600 dark:text-slate-400">{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-6">
                {upcomingEvents.map((item) => (
                  <div key={item.id} data-calendar-event-menu className="group relative flex items-start justify-between gap-4 border-t border-slate-200/70 px-5 py-5 first:border-t-0 hover:bg-slate-50/75">
                    <button type="button" onClick={() => openEvent(item)} className="min-w-0 flex flex-1 items-start gap-4 text-left">
                      <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600"><CalendarDays size={18} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-lg font-semibold tracking-[-0.02em] text-slate-950">{item.title}</span>
                        <span className="mt-1 block text-sm leading-6 text-slate-600">{new Date(item.date).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} • {item.context}</span>
                      </span>
                    </button>
                    <div className="flex items-start gap-3">
                      <div className="rounded-full bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{item.type}</div>
                      <div className="relative">
                        <button type="button" onClick={(event) => { event.stopPropagation(); setLandingEventMenuId((prev) => prev === item.id ? null : item.id); }} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-transparent bg-white/0 text-slate-400 opacity-0 transition hover:border-slate-200 hover:bg-white hover:text-slate-700 group-hover:opacity-100 group-focus-within:opacity-100"><MoreHorizontal size={16} /></button>
                        {landingEventMenuId === item.id ? (
                          <div className="absolute right-0 top-11 z-20 w-60 rounded-[24px] border border-slate-200/80 bg-white p-2.5 shadow-[0_22px_56px_rgba(15,23,42,0.12)]">
                            <button type="button" onClick={() => { setLandingEventMenuId(null); renameEvent(item.id); }} className="flex w-full items-center gap-3 rounded-[16px] px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50"><PenLine size={16} /><span>Rename</span></button>
                            <button type="button" onClick={() => { setLandingEventMenuId(null); setLandingWorkspaceStatus(`${item.title} is prepared to move as a safe frontend-first Calendar action.`); }} className="flex w-full items-center gap-3 rounded-[16px] px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50"><Rows3 size={16} /><span>Move</span></button>
                            <button type="button" onClick={() => { setLandingEventMenuId(null); archiveEvent(item.id); }} className="flex w-full items-center gap-3 rounded-[16px] px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50"><Archive size={16} /><span>Archive</span></button>
                            <div className="my-2 border-t border-slate-100" />
                            <button type="button" onClick={() => { setLandingEventMenuId(null); deleteEvent(item.id); }} className="flex w-full items-center gap-3 rounded-[16px] px-4 py-3 text-left text-sm text-rose-600 hover:bg-rose-50"><Trash2 size={16} /><span>Delete</span></button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <aside className="col-span-12 flex flex-col gap-5 lg:col-span-4">
              <section className="rounded-[28px] border border-slate-200/80 bg-white/92 px-5 py-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
                <div className="flex items-center justify-end">
                  <img
                    src="/favicon.png"
                    alt="ElimuLink"
                    className="h-16 w-auto object-contain"
                  />
                </div>
              </section>

              <section className="rounded-[30px] border border-slate-200/80 bg-white/92 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-lg font-semibold text-slate-900">New work</div>
                    <div className="mt-2 text-sm leading-7 text-slate-600">Open today’s schedule or the timetable workspace without losing the clean landing context.</div>
                  </div>
                  <button type="button" onClick={() => { setShowDesktopLanding(false); setView("today"); }} className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-700 shadow-[inset_0_0_0_1px_rgba(226,232,240,0.8)] hover:bg-slate-100"><Plus size={20} /></button>
                </div>
                <button type="button" onClick={() => { setShowDesktopLanding(false); setView("today"); }} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-900">Open today’s schedule</button>
              </section>

              <section className="rounded-[30px] border border-slate-200/80 bg-white/92 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-slate-900">Schedule snapshot</div>
                    <div className="mt-1 text-sm text-slate-500">A quick read on the active calendar workspace.</div>
                  </div>
                  <button type="button" onClick={() => setIsLandingSettingsOpen(true)} className="text-sm font-medium text-slate-500 hover:text-slate-700">Open settings</button>
                </div>
                <div className="mt-5 space-y-3">
                  {[
                    ["Default view", landingWorkspaceSettings.defaultView],
                    ["Reminder mode", landingWorkspaceSettings.reminderMode],
                    ["Selected day", selectedDateLabel],
                    ["Today’s events", String(todaysEvents.length)],
                    ["Subgroup", landingWorkspaceSettings.subgroup],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white px-4 py-3">
                      <span className="text-sm text-slate-500">{label}</span>
                      <span className="text-sm font-semibold text-slate-900">{value}</span>
                    </div>
                  ))}
                </div>
                {landingWorkspaceStatus ? <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">{landingWorkspaceStatus}</div> : null}
              </section>

              <section className="rounded-[30px] border border-slate-200/80 bg-white/92 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-slate-900">Quick actions</div>
                    <div className="mt-1 text-sm text-slate-500">Compact calendar shortcuts for scheduling and reminders.</div>
                  </div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Calendar</div>
                </div>
                <div className="mt-5 space-y-3">
                  {[
                    ["New event", "Prepare a safe frontend-first event creation shortcut.", Plus, () => setLandingWorkspaceStatus("New event is prepared here as a safe frontend-first Calendar shortcut.")],
                    ["Timetable", "Open the existing timetable workspace view.", CalendarDays, () => { setShowDesktopLanding(false); setView("week"); }],
                    ["Reminders", "Review academic reminders and upcoming prompts.", Clock3, () => setLandingWorkspaceStatus("Reminders are prepared here as a safe frontend-first Calendar shortcut.")],
                    ["Subgroup", "Link subgroup schedule context safely.", Sparkles, () => setLandingWorkspaceStatus("Subgroup routing is prepared here as a safe frontend-first Calendar shortcut.")],
                  ].map(([label, desc, Icon, action]) => (
                    <button key={label} type="button" onClick={action} className="flex w-full items-center gap-4 rounded-[22px] border border-slate-200 bg-white px-4 py-4 text-left transition hover:bg-slate-50">
                      <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600"><Icon size={18} /></span>
                      <span className="min-w-0">
                        <span className="block text-base font-semibold text-slate-950">{label}</span>
                        <span className="mt-1 block text-sm leading-6 text-slate-500">{desc}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        </div>

        <CalendarWorkspaceModal open={isLandingShareOpen} title="Share Calendar workspace" onClose={() => setIsLandingShareOpen(false)}>
          <div className="space-y-5">
            <div>
              <div className="text-sm font-semibold text-slate-900">Invite by email</div>
              <input value={landingShareInvite} onChange={(event) => setLandingShareInvite(event.target.value)} placeholder="lecturer@elimulink.edu" className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-300" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">Access level</div>
              <div className="mt-2 grid grid-cols-2 gap-3">
                {["only invited", "anyone with link", "institution only", "subgroup only"].map((option) => (
                  <button key={option} type="button" onClick={() => setLandingShareAccess(option)} className={["rounded-2xl border px-4 py-3 text-left text-sm capitalize transition", landingShareAccess === option ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"].join(" ")}>{option}</button>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">Share for Calendar stays frontend-first in this pass so it does not invent scheduling backend logic.</div>
            {landingShareStatus ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{landingShareStatus}</div> : null}
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setIsLandingShareOpen(false)} className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Close</button>
              <button type="button" onClick={() => setLandingShareStatus("Calendar workspace sharing is prepared here as a safe frontend-first flow.")} className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-900">Save share setup</button>
            </div>
          </div>
        </CalendarWorkspaceModal>

        <CalendarWorkspaceModal open={isLandingSettingsOpen} title="Calendar workspace settings" onClose={() => setIsLandingSettingsOpen(false)}>
          <div className="space-y-5">
            <label className="block"><div className="text-sm font-semibold text-slate-900">Workspace name</div><input value={landingWorkspaceSettings.name} onChange={(event) => setLandingWorkspaceSettings((prev) => ({ ...prev, name: event.target.value }))} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-300" /></label>
            <label className="block"><div className="text-sm font-semibold text-slate-900">Description</div><textarea value={landingWorkspaceSettings.description} onChange={(event) => setLandingWorkspaceSettings((prev) => ({ ...prev, description: event.target.value }))} rows={4} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-300" /></label>
            <div className="grid grid-cols-2 gap-4">
              <label className="block"><div className="text-sm font-semibold text-slate-900">Default view</div><input value={landingWorkspaceSettings.defaultView} onChange={(event) => setLandingWorkspaceSettings((prev) => ({ ...prev, defaultView: event.target.value }))} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-300" /></label>
              <label className="block"><div className="text-sm font-semibold text-slate-900">Reminder mode</div><input value={landingWorkspaceSettings.reminderMode} onChange={(event) => setLandingWorkspaceSettings((prev) => ({ ...prev, reminderMode: event.target.value }))} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-300" /></label>
            </div>
            {landingWorkspaceStatus ? <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">{landingWorkspaceStatus}</div> : null}
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setIsLandingSettingsOpen(false)} className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Close</button>
              <button type="button" onClick={() => setLandingWorkspaceStatus("Calendar workspace settings are saved locally for this desktop landing pass.")} className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-900">Save settings</button>
            </div>
          </div>
        </CalendarWorkspaceModal>

        <CalendarWorkspaceModal open={landingDeleteOpen} title="Delete Calendar workspace" onClose={() => setLandingDeleteOpen(false)}>
          <div className="space-y-5">
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm leading-6 text-rose-700">Deleting the Calendar workspace is not connected to backend deletion in this pass. This stays a safe frontend-first confirmation only.</div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setLandingDeleteOpen(false)} className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
              <button type="button" onClick={() => { setLandingDeleteOpen(false); setLandingWorkspaceStatus("Delete is prepared here as a safe frontend-first Calendar action."); }} className="rounded-full bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-700">Confirm delete</button>
            </div>
          </div>
        </CalendarWorkspaceModal>
      </div>
    );
  }

  const timelineEvents = view === "today" ? todaysEvents : upcomingEvents;

  if (isMobileViewport && showMobileLanding) {
    return (
      <MobileFeatureLandingShell
        featureName="Calendar"
        featureSubtitle="Schedule rhythm and upcoming events"
        featureDescription="Review the next academic events, jump into timetable views, and keep reminder context close without opening the full workspace first."
        featureIcon={CalendarDays}
        workspaceLabel={landingWorkspaceSettings.name}
        workspaceHint={landingWorkspaceSettings.description}
        workspaceBadge="Institution workspace"
        institutionLabel={landingWorkspaceSettings.linkedInstitution}
        institutionDescription="Academic timing, reminders, and timetable context in one calm mobile landing."
        institutionMeta={selectedDateLabel}
        quickActions={[
          { key: "today", label: "Today", icon: Clock3, onClick: () => { setView("today"); setShowMobileLanding(false); } },
          { key: "week", label: "Timetable", icon: CalendarDays, onClick: () => { setView("week"); setShowMobileLanding(false); } },
          { key: "month", label: "Month", icon: Rows3, onClick: () => { setView("month"); setShowMobileLanding(false); } },
          { key: "reminders", label: "Reminders", icon: Sparkles, onClick: () => { setLandingWorkspaceStatus("Reminder settings stay in the calendar workspace for now."); setShowMobileLanding(false); } },
        ]}
        utilityActions={[
          { key: "rename-workspace", label: "Rename workspace", icon: PenLine, onClick: renameCalendarWorkspace },
          { key: "move-workspace", label: "Move workspace", icon: Rows3, onClick: moveCalendarWorkspace },
          { key: "archive-workspace", label: "Archive workspace", icon: Archive, onClick: archiveCalendarWorkspace },
          {
            key: "delete-workspace",
            label: "Delete workspace",
            icon: Trash2,
            destructive: true,
            onClick: () => {
              setLandingWorkspaceStatus("Delete stays protected in the full calendar workspace.");
              setShowMobileLanding(false);
            },
          },
        ]}
        shareConfig={{
          title: "Share Calendar",
          description: "Share the calendar workspace with a clear mobile flow for collaborators and access choices.",
          emailLabel: "Invite attendee",
          emailPlaceholder: "staff@example.com",
          accessLabel: "Access level",
          accessOptions: [
            { value: "institution only", label: "Institution only" },
            { value: "timetable view", label: "Timetable view" },
            { value: "reminder access", label: "Reminder access" },
          ],
          defaultAccess: landingShareAccess,
          membersTitle: "Calendar owner",
          members: [{ key: "owner", label: "Calendar workspace", role: "Owner" }],
          privacyNote: "Calendar sharing is still frontend-first here, but the mobile share interaction is now a real surface.",
          submitLabel: "Save share setup",
        }}
        items={timelineEvents.map((item) => ({
          id: item.id,
          title: item.title,
          preview: item.context,
          meta: item.type,
          actions: [
            { key: "share", label: "Share", icon: Copy, onClick: () => setLandingShareStatus(`Sharing for "${item.title}" is prepared here as a safe frontend-first action.`) },
            { key: "open", label: "Open event", icon: CalendarDays, onClick: () => openEvent(item) },
            { key: "rename", label: "Rename", icon: PenLine, onClick: () => renameEvent(item.id) },
            { key: "archive", label: "Archive", icon: Archive, onClick: () => archiveEvent(item.id) },
            { key: "delete", label: "Delete", icon: Trash2, destructive: true, onClick: () => deleteEvent(item.id) },
          ],
        }))}
        inputPlaceholder="New event title"
        inputValue={landingInputValue}
        onInputChange={setLandingInputValue}
        onInputSubmit={(value) => {
          setLandingWorkspaceStatus(`Saved "${value}" as the next calendar event draft.`);
          setShowMobileLanding(false);
          setLandingInputValue("");
        }}
        onMenu={onOpenMainMenu || onBack}
        onShare={() => {
          setLandingShareStatus("Share is prepared here as a safe frontend-first Calendar action.");
          setShowMobileLanding(false);
        }}
        onShareSubmit={async ({ email, access }) => {
          setLandingShareInvite(email);
          setLandingShareAccess(access);
          setLandingShareStatus(email ? `Calendar sharing prepared for ${email}.` : `Calendar access saved as ${access}.`);
          return { status: email ? `Calendar sharing prepared for ${email}.` : `Calendar access saved as ${access}.` };
        }}
        onSettings={() => {
          setView("today");
          setShowMobileLanding(false);
        }}
        onNewWork={() => {
          setLandingWorkspaceStatus("New event is prepared here as a safe frontend-first Calendar shortcut.");
          setShowMobileLanding(false);
        }}
        onStartCall={() => {
          setView("week");
          setShowMobileLanding(false);
        }}
        onOpenItem={openEvent}
        emptyStateTitle="No events scheduled"
        emptyState="This schedule is clear right now. Add an event or move into the calendar workspace."
      />
    );
  }

  return (
    <div className="min-h-[100dvh] bg-slate-100 px-6 py-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setShowDesktopLanding(true)} className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"><ArrowLeft size={12} />Workspace</button>
            {isMobileViewport ? (
              <button type="button" onClick={() => setShowMobileLanding(true)} className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50">Landing</button>
            ) : null}
            <div>
              <div className="text-xl font-extrabold text-slate-900">Calendar</div>
              <div className="text-sm text-slate-600">Academic schedule, timetable rhythm, and event reminders.</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {["today", "week", "month"].map((item) => (
              <button key={item} type="button" onClick={() => setView(item)} className={["rounded-full border px-4 py-2 text-sm font-semibold transition", view === item ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"].join(" ")}>{item === "today" ? "Today" : item === "week" ? "Week" : "Month"}</button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <section className="col-span-12 rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm lg:col-span-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-lg font-semibold text-slate-900">{view === "today" ? "Today’s schedule" : view === "week" ? "Week preview" : "Month preview"}</div>
                <div className="mt-1 text-sm text-slate-500">{selectedDateLabel}</div>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setSelectedDate((prev) => shiftDate(prev, -1))} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"><ChevronLeft size={16} /></button>
                <button type="button" onClick={() => setSelectedDate(new Date("2026-03-26T08:00:00"))} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Today</button>
                <button type="button" onClick={() => setSelectedDate((prev) => shiftDate(prev, 1))} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"><ChevronRight size={16} /></button>
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-5">
              {timelineDays.map((item) => (
                <button key={item.key} type="button" onClick={() => setSelectedDate(item.date)} className={["rounded-[24px] border px-4 py-4 text-left transition", sameDay(item.date, selectedDate) ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-white"].join(" ")}>
                  <div className="text-sm font-semibold">{item.label}</div>
                  <div className={["mt-1 text-xs", sameDay(item.date, selectedDate) ? "text-slate-200" : "text-slate-500"].join(" ")}>{item.count} scheduled</div>
                </button>
              ))}
            </div>

            <div className="mt-6 space-y-3">
              {timelineEvents.length ? (
                timelineEvents.map((item) => (
                  <div key={item.id} className="rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-base font-semibold text-slate-900">{item.title}</div>
                        <div className="mt-1 text-sm text-slate-600">{new Date(item.date).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} - {new Date(item.endDate).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</div>
                        <div className="mt-1 text-sm text-slate-500">{item.context}</div>
                      </div>
                      <div className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{item.type}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50/80 px-6 py-10 text-center">
                  <div className="text-lg font-semibold text-slate-900">No events scheduled</div>
                  <div className="mt-2 text-sm text-slate-500">This day is clear right now.</div>
                </div>
              )}
            </div>
          </section>

          <aside className="col-span-12 flex flex-col gap-5 lg:col-span-4">
            <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-lg font-semibold text-slate-900">Schedule snapshot</div>
              <div className="mt-5 space-y-3">
                {[
                  ["Selected day", selectedDateLabel],
                  ["Today’s events", String(todaysEvents.length)],
                  ["Upcoming events", String(upcomingEvents.length)],
                  ["Reminder mode", landingWorkspaceSettings.reminderMode],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <span className="text-sm text-slate-500">{label}</span>
                    <span className="text-sm font-semibold text-slate-900">{value}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-lg font-semibold text-slate-900">Quick entry</div>
              <div className="mt-2 text-sm text-slate-500">Keep scheduling actions close without crowding the workspace.</div>
              <div className="mt-5 space-y-3">
                <button type="button" onClick={() => setLandingWorkspaceStatus("New event is prepared here as a safe frontend-first Calendar shortcut.")} className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-white"><Plus size={16} />New event</button>
                <button type="button" onClick={() => setView("week")} className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-white"><CalendarDays size={16} />View timetable</button>
                <button type="button" onClick={() => onBack?.()} className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-white"><ArrowLeft size={16} />Back to NewChat</button>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
