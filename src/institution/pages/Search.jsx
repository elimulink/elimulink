import React from 'react';

export default function Search() {
  return (
    <div className="max-w-3xl">
      <h2 className="text-xl font-semibold mb-2">Search</h2>
      <p className="text-slate-300 mb-4">Search institution resources.</p>
      <div className="rounded-xl border border-white/10 bg-slate-900/50 p-4">
        <input
          className="w-full rounded-lg bg-slate-950/60 border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-500/40"
          placeholder="Search..."
        />
      </div>
    </div>
  );
}
