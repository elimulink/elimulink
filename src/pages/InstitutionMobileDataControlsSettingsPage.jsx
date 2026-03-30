import { useMemo, useState } from "react";
import { Archive, ChevronLeft, ChevronRight, Copy, ExternalLink, Link2, Shield, Trash2 } from "lucide-react";
import { getStoredPreferences, saveStoredPreferences } from "../lib/userSettings";

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

function RowButton({ label, subtitle, onClick, showDivider = false, danger = false, icon = null }) {
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
        <div
          className={[
            "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ring-1",
            danger ? "bg-red-50 text-red-600 ring-red-200/80" : "bg-slate-50 text-slate-700 ring-slate-200/75",
          ].join(" ")}
        >
          <Icon size={17} />
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className={["text-[15px] font-medium tracking-[-0.01em]", danger ? "text-red-700" : "text-slate-950"].join(" ")}>
          {label}
        </div>
        <div className="mt-0.5 text-[13px] leading-5 text-slate-500">{subtitle}</div>
      </div>
      <ChevronRight size={18} className={danger ? "text-red-300" : "text-slate-300"} />
    </button>
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

function EmptyState({ icon: Icon, title, copy }) {
  return (
    <div className="rounded-[22px] bg-slate-50/90 px-4 py-8 text-center ring-1 ring-slate-200/80 dark:bg-slate-900/80 dark:ring-white/10">
      <div className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-700 ring-1 ring-slate-200/80 dark:bg-slate-950 dark:text-slate-100 dark:ring-white/10">
        <Icon size={18} />
      </div>
      <div className="mt-4 text-[15px] font-medium text-slate-950 dark:text-slate-50">{title}</div>
      <div className="mt-1 text-[13px] leading-5 text-slate-500 dark:text-slate-300">{copy}</div>
    </div>
  );
}

function SharedLinksPage({ items = [], mode = "preview", onBack, onDeleteLink }) {
  const sortedItems = useMemo(
    () =>
      [...items].sort((a, b) => {
        const left = new Date(a?.dateShared || 0).getTime();
        const right = new Date(b?.dateShared || 0).getTime();
        return right - left;
      }),
    [items],
  );
  const [copyingId, setCopyingId] = useState("");

  async function handleCopy(item) {
    if (!item?.url) return;
    try {
      setCopyingId(item.id);
      await navigator.clipboard.writeText(item.url);
      window.setTimeout(() => setCopyingId(""), 900);
    } catch {
      setCopyingId("");
      window.alert("Could not copy shared link.");
    }
  }

  return (
    <div className="min-h-[100dvh] bg-[linear-gradient(180deg,#fbfcfe_0%,#f6f8fb_100%)] dark:bg-[linear-gradient(180deg,#06111f_0%,#0a1527_100%)]">
      <MobilePageBar title="Shared links" onBack={onBack} />
      <div className="px-4 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <section className={surfaceClasses("px-4 py-4")}>
          <SectionHeading
            title="Shared links"
            description={
              mode === "live"
                ? "Review the links currently available on this mobile surface."
                : "This mobile surface is ready for shared links, but still preview-first when no real records are available."
            }
          />
          {sortedItems.length ? (
            <div className="space-y-3">
              {sortedItems.map((item) => (
                <div key={item.id} className="rounded-[22px] bg-slate-50/90 px-4 py-4 ring-1 ring-slate-200/80">
                  <div className="text-[15px] font-medium text-slate-950">{item.name}</div>
                  <div className="mt-1 text-[13px] leading-5 text-slate-500">{item.type || "Conversation"}</div>
                  {item.url ? <div className="mt-2 break-all text-[12px] leading-5 text-slate-400">{item.url}</div> : null}
                  <div className="mt-4 flex gap-2">
                    <a
                      href={item.url || "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-[18px] bg-white px-4 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200/80"
                      onClick={(event) => {
                        if (!item.url) event.preventDefault();
                      }}
                    >
                      <ExternalLink size={14} />
                      View
                    </a>
                    <button
                      type="button"
                      onClick={() => handleCopy(item)}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-[18px] bg-white px-4 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200/80"
                    >
                      <Copy size={14} />
                      {copyingId === item.id ? "Copied" : "Copy"}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteLink?.(item)}
                      disabled={!item.canDelete || !onDeleteLink}
                      className="inline-flex items-center justify-center rounded-[18px] bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 ring-1 ring-red-200/80 disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Link2}
              title="No shared links yet"
              copy={
                mode === "live"
                  ? "Create a share link elsewhere in the app and it will appear here when that source is connected."
                  : "This mobile page is ready to host shared links later without porting the desktop table directly."
              }
            />
          )}
        </section>
      </div>
    </div>
  );
}

function ArchivedChatsPage({ items = [], mode = "preview", onBack, onOpenChat, onRestoreChat, onDeleteChat }) {
  const sortedItems = useMemo(
    () =>
      [...items].sort((a, b) => {
        const left = new Date(a?.dateArchived || 0).getTime();
        const right = new Date(b?.dateArchived || 0).getTime();
        return right - left;
      }),
    [items],
  );

  return (
    <div className="min-h-[100dvh] bg-[linear-gradient(180deg,#fbfcfe_0%,#f6f8fb_100%)] dark:bg-[linear-gradient(180deg,#06111f_0%,#0a1527_100%)]">
      <MobilePageBar title="Archived chats" onBack={onBack} />
      <div className="px-4 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <section className={surfaceClasses("px-4 py-4")}>
          <SectionHeading
            title="Archived chats"
            description={
              mode === "live"
                ? "Review archived conversations currently available on this mobile surface."
                : "Archived chat controls are preview-first here until a mobile-safe archive source is connected."
            }
          />
          {sortedItems.length ? (
            <div className="space-y-3">
              {sortedItems.map((item) => (
                <div key={item.id} className="rounded-[22px] bg-slate-50/90 px-4 py-4 ring-1 ring-slate-200/80">
                  <div className="text-[15px] font-medium text-slate-950">{item.title || "Archived conversation"}</div>
                  <div className="mt-1 text-[13px] leading-5 text-slate-500">{item.preview || "No preview available"}</div>
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => item.canOpen && onOpenChat?.(item)}
                      disabled={!item.canOpen}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-[18px] bg-white px-4 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200/80 disabled:opacity-50"
                    >
                      <ExternalLink size={14} />
                      Open
                    </button>
                    <button
                      type="button"
                      onClick={() => item.canRestore && onRestoreChat?.(item)}
                      disabled={!item.canRestore}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-[18px] bg-white px-4 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200/80 disabled:opacity-50"
                    >
                      <Archive size={14} />
                      Restore
                    </button>
                    <button
                      type="button"
                      onClick={() => item.canDelete && onDeleteChat?.(item)}
                      disabled={!item.canDelete}
                      className="inline-flex items-center justify-center rounded-[18px] bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 ring-1 ring-red-200/80 disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Archive}
              title="No archived chats"
              copy={
                mode === "live"
                  ? "Archived conversations will appear here when that source is available on mobile."
                  : "This mobile page keeps archive management ready without bringing over the desktop table layout."
              }
            />
          )}
        </section>
      </div>
    </div>
  );
}

export default function InstitutionMobileDataControlsSettingsPage({
  user,
  onBack,
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
  const uid = user?.uid || null;
  const [activeSubpage, setActiveSubpage] = useState("");
  const [confirmAction, setConfirmAction] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [prefs, setPrefs] = useState(() =>
    getStoredPreferences(
      {
        improveModelForEveryone: false,
        improveModelAudio: false,
        improveModelVideo: false,
        remoteBrowserDataEnabled: false,
        remoteBrowserRememberSiteData: false,
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

  async function runProtectedAction(action, fallbackMessage) {
    setActionMessage("");
    if (!action) {
      setActionMessage(fallbackMessage);
      return;
    }
    try {
      const result = await action();
      if (result?.message) {
        setActionMessage(String(result.message));
      }
    } catch (error) {
      setActionMessage(String(error?.message || fallbackMessage));
    }
  }

  if (activeSubpage === "shared-links") {
    return (
      <SharedLinksPage
        items={sharedLinksItems}
        mode={sharedLinksMode}
        onBack={() => setActiveSubpage("")}
        onDeleteLink={onDeleteSharedLink}
      />
    );
  }

  if (activeSubpage === "archived-chats") {
    return (
      <ArchivedChatsPage
        items={archivedChatsItems}
        mode={archivedChatsMode}
        onBack={() => setActiveSubpage("")}
        onOpenChat={onOpenArchivedChat}
        onRestoreChat={onRestoreArchivedChat}
        onDeleteChat={onDeleteArchivedChat}
      />
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[linear-gradient(180deg,#fbfcfe_0%,#f6f8fb_100%)] dark:bg-[linear-gradient(180deg,#06111f_0%,#0a1527_100%)]">
      <MobilePageBar title="Data controls" onBack={onBack} />
      <div className="px-4 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <section className={surfaceClasses("px-4 py-4")}>
          <SectionHeading
            title="Model & privacy"
            description="These controls stay honest and local first while broader data-sharing behavior is still being shaped."
          />
          <ToggleRow
            label="Improve the model for everyone"
            subtitle="Opt into broader model-improvement preferences."
            checked={!!prefs.improveModelForEveryone}
            onChange={(next) => updatePref("improveModelForEveryone", next)}
          />
        </section>

        <section className={surfaceClasses("mt-4 px-4 py-4")}>
          <SectionHeading
            title="Voice & video data"
            description="These rows only prepare what types of recordings could be shared later."
          />
          <ToggleRow
            label="Include audio recordings"
            subtitle="Prepared for future audio-related improvement controls."
            checked={!!prefs.improveModelAudio}
            onChange={(next) => updatePref("improveModelAudio", next)}
          />
          <ToggleRow
            label="Include video recordings"
            subtitle="Prepared for future video-related improvement controls."
            checked={!!prefs.improveModelVideo}
            onChange={(next) => updatePref("improveModelVideo", next)}
            showDivider
          />
        </section>

        <section className={surfaceClasses("mt-4 px-4 py-3")}>
          <SectionHeading
            title="Chat history & browsing data"
            description="Keep remote browsing and chat-history actions visible without pretending they are fully connected."
          />
          <ToggleRow
            label="Remote browser data"
            subtitle="Prepare how remote browsing site data behaves between sessions."
            checked={!!prefs.remoteBrowserDataEnabled}
            onChange={(next) => updatePref("remoteBrowserDataEnabled", next)}
          />
          <ToggleRow
            label="Remember site data between sessions"
            subtitle="Only applies when remote browser data is enabled."
            checked={!!prefs.remoteBrowserRememberSiteData}
            onChange={(next) => updatePref("remoteBrowserRememberSiteData", next)}
            showDivider
          />
          <RowButton
            label="Delete all site data"
            subtitle="Remote browser site-data deletion remains protected for now."
            onClick={() => setConfirmAction("delete-site-data")}
            showDivider
            danger
            icon={Trash2}
          />
        </section>

        <section className={surfaceClasses("mt-4 px-4 py-3")}>
          <SectionHeading
            title="Shared items"
            description="Open lighter mobile views for shared links and archived chats."
          />
          <RowButton
            label="Shared links"
            subtitle={`${sharedLinksItems.length || 0} item${sharedLinksItems.length === 1 ? "" : "s"}`}
            onClick={() => setActiveSubpage("shared-links")}
            icon={Link2}
          />
          <RowButton
            label="Archived chats"
            subtitle={`${archivedChatsItems.length || 0} item${archivedChatsItems.length === 1 ? "" : "s"}`}
            onClick={() => setActiveSubpage("archived-chats")}
            showDivider
            icon={Archive}
          />
        </section>

        <section className={surfaceClasses("mt-4 px-4 py-3")}>
          <SectionHeading
            title="Export & clear"
            description="Bulk actions stay clearly protected and honest on mobile."
          />
          <RowButton
            label="Export data"
            subtitle="Prepare a future export flow without claiming live export support."
            onClick={() => setConfirmAction("export")}
            icon={ExternalLink}
          />
          <RowButton
            label="Archive all chats"
            subtitle="Safe placeholder for future bulk archive behavior."
            onClick={() => setConfirmAction("archive-all")}
            showDivider
            icon={Archive}
          />
          <RowButton
            label="Delete all chats"
            subtitle="Protected destructive action until the full data flow is ready."
            onClick={() => setConfirmAction("delete-all")}
            showDivider
            danger
            icon={Trash2}
          />
        </section>

        {actionMessage ? (
          <div className="mt-4 rounded-[22px] bg-slate-50/90 px-4 py-4 text-[13px] leading-6 text-slate-500 ring-1 ring-slate-200/75">
            {actionMessage}
          </div>
        ) : null}

        <div className="mt-4 rounded-[22px] bg-slate-50/90 px-4 py-4 text-[13px] leading-6 text-slate-500 ring-1 ring-slate-200/75">
          Data controls on this mobile page remain privacy-focused and honest. Shared links and archived chats are ready for lighter mobile views, while export and bulk-clear actions remain protected until fuller flows are available.
        </div>
      </div>

      <ConfirmationSheet
        open={confirmAction === "delete-site-data"}
        title="Delete site data"
        description="Remote browser site-data deletion is not connected yet on this mobile-safe frontend."
        confirmLabel="Understood"
        danger
        onCancel={() => setConfirmAction("")}
        onConfirm={() => {
          setConfirmAction("");
          setActionMessage("Remote browser site-data deletion will be connected here later.");
        }}
      />

      <ConfirmationSheet
        open={confirmAction === "export"}
        title="Export data"
        description={
          onExportData
            ? "Export the current owner-scoped Institution chat data available from the existing backend."
            : "Data export remains a protected placeholder until a fuller export flow is ready."
        }
        confirmLabel={onExportData ? "Export" : "Understood"}
        onCancel={() => setConfirmAction("")}
        onConfirm={async () => {
          setConfirmAction("");
          await runProtectedAction(onExportData, "Data export will be connected here later.");
        }}
      />

      <ConfirmationSheet
        open={confirmAction === "archive-all"}
        title="Archive all chats"
        description={
          onArchiveAllChats
            ? "Archive all owner-scoped Institution chat conversations without affecting notebook workspace metadata."
            : "Bulk archive behavior is still being prepared and is not connected on this mobile-safe frontend."
        }
        confirmLabel={onArchiveAllChats ? "Archive all" : "Understood"}
        onCancel={() => setConfirmAction("")}
        onConfirm={async () => {
          setConfirmAction("");
          await runProtectedAction(onArchiveAllChats, "Archive all chats will be connected later.");
        }}
      />

      <ConfirmationSheet
        open={confirmAction === "delete-all"}
        title="Delete all chats"
        description={
          onDeleteAllChats
            ? "Permanently remove all owner-scoped Institution chat conversations and their share links. Notebook workspace metadata stays outside this bulk action."
            : "This destructive action remains protected until the full data flow is ready."
        }
        confirmLabel={onDeleteAllChats ? "Delete all" : "Understood"}
        danger
        onCancel={() => setConfirmAction("")}
        onConfirm={async () => {
          setConfirmAction("");
          await runProtectedAction(onDeleteAllChats, "Delete all chats remains protected until the full data flow is ready.");
        }}
      />
    </div>
  );
}
