import React, { useEffect, useState } from "react";
import { getDesktopSettingsPreviewState, saveDesktopSettingsPreviewState } from "./desktopSettingsPreviewStore";
import DesktopArchivedChatsManager from "./DesktopArchivedChatsManager.jsx";
import DesktopSharedLinksManager from "./DesktopSharedLinksManager.jsx";
import "./desktop-settings-workspace.css";

export default function DesktopDataControlsSettingsSection({
  user,
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
  const [prefs, setPrefs] = useState(() => {
    const stored = getDesktopSettingsPreviewState(
      "dataControls",
      {
        improveModelForEveryone: false,
        improveModelAudio: false,
        improveModelVideo: false,
        remoteBrowserDataEnabled: false,
        remoteBrowserRememberSiteData: false,
      },
      uid,
    );

    return {
      improveModelForEveryone: !!stored.improveModelForEveryone,
      improveModelAudio: !!stored.improveModelAudio,
      improveModelVideo: !!stored.improveModelVideo,
      remoteBrowserDataEnabled: !!stored.remoteBrowserDataEnabled,
      remoteBrowserRememberSiteData: !!stored.remoteBrowserRememberSiteData,
    };
  });

  const [actionMessage, setActionMessage] = useState("");
  const [isSharedLinksManagerOpen, setIsSharedLinksManagerOpen] = useState(false);
  const [isArchivedChatsManagerOpen, setIsArchivedChatsManagerOpen] = useState(false);

  useEffect(() => {
    saveDesktopSettingsPreviewState(
      "dataControls",
      {
      improveModelForEveryone: prefs.improveModelForEveryone,
      improveModelAudio: prefs.improveModelAudio,
      improveModelVideo: prefs.improveModelVideo,
      remoteBrowserDataEnabled: prefs.remoteBrowserDataEnabled,
      remoteBrowserRememberSiteData: prefs.remoteBrowserRememberSiteData,
      },
      uid,
    );
  }, [prefs, uid]);

  function updatePref(key, value) {
    setPrefs((current) => ({ ...current, [key]: value }));
  }

  function showPlaceholder(message) {
    setActionMessage(message);
  }

  async function runAction(action, fallbackMessage) {
    setActionMessage("");
    if (!action) {
      showPlaceholder(fallbackMessage);
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

  return (
    <section className="dsw-section">
      <div className="dsw-section-header">
        <h2 className="dsw-section-title">Data controls</h2>
        <p className="dsw-section-description">
          Manage data-sharing preferences, remote browser behavior, shared items, and export actions.
        </p>
      </div>

      <div className="dsw-card">
        <div className="dsw-status-note is-preview">
          <span className="dsw-status-chip">Preview</span>
          Preview-only controls are saved separately from real preferences. Shared links can open a real manager on supported shells, while archive, delete, and export actions remain protected placeholders.
        </div>
        <div className="dsw-row">
          <div>
            <div className="dsw-row-label">Improve the model for everyone</div>
            <div className="dsw-row-help">
              Frontend-first control for opting into broader model improvement preferences.
            </div>
          </div>
          <label className="dsw-switch">
            <input
              type="checkbox"
              checked={prefs.improveModelForEveryone}
              onChange={() =>
                updatePref("improveModelForEveryone", !prefs.improveModelForEveryone)
              }
            />
            <span className="dsw-switch-track" />
          </label>
        </div>

        <div className="dsw-divider" />

        <div className="dsw-stack">
          <div className="dsw-row">
            <div>
              <div className="dsw-row-label">Include your audio recordings</div>
            </div>
            <label className="dsw-switch">
              <input
                type="checkbox"
                checked={prefs.improveModelAudio}
                disabled={!prefs.improveModelForEveryone}
                onChange={() => updatePref("improveModelAudio", !prefs.improveModelAudio)}
              />
              <span className="dsw-switch-track" />
            </label>
          </div>

          <div className="dsw-divider" />

          <div className="dsw-row">
            <div>
              <div className="dsw-row-label">Include your video recordings</div>
            </div>
            <label className="dsw-switch">
              <input
                type="checkbox"
                checked={prefs.improveModelVideo}
                disabled={!prefs.improveModelForEveryone}
                onChange={() => updatePref("improveModelVideo", !prefs.improveModelVideo)}
              />
              <span className="dsw-switch-track" />
            </label>
          </div>
        </div>
      </div>

      <div className="dsw-card">
        <div className="dsw-row">
          <div>
            <div className="dsw-row-label">Remote browser data</div>
            <div className="dsw-row-help">
              Prepare how remote browsing site data behaves between sessions.
            </div>
          </div>
          <label className="dsw-switch">
            <input
              type="checkbox"
              checked={prefs.remoteBrowserDataEnabled}
              onChange={() =>
                updatePref("remoteBrowserDataEnabled", !prefs.remoteBrowserDataEnabled)
              }
            />
            <span className="dsw-switch-track" />
          </label>
        </div>

        <div className="dsw-divider" />

        <div className="dsw-row">
          <div>
            <div className="dsw-row-label">Remember site data between sessions</div>
          </div>
          <label className="dsw-switch">
            <input
              type="checkbox"
              checked={prefs.remoteBrowserRememberSiteData}
              disabled={!prefs.remoteBrowserDataEnabled}
              onChange={() =>
                updatePref(
                  "remoteBrowserRememberSiteData",
                  !prefs.remoteBrowserRememberSiteData,
                )
              }
            />
            <span className="dsw-switch-track" />
          </label>
        </div>

        <div className="dsw-divider" />

        <div className="dsw-row">
          <div>
            <div className="dsw-row-label">Delete all</div>
            <div className="dsw-row-help">Clears saved remote browser site data when this flow is connected.</div>
          </div>
          <button
            type="button"
            className="dsw-button dsw-button-danger-outline"
            onClick={() => showPlaceholder("Remote browser site data deletion will be connected here later.")}
          >
            Delete all
          </button>
        </div>
      </div>

      <div className="dsw-card">
        <div className="dsw-row">
          <div>
            <div className="dsw-row-label">Shared links</div>
            <div className="dsw-row-help">
              Manage conversation and workspace share links from a focused desktop manager.
            </div>
          </div>
          <button
            type="button"
            className="dsw-button"
            onClick={() => setIsSharedLinksManagerOpen(true)}
          >
            Manage
          </button>
        </div>

        <div className="dsw-divider" />

        <div className="dsw-row">
          <div>
            <div className="dsw-row-label">Archived chats</div>
            <div className="dsw-row-help">Open a focused desktop manager for archived conversation records when available.</div>
          </div>
          <button
            type="button"
            className="dsw-button"
            onClick={() => setIsArchivedChatsManagerOpen(true)}
          >
            Manage
          </button>
        </div>
      </div>

      <div className="dsw-card">
        <div className="dsw-row">
          <div>
            <div className="dsw-row-label">Archive all chats</div>
            <div className="dsw-row-help">Safe placeholder for bulk archive behavior.</div>
          </div>
          <button
            type="button"
            className="dsw-button"
            onClick={() => runAction(onArchiveAllChats, "Archive all chats will be connected later.")}
          >
            Archive all
          </button>
        </div>

        <div className="dsw-divider" />

        <div className="dsw-row">
          <div>
            <div className="dsw-row-label">Delete all chats</div>
            <div className="dsw-row-help">Protected destructive action kept placeholder-safe for now.</div>
          </div>
          <button
            type="button"
            className="dsw-button dsw-button-danger-outline"
            onClick={() => runAction(onDeleteAllChats, "Delete all chats remains protected until the full data flow is ready.")}
          >
            Delete all
          </button>
        </div>

        <div className="dsw-divider" />

        <div className="dsw-row">
          <div>
            <div className="dsw-row-label">Export data</div>
            <div className="dsw-row-help">Prepare data export using future share/export flows.</div>
          </div>
          <button
            type="button"
            className="dsw-button dsw-button-primary"
            onClick={() => runAction(onExportData, "Data export will be connected here later.")}
          >
            Export
          </button>
        </div>
      </div>

      {actionMessage ? <div className="dsw-inline-note">{actionMessage}</div> : null}

      <DesktopSharedLinksManager
        open={isSharedLinksManagerOpen}
        onClose={() => setIsSharedLinksManagerOpen(false)}
        items={sharedLinksItems}
        onDeleteLink={onDeleteSharedLink}
        mode={sharedLinksMode}
        description={
          sharedLinksMode === "live"
            ? "View, copy, or remove the conversation share links currently available on this desktop workspace."
            : "Preview manager for shared links. This surface will show real records as they become available."
        }
      />

      <DesktopArchivedChatsManager
        open={isArchivedChatsManagerOpen}
        onClose={() => setIsArchivedChatsManagerOpen(false)}
        items={archivedChatsItems}
        mode={archivedChatsMode}
        onOpenChat={onOpenArchivedChat}
        onRestoreChat={onRestoreArchivedChat}
        onDeleteChat={onDeleteArchivedChat}
      />
    </section>
  );
}
