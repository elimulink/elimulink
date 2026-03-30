import { Building2, ChevronLeft, Mail, Shield } from "lucide-react";

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

function InfoRow({ icon: Icon, label, value, showDivider = false }) {
  return (
    <div className={[showDivider ? "border-t border-slate-200/80" : "", "flex items-start gap-3 px-1 py-4"].join(" ")}>
      <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-slate-700 ring-1 ring-slate-200/75 dark:bg-slate-900 dark:text-slate-100 dark:ring-white/10">
        <Icon size={17} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-medium tracking-[-0.01em] text-slate-950 dark:text-slate-50">{label}</div>
        <div className="mt-0.5 text-[13px] leading-5 text-slate-500 dark:text-slate-300">{value}</div>
      </div>
    </div>
  );
}

export default function InstitutionMobileWorkspaceSettingsPage({ user, onBack }) {
  const workspaceLabel = "Institution workspace";
  const institutionName = String(user?.institutionName || user?.organizationName || "ElimuLink Institution").trim();
  const accountEmail = String(user?.email || "institution@elimulink.demo").trim();

  return (
    <div className="min-h-[100dvh] bg-[linear-gradient(180deg,#fbfcfe_0%,#f6f8fb_100%)] dark:bg-[linear-gradient(180deg,#06111f_0%,#0a1527_100%)]">
      <MobilePageBar title="Workspace" onBack={onBack} />

      <div className="px-4 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <section className={surfaceClasses("px-4 py-4")}>
          <SectionHeading
            title="Workspace"
            description="A small in-app summary of the current Institution workspace context on this device."
          />
          <InfoRow icon={Building2} label="Workspace type" value={workspaceLabel} />
          <InfoRow icon={Shield} label="Institution" value={institutionName} showDivider />
          <InfoRow icon={Mail} label="Account context" value={accountEmail} showDivider />
        </section>

        <div className="mt-4 rounded-[22px] bg-slate-50/90 px-4 py-4 text-[13px] leading-6 text-slate-500 ring-1 ring-slate-200/75 dark:bg-slate-900/80 dark:text-slate-300 dark:ring-white/10">
          Department, subgroup, and deeper academic workspace context can appear here later without changing this mobile surface.
        </div>
      </div>
    </div>
  );
}
