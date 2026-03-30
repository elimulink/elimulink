import { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Route, Timer } from "lucide-react";
import { getStoredPreferences, saveStoredPreferences } from "../lib/userSettings";

const CADENCE_OPTIONS = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Biweekly" },
  { value: "monthly", label: "Monthly" },
];

const STUDY_DEFAULT_OPTIONS = [
  { value: "Balanced", label: "Balanced" },
  { value: "Exam season", label: "Exam season" },
  { value: "Deadline focus", label: "Deadline focus" },
];

const REMINDER_OPTIONS = [
  { value: "15 minutes before", label: "15 minutes before" },
  { value: "30 minutes before", label: "30 minutes before" },
  { value: "1 hour before", label: "1 hour before" },
];

const TIMING_PREFERENCE_OPTIONS = [
  { value: "Respect my local timezone", label: "Respect my local timezone" },
  { value: "Prefer institution timezone", label: "Prefer institution timezone" },
  { value: "Ask me when timing changes", label: "Ask me when timing changes" },
];

function surfaceClasses(extra = "") {
  return `rounded-[28px] bg-white/96 shadow-[0_16px_48px_rgba(15,23,42,0.05)] ring-1 ring-slate-200/75 ${extra}`.trim();
}

function MobilePageBar({ title, onBack }) {
  return (
    <div className="sticky top-0 z-10 bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(248,250,252,0.92)_72%,rgba(248,250,252,0))] px-4 pt-3 pb-4 backdrop-blur-[2px]">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/80"
          aria-label="Back"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="min-w-0 flex-1 pt-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Institution settings</div>
          <div className="mt-0.5 text-[1.35rem] font-semibold leading-none tracking-[-0.02em] text-slate-950">{title}</div>
        </div>
      </div>
    </div>
  );
}

function SectionHeading({ title, description }) {
  return (
    <div className="px-1 pb-2">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{title}</div>
      {description ? <div className="mt-1 text-[13px] leading-5 text-slate-500">{description}</div> : null}
    </div>
  );
}

function ToggleRow({ label, subtitle, checked, onChange, icon = null, showDivider = false }) {
  const Icon = icon;
  return (
    <div className={[showDivider ? "border-t border-slate-200/80" : "", "px-1 py-4"].join(" ")}>
      <div className="flex items-center gap-3">
        {Icon ? (
          <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-slate-700 ring-1 ring-slate-200/75">
            <Icon size={17} />
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-medium tracking-[-0.01em] text-slate-950">{label}</div>
          <div className="mt-0.5 text-[13px] leading-5 text-slate-500">{subtitle}</div>
        </div>
        <button
          type="button"
          onClick={() => onChange(!checked)}
          className={[
            "relative h-6 w-11 shrink-0 rounded-full transition",
            checked ? "bg-slate-900" : "bg-slate-300",
          ].join(" ")}
          aria-pressed={checked}
        >
          <span
            className={[
              "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition",
              checked ? "left-5" : "left-0.5",
            ].join(" ")}
          />
        </button>
      </div>
    </div>
  );
}

function SelectorRow({ label, subtitle, value, onClick, icon = null, showDivider = false, note = "" }) {
  const Icon = icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex w-full items-center gap-3 px-1 py-4 text-left transition",
        showDivider ? "border-t border-slate-200/80" : "",
      ].join(" ")}
    >
      {Icon ? (
        <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-slate-700 ring-1 ring-slate-200/75">
          <Icon size={17} />
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-medium tracking-[-0.01em] text-slate-950">{label}</div>
        <div className="mt-0.5 text-[13px] leading-5 text-slate-500">
          {value}
          {subtitle ? <span className="ml-1 text-slate-400">· {subtitle}</span> : null}
          {note ? <span className="ml-1 text-slate-400">{note}</span> : null}
        </div>
      </div>
      <ChevronRight size={18} className="shrink-0 text-slate-300" />
    </button>
  );
}

function SelectionSheet({ open, title, subtitle, options, selectedValue, onClose, onSelect }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40">
      <button type="button" className="absolute inset-0 bg-slate-950/35" aria-label="Close" onClick={onClose} />
      <div
        className="absolute inset-x-0 bottom-0 rounded-t-[30px] bg-white px-4 pt-3 shadow-[0_-22px_60px_rgba(15,23,42,0.22)] ring-1 ring-slate-200/80"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto h-1.5 w-12 rounded-full bg-slate-200" />
        <div className="px-1 pt-4 pb-2">
          <div className="text-[1.1rem] font-medium tracking-[-0.02em] text-slate-950">{title}</div>
          {subtitle ? <div className="mt-1 text-[13px] leading-5 text-slate-500">{subtitle}</div> : null}
        </div>
        <div className="mt-2 overflow-hidden rounded-[24px] bg-slate-50/90 ring-1 ring-slate-200/80">
          {options.map((option, index) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onSelect(option.value);
                onClose();
              }}
              className={[
                "flex w-full items-center gap-3 px-4 py-4 text-left transition",
                index > 0 ? "border-t border-slate-200/80" : "",
              ].join(" ")}
            >
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-medium text-slate-950">{option.label}</div>
              </div>
              {selectedValue === option.value ? (
                <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-950 text-white text-[11px] font-semibold">
                  ✓
                </div>
              ) : null}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function InstitutionMobileSchedulesSettingsPage({ user, onBack }) {
  const uid = user?.uid || null;
  const [openSheet, setOpenSheet] = useState("");
  const [prefs, setPrefs] = useState(() =>
    getStoredPreferences(
      {
        scheduleClassReminders: true,
        scheduleAssignmentReminders: true,
        scheduleReportCadence: "weekly",
        scheduleCalendarSync: false,
        scheduleStudyDefault: "Balanced",
        scheduleReminderLeadTime: "30 minutes before",
        scheduleTimingPreference: "Respect my local timezone",
      },
      uid,
    ),
  );

  function savePrefs(nextPrefs) {
    setPrefs(nextPrefs);
    saveStoredPreferences(nextPrefs, uid);
  }

  function updatePref(key, value) {
    savePrefs({
      ...prefs,
      [key]: value,
    });
  }

  return (
    <div className="min-h-[100dvh] bg-[linear-gradient(180deg,#fbfcfe_0%,#f6f8fb_100%)]">
      <MobilePageBar title="Schedules" onBack={onBack} />

      <div className="px-4 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <section className={surfaceClasses("px-4 py-4")}>
          <SectionHeading title="Reminders" description="Control the main academic reminders that appear in your schedule-related flow." />
          <ToggleRow
            label="Class reminders"
            subtitle="Enable reminders for upcoming classes and timetable sessions."
            checked={prefs.scheduleClassReminders !== false}
            onChange={(next) => updatePref("scheduleClassReminders", next)}
            icon={CalendarDays}
          />
          <ToggleRow
            label="Assignment reminders"
            subtitle="Stay ahead of deadlines with assignment reminder prompts."
            checked={prefs.scheduleAssignmentReminders !== false}
            onChange={(next) => updatePref("scheduleAssignmentReminders", next)}
            icon={Route}
            showDivider
          />
        </section>

        <section className={surfaceClasses("mt-4 px-4 py-3")}>
          <SectionHeading title="Timing" description="Keep timing preferences simple and readable on mobile." />
          <SelectorRow
            label="Reminder timing"
            value={prefs.scheduleReminderLeadTime || "30 minutes before"}
            subtitle="Lead time"
            onClick={() => setOpenSheet("lead-time")}
            icon={Clock3}
          />
          <SelectorRow
            label="Timing preference"
            value={prefs.scheduleTimingPreference || "Respect my local timezone"}
            subtitle="Schedule context"
            onClick={() => setOpenSheet("timing-preference")}
            icon={Timer}
            showDivider
          />
        </section>

        <section className={surfaceClasses("mt-4 px-4 py-3")}>
          <SectionHeading title="Cadence" description="Choose how often academic schedule summaries should surface." />
          <SelectorRow
            label="Report cadence"
            value={CADENCE_OPTIONS.find((option) => option.value === prefs.scheduleReportCadence)?.label || "Weekly"}
            onClick={() => setOpenSheet("cadence")}
            icon={Route}
          />
          <SelectorRow
            label="Study schedule default"
            value={prefs.scheduleStudyDefault || "Balanced"}
            subtitle="Study mode"
            onClick={() => setOpenSheet("study-default")}
            icon={CalendarDays}
            showDivider
          />
        </section>

        <section className={surfaceClasses("mt-4 px-4 py-4")}>
          <SectionHeading title="Calendar sync" description="Calendar sync is still a safe frontend-first preference in this mobile step." />
          <ToggleRow
            label="Calendar sync"
            subtitle={prefs.scheduleCalendarSync ? "Calendar sync enabled" : "Calendar sync disabled"}
            checked={!!prefs.scheduleCalendarSync}
            onChange={(next) => updatePref("scheduleCalendarSync", next)}
            icon={CalendarDays}
          />
        </section>

        <div className="mt-4 rounded-[22px] bg-slate-50/90 px-4 py-4 text-[13px] leading-6 text-slate-500 ring-1 ring-slate-200/75">
          Schedule controls in this mobile page are still local/frontend-first. They are saved safely for this account without claiming live reminder automation or calendar sync backend behavior.
        </div>
      </div>

      <SelectionSheet
        open={openSheet === "cadence"}
        title="Report cadence"
        subtitle="Choose how often schedule summaries should appear."
        options={CADENCE_OPTIONS}
        selectedValue={prefs.scheduleReportCadence || "weekly"}
        onClose={() => setOpenSheet("")}
        onSelect={(value) => updatePref("scheduleReportCadence", value)}
      />

      <SelectionSheet
        open={openSheet === "lead-time"}
        title="Reminder timing"
        subtitle="Choose how early schedule reminders should appear."
        options={REMINDER_OPTIONS}
        selectedValue={prefs.scheduleReminderLeadTime || "30 minutes before"}
        onClose={() => setOpenSheet("")}
        onSelect={(value) => updatePref("scheduleReminderLeadTime", value)}
      />

      <SelectionSheet
        open={openSheet === "timing-preference"}
        title="Timing preference"
        subtitle="Choose how schedule timing should be interpreted on this device."
        options={TIMING_PREFERENCE_OPTIONS}
        selectedValue={prefs.scheduleTimingPreference || "Respect my local timezone"}
        onClose={() => setOpenSheet("")}
        onSelect={(value) => updatePref("scheduleTimingPreference", value)}
      />

      <SelectionSheet
        open={openSheet === "study-default"}
        title="Study schedule default"
        subtitle="Choose the schedule style to use as your default."
        options={STUDY_DEFAULT_OPTIONS}
        selectedValue={prefs.scheduleStudyDefault || "Balanced"}
        onClose={() => setOpenSheet("")}
        onSelect={(value) => updatePref("scheduleStudyDefault", value)}
      />
    </div>
  );
}
