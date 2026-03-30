import { useMemo, useState } from "react";
import {
  AppWindow,
  Bell,
  Building2,
  Bug,
  Camera,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CreditCard,
  FileText,
  Grid2x2,
  Info,
  Lock,
  LogOut,
  Palette,
  Plus,
  Route,
  Shield,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";
import { getStoredProfile } from "../lib/userSettings";
import InstitutionMobileAccountSettingsPage from "./InstitutionMobileAccountSettingsPage.jsx";
import InstitutionMobileAboutSettingsPage from "./InstitutionMobileAboutSettingsPage.jsx";
import InstitutionMobileAppsSettingsPage from "./InstitutionMobileAppsSettingsPage.jsx";
import InstitutionMobileDataControlsSettingsPage from "./InstitutionMobileDataControlsSettingsPage.jsx";
import InstitutionMobileGeneralSettingsPage from "./InstitutionMobileGeneralSettingsPage.jsx";
import InstitutionMobileNotificationsSettingsPage from "./InstitutionMobileNotificationsSettingsPage.jsx";
import InstitutionMobileParentalControlsSettingsPage from "./InstitutionMobileParentalControlsSettingsPage.jsx";
import InstitutionMobilePersonalizationSettingsPage from "./InstitutionMobilePersonalizationSettingsPage.jsx";
import InstitutionMobileSchedulesSettingsPage from "./InstitutionMobileSchedulesSettingsPage.jsx";
import InstitutionMobileSecuritySettingsPage from "./InstitutionMobileSecuritySettingsPage.jsx";
import InstitutionMobileWorkspaceSettingsPage from "./InstitutionMobileWorkspaceSettingsPage.jsx";
import { submitInstitutionBugReport } from "../lib/feedbackApi";
import { INSTITUTION_MOBILE_SETTINGS_LINKS, openInstitutionMobileSettingsLink } from "../lib/institutionMobileSettingsLinks";
import SettingsPage from "./SettingsPage";

const SECTION_CONFIG = {
  general: {
    label: "General",
    icon: Grid2x2,
    subtitle: "Theme, language, voice",
    type: "real",
    visibleSections: ["preferences", "voice-audio"],
    description: "Adjust daily experience settings, language, and voice controls for this device.",
  },
  notifications: {
    label: "Notifications",
    icon: Bell,
    subtitle: "Alerts and interruption controls",
    type: "real",
    visibleSections: ["preferences"],
    description:
      "Notification controls currently live inside the classic preferences layer while the dedicated mobile notifications surface is being refined.",
  },
  personalization: {
    label: "Personalization",
    icon: Sparkles,
    subtitle: "Memory and study style",
    type: "stub",
    description:
      "Personalization controls are being shaped into a calmer mobile surface for preferences, memory behavior, and AI study style.",
  },
  apps: {
    label: "Apps",
    icon: AppWindow,
    subtitle: "Connected tools and services",
    type: "stub",
    description:
      "App connections and mobile tool controls are still being organized for Institution settings. This section will become the dedicated home for them.",
  },
  schedules: {
    label: "Schedules",
    icon: Route,
    subtitle: "Timetable and reminders",
    type: "stub",
    description:
      "Schedule controls are coming next as a dedicated mobile section for timetable preferences, reminders, and academic timing.",
  },
  "data-controls": {
    label: "Data controls",
    icon: Shield,
    subtitle: "History and visibility",
    type: "stub",
    description:
      "Data controls will become the mobile entry point for history, exports, and visibility management. It is intentionally held for a later step.",
  },
  security: {
    label: "Security",
    icon: Lock,
    subtitle: "Passkeys and device protection",
    type: "real",
    visibleSections: ["security"],
    description: "Manage secure re-entry methods and device protection settings for this account.",
  },
  "parental-controls": {
    label: "Parental controls",
    icon: Shield,
    subtitle: "Guardianship and boundaries",
    type: "stub",
    description:
      "Parental controls are reserved for a later mobile step so they can be introduced with the right supervision and family structure.",
  },
  account: {
    label: "Account",
    icon: UserRound,
    subtitle: "Profile and identity",
    type: "real",
    visibleSections: ["profile-account"],
    description: "Review your profile, account identity, and saved personal details for Institution.",
  },
};

const MAIN_SETTINGS_ORDER = [
  "general",
  "notifications",
  "personalization",
  "apps",
  "schedules",
  "data-controls",
  "security",
  "parental-controls",
  "account",
];

const DIRECT_ACCESS_ROWS = [
  {
    id: "plan",
    label: "Upgrade / Plan",
    subtitle: "Education",
    icon: Sparkles,
  },
  {
    id: "subscription",
    label: "Subscription",
    subtitle: "Managed from account services",
    icon: CreditCard,
  },
  {
    id: "workspace",
    label: "Workspace",
    subtitle: "Institution account",
    icon: Building2,
  },
];

const QUICK_CONTROL_ROWS = [
  {
    id: "appearance",
    label: "Appearance",
    subtitle: "System default",
    icon: Palette,
  },
  {
    id: "accent",
    label: "Accent color",
    subtitle: "Default",
    icon: Sparkles,
  },
];

const SUPPORT_ROWS = [
  {
    id: "help",
    label: "Help",
    subtitle: "Support and guidance",
    icon: Users,
  },
  {
    id: "report-bug",
    label: "Report bug",
    subtitle: "Share a problem with the team",
    icon: Bug,
  },
  {
    id: "about",
    label: "About",
    subtitle: "Version and platform information",
    icon: Info,
  },
  {
    id: "terms",
    label: "Terms & Policies",
    subtitle: "Policies and platform terms",
    icon: FileText,
  },
];

function initialsOf(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (!parts.length) return "EL";
  return parts.map((part) => part[0]?.toUpperCase() || "").join("");
}

function surfaceClasses(extra = "") {
  return `rounded-[28px] bg-white/96 shadow-[0_16px_48px_rgba(15,23,42,0.05)] ring-1 ring-slate-200/75 ${extra}`.trim();
}

function MobileTopBar({ title, eyebrow = "Institution settings", onBack }) {
  return (
    <div className="sticky top-0 z-10 bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(248,250,252,0.92)_70%,rgba(248,250,252,0))] px-4 pt-3 pb-4 backdrop-blur-[2px]">
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/80"
          aria-label="Go back"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="min-w-0 flex-1 pt-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">{eyebrow}</div>
          <div className="mt-0.5 text-[1.35rem] font-semibold leading-none tracking-[-0.02em] text-slate-950">{title}</div>
        </div>
        <div className="h-11 w-11 shrink-0" aria-hidden="true" />
      </div>
    </div>
  );
}

function PlaceholderDetail({ section, onBack, onOpenClassic }) {
  const Icon = section.icon;
  return (
    <div className="min-h-[100dvh] bg-[linear-gradient(180deg,#fbfcfe_0%,#f6f8fb_100%)]">
      <MobileTopBar title={section.label} eyebrow="Institution settings" onBack={onBack} />
      <div className="px-4 pb-8">
        <div className={surfaceClasses("p-5")}>
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
            <Icon size={20} />
          </div>
          <h2 className="mt-4 text-[1.4rem] font-semibold tracking-[-0.02em] text-slate-950">{section.label}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{section.description}</p>
          <div className="mt-6 rounded-2xl bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600 ring-1 ring-slate-200/70">
            This section is intentionally being introduced in a later mobile step so it can be shaped with the right depth and clarity.
          </div>
          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white"
            >
              Return to settings home
            </button>
            <button
              type="button"
              onClick={onOpenClassic}
              className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200/80"
            >
              Open classic settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionRow({ section, onClick, showDivider = false }) {
  const Icon = section.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "group flex w-full items-center gap-3 px-1 py-4 text-left transition",
        showDivider ? "border-t border-slate-200/80" : "",
      ].join(" ")}
    >
      <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-slate-700 ring-1 ring-slate-200/75 transition group-hover:bg-white">
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-medium tracking-[-0.01em] text-slate-950">{section.label}</div>
        <div className="mt-0.5 text-[13px] leading-5 text-slate-500">{section.subtitle}</div>
      </div>
      <ChevronRight size={18} className="shrink-0 text-slate-300 transition group-hover:text-slate-500" />
    </button>
  );
}

function UtilityRow({ item, onClick, showDivider = false, danger = false }) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "group flex w-full items-center gap-3 px-1 py-4 text-left transition",
        showDivider ? "border-t border-slate-200/80" : "",
      ].join(" ")}
    >
      <div
        className={[
          "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 transition",
          danger
            ? "bg-red-50 text-red-600 ring-red-200/80"
            : "bg-slate-50 text-slate-700 ring-slate-200/75 group-hover:bg-white",
        ].join(" ")}
      >
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <div className={["text-[15px] font-medium tracking-[-0.01em]", danger ? "text-red-700" : "text-slate-950"].join(" ")}>
          {item.label}
        </div>
        {item.subtitle ? <div className="mt-0.5 text-[13px] leading-5 text-slate-500">{item.subtitle}</div> : null}
      </div>
      <ChevronRight size={18} className={danger ? "shrink-0 text-red-300" : "shrink-0 text-slate-300"} />
    </button>
  );
}

function ReportBugSheet({ open, draft, onChangeDraft, onClose, onSubmit, submitting = false }) {
  if (!open) return null;
  const trimmed = String(draft || "").trim();
  const canSubmit = trimmed.length >= 12 && !submitting;

  return (
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        aria-label="Close report bug sheet"
        className="absolute inset-0 bg-slate-950/35"
        onClick={onClose}
      />
      <div
        className="absolute inset-x-0 bottom-0 rounded-t-[30px] bg-white px-4 pt-3 shadow-[0_-22px_60px_rgba(15,23,42,0.22)] ring-1 ring-slate-200/80"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto h-1.5 w-12 rounded-full bg-slate-200" />
        <div className="px-1 pt-4 pb-2">
          <div className="text-[1.1rem] font-medium tracking-[-0.02em] text-slate-950">Report bug</div>
          <div className="mt-1 text-[13px] leading-5 text-slate-500">
            Describe what went wrong. This frontend flow is real, even though backend bug filing is not connected yet.
          </div>
        </div>

        <div className="mt-3 rounded-[24px] bg-slate-50/90 px-4 py-4 ring-1 ring-slate-200/80">
          <label className="block">
            <div className="text-[13px] font-medium text-slate-700">Issue details</div>
            <textarea
              value={draft}
              onChange={(event) => onChangeDraft(event.target.value)}
              placeholder="What happened, what you expected, and anything useful to reproduce the issue."
              rows={5}
              className="mt-2 w-full resize-none rounded-[20px] bg-white px-4 py-3 text-[15px] leading-6 text-slate-900 ring-1 ring-slate-200/80 outline-none placeholder:text-slate-400"
            />
          </label>
        </div>

        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="inline-flex flex-1 items-center justify-center rounded-[22px] bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200/80"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={onSubmit}
            className="inline-flex flex-1 items-center justify-center rounded-[22px] bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
          >
            {submitting ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function InstitutionMobileSettingsLanding({
  user,
  onBack,
  canShowAdmin = false,
  onOpenAdmin,
  onLogout,
  sharedLinksItems = [],
  onDeleteSharedLink,
  sharedLinksMode = "preview",
  archivedChatsItems = [],
  archivedChatsMode = "preview",
  onOpenArchivedChat,
  onRestoreArchivedChat,
  onDeleteArchivedChat,
  onExportData,
  onArchiveAllChats,
  onDeleteAllChats,
}) {
  const [activeSection, setActiveSection] = useState(null);
  const [activeUtilityPage, setActiveUtilityPage] = useState("");
  const [showClassicSettings, setShowClassicSettings] = useState(false);
  const [isAccountSwitchOpen, setIsAccountSwitchOpen] = useState(false);
  const [isAccountSheetOpen, setIsAccountSheetOpen] = useState(false);
  const [isReportBugOpen, setIsReportBugOpen] = useState(false);
  const [isSubmittingBugReport, setIsSubmittingBugReport] = useState(false);
  const [reportBugDraft, setReportBugDraft] = useState("");
  const [utilityStatus, setUtilityStatus] = useState("");
  const profile = useMemo(
    () =>
      getStoredProfile(
        {
          name: user?.name || user?.displayName || "Scholar",
          email: user?.email || "scholar@elimulink.demo",
          phone: user?.phone || "",
          avatarUrl: user?.avatarUrl || "",
        },
        user?.uid || null
      ),
    [user]
  );

  if (showClassicSettings) {
    return (
      <SettingsPage
        user={user}
        onBack={() => setShowClassicSettings(false)}
        canShowAdmin={canShowAdmin}
        onOpenAdmin={onOpenAdmin}
        backLabel="Back to settings home"
      />
    );
  }

  if (activeUtilityPage === "about") {
    return <InstitutionMobileAboutSettingsPage onBack={() => setActiveUtilityPage("")} />;
  }

  if (activeUtilityPage === "workspace") {
    return <InstitutionMobileWorkspaceSettingsPage user={user} onBack={() => setActiveUtilityPage("")} />;
  }

  if (activeSection) {
    const section = SECTION_CONFIG[activeSection];
    if (activeSection === "general") {
      return <InstitutionMobileGeneralSettingsPage user={user} onBack={() => setActiveSection(null)} />;
    }
    if (activeSection === "security") {
      return (
        <InstitutionMobileSecuritySettingsPage
          user={user}
          onBack={() => setActiveSection(null)}
          onLogout={onLogout}
        />
      );
    }
    if (activeSection === "account") {
      return <InstitutionMobileAccountSettingsPage user={user} onBack={() => setActiveSection(null)} />;
    }
    if (activeSection === "notifications") {
      return <InstitutionMobileNotificationsSettingsPage user={user} onBack={() => setActiveSection(null)} />;
    }
    if (activeSection === "personalization") {
      return (
        <InstitutionMobilePersonalizationSettingsPage
          user={user}
          onBack={() => setActiveSection(null)}
        />
      );
    }
    if (activeSection === "apps") {
      return <InstitutionMobileAppsSettingsPage onBack={() => setActiveSection(null)} />;
    }
    if (activeSection === "data-controls") {
      return (
        <InstitutionMobileDataControlsSettingsPage
          user={user}
          onBack={() => setActiveSection(null)}
          sharedLinksItems={sharedLinksItems}
          onDeleteSharedLink={onDeleteSharedLink}
          sharedLinksMode={sharedLinksMode}
          archivedChatsItems={archivedChatsItems}
          archivedChatsMode={archivedChatsMode}
          onOpenArchivedChat={onOpenArchivedChat}
          onRestoreArchivedChat={onRestoreArchivedChat}
          onDeleteArchivedChat={onDeleteArchivedChat}
          onExportData={onExportData}
          onArchiveAllChats={onArchiveAllChats}
          onDeleteAllChats={onDeleteAllChats}
        />
      );
    }
    if (activeSection === "schedules") {
      return <InstitutionMobileSchedulesSettingsPage user={user} onBack={() => setActiveSection(null)} />;
    }
    if (activeSection === "parental-controls") {
      return (
        <InstitutionMobileParentalControlsSettingsPage
          user={user}
          onBack={() => setActiveSection(null)}
        />
      );
    }
    if (section?.type === "real") {
      return (
        <SettingsPage
          user={user}
          onBack={() => setActiveSection(null)}
          canShowAdmin={canShowAdmin}
          onOpenAdmin={onOpenAdmin}
          visibleSections={section.visibleSections}
          pageTitle={section.label}
          pageDescription={section.description}
          showStatusBadges={false}
          backLabel="Back to settings"
        />
      );
    }

    return (
      <PlaceholderDetail
        section={section}
        onBack={() => setActiveSection(null)}
        onOpenClassic={() => setShowClassicSettings(true)}
      />
    );
  }

  function handleDirectAccessRow(itemId) {
    if (itemId === "plan" || itemId === "subscription") {
      openInstitutionMobileSettingsLink(INSTITUTION_MOBILE_SETTINGS_LINKS.billingPortal);
      return;
    }
    if (itemId === "workspace") {
      setActiveUtilityPage("workspace");
    }
  }

  function handleQuickControlRow(itemId) {
    if (itemId === "appearance" || itemId === "accent") {
      setActiveSection("general");
    }
  }

  function handleSupportRow(itemId) {
    if (itemId === "help") {
      openInstitutionMobileSettingsLink(INSTITUTION_MOBILE_SETTINGS_LINKS.helpCenter);
      return;
    }
    if (itemId === "report-bug") {
      setIsReportBugOpen(true);
      return;
    }
    if (itemId === "about") {
      setActiveUtilityPage("about");
      return;
    }
    if (itemId === "terms") {
      openInstitutionMobileSettingsLink(INSTITUTION_MOBILE_SETTINGS_LINKS.termsOfUse);
    }
  }

  async function handleReportBugSubmit() {
    const message = String(reportBugDraft || "").trim();
    if (message.length < 12 || isSubmittingBugReport) return;
    setIsSubmittingBugReport(true);
    setUtilityStatus("");
    try {
      const result = await submitInstitutionBugReport({
        message,
        sourceSurface: "settings/report-bug",
        metadata: {
          page: typeof window !== "undefined" ? window.location.pathname : "/institution/settings",
          platform:
            (typeof navigator !== "undefined" && (navigator.userAgentData?.platform || navigator.platform)) || "unknown",
        },
      });
      setIsReportBugOpen(false);
      setReportBugDraft("");
      setUtilityStatus(String(result?.message || "Bug report submitted."));
    } catch (error) {
      setUtilityStatus(String(error?.message || "Could not submit the bug report right now."));
    } finally {
      setIsSubmittingBugReport(false);
    }
  }

  return (
    <div className="min-h-[100dvh] bg-[linear-gradient(180deg,#fbfcfe_0%,#f6f8fb_100%)]">
      <MobileTopBar title="Settings" onBack={onBack} />

      <div className="px-4 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
        <section className="mb-5 px-1">
          <div className="text-center">
            <div className="truncate text-[1.05rem] font-medium tracking-[-0.02em] text-slate-800">
              {profile.email || "Institution account"}
            </div>

            <div className="relative mx-auto mt-6 flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-[linear-gradient(180deg,#7e8af1_0%,#6774d8_100%)] text-[2.5rem] font-medium text-white shadow-[0_18px_38px_rgba(99,102,241,0.22)]">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="Profile avatar" className="h-full w-full object-cover" />
              ) : (
                initialsOf(profile.name).slice(0, 1)
              )}
              <button
                type="button"
                onClick={() => window.alert("Profile photo editing is currently handled inside Account settings.")}
                className="absolute bottom-1 right-1 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-[0_10px_22px_rgba(15,23,42,0.12)] ring-1 ring-slate-200/90"
                aria-label="Edit profile photo"
              >
                <Camera size={18} />
              </button>
            </div>

            <div className="mt-5 text-[2.1rem] font-semibold leading-none tracking-[-0.04em] text-slate-950">
              {`Hi, ${String(profile.name || "Scholar").trim().split(/\s+/)[0]}!`}
            </div>

            <div className="mt-4 inline-flex items-center rounded-full bg-slate-100 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              Institution workspace
            </div>
          </div>
        </section>

        <section className={["mb-5", surfaceClasses("px-4 py-3")].join(" ")}>
          <button
            type="button"
            onClick={() => setIsAccountSwitchOpen((value) => !value)}
            className="flex w-full items-center justify-between gap-3 px-1 py-2 text-left"
          >
            <div>
              <div className="text-[1.05rem] font-medium tracking-[-0.02em] text-slate-950">Switch account</div>
              <div className="mt-1 text-[13px] leading-5 text-slate-500">Quick access for this device</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center -space-x-2">
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#b68d79] text-sm font-medium text-white ring-2 ring-white">
                  {initialsOf(profile.name).slice(0, 1) || "S"}
                </div>
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#5d7384] text-sm font-medium text-white ring-2 ring-white">
                  G
                </div>
              </div>
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-50 text-slate-600 ring-1 ring-slate-200/80">
                {isAccountSwitchOpen ? <ChevronUp size={18} /> : <ChevronRight size={18} />}
              </div>
            </div>
          </button>

          {isAccountSwitchOpen ? (
            <div className="mt-2 overflow-hidden rounded-[24px] bg-slate-50/85 ring-1 ring-slate-200/75">
              <div className="flex items-center gap-3 px-4 py-4">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#b68d79] text-base font-medium text-white">
                  {initialsOf(profile.name).slice(0, 1) || "S"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-medium text-slate-950">{profile.name || "Scholar"}</div>
                  <div className="truncate text-sm text-slate-500">{profile.email || "Institution account"}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => window.alert("Multiple-account linking is being shaped for a later mobile step.")}
                className="flex w-full items-center gap-3 border-t border-slate-200/80 px-4 py-4 text-left"
              >
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-700 ring-1 ring-slate-200/80">
                  <Plus size={20} />
                </div>
                <div className="text-[15px] font-medium text-slate-900">Add another account</div>
              </button>

              <button
                type="button"
                onClick={() => setShowClassicSettings(true)}
                className="flex w-full items-center gap-3 border-t border-slate-200/80 px-4 py-4 text-left"
              >
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-700 ring-1 ring-slate-200/80">
                  <Users size={18} />
                </div>
                <div className="text-[15px] font-medium text-slate-900">Manage accounts on this device</div>
              </button>
            </div>
          ) : null}
        </section>

        <div className="space-y-4">
          <section className={surfaceClasses("px-4 py-3")}>
            {DIRECT_ACCESS_ROWS.map((item, index) => (
              <UtilityRow key={item.id} item={item} onClick={() => handleDirectAccessRow(item.id)} showDivider={index > 0} />
            ))}
          </section>

          <section className={surfaceClasses("px-4 py-3")}>
            {QUICK_CONTROL_ROWS.map((item, index) => (
              <UtilityRow key={item.id} item={item} onClick={() => handleQuickControlRow(item.id)} showDivider={index > 0} />
            ))}
          </section>

          <section className={surfaceClasses("px-4 py-3")}>
            <div className="px-1 pb-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Main settings</div>
              <div className="mt-1 text-[13px] leading-5 text-slate-500">Core mobile settings and account controls</div>
            </div>

            <div className="mt-1">
              {MAIN_SETTINGS_ORDER.map((sectionId, index) => (
                <SectionRow
                  key={sectionId}
                  section={SECTION_CONFIG[sectionId]}
                  onClick={() => setActiveSection(sectionId)}
                  showDivider={index > 0}
                />
              ))}
            </div>
          </section>

          <section className={surfaceClasses("px-4 py-3")}>
            <div className="px-1 pb-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Support & about</div>
              <div className="mt-1 text-[13px] leading-5 text-slate-500">Help, reporting, and platform information</div>
            </div>
            {SUPPORT_ROWS.map((item, index) => (
              <UtilityRow key={item.id} item={item} onClick={() => handleSupportRow(item.id)} showDivider={index > 0} />
            ))}
          </section>

          {utilityStatus ? (
            <div className="rounded-[22px] bg-slate-50/90 px-4 py-4 text-[13px] leading-6 text-slate-500 ring-1 ring-slate-200/75">
              {utilityStatus}
            </div>
          ) : null}

          <section className={surfaceClasses("px-4 py-3")}>
            <UtilityRow
              item={{
                label: "Switch account",
                subtitle: "Open the device account sheet",
                icon: Users,
              }}
              onClick={() => setIsAccountSheetOpen(true)}
            />
            <UtilityRow
              item={{
                label: "Log out",
                subtitle: "Sign out of this Institution session",
                icon: LogOut,
              }}
              onClick={() => onLogout?.()}
              showDivider
              danger
            />
          </section>

          <section className={surfaceClasses("px-4 py-4")}>
            <div className="px-1">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Fallback</div>
              <div className="mt-1 text-[13px] leading-5 text-slate-500">
                The previous full settings page remains available during this rollout for controls that have not been reshaped yet.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowClassicSettings(true)}
              className="mt-4 inline-flex w-full items-center justify-between rounded-[22px] bg-slate-50 px-4 py-3 text-left text-sm font-medium text-slate-800 ring-1 ring-slate-200/75"
            >
              <span>Open classic settings</span>
              <ChevronRight size={18} className="text-slate-300" />
            </button>
          </section>
        </div>

        {isAccountSheetOpen ? (
          <div className="fixed inset-0 z-40">
            <button
              type="button"
              aria-label="Close switch account sheet"
              className="absolute inset-0 bg-slate-950/35"
              onClick={() => setIsAccountSheetOpen(false)}
            />
            <div
              className="absolute inset-x-0 bottom-0 rounded-t-[30px] bg-white px-4 pt-3 shadow-[0_-22px_60px_rgba(15,23,42,0.22)] ring-1 ring-slate-200/80"
              style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
            >
              <div className="mx-auto h-1.5 w-12 rounded-full bg-slate-200" />
              <div className="px-1 pt-4 pb-2">
                <div className="text-[1.1rem] font-medium tracking-[-0.02em] text-slate-950">Switch account</div>
                <div className="mt-1 text-[13px] leading-5 text-slate-500">Account switching is still frontend-first on mobile.</div>
              </div>

              <div className="mt-2 overflow-hidden rounded-[24px] bg-slate-50/90 ring-1 ring-slate-200/80">
                <div className="flex items-center gap-3 px-4 py-4">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#b68d79] text-base font-medium text-white">
                    {initialsOf(profile.name).slice(0, 1) || "S"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-medium text-slate-950">{profile.name || "Scholar"}</div>
                    <div className="truncate text-sm text-slate-500">{profile.email || "Institution account"}</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => window.alert("Multiple-account linking is being shaped for a later mobile step.")}
                  className="flex w-full items-center gap-3 border-t border-slate-200/80 px-4 py-4 text-left"
                >
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-700 ring-1 ring-slate-200/80">
                    <Plus size={20} />
                  </div>
                  <div className="text-[15px] font-medium text-slate-900">Add another account</div>
                </button>

                <button
                  type="button"
                  onClick={() => setShowClassicSettings(true)}
                  className="flex w-full items-center gap-3 border-t border-slate-200/80 px-4 py-4 text-left"
                >
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-700 ring-1 ring-slate-200/80">
                    <Users size={18} />
                  </div>
                  <div className="text-[15px] font-medium text-slate-900">Manage accounts on this device</div>
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <ReportBugSheet
          open={isReportBugOpen}
          draft={reportBugDraft}
          onChangeDraft={setReportBugDraft}
          onClose={() => setIsReportBugOpen(false)}
          onSubmit={handleReportBugSubmit}
          submitting={isSubmittingBugReport}
        />
      </div>
    </div>
  );
}
