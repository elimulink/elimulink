import React, { useMemo, useState } from "react";
import "../styles/secure-lock.css";

function getInitials(name, email) {
  const source = String(name || email || "EL").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function getFirstName(name, email) {
  const raw = String(name || "").trim();
  if (raw) return raw.split(/\s+/)[0];
  const fallback = String(email || "").trim();
  return fallback.includes("@") ? fallback.split("@")[0] : "there";
}

function getReasonCopy(reason, userName) {
  const greeting = `Welcome back, ${userName}`;
  if (reason === "post_signup") {
    return {
      eyebrow: "Secure Re-entry",
      title: greeting,
      subtitle: "Unlock your workspace securely",
    };
  }
  if (reason === "idle") {
    return {
      eyebrow: "Session Locked",
      title: greeting,
      subtitle: "Your workspace was locked for security. Unlock your workspace securely.",
    };
  }
  if (reason === "resume") {
    return {
      eyebrow: "Welcome Back",
      title: greeting,
      subtitle: "Unlock your workspace securely",
    };
  }
  return {
    eyebrow: "Secure Session",
    title: greeting,
    subtitle: "Unlock your workspace securely",
  };
}

function ElimuLinkLogo() {
  return (
    <div className="els-logo">
      <svg width="44" height="34" viewBox="0 0 44 34" fill="none" aria-hidden="true">
        <path d="M3 7.5C3 5.57 4.57 4 6.5 4H18.5C21.78 4 24.8 5.19 27 7.16C29.2 5.19 32.22 4 35.5 4H37.5C39.43 4 41 5.57 41 7.5V28.5C41 29.88 39.88 31 38.5 31H35.5C32.1 31 28.99 29.75 26.68 27.68L26.5 27.52L26.32 27.68C24.01 29.75 20.9 31 17.5 31H5.5C4.12 31 3 29.88 3 28.5V7.5Z" fill="url(#g1)" />
        <path d="M7 9.2C7 8.54 7.54 8 8.2 8H17.2C20.62 8 23.64 9.15 26 11.16V25.2C23.86 23.57 21.23 22.6 18.4 22.6H8.2C7.54 22.6 7 22.06 7 21.4V9.2Z" fill="#0F4F8A" fillOpacity="0.92" />
        <path d="M37 9.2C37 8.54 36.46 8 35.8 8H31.8C28.38 8 25.36 9.15 23 11.16V25.2C25.14 23.57 27.77 22.6 30.6 22.6H35.8C36.46 22.6 37 22.06 37 21.4V9.2Z" fill="#3DB8B2" />
        <defs>
          <linearGradient id="g1" x1="3" y1="4" x2="41" y2="31" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0C5EA8" />
            <stop offset="1" stopColor="#49C0B8" />
          </linearGradient>
        </defs>
      </svg>
      <span>ElimuLink</span>
    </div>
  );
}

function EyeIcon({ visible }) {
  return visible ? (
    <svg viewBox="0 0 24 24" className="els-eye" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
      <circle cx="12" cy="12" r="3.1" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="els-eye" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M3 3l18 18" />
      <path d="M10.58 10.58A2 2 0 0012 16a4 4 0 003.42-5.42" />
      <path d="M9.88 5.09A11.06 11.06 0 0112 5c6.5 0 10 7 10 7a17.6 17.6 0 01-3.06 3.8" />
      <path d="M6.11 6.11C3.57 8 2 12 2 12a17.98 17.98 0 004.56 5.19A9.83 9.83 0 0012 19c1.53 0 2.97-.33 4.27-.93" />
    </svg>
  );
}

function FingerprintIcon() {
  return (
    <svg viewBox="0 0 24 24" className="els-btn-icon" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3a6 6 0 00-6 6v2" />
      <path d="M18 11V9a6 6 0 00-12 0" />
      <path d="M8 13v-1a4 4 0 118 0v1" />
      <path d="M12 10a2 2 0 012 2v2.5a7.5 7.5 0 01-3 6" />
      <path d="M10 14v1.5A5.5 5.5 0 018 20" />
      <path d="M6 12.5v1A8.5 8.5 0 0010 21" />
      <path d="M16 13.5A9.5 9.5 0 0112 22" />
    </svg>
  );
}

function PasskeyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="els-btn-icon" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="8.5" cy="12" r="3.5" />
      <path d="M12 12h9" />
      <path d="M17 12v3" />
      <path d="M20 12v2" />
    </svg>
  );
}

export default function SecureLockScreen({
  user,
  profile,
  lockReason,
  capabilities,
  onUnlockPassword,
  onUnlockBiometric,
  onUnlockPasskey,
  onUnlockProvider,
  onForgotPassword,
  onSignOut,
}) {
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const displayName = String(profile?.username || profile?.displayName || profile?.name || user?.displayName || "").trim();
  const email = String(user?.email || profile?.email || "").trim();
  const firstName = getFirstName(displayName, email);
  const initials = getInitials(displayName, email);
  const copy = useMemo(() => getReasonCopy(lockReason, firstName), [firstName, lockReason]);
  const providerLabel = capabilities?.federatedLabel ? `Continue with ${capabilities.federatedLabel}` : "Continue with provider";

  async function runAction(kind, action) {
    setPending(kind);
    setError("");
    setNotice("");
    try {
      await action?.();
      if (kind === "forgot") {
        setNotice(`Password reset sent to ${email || "your account email"}.`);
      }
    } catch (err) {
      setError(String(err?.message || err || "Unlock failed."));
    } finally {
      setPending("");
    }
  }

  return (
    <div className="els-page">
      <div className="els-bg-panel" />

      <div className="els-desktop-shell">
        <div className="els-card">
          <div className="els-topbar">
            <ElimuLinkLogo />
          </div>

          <div className="els-status-row">
            <span className="els-status-pill">{copy.eyebrow}</span>
          </div>

          <div className="els-avatar">{initials}</div>
          <h1 className="els-title">{copy.title}</h1>
          <p className="els-subtitle">{copy.subtitle}</p>
          {displayName || email ? (
            <div className="els-identity">
              <span className="els-identity-name">{displayName || "ElimuLink User"}</span>
              {email ? <span className="els-identity-email">{email}</span> : null}
            </div>
          ) : null}

          {notice ? <div className="els-notice">{notice}</div> : null}
          {error ? <div className="els-error">{error}</div> : null}

          <form
            className="els-form"
            onSubmit={(event) => {
              event.preventDefault();
              runAction("password", async () => {
                await onUnlockPassword?.(password);
                setPassword("");
              });
            }}
          >
            {capabilities?.password ? (
              <div className="els-field-wrap">
                  <input
                    id="secure-lock-password"
                    className="els-input"
                    type={visible ? "text" : "password"}
                    placeholder="Enter password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="els-eye-btn"
                    aria-label={visible ? "Hide password" : "Show password"}
                    onClick={() => setVisible((value) => !value)}
                  >
                    <EyeIcon visible={visible} />
                  </button>
              </div>
            ) : null}

            {capabilities?.forgotPassword ? (
              <button
                type="button"
                className="els-link-btn"
                disabled={pending === "forgot"}
                onClick={() => runAction("forgot", onForgotPassword)}
              >
                {pending === "forgot" ? "Sending reset..." : "Forgot password?"}
              </button>
            ) : null}

            {capabilities?.password ? (
              <button type="submit" className="els-primary-btn" disabled={pending === "password"}>
                {pending === "password" ? "Unlocking..." : "Unlock"}
              </button>
            ) : null}

            {capabilities?.biometrics ? (
              <button
                type="button"
                className="els-secondary-btn"
                disabled={pending === "biometric"}
                onClick={() => runAction("biometric", onUnlockBiometric)}
              >
                <FingerprintIcon />
                <span>{pending === "biometric" ? "Checking..." : "Use biometrics"}</span>
              </button>
            ) : null}

            {capabilities?.passkey ? (
              <button
                type="button"
                className="els-secondary-btn els-passkey-btn"
                disabled={pending === "passkey"}
                onClick={() => runAction("passkey", onUnlockPasskey)}
              >
                <PasskeyIcon />
                <span>{pending === "passkey" ? "Checking..." : "Use passkey"}</span>
              </button>
            ) : null}

            {capabilities?.federatedProvider ? (
              <button
                type="button"
                className="els-secondary-btn"
                disabled={pending === "provider"}
                onClick={() => runAction("provider", onUnlockProvider)}
              >
                <span>{pending === "provider" ? "Checking..." : providerLabel}</span>
              </button>
            ) : null}

            {!capabilities?.password && !capabilities?.biometrics && !capabilities?.passkey && !capabilities?.federatedProvider ? (
              <div className="els-notice">This account needs a supported sign-in method before secure re-entry can unlock it on this device.</div>
            ) : null}

            <button type="button" className="els-switch-btn" onClick={onSignOut}>
              Sign in as another account
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
