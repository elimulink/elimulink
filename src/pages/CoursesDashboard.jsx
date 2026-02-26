import { useMemo, useState } from "react";

function StatCard({ title, value, sub }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4">
      <div className="text-xs font-semibold text-slate-500">{title}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
      {sub ? <div className="mt-1 text-xs text-slate-500">{sub}</div> : null}
    </div>
  );
}

function Tag({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
      {children}
    </span>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="block">
      <div className="text-[11px] font-semibold text-slate-500">{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none hover:bg-slate-50"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TabButton({ active, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className={[
        "px-4 py-2 rounded-xl text-sm font-semibold transition",
        active ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function LineChart({ points = [] }) {
  const w = 640;
  const h = 210;
  const pad = 16;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const x = (i) => pad + (i * (w - pad * 2)) / (Math.max(points.length - 1, 1));
  const y = (v) => {
    const t = (v - min) / (max - min || 1);
    return h - pad - t * (h - pad * 2);
  };
  const line = points.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(2)} ${y(v).toFixed(2)}`).join(" ");
  const area = `M ${x(0)} ${h - pad} ${points.map((v, i) => `L ${x(i)} ${y(v)}`).join(" ")} L ${x(points.length - 1)} ${h - pad} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[210px]">
      {[0, 1, 2, 3, 4].map((n) => {
        const gy = pad + (n * (h - pad * 2)) / 4;
        return <line key={n} x1={pad} x2={w - pad} y1={gy} y2={gy} stroke="#e2e8f0" strokeWidth="1" />;
      })}
      <path d={area} fill="#2563eb" opacity="0.12" />
      <path d={line} fill="none" stroke="#2563eb" strokeWidth="3" />
    </svg>
  );
}

function Bars({ values }) {
  return (
    <div className="flex items-end gap-2 h-[180px]">
      {values.map((v, i) => (
        <div key={i} className="flex-1 rounded-lg bg-slate-200" style={{ height: `${Math.max(8, (v / 100) * 180)}px` }} />
      ))}
    </div>
  );
}

function InsightsPanel({ open, onToggle, items }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden sticky top-4">
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-800">Smart Insights</div>
        <button
          onClick={onToggle}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          {open ? "Hide" : "Show"}
        </button>
      </div>
      {open ? (
        <div className="p-4 space-y-3">
          {items.map((it) => (
            <div key={it.title} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-sm font-semibold text-slate-900">{it.title}</div>
              <div className="mt-1 text-xs text-slate-600">{it.body}</div>
            </div>
          ))}
          <button className="w-full rounded-xl bg-slate-900 text-white px-4 py-2 text-sm font-semibold hover:bg-slate-800">
            Ask AI about this course
          </button>
        </div>
      ) : (
        <div className="p-4 text-xs text-slate-500">Panel hidden.</div>
      )}
    </div>
  );
}

export default function CoursesDashboard({ onBack }) {
  const [tab, setTab] = useState("personal");
  const [course, setCourse] = useState("csc210");
  const [semester, setSemester] = useState("2025_s2");
  const [dateRange, setDateRange] = useState("semester");
  const [assessmentType, setAssessmentType] = useState("all");
  const [cohort, setCohort] = useState("year2");
  const [targetRole, setTargetRole] = useState("backend");
  const [skillLevel, setSkillLevel] = useState("intermediate");
  const [insightsOpen, setInsightsOpen] = useState(true);

  const courses = useMemo(
    () => [
      { value: "csc210", label: "CSC 210: Data Structures" },
      { value: "csc220", label: "CSC 220: Databases" },
      { value: "csc230", label: "CSC 230: Operating Systems" },
    ],
    []
  );

  const insights = useMemo(() => {
    if (tab === "personal") {
      return [
        { title: "This week focus", body: "Revise Trees + Hashing and complete one lab revision set." },
        { title: "Why your grade dropped", body: "Attendance dipped during CAT week and late submissions impacted score." },
        { title: "Next best action", body: "Do 8 tree problems + attend next discussion section." },
      ];
    }
    if (tab === "global") {
      return [
        { title: "Cohort signal", body: "Concepts students struggle with (anonymized): Trees, Recursion, Hashing." },
        { title: "Assessment impact", body: "Exams currently drive pass/fail more than CAT or Lab in this cohort." },
      ];
    }
    return [
      { title: "Career move", body: "Build a portfolio project with API + data structures to increase role alignment." },
      { title: "Prerequisite graph", body: "Master recursion and hashing before advanced system design topics." },
      { title: "Internship relevance", body: "Data structures + debugging are top tags in internship postings." },
    ];
  }, [tab]);

  return (
    <div className="h-full min-h-0 flex flex-col">
      <div className="mb-3">
        <button
          type="button"
          onClick={() => onBack?.()}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          {"<"} Back to NewChat
        </button>
      </div>
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
            <SelectField label="Course" value={course} onChange={setCourse} options={courses} />
            <SelectField
              label="Semester"
              value={semester}
              onChange={setSemester}
              options={[
                { value: "2025_s1", label: "Sem 1" },
                { value: "2025_s2", label: "Sem 2" },
              ]}
            />
            <SelectField
              label="Date range"
              value={dateRange}
              onChange={setDateRange}
              options={[
                { value: "4w", label: "Last 4 weeks" },
                { value: "semester", label: "Semester" },
                { value: "custom", label: "Custom" },
              ]}
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Export</button>
            <button className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Ask AI</button>
          </div>
        </div>
      </div>

      <div className="mt-4 sticky top-0 z-10 bg-slate-100/95 backdrop-blur py-2">
        <div className="flex flex-wrap gap-2">
          <TabButton active={tab === "personal"} label="Personal Analysis" onClick={() => setTab("personal")} />
          <TabButton active={tab === "global"} label="Global Analysis" onClick={() => setTab("global")} />
          <TabButton active={tab === "career"} label="Career Advantage" onClick={() => setTab("career")} />
        </div>
      </div>

      <div className="mt-2 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        <div className="lg:col-span-2 space-y-6">
          {tab === "personal" ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard title="Current Grade" value="B+" sub="CAT average 63%" />
                <StatCard title="Attendance" value="82%" sub="Target 75%+" />
                <StatCard title="Completion" value="7/10" sub="Assignments" />
                <StatCard title="Risk Level" value="Medium" sub="Per course" />
                <StatCard title="Next-best-action" value="3 tasks" sub="Expected +8% impact" />
              </div>

              <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4">
                <div className="flex flex-col md:flex-row gap-3 md:items-end md:justify-between">
                  <div className="text-sm font-semibold text-slate-900">Grade & Attendance Trends</div>
                  <div className="grid grid-cols-2 gap-2">
                    <SelectField
                      label="Assessment"
                      value={assessmentType}
                      onChange={setAssessmentType}
                      options={[
                        { value: "all", label: "All" },
                        { value: "cat", label: "CAT" },
                        { value: "exam", label: "Exam" },
                        { value: "lab", label: "Lab" },
                      ]}
                    />
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-4">
                  <LineChart points={[48, 52, 55, 58, 60, 64, 62, 66, 68]} />
                </div>
              </div>

              <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4">
                <div className="text-sm font-semibold text-slate-900">Strengths, Weaknesses, Action Plan</div>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-sm font-semibold text-slate-900">Strength topics</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Tag>Arrays</Tag><Tag>Big-O basics</Tag><Tag>Stacks</Tag>
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-sm font-semibold text-slate-900">Weak topics</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Tag>Trees</Tag><Tag>Hashing</Tag><Tag>Graph traversal</Tag>
                    </div>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {["Revise Trees 30 mins/day", "Solve 10 hashing problems", "Attend next lab session"].map((t) => (
                    <div key={t} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">{t}</div>
                  ))}
                </div>
              </div>
            </>
          ) : null}

          {tab === "global" ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Class Average" value="58%" sub="All assessments" />
                <StatCard title="Your Percentile" value="Top 32%" sub="Cohort" />
                <StatCard title="Difficulty Index" value="7.6/10" sub="Course" />
                <StatCard title="Pass Rate" value="71%" sub="Semester" />
              </div>

              <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <SelectField
                    label="Department / Year / Group"
                    value={cohort}
                    onChange={setCohort}
                    options={[
                      { value: "year2", label: "CS Year 2" },
                      { value: "year3", label: "CS Year 3" },
                    ]}
                  />
                  <SelectField
                    label="Semester / Year"
                    value={semester}
                    onChange={setSemester}
                    options={[
                      { value: "2025_s1", label: "2025 Sem 1" },
                      { value: "2025_s2", label: "2025 Sem 2" },
                    ]}
                  />
                </div>
                <div className="mt-4 grid grid-cols-1 gap-6">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Pass-rate trend</div>
                    <LineChart points={[62, 65, 61, 70, 73, 71]} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Attendance distribution</div>
                    <Bars values={[22, 30, 44, 58, 66, 72, 69, 51, 34, 24]} />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4">
                <div className="text-sm font-semibold text-slate-900">Concepts students struggle with (anonymized)</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Tag>Trees & recursion</Tag><Tag>Hash tables</Tag><Tag>Complexity proofs</Tag>
                </div>
                <div className="mt-4 text-sm font-semibold text-slate-900">Assessment breakdown impact</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Tag>CAT 30%</Tag><Tag>Exam 55%</Tag><Tag>Lab 15%</Tag>
                </div>
              </div>
            </>
          ) : null}

          {tab === "career" ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Role Alignment" value="Backend Dev 78%" sub="Current profile" />
                <StatCard title="Skills Gained" value="8" sub="Mapped skills" />
                <StatCard title="Projects" value="3" sub="Portfolio-ready" />
                <StatCard title="Certifications" value="2" sub="Suggested" />
              </div>

              <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <SelectField
                    label="Target career path"
                    value={targetRole}
                    onChange={setTargetRole}
                    options={[
                      { value: "backend", label: "Software Eng (Backend)" },
                      { value: "data", label: "Data" },
                      { value: "ai", label: "AI" },
                      { value: "cyber", label: "Cyber" },
                    ]}
                  />
                  <SelectField
                    label="Skill level"
                    value={skillLevel}
                    onChange={setSkillLevel}
                    options={[
                      { value: "beginner", label: "Beginner" },
                      { value: "intermediate", label: "Intermediate" },
                      { value: "advanced", label: "Advanced" },
                    ]}
                  />
                </div>

                <div className="mt-4 text-sm font-semibold text-slate-900">Prerequisite graph (next learning path)</div>
                <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  Arrays/Stacks {"->"} Trees/Hashing {"->"} Graphs {"->"} System Design Foundations
                </div>

                <div className="mt-4 text-sm font-semibold text-slate-900">Internship relevance</div>
                <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  High relevance for backend internships requiring data structures, APIs, testing, and debugging.
                </div>

                <div className="mt-4 text-sm font-semibold text-slate-900">Portfolio outputs</div>
                <div className="mt-2 space-y-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">Build Library Management API (8-10 hrs)</div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">Create DSA Practice Tracker dashboard (6-8 hrs)</div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">Publish README + tests + demo screenshots</div>
                </div>
              </div>
            </>
          ) : null}
        </div>

        <div className="lg:col-span-1">
          <InsightsPanel open={insightsOpen} onToggle={() => setInsightsOpen((v) => !v)} items={insights} />
        </div>
      </div>
    </div>
  );
}
