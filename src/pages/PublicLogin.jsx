import React, { useEffect, useRef, useState } from 'react';
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
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { verifyFamilySession } from '../auth/familySession';
import { requestPostSignupLock } from '../auth/secureLock';
import '../styles/public-auth.css';

function sanitizeReturnTo(returnToRaw) {
  const raw = String(returnToRaw || '').trim();
  if (!raw || raw === '/' || raw === 'null' || raw === 'undefined') return '/public';
  let value = raw;
  try {
    value = decodeURIComponent(raw);
  } catch (_) {
    value = raw;
  }
  if (!value.startsWith('/')) return '/public';
  if (value.startsWith('//')) return '/public';
  if (value.includes('://')) return '/public';
  if (value.startsWith('/login')) return '/public';
  if (value.includes('/onboarding?returnTo=')) return '/public';
  return value;
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="public-auth-icon-svg">
      <path fill="#4285F4" d="M21.6 12.23c0-.78-.07-1.53-.2-2.25H12v4.26h5.4a4.62 4.62 0 0 1-2 3.03v2.52h3.24c1.9-1.75 2.96-4.34 2.96-7.56Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.44l-3.24-2.52c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.58-4.12H3.07v2.6A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.42 13.88A6 6 0 0 1 6.1 12c0-.65.11-1.28.32-1.88v-2.6H3.07A10 10 0 0 0 2 12c0 1.61.39 3.13 1.07 4.48l3.35-2.6Z" />
      <path fill="#EA4335" d="M12 5.98c1.47 0 2.79.5 3.83 1.49l2.87-2.87C16.95 2.97 14.7 2 12 2A10 10 0 0 0 3.07 7.52l3.35 2.6C7.2 7.74 9.4 5.98 12 5.98Z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="public-auth-icon-svg public-auth-icon-fill">
      <path d="M15.1 3.5c.8-1 1.3-2.3 1.2-3.5-1.2.1-2.6.8-3.5 1.8-.8.9-1.4 2.2-1.2 3.4 1.3.1 2.6-.7 3.5-1.7Zm4.4 14.8c-.6 1.4-.9 2-1.7 3.2-1.1 1.6-2.6 3.6-4.4 3.6-1.6 0-2-.9-4.2-.9s-2.7.9-4.3.9c-1.8 0-3.2-1.8-4.4-3.4C-2.9 16.8-.8 8.3 4.2 8.1c1.5 0 2.8 1 3.7 1 1 0 2.8-1.3 4.8-1.1.8 0 3 .3 4.4 2.4-3.9 2.1-3.3 7.6 2.4 9.9Z" />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="public-auth-icon-svg">
      <path fill="#F25022" d="M2 2h9.5v9.5H2z" />
      <path fill="#7FBA00" d="M12.5 2H22v9.5h-9.5z" />
      <path fill="#00A4EF" d="M2 12.5h9.5V22H2z" />
      <path fill="#FFB900" d="M12.5 12.5H22V22h-9.5z" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="public-auth-icon-svg public-auth-icon-fill">
      <path d="M7 2.75A2.75 2.75 0 0 0 4.25 5.5v13A2.75 2.75 0 0 0 7 21.25h10a2.75 2.75 0 0 0 2.75-2.75v-13A2.75 2.75 0 0 0 17 2.75H7Zm5 16.5a1.12 1.12 0 1 1 0-2.24 1.12 1.12 0 0 1 0 2.24Zm4.25-4.5h-8.5V5.75h8.5v9Z" />
    </svg>
  );
}

export default function PublicLogin({ onAuthSuccess, profileDisplayName }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState(profileDisplayName || '');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [signup, setSignup] = useState(false);
  const [phoneMode, setPhoneMode] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneConfirmation, setPhoneConfirmation] = useState(null);
  const [returnTo, setReturnTo] = useState('/public');
  const recaptchaVerifierRef = useRef(null);
  const recaptchaContainerId = 'public-login-phone-recaptcha';

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const message = params.get('message');
    const incomingReturnTo = params.get('returnTo') || '';
    if (message) setNotice(message);
    setReturnTo(sanitizeReturnTo(incomingReturnTo));
  }, []);

  useEffect(() => {
    const root = document.getElementById('root');
    document.documentElement.classList.add('login-viewport-lock');
    document.body.classList.add('login-viewport-lock');
    root?.classList.add('login-viewport-lock');
    return () => {
      document.documentElement.classList.remove('login-viewport-lock');
      document.body.classList.remove('login-viewport-lock');
      root?.classList.remove('login-viewport-lock');
    };
  }, []);

  const normalizeAuthError = (err) => {
    const code = String(err?.code || '');
    const message = String(err?.message || '');
    if (code.includes('auth/operation-not-allowed')) {
      return 'This sign-in method is currently unavailable.';
    }
    if (code.includes('auth/popup-closed-by-user')) {
      return 'Sign-in was cancelled.';
    }
    if (code.includes('auth/invalid-phone-number')) {
      return 'Enter a valid phone number in international format, for example +2547XXXXXXXX.';
    }
    if (code.includes('auth/missing-phone-number')) {
      return 'Enter your phone number first.';
    }
    if (code.includes('auth/invalid-verification-code')) {
      return 'The verification code is invalid. Try again.';
    }
    if (code.includes('auth/code-expired')) {
      return 'The verification code expired. Request a new one.';
    }
    return message || 'Authentication failed.';
  };

  const verifyAccess = async (firebaseUser) => {
    const session = await verifyFamilySession(firebaseUser, 'public');
    if (!session?.allowed) {
      throw new Error('You do not have access to this workspace.');
    }
    return session.profile;
  };

  const handleProviderPopup = async (provider) => {
    setPending(true);
    setError('');
    setNotice('');
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

  const handleEmailAuth = async (event) => {
    event.preventDefault();
    setPending(true);
    setError('');
    setNotice('');
    try {
      let credential = null;
      if (signup) {
        credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (fullName.trim()) {
          await updateProfile(credential.user, { displayName: fullName.trim() });
        }
        await sendEmailVerification(credential.user);
        setNotice('Check your inbox to verify your account.');
      } else {
        credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      }
      const synced = await verifyAccess(credential.user);
      if (signup) requestPostSignupLock(credential.user.uid, 'ai');
      await onAuthSuccess(synced, returnTo);
    } catch (err) {
      setError(normalizeAuthError(err));
    } finally {
      setPending(false);
    }
  };

  const getRecaptchaVerifier = () => {
    if (!auth) throw new Error('Firebase Auth is not ready.');
    if (recaptchaVerifierRef.current) return recaptchaVerifierRef.current;
    recaptchaVerifierRef.current = new RecaptchaVerifier(auth, recaptchaContainerId, {
      size: 'invisible',
    });
    return recaptchaVerifierRef.current;
  };

  const handlePhoneRequest = async () => {
    setPending(true);
    setError('');
    setNotice('');
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
      setError('Request a verification code first.');
      return;
    }
    setPending(true);
    setError('');
    setNotice('');
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
    setPhoneNumber('');
    setPhoneOtp('');
    setPhoneConfirmation(null);
    setError('');
    setNotice('');
  };

  return (
    <div className="public-auth-page">
      <section className="public-auth-brand-panel">
        <div className="public-auth-brand-inner">
          <img src="/favicon.png" alt="ElimuLink" className="h-12 w-auto object-contain" />
          <span className="public-auth-eyebrow">PUBLIC ACCESS PORTAL</span>
          <h1 className="public-auth-hero-title">Sign in to ElimuLink</h1>
          <p className="public-auth-hero-subtitle">
            Access public services, institution information, and your ElimuLink account.
          </p>
          <div className="public-auth-brand-glow" />
        </div>
      </section>

      <section className="public-auth-form-panel">
        <div className="public-auth-card">
          <div className="public-auth-card-header">
            <h2>Welcome to ElimuLink</h2>
            <p>Sign in to continue.</p>
          </div>

          {notice ? <div className="public-auth-notice">{notice}</div> : null}
          {error ? <div className="public-auth-error">{error}</div> : null}

          {!phoneMode ? (
            <>
              <div className="public-auth-socials">
                <button className="public-auth-social-btn" type="button" onClick={() => handleProviderPopup(new GoogleAuthProvider())} disabled={pending}>
                  <GoogleIcon />
                  <span>Continue with Google</span>
                </button>

                <button
                  className="public-auth-social-btn"
                  type="button"
                  onClick={() => {
                    const provider = new OAuthProvider('apple.com');
                    provider.addScope('email');
                    provider.addScope('name');
                    handleProviderPopup(provider);
                  }}
                  disabled={pending}
                >
                  <AppleIcon />
                  <span>Continue with Apple</span>
                </button>

                <button
                  className="public-auth-social-btn"
                  type="button"
                  onClick={() => {
                    const provider = new OAuthProvider('microsoft.com');
                    provider.setCustomParameters({ prompt: 'select_account' });
                    handleProviderPopup(provider);
                  }}
                  disabled={pending}
                >
                  <MicrosoftIcon />
                  <span>Continue with Microsoft</span>
                </button>

                <button
                  className="public-auth-social-btn"
                  type="button"
                  onClick={() => {
                    setPhoneMode(true);
                    setError('');
                    setNotice('');
                  }}
                  disabled={pending}
                >
                  <PhoneIcon />
                  <span>Continue with phone</span>
                </button>
              </div>

              <div className="public-auth-divider">
                <span>OR</span>
              </div>

              <form className="public-auth-form-fields" onSubmit={handleEmailAuth}>
                {signup ? (
                  <input
                    type="text"
                    placeholder="Full name"
                    className="public-auth-input"
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                ) : null}
                <input
                  type="email"
                  placeholder="Email"
                  className="public-auth-input"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />

                <input
                  type="password"
                  placeholder="Password"
                  className="public-auth-input"
                  autoComplete={signup ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />

                <button className="public-auth-primary-btn" type="submit" disabled={pending}>
                  {pending ? 'Please wait...' : signup ? 'Create account' : 'Sign in'}
                </button>
              </form>
            </>
          ) : (
            <div className="public-auth-phone-panel">
              <div className="public-auth-phone-head">
                <div className="public-auth-phone-icon">
                  <PhoneIcon />
                </div>
                <div>
                  <div className="public-auth-phone-title">Continue with phone</div>
                  <div className="public-auth-phone-subtitle">Use your number and verification code.</div>
                </div>
              </div>

              <form className="public-auth-form-fields public-auth-phone-form" onSubmit={handlePhoneVerify}>
                <input
                  type="tel"
                  placeholder="+2547XXXXXXXX"
                  className="public-auth-input"
                  autoComplete="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                />

                {phoneConfirmation ? (
                  <input
                    type="text"
                    placeholder="Enter verification code"
                    className="public-auth-input"
                    inputMode="numeric"
                    value={phoneOtp}
                    onChange={(e) => setPhoneOtp(e.target.value)}
                    required
                  />
                ) : null}

                <button
                  className="public-auth-primary-btn"
                  type={phoneConfirmation ? 'submit' : 'button'}
                  onClick={phoneConfirmation ? undefined : handlePhoneRequest}
                  disabled={pending}
                >
                  {pending ? 'Please wait...' : phoneConfirmation ? 'Verify and continue' : 'Send verification code'}
                </button>
              </form>

              <button className="public-auth-secondary-btn" type="button" onClick={resetPhoneFlow} disabled={pending}>
                Back to other sign-in methods
              </button>
              <div id={recaptchaContainerId} />
            </div>
          )}

          <div className="public-auth-links">
            {!signup ? (
              <button
                type="button"
                className="public-auth-link-btn"
                onClick={async () => {
                  setError('');
                  setNotice('');
                  try {
                    if (!email.trim()) throw new Error('Enter your email first.');
                    await sendPasswordResetEmail(auth, email.trim());
                    setNotice('Password reset email sent. Check your inbox.');
                  } catch (err) {
                    setError(normalizeAuthError(err));
                  }
                }}
              >
                Forgot password?
              </button>
            ) : null}
            <button
              type="button"
              className="public-auth-link-btn"
              onClick={() => {
                setSignup((prev) => !prev);
                setPhoneMode(false);
                setNotice('');
                setError('');
              }}
            >
              {signup ? 'Already have an account? Sign in' : 'Create account'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
