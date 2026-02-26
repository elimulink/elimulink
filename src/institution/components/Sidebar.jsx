import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Search, MessageSquarePlus, NotebookPen, Megaphone, CalendarDays, Settings, Shield } from 'lucide-react';

const links = [
  { to: '/search', label: 'Home', icon: Home },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/search', label: 'NewChat', icon: MessageSquarePlus },
  { to: '/notebook', label: 'Notebook', icon: NotebookPen },
  { to: '/announcements', label: 'Announcements', icon: Megaphone },
  { to: '/planning', label: 'Planning / Diary', icon: CalendarDays },
];

export default function Sidebar({ isOpen = true, isMobile = false, onToggle = null, canAccessAdmin = false, onAdminClick = null }) {
  const navigate = useNavigate();

  return (
    <aside
      className={
        isMobile
          ? `fixed top-0 left-0 z-40 h-full w-full max-w-xs border-r border-white/10 bg-slate-900/90 p-4 transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`
          : `${isOpen ? 'w-64' : 'w-20'} border-r border-white/10 bg-slate-900/60 p-4 transition-all duration-300 shrink-0`
      }
    >
      <div className="h-full flex flex-col justify-between">
        <div>
          <h1 className="text-lg font-bold text-sky-300 mb-4">{isMobile || isOpen ? 'Institution' : 'EL'}</h1>
          <nav className="space-y-2">
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === '/'}
                  onClick={() => {
                    if (isMobile && onToggle) onToggle();
                  }}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded px-3 py-2 text-sm ${isActive ? 'bg-sky-600 text-white' : 'text-slate-300 hover:bg-white/5'} ${!isMobile && !isOpen ? 'justify-center' : ''}`
                  }
                  title={!isMobile && !isOpen ? link.label : undefined}
                >
                  <Icon size={18} />
                  {isMobile || isOpen ? link.label : null}
                </NavLink>
              );
            })}
            {canAccessAdmin ? (
              <button
                type="button"
                onClick={() => {
                  if (onAdminClick) {
                    onAdminClick(navigate);
                  } else {
                    navigate('/admin');
                  }
                }}
                className={`w-full flex items-center gap-3 rounded px-3 py-2 text-sm text-slate-300 hover:bg-white/5 ${!isMobile && !isOpen ? 'justify-center' : ''}`}
                title={!isMobile && !isOpen ? 'Admin' : undefined}
              >
                <Shield size={18} />
                {isMobile || isOpen ? 'Admin' : null}
              </button>
            ) : null}
          </nav>
        </div>
        <div className="pt-3 border-t border-white/10">
          <NavLink
            to="/settings"
            onClick={() => {
              if (isMobile && onToggle) onToggle();
            }}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded px-3 py-2 text-sm ${isActive ? 'bg-sky-600 text-white' : 'text-slate-300 hover:bg-white/5'} ${!isMobile && !isOpen ? 'justify-center' : ''}`
            }
            title={!isMobile && !isOpen ? 'Settings' : undefined}
          >
            <Settings size={18} />
            {isMobile || isOpen ? 'Settings' : null}
          </NavLink>
        </div>
      </div>
    </aside>
  );
}
