import React, { useEffect, useMemo, useState } from "react";
import { getStoredPreferences, saveStoredPreferences } from "../../lib/userSettings";
import {
  fetchInstitutionNotificationPreferences,
  saveInstitutionNotificationPreferences,
} from "../../lib/notificationPreferencesApi";
import "./desktop-settings-workspace.css";

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
      email: row.channels.includes("email") ? false : false,
    };
    return accumulator;
  }, {});
}

export default function DesktopNotificationsSettingsSection({ user }) {
  const uid = user?.uid || null;
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

  const muteNotifications = !!prefs.muteNotifications;
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

  const enabledCount = useMemo(
    () =>
      NOTIFICATION_ROWS.reduce((count, row) => {
        const current = notificationDelivery?.[row.id] || {};
        return count + (current.push ? 1 : 0) + (current.email ? 1 : 0);
      }, 0),
    [notificationDelivery],
  );

  function handleToggleMute() {
    const nextPrefs = {
      ...prefs,
      muteNotifications: !muteNotifications,
      notificationDelivery,
    };
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

  function handleChannelToggle(rowId, channel) {
    const nextDelivery = {
      ...notificationDelivery,
      [rowId]: {
        ...notificationDelivery?.[rowId],
        [channel]: !notificationDelivery?.[rowId]?.[channel],
      },
    };
    const nextPrefs = {
      ...prefs,
      notificationDelivery: nextDelivery,
    };
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

  return (
    <section className="dsw-section">
      <div className="dsw-section-header">
        <h2 className="dsw-section-title">Notifications</h2>
        <p className="dsw-section-description">
          Choose how updates reach you across workspace activity, academic events, and system alerts.
        </p>
      </div>

      <div className="dsw-card">
        <div className="dsw-status-note is-preview">
          <span className="dsw-status-chip">Mixed</span>
          Mute notifications and the delivery matrix now sync through your shared Institution notification preferences. {syncMessage || "Device fallback remains available if the network is unavailable."}
        </div>
        <div className="dsw-row">
          <div>
            <div className="dsw-row-label">Mute notifications</div>
            <div className="dsw-row-help">
              Reuses the existing notification mute preference already used in the current app surfaces.
            </div>
          </div>

          <label className="dsw-switch">
            <input type="checkbox" checked={muteNotifications} onChange={handleToggleMute} />
            <span className="dsw-switch-track" />
          </label>
        </div>

        <div className="dsw-divider" />

        <div className="dsw-row">
          <div className="dsw-row-help">
            {muteNotifications
              ? "Notifications are currently muted from the existing shared preference."
              : `${enabledCount} delivery channels enabled across your notification categories.`}
          </div>
        </div>
      </div>

      <div className="dsw-card">
        <div className="dsw-notification-grid">
          {NOTIFICATION_ROWS.map((row) => {
            const current = notificationDelivery?.[row.id] || {};
            return (
              <div key={row.id} className="dsw-notification-row">
                <div>
                  <div className="dsw-row-label">{row.label}</div>
                </div>

                <div className="dsw-notification-actions">
                  {row.channels.includes("push") ? (
                    <button
                      type="button"
                      className={`dsw-segment-button ${current.push ? "is-active" : ""}`}
                      onClick={() => handleChannelToggle(row.id, "push")}
                      disabled={muteNotifications}
                    >
                      Push
                    </button>
                  ) : null}

                  {row.channels.includes("email") ? (
                    <button
                      type="button"
                      className={`dsw-segment-button ${current.email ? "is-active" : ""}`}
                      onClick={() => handleChannelToggle(row.id, "email")}
                      disabled={muteNotifications}
                    >
                      Email
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
