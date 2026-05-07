import React, { useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  OAuthProvider,
  getAdditionalUserInfo,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { ArrowRight, Building2, Eye, EyeOff, KeyRound, ShieldCheck } from "lucide-react";
import { auth } from "../lib/firebase";
import {
  resolveAppName,
  verifyFamilySession,
} from "../auth/familySession";
import "../styles/institution-auth.css";

function sanitizeReturnTo(returnToRaw, mode = "institution", isAuthenticated = false) {
  const fallback = `/${mode}`;
  const raw = String(returnToRaw || "").trim();
  if (!raw || raw === "/" || raw == "null" || raw === "undefined") return fallback;

  let value = raw;
  try {
    value = decodeURIComponent(raw);
  } catch (_) {
    value = raw;
  }

  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//")) return fallback;
  if (value.includes("://")) return fallback;
  if (value.startsWith("/login")) return fallback;
  if (value.includes("/onboarding?returnTo=")) return fallback;
  if (!isAuthenticated && value == "/onboarding") return fallback;
  return value;
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="inst-auth-social-icon">
      <path fill="#4285F4" d="M21.6 12.23c0-.78-.07-1.53-.2-2.25H12v4.26h5.4a4.62 4.62 0 0 1-2 3.03v2.52h3.24c1.9-1.75 2.96-4.34 2.96-7.56Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.44l-3.24-2.52c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.58-4.12H3.07v2.6A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.42 13.88A6 6 0 0 1 6.1 12c0-.65.11-1.28.32-1.88v-2.6H3.07A10 10 0 0 0 2 12c0 1.61.39 3.13 1.07 4.48l3.35-2.6Z" />
      <path fill="#EA4335" d="M12 5.98c1.47 0 2.79.5 3.83 1.49l2.87-2.87C16.95 2.97 14.7 2 12 2A10 10 0 0 0 3.07 7.52l3.35 2.6C7.2 7.74 9.4 5.98 12 5.98Z" />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="inst-auth-social-icon">
      <path fill="#F25022" d="M2 2h9.5v9.5H2z" />
      <path fill="#7FBA00" d="M12.5 2H22v9.5h-9.5z" />
      <path fill="#00A4EF" d="M2 12.5h9.5V22H2z" />
      <path fill="#FFB900" d="M12.5 12.5H22V22h-9.5z" />
    </svg>
  );
}

export default function InstitutionLogin({ hostMode = "institution", user, onAuthSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [pendingMessage, setPendingMessage] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [returnTo, setReturnTo] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const message = params.get("message");
    const incomingReturnTo = params.get("returnTo") || "";
    if (message) setNotice(message);
    setReturnTo(sanitizeReturnTo(incomingReturnTo, hostMode, Boolean(user && !user.isAnonymous)));
  }, [hostMode, user]);

  useEffect(() => {
    const root = document.getElementById("root");
    const desktopLockQuery = window.matchMedia("(min-width: 981px)");

    const applyViewportLock = () => {
      const shouldLock = desktopLockQuery.matches;
      document.documentElement.classList.toggle("login-viewport-lock", shouldLock);
      document.body.classList.toggle("login-viewport-lock", shouldLock);
      root?.classList.toggle("login-viewport-lock", shouldLock);
    };

    applyViewportLock();

    const handleChange = () => applyViewportLock();
    if (desktopLockQuery.addEventListener) {
      desktopLockQuery.addEventListener("change", handleChange);
    } else if (desktopLockQuery.addListener) {
      desktopLockQuery.addListener(handleChange);
    }

    return () => {
      if (desktopLockQuery.removeEventListener) {
        desktopLockQuery.removeEventListener("change", handleChange);
      } else if (desktopLockQuery.removeListener) {
        desktopLockQuery.removeListener(handleChange);
      }
      document.documentElement.classList.remove("login-viewport-lock");
      document.body.classList.remove("login-viewport-lock");
      root?.classList.remove("login-viewport-lock");
    };
  }, []);

  const normalizeAuthError = (err) => {
    const code = String(err?.code || "");
    const message = String(err?.message || "");
    if (code.includes("auth/operation-not-allowed")) return "Firebase Auth provider disabled. Enable the selected provider in Firebase Console.";
    if (code.includes("auth/popup-closed-by-user")) return "Sign-in was cancelled.";
    if (code.includes("auth/invalid-phone-number")) return "Enter a valid phone number in international format, for example +2547XXXXXXXX.";
    if (code.includes("auth/missing-phone-number")) return "Enter your phone number first.";
    if (code.includes("auth/invalid-verification-code")) return "The verification code is invalid. Try again.";
    if (code.includes("auth/code-expired")) return "The verification code expired. Request a new one.";
    if (/AI family access lookup failed|workspace verification|verify app access/i.test(message)) {
      return "We couldn't verify your institution access yet. Please retry, or use Staff / admin entry if you have an activation key.";
    }
    return message || "Authentication failed.";
  };

  const verifyAccess = async (firebaseUser, { isNewUser = false } = {}) => {
    const appName = resolveAppName(hostMode);
    const session = await verifyFamilySession(firebaseUser, appName, {
      timeoutMs: isNewUser ? 10000 : 20000,
      networkRetryCount: isNewUser ? 0 : 1,
      networkRetryDelayMs: 1200,
      forceRefreshToken: false,
      isNewUser,
    });
    if (!session?.allowed) {
      throw new Error("You do not have access to this workspace.");
    }
    return session.profile;
  };

  const handleEmailAuth = async (event) => {
    event.preventDefault();
    setPending(true);
    setPendingMessage("Signing in...");
    setError("");
    setNotice("");
    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      setPendingMessage("Verifying institution access...");
      const synced = await verifyAccess(credential.user);
      await onAuthSuccess(synced, returnTo);
    } catch (err) {
      setError(normalizeAuthError(err));
    } finally {
      setPending(false);
      setPendingMessage("");
    }
  };

  const handleProviderPopup = async (provider) => {
    setPending(true);
    setPendingMessage("Opening secure sign-in...");
    setError("");
    setNotice("");
    try {
      const credential = await signInWithPopup(auth, provider);
      const info = getAdditionalUserInfo(credential);
      setPendingMessage("Verifying institution access...");
      const synced = await verifyAccess(credential.user, { isNewUser: info?.isNewUser === true });
      await onAuthSuccess(synced, returnTo);
    } catch (err) {
      setError(normalizeAuthError(err));
    } finally {
      setPending(false);
      setPendingMessage("");
    }
  };

  return (
    <div className="inst-auth-page">
      <section className="inst-auth-brand">
        <div className="inst-auth-brand-inner">
          <div className="inst-auth-logo-row">
            <img src="/favicon.png" alt="ElimuLink" className="h-11 w-auto object-contain shrink-0" />
            <div>
              <div className="inst-auth-brand-name">ElimuLink</div>
              <div className="inst-auth-brand-sub">Institution Platform</div>
            </div>
          </div>

          <div className="inst-auth-eyebrow">CONNECTED ACADEMIC WORKSPACE</div>
          <h1 className="inst-auth-title">One secure entry point for institutional operations.</h1>
          <p className="inst-auth-subtitle">
            ElimuLink brings identity, communication, AI tools, and academic workflow into one polished workspace for modern institutions.
          </p>

          <div className="inst-auth-trust-grid">
            <div className="inst-auth-trust-card">
              <Building2 className="inst-auth-trust-icon" />
              <div>
                <h3>Institution-ready</h3>
                <p>Designed for staff, administrators, and institutional teams.</p>
              </div>
            </div>

            <div className="inst-auth-trust-card">
              <ShieldCheck className="inst-auth-trust-icon" />
              <div>
                <h3>Secure access</h3>
                <p>Trusted sign-in across identity, operations, and AI workflows.</p>
              </div>
            </div>
          </div>

          <div className="inst-auth-footer-note">Authenticated access for institution.elimulink.co.ke</div>
        </div>
      </section>

      <section className="inst-auth-panel">
        <div className="inst-auth-card">
          <div className="inst-auth-card-top">
            <div>
              <h2>Institution sign-in</h2>
              <p>Use an approved institution account. New staff should activate their access first.</p>
            </div>
            <span className="inst-auth-chip">Secure sign-in</span>
          </div>

          {notice ? <div className="inst-auth-notice">{notice}</div> : null}
          {error ? <div className="inst-auth-error">{error}</div> : null}

          <form className="inst-auth-form compact-form" onSubmit={handleEmailAuth}>
            <label className="inst-auth-field">
              <span>Email address</span>
              <input type="email" placeholder="Enter your work email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>

            <label className="inst-auth-field">
              <span>Password</span>
              <div className="inst-auth-password-wrap">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="inst-auth-password-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            <button className="inst-auth-primary compact-primary" type="submit" disabled={pending}>
              <span>{pending ? pendingMessage || "Please wait..." : "Sign in to institution"}</span>
              {!pending ? <ArrowRight size={16} /> : null}
            </button>
          </form>

          <div className="inst-auth-divider inst-auth-divider-tight">
            <span>APPROVED SSO</span>
          </div>

          <div className="inst-auth-socials compact-two-col">
            <button type="button" className="inst-auth-social-btn" onClick={() => handleProviderPopup(new GoogleAuthProvider())} disabled={pending}>
              <GoogleIcon />
              <span>Google</span>
            </button>
            <button
              type="button"
              className="inst-auth-social-btn"
              onClick={() => {
                const provider = new OAuthProvider("microsoft.com");
                provider.setCustomParameters({ prompt: "select_account" });
                handleProviderPopup(provider);
              }}
              disabled={pending}
            >
              <MicrosoftIcon />
              <span>Microsoft</span>
            </button>
          </div>

          <button
            type="button"
            className="inst-auth-staff-cta inst-auth-activation-cta"
            onClick={() => window.location.replace("/institution/activate")}
          >
            <span className="inst-auth-staff-icon">
              <KeyRound size={18} />
            </span>
            <span className="inst-auth-staff-copy">
              <strong>New staff or admin?</strong>
              <small>Activate access or sign in with your department key</small>
            </span>
            <ArrowRight size={17} />
          </button>

          <div className="inst-auth-links compact-links">
            <button
              type="button"
              className="inst-auth-link-button"
              onClick={async () => {
                setError("");
                setNotice("");
                try {
                  if (!email.trim()) throw new Error("Enter your email first.");
                  await sendPasswordResetEmail(auth, email.trim());
                  setNotice("Password reset email sent. Check your inbox.");
                } catch (err) {
                  setError(normalizeAuthError(err));
                }
              }}
            >
              Forgot password?
            </button>
            <button type="button" className="inst-auth-link-button" onClick={() => window.location.replace("/login?returnTo=%2Fpublic")}>
              Public portal
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
