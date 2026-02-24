import React from 'react';

export default function Topbar() {
  return (
    <header className="h-14 border-b border-white/10 bg-slate-950/80 px-6 flex items-center justify-between">
      <div className="text-sm text-slate-300">Institution Admin Panel</div>
      <div className="text-xs text-slate-400">Secure Mode</div>
    </header>
  );
}
