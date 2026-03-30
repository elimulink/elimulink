import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, ChevronLeft, ChevronRight, CreditCard, Mail, ShieldCheck, Sparkles, UserRound, X } from "lucide-react";
import { getStoredPreferences, getStoredProfile, saveStoredPreferences, saveStoredProfile } from "../lib/userSettings";
import { INSTITUTION_MOBILE_SETTINGS_LINKS, openInstitutionMobileSettingsLink } from "../lib/institutionMobileSettingsLinks";
import InstitutionMobileWorkspaceSettingsPage from "./InstitutionMobileWorkspaceSettingsPage.jsx";

function surfaceClasses(extra = "") {
  return `rounded-[28px] bg-white/96 shadow-[0_16px_48px_rgba(15,23,42,0.05)] ring-1 ring-slate-200/75 dark:bg-slate-900/96 dark:ring-white/10 dark:shadow-[0_20px_60px_rgba(2,8,23,0.34)] ${extra}`.trim();
}

function initialsOf(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (!parts.length) return "S";
  return parts.map((part) => part[0]?.toUpperCase() || "").join("").slice(0, 2);
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load image"));
    image.src = source;
  });
}

async function normalizeAvatarImage(file) {
  const rawDataUrl = await readFileAsDataUrl(file);
  if (!String(file?.type || "").startsWith("image/")) return rawDataUrl;

  try {
    const image = await loadImage(rawDataUrl);
    const maxSize = 512;
    const sourceWidth = Math.max(1, Number(image.width) || 1);
    const sourceHeight = Math.max(1, Number(image.height) || 1);
    const scale = Math.min(1, maxSize / Math.max(sourceWidth, sourceHeight));
    const targetWidth = Math.max(1, Math.round(sourceWidth * scale));
    const targetHeight = Math.max(1, Math.round(sourceHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return rawDataUrl;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    ctx.drawImage(image, 0, 0, targetWidth, targetHeight);
    return canvas.toDataURL("image/jpeg", 0.86);
  } catch {
    return rawDataUrl;
  }
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

function RowButton({ label, subtitle, onClick, showDivider = false, danger = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex w-full items-center gap-3 px-1 py-4 text-left transition",
        showDivider ? "border-t border-slate-200/80 dark:border-white/10" : "",
      ].join(" ")}
    >
      <div className="min-w-0 flex-1">
        <div className={["text-[15px] font-medium tracking-[-0.01em]", danger ? "text-red-700 dark:text-red-300" : "text-slate-950 dark:text-slate-50"].join(" ")}>
          {label}
        </div>
        <div className="mt-0.5 text-[13px] leading-5 text-slate-500 dark:text-slate-300">{subtitle}</div>
      </div>
      <ChevronRight size={18} className={danger ? "text-red-300" : "text-slate-300 dark:text-slate-500"} />
    </button>
  );
}

function ToggleRow({ label, subtitle, checked, onChange }) {
  return (
    <div className="flex items-center gap-3 px-1 py-4">
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-medium tracking-[-0.01em] text-slate-950 dark:text-slate-50">{label}</div>
        <div className="mt-0.5 text-[13px] leading-5 text-slate-500 dark:text-slate-300">{subtitle}</div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={[
          "relative h-6 w-11 shrink-0 rounded-full transition",
          checked ? "bg-slate-900 dark:bg-slate-100" : "bg-slate-300 dark:bg-slate-700",
        ].join(" ")}
        aria-pressed={checked}
      >
        <span
          className={[
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition",
            checked ? "left-5 dark:bg-slate-900" : "left-0.5",
          ].join(" ")}
        />
      </button>
    </div>
  );
}

function ConfirmationSheet({ open, title, description, confirmLabel, danger = false, onCancel, onConfirm }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40">
      <button type="button" className="absolute inset-0 bg-slate-950/35" aria-label="Close" onClick={onCancel} />
      <div
        className="absolute inset-x-0 bottom-0 rounded-t-[30px] bg-white px-4 pt-3 shadow-[0_-22px_60px_rgba(15,23,42,0.22)] ring-1 ring-slate-200/80 dark:bg-slate-950 dark:ring-white/10"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto h-1.5 w-12 rounded-full bg-slate-200" />
        <div className="px-1 pt-4 pb-2">
          <div className="text-[1.1rem] font-medium tracking-[-0.02em] text-slate-950 dark:text-slate-50">{title}</div>
          <div className="mt-1 text-[13px] leading-5 text-slate-500 dark:text-slate-300">{description}</div>
        </div>
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex flex-1 items-center justify-center rounded-[22px] bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200/80 dark:bg-slate-900 dark:text-slate-100 dark:ring-white/10"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={[
              "inline-flex flex-1 items-center justify-center rounded-[22px] px-4 py-3 text-sm font-semibold",
              danger ? "bg-red-600 text-white" : "bg-slate-950 text-white",
            ].join(" ")}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function EmailChangeSheet({ open, onClose, currentEmail, onContinue }) {
  const [nextEmail, setNextEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setNextEmail("");
      setMessage("");
      setSubmitting(false);
    }
  }, [open]);

  if (!open) return null;

  const normalizedCurrentEmail = String(currentEmail || "").trim();
  const normalizedNextEmail = String(nextEmail || "").trim();
  const canContinue =
    isValidEmail(normalizedNextEmail) &&
    normalizedNextEmail.toLowerCase() !== normalizedCurrentEmail.toLowerCase();

  const helperText = !normalizedNextEmail
    ? "Enter the new email address you want to verify."
    : !isValidEmail(normalizedNextEmail)
      ? "Enter a valid email address."
      : normalizedNextEmail.toLowerCase() === normalizedCurrentEmail.toLowerCase()
        ? "The new email must be different from the current one."
        : "A verification step is required before this email can replace the current account email.";

  async function handleContinue() {
    if (!canContinue || submitting) return;
    setSubmitting(true);
    setMessage("");
    try {
      const result = await onContinue?.({
        currentEmail: normalizedCurrentEmail,
        newEmail: normalizedNextEmail,
      });
      setMessage(
        String(
          result?.message ||
            "Verification-ready flow prepared. Connect the real verification send step here when backend wiring is available.",
        ),
      );
    } catch (error) {
      setMessage(String(error?.message || "Unable to prepare the email verification flow right now."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40">
      <button type="button" className="absolute inset-0 bg-slate-950/35" aria-label="Close" onClick={onClose} />
      <div
        className="absolute inset-x-0 bottom-0 rounded-t-[30px] bg-white px-4 pt-3 shadow-[0_-22px_60px_rgba(15,23,42,0.22)] ring-1 ring-slate-200/80 dark:bg-slate-950 dark:ring-white/10"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto h-1.5 w-12 rounded-full bg-slate-200" />
        <div className="flex items-start justify-between gap-3 px-1 pt-4 pb-2">
          <div>
            <div className="text-[1.1rem] font-medium tracking-[-0.02em] text-slate-950 dark:text-slate-50">Change email</div>
            <div className="mt-1 text-[13px] leading-5 text-slate-500 dark:text-slate-300">
              Email changes stay behind a verification step and do not directly mutate your account here.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-50 text-slate-600 ring-1 ring-slate-200/80 dark:bg-slate-900 dark:text-slate-200 dark:ring-white/10"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-2 rounded-[24px] bg-slate-50/90 px-4 py-4 ring-1 ring-slate-200/80 dark:bg-slate-900/80 dark:ring-white/10">
          <div className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 ring-1 ring-slate-200/80 dark:bg-slate-950 dark:text-slate-300 dark:ring-white/10">
            {normalizedCurrentEmail || "No email available"}
          </div>

          <label className="mt-4 block">
            <div className="text-[13px] font-medium text-slate-700">New email</div>
            <div className="mt-2 flex items-center gap-3 rounded-[20px] bg-white px-4 py-3 ring-1 ring-slate-200/80 dark:bg-slate-950 dark:ring-white/10">
              <Mail size={16} className="text-slate-400" />
              <input
                type="email"
                value={nextEmail}
                onChange={(event) => setNextEmail(event.target.value)}
                placeholder="name@example.com"
                autoComplete="email"
                className="w-full bg-transparent text-[15px] text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>
          </label>

          <div className="mt-4 rounded-[18px] bg-white px-4 py-3 text-[13px] leading-5 text-slate-600 ring-1 ring-slate-200/80 dark:bg-slate-950 dark:text-slate-300 dark:ring-white/10">
            {helperText}
          </div>

          {message ? (
            <div className="mt-3 rounded-[18px] bg-slate-950 px-4 py-3 text-[13px] leading-5 text-white">
              {message}
            </div>
          ) : null}

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex flex-1 items-center justify-center rounded-[22px] bg-white px-4 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200/80 dark:bg-slate-950 dark:text-slate-100 dark:ring-white/10"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!canContinue || submitting}
              onClick={handleContinue}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-[22px] bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
            >
              <ShieldCheck size={14} />
              {submitting ? "Preparing..." : "Send verification"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InstitutionMobileAccountSettingsPage({ user, onBack }) {
  const uid = user?.uid || null;
  const uploadInputRef = useRef(null);
  const [profile, setProfile] = useState(() =>
    getStoredProfile(
      {
        name: user?.name || user?.displayName || "Scholar",
        email: user?.email || "scholar@elimulink.demo",
        phone: user?.phone || "",
        avatarUrl: user?.avatarUrl || "",
      },
      uid,
    ),
  );
  const [feedbackEmailsEnabled, setFeedbackEmailsEnabled] = useState(() => {
    const prefs = getStoredPreferences({ feedbackEmailsEnabled: true }, uid);
    return prefs.feedbackEmailsEnabled !== false;
  });
  const [avatarError, setAvatarError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [isEmailSheetOpen, setIsEmailSheetOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState("");
  const [activeUtilityPage, setActiveUtilityPage] = useState("");

  useEffect(() => {
    setProfile((current) =>
      getStoredProfile(
        {
          ...current,
          name: user?.name || user?.displayName || current.name || "Scholar",
          email: user?.email || current.email || "scholar@elimulink.demo",
          phone: user?.phone || current.phone || "",
          avatarUrl: current.avatarUrl || user?.avatarUrl || "",
        },
        uid,
      ),
    );
  }, [uid, user?.avatarUrl, user?.displayName, user?.email, user?.name, user?.phone]);

  useEffect(() => {
    saveStoredProfile(profile, uid);
  }, [profile, uid]);

  useEffect(() => {
    const nextPrefs = {
      ...getStoredPreferences({}, uid),
      feedbackEmailsEnabled,
    };
    saveStoredPreferences(nextPrefs, uid);
  }, [feedbackEmailsEnabled, uid]);

  const profileName = useMemo(
    () => String(profile.name || user?.name || user?.displayName || "Scholar").trim() || "Scholar",
    [profile.name, user?.displayName, user?.name],
  );
  const profileEmail = String(profile.email || user?.email || "scholar@elimulink.demo").trim();

  if (activeUtilityPage === "workspace") {
    return <InstitutionMobileWorkspaceSettingsPage user={user} onBack={() => setActiveUtilityPage("")} />;
  }

  async function handleAvatarSelect(event) {
    const input = event?.target;
    const file = input?.files?.[0];
    if (input) input.value = "";
    if (!file) return;

    setAvatarError("");
    try {
      const avatarUrl = await normalizeAvatarImage(file);
      setProfile((current) => ({ ...current, avatarUrl }));
      setSaveMessage("Profile photo updated for this account.");
    } catch {
      setAvatarError("Could not process this image. Try another photo.");
    }
  }

  function updateProfileField(key, value, message) {
    setProfile((current) => ({ ...current, [key]: value }));
    setSaveMessage(message);
  }

  return (
    <div className="min-h-[100dvh] bg-[linear-gradient(180deg,#fbfcfe_0%,#f6f8fb_100%)] dark:bg-[linear-gradient(180deg,#06111f_0%,#0a1527_100%)]">
      <MobilePageBar title="Account" onBack={onBack} />

      <div className="px-4 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <section className={surfaceClasses("px-4 py-4")}>
          <SectionHeading title="Profile details" description="Your saved identity details for this Institution account." />
          <div className="mt-1 flex items-center gap-4 px-1 pb-4">
            <div className="relative inline-flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[linear-gradient(180deg,#7e8af1_0%,#6774d8_100%)] text-2xl font-medium text-white shadow-[0_14px_30px_rgba(99,102,241,0.18)]">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="Profile avatar" className="h-full w-full object-cover" />
              ) : (
                initialsOf(profileName).slice(0, 1)
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-medium text-slate-950 dark:text-slate-50">{profileName}</div>
              <div className="mt-1 text-[13px] leading-5 text-slate-500 dark:text-slate-300">{profileEmail}</div>
              <button
                type="button"
                onClick={() => uploadInputRef.current?.click()}
                className="mt-3 inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-2 text-[12px] font-semibold text-slate-700 ring-1 ring-slate-200/80 dark:bg-slate-900 dark:text-slate-100 dark:ring-white/10"
              >
                <Camera size={14} />
                Change photo
              </button>
            </div>
          </div>

          <div className="border-t border-slate-200/80 px-1 py-4">
            <label className="block">
              <div className="text-[13px] font-medium text-slate-700">Full name</div>
              <input
                type="text"
                value={profile.name || ""}
                onChange={(event) => updateProfileField("name", event.target.value, "Name updated for this account profile.")}
                placeholder="Your full name"
                className="mt-2 w-full rounded-[20px] bg-slate-50 px-4 py-3 text-[15px] text-slate-900 ring-1 ring-slate-200/80 outline-none placeholder:text-slate-400 dark:bg-slate-900 dark:text-slate-50 dark:ring-white/10 dark:placeholder:text-slate-500"
              />
            </label>
          </div>

          <div className="border-t border-slate-200/80 px-1 py-4">
            <label className="block">
              <div className="text-[13px] font-medium text-slate-700">Phone</div>
              <input
                type="tel"
                value={profile.phone || ""}
                onChange={(event) => updateProfileField("phone", event.target.value, "Phone saved for this account profile.")}
                placeholder="+2547xx xxx xxx"
                className="mt-2 w-full rounded-[20px] bg-slate-50 px-4 py-3 text-[15px] text-slate-900 ring-1 ring-slate-200/80 outline-none placeholder:text-slate-400 dark:bg-slate-900 dark:text-slate-50 dark:ring-white/10 dark:placeholder:text-slate-500"
              />
            </label>
          </div>

          {avatarError ? <div className="px-1 pt-1 text-[13px] leading-5 text-red-600">{avatarError}</div> : null}
          {saveMessage ? <div className="px-1 pt-3 text-[13px] leading-5 text-slate-500 dark:text-slate-300">{saveMessage}</div> : null}

          <input ref={uploadInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
        </section>

        <section className={surfaceClasses("mt-4 px-4 py-3")}>
          <SectionHeading title="Email & identity" description="Your account email stays protected behind a verification-ready flow." />
          <RowButton
            label="Email"
            subtitle={profileEmail || "No email available"}
            onClick={() => setIsEmailSheetOpen(true)}
          />
          <RowButton
            label="Workspace"
            subtitle="Institution account"
            onClick={() => setActiveUtilityPage("workspace")}
            showDivider
          />
        </section>

        <section className={surfaceClasses("mt-4 px-4 py-3")}>
          <SectionHeading title="Plan & billing" description="Service rows stay available here without pretending full billing support." />
          <RowButton
            label="Upgrade / Plan"
            subtitle="Education"
            onClick={() => openInstitutionMobileSettingsLink(INSTITUTION_MOBILE_SETTINGS_LINKS.billingPortal)}
          />
          <RowButton
            label="Subscription"
            subtitle="Managed from account services"
            onClick={() => openInstitutionMobileSettingsLink(INSTITUTION_MOBILE_SETTINGS_LINKS.billingPortal)}
            showDivider
          />
          <RowButton
            label="Payment"
            subtitle="Billing management is still being connected"
            onClick={() => openInstitutionMobileSettingsLink(INSTITUTION_MOBILE_SETTINGS_LINKS.billingPortal)}
            showDivider
          />
        </section>

        <section className={surfaceClasses("mt-4 px-4 py-3")}>
          <SectionHeading title="Feedback" description="Control product and feedback communication for this account." />
          <ToggleRow
            label="Feedback emails"
            subtitle="Receive product feedback and improvement emails for this account."
            checked={feedbackEmailsEnabled}
            onChange={setFeedbackEmailsEnabled}
          />
        </section>

        <section className={surfaceClasses("mt-4 px-4 py-3")}>
          <SectionHeading title="Advanced" description="Sensitive account actions stay clearly separated here." />
          <RowButton
            label="Delete account"
            subtitle="This action remains protected until the full account-deletion flow is ready."
            onClick={() => setConfirmAction("delete-account")}
            danger
          />
        </section>
      </div>

      <EmailChangeSheet
        open={isEmailSheetOpen}
        onClose={() => setIsEmailSheetOpen(false)}
        currentEmail={profileEmail}
        onContinue={async ({ currentEmail, newEmail }) => ({
          message:
            "Verification-ready flow prepared. Connect the real verification send step here when backend wiring is available.",
          currentEmail,
          newEmail,
        })}
      />

      <ConfirmationSheet
        open={confirmAction === "delete-account"}
        title="Delete account"
        description="Full account deletion is not ready on this mobile-safe frontend yet. This action remains protected."
        confirmLabel="Understood"
        onCancel={() => setConfirmAction("")}
        onConfirm={() => setConfirmAction("")}
        danger
      />
    </div>
  );
}
