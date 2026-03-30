import { useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, FileText, Info, Shield } from "lucide-react";
import { INSTITUTION_MOBILE_SETTINGS_LINKS, openInstitutionMobileSettingsLink } from "../lib/institutionMobileSettingsLinks";

const APP_VERSION = "1.0.0";

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

function RowButton({ label, subtitle, icon: Icon, onClick, showDivider = false, trailing = "chevron" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex w-full items-center gap-3 px-1 py-4 text-left transition",
        showDivider ? "border-t border-slate-200/80 dark:border-white/10" : "",
      ].join(" ")}
    >
      <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-slate-700 ring-1 ring-slate-200/75 dark:bg-slate-900 dark:text-slate-100 dark:ring-white/10">
        <Icon size={17} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-medium tracking-[-0.01em] text-slate-950 dark:text-slate-50">{label}</div>
        <div className="mt-0.5 text-[13px] leading-5 text-slate-500 dark:text-slate-300">{subtitle}</div>
      </div>
      {trailing === "external" ? (
        <ExternalLink size={17} className="shrink-0 text-slate-300 dark:text-slate-500" />
      ) : (
        <ChevronRight size={18} className="shrink-0 text-slate-300 dark:text-slate-500" />
      )}
    </button>
  );
}

function InfoSheet({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40">
      <button type="button" className="absolute inset-0 bg-slate-950/35" aria-label="Close" onClick={onClose} />
      <div
        className="absolute inset-x-0 bottom-0 rounded-t-[30px] bg-white px-4 pt-3 shadow-[0_-22px_60px_rgba(15,23,42,0.22)] ring-1 ring-slate-200/80 dark:bg-slate-950 dark:ring-white/10"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto h-1.5 w-12 rounded-full bg-slate-200 dark:bg-slate-700" />
        <div className="px-1 pt-4 pb-2">
          <div className="text-[1.1rem] font-medium tracking-[-0.02em] text-slate-950 dark:text-slate-50">Licenses</div>
          <div className="mt-1 text-[13px] leading-5 text-slate-500 dark:text-slate-300">
            Open-source license details can be connected here later without changing the About page structure.
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 inline-flex w-full items-center justify-center rounded-[22px] bg-slate-950 px-4 py-3 text-sm font-semibold text-white dark:bg-slate-100 dark:text-slate-900"
        >
          Done
        </button>
      </div>
    </div>
  );
}

export default function InstitutionMobileAboutSettingsPage({ onBack }) {
  const [showLicenses, setShowLicenses] = useState(false);

  return (
    <div className="min-h-[100dvh] bg-[linear-gradient(180deg,#fbfcfe_0%,#f6f8fb_100%)] dark:bg-[linear-gradient(180deg,#06111f_0%,#0a1527_100%)]">
      <MobilePageBar title="About" onBack={onBack} />

      <div className="px-4 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <section className={surfaceClasses("px-4 py-3")}>
          <SectionHeading
            title="About"
            description="Helpful platform information, legal links, and app details for this Institution mobile experience."
          />
          <RowButton
            label="Help center"
            subtitle="Support articles and guidance"
            icon={Info}
            onClick={() => openInstitutionMobileSettingsLink(INSTITUTION_MOBILE_SETTINGS_LINKS.helpCenter)}
            trailing="external"
          />
          <RowButton
            label="Terms of use"
            subtitle="Platform terms and usage conditions"
            icon={FileText}
            onClick={() => openInstitutionMobileSettingsLink(INSTITUTION_MOBILE_SETTINGS_LINKS.termsOfUse)}
            trailing="external"
            showDivider
          />
          <RowButton
            label="Privacy policy"
            subtitle="How privacy and account data are handled"
            icon={Shield}
            onClick={() => openInstitutionMobileSettingsLink(INSTITUTION_MOBILE_SETTINGS_LINKS.privacyPolicy)}
            trailing="external"
            showDivider
          />
          <RowButton
            label="Licenses"
            subtitle="Open-source software notices"
            icon={FileText}
            onClick={() => setShowLicenses(true)}
            showDivider
          />
        </section>

        <section className={surfaceClasses("mt-4 px-4 py-4")}>
          <SectionHeading title="App info" description="Current platform information for this mobile settings surface." />
          <div className="px-1">
            <div className="text-[15px] font-medium tracking-[-0.01em] text-slate-950">ElimuLink Institution</div>
            <div className="mt-1 text-[13px] leading-5 text-slate-500">Web app | Mobile browser | Version {APP_VERSION}</div>
          </div>
        </section>
      </div>

      <InfoSheet open={showLicenses} onClose={() => setShowLicenses(false)} />
    </div>
  );
}
