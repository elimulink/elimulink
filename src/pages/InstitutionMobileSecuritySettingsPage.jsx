import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  Lock,
  LogOut,
  Shield,
  Smartphone,
  UserRound,
  X,
} from "lucide-react";
import {
  clearRegisteredPasskeys,
  getRegisteredPasskeys,
  getSecureUnlockCapabilities,
  getProviderDisplayName,
  registerPasskey,
} from "../auth/secureLock";

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

function ActionRow({ label, subtitle, onClick, showDivider = false, danger = false, actionLabel = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex w-full items-center gap-3 px-1 py-4 text-left transition",
        showDivider ? "border-t border-slate-200/80" : "",
      ].join(" ")}
    >
      <div className="min-w-0 flex-1">
        <div className={["text-[15px] font-medium tracking-[-0.01em]", danger ? "text-red-700" : "text-slate-950"].join(" ")}>
          {label}
        </div>
        <div className="mt-0.5 text-[13px] leading-5 text-slate-500">{subtitle}</div>
      </div>
      {actionLabel ? (
        <div
          className={[
            "rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]",
            danger ? "bg-red-50 text-red-600 ring-1 ring-red-200/80" : "bg-slate-50 text-slate-500 ring-1 ring-slate-200/80",
          ].join(" ")}
        >
          {actionLabel}
        </div>
      ) : (
        <ChevronRight size={18} className={danger ? "text-red-300" : "text-slate-300"} />
      )}
    </button>
  );
}

function StatusChip({ label, active = false }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]",
        active ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-500 ring-1 ring-slate-200/80",
      ].join(" ")}
    >
      {label}
    </span>
  );
}

function ConfirmationSheet({ open, title, description, confirmLabel, danger = false, onCancel, onConfirm }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40">
      <button type="button" className="absolute inset-0 bg-slate-950/35" aria-label="Close" onClick={onCancel} />
      <div
        className="absolute inset-x-0 bottom-0 rounded-t-[30px] bg-white px-4 pt-3 shadow-[0_-22px_60px_rgba(15,23,42,0.22)] ring-1 ring-slate-200/80"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto h-1.5 w-12 rounded-full bg-slate-200" />
        <div className="px-1 pt-4 pb-2">
          <div className="text-[1.1rem] font-medium tracking-[-0.02em] text-slate-950">{title}</div>
          <div className="mt-1 text-[13px] leading-5 text-slate-500">{description}</div>
        </div>
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex flex-1 items-center justify-center rounded-[22px] bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200/80"
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

export default function InstitutionMobileSecuritySettingsPage({ user, onBack, onLogout }) {
  const [passkeyEntries, setPasskeyEntries] = useState(() => getRegisteredPasskeys(user?.uid));
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const [passkeyMessage, setPasskeyMessage] = useState("");
  const [previewDevices, setPreviewDevices] = useState([]);
  const [confirmAction, setConfirmAction] = useState("");

  const secureCapabilities = useMemo(() => getSecureUnlockCapabilities(user), [user]);
  const hasPasskey = passkeyEntries.length > 0 || secureCapabilities.passkey;
  const methods = useMemo(() => {
    const next = [];
    if (secureCapabilities.password) next.push({ id: "password", label: "Password", active: true });
    if (secureCapabilities.federatedProvider) {
      next.push({
        id: "provider",
        label: `${getProviderDisplayName(secureCapabilities.federatedProviderId)} sign-in`,
        active: true,
      });
    }
    if (secureCapabilities.passkeySupported) {
      next.push({ id: "passkey", label: "Passkey", active: hasPasskey });
    }
    return next;
  }, [hasPasskey, secureCapabilities]);

  useEffect(() => {
    setPasskeyEntries(getRegisteredPasskeys(user?.uid));
  }, [user?.uid]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("elimulink_trusted_devices_preview");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setPreviewDevices(parsed);
          return;
        }
      }
    } catch {
      // ignore and fall back
    }
    setPreviewDevices([
      {
        id: "current-device",
        label: "Current browser",
        meta: "This device / Active now",
      },
    ]);
  }, []);

  async function handleAddPasskey() {
    if (!user?.uid) {
      setPasskeyMessage("Sign in again before setting up a passkey.");
      return;
    }
    setPasskeyBusy(true);
    setPasskeyMessage("");
    try {
      const created = await registerPasskey(user, { label: "This device" });
      const nextEntries = getRegisteredPasskeys(user.uid);
      setPasskeyEntries(nextEntries);
      setPasskeyMessage(`Passkey set up for ${created.label}. This device can now use passkey verification.`);
    } catch (error) {
      setPasskeyMessage(String(error?.message || "Passkey setup failed."));
    } finally {
      setPasskeyBusy(false);
    }
  }

  function handleRemovePasskey() {
    if (!user?.uid) return;
    clearRegisteredPasskeys(user.uid);
    setPasskeyEntries([]);
    setPasskeyMessage("Passkey removed from this device.");
  }

  return (
    <div className="min-h-[100dvh] bg-[linear-gradient(180deg,#fbfcfe_0%,#f6f8fb_100%)]">
      <MobilePageBar title="Security" onBack={onBack} />

      <div className="px-4 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <section className={surfaceClasses("px-4 py-4")}>
          <SectionHeading title="Passkeys" description="Passkeys are handled first here because they are the strongest mobile-ready security control in the current app." />
          <div className="mt-1 rounded-[24px] bg-slate-50/90 px-4 py-4 ring-1 ring-slate-200/80">
            <div className="flex items-start gap-3">
              <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-700 ring-1 ring-slate-200/80">
                <KeyRound size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-medium text-slate-950">Passkey on this device</div>
                <div className="mt-0.5 text-[13px] leading-5 text-slate-500">
                  {secureCapabilities.passkeySupported
                    ? hasPasskey
                      ? "A passkey is already available for this account on this device."
                      : "Set up a passkey for faster and safer device verification."
                    : "Passkeys are not supported in this browser."}
                </div>
              </div>
            </div>

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={handleAddPasskey}
                disabled={passkeyBusy || !secureCapabilities.passkeySupported}
                className="inline-flex flex-1 items-center justify-center rounded-[22px] bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
              >
                {passkeyBusy ? "Setting up..." : hasPasskey ? "Add another passkey" : "Add passkey"}
              </button>
              {hasPasskey ? (
                <button
                  type="button"
                  onClick={() => setConfirmAction("remove-passkey")}
                  className="inline-flex items-center justify-center rounded-[22px] bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 ring-1 ring-red-200/80"
                >
                  Remove
                </button>
              ) : null}
            </div>

            {passkeyEntries.length ? (
              <div className="mt-4 overflow-hidden rounded-[20px] bg-white ring-1 ring-slate-200/80">
                {passkeyEntries.map((entry, index) => (
                  <div key={entry.id} className={index > 0 ? "border-t border-slate-200/80 px-4 py-3" : "px-4 py-3"}>
                    <div className="text-[14px] font-medium text-slate-950">{entry.label || "This device"}</div>
                    <div className="mt-0.5 text-[12px] text-slate-500">
                      Added {new Date(entry.createdAt || Date.now()).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {passkeyMessage ? (
            <div className="mt-3 rounded-[20px] bg-slate-50 px-4 py-3 text-[13px] leading-5 text-slate-600 ring-1 ring-slate-200/75">
              {passkeyMessage}
            </div>
          ) : null}
        </section>

        <section className={surfaceClasses("mt-4 px-4 py-4")}>
          <SectionHeading title="Sign-in methods" description="Only methods that can actually be detected from the current auth state are shown here." />
          <div className="mt-1 flex flex-wrap gap-2 px-1">
            {methods.length ? (
              methods.map((method) => <StatusChip key={method.id} label={method.label} active={method.active} />)
            ) : (
              <StatusChip label="No method info" />
            )}
          </div>
          <div className="mt-4 rounded-[20px] bg-slate-50 px-4 py-4 text-[13px] leading-6 text-slate-500 ring-1 ring-slate-200/75">
            {hasPasskey
              ? "This account can use passkey verification on this device."
              : secureCapabilities.passkeySupported
                ? "Passkey support is available, but no passkey has been added on this device yet."
                : "This browser does not currently expose passkey support."}
          </div>
        </section>

        <section className={surfaceClasses("mt-4 px-4 py-3")}>
          <SectionHeading title="Device & session" description="Session actions stay clear and deliberate on mobile." />
          <ActionRow
            label="Log out of this device"
            subtitle="End the current Institution session on this browser."
            onClick={() => setConfirmAction("logout-current")}
            actionLabel="Now"
          />
          <ActionRow
            label="Log out of all devices"
            subtitle="Cross-device invalidation is not fully available in this mobile-safe frontend yet."
            onClick={() => setConfirmAction("logout-all")}
            showDivider
            danger
            actionLabel="Protected"
          />
          <ActionRow
            label="Change password"
            subtitle="Password changes still depend on the existing verification-ready flow."
            onClick={() => window.alert("Change password is still protected until the fuller verification flow is connected.")}
            showDivider
          />
        </section>

        <section className={surfaceClasses("mt-4 px-4 py-3")}>
          <SectionHeading title="MFA" description="MFA stays secondary to passkeys in this mobile pass." />
          <ActionRow
            label="Authenticator app"
            subtitle="The enrollment surface is still being prepared and is not completing real setup yet."
            onClick={() => window.alert("Authenticator-app MFA is still a safe preview in the current frontend.")}
            actionLabel="Preview"
          />
        </section>

        <section className={surfaceClasses("mt-4 px-4 py-3")}>
          <SectionHeading title="Trusted devices" description="Trusted device history is currently a local preview summary, not a complete live device ledger." />
          {previewDevices.slice(0, 2).map((device, index) => (
            <div key={device.id || index} className={index > 0 ? "border-t border-slate-200/80 px-1 py-4" : "px-1 py-4"}>
              <div className="flex items-start gap-3">
                <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-slate-700 ring-1 ring-slate-200/75">
                  <Smartphone size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-medium text-slate-950">{device.label || "Current browser"}</div>
                  <div className="mt-0.5 text-[13px] leading-5 text-slate-500">{device.meta || "This device / Active now"}</div>
                </div>
              </div>
            </div>
          ))}
          <div className="border-t border-slate-200/80 px-1 py-4 text-[13px] leading-5 text-slate-500">
            A fuller trusted-device manager can be added later without changing this mobile page structure.
          </div>
        </section>

        <div className="mt-4 rounded-[22px] bg-slate-50/90 px-4 py-4 text-[13px] leading-6 text-slate-500 ring-1 ring-slate-200/75">
          Security actions here reuse the current secure-lock and session logic first. MFA and device history remain intentionally lighter until the broader frontend and backend flow are ready.
        </div>
      </div>

      <ConfirmationSheet
        open={confirmAction === "remove-passkey"}
        title="Remove passkey?"
        description="This removes the passkey stored for this device."
        confirmLabel="Remove"
        danger
        onCancel={() => setConfirmAction("")}
        onConfirm={() => {
          handleRemovePasskey();
          setConfirmAction("");
        }}
      />

      <ConfirmationSheet
        open={confirmAction === "logout-current"}
        title="Log out of this device?"
        description="You will leave the current Institution session on this browser."
        confirmLabel="Log out"
        danger
        onCancel={() => setConfirmAction("")}
        onConfirm={() => {
          setConfirmAction("");
          onLogout?.();
        }}
      />

      <ConfirmationSheet
        open={confirmAction === "logout-all"}
        title="Log out of all devices"
        description="Full cross-device invalidation is not yet available on this mobile-safe frontend. This action stays protected for now."
        confirmLabel="Understood"
        onCancel={() => setConfirmAction("")}
        onConfirm={() => setConfirmAction("")}
      />
    </div>
  );
}
