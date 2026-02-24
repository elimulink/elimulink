import React, { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import Sidebar from './components/Sidebar.jsx';
import Topbar from './components/Topbar.jsx';
import Students from './pages/Students.jsx';
import Courses from './pages/Courses.jsx';
import Analytics from './pages/Analytics.jsx';
import Settings from './pages/Settings.jsx';
import { Menu } from 'lucide-react';
import Notebook from './pages/Notebook.jsx';
import Announcements from './pages/Announcements.jsx';
import Planning from './pages/Planning.jsx';
import InstitutionAdminDashboard from '../pages/institution/InstitutionAdminDashboard.jsx';
import InstitutionHome from '../pages/institution/InstitutionHome.jsx';
import { auth, db } from '../lib/firebase';

const APP_ID = import.meta.env.VITE_APP_ID || 'elimulink-pro-v2';
const institutionAdminAllowedRoles = ['staff', 'departmentAdmin', 'institution_admin', 'superAdmin'];

function AdminRouteGuard({ canAccessAdmin, onDenied, children }) {
  const navigate = useNavigate();

  useEffect(() => {
    const openedFromSidebar = sessionStorage.getItem('institution_admin_entry') === 'sidebar';
    if (!canAccessAdmin || !openedFromSidebar) {
      onDenied?.();
      navigate('/', { replace: true });
    }
  }, [canAccessAdmin, navigate, onDenied]);

  if (!canAccessAdmin) return null;
  if (sessionStorage.getItem('institution_admin_entry') !== 'sidebar') return null;
  return children;
}

export default function InstitutionApp() {
  const [isSidebarOpen, setSidebarOpen] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 768 : true));
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 768 : false));
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [userRole, setUserRole] = useState('student_general');
  const [tokenInstitutionId, setTokenInstitutionId] = useState(null);
  const [uiMessage, setUiMessage] = useState('');

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(true);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, (nextUser) => setUser(nextUser || null));
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadProfile() {
      if (!user?.uid) {
        if (!cancelled) {
          setUserProfile(null);
          setUserRole('student_general');
          setTokenInstitutionId(null);
        }
        return;
      }

      const claimInstitutionId = await user
        .getIdTokenResult()
        .then((r) => r?.claims?.institutionId || null)
        .catch(() => null);

      try {
        const snap = await getDoc(doc(db, 'artifacts', APP_ID, 'users', user.uid));
        const profileData = snap.exists() ? snap.data() : {};
        if (!cancelled) {
          setUserProfile(profileData);
          setUserRole(profileData?.role || 'student_general');
          setTokenInstitutionId(claimInstitutionId);
        }
      } catch (_) {
        if (!cancelled) {
          setUserProfile(null);
          setUserRole('student_general');
          setTokenInstitutionId(claimInstitutionId);
        }
      }
    }
    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const notifyInstitutionAccessDenied = () => {
    setUiMessage('Institution access required.');
    window.setTimeout(() => setUiMessage(''), 2600);
  };

  const canAccessAdmin = useMemo(() => {
    return (
      institutionAdminAllowedRoles.includes(userRole) ||
      Boolean(userProfile?.institutionId) ||
      Boolean(tokenInstitutionId)
    );
  }, [userRole, userProfile?.institutionId, tokenInstitutionId]);
  const activeDepartmentId = userProfile?.departmentId || 'general';
  const activeDepartmentName = userProfile?.departmentName || (activeDepartmentId === 'general' ? 'General' : activeDepartmentId);

  const handleAdminClick = (navigate) => {
    if (!canAccessAdmin) {
      notifyInstitutionAccessDenied();
      return;
    }
    sessionStorage.setItem('institution_admin_entry', 'sidebar');
    navigate('/admin');
    if (isMobile) setSidebarOpen(false);
  };

  return (
    <BrowserRouter basename="/institution">
      <div className="min-h-screen bg-slate-950 text-slate-100 flex overflow-hidden">
        {uiMessage ? (
          <div className="fixed top-3 left-1/2 z-50 -translate-x-1/2 rounded border border-amber-500/40 bg-amber-900/60 px-4 py-2 text-xs text-amber-100">
            {uiMessage}
          </div>
        ) : null}
        {isMobile && isSidebarOpen ? (
          <div
            className="fixed inset-0 z-30 bg-black/60 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        ) : null}
        <Sidebar
          isOpen={isSidebarOpen}
          isMobile={isMobile}
          onToggle={() => setSidebarOpen((v) => !v)}
          canAccessAdmin={canAccessAdmin}
          onAdminClick={handleAdminClick}
        />
        <div className="flex-1 min-w-0">
          <div className="relative">
            <Topbar />
            <button
              type="button"
              onClick={() => setSidebarOpen((v) => !v)}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-lg border border-white/10 bg-slate-900/80 text-sky-300 hover:bg-white/5"
            >
              <Menu size={18} />
            </button>
          </div>
          <main className="p-6">
            <Routes>
              <Route path="/" element={<InstitutionAdminDashboard user={user} userProfile={userProfile} userRole={userRole} />} />
              <Route
                path="/search"
                element={(
                  <InstitutionHome
                    user={user}
                    userProfile={userProfile}
                    userRole={userRole}
                    activeDepartmentId={activeDepartmentId}
                    activeDepartmentName={activeDepartmentName}
                  />
                )}
              />
              <Route path="/newchat" element={<Navigate to="/search" replace />} />
              <Route path="/newchat/*" element={<Navigate to="/search" replace />} />
              <Route path="/notebook" element={<Notebook user={user} />} />
              <Route path="/announcements" element={<Announcements />} />
              <Route path="/planning" element={<Planning />} />
              <Route path="/students" element={<Students />} />
              <Route path="/courses" element={<Courses />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/settings" element={<Settings />} />
              <Route
                path="/admin"
                element={(
                  <AdminRouteGuard canAccessAdmin={canAccessAdmin} onDenied={notifyInstitutionAccessDenied}>
                    <InstitutionAdminDashboard user={user} userProfile={userProfile} userRole={userRole} />
                  </AdminRouteGuard>
                )}
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}
