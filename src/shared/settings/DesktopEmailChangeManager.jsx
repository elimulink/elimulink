import React, { useMemo, useState } from "react";
import { Mail, ShieldCheck, X } from "lucide-react";
import "./desktop-settings-workspace.css";

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

export default function DesktopEmailChangeManager({
  open,
  onClose,
  currentEmail = "",
  onContinue,
}) {
  const [nextEmail, setNextEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const normalizedCurrentEmail = String(currentEmail || "").trim();
  const normalizedNextEmail = String(nextEmail || "").trim();
  const canContinue =
    isValidEmail(normalizedNextEmail) &&
    normalizedNextEmail.toLowerCase() !== normalizedCurrentEmail.toLowerCase();

  const helperText = useMemo(() => {
    if (!normalizedNextEmail) return "Enter the new email address you want to verify.";
    if (!isValidEmail(normalizedNextEmail)) return "Enter a valid email address.";
    if (normalizedNextEmail.toLowerCase() === normalizedCurrentEmail.toLowerCase()) {
      return "The new email must be different from the current one.";
    }
    return "A verification step is required before this email can replace the current account email.";
  }, [normalizedCurrentEmail, normalizedNextEmail]);

  if (!open) return null;

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
            "Verification-ready flow captured. Connect the real verification send step here when backend wiring is available.",
        ),
      );
    } catch (error) {
      setMessage(String(error?.message || "Unable to prepare the email verification flow right now."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="dsw-manager-overlay" role="dialog" aria-modal="true" aria-label="Change email">
      <button
        type="button"
        className="dsw-manager-backdrop"
        aria-label="Close email change manager"
        onClick={onClose}
      />

      <div className="dsw-manager-panel dsw-manager-panel-narrow">
        <div className="dsw-manager-header">
          <div>
            <div className="dsw-manager-title-row">
              <h3 className="dsw-manager-title">Change email</h3>
              <span className="dsw-status-chip">Verification</span>
            </div>
            <p className="dsw-manager-copy">
              Email changes stay behind a verification step. This panel prepares the request without directly mutating the account email.
            </p>
          </div>

          <button type="button" className="dsw-manager-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="dsw-card">
          <div className="dsw-row dsw-row-top">
            <div>
              <div className="dsw-row-label">Current email</div>
              <div className="dsw-row-help">This is the active email on the signed-in account.</div>
            </div>
            <div className="dsw-chip-list">
              <span className="dsw-chip">{normalizedCurrentEmail || "No email available"}</span>
            </div>
          </div>

          <div className="dsw-divider" />

          <label className="dsw-field">
            <span className="dsw-field-label">New email</span>
            <div className="dsw-input-with-icon">
              <Mail size={16} />
              <input
                type="email"
                className="dsw-input"
                value={nextEmail}
                onChange={(event) => setNextEmail(event.target.value)}
                placeholder="name@example.com"
                autoComplete="email"
              />
            </div>
          </label>

          <div className="dsw-status-note">
            <span className="dsw-status-chip">Ready</span>
            {helperText}
          </div>

          <div className="dsw-status-note is-preview">
            <span className="dsw-status-chip">Safe</span>
            This Step 2 flow does not directly change the email. It only prepares the verification step.
          </div>

          <div className="dsw-manager-actions-row">
            <button type="button" className="dsw-button" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="dsw-button dsw-button-primary"
              disabled={!canContinue || submitting}
              onClick={handleContinue}
            >
              <ShieldCheck size={14} />
              {submitting ? "Preparing..." : "Send verification"}
            </button>
          </div>
        </div>

        {message ? <div className="dsw-inline-note">{message}</div> : null}
      </div>
    </div>
  );
}
