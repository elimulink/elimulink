import React, { useEffect, useRef, useState } from "react";
import {
  GoogleAuthProvider,
  OAuthProvider,
  RecaptchaVerifier,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { ArrowRight, Building2, ShieldCheck, Smartphone } from "lucide-react";
import { auth } from "../lib/firebase";
import {
  resolveAppName,
  resolveFamilySessionReuse,
  verifyFamilySession,
} from "../auth/familySession";
import { requestPostSignupLock } from "../auth/secureLock";
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

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="inst-auth-social-icon inst-auth-social-icon-fill">
      <path d="M15.1 3.5c.8-1 1.3-2.3 1.2-3.5-1.2.1-2.6.8-3.5 1.8-.8.9-1.4 2.2-1.2 3.4 1.3.1 2.6-.7 3.5-1.7Zm4.4 14.8c-.6 1.4-.9 2-1.7 3.2-1.1 1.6-2.6 3.6-4.4 3.6-1.6 0-2-.9-4.2-.9s-2.7.9-4.3.9c-1.8 0-3.2-1.8-4.4-3.4C-2.9 16.8-.8 8.3 4.2 8.1c1.5 0 2.8 1 3.7 1 1 0 2.8-1.3 4.8-1.1.8 0 3 .3 4.4 2.4-3.9 2.1-3.3 7.6 2.4 9.9Z" />
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

function PhoneIcon() {
  return <Smartphone size={18} className="inst-auth-social-icon inst-auth-social-icon-fill" />;
}

export default function InstitutionLogin({ hostMode = "institution", profileDisplayName = "", user, onAuthSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState(profileDisplayName || "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [signup, setSignup] = useState(false);
  const [returnTo, setReturnTo] = useState("");
  const [phoneMode, setPhoneMode] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneConfirmation, setPhoneConfirmation] = useState(null);
  const recaptchaVerifierRef = useRef(null);
  const recaptchaContainerId = "institution-login-phone-recaptcha";

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
    return message || "Authentication failed.";
  };

  const verifyAccess = async (firebaseUser) => {
    const appName = resolveAppName(hostMode);
    const cachedReuse = resolveFamilySessionReuse(firebaseUser, appName);
    if (cachedReuse.allowed && cachedReuse.reuseKind !== "stale" && cachedReuse.session?.profile) {
      return cachedReuse.session.profile;
    }

    const session = await verifyFamilySession(firebaseUser, appName, {
      timeoutMs: 20000,
      networkRetryCount: 1,
      networkRetryDelayMs: 1200,
      forceRefreshToken: false,
    });
    if (!session?.allowed) {
      throw new Error("You do not have access to this workspace.");
    }
    return session.profile;
  };

  const getRecaptchaVerifier = () => {
    if (!auth) throw new Error("Firebase Auth is not ready.");
    if (recaptchaVerifierRef.current) return recaptchaVerifierRef.current;
    recaptchaVerifierRef.current = new RecaptchaVerifier(auth, recaptchaContainerId, { size: "invisible" });
    return recaptchaVerifierRef.current;
  };

  const handleEmailAuth = async (event) => {
    event.preventDefault();
    setPending(true);
    setError("");
    setNotice("");
    try {
      let credential = null;
      if (signup) {
        credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (fullName.trim()) {
          await updateProfile(credential.user, { displayName: fullName.trim() });
        }
        await sendEmailVerification(credential.user);
        setNotice("Check your email to verify your account.");
      } else {
        credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      }
      const synced = await verifyAccess(credential.user);
      if (signup) requestPostSignupLock(credential.user.uid, "ai");
      await onAuthSuccess(synced, returnTo);
    } catch (err) {
      setError(normalizeAuthError(err));
    } finally {
      setPending(false);
    }
  };

  const handleProviderPopup = async (provider) => {
    setPending(true);
    setError("");
    setNotice("");
    try {
      const credential = await signInWithPopup(auth, provider);
      const synced = await verifyAccess(credential.user);
      await onAuthSuccess(synced, returnTo);
    } catch (err) {
      setError(normalizeAuthError(err));
    } finally {
      setPending(false);
    }
  };

  const handlePhoneRequest = async () => {
    setPending(true);
    setError("");
    setNotice("");
    try {
      const verifier = getRecaptchaVerifier();
      const confirmation = await signInWithPhoneNumber(auth, phoneNumber.trim(), verifier);
      setPhoneConfirmation(confirmation);
      setNotice(`Verification code sent to ${phoneNumber.trim()}.`);
    } catch (err) {
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
        recaptchaVerifierRef.current = null;
      }
      setError(normalizeAuthError(err));
    } finally {
      setPending(false);
    }
  };

  const handlePhoneVerify = async (event) => {
    event.preventDefault();
    if (!phoneConfirmation) {
      setError("Request a verification code first.");
      return;
    }
    setPending(true);
    setError("");
    setNotice("");
    try {
      const credential = await phoneConfirmation.confirm(phoneOtp.trim());
      const synced = await verifyAccess(credential.user);
      await onAuthSuccess(synced, returnTo);
    } catch (err) {
      setError(normalizeAuthError(err));
    } finally {
      setPending(false);
    }
  };

  const resetPhoneFlow = () => {
    setPhoneMode(false);
    setPhoneNumber("");
    setPhoneOtp("");
    setPhoneConfirmation(null);
    setNotice("");
    setError("");
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
              <h2>{signup ? "Create your ElimuLink account" : "Sign in to ElimuLink"}</h2>
              <p>
                {signup
                  ? "Create your account to access institutional tools and collaboration features."
                  : "Access your institution workspace, AI tools, and academic operations in one place."}
              </p>
            </div>
            <span className="inst-auth-chip">Secure sign-in</span>
          </div>

          {notice ? <div className="inst-auth-notice">{notice}</div> : null}
          {error ? <div className="inst-auth-error">{error}</div> : null}

          {!phoneMode ? (
            <>
              <div className="inst-auth-socials compact-two-col">
                <button type="button" className="inst-auth-social-btn" onClick={() => handleProviderPopup(new GoogleAuthProvider())} disabled={pending}>
                  <GoogleIcon />
                  <span>Continue with Google</span>
                </button>
                <button
                  type="button"
                  className="inst-auth-social-btn"
                  onClick={() => {
                    const provider = new OAuthProvider("apple.com");
                    provider.addScope("email");
                    provider.addScope("name");
                    handleProviderPopup(provider);
                  }}
                  disabled={pending}
                >
                  <AppleIcon />
                  <span>Continue with Apple</span>
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
                  <span>Continue with Microsoft</span>
                </button>
                <button
                  type="button"
                  className="inst-auth-social-btn"
                  onClick={() => {
                    setPhoneMode(true);
                    setError("");
                    setNotice("");
                  }}
                  disabled={pending}
                >
                  <PhoneIcon />
                  <span>Continue with Phone Number</span>
                </button>
              </div>

              <div className="inst-auth-divider">
                <span>OR</span>
              </div>

              <form className="inst-auth-form compact-form" onSubmit={handleEmailAuth}>
                {signup ? (
                  <label className="inst-auth-field">
                    <span>Full name</span>
                    <input type="text" placeholder="Enter your full name" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                  </label>
                ) : null}

                <label className="inst-auth-field">
                  <span>Email address</span>
                  <input type="email" placeholder="Enter your work email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </label>

                <label className="inst-auth-field">
                  <span>Password</span>
                  <input
                    type="password"
                    placeholder={signup ? "Create password" : "Enter your password"}
                    autoComplete={signup ? "new-password" : "current-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </label>

                <button className="inst-auth-primary compact-primary" type="submit" disabled={pending}>
                  <span>{pending ? "Please wait..." : signup ? "Create account" : "Sign in"}</span>
                  {!pending ? <ArrowRight size={16} /> : null}
                </button>
              </form>
            </>
          ) : (
            <div className="inst-auth-phone-panel">
              <div className="inst-auth-phone-head">
                <div className="inst-auth-phone-icon">
                  <PhoneIcon />
                </div>
                <div>
                  <div className="inst-auth-phone-title">Continue with Phone Number</div>
                  <div className="inst-auth-phone-subtitle">Use your number and verification code.</div>
                </div>
              </div>

              <form className="inst-auth-form inst-auth-phone-form" onSubmit={handlePhoneVerify}>
                <label className="inst-auth-field">
                  <span>Phone number</span>
                  <input type="tel" placeholder="+2547XXXXXXXX" autoComplete="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} required />
                </label>
                {phoneConfirmation ? (
                  <label className="inst-auth-field">
                    <span>Verification code</span>
                    <input type="text" placeholder="Enter verification code" inputMode="numeric" value={phoneOtp} onChange={(e) => setPhoneOtp(e.target.value)} required />
                  </label>
                ) : null}
                <button className="inst-auth-primary inst-auth-phone-primary" type={phoneConfirmation ? "submit" : "button"} onClick={phoneConfirmation ? undefined : handlePhoneRequest} disabled={pending}>
                  <span>{pending ? "Please wait..." : phoneConfirmation ? "Verify and continue" : "Send verification code"}</span>
                  {!pending ? <ArrowRight size={16} /> : null}
                </button>
              </form>

              <button className="inst-auth-secondary-btn" type="button" onClick={resetPhoneFlow} disabled={pending}>
                Back to other sign-in methods
              </button>
              <div id={recaptchaContainerId} />
            </div>
          )}

          <div className="inst-auth-links compact-links">
            {!signup ? (
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
            ) : <span />}
            <button
              type="button"
              className="inst-auth-link-button"
              onClick={() => {
                setSignup((prev) => !prev);
                setPhoneMode(false);
                setNotice("");
                setError("");
              }}
            >
              {signup ? "Already have an account? Sign in" : "Create account"}
            </button>
          </div>

          <div className="inst-auth-sub-actions compact-links">
            <button type="button" className="inst-auth-secondary-link" onClick={() => window.location.replace("/institution/activate")}>
              Staff / admin entry
            </button>
            <button type="button" className="inst-auth-secondary-link" onClick={() => window.location.replace("/institution/activate")}>
              First-time activation
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
