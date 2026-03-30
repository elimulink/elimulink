import React, { useMemo, useState } from "react";
import { QrCode, ShieldCheck, Smartphone, X } from "lucide-react";
import "./desktop-settings-workspace.css";

function looksLikeOtpCode(value) {
  return /^\d{6}$/.test(String(value || "").trim());
}

export default function DesktopMfaSetupManager({ open, onClose }) {
  const [verificationCode, setVerificationCode] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canVerify = useMemo(() => looksLikeOtpCode(verificationCode), [verificationCode]);

  if (!open) return null;

  async function handleVerify() {
    if (!canVerify || submitting) return;
    setSubmitting(true);
    setMessage("");
    try {
      await Promise.resolve();
      setMessage(
        "MFA setup UI is ready, but enrollment is still waiting for real backend/authenticator wiring. No MFA enrollment was completed.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="dsw-manager-overlay" role="dialog" aria-modal="true" aria-label="Set up MFA">
      <button
        type="button"
        className="dsw-manager-backdrop"
        aria-label="Close MFA setup manager"
        onClick={onClose}
      />

      <div className="dsw-manager-panel dsw-manager-panel-narrow">
        <div className="dsw-manager-header">
          <div>
            <div className="dsw-manager-title-row">
              <h3 className="dsw-manager-title">Set up MFA</h3>
              <span className="dsw-status-chip">Verification</span>
            </div>
            <p className="dsw-manager-copy">
              Add another sign-in factor using an authenticator app. This setup flow is ready for real enrollment wiring, but it
              does not fake a completed MFA connection.
            </p>
          </div>

          <button type="button" className="dsw-manager-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="dsw-card">
          <div className="dsw-status-note is-preview">
            <span className="dsw-status-chip">Preview</span>
            Passkeys and secure unlock stay separate. This MFA panel prepares the enrollment UX without changing your current auth setup.
          </div>

          <div className="dsw-setup-step">
            <div className="dsw-setup-step-icon is-blue">
              <Smartphone size={18} />
            </div>
            <div>
              <div className="dsw-row-label">Step 1: Open your authenticator app</div>
              <div className="dsw-row-help">
                Use Google Authenticator, Microsoft Authenticator, Authy, or another TOTP-compatible app.
              </div>
            </div>
          </div>

          <div className="dsw-divider" />

          <div className="dsw-setup-step dsw-setup-step-top">
            <div className="dsw-setup-step-icon is-slate">
              <QrCode size={18} />
            </div>
            <div className="dsw-setup-step-copy">
              <div className="dsw-row-label">Step 2: Scan QR code</div>
              <div className="dsw-row-help">
                The QR code area is reserved for the real MFA provisioning secret when the backend enrollment flow is connected.
              </div>
              <div className="dsw-qr-placeholder">
                <div className="dsw-qr-placeholder-inner">
                  <QrCode size={32} />
                  <span>QR code placeholder</span>
                </div>
              </div>
            </div>
          </div>

          <div className="dsw-divider" />

          <div className="dsw-setup-step dsw-setup-step-top">
            <div className="dsw-setup-step-icon is-emerald">
              <ShieldCheck size={18} />
            </div>
            <div className="dsw-setup-step-copy">
              <div className="dsw-row-label">Step 3: Enter verification code</div>
              <div className="dsw-row-help">
                Enter the 6-digit code from your authenticator app to complete enrollment once this flow is fully wired.
              </div>
              <label className="dsw-field">
                <span className="dsw-field-label">Verification code</span>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  className="dsw-input"
                  value={verificationCode}
                  onChange={(event) => setVerificationCode(event.target.value.replace(/\D+/g, "").slice(0, 6))}
                  placeholder="123456"
                />
              </label>
            </div>
          </div>

          <div className="dsw-manager-actions-row">
            <button type="button" className="dsw-button" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="dsw-button dsw-button-primary"
              disabled={!canVerify || submitting}
              onClick={handleVerify}
            >
              <ShieldCheck size={14} />
              {submitting ? "Checking..." : "Verify"}
            </button>
          </div>
        </div>

        {message ? <div className="dsw-inline-note">{message}</div> : null}
      </div>
    </div>
  );
}
