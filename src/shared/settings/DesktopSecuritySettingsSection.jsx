import React, { useEffect, useMemo, useState } from "react";
import "./desktop-settings-workspace.css";

export default function DesktopSecuritySettingsSection({
  capabilities,
  onAddPasskey,
  onRemovePasskey,
  onChangePassword,
  onLogoutCurrentDevice,
  onLogoutAllDevices,
}) {
  const [trustedDevices, setTrustedDevices] = useState([]);
  const [mfaEnabled, setMfaEnabled] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("elimulink_trusted_devices_preview");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setTrustedDevices(parsed);
      } else {
        const defaultDevices = [
          {
            id: "current-device",
            label: "Current browser",
            meta: "This device / Active now",
          },
        ];
        setTrustedDevices(defaultDevices);
        window.localStorage.setItem(
          "elimulink_trusted_devices_preview",
          JSON.stringify(defaultDevices),
        );
      }
    } catch {
      setTrustedDevices([
        {
          id: "current-device",
          label: "Current browser",
          meta: "This device / Active now",
        },
      ]);
    }

    try {
      const saved = window.localStorage.getItem("elimulink_mfa_enabled_preview");
      setMfaEnabled(saved === "true");
    } catch {
      setMfaEnabled(false);
    }
  }, []);

  const hasPasskey = useMemo(() => {
    if (!capabilities) return false;
    return Boolean(capabilities?.passkeyRegistered || capabilities?.hasPasskey || capabilities?.passkey);
  }, [capabilities]);

  const availableMethods = useMemo(() => {
    if (!capabilities) return [];
    const methods = [];
    if (capabilities?.password) methods.push("Password");
    if (capabilities?.provider || capabilities?.federatedProvider) methods.push("Provider sign-in");
    if (capabilities?.passkey || capabilities?.passkeyRegistered || capabilities?.hasPasskey) {
      methods.push("Passkey");
    }
    return methods;
  }, [capabilities]);

  const handleToggleMfa = () => {
    const next = !mfaEnabled;
    setMfaEnabled(next);
    try {
      window.localStorage.setItem("elimulink_mfa_enabled_preview", String(next));
    } catch {
      // ignore local preview storage failures
    }
  };

  return (
    <section className="dsw-section">
      <div className="dsw-section-header">
        <h2 className="dsw-section-title">Security</h2>
        <p className="dsw-section-description">
          Manage password, passkeys, trusted devices, and sign-in protection.
        </p>
      </div>

      <div className="dsw-card">
        <div className="dsw-status-note">
          <span className="dsw-status-chip">Live</span>
          Password, passkey, and current-device logout reuse the existing secure unlock flow.
        </div>

        <div className="dsw-row">
          <div>
            <div className="dsw-row-label">Password</div>
            <div className="dsw-row-help">Change password through your email verification flow.</div>
          </div>
          <button type="button" className="dsw-button" onClick={onChangePassword}>
            Change password
          </button>
        </div>

        <div className="dsw-divider" />

        <div className="dsw-row">
          <div>
            <div className="dsw-row-label">Passkey</div>
            <div className="dsw-row-help">Add a passkey and let the user choose where to save it.</div>
          </div>

          {hasPasskey ? (
            <button
              type="button"
              className="dsw-button dsw-button-danger-outline"
              onClick={onRemovePasskey}
            >
              Remove passkey
            </button>
          ) : (
            <button
              type="button"
              className="dsw-button dsw-button-primary"
              onClick={onAddPasskey}
            >
              Add passkey
            </button>
          )}
        </div>

        <div className="dsw-divider" />

        <div className="dsw-row dsw-row-top">
          <div>
            <div className="dsw-row-label">Available sign-in methods</div>
            <div className="dsw-row-help">Current sign-in methods available on this account.</div>
          </div>
          <div className="dsw-chip-list">
            {availableMethods.length ? (
              availableMethods.map((method) => (
                <span key={method} className="dsw-chip">
                  {method}
                </span>
              ))
            ) : (
              <span className="dsw-chip dsw-chip-muted">No method info</span>
            )}
          </div>
        </div>
      </div>

      <div className="dsw-card">
        <div className="dsw-status-note is-preview">
          <span className="dsw-status-chip">Preview</span>
          Trusted device history and MFA remain staged, but the layout is now stable.
        </div>

        <div className="dsw-row">
          <div>
            <div className="dsw-row-label">Trusted devices</div>
            <div className="dsw-row-help">Devices that have recently accessed this account.</div>
          </div>
        </div>

        <div className="dsw-device-list">
          {trustedDevices.map((device) => (
            <div key={device.id} className="dsw-device-item">
              <div className="dsw-device-title">{device.label}</div>
              <div className="dsw-device-meta">{device.meta}</div>
            </div>
          ))}
        </div>

        <div className="dsw-divider" />

        <div className="dsw-row">
          <div>
            <div className="dsw-row-label">Log out of this device</div>
            <div className="dsw-row-help">End the current browser session.</div>
          </div>
          <button type="button" className="dsw-button" onClick={onLogoutCurrentDevice}>
            Log out
          </button>
        </div>

        <div className="dsw-divider" />

        <div className="dsw-row">
          <div>
            <div className="dsw-row-label">Log out of all devices</div>
            <div className="dsw-row-help">Sign out all active sessions across devices.</div>
          </div>
          <button
            type="button"
            className="dsw-button dsw-button-danger-outline"
            onClick={onLogoutAllDevices}
          >
            Log out all
          </button>
        </div>
      </div>

      <div className="dsw-card">
        <div className="dsw-row">
          <div>
            <div className="dsw-row-label">MFA</div>
            <div className="dsw-row-help">
              Placeholder-safe for now. The setup flow can be connected later without changing this layout.
            </div>
          </div>

          <label className="dsw-switch">
            <input type="checkbox" checked={mfaEnabled} onChange={handleToggleMfa} />
            <span className="dsw-switch-track" />
          </label>
        </div>
      </div>
    </section>
  );
}
