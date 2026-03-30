import React, { useEffect, useState } from "react";
import { getDesktopSettingsPreviewState, saveDesktopSettingsPreviewState } from "./desktopSettingsPreviewStore";
import "./desktop-settings-workspace.css";

export default function DesktopParentalControlsSettingsSection({ user }) {
  const uid = user?.uid || null;
  const [prefs, setPrefs] = useState(() => {
    const stored = getDesktopSettingsPreviewState(
      "parentalControls",
      {
        parentalSupervisedAccessEnabled: true,
        parentalVisibilityControlsEnabled: true,
        parentalMonitoringEnabled: false,
        parentalSafeguardRulesEnabled: true,
      },
      uid,
    );

    return {
      supervisedAccessEnabled: stored.parentalSupervisedAccessEnabled !== false,
      visibilityControlsEnabled: stored.parentalVisibilityControlsEnabled !== false,
      monitoringEnabled: !!stored.parentalMonitoringEnabled,
      safeguardRulesEnabled: stored.parentalSafeguardRulesEnabled !== false,
    };
  });
  const [actionMessage, setActionMessage] = useState("");

  useEffect(() => {
    saveDesktopSettingsPreviewState(
      "parentalControls",
      {
      parentalSupervisedAccessEnabled: prefs.supervisedAccessEnabled,
      parentalVisibilityControlsEnabled: prefs.visibilityControlsEnabled,
      parentalMonitoringEnabled: prefs.monitoringEnabled,
      parentalSafeguardRulesEnabled: prefs.safeguardRulesEnabled,
      },
      uid,
    );
  }, [prefs, uid]);

  function showPlaceholder(message) {
    setActionMessage(message);
  }

  return (
    <section className="dsw-section">
      <div className="dsw-section-header">
        <h2 className="dsw-section-title">Parental controls</h2>
        <p className="dsw-section-description">
          Manage supervised access, family relationships, institution linking, and controlled visibility for supported accounts.
        </p>
      </div>

      <div className="dsw-card">
        <div className="dsw-status-note is-preview">
          <span className="dsw-status-chip">Preview</span>
          Relationship controls here are frontend only and saved separately from real account preferences.
        </div>
        <div className="dsw-action-list">
          <div className="dsw-action-row">
            <div>
              <div className="dsw-row-label">Add family member</div>
              <div className="dsw-row-help">Prepare family relationship setup for supervised access.</div>
            </div>
            <button
              type="button"
              className="dsw-button"
              onClick={() => showPlaceholder("Family member linking will be connected here later.")}
            >
              Add family member
            </button>
          </div>

          <div className="dsw-action-row">
            <div>
              <div className="dsw-row-label">Link institution account</div>
              <div className="dsw-row-help">Reserve the relationship between a supervised profile and an institution account.</div>
            </div>
            <button
              type="button"
              className="dsw-button"
              onClick={() => showPlaceholder("Institution account linking will open here later.")}
            >
              Link institution account
            </button>
          </div>

          <div className="dsw-action-row">
            <div>
              <div className="dsw-row-label">Assign guardian / parent</div>
              <div className="dsw-row-help">Choose who can supervise the linked learner profile.</div>
            </div>
            <button
              type="button"
              className="dsw-button"
              onClick={() => showPlaceholder("Guardian assignment will be connected here later.")}
            >
              Assign guardian / parent
            </button>
          </div>

          <div className="dsw-action-row">
            <div>
              <div className="dsw-row-label">Add student under supervision</div>
              <div className="dsw-row-help">Reserve the supervised student relationship for family or institution oversight.</div>
            </div>
            <button
              type="button"
              className="dsw-button dsw-button-primary"
              onClick={() => showPlaceholder("Supervised student setup will be connected here later.")}
            >
              Add student under supervision
            </button>
          </div>
        </div>
      </div>

      <div className="dsw-card">
        <div className="dsw-row">
          <div>
            <div className="dsw-row-label">Supervised access</div>
            <div className="dsw-row-help">Enable controlled access behavior for supervised accounts.</div>
          </div>
          <label className="dsw-switch">
            <input
              type="checkbox"
              checked={prefs.supervisedAccessEnabled}
              onChange={() =>
                setPrefs((current) => ({
                  ...current,
                  supervisedAccessEnabled: !current.supervisedAccessEnabled,
                }))
              }
            />
            <span className="dsw-switch-track" />
          </label>
        </div>

        <div className="dsw-divider" />

        <div className="dsw-row">
          <div>
            <div className="dsw-row-label">Visibility controls</div>
            <div className="dsw-row-help">Prepare visibility restrictions for linked family or institution relationships.</div>
          </div>
          <label className="dsw-switch">
            <input
              type="checkbox"
              checked={prefs.visibilityControlsEnabled}
              onChange={() =>
                setPrefs((current) => ({
                  ...current,
                  visibilityControlsEnabled: !current.visibilityControlsEnabled,
                }))
              }
            />
            <span className="dsw-switch-track" />
          </label>
        </div>
      </div>

      <div className="dsw-card">
        <div className="dsw-row">
          <div>
            <div className="dsw-row-label">Monitoring controls</div>
            <div className="dsw-row-help">Frontend placeholder for future oversight and monitoring rules.</div>
          </div>
          <label className="dsw-switch">
            <input
              type="checkbox"
              checked={prefs.monitoringEnabled}
              onChange={() =>
                setPrefs((current) => ({
                  ...current,
                  monitoringEnabled: !current.monitoringEnabled,
                }))
              }
            />
            <span className="dsw-switch-track" />
          </label>
        </div>

        <div className="dsw-divider" />

        <div className="dsw-row">
          <div>
            <div className="dsw-row-label">Safeguard rules</div>
            <div className="dsw-row-help">Prepare structured safeguard behavior for future supervision policies.</div>
          </div>
          <label className="dsw-switch">
            <input
              type="checkbox"
              checked={prefs.safeguardRulesEnabled}
              onChange={() =>
                setPrefs((current) => ({
                  ...current,
                  safeguardRulesEnabled: !current.safeguardRulesEnabled,
                }))
              }
            />
            <span className="dsw-switch-track" />
          </label>
        </div>
      </div>

      {actionMessage ? <div className="dsw-inline-note">{actionMessage}</div> : null}
    </section>
  );
}
