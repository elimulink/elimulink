import React, { useEffect, useMemo, useState } from "react";
import { listDepartmentCases, getCaseMessages, appendCaseMessage, updateCaseMeta, getInstitutionProfile } from "../../lib/institutionAdmin";

function maskStudentId(id) {
  if (!id) return "student";
  const s = String(id);
  if (s.length <= 4) return "***";
  return s.slice(0, 2) + "****" + s.slice(-2);
}

function AdminDashboard({
  db,
  userRole,
  institutionId,
  departmentId,
  departmentName,
  onExit
}) {
  // Permissions
  const allowed = ["staff", "departmentAdmin", "superAdmin"].includes(userRole);

  const [tab, setTab] = useState("cases");
  const [institution, setInstitution] = useState(null);

  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [messages, setMessages] = useState([]);

  const [pulseOpen, setPulseOpen] = useState(false);

  const [adminText, setAdminText] = useState("");
  const [sendMode, setSendMode] = useState("student"); // "student" | "internal"

  const [status, setStatus] = useState("open");
  const [rating, setRating] = useState(3);

  const loadColor = useMemo(() => {
    const n = cases.length;
    if (n >= 15) return "bg-red-500";
    if (n >= 7) return "bg-amber-400";
    return "bg-emerald-400";
  }, [cases.length]);

  useEffect(() => {
    if (!allowed) {
      window.history.replaceState({}, "", "/");
      window.location.reload();
      return;
    }
  }, [allowed]);

  useEffect(() => {
    (async () => {
      const inst = await getInstitutionProfile(db, institutionId);
      setInstitution(inst);
    })();
  }, [db, institutionId]);

  async function refreshCases() {
    const rows = await listDepartmentCases(db, institutionId, departmentId);
    setCases(rows);
  }

  useEffect(() => {
    if (!allowed) return;
    if (!institutionId || !departmentId) return;
    refreshCases();
    // eslint-disable-next-line
  }, [allowed, institutionId, departmentId]);

  async function openCase(c) {
    setSelectedCase(c);
    setStatus(c.status || "open");
    setRating(Number.isFinite(c.rating) ? c.rating : 3);

    const msgs = await getCaseMessages(db, institutionId, c.id);
    setMessages(msgs);
  }

  async function sendMessage() {
    if (!selectedCase || !adminText.trim()) return;

    const payload = {
      from: sendMode === "student" ? "admin" : "internal",
      visibility: sendMode === "student" ? "student" : "internal",
      text: adminText.trim()
    };

    await appendCaseMessage(db, institutionId, selectedCase.id, payload);
    setAdminText("");

    const msgs = await getCaseMessages(db, institutionId, selectedCase.id);
    setMessages(msgs);
    refreshCases();
  }

  async function saveMeta() {
    if (!selectedCase) return;
    await updateCaseMeta(db, institutionId, selectedCase.id, { status, rating });
    refreshCases();
  }

  function aiStub(action) {
    // Stub: no backend call yet
    const t =
      action === "summarize" ? "AI Summary (stub): Key concerns detected, review conversation timeline and mark status."
      : action === "suggest" ? "AI Suggest Reply (stub): Empathize, confirm details, propose next steps, and give a safe resource."
      : "AI Urgency (stub): Medium. Escalate if harmful intent or severe distress signals appear.";
    alert(t);
  }

  if (!allowed) return null;

  return (
    <div className="h-screen w-full bg-slate-950 text-slate-100 flex">
      {/* LEFT PANEL */}
      <aside className="w-80 border-r border-white/10 bg-slate-900/60 p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-bold text-sky-300">Institution Admin</div>
          <button onClick={onExit} className="text-xs text-slate-300 hover:text-white underline">Exit</button>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4 space-y-2">
          <div className="text-xs text-slate-400">Institution</div>
          <div className="font-bold">{institution?.name || "Institution"}</div>

          <div className="mt-3 text-xs text-slate-400">Department</div>
          <div className="font-bold">{departmentName || departmentId || "Department"}</div>

          <div className="mt-3 text-xs text-slate-400">Semester / Period</div>
          <div className="text-sm text-slate-200">Semester 1 (placeholder)</div>
        </div>

        {/* PULSE BUTTON */}
        <button
          onClick={() => setPulseOpen(v => !v)}
          className={`rounded-2xl ${loadColor} text-slate-950 font-black py-6 px-4 relative overflow-hidden`}
          title="Department Pulse"
        >
          Department Pulse
          <div className="text-xs font-bold opacity-80 mt-1">Tap for summary</div>
        </button>

        {pulseOpen && (
          <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4 space-y-2">
            <div className="text-sm font-bold text-sky-200">Pulse Summary</div>
            <div className="text-xs text-slate-400">Active cases</div>
            <div className="text-lg font-black">{cases.length}</div>
            <div className="text-xs text-slate-400">Avg response time</div>
            <div className="text-sm">~ 2h (placeholder)</div>
            <div className="text-xs text-slate-400">Top issues</div>
            <ul className="text-sm list-disc ml-5 text-slate-200">
              <li>Stress / anxiety</li>
              <li>Attendance concerns</li>
              <li>Academic workload</li>
            </ul>
          </div>
        )}

        <div className="text-[10px] text-slate-500">
          Tip: Select a case to view messages and send replies/remarks.
        </div>
      </aside>

      {/* CENTER MAIN */}
      <section className="flex-1 flex flex-col">
        <header className="h-14 border-b border-white/10 flex items-center justify-between px-4 bg-slate-950/60">
          <div className="flex gap-2">
            <button onClick={() => setTab("cases")} className={`px-3 py-2 rounded-lg text-xs font-bold ${tab==="cases" ? "bg-sky-600 text-white" : "bg-white/5 text-slate-300"}`}>Cases</button>
            <button onClick={() => setTab("activity")} className={`px-3 py-2 rounded-lg text-xs font-bold ${tab==="activity" ? "bg-sky-600 text-white" : "bg-white/5 text-slate-300"}`}>Department Activity</button>
          </div>
          <button onClick={refreshCases} className="text-xs bg-white/5 px-3 py-2 rounded-lg hover:bg-white/10">Refresh</button>
        </header>

        <div className="flex-1 overflow-hidden flex">
          {/* CASE LIST */}
          <div className="w-[420px] border-r border-white/10 overflow-y-auto p-3 space-y-2">
            {cases.length === 0 && (
              <div className="text-sm text-slate-400 p-4">
                No cases found for this department.
              </div>
            )}

            {cases.map(c => (
              <button
                key={c.id}
                onClick={() => openCase(c)}
                className={`w-full text-left rounded-xl border p-3 transition ${
                  selectedCase?.id === c.id ? "border-sky-500 bg-sky-900/20" : "border-white/10 bg-white/5 hover:bg-white/10"
                }`}
              >
                <div className="text-xs text-slate-400">Student</div>
                <div className="font-bold">{maskStudentId(c.studentId)}</div>
                <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-300">
                  <span className="px-2 py-1 rounded bg-white/5">status: {c.status || "open"}</span>
                  <span className="px-2 py-1 rounded bg-white/5">sentiment: {c.sentiment || "n/a"}</span>
                  <span className="px-2 py-1 rounded bg-white/5">rating: {c.rating ?? "n/a"}</span>
                </div>
              </button>
            ))}
          </div>

          {/* CASE DETAILS */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {!selectedCase ? (
              <div className="flex-1 flex items-center justify-center text-slate-400">
                Select a case to view details.
              </div>
            ) : (
              <React.Fragment>
                <div className="p-4 border-b border-white/10 bg-slate-950/40">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-slate-400">Case</div>
                      <div className="font-black">{selectedCase.id}</div>
                    </div>

                    <div className="flex gap-2">
                      <button onClick={() => aiStub("summarize")} className="text-xs bg-white/5 px-3 py-2 rounded-lg hover:bg-white/10">Summarize Case</button>
                      <button onClick={() => aiStub("suggest")} className="text-xs bg-white/5 px-3 py-2 rounded-lg hover:bg-white/10">Suggest Reply</button>
                      <button onClick={() => aiStub("urgency")} className="text-xs bg-white/5 px-3 py-2 rounded-lg hover:bg-white/10">Assess Urgency</button>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-3">
                    <label className="text-xs text-slate-400">Status</label>
                    <select value={status} onChange={e => setStatus(e.target.value)} className="bg-slate-900 border border-white/10 rounded px-2 py-1 text-xs">
                      <option value="open">open</option>
                      <option value="in_progress">in_progress</option>
                      <option value="resolved">resolved</option>
                      <option value="escalated">escalated</option>
                    </select>

                    <label className="text-xs text-slate-400 ml-2">Rating</label>
                    <select value={rating} onChange={e => setRating(Number(e.target.value))} className="bg-slate-900 border border-white/10 rounded px-2 py-1 text-xs">
                      <option value={1}>1</option>
                      <option value={2}>2</option>
                      <option value={3}>3</option>
                      <option value={4}>4</option>
                      <option value={5}>5</option>
                    </select>

                    <button onClick={saveMeta} className="ml-auto text-xs bg-sky-600 px-3 py-2 rounded-lg font-bold hover:bg-sky-500">Save</button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.map(m => (
                    <div key={m.id} className={`max-w-[80%] rounded-xl p-3 border ${
                      m.from === "admin" ? "ml-auto bg-sky-900/20 border-sky-500/30"
                      : m.from === "internal" ? "bg-amber-900/10 border-amber-500/20"
                      : "bg-white/5 border-white/10"
                    }`}>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">{m.from}</div>
                      <div className="text-sm whitespace-pre-wrap">{m.text}</div>
                    </div>
                  ))}
                </div>

                {/* BOTTOM CHAT PANEL */}
                <div className="border-t border-white/10 p-3 bg-slate-950/60">
                  <div className="flex items-center gap-2 mb-2">
                    <button onClick={() => setSendMode("student")} className={`text-xs px-3 py-1 rounded-full ${sendMode==="student" ? "bg-sky-600" : "bg-white/5"}`}>Reply to student</button>
                    <button onClick={() => setSendMode("internal")} className={`text-xs px-3 py-1 rounded-full ${sendMode==="internal" ? "bg-amber-500 text-slate-950" : "bg-white/5"}`}>Internal remark</button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={adminText}
                      onChange={e => setAdminText(e.target.value)}
                      placeholder={sendMode==="student" ? "Type reply visible to student..." : "Internal remark (not visible to student)..."}
                      className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none"
                    />
                    <button onClick={sendMessage} className="bg-sky-600 px-4 rounded-xl font-bold text-sm hover:bg-sky-500">Send</button>
                  </div>
                </div>
              </React.Fragment>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default AdminDashboard;
