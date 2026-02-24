import React from 'react';
import StatCard from '../components/StatCard.jsx';

export default function Dashboard() {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Total Students" value="-" />
        <StatCard label="Active Courses" value="-" />
        <StatCard label="Open Cases" value="-" />
      </div>
    </div>
  );
}
