import React from 'react';

export default function StatCard({ label, value }) {
  return (
    <div className="rounded border border-white/10 bg-slate-900/60 p-4">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
