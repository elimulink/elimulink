import { useMemo, useState } from "react";
import { auth } from "../lib/firebase";
import { apiUrl } from "../lib/apiUrl";
import SettingsPage from "./SettingsPage";

const nav = [
  { key: "analytics", label: "Analytics" },
  { key: "chat", label: "Chat Space" },
  { key: "calendar", label: "Calendar" },
  { key: "subgroups", label: "Subgroups" },
  { key: "users", label: "User Management" },
  { key: "courses", label: "Course Management" },
  { key: "results", label: "Results Management" },
  { key: "attendance", label: "Attendance Monitoring" },
  { key: "finance", label: "Financial Overview" },
  { key: "announcements", label: "Announcement Control" },
  { key: "audit", label: "Audit Logs" },
  { key: "ai", label: "AI Insights" },
  { key: "settings", label: "Settings" },
];

function Card({ title, value, sub, right }) {
  return (
    <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-4 flex items-start justify-between gap-3">
      <div>
        <div className="text-sm font-semibold text-slate-800">{title}</div>
        <div className="mt-2 text-3xl font-bold text-slate-900">{value}</div>
        {sub ? <div className="mt-1 text-xs text-slate-500">{sub}</div> : null}
      </div>
      {right ? <div className="text-slate-400">{right}</div> : null}
    </div>
  );
}

function SidebarItem({ active, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className={[
        "w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2",
        active ? "bg-sky-500 text-white" : "text-slate-700 hover:bg-slate-100",
      ].join(" ")}
    >
      <span className="text-base">▣</span>
      {label}
    </button>
  );
}

function LineChart({ points }) {
  const w = 760;
  const h = 220;
  const pad = 18;

  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const scaleX = (i) => pad + (i * (w - pad * 2)) / (points.length - 1);
  const scaleY = (v) => {
    const t = (v - min) / (max - min || 1);
    return h - pad - t * (h - pad * 2);
  };

  const d = points
    .map((v, i) => `${i === 0 ? "M" : "L"} ${scaleX(i).toFixed(2)} ${scaleY(v).toFixed(2)}`)
    .join(" ");

  const areaD =
    `M ${scaleX(0)} ${h - pad} ` +
    points.map((v, i) => `L ${scaleX(i)} ${scaleY(v)}`).join(" ") +
    ` L ${scaleX(points.length - 1)} ${h - pad} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[220px]">
      {[...Array(5)].map((_, i) => {
        const y = pad + (i * (h - pad * 2)) / 4;
        return <line key={i} x1={pad} x2={w - pad} y1={y} y2={y} stroke="#e2e8f0" strokeWidth="1" />;
      })}
      <path d={areaD} fill="#0ea5e9" opacity="0.12" />
      <path d={d} fill="none" stroke="#0284c7" strokeWidth="3" />
      {points.map((v, i) => (
        <circle key={i} cx={scaleX(i)} cy={scaleY(v)} r="4" fill="#0284c7" />
      ))}
    </svg>
  );
}

function Donut({ valuePct = 62 }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const stroke = 14;
  const dash = (valuePct / 100) * c;

  return (
    <div className="flex items-center gap-4">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke="#16a34a"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          transform="rotate(-90 70 70)"
        />
        <text x="70" y="78" textAnchor="middle" fontSize="22" fontWeight="700" fill="#0f172a">
          {valuePct}%
        </text>
      </svg>

      <div className="text-sm">
        <div className="font-semibold text-slate-800">Dropout Risk Analysis</div>
        <div className="mt-2 space-y-2 text-slate-600">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-green-600" />
            Low Risk <span className="ml-auto font-semibold text-slate-800">{valuePct}%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
            Medium Risk <span className="ml-auto font-semibold text-slate-800">25%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
            High Risk <span className="ml-auto font-semibold text-slate-800">15%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminLanding({ onExitAdmin }) {
  const [active, setActive] = useState("analytics");
  const [aiInput, setAiInput] = useState("");
  const [aiMessages, setAiMessages] = useState([
    { role: "assistant", text: "Hello Admin! How can I assist you today?" },
  ]);

  const departmentName = "Department of Computer Science";

  const kpis = useMemo(
    () => ({
      enrollment: { value: "12,542", sub: "▲ 515 this semester" },
      courses: { value: "327", sub: "▲ 14% from last semester" },
      revenue: { value: "KES 45,800,000", sub: "▲ 5.2% this semester" },
      gpa: { value: "3.52", sub: "▲ 0.08 this semester" },
    }),
    []
  );

  const trendPoints = useMemo(() => [14, 18, 19, 28, 30, 31, 39, 44, 46, 45, 55, 62], []);

  const riskStudents = useMemo(
    () => [
      { id: "245678", name: "Alice Njuguna", year: 2, gpa: 2.1, attendance: "42%", risk: "High Risk" },
      { id: "234759", name: "Tony Kamau", year: 3, gpa: 1.9, attendance: "55%", risk: "High Risk" },
      { id: "229878", name: "Sarah Mwangi", year: 1, gpa: 1.6, attendance: "46%", risk: "High Risk" },
      { id: "217654", name: "Matthew Kiprono", year: 2, gpa: 2.3, attendance: "61%", risk: "Medium Risk" },
      { id: "258901", name: "Joy Wanjiku", year: 2, gpa: 2.0, attendance: "58%", risk: "Medium Risk" },
    ],
    []
  );

  async function sendAI(prompt) {
    const clean = prompt.trim();
    if (!clean) return;

    setAiMessages((m) => [...m, { role: "user", text: clean }]);
    setAiInput("");

    try {
      const token = await auth?.currentUser?.getIdToken(true).catch(() => null);
      if (!token) {
        setAiMessages((m) => [...m, { role: "assistant", text: "Please sign in to use admin AI." }]);
        return;
      }
      const res = await fetch(apiUrl("/api/admin/ai"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ prompt: clean }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAiMessages((m) => [...m, { role: "assistant", text: `Error (${res.status}): ${data?.message || data?.error || "Request failed"}` }]);
        return;
      }
      setAiMessages((m) => [...m, { role: "assistant", text: data?.text || data?.reply || "No response." }]);
    } catch {
      setAiMessages((m) => [...m, { role: "assistant", text: "Failed to reach admin AI endpoint." }]);
    }
  }

  if (active === "settings") {
    return (
      <SettingsPage onBack={() => setActive("analytics")} />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="bg-gradient-to-r from-slate-700 to-sky-500 text-white">
        <div className="mx-auto max-w-7xl px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-white/15 border border-white/20" />
            <div>
              <div className="text-2xl font-semibold leading-tight">Admin Dashboard</div>
              <div className="text-white/80 text-sm">{departmentName}</div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="h-10 w-10 rounded-full bg-white/10 border border-white/20 hover:bg-white/15" title="Notifications">
              🔔
            </button>
            <div className="h-10 w-10 rounded-full bg-white/15 border border-white/20" title="Profile" />
            <button
              onClick={onExitAdmin}
              className="rounded-xl px-4 py-2 bg-white/10 border border-white/20 hover:bg-white/15 text-sm font-semibold"
            >
              Back to Institution
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-6 grid grid-cols-12 gap-6">
        <aside className="col-span-12 md:col-span-3 lg:col-span-2">
          <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 text-xs font-semibold text-slate-500 bg-slate-50 border-b border-slate-200">
              Admin Menu
            </div>
            <nav className="p-2 space-y-1">
              {nav.map((item) => (
                <SidebarItem
                  key={item.key}
                  label={item.label}
                  active={active === item.key}
                  onClick={() => setActive(item.key)}
                />
              ))}
            </nav>
          </div>
        </aside>

        <main className="col-span-12 md:col-span-9 lg:col-span-10">
          <div className="text-lg font-semibold text-slate-900 mb-4">Admin Dashboard</div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card title="Student Enrollment" value={kpis.enrollment.value} sub={kpis.enrollment.sub} right="↗" />
            <Card title="Active Courses" value={kpis.courses.value} sub={kpis.courses.sub} right="📘" />
            <Card title="Tuition Revenue" value={kpis.revenue.value} sub={kpis.revenue.sub} right="▤" />
            <Card title="Avg. GPA" value={kpis.gpa.value} sub={kpis.gpa.sub} right="▁▃▅" />
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-800">Enrollment Trends</div>
                  <div className="text-xs text-slate-500">515 new students • 7.3% dropped out (this semester)</div>
                </div>
                <button className="text-sm px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50">
                  See All ▾
                </button>
              </div>
              <div className="p-4">
                <LineChart points={trendPoints} />
              </div>
            </div>

            <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
                <div className="text-sm font-semibold text-slate-800">AI Insights</div>
                <div className="text-xs text-slate-500">
                  AI reads student data (fees, GPA, attendance) to answer admin questions.
                </div>
              </div>

              <div className="p-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2 max-h-[230px] overflow-auto">
                  {aiMessages.map((m, idx) => (
                    <div key={idx} className="text-sm">
                      <span className="font-semibold text-slate-800">{m.role === "user" ? "You" : "AI"}:</span>{" "}
                      <span className="text-slate-700">{m.text}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-3 space-y-2">
                  {[
                    "Show me the dropout rate by department",
                    "Forecast next semester’s tuition revenue",
                    "Which year has the lowest average GPA?",
                  ].map((p) => (
                    <button
                      key={p}
                      onClick={() => sendAI(p)}
                      className="w-full text-left rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3 py-2 text-sm text-slate-800"
                    >
                      {p} →
                    </button>
                  ))}
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => sendAI("Suggest key actions to reduce dropout risk.")}
                    className="px-3 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800"
                  >
                    Suggest
                  </button>
                  <div className="flex-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <input
                      value={aiInput}
                      onChange={(e) => setAiInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") sendAI(aiInput);
                      }}
                      className="w-full outline-none text-sm text-slate-800"
                      placeholder="Type your question..."
                    />
                    <button
                      onClick={() => sendAI(aiInput)}
                      className="h-9 w-9 rounded-full bg-sky-500 text-white hover:bg-sky-600"
                      title="Send"
                    >
                      ➤
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-800">Students at Risk</div>
                  <div className="text-xs text-slate-500">52 students are at risk of dropping out soon</div>
                </div>
                <button className="text-sm px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50">
                  View All →
                </button>
              </div>

              <div className="p-4 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="text-slate-500">
                    <tr className="text-left border-b border-slate-200">
                      <th className="py-2 pr-3 font-semibold">Student ID</th>
                      <th className="py-2 pr-3 font-semibold">Name</th>
                      <th className="py-2 pr-3 font-semibold">Year</th>
                      <th className="py-2 pr-3 font-semibold">GPA</th>
                      <th className="py-2 pr-3 font-semibold">Attendance</th>
                      <th className="py-2 pr-3 font-semibold">Risk Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {riskStudents.map((s) => (
                      <tr key={s.id} className="border-b border-slate-100">
                        <td className="py-3 pr-3 text-slate-700">{s.id}</td>
                        <td className="py-3 pr-3 text-slate-900 font-medium">{s.name}</td>
                        <td className="py-3 pr-3 text-slate-700">{s.year}</td>
                        <td className="py-3 pr-3 text-slate-700">{s.gpa}</td>
                        <td className="py-3 pr-3 text-slate-700">{s.attendance}</td>
                        <td className="py-3 pr-3">
                          <span
                            className={[
                              "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
                              s.risk.includes("High")
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-700",
                            ].join(" ")}
                          >
                            {s.risk}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
                <div className="text-sm font-semibold text-slate-800">Dropout Risk Analysis</div>
                <div className="text-xs text-slate-500">Summary by risk category</div>
              </div>
              <div className="p-4">
                <Donut valuePct={62} />
              </div>
            </div>
          </div>

          <div className="mt-4 text-xs text-slate-500">
            Backend is Python/FastAPI. AI Insights endpoint connected at /api/admin/ai.
          </div>
        </main>
      </div>
    </div>
  );
}

