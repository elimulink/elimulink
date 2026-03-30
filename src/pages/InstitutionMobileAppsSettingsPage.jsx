import { useMemo, useState } from "react";
import {
  AppWindow,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileText,
  FolderOpen,
  Mail,
  MessageSquareText,
  Video,
} from "lucide-react";

const APP_SERVICES = [
  {
    id: "gmail",
    label: "Gmail",
    description: "Email assistance",
    status: "Connected",
    icon: Mail,
    tone: "bg-rose-50 text-rose-600 ring-rose-200/80",
  },
  {
    id: "drive",
    label: "Google Drive",
    description: "Files and folders",
    status: "Available",
    icon: FolderOpen,
    tone: "bg-emerald-50 text-emerald-600 ring-emerald-200/80",
  },
  {
    id: "docs",
    label: "Google Docs",
    description: "Document drafting",
    status: "Available",
    icon: FileText,
    tone: "bg-sky-50 text-sky-600 ring-sky-200/80",
  },
  {
    id: "calendar",
    label: "Google Calendar",
    description: "Events and reminders",
    status: "Available",
    icon: CalendarDays,
    tone: "bg-amber-50 text-amber-600 ring-amber-200/80",
  },
  {
    id: "meet",
    label: "Meet",
    description: "Meetings and calls",
    status: "Available",
    icon: Video,
    tone: "bg-teal-50 text-teal-600 ring-teal-200/80",
  },
  {
    id: "el-calendar",
    label: "ElimuLink Calendar",
    description: "Academic planning",
    status: "Connected",
    icon: CalendarDays,
    tone: "bg-indigo-50 text-indigo-600 ring-indigo-200/80",
  },
  {
    id: "el-meet",
    label: "ElimuLink Meet",
    description: "Institution sessions",
    status: "Connected",
    icon: MessageSquareText,
    tone: "bg-slate-100 text-slate-700 ring-slate-200/80",
  },
];

function surfaceClasses(extra = "") {
  return `rounded-[28px] bg-white/96 shadow-[0_16px_48px_rgba(15,23,42,0.05)] ring-1 ring-slate-200/75 dark:bg-slate-900/96 dark:ring-white/10 dark:shadow-[0_20px_60px_rgba(2,8,23,0.34)] ${extra}`.trim();
}

function MobilePageBar({ title, onBack }) {
  return (
    <div className="sticky top-0 z-10 bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(248,250,252,0.92)_72%,rgba(248,250,252,0))] px-4 pt-3 pb-4 backdrop-blur-[2px] dark:bg-[linear-gradient(180deg,rgba(6,17,31,0.98),rgba(6,17,31,0.92)_72%,rgba(6,17,31,0))]">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/80 dark:bg-slate-900 dark:text-slate-100 dark:ring-white/10"
          aria-label="Back"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="min-w-0 flex-1 pt-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-300">Institution settings</div>
          <div className="mt-0.5 text-[1.35rem] font-semibold leading-none tracking-[-0.02em] text-slate-950 dark:text-slate-50">{title}</div>
        </div>
      </div>
    </div>
  );
}

function SectionHeading({ title, description }) {
  return (
    <div className="px-1 pb-2">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-300">{title}</div>
      {description ? <div className="mt-1 text-[13px] leading-5 text-slate-500 dark:text-slate-300">{description}</div> : null}
    </div>
  );
}

function ServiceRow({ service, onClick, showDivider = false }) {
  const Icon = service.icon;
  const connected = service.status === "Connected";

  return (
    <button
      type="button"
      onClick={() => onClick(service)}
      className={[
        "flex w-full items-center gap-3 px-1 py-4 text-left transition",
        showDivider ? "border-t border-slate-200/80 dark:border-white/10" : "",
      ].join(" ")}
    >
      <div className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ${service.tone}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-medium tracking-[-0.01em] text-slate-950 dark:text-slate-50">{service.label}</div>
        <div className="mt-0.5 text-[13px] leading-5 text-slate-500 dark:text-slate-300">{service.description}</div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span
          className={[
            "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]",
            connected ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-200",
          ].join(" ")}
        >
          {service.status}
        </span>
        <ChevronRight size={18} className="text-slate-300 dark:text-slate-500" />
      </div>
    </button>
  );
}

function UtilityRow({ label, subtitle, icon: Icon, onClick, showDivider = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex w-full items-center gap-3 px-1 py-4 text-left transition",
        showDivider ? "border-t border-slate-200/80" : "",
      ].join(" ")}
    >
      <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-slate-700 ring-1 ring-slate-200/75">
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-medium tracking-[-0.01em] text-slate-950">{label}</div>
        <div className="mt-0.5 text-[13px] leading-5 text-slate-500">{subtitle}</div>
      </div>
      <ChevronRight size={18} className="shrink-0 text-slate-300" />
    </button>
  );
}

function ServiceSheet({ service, onClose }) {
  if (!service) return null;

  const Icon = service.icon;
  const connected = service.status === "Connected";

  return (
    <div className="fixed inset-0 z-40">
      <button type="button" className="absolute inset-0 bg-slate-950/35" aria-label="Close" onClick={onClose} />
      <div
        className="absolute inset-x-0 bottom-0 rounded-t-[30px] bg-white px-4 pt-3 shadow-[0_-22px_60px_rgba(15,23,42,0.22)] ring-1 ring-slate-200/80"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto h-1.5 w-12 rounded-full bg-slate-200" />
        <div className="flex items-start gap-3 px-1 pt-4 pb-2">
          <div className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 ${service.tone}`}>
            <Icon size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[1.1rem] font-medium tracking-[-0.02em] text-slate-950">{service.label}</div>
            <div className="mt-1 text-[13px] leading-5 text-slate-500">{service.description}</div>
          </div>
        </div>

        <div className="mt-3 overflow-hidden rounded-[24px] bg-slate-50/90 ring-1 ring-slate-200/80">
          <div className="px-4 py-4">
            <div className="text-[15px] font-medium text-slate-950">Status</div>
            <div className="mt-1 text-[13px] leading-5 text-slate-500">
              {connected
                ? "This service is shown as connected in the current mobile frontend."
                : "This service is available for a later connection flow in mobile settings."}
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              window.alert(
                connected
                  ? `${service.label} management is still frontend-first in this mobile Apps step.`
                  : `${service.label} connection is still frontend-first in this mobile Apps step.`
              )
            }
            className="flex w-full items-center justify-between border-t border-slate-200/80 px-4 py-4 text-left"
          >
            <div>
              <div className="text-[15px] font-medium text-slate-950">{connected ? "Manage service" : "Connect service"}</div>
              <div className="mt-0.5 text-[13px] leading-5 text-slate-500">
                {connected ? "Permissions and sync settings will be shaped later." : "Connection permissions are not fully wired yet."}
              </div>
            </div>
            <ChevronRight size={18} className="text-slate-300" />
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 inline-flex w-full items-center justify-center rounded-[22px] bg-slate-950 px-4 py-3 text-sm font-semibold text-white"
        >
          Done
        </button>
      </div>
    </div>
  );
}

export default function InstitutionMobileAppsSettingsPage({ onBack }) {
  const [activeService, setActiveService] = useState(null);
  const summary = useMemo(() => {
    const connectedCount = APP_SERVICES.filter((service) => service.status === "Connected").length;
    return `${connectedCount} connected · ${APP_SERVICES.length - connectedCount} available`;
  }, []);

  return (
    <div className="min-h-[100dvh] bg-[linear-gradient(180deg,#fbfcfe_0%,#f6f8fb_100%)] dark:bg-[linear-gradient(180deg,#06111f_0%,#0a1527_100%)]">
      <MobilePageBar title="Apps" onBack={onBack} />

      <div className="px-4 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <section className={surfaceClasses("px-4 py-3")}>
          <SectionHeading
            title="Connected services"
            description="Manage the services ElimuLink can use with your Institution workspace. Connection state is still frontend-first in this mobile step."
          />

          {APP_SERVICES.map((service, index) => (
            <ServiceRow
              key={service.id}
              service={service}
              onClick={setActiveService}
              showDivider={index > 0}
            />
          ))}
        </section>

        <section className={surfaceClasses("mt-4 px-4 py-3")}>
          <UtilityRow
            label="Explore / connect apps"
            subtitle={summary}
            icon={AppWindow}
            onClick={() => window.alert("App discovery and connection setup are being shaped for a later mobile step.")}
          />
          <UtilityRow
            label="Advanced settings"
            subtitle="Permissions, usage, and sync controls"
            icon={ChevronRight}
            onClick={() => window.alert("Advanced app settings are still frontend-first in this mobile Apps step.")}
            showDivider
          />
        </section>

        <div className="mt-4 rounded-[22px] bg-slate-50/90 px-4 py-4 text-[13px] leading-6 text-slate-500 ring-1 ring-slate-200/75 dark:bg-slate-900/80 dark:text-slate-300 dark:ring-white/10">
          App connections in this mobile page are presented as a simple connected-services list first. Full connection and permission flows remain intentionally limited in this pass.
        </div>
      </div>

      <ServiceSheet service={activeService} onClose={() => setActiveService(null)} />
    </div>
  );
}
