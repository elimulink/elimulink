import { useMemo, useState } from "react";
import {
  BookOpen,
  Upload,
  Wand2,
  Sigma,
  PenLine,
  GraduationCap,
  ClipboardList,
  ListChecks,
  CalendarClock,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  PanelRightClose,
  PanelRightOpen,
  FileText,
  Lightbulb,
} from "lucide-react";

const TABS = [
  { key: "my", label: "My Assignments", icon: ListChecks },
  { key: "tools", label: "AI Tools", icon: Sparkles },
  { key: "exam", label: "Exam Prep", icon: GraduationCap },
];

const TOOLS = [
  { key: "homework", label: "Homework Helper", icon: BookOpen },
  { key: "upload", label: "Upload & Analyze", icon: Upload },
  { key: "writing", label: "Writing Assistant", icon: Wand2 },
  { key: "stem", label: "STEM Assistant", icon: Sigma },
  { key: "essay", label: "Essay Planner & Draft Builder", icon: PenLine },
];

function Pill({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={[
        "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition",
        active
          ? "bg-indigo-600 text-white shadow-sm"
          : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Card({ title, subtitle, icon: Icon, right, children }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {Icon ? (
              <span className="h-9 w-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700">
                <Icon size={18} />
              </span>
            ) : null}
            <div className="text-sm font-semibold text-slate-900">{title}</div>
          </div>
          {subtitle ? <div className="mt-1 text-xs text-slate-500">{subtitle}</div> : null}
        </div>
        {right ? right : null}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Input({ label, value, onChange, placeholder }) {
  return (
    <label className="block">
      <div className="text-xs font-semibold text-slate-600 mb-1">{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-200"
      />
    </label>
  );
}

function Textarea({ label, value, onChange, placeholder, rows = 6 }) {
  return (
    <label className="block">
      <div className="text-xs font-semibold text-slate-600 mb-1">{label}</div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-200"
      />
    </label>
  );
}

function PrimaryButton({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 shadow-sm"
    >
      {children}
    </button>
  );
}

function GhostButton({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
    >
      {children}
    </button>
  );
}

function ToolButton({ active, icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className={[
        "w-full flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
        active ? "bg-indigo-600 text-white shadow-sm" : "text-slate-700 hover:bg-slate-100",
      ].join(" ")}
    >
      <span className="h-9 w-9 rounded-xl bg-white/25 border border-white/20 flex items-center justify-center">
        <Icon size={18} />
      </span>
      <span className="font-semibold">{label}</span>
    </button>
  );
}

function StatusBadge({ status }) {
  const map = {
    "Not Started": { cls: "bg-slate-100 text-slate-700", Icon: Clock },
    "In Progress": { cls: "bg-amber-100 text-amber-700", Icon: AlertTriangle },
    Submitted: { cls: "bg-emerald-100 text-emerald-700", Icon: CheckCircle2 },
  };
  const cfg = map[status] || map["Not Started"];
  return (
    <span className={["inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold", cfg.cls].join(" ")}>
      <cfg.Icon size={14} />
      {status}
    </span>
  );
}

export default function AssignmentsPage() {
  const [tab, setTab] = useState("my");
  const [tool, setTool] = useState("homework");
  const [rightOpen, setRightOpen] = useState(true);

  const [history, setHistory] = useState([
    { t: "Homework Helper", d: "Opened step-by-step plan for an assignment." },
    { t: "Writing Assistant", d: "Selected clarity + structure improvements." },
  ]);

  const assignments = useMemo(
    () => [
      { id: "ASSG-1021", title: "Biology 101: Cell Structure", course: "Biology 101", due: "Fri 5:00 PM", status: "In Progress" },
      { id: "ASSG-1140", title: "History 202: Essay Outline", course: "History 202", due: "Mon 9:00 AM", status: "Not Started" },
      { id: "ASSG-1207", title: "CSC 110: Arrays Worksheet", course: "CSC 110", due: "Wed 11:59 PM", status: "Submitted" },
    ],
    []
  );

  function logAction(title, detail) {
    setHistory((h) => [{ t: title, d: detail }, ...h].slice(0, 12));
  }

  const [homeworkQuestion, setHomeworkQuestion] = useState("");
  const [homeworkPlan, setHomeworkPlan] = useState([
    "Restate the question in your own words.",
    "Identify the topic + key definitions or formulas.",
    "Solve step-by-step and explain why each step is valid.",
    "Check your final answer (units, logic, example).",
  ]);

  const [files, setFiles] = useState([]);
  const [uploadPrompt, setUploadPrompt] = useState("");

  const [writingGoal, setWritingGoal] = useState("Improve clarity and academic tone.");
  const [writingText, setWritingText] = useState("");

  const [stemMode, setStemMode] = useState("math");
  const [stemText, setStemText] = useState("");

  const [essayTopic, setEssayTopic] = useState("");
  const [essayOutline, setEssayOutline] = useState([
    "Introduction: context + thesis",
    "Body 1: main point + evidence",
    "Body 2: main point + evidence",
    "Counterpoint + response",
    "Conclusion: summary + insight",
  ]);

  const [examCourse, setExamCourse] = useState("Biology 101");
  const [weeks, setWeeks] = useState("2");

  function MyAssignments() {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-lg font-extrabold text-slate-900">My Assignments</div>
            <div className="text-sm text-slate-600">Track deadlines and progress.</div>
          </div>
          <PrimaryButton
            onClick={() => {
              logAction("My Assignments", "Clicked New Assignment (wire later).");
              alert("Create assignment (backend later)");
            }}
          >
            <ClipboardList size={16} />
            New
          </PrimaryButton>
        </div>

        <Card title="Assignment List" subtitle="Open tools for any assignment" icon={ListChecks}>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-slate-500">
                <tr className="text-left border-b border-slate-200">
                  <th className="py-2 pr-3 font-semibold">ID</th>
                  <th className="py-2 pr-3 font-semibold">Title</th>
                  <th className="py-2 pr-3 font-semibold">Course</th>
                  <th className="py-2 pr-3 font-semibold">Due</th>
                  <th className="py-2 pr-3 font-semibold">Status</th>
                  <th className="py-2 pr-3 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => (
                  <tr key={a.id} className="border-b border-slate-100">
                    <td className="py-3 pr-3 text-slate-700">{a.id}</td>
                    <td className="py-3 pr-3 text-slate-900 font-semibold">{a.title}</td>
                    <td className="py-3 pr-3 text-slate-700">{a.course}</td>
                    <td className="py-3 pr-3 text-slate-700">{a.due}</td>
                    <td className="py-3 pr-3">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="py-3 pr-3 text-right">
                      <GhostButton
                        onClick={() => {
                          setTab("tools");
                          setTool("homework");
                          logAction("AI Tools", `Opened tools for: ${a.title}`);
                        }}
                      >
                        Open Tools →
                      </GhostButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  }

  function Tools() {
    return (
      <div className="grid grid-cols-12 gap-4 min-h-0">
        <div className="col-span-12 lg:col-span-3 min-h-0">
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
              <div className="text-sm font-extrabold text-slate-900">AI Tools</div>
              <div className="text-xs text-slate-500">Guidance + explanations (academic-safe).</div>
            </div>
            <div className="p-2 space-y-2">
              {TOOLS.map((t) => (
                <ToolButton key={t.key} active={tool === t.key} icon={t.icon} label={t.label} onClick={() => setTool(t.key)} />
              ))}
            </div>
            <div className="mt-auto p-3 border-t border-slate-200 bg-white text-xs text-slate-600">
              Tip: Ask for steps, examples, and verification.
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-6 space-y-4 min-h-0">
          {tool === "homework" ? (
            <Card
              title="Homework Helper"
              subtitle="Breakdown logic + step-by-step guidance"
              icon={BookOpen}
              right={
                <PrimaryButton
                  onClick={() => {
                    logAction("Homework Helper", "Generated a fresh plan (mock).");
                    setHomeworkPlan([
                      "Restate the problem clearly (what is being asked).",
                      "List known facts from your notes.",
                      "Solve step-by-step and explain each step.",
                      "Verify with a quick check or example.",
                    ]);
                  }}
                >
                  <Lightbulb size={16} />
                  Generate Plan
                </PrimaryButton>
              }
            >
              <div className="space-y-4">
                <Textarea
                  label="Paste the homework question"
                  value={homeworkQuestion}
                  onChange={setHomeworkQuestion}
                  placeholder="Example: Explain the role of mitochondria in energy production..."
                  rows={5}
                />
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-bold text-slate-900">Suggested approach</div>
                  <div className="mt-2 space-y-2 text-sm text-slate-700">
                    {homeworkPlan.map((x, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="text-slate-400">•</span>
                        <span>{x}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ) : null}

          {tool === "upload" ? (
            <Card
              title="Upload & Analyze"
              subtitle="Upload and get explanation + improvement suggestions"
              icon={Upload}
              right={
                <PrimaryButton
                  onClick={() => {
                    logAction("Upload & Analyze", "Analyzed upload (backend later).");
                    alert("Analyze (backend later)");
                  }}
                >
                  <Sparkles size={16} />
                  Analyze
                </PrimaryButton>
              }
            >
              <div className="space-y-4">
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-slate-900">Drop files here</div>
                      <div className="text-xs text-slate-600">Images, PDF, DOCX (wired later)</div>
                    </div>
                    <GhostButton
                      onClick={() => {
                        const name = `Question_${Math.floor(Math.random() * 999)}.jpg`;
                        setFiles((f) => [name, ...f]);
                        logAction("Upload & Analyze", `Added file: ${name}`);
                      }}
                    >
                      <FileText size={16} />
                      Add sample
                    </GhostButton>
                  </div>
                  {files.length ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {files.map((n) => (
                        <span
                          key={n}
                          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
                        >
                          {n}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4 text-sm text-slate-500">No uploads yet.</div>
                  )}
                </div>

                <Textarea
                  label="What should the analysis focus on?"
                  value={uploadPrompt}
                  onChange={setUploadPrompt}
                  placeholder="Example: Explain what it tests, show steps, then suggest how to present the final answer."
                  rows={4}
                />
              </div>
            </Card>
          ) : null}

          {tool === "writing" ? (
            <Card
              title="Writing Assistant"
              subtitle="Grammar • Structure • Clarity • Citation suggestions"
              icon={Wand2}
              right={
                <PrimaryButton
                  onClick={() => {
                    logAction("Writing Assistant", "Run improvements (backend later).");
                    alert("Improve writing (backend later)");
                  }}
                >
                  <Sparkles size={16} />
                  Improve
                </PrimaryButton>
              }
            >
              <div className="space-y-4">
                <Input
                  label="Goal"
                  value={writingGoal}
                  onChange={setWritingGoal}
                  placeholder="Example: Improve clarity and academic tone."
                />
                <Textarea
                  label="Paste your draft"
                  value={writingText}
                  onChange={setWritingText}
                  placeholder="Paste a paragraph or essay..."
                  rows={8}
                />
              </div>
            </Card>
          ) : null}

          {tool === "stem" ? (
            <Card
              title="STEM Assistant"
              subtitle="Math + Code help with step explanations"
              icon={Sigma}
              right={
                <PrimaryButton
                  onClick={() => {
                    logAction("STEM Assistant", "Solve with steps (backend later).");
                    alert("Solve with steps (backend later)");
                  }}
                >
                  <Sparkles size={16} />
                  Solve
                </PrimaryButton>
              }
            >
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Pill active={stemMode === "math"} onClick={() => setStemMode("math")}>
                    <Sigma size={16} /> Math
                  </Pill>
                  <Pill active={stemMode === "code"} onClick={() => setStemMode("code")}>
                    <FileText size={16} /> Code
                  </Pill>
                </div>
                <Textarea
                  label={stemMode === "math" ? "Enter your math problem" : "Paste your code or error"}
                  value={stemText}
                  onChange={setStemText}
                  placeholder={stemMode === "math" ? "Example: Solve x^2 - 5x + 6 = 0" : "Example: Error: TypeError..."}
                  rows={8}
                />
              </div>
            </Card>
          ) : null}

          {tool === "essay" ? (
            <Card
              title="Essay Planner & Draft Builder"
              subtitle="Plan before writing: thesis, outline, arguments, evidence"
              icon={PenLine}
              right={
                <PrimaryButton
                  onClick={() => {
                    logAction("Essay Builder", "Generated outline (mock).");
                    setEssayOutline([
                      "Hook + context + thesis",
                      "Argument 1: point + evidence + explanation",
                      "Argument 2: point + evidence + explanation",
                      "Counterpoint + rebuttal",
                      "Conclusion: restate thesis + implications",
                    ]);
                  }}
                >
                  <Lightbulb size={16} />
                  Generate
                </PrimaryButton>
              }
            >
              <div className="space-y-4">
                <Input
                  label="Topic"
                  value={essayTopic}
                  onChange={setEssayTopic}
                  placeholder="Example: Effects of social media on study habits"
                />
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-bold text-slate-900">Outline</div>
                  <div className="mt-2 space-y-2 text-sm text-slate-700">
                    {essayOutline.map((x, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="text-slate-400">•</span>
                        <span>{x}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ) : null}
        </div>

        <div className="col-span-12 lg:col-span-3 min-h-0">
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <div className="text-sm font-extrabold text-slate-900">Guidance & History</div>
                <div className="text-xs text-slate-500">Academic-safe usage</div>
              </div>
              <button
                onClick={() => setRightOpen((v) => !v)}
                className="h-9 w-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                title={rightOpen ? "Collapse" : "Expand"}
              >
                {rightOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
              </button>
            </div>

            {rightOpen ? (
              <div className="p-4 space-y-4 overflow-auto">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  Prefer explanations and steps over shortcuts. Use Writing Assistant for clarity and citations.
                </div>

                <div className="space-y-2">
                  {history.map((h, i) => (
                    <div key={i} className="rounded-2xl border border-slate-200 bg-white p-3">
                      <div className="text-sm font-bold text-slate-900">{h.t}</div>
                      <div className="mt-1 text-xs text-slate-600">{h.d}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 text-sm text-slate-500">Collapsed.</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  function ExamPrep() {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-lg font-extrabold text-slate-900">Exam Prep</div>
            <div className="text-sm text-slate-600">Study plan + practice (backend later).</div>
          </div>
          <PrimaryButton
            onClick={() => {
              logAction("Exam Prep", "Generate study plan (backend later).");
              alert("Generate plan (backend later)");
            }}
          >
            <Sparkles size={16} />
            Generate Plan
          </PrimaryButton>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card title="Course" subtitle="Select what you are preparing for" icon={BookOpen}>
            <Input label="Course" value={examCourse} onChange={setExamCourse} placeholder="Biology 101" />
          </Card>

          <Card title="Timeline" subtitle="Weeks until the exam" icon={CalendarClock}>
            <Input label="Weeks" value={weeks} onChange={setWeeks} placeholder="2" />
          </Card>

          <Card title="Practice" subtitle="Choose a practice format" icon={GraduationCap}>
            <div className="grid grid-cols-1 gap-2">
              {["MCQ", "Short Answer", "Essay"].map((x) => (
                <button
                  key={x}
                  onClick={() => {
                    logAction("Exam Prep", `Selected practice: ${x}`);
                    alert(`Generate ${x} (backend later)`);
                  }}
                  className="rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 p-3 text-left"
                >
                  <div className="text-sm font-bold text-slate-900">{x}</div>
                  <div className="text-xs text-slate-600">Questions + marking guide later.</div>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xl font-extrabold text-slate-900">Assignments</div>
          <div className="text-sm text-slate-600">
            Guidance-first tools: explanations, structure, and learning support.
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <Pill key={t.key} active={tab === t.key} onClick={() => setTab(t.key)}>
                <Icon size={16} />
                {t.label}
              </Pill>
            );
          })}
        </div>
      </div>

      <div className="mt-5">
        {tab === "my" ? <MyAssignments /> : null}
        {tab === "tools" ? <Tools /> : null}
        {tab === "exam" ? <ExamPrep /> : null}
      </div>
    </div>
  );
}
