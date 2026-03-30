import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Link2,
  Shield,
  UserPlus,
  Users,
} from "lucide-react";
import { getStoredPreferences, saveStoredPreferences } from "../lib/userSettings";

const RELATIONSHIP_ROWS = [
  {
    id: "family-member",
    label: "Add family member",
    subtitle: "Prepare family relationship setup for supervised access.",
    icon: Users,
    message: "Family member linking will be connected here later.",
  },
  {
    id: "institution-account",
    label: "Link institution account",
    subtitle: "Reserve the relationship between a supervised profile and an institution account.",
    icon: Link2,
    message: "Institution account linking will open here later.",
  },
  {
    id: "guardian",
    label: "Assign guardian / parent",
    subtitle: "Choose who can supervise the linked learner profile.",
    icon: Shield,
    message: "Guardian assignment will be connected here later.",
  },
  {
    id: "student",
    label: "Add student under supervision",
    subtitle: "Reserve the supervised student relationship for family or institution oversight.",
    icon: UserPlus,
    message: "Supervised student setup will be connected here later.",
  },
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

function ActionRow({ item, onClick, showDivider = false }) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      onClick={() => onClick(item)}
      className={[
        "flex w-full items-center gap-3 px-1 py-4 text-left transition",
        showDivider ? "border-t border-slate-200/80" : "",
      ].join(" ")}
    >
      <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-slate-700 ring-1 ring-slate-200/75">
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-medium tracking-[-0.01em] text-slate-950">{item.label}</div>
        <div className="mt-0.5 text-[13px] leading-5 text-slate-500">{item.subtitle}</div>
      </div>
      <ChevronRight size={18} className="shrink-0 text-slate-300" />
    </button>
  );
}

function ToggleRow({ label, subtitle, checked, onChange, showDivider = false }) {
  return (
    <div className={[showDivider ? "border-t border-slate-200/80" : "", "px-1 py-4"].join(" ")}>
      <div className="flex items-center gap-3">
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

export default function InstitutionMobileParentalControlsSettingsPage({ user, onBack }) {
  const uid = user?.uid || null;
  const [prefs, setPrefs] = useState(() =>
    getStoredPreferences(
      {
        parentalSupervisedAccessEnabled: true,
        parentalVisibilityControlsEnabled: true,
        parentalMonitoringEnabled: false,
        parentalSafeguardRulesEnabled: true,
      },
      uid,
    ),
  );
  const [actionMessage, setActionMessage] = useState("");

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
      <MobilePageBar title="Parental controls" onBack={onBack} />

      <div className="px-4 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <section className={surfaceClasses("px-4 py-3")}>
          <SectionHeading
            title="Relationships"
            description="Prepare family and institution relationships for supervised learning access."
          />
          {RELATIONSHIP_ROWS.map((item, index) => (
            <ActionRow
              key={item.id}
              item={item}
              onClick={(selected) => setActionMessage(selected.message)}
              showDivider={index > 0}
            />
          ))}
        </section>

        <section className={surfaceClasses("mt-4 px-4 py-3")}>
          <SectionHeading
            title="Supervision"
            description="These controls are kept as safe mobile preview preferences while the broader family linkage system is still being shaped."
          />
          <ToggleRow
            label="Supervised access"
            subtitle="Enable controlled access behavior for supervised accounts."
            checked={prefs.parentalSupervisedAccessEnabled !== false}
            onChange={(next) => updatePref("parentalSupervisedAccessEnabled", next)}
          />
          <ToggleRow
            label="Visibility controls"
            subtitle="Prepare visibility restrictions for linked family or institution relationships."
            checked={prefs.parentalVisibilityControlsEnabled !== false}
            onChange={(next) => updatePref("parentalVisibilityControlsEnabled", next)}
            showDivider
          />
          <ToggleRow
            label="Monitoring controls"
            subtitle="Frontend placeholder for future oversight and monitoring rules."
            checked={!!prefs.parentalMonitoringEnabled}
            onChange={(next) => updatePref("parentalMonitoringEnabled", next)}
            showDivider
          />
          <ToggleRow
            label="Safeguard rules"
            subtitle="Prepare structured safeguard behavior for future supervision policies."
            checked={prefs.parentalSafeguardRulesEnabled !== false}
            onChange={(next) => updatePref("parentalSafeguardRulesEnabled", next)}
            showDivider
          />
        </section>

        <div className="mt-4 rounded-[22px] bg-slate-50/90 px-4 py-4 text-[13px] leading-6 text-slate-500 ring-1 ring-slate-200/75">
          Parental controls are intentionally introduced here as a calm mobile-first placeholder. Relationship setup and institution linkage are not fully connected yet, so this page stays honest about what is still being shaped.
        </div>

        {actionMessage ? (
          <div className="mt-4 rounded-[22px] bg-slate-900 px-4 py-4 text-[13px] leading-6 text-white shadow-[0_16px_40px_rgba(15,23,42,0.16)]">
            {actionMessage}
          </div>
        ) : null}
      </div>
    </div>
  );
}
