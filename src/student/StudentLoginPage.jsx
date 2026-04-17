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

function sanitizeReturnTo(returnToRaw) {
  const raw = String(returnToRaw || '').trim();
  if (!raw || raw === '/' || raw === 'null' || raw === 'undefined') return '/student';
  let value = raw;
  try {
    value = decodeURIComponent(raw);
  } catch (_) {
    value = raw;
  }
  if (!value.startsWith('/')) return '/student';
  if (value.startsWith('//')) return '/student';
  if (value.includes('://')) return '/student';
  if (value.startsWith('/login')) return '/student';
  if (value.includes('/onboarding?returnTo=')) return '/student';
  return value;
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path fill="#4285F4" d="M21.6 12.23c0-.78-.07-1.53-.2-2.25H12v4.26h5.4a4.62 4.62 0 0 1-2 3.03v2.52h3.24c1.9-1.75 2.96-4.34 2.96-7.56Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.44l-3.24-2.52c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.58-4.12H3.07v2.6A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.42 13.88A6 6 0 0 1 6.1 12c0-.65.11-1.28.32-1.88v-2.6H3.07A10 10 0 0 0 2 12c0 1.61.39 3.13 1.07 4.48l3.35-2.6Z" />
      <path fill="#EA4335" d="M12 5.98c1.47 0 2.79.5 3.83 1.49l2.87-2.87C16.95 2.97 14.7 2 12 2A10 10 0 0 0 3.07 7.52l3.35 2.6C7.2 7.74 9.4 5.98 12 5.98Z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
      <path d="M15.1 3.5c.8-1 1.3-2.3 1.2-3.5-1.2.1-2.6.8-3.5 1.8-.8.9-1.4 2.2-1.2 3.4 1.3.1 2.6-.7 3.5-1.7Zm4.4 14.8c-.6 1.4-.9 2-1.7 3.2-1.1 1.6-2.6 3.6-4.4 3.6-1.6 0-2-.9-4.2-.9s-2.7.9-4.3.9c-1.8 0-3.2-1.8-4.4-3.4C-2.9 16.8-.8 8.3 4.2 8.1c1.5 0 2.8 1 3.7 1 1 0 2.8-1.3 4.8-1.1.8 0 3 .3 4.4 2.4-3.9 2.1-3.3 7.6 2.4 9.9Z" />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path fill="#F25022" d="M2 2h9.5v9.5H2z" />
      <path fill="#7FBA00" d="M12.5 2H22v9.5h-9.5z" />
      <path fill="#00A4EF" d="M2 12.5h9.5V22H2z" />
      <path fill="#FFB900" d="M12.5 12.5H22V22h-9.5z" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
      <path d="M7 2.75A2.75 2.75 0 0 0 4.25 5.5v13A2.75 2.75 0 0 0 7 21.25h10a2.75 2.75 0 0 0 2.75-2.75v-13A2.75 2.75 0 0 0 17 2.75H7Zm5 16.5a1.12 1.12 0 1 1 0-2.24 1.12 1.12 0 0 1 0 2.24Zm4.25-4.5h-8.5V5.75h8.5v9Z" />
    </svg>
  );
}

function SocialButton({ icon, children, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white/88 px-4 text-sm font-semibold text-slate-800 shadow-[0_10px_26px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
        {icon}
      </span>
      <span>{children}</span>
    </button>
  );
}

export default function StudentLoginPage({ onAuthSuccess, profileDisplayName }) {
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
  const [returnTo, setReturnTo] = useState('/student');
  const recaptchaVerifierRef = useRef(null);
  const recaptchaContainerId = 'student-login-phone-recaptcha';

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
      return 'This sign-in method is currently unavailable for the student portal.';
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
    const session = await verifyFamilySession(firebaseUser, 'student');
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
        setNotice('Check your inbox to verify your student account.');
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
    <div className="h-[100dvh] overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.14),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.16),_transparent_30%),linear-gradient(135deg,#f8fbff_0%,#ecfeff_38%,#eef2ff_100%)] text-slate-900">
      <div className="mx-auto grid h-full max-w-7xl grid-cols-1 overflow-hidden lg:grid-cols-[1.02fr_0.98fr]">
        <section className="relative hidden h-[100dvh] overflow-hidden lg:flex lg:items-center lg:px-14 lg:py-12">
          <div className="absolute inset-0 bg-[linear-gradient(160deg,rgba(255,255,255,0.82),rgba(236,254,255,0.36))]" />
          <div className="absolute left-10 top-10 h-40 w-40 rounded-full bg-teal-300/20 blur-3xl" />
          <div className="absolute bottom-10 right-12 h-56 w-56 rounded-full bg-blue-300/20 blur-3xl" />
          <div className="relative z-10 max-w-xl">
            <div className="inline-flex items-center gap-4">
              <img src="/favicon.png" alt="ElimuLink" className="h-14 w-auto object-contain shrink-0" />
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-700/80">Student Portal</div>
                <div className="text-3xl font-semibold tracking-tight text-slate-950">ElimuLink</div>
              </div>
            </div>
            <div className="mt-10">
              <div className="inline-flex items-center rounded-full border border-white/70 bg-white/70 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-teal-700 shadow-sm backdrop-blur">
                STUDENT PORTAL
              </div>
              <h1 className="mt-6 max-w-lg text-5xl font-semibold leading-[1.02] tracking-tight text-slate-950">
                Sign in to ElimuLink
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
                Access your courses, results, timetable, and academic journey in one place.
              </p>
            </div>
            <div className="mt-10 grid max-w-lg gap-4">
              <div className="rounded-3xl border border-white/70 bg-white/65 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl">
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Student access</div>
                <div className="mt-2 text-sm leading-6 text-slate-700">
                  Your learning tools, timetable, results, and academic updates stay connected in one student workspace.
                </div>
              </div>
              <div className="rounded-3xl border border-white/70 bg-white/65 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl">
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Student-only sign-in</div>
                <div className="mt-2 text-sm leading-6 text-slate-700">
                  This portal is intended for students only.
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="flex h-[100dvh] min-h-0 items-center justify-center overflow-hidden px-4 py-4 sm:px-6 lg:px-10 lg:py-8">
          <div className="w-full max-w-[29rem] overflow-hidden rounded-[30px] border border-white/70 bg-white/58 p-3 shadow-[0_30px_80px_rgba(15,23,42,0.14)] backdrop-blur-2xl lg:max-w-[31rem]">
            <div className="max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-[26px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,250,252,0.78))] px-5 py-5 sm:px-6 sm:py-6 lg:max-h-none lg:overflow-visible">
              <div className="mb-4 flex items-center gap-3 lg:hidden">
                <img src="/favicon.png" alt="ElimuLink" className="h-11 w-auto object-contain shrink-0" />
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-sky-700/80">Student Portal</div>
                  <div className="text-lg font-semibold text-slate-950">ElimuLink</div>
                </div>
              </div>

              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-teal-700">STUDENT PORTAL</div>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Welcome back</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">Sign in to continue your learning.</p>
                </div>
                <div className="hidden rounded-2xl bg-slate-100/90 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 sm:block">
                  Students only
                </div>
              </div>

              <div className="mt-3 rounded-2xl border border-sky-100 bg-sky-50/80 px-4 py-3 text-sm text-sky-900">
                This sign-in is for students only.
              </div>

              {notice ? <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/95 px-4 py-3 text-sm text-amber-900">{notice}</div> : null}
              {error ? <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50/95 px-4 py-3 text-sm text-rose-900">{error}</div> : null}

              {!phoneMode ? (
                <>
                  <div className="mt-4 space-y-2.5">
                    <SocialButton icon={<GoogleIcon />} onClick={() => handleProviderPopup(new GoogleAuthProvider())} disabled={pending}>
                      Continue with Google
                    </SocialButton>
                    <SocialButton
                      icon={<AppleIcon />}
                      onClick={() => {
                        const provider = new OAuthProvider('apple.com');
                        provider.addScope('email');
                        provider.addScope('name');
                        handleProviderPopup(provider);
                      }}
                      disabled={pending}
                    >
                      Continue with Apple
                    </SocialButton>
                    <SocialButton
                      icon={<MicrosoftIcon />}
                      onClick={() => {
                        const provider = new OAuthProvider('microsoft.com');
                        provider.setCustomParameters({ prompt: 'select_account' });
                        handleProviderPopup(provider);
                      }}
                      disabled={pending}
                    >
                      Continue with Microsoft
                    </SocialButton>
                    <SocialButton
                      icon={<PhoneIcon />}
                      onClick={() => {
                        setPhoneMode(true);
                        setError('');
                        setNotice('');
                      }}
                      disabled={pending}
                    >
                      Continue with phone
                    </SocialButton>
                  </div>

                  <div className="my-4 flex items-center gap-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                    <div className="h-px flex-1 bg-slate-200" />
                    <span>OR</span>
                    <div className="h-px flex-1 bg-slate-200" />
                  </div>

                  <form className="space-y-2.5" onSubmit={handleEmailAuth}>
                    {signup ? (
                      <input
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-white/90 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                        placeholder="Full name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                      />
                    ) : null}
                    <input
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-white/90 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                      placeholder="Student email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                    <input
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-white/90 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                      placeholder="Password"
                      type="password"
                      autoComplete={signup ? 'new-password' : 'current-password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      className="h-11 w-full rounded-2xl bg-gradient-to-r from-sky-600 via-blue-600 to-teal-500 px-4 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(14,116,144,0.24)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                      type="submit"
                      disabled={pending}
                    >
                      {pending ? 'Please wait...' : signup ? 'Create account' : 'Sign in'}
                    </button>
                  </form>
                </>
              ) : (
                <div className="mt-4 rounded-[26px] border border-slate-200 bg-slate-50/90 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-600 via-blue-600 to-teal-500 text-white">
                      <PhoneIcon />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Continue with phone</div>
                      <div className="text-xs text-slate-500">Use your student number and verification code.</div>
                    </div>
                  </div>
                  <form className="mt-4 space-y-3" onSubmit={handlePhoneVerify}>
                    <input
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-white/90 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                      placeholder="+2547XXXXXXXX"
                      type="tel"
                      autoComplete="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      required
                    />
                    {phoneConfirmation ? (
                      <input
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-white/90 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                        placeholder="Enter verification code"
                        inputMode="numeric"
                        value={phoneOtp}
                        onChange={(e) => setPhoneOtp(e.target.value)}
                        required
                      />
                    ) : null}
                    <button
                      className="h-11 w-full rounded-2xl bg-gradient-to-r from-sky-600 via-blue-600 to-teal-500 px-4 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(14,116,144,0.24)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                      type={phoneConfirmation ? 'submit' : 'button'}
                      onClick={phoneConfirmation ? undefined : handlePhoneRequest}
                      disabled={pending}
                    >
                      {pending ? 'Please wait...' : phoneConfirmation ? 'Verify and continue' : 'Send verification code'}
                    </button>
                  </form>
                  <button
                    className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
                    type="button"
                    onClick={resetPhoneFlow}
                    disabled={pending}
                  >
                    Back to student sign-in
                  </button>
                  <div id={recaptchaContainerId} />
                </div>
              )}

              <div className="mt-4 space-y-2.5 text-center text-sm">
                {!signup ? (
                  <button
                    className="block w-full text-slate-600 underline decoration-slate-300 underline-offset-4 transition hover:text-slate-900"
                    type="button"
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
                  className="block w-full text-slate-600 underline decoration-slate-300 underline-offset-4 transition hover:text-slate-900"
                  type="button"
                  onClick={() => {
                    setSignup((prev) => !prev);
                    setPhoneMode(false);
                    setError('');
                    setNotice('');
                  }}
                >
                  {signup ? 'Already have an account? Sign in' : 'Create account'}
                </button>
              </div>

              <p className="mt-3 text-center text-xs leading-5 text-slate-400">
                Staff and administrators should use their dedicated workspace sign-in.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
