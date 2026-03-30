import React, { useEffect, useMemo, useState } from "react";
import {
  getStoredPreferences,
  getStoredProfile,
  saveStoredPreferences,
  saveStoredProfile,
} from "../../lib/userSettings";
import DesktopEmailChangeManager from "./DesktopEmailChangeManager.jsx";
import "./desktop-settings-workspace.css";

function getInitials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (!parts.length) return "U";
  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
}

export default function DesktopAccountSettingsSection({
  user,
  currentPlan = "Free",
  onChangeEmail,
  onManageSubscription,
  onManagePayment,
  onDeleteAccount,
}) {
  const uid = user?.uid || null;
  const [profile, setProfile] = useState(() =>
    getStoredProfile(
      {
        name: user?.name || user?.displayName || "Scholar",
        email: user?.email || "scholar@elimulink.demo",
        publicLinks: "",
        publicDomain: "",
      },
      uid,
    ),
  );
  const [feedbackEmailsEnabled, setFeedbackEmailsEnabled] = useState(() => {
    const prefs = getStoredPreferences({ feedbackEmailsEnabled: true }, uid);
    return prefs.feedbackEmailsEnabled !== false;
  });
  const [saveMessage, setSaveMessage] = useState("");
  const [isEmailManagerOpen, setIsEmailManagerOpen] = useState(false);

  useEffect(() => {
    setProfile((current) =>
      getStoredProfile(
        {
          ...current,
          name: user?.name || user?.displayName || current.name || "Scholar",
          email: user?.email || current.email || "scholar@elimulink.demo",
        },
        uid,
      ),
    );
  }, [uid, user?.displayName, user?.email, user?.name]);

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

  const profilePreviewName = useMemo(
    () => String(profile.name || user?.name || user?.displayName || "Scholar").trim() || "Scholar",
    [profile.name, user?.displayName, user?.name],
  );
  const profilePreviewEmail = String(profile.email || user?.email || "scholar@elimulink.demo").trim();

  function handleNameChange(event) {
    const value = event.target.value;
    setProfile((current) => ({ ...current, name: value }));
    setSaveMessage("Name updated for this account profile.");
  }

  function handlePublicLinksChange(event) {
    const value = event.target.value;
    setProfile((current) => ({ ...current, publicLinks: value }));
    setSaveMessage("Public profile preview saved locally.");
  }

  function handlePublicDomainChange(event) {
    const value = event.target.value;
    setProfile((current) => ({ ...current, publicDomain: value }));
    setSaveMessage("Domain preference saved locally.");
  }

  return (
    <section className="dsw-section">
      <div className="dsw-section-header">
        <h2 className="dsw-section-title">Account</h2>
        <p className="dsw-section-description">
          Manage your profile, email, plan details, and account-level preferences.
        </p>
      </div>

      <div className="dsw-card">
        <div className="dsw-row dsw-row-top">
          <div className="dsw-account-identity">
            <div className="dsw-account-avatar">{getInitials(profilePreviewName)}</div>
            <div>
              <div className="dsw-row-label">Name</div>
              <div className="dsw-row-help">Your main profile name in the workspace.</div>
            </div>
          </div>
        </div>

        <div className="dsw-account-fields">
          <label className="dsw-field">
            <span className="dsw-field-label">Full name</span>
            <input
              type="text"
              className="dsw-input"
              value={profile.name || ""}
              onChange={handleNameChange}
              placeholder="Your full name"
            />
          </label>
        </div>
      </div>

      <div className="dsw-card">
        <div className="dsw-row">
          <div>
            <div className="dsw-row-label">Email</div>
            <div className="dsw-row-help">Current email on this account. Email change stays on the safe verification flow.</div>
          </div>
          <button type="button" className="dsw-button" onClick={() => setIsEmailManagerOpen(true)}>
            Change email
          </button>
        </div>

        <div className="dsw-divider" />

        <div className="dsw-static-value">{profilePreviewEmail}</div>
      </div>

      <div className="dsw-card">
        <div className="dsw-row">
          <div>
            <div className="dsw-row-label">Subscription / Plan</div>
            <div className="dsw-row-help">View your current plan and continue to billing when that flow is connected.</div>
          </div>
          <button type="button" className="dsw-button dsw-button-primary" onClick={onManageSubscription}>
            Manage subscription
          </button>
        </div>

        <div className="dsw-divider" />

        <div className="dsw-static-value">Current plan: {currentPlan}</div>
      </div>

      <div className="dsw-card">
        <div className="dsw-row">
          <div>
            <div className="dsw-row-label">Payment</div>
            <div className="dsw-row-help">Open billing and payment management when the billing flow is connected.</div>
          </div>
          <button type="button" className="dsw-button" onClick={onManagePayment}>
            Manage payment
          </button>
        </div>
      </div>

      <div className="dsw-card">
        <div className="dsw-row">
          <div>
            <div className="dsw-row-label">Delete account</div>
            <div className="dsw-row-help">Protected destructive action. Kept placeholder-safe until account deletion flow is ready.</div>
          </div>
          <button type="button" className="dsw-button dsw-button-danger-outline" onClick={onDeleteAccount}>
            Delete account
          </button>
        </div>
      </div>

      <div className="dsw-card">
        <div className="dsw-row dsw-row-top">
          <div>
            <div className="dsw-row-label">Public profile / builder profile</div>
            <div className="dsw-row-help">Preview your public profile identity and reserve profile options for the next pass.</div>
          </div>
        </div>

        <div className="dsw-profile-preview">
          <div className="dsw-profile-preview-name">{profilePreviewName}</div>
          <div className="dsw-profile-preview-meta">{profilePreviewEmail}</div>
          <div className="dsw-profile-preview-meta">
            {profile.publicDomain ? `Domain: ${profile.publicDomain}` : "Domain not set"}
          </div>
        </div>

        <div className="dsw-account-fields">
          <label className="dsw-field">
            <span className="dsw-field-label">Links</span>
            <input
              type="text"
              className="dsw-input"
              value={profile.publicLinks || ""}
              onChange={handlePublicLinksChange}
              placeholder="https://your-link.example"
            />
          </label>

          <label className="dsw-field">
            <span className="dsw-field-label">Domain / public profile option</span>
            <input
              type="text"
              className="dsw-input"
              value={profile.publicDomain || ""}
              onChange={handlePublicDomainChange}
              placeholder="your-domain"
            />
          </label>
        </div>
      </div>

      <div className="dsw-card">
        <div className="dsw-row">
          <div>
            <div className="dsw-row-label">Feedback emails</div>
            <div className="dsw-row-help">Receive product feedback and improvement emails for this account.</div>
          </div>

          <label className="dsw-switch">
            <input
              type="checkbox"
              checked={feedbackEmailsEnabled}
              onChange={() => setFeedbackEmailsEnabled((current) => !current)}
            />
            <span className="dsw-switch-track" />
          </label>
        </div>
      </div>

      {saveMessage ? <div className="dsw-inline-note">{saveMessage}</div> : null}

      <DesktopEmailChangeManager
        open={isEmailManagerOpen}
        onClose={() => setIsEmailManagerOpen(false)}
        currentEmail={profilePreviewEmail}
        onContinue={async ({ currentEmail, newEmail }) => {
          const result = await onChangeEmail?.({ currentEmail, newEmail });
          return (
            result || {
              message:
                "Verification-ready desktop flow prepared. Connect the real send-verification step here when the account email backend is available.",
            }
          );
        }}
      />
    </section>
  );
}
