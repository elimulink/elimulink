import React, { useEffect, useMemo, useRef, useState } from 'react';
import { browserLocalPersistence, setPersistence, updateProfile } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import App from '../App.jsx';
import InstitutionApp from '../institution/InstitutionApp.jsx';
import StudentApp from '../student/StudentApp.jsx';
import StudentLoginPage from '../student/StudentLoginPage.jsx';
import InstitutionLogin from '../pages/InstitutionLogin.jsx';
import InstitutionActivatePage from '../pages/InstitutionActivatePage.jsx';
import PublicLogin from '../pages/PublicLogin.jsx';
import { auth, db, firebaseInitErrorMessage } from '../lib/firebase';
import { watchFirebaseAuth } from '../auth/firebaseAuth';
import {
  canAccessApp,
  clearFamilySession,
  loadFamilySession,
  logoutFamilySession,
  verifyFamilySession,
} from '../auth/familySession';
import { getResolvedHostMode } from './hostMode';

const APP_ID = import.meta.env.VITE_APP_ID || 'elimulink-pro-v2';
const DEBUG_HOST_ROUTER = import.meta.env.DEV && String(import.meta.env.VITE_DEBUG_HOST_ROUTER || '').trim() === '1';

function hostLog(...args) {
  if (DEBUG_HOST_ROUTER) console.log(...args);
}

function profileDisplayName(profile, user) {
  const value = profile?.displayName || profile?.name || user?.displayName || '';
  return String(value).trim();
}

function isProfileComplete(profile, user) {
  return Boolean(profileDisplayName(profile, user));
}

function replacePath(targetPath, setPathname) {
  if (window.location.pathname === targetPath) return;
  window.history.replaceState({}, '', targetPath);
  setPathname(targetPath);
}

function getModeBaseUrl(mode, currentHostname = window.location.hostname) {
  const host = String(currentHostname || '').toLowerCase();
  const isLocal = host.endsWith('.localhost') || host === 'localhost' || host === '127.0.0.1';
  if (isLocal) {
    const localBaseMap = {
      public: 'http://app.localhost:3000',
      student: 'http://student.localhost:3000',
      institution: 'http://institution.localhost:3000',
    };
    return localBaseMap[mode];
  }

  const isFirebaseDefaultHost = host.includes('.web.app') || host.includes('.firebaseapp.com');
  if (isFirebaseDefaultHost) {
    const firebaseBaseMap = {
      public: 'https://elimulink-app-ai.web.app',
      student: 'https://elimulink-student.web.app',
      institution: 'https://elimulink-institution.web.app',
    };
    return firebaseBaseMap[mode];
  }

  const customBaseMap = {
    public: 'https://app.elimulink.co.ke',
    student: 'https://student.elimulink.co.ke',
    institution: 'https://institution.elimulink.co.ke',
  };
  return customBaseMap[mode];
}

function getModeUrl(mode) {
  return `${getModeBaseUrl(mode)}/${mode}`;
}

function getBaseOrigin(modeUrl, mode) {
  return String(modeUrl || '').replace(new RegExp(`/${mode}$`), '');
}

function getDefaultModePath(mode) {
  return `/${mode || 'public'}`;
}

function sanitizeReturnTo(returnToRaw, { mode, isAuthenticated = false } = {}) {
  const fallback = getDefaultModePath(mode);
  const raw = String(returnToRaw || '').trim();
  if (!raw || raw === '/' || raw === 'null' || raw === 'undefined') return fallback;

  let value = raw;
  try {
    value = decodeURIComponent(raw);
  } catch (_) {
    value = raw;
  }

  if (!value.startsWith('/')) return fallback;
  if (value.startsWith('//')) return fallback;
  if (value.includes('://')) return fallback;
  if (value.startsWith('/login')) return fallback;
  if (value.includes('/onboarding?returnTo=')) return fallback;
  return value;
}

function LoadingScreen() {
  return (
    <div className="min-h-[100dvh] bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.12),transparent_28%),linear-gradient(180deg,#f8fbff_0%,#eef6ff_100%)] text-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-[28px] border border-white/70 bg-white/80 px-8 py-10 text-center shadow-[0_24px_70px_rgba(15,23,42,0.10)] backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-600 via-blue-600 to-teal-500 text-sm font-black tracking-[0.16em] text-white shadow-[0_18px_40px_rgba(14,116,144,0.22)]">
          EL
        </div>
        <div className="mt-5 text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700/80">ElimuLink</div>
        <div className="mt-3 text-xl font-semibold tracking-tight text-slate-950">Restoring your session</div>
        <div className="mt-2 text-sm leading-6 text-slate-500">Verifying your workspace access and preparing the app.</div>
      </div>
    </div>
  );
}

function BootstrapErrorScreen({ hostMode, error, onRetry }) {
  const details = String(error?.message || 'Session bootstrap failed.');
  const endpoint = String(error?.verifyUrl || '').trim();

  return (
    <div className="min-h-[100dvh] bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.12),transparent_28%),linear-gradient(180deg,#f8fbff_0%,#eef6ff_100%)] text-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-[28px] border border-white/70 bg-white/84 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:p-8">
        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700/80">Session Check</div>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">We couldn&apos;t verify this {hostMode} session yet</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Firebase sign-in succeeded, but the backend verification route did not complete. This usually means the deployed API is missing the current AI-family verify endpoint.
        </p>
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {details}
        </div>
        {endpoint ? (
          <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600 break-all">
            {endpoint}
          </div>
        ) : null}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-500"
            type="button"
            onClick={onRetry}
          >
            Retry verification
          </button>
          <button
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            type="button"
            onClick={async () => {
              await logoutFamilySession({
                clearKeys: ['activeDepartmentId', 'activeDepartmentName', 'elimulink_admin_token'],
              });
              window.location.replace('/login');
            }}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

function AccessDeniedScreen({ hostMode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full rounded-xl border border-white/10 bg-slate-900 p-6">
        <h1 className="text-lg font-bold">Access restricted</h1>
        <p className="text-sm text-slate-300 mt-2">
          Your current ElimuLink family account does not have access to the {hostMode} workspace.
        </p>
        <button
          className="mt-4 w-full rounded bg-sky-500 px-3 py-2 text-sm font-semibold text-white"
          type="button"
          onClick={async () => {
            await logoutFamilySession({
              clearKeys: ['activeDepartmentId', 'activeDepartmentName', 'elimulink_admin_token'],
            });
            window.location.replace('/login');
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

function PublicApp({ modeUrls }) {
  return <App hostMode="public" modeUrls={modeUrls} />;
}

function OnboardingPage({ hostMode, user, authReady, onCompleteOnboarding }) {
  const [fullName, setFullName] = useState(profileDisplayName(null, user));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [returnTo, setReturnTo] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const incomingReturnTo = params.get('returnTo') || '';
    setReturnTo(sanitizeReturnTo(incomingReturnTo, { mode: hostMode, isAuthenticated: Boolean(user && !user.isAnonymous) }));
  }, [hostMode, user]);

  const canContinue = authReady && !!user && !pending;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full rounded-xl border border-white/10 bg-slate-900 p-6">
        <h1 className="text-lg font-bold">Complete your profile</h1>
        <p className="text-sm text-slate-300 mt-2">Your full name is required before continuing.</p>
        {!authReady ? <div className="mt-3 text-xs text-slate-400">Loading...</div> : null}
        {authReady && !user ? (
          <div className="mt-3 rounded bg-amber-900/40 border border-amber-500/40 px-3 py-2 text-xs">
            Please login again.
            <a
              className="ml-2 underline text-amber-200"
              href={`/login?returnTo=${encodeURIComponent(sanitizeReturnTo('/onboarding', { mode: hostMode, isAuthenticated: false }))}`}
            >
              Login
            </a>
          </div>
        ) : null}
        {error && <div className="mt-3 rounded bg-red-900/40 border border-red-500/40 px-3 py-2 text-xs">{error}</div>}
        <form
          className="mt-4 space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!authReady) {
              setError('Loading...');
              return;
            }
            if (!user) {
              const nextReturnTo = sanitizeReturnTo('/', { mode: hostMode, isAuthenticated: true });
              window.location.replace(`/login?returnTo=${encodeURIComponent(nextReturnTo)}`);
              return;
            }
            setPending(true);
            setError('');
            try {
              await onCompleteOnboarding(fullName.trim(), returnTo);
            } catch (err) {
              setError(String(err?.message || err || 'Failed to save profile'));
            } finally {
              setPending(false);
            }
          }}
        >
          <input
            className="w-full rounded border border-white/10 bg-slate-800 px-3 py-2 text-sm"
            placeholder="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
          <button
            className="w-full rounded bg-sky-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            type="submit"
            disabled={!canContinue}
          >
            {pending ? 'Saving...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function HostRouter() {
  const [pathname, setPathname] = useState(window.location.pathname);
  const [authReady, setAuthReady] = useState(false);
  const [profileReady, setProfileReady] = useState(false);
  const [bootState, setBootState] = useState('loading');
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [accessAllowed, setAccessAllowed] = useState(true);
  const [flashMessage, setFlashMessage] = useState('');
  const [bootstrapError, setBootstrapError] = useState(null);
  const [bootstrapNonce, setBootstrapNonce] = useState(0);
  const handledInitialRedirect = useRef(false);
  const authStateLogged = useRef(false);
  const hostRouteLogged = useRef(false);

  const hostMode = useMemo(
    () => getResolvedHostMode(window.location.hostname),
    [],
  );

  useEffect(() => {
    hostLog('[HOST_MODE]', { host: window.location.host, mode: hostMode });
  }, [hostMode]);

  useEffect(() => {
    if (hostRouteLogged.current) return;
    hostLog('[HOST_MODE_ROUTE]', { host: window.location.host, hostMode, pathname });
    hostRouteLogged.current = true;
  }, [hostMode, pathname]);

  const modeUrls = useMemo(
    () => ({
      public: getModeUrl('public'),
      student: getModeUrl('student'),
      institution: getModeUrl('institution'),
    }),
    [],
  );

  const navigateToModePath = (mode, path) => {
    const targetPath = path || `/${mode}`;
    if (mode === hostMode) {
      replacePath(targetPath, setPathname);
      return;
    }
    const baseOrigin = getModeBaseUrl(mode);
    window.location.replace(`${baseOrigin}${targetPath}`);
  };

  const resolvePostAuthTarget = (_nextProfile, returnToRaw = '') => {
    const mode = hostMode;
    const returnTo = sanitizeReturnTo(returnToRaw, { mode, isAuthenticated: true });
    const modePrefix = `/${mode}`;
    if (returnTo && returnTo.startsWith(modePrefix)) return { mode, path: returnTo };
    return { mode, path: modePrefix };
  };

  useEffect(() => {
    const onPopState = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (authStateLogged.current) return;
    if (!authReady) return;
    hostLog("AUTH_STATE", { authReady, uid: user?.uid || null, host: window.location.host });
    authStateLogged.current = true;
  }, [authReady, user]);

  useEffect(() => {
    if (!auth) return;
    setPersistence(auth, browserLocalPersistence).catch((err) => {
      console.error('HostRouter auth persistence setup failed:', err?.message || err);
    });
  }, []);

  useEffect(() => {
    if (!auth) {
      setUser(null);
      setAuthReady(true);
      setBootState('guest');
      return;
    }

    return watchFirebaseAuth(
      (nextUser) => {
        setUser(nextUser);
        setAuthReady(true);
      },
      (err) => {
        console.error('HostRouter auth initialization failed:', err?.message || err);
        setUser(null);
        setAuthReady(true);
        setBootState('guest');
      },
    );
  }, []);

  useEffect(() => {
    localStorage.setItem('elimulink_host_mode', hostMode);
  }, [hostMode]);

  useEffect(() => {
    async function loadProfile() {
      if (!authReady) return;
      if (!user || user.isAnonymous) {
        clearFamilySession();
        setProfile(null);
        setAccessAllowed(true);
        setBootstrapError(null);
        setBootState('guest');
        setProfileReady(true);
        return;
      }

      setBootState('loading');
      setBootstrapError(null);
      const cachedSession = loadFamilySession(user.uid);
      if (cachedSession?.profile) {
        setProfile(cachedSession.profile);
        setAccessAllowed(canAccessApp(cachedSession, hostMode));
      }

      try {
        const familySession = await verifyFamilySession(user, hostMode);
        const loadedProfile = { ...(familySession?.profile || {}) };
        hostLog('[HOST_AUTH] profile_loaded', { uid: user.uid, email: user.email || null, loadedProfile });
        setProfile(loadedProfile);
        const allowed = canAccessApp(familySession, hostMode);
        setAccessAllowed(allowed);
        setBootstrapError(null);
        setBootState(allowed ? 'ready' : 'denied');
      } catch (err) {
        console.warn('Failed to bootstrap family session for host routing:', err?.message || err);
        const fallbackSession = loadFamilySession(user.uid);
        if (fallbackSession?.profile) {
          setProfile(fallbackSession.profile);
          const allowed = canAccessApp(fallbackSession, hostMode);
          setAccessAllowed(allowed);
          setBootstrapError(null);
          setBootState(allowed ? 'ready' : 'denied');
        } else {
          setProfile(null);
          setAccessAllowed(true);
          setBootstrapError(err || new Error('Session bootstrap failed'));
          setBootState('error');
        }
      } finally {
        setProfileReady(true);
      }
    }

    setProfileReady(false);
    loadProfile();
  }, [authReady, user, hostMode, bootstrapNonce]);

  useEffect(() => {
    if (!authReady || !profileReady || handledInitialRedirect.current) return;

    const hasAuthenticatedUser = !!user && !user.isAnonymous;
    const loggedIn = hasAuthenticatedUser && bootState === 'ready';
    const expectedPrefix = `/${hostMode}`;
    hostLog("[AUTH]", {
      host: window.location.host,
      uid: user?.uid || null,
      path: pathname,
      isAnon: user?.isAnonymous,
      accessAllowed,
      bootState,
    });

    if (bootState === 'error') {
      handledInitialRedirect.current = true;
      return;
    }

    const shouldRedirectToModeHome =
      pathname === '/' ||
      pathname === '/choose' ||
      ((hostMode === 'student' || hostMode === 'institution') && pathname === '/public');
    if (shouldRedirectToModeHome) {
      const suffix = window.location.search || '';
      replacePath(`${expectedPrefix}${suffix}`, setPathname);
      handledInitialRedirect.current = true;
      return;
    }

    // Hard rule: never render onboarding when logged out.
    if (!loggedIn && pathname.startsWith('/onboarding')) {
      const returnTo = encodeURIComponent(sanitizeReturnTo('/onboarding', { mode: hostMode, isAuthenticated: false }));
      const target = `/login?returnTo=${returnTo}`;
      hostLog("[REDIRECT]", { from: pathname, to: target });
      window.history.replaceState({}, '', target);
      setPathname('/login');
      handledInitialRedirect.current = true;
      return;
    }

    if ((hostMode === 'student' || hostMode === 'institution') && !loggedIn) {
      if (hostMode === 'institution' && pathname === '/institution/activate') {
        handledInitialRedirect.current = true;
        return;
      }
      if (pathname !== '/login') {
        const rawTarget = pathname === '/onboarding'
          ? '/onboarding'
          : `${window.location.pathname}${window.location.search || ''}`;
        const returnTo = encodeURIComponent(sanitizeReturnTo(rawTarget, { mode: hostMode, isAuthenticated: false }));
        const target = `/login?returnTo=${returnTo}`;
        hostLog("[REDIRECT]", { from: pathname, to: target });
        window.history.replaceState({}, '', target);
        setPathname('/login');
      }
      handledInitialRedirect.current = true;
      return;
    }

    const profileDone = isProfileComplete(profile, user);
    if (loggedIn && !profileDone && pathname !== '/onboarding') {
      const returnTo = encodeURIComponent(
        sanitizeReturnTo(`${window.location.pathname}${window.location.search || ''}`, { mode: hostMode, isAuthenticated: true })
      );
      const target = `/onboarding?returnTo=${returnTo}`;
      hostLog("[REDIRECT]", { from: pathname, to: target });
      window.history.replaceState({}, '', target);
      setPathname('/onboarding');
      handledInitialRedirect.current = true;
      return;
    }

    if (loggedIn && profileDone && (pathname === '/login' || pathname === '/onboarding' || pathname === '/institution/activate')) {
      const params = new URLSearchParams(window.location.search);
      const returnTo = params.get('returnTo') || '';
      const target = resolvePostAuthTarget(profile, returnTo);
      hostLog("[REDIRECT]", { from: pathname, to: target.path });
      navigateToModePath(target.mode, target.path);
      handledInitialRedirect.current = true;
      return;
    }

    if (
      !pathname.startsWith(expectedPrefix) &&
      pathname !== '/login' &&
      pathname !== '/onboarding' &&
      pathname !== '/institution/activate'
    ) {
      replacePath(expectedPrefix, setPathname);
      handledInitialRedirect.current = true;
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const incomingMessage = params.get('message');
    if (incomingMessage) {
      setFlashMessage(incomingMessage);
      params.delete('message');
      const cleanSearch = params.toString();
      const suffix = cleanSearch ? `?${cleanSearch}` : '';
      window.history.replaceState({}, '', `${window.location.pathname}${suffix}`);
      setPathname(window.location.pathname);
    }

    handledInitialRedirect.current = true;
  }, [authReady, profileReady, user, profile, hostMode, pathname, modeUrls, accessAllowed, bootState]);

  useEffect(() => {
    handledInitialRedirect.current = false;
  }, [pathname, hostMode, user, profileReady]);

  const AppEntry =
    hostMode === 'student'
      ? StudentApp
      : hostMode === 'institution'
        ? InstitutionApp
        : PublicApp;

  const appElement = (
    <>
      {user && !user.emailVerified ? (
        <div className="fixed top-3 left-1/2 z-50 -translate-x-1/2 rounded border border-amber-500/40 bg-amber-900/60 px-4 py-2 text-xs text-amber-100">
          Your email is not verified yet. Check your inbox.
        </div>
      ) : null}
      {flashMessage ? (
        <div className="fixed top-3 left-1/2 z-50 -translate-x-1/2 rounded border border-amber-500/40 bg-amber-900/60 px-4 py-2 text-xs text-amber-100">
          {flashMessage}
        </div>
      ) : null}
      {hostMode === 'institution' ? <AppEntry userRole={profile?.role} /> : <AppEntry modeUrls={modeUrls} />}
    </>
  );

  if (firebaseInitErrorMessage) {
    return <div style={{ padding: 16 }}>Firebase init failed: {firebaseInitErrorMessage}</div>;
  }

  if (!authReady || !profileReady || bootState === 'loading') return <LoadingScreen />;

  if (bootState === 'error' && user && !user.isAnonymous) {
    return (
      <BootstrapErrorScreen
        hostMode={hostMode}
        error={bootstrapError}
        onRetry={() => {
          setBootstrapError(null);
          setBootState('loading');
          setProfileReady(false);
          setBootstrapNonce((value) => value + 1);
        }}
      />
    );
  }

  if (bootState === 'denied' && user && !user.isAnonymous) {
    return <AccessDeniedScreen hostMode={hostMode} />;
  }

  if (
    (hostMode === 'student' || hostMode === 'institution') &&
    (!user || user.isAnonymous) &&
    pathname !== '/login' &&
    pathname !== '/institution/activate'
  ) {
    return <LoadingScreen />;
  }

  if (hostMode === 'institution' && pathname === '/institution/activate') {
    return <InstitutionActivatePage />;
  }

  if (hostMode === 'student' && pathname === '/login') {
    return (
      <StudentLoginPage
        profileDisplayName={profileDisplayName(profile, user)}
        onAuthSuccess={async (syncedProfile, returnTo) => {
          const merged = {
            ...(profile || {}),
            ...(syncedProfile || {}),
            displayName: profileDisplayName(profile, auth?.currentUser),
          };
          setProfile(merged);
          const complete = isProfileComplete(merged, auth?.currentUser);
          const safeReturnTo = sanitizeReturnTo(returnTo, { mode: hostMode, isAuthenticated: true });
          if (!complete) {
            window.history.replaceState({}, '', `/onboarding?returnTo=${encodeURIComponent(safeReturnTo)}`);
            setPathname('/onboarding');
            return;
          }
          const target = resolvePostAuthTarget(merged, safeReturnTo);
          navigateToModePath(target.mode, target.path);
          handledInitialRedirect.current = false;
        }}
      />
    );
  }

  if (hostMode === 'institution' && pathname === '/login') {
    return (
      <InstitutionLogin
        hostMode={hostMode}
        user={user}
        profileDisplayName={profileDisplayName(profile, user)}
        onAuthSuccess={async (syncedProfile, returnTo) => {
          const merged = {
            ...(profile || {}),
            ...(syncedProfile || {}),
            displayName: profileDisplayName(profile, auth?.currentUser),
          };
          setProfile(merged);
          const complete = isProfileComplete(merged, auth?.currentUser);
          const safeReturnTo = sanitizeReturnTo(returnTo, { mode: hostMode, isAuthenticated: true });
          if (!complete) {
            window.history.replaceState({}, '', `/onboarding?returnTo=${encodeURIComponent(safeReturnTo)}`);
            setPathname('/onboarding');
            return;
          }
          const target = resolvePostAuthTarget(merged, safeReturnTo);
          navigateToModePath(target.mode, target.path);
          handledInitialRedirect.current = false;
        }}
      />
    );
  }

  if (hostMode === 'public' && pathname === '/login') {
    return (
      <PublicLogin
        profileDisplayName={profileDisplayName(profile, user)}
        onAuthSuccess={async (syncedProfile, returnTo) => {
          const merged = {
            ...(profile || {}),
            ...(syncedProfile || {}),
            displayName: profileDisplayName(profile, auth?.currentUser),
          };
          setProfile(merged);
          const complete = isProfileComplete(merged, auth?.currentUser);
          const safeReturnTo = sanitizeReturnTo(returnTo, { mode: hostMode, isAuthenticated: true });
          if (!complete) {
            window.history.replaceState({}, '', `/onboarding?returnTo=${encodeURIComponent(safeReturnTo)}`);
            setPathname('/onboarding');
            return;
          }
          const target = resolvePostAuthTarget(merged, safeReturnTo);
          navigateToModePath(target.mode, target.path);
          handledInitialRedirect.current = false;
        }}
      />
    );
  }

  if (pathname === '/login' || pathname === '/onboarding') {
    return (
      <OnboardingPage
        hostMode={hostMode}
        user={user}
        authReady={authReady}
        onCompleteOnboarding={async (fullName, returnTo) => {
          const activeUser = user || auth?.currentUser || null;
          if (!activeUser) {
            const safeLoginReturn = sanitizeReturnTo('/onboarding', { mode: hostMode, isAuthenticated: false });
            window.history.replaceState({}, '', `/login?returnTo=${encodeURIComponent(safeLoginReturn)}`);
            setPathname('/login');
            return;
          }
          const normalizedName = String(fullName || '').trim();
          if (!normalizedName) throw new Error('Full name is required');
          await activeUser.getIdToken();
          if (auth?.currentUser && !String(auth.currentUser.displayName || '').trim()) {
            await updateProfile(auth.currentUser, { displayName: normalizedName });
          }
          const profileRef = doc(db, 'artifacts', APP_ID, 'users', activeUser.uid);
          const profilePatch = {
            displayName: normalizedName,
            name: normalizedName,
            updatedAt: serverTimestamp(),
          };
          hostLog('[ONBOARDING_SAVE] start', {
            uid: activeUser.uid,
            path: `artifacts/${APP_ID}/users/${activeUser.uid}`,
            payload: profilePatch,
          });
          await setDoc(profileRef, profilePatch, { merge: true });
          hostLog('[ONBOARDING_SAVE] profile saved ok');
          const savedSnap = await getDoc(profileRef);
          const savedProfile = savedSnap.exists() ? savedSnap.data() : null;
          const merged = { ...(profile || {}), ...(savedProfile || {}), ...profilePatch };
          setFlashMessage('');
          setProfile(merged);
          const completeAfterSave = isProfileComplete(merged, auth?.currentUser);
          hostLog('[ONBOARDING_SAVE] profile after save complete?', completeAfterSave);
          const safeReturnTo = sanitizeReturnTo(returnTo, { mode: hostMode, isAuthenticated: true });
          const target = resolvePostAuthTarget(merged, safeReturnTo);
          navigateToModePath(target.mode, target.path);
          handledInitialRedirect.current = false;
        }}
      />
    );
  }

  return appElement;
}
