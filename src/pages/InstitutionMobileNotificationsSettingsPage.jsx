import { useEffect, useMemo, useState } from "react";
import { Bell, ChevronLeft, ChevronRight, Mail, MessageSquare } from "lucide-react";
import { getStoredPreferences, saveStoredPreferences } from "../lib/userSettings";
import {
  fetchInstitutionNotificationPreferences,
  saveInstitutionNotificationPreferences,
} from "../lib/notificationPreferencesApi";

const NOTIFICATION_ROWS = [
  { id: "responses", label: "Responses", channels: ["push"] },
  { id: "groupChats", label: "Group chats", channels: ["push"] },
  { id: "tasks", label: "Tasks", channels: ["push", "email"] },
  { id: "projects", label: "Projects", channels: ["email"] },
  { id: "recommendations", label: "Recommendations", channels: ["push", "email"] },
  { id: "usage", label: "Usage", channels: ["push", "email"] },
  { id: "announcements", label: "Announcements", channels: ["push", "email"] },
  { id: "results", label: "Results", channels: ["push", "email"] },
  { id: "feesPayments", label: "Fees & payments", channels: ["push", "email"] },
  { id: "assignments", label: "Assignments", channels: ["push", "email"] },
  { id: "attendance", label: "Attendance", channels: ["push", "email"] },
  { id: "subgroups", label: "Subgroups", channels: ["push", "email"] },
  { id: "meet", label: "Meet", channels: ["push", "email"] },
  { id: "calendarReminders", label: "Calendar reminders", channels: ["push", "email"] },
  { id: "institutionMessages", label: "Institution messages", channels: ["push", "email"] },
  { id: "securityAlerts", label: "Security alerts", channels: ["push", "email"] },
  { id: "systemUpdates", label: "System updates", channels: ["push", "email"] },
];

function buildDefaultDeliveryMap() {
  return NOTIFICATION_ROWS.reduce((accumulator, row) => {
    accumulator[row.id] = {
      push: row.channels.includes("push"),
      email: false,
    };
    return accumulator;
  }, {});
}

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

function ToggleRow({ label, subtitle, checked, onChange, icon = null, showDivider = false, disabled = false }) {
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
          onClick={() => !disabled && onChange(!checked)}
          disabled={disabled}
          className={[
            "relative h-6 w-11 shrink-0 rounded-full transition disabled:cursor-not-allowed",
            checked ? "bg-slate-900" : "bg-slate-300",
            disabled ? "opacity-50" : "",
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

function summaryLabel(row, delivery, muted) {
  if (muted) return "Muted";
  const current = delivery?.[row.id] || {};
  const enabled = [];
  if (row.channels.includes("push") && current.push) enabled.push("Push");
  if (row.channels.includes("email") && current.email) enabled.push("Email");
  if (!enabled.length) return "Off";
  return enabled.join(", ");
}

function CategoryDetailPage({ row, value, muted, onBack, onChangeDelivery }) {
  return (
    <div className="min-h-[100dvh] bg-[linear-gradient(180deg,#fbfcfe_0%,#f6f8fb_100%)]">
      <MobilePageBar title={row.label} onBack={onBack} />
      <div className="px-4 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <section className={surfaceClasses("px-4 py-4")}>
          <SectionHeading
            title="Delivery options"
            description={
              muted
                ? "Notifications are currently muted at the account level. You can still review your saved delivery choices here."
                : "Choose how updates in this category should reach you on mobile."
            }
          />
          {row.channels.includes("push") ? (
            <ToggleRow
              label="Push"
              subtitle="App and device notifications for this category."
              checked={!!value.push}
              onChange={(next) => onChangeDelivery("push", next)}
              icon={Bell}
              disabled={muted}
            />
          ) : null}
          {row.channels.includes("email") ? (
            <ToggleRow
              label="Email"
              subtitle="Email delivery for this category."
              checked={!!value.email}
              onChange={(next) => onChangeDelivery("email", next)}
              icon={Mail}
              showDivider={row.channels.includes("push")}
              disabled={muted}
            />
          ) : null}
        </section>

        <div className="mt-4 rounded-[22px] bg-slate-50/90 px-4 py-4 text-[13px] leading-6 text-slate-500 ring-1 ring-slate-200/75">
          Delivery choices in these category pages are still frontend-first. The mute setting above remains the real shared notification preference already used in the app.
        </div>
      </div>
    </div>
  );
}

export default function InstitutionMobileNotificationsSettingsPage({ user, onBack }) {
  const uid = user?.uid || null;
  const [activeCategoryId, setActiveCategoryId] = useState("");
  const [prefs, setPrefs] = useState(() =>
    getStoredPreferences(
      {
        muteNotifications: false,
        notificationDelivery: buildDefaultDeliveryMap(),
      },
      uid,
    ),
  );
  const [syncMessage, setSyncMessage] = useState("");

  const notificationDelivery = useMemo(
    () => ({
      ...buildDefaultDeliveryMap(),
      ...(prefs.notificationDelivery || {}),
    }),
    [prefs.notificationDelivery],
  );

  useEffect(() => {
    let cancelled = false;
    if (!uid) return () => {};

    async function loadPreferences() {
      try {
        const response = await fetchInstitutionNotificationPreferences();
        if (cancelled || !response?.preferences) return;
        const nextPrefs = {
          ...getStoredPreferences({}, uid),
          muteNotifications: !!response.preferences.mute_notifications,
          notificationDelivery: {
            ...buildDefaultDeliveryMap(),
            ...(response.preferences.delivery || {}),
          },
        };
        setPrefs(nextPrefs);
        saveStoredPreferences(nextPrefs, uid);
        setSyncMessage("");
      } catch {
        if (!cancelled) {
          setSyncMessage("Using saved device preferences right now.");
        }
      }
    }

    loadPreferences();
    return () => {
      cancelled = true;
    };
  }, [uid]);

  function savePrefs(nextPrefs) {
    setPrefs(nextPrefs);
    saveStoredPreferences(nextPrefs, uid);
    setSyncMessage("");
    if (uid) {
      saveInstitutionNotificationPreferences({
        muteNotifications: !!nextPrefs.muteNotifications,
        notificationDelivery: nextPrefs.notificationDelivery || {},
      }).catch(() => {
        setSyncMessage("Saved on this device. Account sync will retry when you're online.");
      });
    }
  }

  function updateMute(next) {
    savePrefs({
      ...prefs,
      muteNotifications: next,
      notificationDelivery,
    });
  }

  function updateCategoryDelivery(categoryId, channel, nextValue) {
    const nextDelivery = {
      ...notificationDelivery,
      [categoryId]: {
        ...(notificationDelivery[categoryId] || {}),
        [channel]: nextValue,
      },
    };
    savePrefs({
      ...prefs,
      notificationDelivery: nextDelivery,
    });
  }

  const activeCategory = NOTIFICATION_ROWS.find((row) => row.id === activeCategoryId);
  if (activeCategory) {
    return (
      <CategoryDetailPage
        row={activeCategory}
        value={notificationDelivery[activeCategory.id] || {}}
        muted={!!prefs.muteNotifications}
        onBack={() => setActiveCategoryId("")}
        onChangeDelivery={(channel, next) => updateCategoryDelivery(activeCategory.id, channel, next)}
      />
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[linear-gradient(180deg,#fbfcfe_0%,#f6f8fb_100%)]">
      <MobilePageBar title="Notifications" onBack={onBack} />

      <div className="px-4 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <section className={surfaceClasses("px-4 py-4")}>
          <SectionHeading title="Notifications" description="Start with the global mute control, then adjust delivery category by category." />
          <ToggleRow
            label="Mute notifications"
            subtitle={
              prefs.muteNotifications
                ? "Notifications are currently muted from the shared stored preference."
                : "This uses the real notification mute preference already present in the app."
            }
            checked={!!prefs.muteNotifications}
            onChange={updateMute}
            icon={Bell}
          />
        </section>

        <section className={surfaceClasses("mt-4 px-4 py-3")}>
          <SectionHeading title="Categories" description="Choose Push and Email delivery for each notification category in a cleaner mobile flow." />
          {NOTIFICATION_ROWS.map((row, index) => (
            <button
              key={row.id}
              type="button"
              onClick={() => setActiveCategoryId(row.id)}
              className={[
                "flex w-full items-center gap-3 px-1 py-4 text-left transition",
                index > 0 ? "border-t border-slate-200/80" : "",
              ].join(" ")}
            >
              <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-slate-700 ring-1 ring-slate-200/75">
                <MessageSquare size={17} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-medium tracking-[-0.01em] text-slate-950">{row.label}</div>
                <div className="mt-0.5 text-[13px] leading-5 text-slate-500">{summaryLabel(row, notificationDelivery, !!prefs.muteNotifications)}</div>
              </div>
              <ChevronRight size={18} className="shrink-0 text-slate-300" />
            </button>
          ))}
        </section>

        <div className="mt-4 rounded-[22px] bg-slate-50/90 px-4 py-4 text-[13px] leading-6 text-slate-500 ring-1 ring-slate-200/75">
          Category delivery choices are now stored in your shared notification preferences for Institution settings. {syncMessage || "If the network is unavailable, the page falls back to your saved device preferences."}
        </div>
      </div>
    </div>
  );
}
