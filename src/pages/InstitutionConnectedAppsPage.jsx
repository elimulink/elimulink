import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Search,
  ShieldCheck,
  Sparkles,
  Video,
  X,
} from "lucide-react";

function BrandIconShell({ children, label, tone = "default", className = "" }) {
  const toneClass =
    tone === "gradient"
      ? "bg-gradient-to-br from-[#2563EB] via-[#06B6D4] to-[#10B981] text-white"
      : "bg-white text-slate-700 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:ring-white/10";

  return (
    <div
      className={[
        "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
        toneClass,
        className,
      ].join(" ")}
      aria-hidden="true"
      title={label}
    >
      {children}
    </div>
  );
}

function StatusPill({ children, tone = "default" }) {
  const toneClass =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/12 dark:text-emerald-200"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/12 dark:text-amber-200"
        : "border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300";

  return (
    <span className={["rounded-full border px-3 py-1 text-[11px] font-semibold", toneClass].join(" ")}>
      {children}
    </span>
  );
}

function SectionEyebrow({ children }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
      {children}
    </p>
  );
}

function GmailMark({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M3 6.75 12 13l9-6.25v10.5A1.75 1.75 0 0 1 19.25 19h-14.5A1.75 1.75 0 0 1 3 17.25V6.75Z" fill="#fff" />
      <path d="M3 6.75v10.5A1.75 1.75 0 0 0 4.75 19H7V10.6L3 6.75Z" fill="#4285F4" />
      <path d="M21 6.75v10.5A1.75 1.75 0 0 1 19.25 19H17v-8.4l4-3.85Z" fill="#34A853" />
      <path d="M21 6.75 17 10.6V5.8l1.95-1.52A1.75 1.75 0 0 1 21 6.75Z" fill="#FBBC04" />
      <path d="M3 6.75 7 10.6V5.8L5.05 4.28A1.75 1.75 0 0 0 3 6.75Z" fill="#EA4335" />
      <path d="M7 5.8V19h10V5.8L12 9.7 7 5.8Z" fill="#fff" />
      <path d="M7 5.8 12 9.7l5-3.9v3.7L12 13 7 9.5V5.8Z" fill="#EA4335" />
    </svg>
  );
}

function GoogleCalendarMark({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="4" y="5" width="16" height="15" rx="3" fill="#fff" />
      <path d="M7 3.5h2V7H7V3.5Zm8 0h2V7h-2V3.5Z" fill="#4285F4" />
      <path d="M4 8.5A3.5 3.5 0 0 1 7.5 5h9A3.5 3.5 0 0 1 20 8.5V10H4V8.5Z" fill="#4285F4" />
      <rect x="6.25" y="12.25" width="11.5" height="5.5" rx="1.5" fill="#E8F0FE" />
      <text x="12" y="16.2" textAnchor="middle" fontSize="6.5" fontWeight="700" fill="#4285F4">31</text>
    </svg>
  );
}

function GoogleChatMark({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M5 5h9a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H9l-4 3v-6H5a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3Z" fill="#34A853" />
      <path d="M14 5h5a3 3 0 0 1 3 3v7l-5 4v-3h-3a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3Z" fill="#FBBC04" />
      <path d="M5 5h6v11H5a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3Z" fill="#4285F4" />
      <path d="M11 5h3a3 3 0 0 1 3 3v5h-6V5Z" fill="#fff" opacity=".95" />
    </svg>
  );
}

function GoogleDocsMark({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" fill="#4285F4" />
      <path d="M14 3v5h5" fill="#AECBFA" />
      <path d="M9 11h6M9 14h6M9 17h4" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function GoogleDriveMark({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="m9 3 3 5-5.5 9H3.2L9 3Z" fill="#34A853" />
      <path d="M9 3h6l5.8 10h-6.1L9 3Z" fill="#FBBC04" />
      <path d="m6.5 17 3.1-5h11.2L17 21H9.6l-3.1-4Z" fill="#4285F4" />
    </svg>
  );
}

function GoogleKeepMark({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M6 4h12a2 2 0 0 1 2 2v9l-4 5H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" fill="#FBBC04" />
      <path d="M16 20v-5h4" fill="#FDE68A" />
      <circle cx="12" cy="10" r="2.4" fill="#fff7cc" />
      <path d="M9.2 14.4h5.6" stroke="#fff7cc" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function OutlookMark({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M13 5h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-7V5Z" fill="#0A64D6" />
      <path d="M13 8.5h9v7l-4.5-3.4L13 15.5v-7Z" fill="#1B7BF0" />
      <path d="M13 15.5 17.5 12 22 15.5" fill="#084EA6" />
      <rect x="2" y="6" width="13" height="12" rx="2.5" fill="#1176E8" />
      <circle cx="8.5" cy="12" r="3.3" fill="#fff" opacity=".95" />
      <circle cx="8.5" cy="12" r="1.7" fill="#1176E8" />
    </svg>
  );
}

function OneDriveMark({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M10.1 8.3a4.6 4.6 0 0 1 7 2.4 3.7 3.7 0 0 1 3.2 3.7A3.6 3.6 0 0 1 16.7 18H7a3.5 3.5 0 0 1-.5-7 4.7 4.7 0 0 1 3.6-2.7Z" fill="#0A64D6" />
      <path d="M9.4 9.2a4 4 0 0 1 5.6 2.5 3.3 3.3 0 0 1 2.8 3.2 3.2 3.2 0 0 1-3.2 3.1H6.8A3.2 3.2 0 0 1 4 14.8c0-1.5 1-2.8 2.4-3.1a4.2 4.2 0 0 1 3-2.5Z" fill="#2B7CD3" />
      <path d="M8.8 10.5a3.3 3.3 0 0 1 4.2 1.9 2.8 2.8 0 0 1 2.3 2.7A2.9 2.9 0 0 1 12.4 18H7.3a2.8 2.8 0 0 1-.4-5.6 3.5 3.5 0 0 1 1.9-1.9Z" fill="#50A6FF" />
    </svg>
  );
}

function GoogleWorkspaceMark({ className = "" }) {
  return (
    <div className={["grid grid-cols-2 gap-1.5", className].join(" ")} aria-hidden="true">
      <GmailMark className="h-5 w-5" />
      <GoogleCalendarMark className="h-5 w-5" />
      <GoogleDriveMark className="h-5 w-5" />
      <GoogleDocsMark className="h-5 w-5" />
    </div>
  );
}

function AppRow({ app, active = false, onClick }) {
  const interactive = typeof onClick === "function";
  return (
    <button
      type="button"
      onClick={interactive ? onClick : undefined}
      className={[
        "flex w-full items-center gap-4 rounded-[24px] border px-4 py-4 text-left transition",
        active
          ? "border-slate-300 bg-slate-100/90 shadow-[0_10px_24px_rgba(15,23,42,0.06)] dark:border-white/15 dark:bg-white/[0.08]"
          : "border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.03]",
        interactive
          ? "hover:border-slate-300 hover:shadow-[0_10px_24px_rgba(15,23,42,0.06)] dark:hover:border-white/15 dark:hover:bg-white/[0.05]"
          : "cursor-default",
      ].join(" ")}
    >
      <BrandIconShell label={app.name} tone={app.brandTone || "default"}>
        <app.icon size={18} />
      </BrandIconShell>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-[17px] font-semibold tracking-[-0.02em] text-slate-900 dark:text-white">
            {app.name}
          </div>
          <StatusPill tone={app.statusTone || "default"}>{app.subtitle}</StatusPill>
        </div>
        <div className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-300">{app.description}</div>
        {app.meta ? (
          <div className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">{app.meta}</div>
        ) : null}
      </div>

      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300">
        <ChevronRight size={18} />
      </div>
    </button>
  );
}

function MobileAppRow({ app, onClick }) {
  const Icon = app.icon || app.app?.icon;
  const title = app.detailTitle || app.name;
  const description = app.detailDescription || app.description || app.app?.description;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-4 py-4 text-left"
    >
      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-white/10">
        {Icon ? <Icon className="h-7 w-7" size={22} /> : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[20px] font-semibold tracking-[-0.03em] text-slate-950 dark:text-white">
          {title}
        </div>
        <div className="mt-1 text-[15px] leading-6 text-slate-500 dark:text-slate-300">
          {description}
        </div>
      </div>
      <ChevronRight size={22} className="shrink-0 text-slate-400 dark:text-slate-500" />
    </button>
  );
}

function PreviewCard({ title, variant, footer }) {
  const renderMockScreen = () => {
    if (variant === "session") {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-2xl border border-sky-100 bg-white/96 px-4 py-3 dark:border-sky-300/10 dark:bg-[#08111f]/92 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="flex items-center gap-3">
              <BrandIconShell label="ElimuLink Meet" tone="gradient" className="h-10 w-10">
                <Video size={16} />
              </BrandIconShell>
              <div>
                <div className="text-[13px] font-semibold text-slate-900 dark:text-white">ElimuLink Meet</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-300">Live session workspace</div>
              </div>
            </div>
            <StatusPill tone="success">Live</StatusPill>
          </div>

          <div className="grid gap-3 rounded-[24px] border border-white/70 bg-white/95 p-4 shadow-[0_16px_30px_rgba(15,23,42,0.08)] dark:border-sky-300/12 dark:bg-[linear-gradient(180deg,rgba(8,17,31,0.96),rgba(15,23,42,0.94))] dark:shadow-[0_24px_44px_rgba(2,6,23,0.46)]">
            <div className="rounded-[22px] bg-slate-950 p-4 text-white dark:bg-[linear-gradient(180deg,rgba(8,17,31,0.98),rgba(15,23,42,0.92))] dark:ring-1 dark:ring-white/6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">Faculty briefing</div>
                  <div className="mt-1 text-[11px] text-white/70">120 participants • Recording on</div>
                </div>
                <div className="rounded-full bg-emerald-400/18 px-2.5 py-1 text-[11px] font-semibold text-emerald-100 ring-1 ring-emerald-300/18">
                  In session
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/7 p-3 ring-1 ring-white/6">
                  <div className="aspect-[4/3] rounded-2xl bg-[linear-gradient(135deg,#38bdf8,#1d4ed8)]" />
                  <div className="mt-2 text-[11px] font-medium text-white/80">Dean of studies</div>
                </div>
                <div className="rounded-2xl bg-white/7 p-3 ring-1 ring-white/6">
                  <div className="aspect-[4/3] rounded-2xl bg-[linear-gradient(135deg,#f59e0b,#f97316)]" />
                  <div className="mt-2 text-[11px] font-medium text-white/80">Academic board</div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-2xl bg-slate-50 px-3 py-3 dark:bg-white/[0.05] dark:ring-1 dark:ring-white/6">
                <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Raised hands</div>
                <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">8</div>
              </div>
              <div className="rounded-2xl bg-slate-50 px-3 py-3 dark:bg-white/[0.05] dark:ring-1 dark:ring-white/6">
                <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Shared docs</div>
                <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">3</div>
              </div>
              <div className="rounded-2xl bg-slate-50 px-3 py-3 dark:bg-white/[0.05] dark:ring-1 dark:ring-white/6">
                <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Duration</div>
                <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">42m</div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (variant === "agenda") {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-2xl border border-sky-100 bg-white/96 px-4 py-3 dark:border-sky-300/10 dark:bg-[#08111f]/92 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div>
              <div className="text-[13px] font-semibold text-slate-900 dark:text-white">Meeting agenda</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-300">Structured session plan for participants</div>
            </div>
            <div className="rounded-full bg-[#315cff] px-3 py-1 text-[11px] font-semibold text-white">6 points</div>
          </div>
          <div className="rounded-[24px] border border-white/70 bg-white/95 p-4 shadow-[0_16px_30px_rgba(15,23,42,0.08)] dark:border-sky-300/12 dark:bg-[linear-gradient(180deg,rgba(8,17,31,0.96),rgba(15,23,42,0.94))] dark:shadow-[0_24px_44px_rgba(2,6,23,0.46)]">
            <div className="space-y-2.5">
              {[
                ["09:00", "Opening remarks", true],
                ["09:10", "Exam timetable coordination", false],
                ["09:25", "Department updates", false],
                ["09:40", "Action items and wrap-up", false],
              ].map(([time, label, active]) => (
                <div
                  key={label}
                  className={[
                    "flex items-center gap-3 rounded-2xl px-3 py-3",
                    active
                      ? "bg-[#315cff] text-white shadow-[0_14px_26px_rgba(49,92,255,0.25)]"
                      : "border border-slate-200 bg-slate-50 text-slate-800 dark:border-white/8 dark:bg-white/[0.05] dark:text-slate-100",
                  ].join(" ")}
                >
                  <div className={["rounded-xl px-2 py-1 text-[11px] font-semibold", active ? "bg-white/18 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 dark:bg-slate-950 dark:text-slate-200 dark:ring-white/10"].join(" ")}>
                    {time}
                  </div>
                  <div className="text-[13px] font-semibold">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (variant === "recording") {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-2xl border border-sky-100 bg-white/96 px-4 py-3 dark:border-sky-300/10 dark:bg-[#08111f]/92 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div>
              <div className="text-[13px] font-semibold text-slate-900 dark:text-white">Meeting summary</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-300">Recordings, notes, and action items</div>
            </div>
            <div className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">
              Saved
            </div>
          </div>
          <div className="rounded-[24px] border border-white/70 bg-white/95 p-4 shadow-[0_16px_30px_rgba(15,23,42,0.08)] dark:border-sky-300/12 dark:bg-[linear-gradient(180deg,rgba(8,17,31,0.96),rgba(15,23,42,0.94))] dark:shadow-[0_24px_44px_rgba(2,6,23,0.46)]">
            <div className="rounded-[22px] bg-[linear-gradient(135deg,#1d4ed8,#38bdf8)] p-4 text-white dark:ring-1 dark:ring-white/8">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">Recorded session</div>
                  <div className="mt-1 text-[11px] text-white/80">Academic senate review</div>
                </div>
                <div className="rounded-full bg-white/16 px-3 py-1 text-[11px] font-semibold">56 min</div>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {[
                "Share recording with staff",
                "Publish follow-up notes",
                "Track action items from the meeting",
              ].map((item) => (
                <div key={item} className="rounded-2xl bg-slate-50 px-3 py-3 text-[13px] text-slate-800 dark:bg-white/[0.05] dark:text-slate-100 dark:ring-1 dark:ring-white/6">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (variant === "records") {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-2xl border border-sky-100 bg-white/96 px-4 py-3 dark:border-sky-300/10 dark:bg-[#08111f]/92 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div>
              <div className="text-[13px] font-semibold text-slate-900 dark:text-white">Admissions records</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-300">Student intake, profiles, and review status</div>
            </div>
            <div className="rounded-full bg-[#315cff] px-3 py-1 text-[11px] font-semibold text-white">148 active</div>
          </div>
          <div className="rounded-[24px] border border-white/70 bg-white/95 p-4 shadow-[0_16px_30px_rgba(15,23,42,0.08)] dark:border-sky-300/12 dark:bg-[linear-gradient(180deg,rgba(8,17,31,0.96),rgba(15,23,42,0.94))] dark:shadow-[0_24px_44px_rgba(2,6,23,0.46)]">
            <div className="grid grid-cols-2 gap-2">
              {[
                ["Pending review", "28"],
                ["Approved", "94"],
                ["Flagged", "6"],
                ["Documents due", "20"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-slate-50 px-3 py-3 dark:bg-white/[0.05] dark:ring-1 dark:ring-white/6">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{label}</div>
                  <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{value}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-[22px] bg-slate-950 p-4 text-white dark:bg-[linear-gradient(180deg,rgba(8,17,31,0.98),rgba(15,23,42,0.92))] dark:ring-1 dark:ring-white/6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">Applicant review queue</div>
                  <div className="mt-1 text-[11px] text-white/72">Admissions office • Updated 6 min ago</div>
                </div>
                <div className="rounded-full bg-emerald-400/18 px-2.5 py-1 text-[11px] font-semibold text-emerald-100 ring-1 ring-emerald-300/18">
                  Synced
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (variant === "records-review") {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-2xl border border-sky-100 bg-white/96 px-4 py-3 dark:border-sky-300/10 dark:bg-[#08111f]/92 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div>
              <div className="text-[13px] font-semibold text-slate-900 dark:text-white">Workflow approvals</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-300">Operations and administrative sign-off</div>
            </div>
            <div className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">12 pending</div>
          </div>
          <div className="rounded-[24px] border border-white/70 bg-white/95 p-4 shadow-[0_16px_30px_rgba(15,23,42,0.08)] dark:border-sky-300/12 dark:bg-[linear-gradient(180deg,rgba(8,17,31,0.96),rgba(15,23,42,0.94))] dark:shadow-[0_24px_44px_rgba(2,6,23,0.46)]">
            <div className="space-y-2.5">
              {[
                ["Registrar approval", "Awaiting sign-off", true],
                ["Department request", "Ready for review", false],
                ["Finance clearance", "Queued", false],
              ].map(([task, meta, active]) => (
                <div
                  key={task}
                  className={[
                    "rounded-2xl px-3 py-3",
                    active
                      ? "bg-[#315cff] text-white shadow-[0_14px_26px_rgba(49,92,255,0.25)]"
                      : "border border-slate-200 bg-slate-50 text-slate-800 dark:border-white/8 dark:bg-white/[0.05] dark:text-slate-100",
                  ].join(" ")}
                >
                  <div className="text-[13px] font-semibold">{task}</div>
                  <div className={["mt-1 text-[11px]", active ? "text-white/82" : "text-slate-500 dark:text-slate-300"].join(" ")}>{meta}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (variant === "records-summary") {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-2xl border border-sky-100 bg-white/96 px-4 py-3 dark:border-sky-300/10 dark:bg-[#08111f]/92 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div>
              <div className="text-[13px] font-semibold text-slate-900 dark:text-white">Operations summary</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-300">Daily visibility across institutional workflows</div>
            </div>
            <StatusPill tone="success">On track</StatusPill>
          </div>
          <div className="rounded-[24px] border border-white/70 bg-white/95 p-4 shadow-[0_16px_30px_rgba(15,23,42,0.08)] dark:border-sky-300/12 dark:bg-[linear-gradient(180deg,rgba(8,17,31,0.96),rgba(15,23,42,0.94))] dark:shadow-[0_24px_44px_rgba(2,6,23,0.46)]">
            <div className="rounded-[22px] bg-[linear-gradient(135deg,#1d4ed8,#38bdf8)] p-4 text-white dark:ring-1 dark:ring-white/8">
              <div className="text-sm font-semibold">Today at a glance</div>
              <div className="mt-1 text-[11px] text-white/80">Admissions, approvals, and staff actions in one view</div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                ["Approvals", "12"],
                ["Records updated", "37"],
                ["Alerts", "4"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-slate-50 px-3 py-3 dark:bg-white/[0.05] dark:ring-1 dark:ring-white/6">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{label}</div>
                  <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (variant === "fees-overview") {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-2xl border border-sky-100 bg-white/96 px-4 py-3 dark:border-sky-300/10 dark:bg-[#08111f]/92 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div>
              <div className="text-[13px] font-semibold text-slate-900 dark:text-white">Fees overview</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-300">Balances, collections, and follow-up visibility</div>
            </div>
            <div className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">Healthy cashflow</div>
          </div>
          <div className="rounded-[24px] border border-white/70 bg-white/95 p-4 shadow-[0_16px_30px_rgba(15,23,42,0.08)] dark:border-sky-300/12 dark:bg-[linear-gradient(180deg,rgba(8,17,31,0.96),rgba(15,23,42,0.94))] dark:shadow-[0_24px_44px_rgba(2,6,23,0.46)]">
            <div className="grid grid-cols-2 gap-2">
              {[
                ["Collected", "KES 2.4M"],
                ["Outstanding", "KES 680K"],
                ["Invoices sent", "124"],
                ["Plans active", "32"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-slate-50 px-3 py-3 dark:bg-white/[0.05] dark:ring-1 dark:ring-white/6">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{label}</div>
                  <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (variant === "fees-payments") {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-2xl border border-sky-100 bg-white/96 px-4 py-3 dark:border-sky-300/10 dark:bg-[#08111f]/92 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div>
              <div className="text-[13px] font-semibold text-slate-900 dark:text-white">Today&apos;s payments</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-300">Recent collections and posted receipts</div>
            </div>
            <div className="rounded-full bg-[#315cff] px-3 py-1 text-[11px] font-semibold text-white">37 posted</div>
          </div>
          <div className="rounded-[24px] border border-white/70 bg-white/95 p-4 shadow-[0_16px_30px_rgba(15,23,42,0.08)] dark:border-sky-300/12 dark:bg-[linear-gradient(180deg,rgba(8,17,31,0.96),rgba(15,23,42,0.94))] dark:shadow-[0_24px_44px_rgba(2,6,23,0.46)]">
            <div className="space-y-2.5">
              {[
                ["Mpesa batch", "KES 214,000", true],
                ["Bank transfer", "KES 86,000", false],
                ["Cash office", "KES 43,000", false],
              ].map(([label, amount, active]) => (
                <div
                  key={label}
                  className={[
                    "flex items-center justify-between rounded-2xl px-3 py-3",
                    active
                      ? "bg-[#315cff] text-white shadow-[0_14px_26px_rgba(49,92,255,0.25)]"
                      : "border border-slate-200 bg-slate-50 text-slate-800 dark:border-white/8 dark:bg-white/[0.05] dark:text-slate-100",
                  ].join(" ")}
                >
                  <div className="text-[13px] font-semibold">{label}</div>
                  <div className="text-[12px] font-semibold">{amount}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (variant === "fees-overdue") {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-2xl border border-sky-100 bg-white/96 px-4 py-3 dark:border-sky-300/10 dark:bg-[#08111f]/92 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div>
              <div className="text-[13px] font-semibold text-slate-900 dark:text-white">Overdue accounts</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-300">Priority follow-ups across unpaid balances</div>
            </div>
            <div className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">18 high priority</div>
          </div>
          <div className="rounded-[24px] border border-white/70 bg-white/95 p-4 shadow-[0_16px_30px_rgba(15,23,42,0.08)] dark:border-sky-300/12 dark:bg-[linear-gradient(180deg,rgba(8,17,31,0.96),rgba(15,23,42,0.94))] dark:shadow-[0_24px_44px_rgba(2,6,23,0.46)]">
            <div className="mt-1 space-y-2">
              {[
                "Send reminders to flagged accounts",
                "Review payment plan requests",
                "Share overdue report with finance office",
              ].map((item) => (
                <div key={item} className="rounded-2xl bg-slate-50 px-3 py-3 text-[13px] text-slate-800 dark:bg-white/[0.05] dark:text-slate-100 dark:ring-1 dark:ring-white/6">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (variant === "results-approvals") {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-2xl border border-sky-100 bg-white/96 px-4 py-3 dark:border-sky-300/10 dark:bg-[#08111f]/92 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div>
              <div className="text-[13px] font-semibold text-slate-900 dark:text-white">Pending approvals</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-300">Marks moderation and publishing checkpoints</div>
            </div>
            <div className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">7 awaiting</div>
          </div>
          <div className="rounded-[24px] border border-white/70 bg-white/95 p-4 shadow-[0_16px_30px_rgba(15,23,42,0.08)] dark:border-sky-300/12 dark:bg-[linear-gradient(180deg,rgba(8,17,31,0.96),rgba(15,23,42,0.94))] dark:shadow-[0_24px_44px_rgba(2,6,23,0.46)]">
            <div className="space-y-2.5">
              {[
                ["Exam board review", "Final moderation", true],
                ["Department verification", "Needs chair approval", false],
                ["Transcript release", "Queued for publish", false],
              ].map(([task, meta, active]) => (
                <div
                  key={task}
                  className={[
                    "rounded-2xl px-3 py-3",
                    active
                      ? "bg-[#315cff] text-white shadow-[0_14px_26px_rgba(49,92,255,0.25)]"
                      : "border border-slate-200 bg-slate-50 text-slate-800 dark:border-white/8 dark:bg-white/[0.05] dark:text-slate-100",
                  ].join(" ")}
                >
                  <div className="text-[13px] font-semibold">{task}</div>
                  <div className={["mt-1 text-[11px]", active ? "text-white/82" : "text-slate-500 dark:text-slate-300"].join(" ")}>{meta}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (variant === "results-summary") {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-2xl border border-sky-100 bg-white/96 px-4 py-3 dark:border-sky-300/10 dark:bg-[#08111f]/92 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div>
              <div className="text-[13px] font-semibold text-slate-900 dark:text-white">Moderation progress</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-300">Department readiness and publication status</div>
            </div>
            <StatusPill tone="success">86% complete</StatusPill>
          </div>
          <div className="rounded-[24px] border border-white/70 bg-white/95 p-4 shadow-[0_16px_30px_rgba(15,23,42,0.08)] dark:border-sky-300/12 dark:bg-[linear-gradient(180deg,rgba(8,17,31,0.96),rgba(15,23,42,0.94))] dark:shadow-[0_24px_44px_rgba(2,6,23,0.46)]">
            <div className="rounded-[22px] bg-[linear-gradient(135deg,#1d4ed8,#38bdf8)] p-4 text-white dark:ring-1 dark:ring-white/8">
              <div className="text-sm font-semibold">Publication runway</div>
              <div className="mt-1 text-[11px] text-white/80">Marks, moderation, and release timelines</div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                ["Courses", "42"],
                ["Moderated", "36"],
                ["Ready", "18"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-slate-50 px-3 py-3 dark:bg-white/[0.05] dark:ring-1 dark:ring-white/6">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{label}</div>
                  <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (variant === "results-transcripts") {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-2xl border border-sky-100 bg-white/96 px-4 py-3 dark:border-sky-300/10 dark:bg-[#08111f]/92 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div>
              <div className="text-[13px] font-semibold text-slate-900 dark:text-white">Transcript workflows</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-300">Requests, approvals, and release actions</div>
            </div>
            <div className="rounded-full bg-[#315cff] px-3 py-1 text-[11px] font-semibold text-white">24 active</div>
          </div>
          <div className="rounded-[24px] border border-white/70 bg-white/95 p-4 shadow-[0_16px_30px_rgba(15,23,42,0.08)] dark:border-sky-300/12 dark:bg-[linear-gradient(180deg,rgba(8,17,31,0.96),rgba(15,23,42,0.94))] dark:shadow-[0_24px_44px_rgba(2,6,23,0.46)]">
            <div className="space-y-2">
              {[
                "Review transcript requests awaiting approval",
                "Confirm completed release batches",
                "Track certificate and transcript follow-ups",
              ].map((item) => (
                <div key={item} className="rounded-2xl bg-slate-50 px-3 py-3 text-[13px] text-slate-800 dark:bg-white/[0.05] dark:text-slate-100 dark:ring-1 dark:ring-white/6">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (variant === "timetable") {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-2xl border border-sky-100 bg-white/96 px-4 py-3 dark:border-white/10 dark:bg-slate-900/88">
            <div className="flex items-center gap-3">
              <BrandIconShell label="ElimuLink Calendar" tone="gradient" className="h-10 w-10">
                <CalendarDays size={16} />
              </BrandIconShell>
              <div>
                <div className="text-[13px] font-semibold text-slate-900 dark:text-white">
                  ElimuLink Calendar
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-300">
                  Academic planning workspace
                </div>
              </div>
            </div>
            <StatusPill tone="success">Live</StatusPill>
          </div>

          <div className="grid gap-3 rounded-[24px] border border-white/70 bg-white/95 p-4 shadow-[0_16px_30px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-slate-900/90 dark:shadow-[0_20px_36px_rgba(2,6,23,0.32)]">
            <div className="flex items-center justify-between">
              <div className="text-[13px] font-semibold text-slate-900 dark:text-white">Semester timetable</div>
              <div className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700 dark:bg-sky-500/15 dark:text-sky-200">
                Term 2
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1.5 rounded-2xl bg-slate-50 p-3 dark:bg-white/[0.04]">
              {["M", "T", "W", "T", "F", "S", "S"].map((day) => (
                <div key={day} className="text-center text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                  {day}
                </div>
              ))}
              {[8, 9, 10, 11, 12, 13, 14].map((date, index) => (
                <div
                  key={date}
                  className={[
                    "rounded-xl px-2 py-1.5 text-center text-[11px] font-medium",
                    index === 2
                      ? "bg-[#315cff] text-white shadow-[0_10px_20px_rgba(49,92,255,0.28)]"
                      : "bg-white text-slate-700 ring-1 ring-slate-200 dark:bg-slate-950 dark:text-slate-200 dark:ring-white/10",
                  ].join(" ")}
                >
                  {date}
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <div className="rounded-2xl bg-emerald-50 px-3 py-3 dark:bg-emerald-500/10">
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-200">
                  Department planning
                </div>
                <div className="mt-1 text-[13px] leading-6 text-slate-800 dark:text-slate-100">
                  Faculty orientation, class launch, and timetable review in one place.
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-slate-50 px-3 py-3 dark:bg-white/[0.04]">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    Scheduled
                  </div>
                  <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">124</div>
                </div>
                <div className="rounded-2xl bg-slate-50 px-3 py-3 dark:bg-white/[0.04]">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    Reminders
                  </div>
                  <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">18</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (variant === "deadlines") {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-2xl border border-sky-100 bg-white/96 px-4 py-3 dark:border-white/10 dark:bg-slate-900/88">
            <div>
              <div className="text-[13px] font-semibold text-slate-900 dark:text-white">This week</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-300">Assignments, exams, and campus events</div>
            </div>
            <div className="rounded-full bg-[#315cff] px-3 py-1 text-[11px] font-semibold text-white">
              9 items
            </div>
          </div>

          <div className="rounded-[24px] border border-white/70 bg-white/95 p-4 shadow-[0_16px_30px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-slate-900/90 dark:shadow-[0_20px_36px_rgba(2,6,23,0.32)]">
            <div className="grid grid-cols-5 gap-1.5">
              {[
                ["Mon", "2 due"],
                ["Tue", "1 exam"],
                ["Wed", "Today"],
                ["Thu", "3 due"],
                ["Fri", "Review"],
              ].map(([day, note], index) => (
                <div
                  key={day}
                  className={[
                    "rounded-2xl px-2.5 py-3 text-center",
                    index === 2
                      ? "bg-slate-950 text-white dark:bg-[#315cff]"
                      : "bg-slate-50 text-slate-700 dark:bg-white/[0.04] dark:text-slate-200",
                  ].join(" ")}
                >
                  <div className="text-[10px] font-semibold uppercase tracking-[0.12em] opacity-80">{day}</div>
                  <div className="mt-2 text-[11px]">{note}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-2.5">
              {[
                ["08:30", "Coursework deadline review", "Faculty of Science"],
                ["11:00", "Midterm invigilation schedule", "Main Hall"],
                ["15:00", "Department planning sync", "Admin calendar"],
              ].map(([time, task, meta]) => (
                <div
                  key={task}
                  className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-white/10 dark:bg-white/[0.04]"
                >
                  <div className="rounded-xl bg-white px-2 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 dark:bg-slate-950 dark:text-slate-200 dark:ring-white/10">
                    {time}
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold text-slate-900 dark:text-white">{task}</div>
                    <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-300">{meta}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-2xl border border-sky-100 bg-white/96 px-4 py-3 dark:border-white/10 dark:bg-slate-900/88">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
              <CalendarDays size={16} />
            </div>
            <div>
              <div className="text-[13px] font-semibold text-slate-900 dark:text-white">Upcoming next</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-300">Priority events and reminders</div>
            </div>
          </div>
          <div className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">
            Today
          </div>
        </div>

          <div className="rounded-[24px] border border-white/70 bg-white/95 p-4 shadow-[0_16px_30px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-slate-900/90 dark:shadow-[0_20px_36px_rgba(2,6,23,0.32)]">
          <div className="space-y-2.5">
            {[
              ["08:00", "Morning briefing", "Academic office"],
              ["10:30", "Timetable updates", "Science block"],
              ["14:00", "Parent meeting", "Conference room"],
            ].map(([time, task, meta], index) => (
              <div
                key={task}
                className={[
                  "flex items-start gap-3 rounded-2xl px-3 py-2.5",
                  index === 0
                    ? "bg-[#315cff] text-white shadow-[0_14px_26px_rgba(49,92,255,0.25)]"
                    : "bg-slate-50 text-slate-800 dark:bg-white/[0.04] dark:text-slate-100",
                ].join(" ")}
              >
                <div className={["rounded-xl px-2 py-1 text-xs font-semibold", index === 0 ? "bg-white/18 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 dark:bg-slate-950 dark:text-slate-200 dark:ring-white/10"].join(" ")}>
                  {time}
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold">{task}</div>
                  <div className={["mt-1 text-[11px]", index === 0 ? "text-white/85" : "text-slate-500 dark:text-slate-300"].join(" ")}>
                    {meta}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-slate-50 px-3 py-3 dark:bg-white/[0.04]">
              <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Upcoming</div>
              <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">12</div>
            </div>
            <div className="rounded-2xl bg-slate-50 px-3 py-3 dark:bg-white/[0.04]">
              <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Reminders</div>
              <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">5</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_14px_32px_rgba(15,23,42,0.08)] dark:border-sky-300/12 dark:bg-[#08111f] dark:shadow-[0_26px_52px_rgba(2,6,23,0.5)]">
      <div className="flex h-full flex-col bg-[linear-gradient(140deg,#66d3ff_0%,#b9deff_48%,#ffe88b_100%)] px-5 py-5 dark:bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.22),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(250,204,21,0.16),transparent_28%),linear-gradient(160deg,rgba(8,17,31,0.98)_0%,rgba(15,23,42,0.96)_58%,rgba(12,74,110,0.84)_100%)]">
        <div className="rounded-2xl border border-white/60 bg-white/84 px-3 py-2 text-sm font-medium text-slate-700 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/48 dark:text-slate-100">
          {title}
        </div>
        <div className="mt-3 flex flex-1 flex-col">
          <div className="flex-1">{renderMockScreen()}</div>
          <div className="mt-3 inline-flex self-start rounded-full bg-[#315cff] px-4 py-2 text-xs font-semibold text-white shadow-[0_12px_24px_rgba(49,92,255,0.24)] dark:bg-white/92 dark:text-[#0b1220] dark:ring-1 dark:ring-white/35 dark:shadow-[0_14px_32px_rgba(8,15,30,0.42)]">
            {footer}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, href }) {
  return (
    <div className="grid grid-cols-[180px_minmax(0,1fr)] gap-4 border-t border-slate-200 px-4 py-4 text-sm dark:border-white/10 md:px-5">
      <div className="text-slate-500 dark:text-slate-400">{label}</div>
      <div className="font-medium text-slate-900 dark:text-white">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-slate-900 hover:text-blue-700 dark:text-white dark:hover:text-blue-300"
          >
            <span>{value}</span>
            <ExternalLink size={15} />
          </a>
        ) : (
          value
        )}
      </div>
    </div>
  );
}

function GoogleWorkspaceCard({ apps, onLearnMore }) {
  return (
    <div className="rounded-[30px] border border-slate-200 bg-slate-50/85 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-white/10 dark:bg-[#111827]">
      <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
        <div className="rounded-[26px] bg-[#eef4ff] p-5 dark:bg-white/[0.04]">
          <div className="flex items-start justify-between gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white shadow-[0_8px_18px_rgba(15,23,42,0.06)] dark:bg-slate-950">
              <GoogleWorkspaceMark className="h-10 w-10" />
            </div>
            <button
              type="button"
              className="relative h-9 w-16 rounded-full bg-[#2563eb] transition dark:bg-[#315cff]"
              aria-label="Google Workspace connected"
            >
              <span className="absolute right-1 top-1 h-7 w-7 rounded-full bg-white shadow-sm" />
            </button>
          </div>
          <div className="mt-5">
            <h3 className="text-[30px] font-semibold tracking-[-0.03em] text-slate-950 dark:text-white">
              Google Workspace
            </h3>
            <p className="mt-3 max-w-[24ch] text-[15px] leading-8 text-slate-600 dark:text-slate-300">
              Summarize, find, and get quick answers from your connected Google content.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
          {apps.map((app) => (
            <div
              key={app.id}
              className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-white/10 dark:bg-slate-900/80"
            >
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white ring-1 ring-slate-200 dark:bg-slate-950 dark:ring-white/10">
                  <app.icon className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <div className="text-[15px] font-semibold text-slate-950 dark:text-white">{app.name}</div>
                  <div className="text-[13px] text-slate-500 dark:text-slate-300">{app.handle}</div>
                  <button
                    type="button"
                    onClick={() => onLearnMore(app.id)}
                    className="mt-2 text-[15px] font-medium text-[#1d4ed8] transition hover:text-blue-700 dark:text-[#7cb6ff] dark:hover:text-[#a6ccff]"
                  >
                    Learn more
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const CALENDAR_APP = {
  id: "elimulink-calendar",
  name: "ElimuLink Calendar",
  subtitle: "Core planning and academic scheduling",
  description: "Manage academic schedules, institutional events, and workspace timelines.",
  icon: CalendarDays,
  brandTone: "gradient",
  statusTone: "success",
  connectable: true,
};

const MEET_APP = {
  id: "elimulink-meet",
  name: "ElimuLink Meet",
  subtitle: "Coming next",
  description: "Run meetings, academic sessions, and staff collaboration inside ElimuLink.",
  icon: Video,
  brandTone: "gradient",
  statusTone: "warning",
  connectable: true,
};

const ERP_APP = {
  id: "institution-erp",
  name: "Institution ERP",
  subtitle: "Admin controlled",
  description: "Student records, workflows, and institution operations.",
  icon: ShieldCheck,
};

const FEES_APP = {
  id: "fees-system",
  name: "Fees System",
  subtitle: "Request access",
  description: "Billing, balances, and payment visibility across the institution.",
  icon: ShieldCheck,
  statusTone: "warning",
};

const RESULTS_APP = {
  id: "results-system",
  name: "Results System",
  subtitle: "Admin controlled",
  description: "Academic marks, approvals, and transcript workflows.",
  icon: ShieldCheck,
};

const GMAIL_AVAILABLE_APP = {
  id: "gmail",
  name: "Gmail",
  subtitle: "Communication",
  description: "Link inbox workflows, mail summaries, and academic communications.",
  icon: GmailMark,
};

const GDRIVE_AVAILABLE_APP = {
  id: "google-drive",
  name: "Google Drive",
  subtitle: "Storage",
  description: "Access documents, notes, course files, and shared materials.",
  icon: GoogleDriveMark,
};

const OUTLOOK_APP = {
  id: "outlook",
  name: "Outlook",
  subtitle: "Communication",
  description: "Connect institutional mail, contacts, and related workflows.",
  icon: OutlookMark,
};

const ONEDRIVE_APP = {
  id: "onedrive",
  name: "OneDrive",
  subtitle: "Storage",
  description: "Sync cloud files and institutional documents across workspace tasks.",
  icon: OneDriveMark,
};

const NATIVE_APP_DETAILS = {
  [CALENDAR_APP.id]: {
    app: CALENDAR_APP,
    connectedLabel: "Connected",
    successMessage: "ElimuLink Calendar is now connected.",
    detailTitle: "ElimuLink Calendar",
    detailDescription: "Edit schedules, plan academic timelines, and coordinate events inside ElimuLink.",
    longDescription:
      "ElimuLink Calendar helps institutions organize academic schedules, teaching timelines, events, and workspace planning from one clean surface. Use it to structure the school calendar, coordinate department activities, and keep academic operations visible without leaving ElimuLink.",
    infoRows: [
      ["Category", "Productivity / Planning"],
      ["Capabilities", "Schedules, reminders, events, timelines"],
      ["Developer", "ElimuLink"],
      ["Website", "elimulink.co.ke", "https://elimulink.co.ke"],
      ["Privacy Policy", "View privacy policy", "https://elimulink.co.ke/privacy"],
      ["Data access", "Calendar entries, event metadata, reminders, institution planning context"],
    ],
    previews: [
      ["@ElimuLink Calendar create an academic timetable", "timetable", "Open in Calendar"],
      ["@ElimuLink Calendar show this week's deadlines", "deadlines", "Review this week"],
      ["@ElimuLink Calendar what is coming next?", "upcoming", "See upcoming"],
    ],
    modalTitle: "Use ElimuLink Calendar in ElimuLink Institution",
    modalDescription:
      "Connect ElimuLink Calendar to manage academic schedules, reminders, and institution planning from one clean workspace experience.",
    modalContextTitle: "Reference institution scheduling context",
    modalContextDescription:
      "Allow Calendar to use relevant workspace schedule context for more helpful planning responses.",
    modalDataDescription:
      "Basic institution profile context, calendar items, reminders, and workspace planning metadata used for scheduling assistance.",
  },
  [MEET_APP.id]: {
    app: MEET_APP,
    connectedLabel: "Connected",
    successMessage: "ElimuLink Meet is now connected.",
    detailTitle: "ElimuLink Meet",
    detailDescription: "Run meetings, academic sessions, and staff collaboration inside ElimuLink.",
    longDescription:
      "ElimuLink Meet gives institutions a clean way to host meetings, faculty sessions, department briefings, and academic collaboration without leaving the ElimuLink workspace. Use it to run live sessions, keep agendas organized, and keep recordings and follow-up actions close to your institution workflows.",
    infoRows: [
      ["Category", "Communication / Meetings"],
      ["Capabilities", "Live sessions, agenda flow, recordings, collaboration"],
      ["Developer", "ElimuLink"],
      ["Website", "elimulink.co.ke", "https://elimulink.co.ke"],
      ["Privacy Policy", "View privacy policy", "https://elimulink.co.ke/privacy"],
      ["Data access", "Meeting metadata, participant lists, shared notes, recordings, and follow-up actions"],
    ],
    previews: [
      ["@ElimuLink Meet start a faculty session", "session", "Join session"],
      ["@ElimuLink Meet create today's meeting agenda", "agenda", "Review agenda"],
      ["@ElimuLink Meet show the latest recording", "recording", "Open summary"],
    ],
    modalTitle: "Use ElimuLink Meet in ElimuLink Institution",
    modalDescription:
      "Connect ElimuLink Meet to run academic meetings, staff collaboration, and live institution sessions from one clean workspace experience.",
    modalContextTitle: "Reference institution meeting context",
    modalContextDescription:
      "Allow Meet to use relevant session context, participant details, and planning information for more helpful collaboration responses.",
    modalDataDescription:
      "Basic institution profile context, meeting metadata, participant roles, shared notes, and recording references used for collaboration assistance.",
  },
  [ERP_APP.id]: {
    app: ERP_APP,
    connectedLabel: "Access ready",
    successMessage: "Institution ERP is now connected.",
    detailTitle: "Institution ERP",
    detailDescription: "Student records, workflows, and institution operations.",
    longDescription:
      "Institution ERP keeps regulated institutional operations in one structured workspace, from student records to approval flows and administrative coordination. Use it to centralize operations without pulling staff away from the ElimuLink environment.",
    infoRows: [
      ["Category", "Institution Operations"],
      ["Capabilities", "Student records, approvals, workflows, operations"],
      ["Developer", "ElimuLink"],
      ["Website", "elimulink.co.ke", "https://elimulink.co.ke"],
      ["Privacy Policy", "View privacy policy", "https://elimulink.co.ke/privacy"],
      ["Data access", "Student profiles, workflow metadata, institution records, and approvals context"],
    ],
    previews: [
      ["@Institution ERP show active admissions records", "records", "Open records"],
      ["@Institution ERP review workflow approvals", "records-review", "Review approvals"],
      ["@Institution ERP summarize pending operations", "records-summary", "View summary"],
    ],
    modalTitle: "Use Institution ERP in ElimuLink Institution",
    modalDescription:
      "Connect Institution ERP to manage student records, workflows, and operational reviews from one clean institution workspace.",
    modalContextTitle: "Reference institution records context",
    modalContextDescription:
      "Allow Institution ERP to use relevant records and workflow context for more helpful administrative responses.",
    modalDataDescription:
      "Basic institution profile context, student records metadata, workflow states, and operations summaries used for institutional assistance.",
  },
  [FEES_APP.id]: {
    app: FEES_APP,
    connectedLabel: "Connected",
    successMessage: "Fees System is now connected.",
    detailTitle: "Fees System",
    detailDescription: "Billing, balances, and payment visibility across the institution.",
    longDescription:
      "Fees System helps institutions review balances, payment activity, and billing visibility from a focused financial workspace. Use it to keep collections, outstanding balances, and billing follow-ups connected to the institution workflow.",
    infoRows: [
      ["Category", "Finance / Billing"],
      ["Capabilities", "Balances, invoices, collections, payment visibility"],
      ["Developer", "ElimuLink"],
      ["Website", "elimulink.co.ke", "https://elimulink.co.ke"],
      ["Privacy Policy", "View privacy policy", "https://elimulink.co.ke/privacy"],
      ["Data access", "Fee balances, billing metadata, invoice summaries, and payment activity"],
    ],
    previews: [
      ["@Fees System show outstanding balances", "fees-overview", "View balances"],
      ["@Fees System summarize today's payments", "fees-payments", "Review payments"],
      ["@Fees System list overdue accounts", "fees-overdue", "Open follow-ups"],
    ],
    modalTitle: "Use Fees System in ElimuLink Institution",
    modalDescription:
      "Connect Fees System to review balances, invoices, and payment visibility from one clean institution workspace.",
    modalContextTitle: "Reference finance and billing context",
    modalContextDescription:
      "Allow Fees System to use relevant billing and balance context for more helpful finance responses.",
    modalDataDescription:
      "Basic institution profile context, billing metadata, balances, payment summaries, and fee status information used for finance assistance.",
  },
  [RESULTS_APP.id]: {
    app: RESULTS_APP,
    connectedLabel: "Access ready",
    successMessage: "Results System is now connected.",
    detailTitle: "Results System",
    detailDescription: "Academic marks, approvals, and transcript workflows.",
    longDescription:
      "Results System gives institutions a clean surface for academic marks, approvals, and transcript-related workflows. Use it to monitor publication progress, review moderation status, and keep result operations close to the institution workspace.",
    infoRows: [
      ["Category", "Academic Results"],
      ["Capabilities", "Marks, transcript workflows, moderation, approvals"],
      ["Developer", "ElimuLink"],
      ["Website", "elimulink.co.ke", "https://elimulink.co.ke"],
      ["Privacy Policy", "View privacy policy", "https://elimulink.co.ke/privacy"],
      ["Data access", "Result metadata, approval states, moderation summaries, and transcript workflow context"],
    ],
    previews: [
      ["@Results System show pending approvals", "results-approvals", "Review approvals"],
      ["@Results System summarize moderation progress", "results-summary", "View progress"],
      ["@Results System open transcript workflows", "results-transcripts", "Open transcripts"],
    ],
    modalTitle: "Use Results System in ElimuLink Institution",
    modalDescription:
      "Connect Results System to review marks, moderation progress, and transcript workflows from one clean institution workspace.",
    modalContextTitle: "Reference results and approvals context",
    modalContextDescription:
      "Allow Results System to use relevant academic results and approval context for more helpful academic operations responses.",
    modalDataDescription:
      "Basic institution profile context, marks metadata, moderation status, and transcript workflow information used for academic operations assistance.",
  },
  [GMAIL_AVAILABLE_APP.id]: {
    app: GMAIL_AVAILABLE_APP,
    connectedLabel: "Connected",
    successMessage: "Gmail is now connected.",
    detailTitle: "Gmail",
    detailDescription: "Link inbox workflows, mail summaries, and academic communications.",
    longDescription:
      "Gmail connects institutional communication into a cleaner workspace flow so you can review threads, summarize inbox activity, and draft responses without leaving ElimuLink. Use it for academic communications, office follow-ups, and quick inbox answers.",
    infoRows: [
      ["Category", "Communication"],
      ["Capabilities", "Inbox summaries, thread review, drafting, sender lookup"],
      ["Developer", "Google"],
      ["Website", "workspace.google.com", "https://workspace.google.com/products/gmail/"],
      ["Privacy Policy", "Google privacy policy", "https://policies.google.com/privacy"],
      ["Data access", "Inbox metadata, threads, sender details, and email summaries"],
    ],
    previews: [
      ["@Gmail summarize unread emails", "mail-inbox", "Open inbox"],
      ["@Gmail draft a response", "mail-draft", "Draft reply"],
      ["@Gmail show recent announcements", "mail-summary", "View announcements"],
    ],
    modalTitle: "Connect Gmail to ElimuLink Institution",
    modalDescription:
      "Connect Gmail to review inbox activity, summarize messages, and draft replies from one clean institution workspace.",
    modalContextTitle: "Reference institutional email context",
    modalContextDescription:
      "Allow Gmail to use relevant institutional mail context for more helpful communication responses.",
    modalDataDescription:
      "Basic institution profile context, inbox metadata, message summaries, and sender information used for communication assistance.",
  },
  [GDRIVE_AVAILABLE_APP.id]: {
    app: GDRIVE_AVAILABLE_APP,
    connectedLabel: "Connected",
    successMessage: "Google Drive is now connected.",
    detailTitle: "Google Drive",
    detailDescription: "Access documents, notes, course files, and shared materials.",
    longDescription:
      "Google Drive helps institutions retrieve files, summarize recent documents, and locate shared materials directly from the workspace. Use it to keep timetables, policy files, and shared academic documents within easy reach.",
    infoRows: [
      ["Category", "Storage"],
      ["Capabilities", "File retrieval, folder summaries, shared document access"],
      ["Developer", "Google"],
      ["Website", "workspace.google.com", "https://workspace.google.com/products/drive/"],
      ["Privacy Policy", "Google privacy policy", "https://policies.google.com/privacy"],
      ["Data access", "File metadata, folder structures, and shared document references"],
    ],
    previews: [
      ["@Google Drive find semester timetables", "drive-files", "Open files"],
      ["@Google Drive show recent shared folders", "drive-folders", "View folders"],
      ["@Google Drive summarize updated documents", "drive-summary", "Review updates"],
    ],
    modalTitle: "Connect Google Drive to ElimuLink Institution",
    modalDescription:
      "Connect Google Drive to locate files, review shared materials, and summarize document activity from one clean institution workspace.",
    modalContextTitle: "Reference institutional file context",
    modalContextDescription:
      "Allow Google Drive to use relevant file and folder context for more helpful document responses.",
    modalDataDescription:
      "Basic institution profile context, file metadata, folder references, and shared document summaries used for document assistance.",
  },
  [OUTLOOK_APP.id]: {
    app: OUTLOOK_APP,
    connectedLabel: "Connected",
    successMessage: "Outlook is now connected.",
    detailTitle: "Outlook",
    detailDescription: "Connect institutional mail, contacts, and related workflows.",
    longDescription:
      "Outlook brings institutional email, contacts, and communication workflows into the ElimuLink workspace. Use it to review recent correspondence, draft replies, and keep communication records close to your institution operations.",
    infoRows: [
      ["Category", "Communication"],
      ["Capabilities", "Mail review, contact lookup, drafting, inbox summaries"],
      ["Developer", "Microsoft"],
      ["Website", "microsoft.com", "https://www.microsoft.com/microsoft-365/outlook/email-and-calendar-software-microsoft-outlook"],
      ["Privacy Policy", "Microsoft privacy statement", "https://privacy.microsoft.com/privacy"],
      ["Data access", "Mailbox metadata, contacts, thread summaries, and sender references"],
    ],
    previews: [
      ["@Outlook summarize my inbox", "outlook-inbox", "Open inbox"],
      ["@Outlook draft a staff reply", "outlook-draft", "Draft email"],
      ["@Outlook show urgent messages", "outlook-priority", "Review priority"],
    ],
    modalTitle: "Connect Outlook to ElimuLink Institution",
    modalDescription:
      "Connect Outlook to review email, contacts, and communication workflows from one clean institution workspace.",
    modalContextTitle: "Reference institutional Outlook context",
    modalContextDescription:
      "Allow Outlook to use relevant mail and contact context for more helpful communication responses.",
    modalDataDescription:
      "Basic institution profile context, mailbox metadata, contact information, and message summaries used for communication assistance.",
  },
  [ONEDRIVE_APP.id]: {
    app: ONEDRIVE_APP,
    connectedLabel: "Connected",
    successMessage: "OneDrive is now connected.",
    detailTitle: "OneDrive",
    detailDescription: "Sync cloud files and institutional documents across workspace tasks.",
    longDescription:
      "OneDrive connects institutional files and shared cloud documents into the ElimuLink workspace. Use it to locate documents, review updates, and keep cloud-based academic materials close to day-to-day workflows.",
    infoRows: [
      ["Category", "Storage"],
      ["Capabilities", "Cloud file sync, folder lookup, shared document access"],
      ["Developer", "Microsoft"],
      ["Website", "microsoft.com", "https://www.microsoft.com/microsoft-365/onedrive/online-cloud-storage"],
      ["Privacy Policy", "Microsoft privacy statement", "https://privacy.microsoft.com/privacy"],
      ["Data access", "Cloud file metadata, folder references, and shared document summaries"],
    ],
    previews: [
      ["@OneDrive show shared institution folders", "onedrive-folders", "Open folders"],
      ["@OneDrive summarize recent file updates", "onedrive-summary", "Review updates"],
      ["@OneDrive find board documents", "onedrive-files", "Locate files"],
    ],
    modalTitle: "Connect OneDrive to ElimuLink Institution",
    modalDescription:
      "Connect OneDrive to review cloud files, shared folders, and recent document updates from one clean institution workspace.",
    modalContextTitle: "Reference institutional OneDrive context",
    modalContextDescription:
      "Allow OneDrive to use relevant file and folder context for more helpful document responses.",
    modalDataDescription:
      "Basic institution profile context, cloud file metadata, shared folders, and document summaries used for document assistance.",
  },
};

const CORE_APPS = [
  CALENDAR_APP,
  MEET_APP,
];

const INSTITUTION_APPS = [ERP_APP, FEES_APP, RESULTS_APP];

const CONNECTED_APPS = [
  {
    id: "microsoft",
    name: "Microsoft",
    subtitle: "Connected",
    description: "Outlook, OneDrive, and Microsoft 365 workflows.",
    meta: "Last sync: 1 hour ago",
    icon: ShieldCheck,
    statusTone: "success",
  },
];

const GOOGLE_WORKSPACE_APPS = [
  {
    id: "gmail",
    name: "Gmail",
    handle: "@Gmail",
    icon: GmailMark,
    description: "Retrieve, summarize, draft and edit reply emails in your Gmail account.",
    capabilities: [
      "Find emails you need with a description, title, or sender",
      "Summarize unread emails and long threads",
      "Draft email replies you can edit before sending",
      "Get inbox answers based on recent messages",
    ],
    prompts: [
      "@Gmail Summarize unread emails",
      "@Gmail Draft a reply to the latest student inquiry",
      "@Gmail Triage my inbox",
    ],
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    handle: "@Google Calendar",
    icon: GoogleCalendarMark,
    description: "Review schedules, upcoming events, and important academic time blocks.",
    capabilities: [
      "Check what is on your schedule today",
      "Summarize upcoming meetings and events",
      "Find free time between classes and meetings",
      "Review this week’s planning at a glance",
    ],
    prompts: [
      "@Google Calendar What is on my schedule today?",
      "@Google Calendar Summarize my upcoming events",
      "@Google Calendar Find free time this afternoon",
    ],
  },
  {
    id: "google-chat",
    name: "Google Chat",
    handle: "@Google Chat",
    icon: GoogleChatMark,
    description: "Find recent chat discussions and summarize team conversations.",
    capabilities: [
      "Summarize recent conversations",
      "Find a message by topic or participant",
      "Pull quick updates from busy threads",
      "Help catch up on missed discussions",
    ],
    prompts: [
      "@Google Chat Summarize recent department conversations",
      "@Google Chat Find messages about exam moderation",
      "@Google Chat Catch me up on today’s updates",
    ],
  },
  {
    id: "google-docs",
    name: "Google Docs",
    handle: "@Google Docs",
    icon: GoogleDocsMark,
    description: "Search and summarize connected documents across your workspace.",
    capabilities: [
      "Find documents by topic",
      "Summarize long documents quickly",
      "Extract key points from policy drafts",
      "Compare notes across documents",
    ],
    prompts: [
      "@Google Docs Find documents about semester registration",
      "@Google Docs Summarize the latest senate memo",
      "@Google Docs Extract key deadlines from the policy draft",
    ],
  },
  {
    id: "google-drive",
    name: "Google Drive",
    handle: "@Google Drive",
    icon: GoogleDriveMark,
    description: "Locate files, folders, and shared materials across connected Drive content.",
    capabilities: [
      "Find files by title or purpose",
      "Locate shared folders for a department",
      "Summarize recently updated files",
      "Help retrieve missing course materials",
    ],
    prompts: [
      "@Google Drive Find the latest timetable files",
      "@Google Drive Show recently updated faculty folders",
      "@Google Drive Locate shared course materials for semester one",
    ],
  },
  {
    id: "google-keep",
    name: "Google Keep",
    handle: "@Google Keep",
    icon: GoogleKeepMark,
    description: "Review notes, reminders, and quick captures from your connected Keep content.",
    capabilities: [
      "Find notes by keyword",
      "Summarize reminder lists",
      "Pull recent planning notes",
      "Review action items from saved notes",
    ],
    prompts: [
      "@Google Keep Show my recent academic planning notes",
      "@Google Keep Summarize this week’s reminders",
      "@Google Keep Find notes about orientation planning",
    ],
  },
];

const AVAILABLE_APPS = [GMAIL_AVAILABLE_APP, GDRIVE_AVAILABLE_APP, OUTLOOK_APP, ONEDRIVE_APP];

const SHELVES = [
  {
    key: "core",
    label: "Core",
    eyebrow: "ElimuLink Core",
    title: "Built into your institution workspace",
    description:
      "Core ElimuLink apps stay close to teaching, planning, and coordination across the institution.",
    cta: "View ElimuLink Calendar",
    heroApp: CALENDAR_APP,
    items: CORE_APPS,
    stats: "2 core apps",
    heroTone: "from-[#0594d7] via-[#47c5ff] to-[#ffe77a]",
  },
  {
    key: "institution",
    label: "Institution",
    eyebrow: "Institution Apps",
    title: "Govern access to institution systems",
    description:
      "Keep regulated systems visible from one clean surface without mixing them into the main learning workspace.",
    cta: "Review access",
    heroApp: INSTITUTION_APPS[0],
    items: INSTITUTION_APPS,
    stats: "3 institution apps",
    heroTone: "from-[#0f172a] via-[#1d4ed8] to-[#60a5fa]",
  },
  {
    key: "connected",
    label: "Connected",
    eyebrow: "Already Linked",
    title: "Manage apps already linked to ElimuLink",
    description:
      "See active syncs, review integration health, and manage the services already working with your workspace.",
    cta: "Manage connections",
    heroApp: CONNECTED_APPS[0],
    items: CONNECTED_APPS,
    stats: "2 connected apps",
    heroTone: "from-[#0f766e] via-[#2dd4bf] to-[#dcfce7]",
  },
  {
    key: "available",
    label: "Available to connect",
    eyebrow: "Discover Apps",
    title: "Browse services your institution can connect",
    description:
      "Explore communication, storage, and meetings apps that can extend teaching and admin workflows.",
    cta: "Discover apps",
    heroApp: AVAILABLE_APPS[0],
    items: AVAILABLE_APPS,
    stats: "4 available apps",
    heroTone: "from-[#1d4ed8] via-[#60a5fa] to-[#dbeafe]",
  },
];

export default function InstitutionConnectedAppsPage({ onDetailViewChange, onPromptPrefill, onBack }) {
  const [activeShelf, setActiveShelf] = useState("core");
  const [selectedAppId, setSelectedAppId] = useState(null);
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [allowWorkspaceContext, setAllowWorkspaceContext] = useState(true);
  const [connectedNativeApps, setConnectedNativeApps] = useState({});
  const [successBanner, setSuccessBanner] = useState("");
  const [learnMoreAppId, setLearnMoreAppId] = useState(null);
  const [mobileSearch, setMobileSearch] = useState("");
  const [mobileCategory, setMobileCategory] = useState("all");

  const filteredShelves = useMemo(() => SHELVES, []);
  const activeShelfData = filteredShelves.find((shelf) => shelf.key === activeShelf) || filteredShelves[0];
  const activeItems = activeShelfData?.items || [];
  const midpoint = Math.ceil(activeItems.length / 2);
  const leftColumn = activeItems.slice(0, midpoint);
  const rightColumn = activeItems.slice(midpoint);
  const selectedGoogleApp = GOOGLE_WORKSPACE_APPS.find((app) => app.id === learnMoreAppId) || null;
  const selectedNativeApp = NATIVE_APP_DETAILS[selectedAppId] || null;
  const mobileApps = useMemo(() => {
    const allApps = Object.values(NATIVE_APP_DETAILS);
    const query = mobileSearch.trim().toLowerCase();
    return allApps.filter((entry) => {
      const matchesCategory = mobileCategory === "all"
        ? true
        : mobileCategory === "core"
          ? CORE_APPS.some((app) => app.id === entry.app.id)
          : mobileCategory === "institution"
            ? INSTITUTION_APPS.some((app) => app.id === entry.app.id)
            : mobileCategory === "connected"
              ? [GMAIL_AVAILABLE_APP.id, GDRIVE_AVAILABLE_APP.id, OUTLOOK_APP.id, ONEDRIVE_APP.id].includes(entry.app.id)
              : AVAILABLE_APPS.some((app) => app.id === entry.app.id);

      if (!matchesCategory) return false;
      if (!query) return true;
      return [
        entry.detailTitle,
        entry.detailDescription,
        entry.longDescription,
        entry.app.subtitle,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [mobileCategory, mobileSearch]);
  const visibleCount =
    activeShelf === "connected" ? GOOGLE_WORKSPACE_APPS.length + activeItems.length : activeItems.length;

  useEffect(() => {
    if (!successBanner) return undefined;
    const timer = window.setTimeout(() => setSuccessBanner(""), 3600);
    return () => window.clearTimeout(timer);
  }, [successBanner]);

  useEffect(() => {
    if (typeof onDetailViewChange !== "function") return undefined;
    onDetailViewChange(Boolean(selectedAppId));
    return () => onDetailViewChange(false);
  }, [onDetailViewChange, selectedAppId]);

  function openNativeAppDetails(appId) {
    setSelectedAppId(appId);
  }

  function handleConnectNativeApp() {
    if (!selectedNativeApp) return;
    setConnectedNativeApps((prev) => ({ ...prev, [selectedNativeApp.app.id]: true }));
    setConnectModalOpen(false);
    setSuccessBanner(selectedNativeApp.successMessage);
  }

  function handlePromptTry(prompt) {
    setLearnMoreAppId(null);
    if (typeof onPromptPrefill === "function") {
      onPromptPrefill(prompt);
    }
  }

  if (selectedNativeApp) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto bg-white dark:bg-[#020817]">
        <div className="md:hidden">
          <div className="mx-auto flex w-full max-w-[680px] flex-col px-6 pb-28 pt-8">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  if (connectModalOpen) {
                    setConnectModalOpen(false);
                    return;
                  }
                  setSelectedAppId(null);
                  if (typeof onBack === "function") onBack();
                }}
                className="grid h-14 w-14 place-items-center rounded-full bg-slate-100 text-slate-900 transition hover:bg-slate-200 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.1]"
                aria-label="Back"
              >
                <ArrowLeft size={26} />
              </button>
              <div className="text-[22px] font-semibold tracking-[-0.03em] text-slate-950 dark:text-white">Apps</div>
              <div className="rounded-full bg-slate-100 px-5 py-3 text-[17px] font-medium text-slate-950 dark:bg-white/[0.06] dark:text-white">
                GPTs
              </div>
            </div>

            <div className="mt-10 flex items-start gap-4">
              <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-white ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-white/10">
                <selectedNativeApp.app.icon className="h-10 w-10" size={34} />
              </div>
              <div className="min-w-0 pt-2">
                <h1 className="text-[32px] font-semibold tracking-[-0.04em] text-slate-950 dark:text-white">
                  {selectedNativeApp.detailTitle}
                </h1>
                <p className="mt-2 text-[16px] leading-7 text-slate-500 dark:text-slate-300">
                  {selectedNativeApp.detailDescription}
                </p>
                <button
                  type="button"
                  onClick={() => setConnectModalOpen(true)}
                  className="mt-5 rounded-full bg-slate-950 px-7 py-3 text-[16px] font-semibold text-white transition hover:bg-slate-900 dark:bg-white dark:text-[#08111f] dark:hover:bg-slate-100"
                >
                  {connectedNativeApps[selectedNativeApp.app.id] ? "Manage connection" : "Connect"}
                </button>
              </div>
            </div>

            <div className="mt-8 overflow-hidden rounded-[34px] bg-[linear-gradient(135deg,#b7ebff_0%,#47c5ff_45%,#fff2a7_100%)] p-4 shadow-[0_18px_44px_rgba(15,23,42,0.08)] dark:bg-[linear-gradient(135deg,rgba(59,130,246,0.42)_0%,rgba(6,182,212,0.38)_50%,rgba(15,23,42,0.92)_100%)]">
              <PreviewCard
                title={selectedNativeApp.previews[0]?.[0] || selectedNativeApp.detailTitle}
                variant={selectedNativeApp.previews[0]?.[1] || "upcoming"}
                footer={selectedNativeApp.previews[0]?.[2] || "Open app"}
              />
            </div>

            <div className="mt-10 text-[17px] leading-8 text-slate-600 dark:text-slate-300">
              {selectedNativeApp.longDescription}
            </div>

            <div className="mt-12">
              <div className="text-[28px] font-semibold tracking-[-0.03em] text-slate-950 dark:text-white">
                Information
              </div>
              <div className="mt-5 overflow-hidden rounded-[28px] border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.03]">
                {selectedNativeApp.infoRows.map(([label, value, href]) => (
                  <div key={label} className="grid grid-cols-[132px_minmax(0,1fr)] gap-4 border-t border-slate-200 px-5 py-5 first:border-t-0 dark:border-white/10">
                    <div className="text-[15px] text-slate-400 dark:text-slate-500">{label}</div>
                    <div className="text-[17px] font-medium text-slate-950 dark:text-white">
                      {href ? (
                        <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2">
                          <span>{value}</span>
                          <ExternalLink size={16} />
                        </a>
                      ) : (
                        value
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {connectModalOpen ? (
          <div className="fixed inset-0 z-[90] flex items-end bg-slate-950/44 backdrop-blur-sm md:hidden">
            <div className="w-full rounded-t-[34px] bg-white px-6 pb-7 pt-4 shadow-[0_-24px_64px_rgba(15,23,42,0.18)] dark:bg-[#020817]">
              <div className="mx-auto h-1.5 w-16 rounded-full bg-slate-300 dark:bg-white/15" />
              <div className="mt-6 flex items-center justify-center gap-5">
                <div className="grid h-20 w-20 place-items-center rounded-[24px] bg-white shadow-[0_10px_28px_rgba(15,23,42,0.08)] ring-1 ring-slate-200 dark:bg-white dark:ring-white/10">
                  <img src="/favicon.png" alt="ElimuLink logo" className="h-11 w-auto object-contain" />
                </div>
                <div className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-200 dark:bg-white/10" />
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-200 dark:bg-white/10" />
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-200 dark:bg-white/10" />
                </div>
                <div className="grid h-20 w-20 place-items-center rounded-[24px] bg-white shadow-[0_10px_28px_rgba(15,23,42,0.08)] ring-1 ring-slate-200 dark:bg-white dark:ring-white/10">
                  <selectedNativeApp.app.icon className="h-10 w-10 text-slate-950" size={34} />
                </div>
              </div>

              <div className="mt-7 text-center text-[28px] font-semibold tracking-[-0.04em] text-slate-950 dark:text-white">
                Connect {selectedNativeApp.detailTitle}
              </div>

              <div className="mt-7 overflow-hidden rounded-[28px] border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.03]">
                <div className="flex items-start gap-4 px-5 py-5">
                  <div className="min-w-0 flex-1">
                    <div className="text-[17px] font-semibold text-slate-950 dark:text-white">
                      {selectedNativeApp.modalContextTitle}
                    </div>
                    <div className="mt-2 text-[16px] leading-8 text-slate-700 dark:text-slate-300">
                      {selectedNativeApp.modalContextDescription}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAllowWorkspaceContext((value) => !value)}
                    className={[
                      "relative mt-1 h-12 w-20 rounded-full transition",
                      allowWorkspaceContext ? "bg-slate-950 dark:bg-white" : "bg-slate-200 dark:bg-white/10",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "absolute top-1.5 h-9 w-9 rounded-full bg-white shadow transition dark:bg-[#020817]",
                        allowWorkspaceContext ? "left-10 dark:bg-slate-950" : "left-1.5",
                      ].join(" ")}
                    />
                  </button>
                </div>
                <div className="border-t border-slate-200 px-5 py-5 text-[16px] leading-8 text-slate-800 dark:border-white/10 dark:text-slate-300">
                  <span className="font-semibold text-slate-950 dark:text-white">You&apos;re in control.</span>{" "}
                  ElimuLink respects your institution data preferences.
                </div>
                <div className="border-t border-slate-200 px-5 py-5 text-[16px] leading-8 text-slate-800 dark:border-white/10 dark:text-slate-300">
                  <span className="font-semibold text-slate-950 dark:text-white">Apps may introduce elevated risk.</span>{" "}
                  Keep connections deliberate and review data access carefully before enabling them.
                </div>
                <div className="border-t border-slate-200 px-5 py-5 text-[16px] leading-8 text-slate-800 dark:border-white/10 dark:text-slate-300">
                  <span className="font-semibold text-slate-950 dark:text-white">Data shared with this app.</span>{" "}
                  {selectedNativeApp.modalDataDescription}
                </div>
              </div>

              <button
                type="button"
                onClick={handleConnectNativeApp}
                className="mt-6 w-full rounded-full bg-slate-950 px-6 py-4 text-[17px] font-semibold text-white dark:bg-white dark:text-[#08111f]"
              >
                Connect {selectedNativeApp.detailTitle}
              </button>
              <button
                type="button"
                onClick={() => setConnectModalOpen(false)}
                className="mt-3 w-full text-center text-[15px] font-medium text-slate-500 dark:text-slate-400"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        <div className="hidden md:block">
        <div className="mx-auto flex w-full max-w-[1380px] flex-col gap-8 px-4 pb-10 pt-14 md:px-6 md:pt-5 lg:px-8 xl:px-10">
          {successBanner ? (
            <div className="mx-auto inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(5,150,105,0.28)]">
              <CheckCircle2 size={16} />
              {successBanner}
            </div>
          ) : null}

          <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
            <span>Apps</span>
            <span>/</span>
            <span className="font-medium text-slate-900 dark:text-white">{selectedNativeApp.detailTitle}</span>
          </div>

          <section className="px-1 py-1 lg:px-2">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-4">
                <BrandIconShell label={selectedNativeApp.detailTitle} tone="gradient" className="h-16 w-16">
                  <selectedNativeApp.app.icon size={24} />
                </BrandIconShell>
                <div className="min-w-0">
                  <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-slate-950 dark:text-white lg:text-[34px]">
                    {selectedNativeApp.detailTitle}
                  </h1>
                  <p className="mt-2 text-[15px] text-slate-600 dark:text-slate-300 lg:text-[16px]">
                    {selectedNativeApp.detailDescription}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {connectedNativeApps[selectedNativeApp.app.id] ? <StatusPill tone="success">{selectedNativeApp.connectedLabel}</StatusPill> : null}
                <button
                  type="button"
                  onClick={() => setConnectModalOpen(true)}
                  className={[
                    "rounded-full px-5 py-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#315cff]/35",
                    connectedNativeApps[selectedNativeApp.app.id]
                      ? "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/12 dark:text-emerald-200"
                      : "bg-gradient-to-r from-[#0f172a] via-[#1d4ed8] to-[#06b6d4] text-white shadow-[0_18px_32px_rgba(29,78,216,0.28)] hover:translate-y-[-1px] hover:shadow-[0_20px_36px_rgba(29,78,216,0.36)] dark:from-white dark:via-slate-100 dark:to-cyan-100 dark:text-[#08111f] dark:ring-1 dark:ring-white/40 dark:shadow-[0_18px_32px_rgba(8,47,73,0.28)]",
                  ].join(" ")}
                >
                  {connectedNativeApps[selectedNativeApp.app.id] ? "Manage connection" : "Connect"}
                </button>
              </div>
            </div>

            <div className="mt-8 grid gap-5 lg:grid-cols-3">
              {selectedNativeApp.previews.map(([title, variant, footer]) => (
                <PreviewCard key={title} title={title} variant={variant} footer={footer} />
              ))}
            </div>
          </section>

          <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-white/10 dark:bg-[#111827] lg:p-8">
            <p className="max-w-5xl text-[16px] leading-8 text-slate-700 dark:text-slate-200">
              {selectedNativeApp.longDescription}
            </p>
          </section>

          <section className="rounded-[30px] border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-white/10 dark:bg-[#111827]">
            <div className="px-5 pt-5 text-[28px] font-semibold tracking-[-0.02em] text-slate-950 dark:text-white">
              Information
            </div>
            <div className="mt-4">
              {selectedNativeApp.infoRows.map(([label, value, href]) => (
                <InfoRow key={label} label={label} value={value} href={href} />
              ))}
            </div>
          </section>
        </div>

        {connectModalOpen ? (
          <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/56 px-4 py-4 backdrop-blur-sm">
            <div className="max-h-[calc(100vh-2rem)] w-full max-w-[760px] overflow-auto rounded-[34px] border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.22)] dark:border-white/10 dark:bg-slate-950">
              <div className="relative bg-[linear-gradient(135deg,#7dd3fc_0%,#3b82f6_52%,#fcd34d_100%)] px-6 pb-7 pt-5 dark:bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.2),transparent_28%),linear-gradient(135deg,rgba(29,78,216,0.96)_0%,rgba(59,130,246,0.88)_50%,rgba(15,23,42,0.96)_100%)]">
                <button
                  type="button"
                  onClick={() => setConnectModalOpen(false)}
                  className="absolute right-5 top-5 grid h-9 w-9 place-items-center rounded-full bg-white/24 text-white backdrop-blur-xl transition hover:bg-white/34 dark:bg-white/14 dark:text-white dark:ring-1 dark:ring-white/16 dark:hover:bg-white/22"
                >
                  <X size={18} />
                </button>
                <div className="mx-auto flex w-fit items-center gap-4 rounded-[24px] bg-white/18 px-5 py-3.5 backdrop-blur-xl dark:bg-slate-950/18 dark:ring-1 dark:ring-white/10">
                  <div className="rounded-2xl bg-white p-2 shadow-sm dark:bg-white/95">
                    <img src="/favicon.png" alt="ElimuLink logo" className="h-10 w-auto object-contain" />
                  </div>
                  <div className="h-10 w-px bg-white/40" />
                  <div className="rounded-2xl bg-slate-950 p-3 text-white dark:bg-[#08111f] dark:ring-1 dark:ring-white/10">
                    <selectedNativeApp.app.icon size={22} />
                  </div>
                </div>
                <div className="mx-auto mt-5 max-w-[40rem] text-center">
                  <div className="text-[18px] font-semibold text-white md:text-[20px]">
                    {selectedNativeApp.modalTitle}
                  </div>
                  <p className="mt-3 text-[15px] leading-7 text-white/92">
                    {selectedNativeApp.modalDescription}
                  </p>
                </div>
                <div className="mt-5 flex justify-center">
                  <button
                    type="button"
                    onClick={handleConnectNativeApp}
                    className="rounded-full bg-slate-950 px-7 py-3 text-sm font-semibold text-white shadow-[0_18px_36px_rgba(15,23,42,0.22)] transition hover:scale-[1.01] hover:bg-slate-900 dark:bg-white dark:text-[#08111f] dark:ring-1 dark:ring-white/40 dark:shadow-[0_16px_36px_rgba(8,15,30,0.42)] dark:hover:bg-slate-100"
                  >
                    Connect
                  </button>
                </div>
              </div>

              <div className="space-y-5 px-6 py-6">
                <div className="flex items-start justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-4 dark:bg-white/[0.04]">
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                      {selectedNativeApp.modalContextTitle}
                    </div>
                    <div className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                      {selectedNativeApp.modalContextDescription}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAllowWorkspaceContext((value) => !value)}
                    className={[
                      "relative h-7 w-12 rounded-full transition",
                      allowWorkspaceContext ? "bg-slate-950 dark:bg-white" : "bg-slate-300 dark:bg-slate-700",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "absolute top-1 h-5 w-5 rounded-full bg-white shadow transition dark:bg-slate-950",
                        allowWorkspaceContext ? "left-6 dark:bg-slate-950" : "left-1",
                      ].join(" ")}
                    />
                  </button>
                </div>

                <div className="space-y-3 border-t border-slate-200 pt-4 text-sm leading-7 text-slate-600 dark:border-white/10 dark:text-slate-300">
                  <p>
                    <span className="font-semibold text-slate-900 dark:text-white">You’re in control.</span>{" "}
                    ElimuLink respects your institution data preferences and connection settings.
                  </p>
                  <p>
                    <span className="font-semibold text-slate-900 dark:text-white">Data shared with this app.</span>{" "}
                    {selectedNativeApp.modalDataDescription}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-white dark:bg-[#020817]">
      <div className="mx-auto flex w-full max-w-[720px] flex-col px-6 pb-12 pt-8 md:hidden">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (typeof onBack === "function") onBack();
            }}
            className="grid h-14 w-14 place-items-center rounded-full bg-slate-100 text-slate-900 transition hover:bg-slate-200 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.1]"
            aria-label="Back"
          >
            <ArrowLeft size={26} />
          </button>
          <div className="text-[22px] font-semibold tracking-[-0.03em] text-slate-950 dark:text-white">Apps</div>
          <div className="rounded-full bg-slate-100 px-5 py-3 text-[17px] font-medium text-slate-950 dark:bg-white/[0.06] dark:text-white">
            GPTs
          </div>
        </div>

        <div className="mt-8 rounded-full bg-slate-100 px-5 py-4 dark:bg-white/[0.06]">
          <div className="flex items-center gap-3">
            <Search size={24} className="text-slate-400 dark:text-slate-500" />
            <input
              value={mobileSearch}
              onChange={(event) => setMobileSearch(event.target.value)}
              placeholder="Search apps"
              className="w-full bg-transparent text-[17px] text-slate-950 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500"
            />
          </div>
        </div>

        <div className="mt-7 flex gap-3 overflow-x-auto pb-1">
          {[
            ["all", "All"],
            ["core", "Core"],
            ["institution", "Institution"],
            ["connected", "Connected"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setMobileCategory(key)}
              className={[
                "shrink-0 rounded-full px-5 py-3 text-[16px] font-medium transition",
                mobileCategory === key
                  ? "bg-slate-100 text-slate-950 dark:bg-white dark:text-[#08111f]"
                  : "text-slate-500 dark:text-slate-400",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-5 divide-y divide-slate-200 dark:divide-white/10">
          {mobileApps.map((entry) => (
            <MobileAppRow
              key={entry.app.id}
              app={entry}
              onClick={() => openNativeAppDetails(entry.app.id)}
            />
          ))}
        </div>
      </div>

      <div className="hidden md:block">
      <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-6 px-4 pb-8 pt-14 md:px-6 md:pt-4 lg:px-8 xl:px-10">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            <ShieldCheck size={13} />
            <span>Connected Apps</span>
          </div>
          <h1 className="text-[34px] font-semibold tracking-[-0.03em] text-slate-950 dark:text-white lg:text-[42px]">
            Connected Apps
          </h1>
        </div>

        <section
          className={[
            "relative overflow-hidden rounded-[34px] border border-slate-200 px-6 py-6 shadow-[0_14px_34px_rgba(15,23,42,0.06)] dark:border-white/10 dark:shadow-[0_20px_44px_rgba(0,0,0,0.28)] lg:px-8 lg:py-8",
            `bg-gradient-to-br ${activeShelfData.heroTone}`,
          ].join(" ")}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.9),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.28),transparent_30%)] dark:bg-[linear-gradient(180deg,rgba(2,6,23,0.18),rgba(2,6,23,0.34)),radial-gradient(circle_at_top_right,rgba(255,255,255,0.25),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(15,23,42,0.35),transparent_34%)]" />
          <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center">
            <div className="max-w-[540px]">
              <SectionEyebrow>{activeShelfData.eyebrow}</SectionEyebrow>
              <h2 className="mt-3 text-[30px] font-semibold tracking-[-0.03em] text-slate-950 dark:text-white lg:text-[40px]">
                {activeShelfData.title}
              </h2>
              <p className="mt-3 max-w-[48ch] text-[15px] leading-7 text-slate-800/85 dark:text-slate-100/92">
                {activeShelfData.description}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={NATIVE_APP_DETAILS[activeShelfData.heroApp.id] ? () => openNativeAppDetails(activeShelfData.heroApp.id) : undefined}
                  className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-900 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
                >
                  {activeShelfData.cta}
                </button>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/75 px-4 py-2 text-sm font-medium text-slate-700 backdrop-blur-xl dark:border-white/12 dark:bg-slate-950/50 dark:text-slate-100">
                  <Sparkles size={15} />
                  {activeShelfData.stats}
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute right-6 top-0 rounded-full border border-white/70 bg-white/80 px-4 py-2 text-sm font-medium text-slate-800 shadow-[0_10px_24px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/12 dark:bg-slate-950/52 dark:text-slate-100 dark:shadow-[0_10px_28px_rgba(0,0,0,0.3)]">
                @{activeShelfData.heroApp.name.toLowerCase().replace(/\s+/g, "-")}
              </div>
              <div className="pt-16">
                <div className="rounded-[28px] border border-white/55 bg-white/86 p-4 shadow-[0_18px_34px_rgba(15,23,42,0.14)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/78">
                  <div className="flex items-start gap-3">
                    <BrandIconShell label={activeShelfData.heroApp.name} tone="gradient">
                      <activeShelfData.heroApp.icon size={18} />
                    </BrandIconShell>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">{activeShelfData.heroApp.name}</div>
                      <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">{activeShelfData.heroApp.subtitle}</div>
                    </div>
                  </div>
                  <div className="mt-4 rounded-2xl bg-slate-50 px-3 py-3 text-xs text-slate-700 dark:bg-white/6 dark:text-slate-200">
                    Ready inside the institution workspace with a clean desktop entry point.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          {filteredShelves.map((shelf) => (
            <button
              key={shelf.key}
              type="button"
              onClick={() => setActiveShelf(shelf.key)}
              className={[
                "rounded-full px-4 py-2 text-sm font-medium transition",
                activeShelf === shelf.key
                  ? "bg-slate-900 text-white shadow-[0_8px_18px_rgba(15,23,42,0.12)]"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:bg-white/[0.05]",
              ].join(" ")}
            >
              {shelf.label}
            </button>
          ))}
        </div>

        <section className="p-0 lg:p-0">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <SectionEyebrow>{activeShelfData.eyebrow}</SectionEyebrow>
              <h3 className="mt-2 text-[26px] font-semibold tracking-[-0.02em] text-slate-950 dark:text-white">
                {activeShelfData.label}
              </h3>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
              <CheckCircle2 size={15} />
              {visibleCount} showing
            </div>
          </div>

          {activeShelf === "connected" ? (
            <div className="space-y-4">
              <GoogleWorkspaceCard apps={GOOGLE_WORKSPACE_APPS} onLearnMore={setLearnMoreAppId} />
              <div className="grid gap-4 xl:grid-cols-2">
                <div className="space-y-4">
                  {leftColumn.map((app) => (
                    <AppRow key={app.id} app={app} />
                  ))}
                </div>
                <div className="space-y-4">
                  {rightColumn.map((app) => (
                    <AppRow key={app.id} app={app} />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="space-y-4">
                {leftColumn.map((app) => (
                  <AppRow
                    key={app.id}
                    app={{
                      ...app,
                      subtitle: connectedNativeApps[app.id] ? "Connected" : app.subtitle,
                      statusTone: connectedNativeApps[app.id] ? "success" : app.statusTone,
                      meta: connectedNativeApps[app.id] ? "Connected to your institution workspace" : app.meta,
                    }}
                    active={Boolean(connectedNativeApps[app.id]) && selectedAppId === null}
                    onClick={NATIVE_APP_DETAILS[app.id] ? () => openNativeAppDetails(app.id) : undefined}
                  />
                ))}
              </div>
              <div className="space-y-4">
                {rightColumn.map((app) => (
                  <AppRow
                    key={app.id}
                    app={{
                      ...app,
                      subtitle: connectedNativeApps[app.id] ? "Connected" : app.subtitle,
                      statusTone: connectedNativeApps[app.id] ? "success" : app.statusTone,
                      meta: connectedNativeApps[app.id] ? "Connected to your institution workspace" : app.meta,
                    }}
                    active={Boolean(connectedNativeApps[app.id]) && selectedAppId === null}
                    onClick={NATIVE_APP_DETAILS[app.id] ? () => openNativeAppDetails(app.id) : undefined}
                  />
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {selectedGoogleApp ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/48 px-4 backdrop-blur-sm">
          <div className="w-full max-w-[860px] rounded-[34px] border border-slate-200 bg-white px-6 py-6 shadow-[0_30px_80px_rgba(15,23,42,0.22)] dark:border-white/10 dark:bg-[#111827] md:px-8">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white ring-1 ring-slate-200 dark:bg-slate-950 dark:ring-white/10">
                  <selectedGoogleApp.icon className="h-8 w-8" />
                </div>
                <div>
                  <div className="text-[18px] font-semibold text-slate-950 dark:text-white md:text-[20px]">
                    {selectedGoogleApp.name}
                  </div>
                  <div className="mt-1 text-[15px] text-slate-500 dark:text-slate-300">
                    {selectedGoogleApp.handle}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLearnMoreAppId(null)}
                className="grid h-10 w-10 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-white/[0.06] dark:hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-8 text-[15px] leading-8 text-slate-700 dark:text-slate-200">
              {selectedGoogleApp.description}
            </div>

            <div className="mt-6 border-t border-slate-200 pt-5 dark:border-white/10">
              <div className="text-[18px] font-medium text-slate-950 dark:text-white">
                Using the {selectedGoogleApp.name} app, ElimuLink can:
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {selectedGoogleApp.capabilities.map((capability) => (
                  <div key={capability} className="flex items-start gap-3 text-[15px] leading-7 text-slate-700 dark:text-slate-200">
                    <span className="mt-1 text-[#1d4ed8] dark:text-[#7cb6ff]">✓</span>
                    <span>{capability}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 border-t border-slate-200 pt-5 dark:border-white/10">
              <div className="text-[18px] font-medium text-slate-950 dark:text-white">Prompts to try</div>
              <div className="mt-4 flex flex-wrap gap-3">
                {selectedGoogleApp.prompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => handlePromptTry(prompt)}
                    className="rounded-full bg-[#1d5fe2] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#184fc0] dark:bg-[#315cff] dark:hover:bg-[#456bff]"
                  >
                    {prompt.replace(selectedGoogleApp.handle + " ", "")}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
      </div>
    </div>
  );
}
