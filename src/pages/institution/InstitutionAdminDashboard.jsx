import React, { useEffect, useMemo, useState } from "react";
import { Lock, Search, FileText } from "lucide-react";
import { getDepartments } from "../../lib/institution";
import { listCases, getCaseWithMessages, addAdminRemark, updateCaseFields } from "../../lib/institutionAdmin";
import { db } from "../../lib/firebase";
import { apiUrl } from "../../lib/apiUrl";

function normalizeStatus(status) {
  const value = String(status || "").trim().toLowerCase();
  if (value === "resolved" || value === "closed") return "resolved";
  if (value === "reviewing" || value === "in_progress" || value === "in progress") return "in_progress";
  return "open";
}

function fmtTimestamp(value) {
  const date = value?.toDate?.();
  if (!date) return "--";
  return date.toLocaleString();
}

function getCurrentWeekKey() {
  const date = new Date();
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export default function InstitutionAdminDashboard({ userProfile, userRole, user }) {
  const [departments, setDepartments] = useState([]);
  const [pickedDepartmentId, setPickedDepartmentId] = useState(null);
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [cases, setCases] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [selectedCase, setSelectedCase] = useState(null);
  const [messages, setMessages] = useState([]);
  const [remark, setRemark] = useState("");
  const [status, setStatus] = useState("");
  const [rating, setRating] = useState(0);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [report, setReport] = useState(null);
  const [reportError, setReportError] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isInstitutionAdmin = userRole === "institution_admin" || userRole === "superAdmin";
  const staffDepartmentId = userProfile?.departmentId || "general";
  const canPickDepartment = (depId) => {
    if (isInstitutionAdmin) return true;
    return depId === staffDepartmentId || depId === "general";
  };
  const lockedDepartmentId = staffDepartmentId;
  const selectedDepartmentId = isInstitutionAdmin ? departmentFilter : lockedDepartmentId;
  const effectiveDepartmentId = selectedDepartmentId === "all" ? "all" : selectedDepartmentId;
  const weekKey = getCurrentWeekKey();

  const selectedDepartmentName = useMemo(() => {
    if (effectiveDepartmentId === "all") return "All departments";
    if (effectiveDepartmentId === "general") return "General";
    const dep = departments.find((d) => d.id === effectiveDepartmentId);
    return dep?.name || effectiveDepartmentId || "General";
  }, [departments, effectiveDepartmentId]);

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded border border-white/10 bg-slate-900 p-4 text-center">
          <div className="text-sm font-semibold">Please login to view admin dashboard</div>
        </div>
      </div>
    );
  }

  if (!userProfile?.institutionId) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded border border-white/10 bg-slate-900 p-4 text-center">
          <div className="text-sm font-semibold">Loading your institution dashboard...</div>
          <div className="mt-2 text-xs text-slate-400">We are still resolving your institution profile.</div>
        </div>
      </div>
    );
  }

  if (!pickedDepartmentId) {
    const list = [
      ...(isInstitutionAdmin ? [{ id: "all", name: "All departments" }] : []),
      { id: "general", name: "General" },
      ...departments.filter((d) => d.id && d.id !== "general"),
    ];

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <header className="p-4 border-b border-white/10 text-xl font-bold text-sky-400">
          Select your department
        </header>

        <div className="p-4 max-w-4xl w-full mx-auto">
          <div className="text-sm text-slate-300 mb-4">
            Tap your department to continue to the admin dashboard.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {list.map((dep) => {
              const enabled = canPickDepartment(dep.id);
              return (
                <button
                  key={dep.id}
                  disabled={!enabled}
                  onClick={() => setPickedDepartmentId(dep.id)}
                  className={`text-left rounded border p-4 transition
                    ${enabled ? "border-white/10 bg-slate-900 hover:bg-sky-900/20" : "border-white/5 bg-slate-900/40 opacity-60 cursor-not-allowed"}
                  `}
                >
                  <div className="font-semibold">{dep.name || dep.id}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    {enabled ? "Open dashboard" : "Not permitted"}
                  </div>
                </button>
              );
            })}
          </div>

          {!isInstitutionAdmin ? (
            <div className="mt-4 text-xs text-slate-400">
              Your account is limited to your department: <span className="text-sky-300">{staffDepartmentId}</span>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (!userProfile?.institutionId) return;
    getDepartments(userProfile.institutionId)
      .then((rows) => setDepartments(Array.isArray(rows) ? rows : []))
      .catch(() => setError("Failed to load departments"));
  }, [userProfile]);

  useEffect(() => {
    if (pickedDepartmentId) setDepartmentFilter(pickedDepartmentId);
  }, [pickedDepartmentId]);

  useEffect(() => {
    if (!userProfile?.institutionId) return;
    setLoading(true);

    let scopeDepartments = [];
    if (isInstitutionAdmin) {
      if (effectiveDepartmentId === "all") {
        const allIds = ["general", ...departments.map((d) => d.id).filter(Boolean)];
        scopeDepartments = Array.from(new Set(allIds));
      } else {
        scopeDepartments = [effectiveDepartmentId];
      }
    } else {
      scopeDepartments = Array.from(new Set([lockedDepartmentId, "general"]));
    }

    listCases(db, userProfile.institutionId, scopeDepartments)
      .then((rows) => setCases(Array.isArray(rows) ? rows : []))
      .catch(() => setError("Failed to load cases"))
      .finally(() => setLoading(false));
  }, [userProfile, isInstitutionAdmin, effectiveDepartmentId, departments, lockedDepartmentId]);

  useEffect(() => {
    if (!selectedCaseId || !userProfile?.institutionId) return;
    setLoading(true);
    getCaseWithMessages(db, userProfile.institutionId, selectedCaseId)
      .then((payload) => {
        const caseData = payload?.caseData || null;
        const caseMessages = payload?.messages || [];
        setSelectedCase(caseData);
        setMessages(caseMessages);
        setStatus(caseData?.status || "open");
        setRating(caseData?.rating || 0);
      })
      .catch(() => setError("Failed to load case"))
      .finally(() => setLoading(false));
  }, [selectedCaseId, userProfile]);

  const filteredCases = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return cases.filter((c) => {
      const statusOk =
        statusFilter === "all" ||
        (statusFilter === "open" && normalizeStatus(c.status) === "open") ||
        (statusFilter === "in_progress" && normalizeStatus(c.status) === "in_progress") ||
        (statusFilter === "resolved" && normalizeStatus(c.status) === "resolved");
      if (!statusOk) return false;
      if (!q) return true;
      const searchable = `${c.studentId || ""} ${c.lastMessageSnippet || c.lastMessage || c.preview || ""}`.toLowerCase();
      return searchable.includes(q);
    });
  }, [cases, searchText, statusFilter]);

  const summary = useMemo(() => {
    const totalCases = cases.length;
    const openCases = cases.filter((c) => normalizeStatus(c.status) === "open").length;
    const resolvedCases = cases.filter((c) => normalizeStatus(c.status) === "resolved").length;
    const ratings = cases.map((c) => Number(c.rating)).filter((n) => Number.isFinite(n) && n > 0);
    const avgRating = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2) : "0.00";
    return { totalCases, openCases, resolvedCases, avgRating };
  }, [cases]);

  const loadWeeklyReport = async () => {
    if (!user || !userProfile?.institutionId) return;
    setReportLoading(true);
    setReportError("");
    try {
      const token = await user.getIdToken();
      const url = apiUrl(`/api/reports/weekly?departmentId=${encodeURIComponent(effectiveDepartmentId || "general")}&weekKey=${encodeURIComponent(weekKey)}`);
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Failed to load report");
      setReport(data?.report || null);
    } catch (e) {
      setReportError(String(e?.message || e || "Failed to load report"));
    } finally {
      setReportLoading(false);
    }
  };

  const generateWeeklyReport = async () => {
    if (!user || !userProfile?.institutionId) return;
    setReportLoading(true);
    setReportError("");
    try {
      const token = await user.getIdToken();
      const response = await fetch(apiUrl("/api/reports/weekly/generate"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          departmentId: effectiveDepartmentId || "general",
          weekKey,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Failed to generate report");
      setReport(data?.report || null);
    } catch (e) {
      setReportError(String(e?.message || e || "Failed to generate report"));
    } finally {
      setReportLoading(false);
    }
  };

  useEffect(() => {
    loadWeeklyReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveDepartmentId, userProfile?.institutionId]);

  const handleRemarkSend = async () => {
    if (!remark.trim() || !selectedCaseId) return;
    try {
      await addAdminRemark(db, userProfile.institutionId, selectedCaseId, {
        from: "admin",
        text: remark,
        visibility: "internal",
      });
      setRemark("");
      const payload = await getCaseWithMessages(db, userProfile.institutionId, selectedCaseId);
      setMessages(payload?.messages || []);
    } catch (e) {
      setError("Failed to add remark");
    }
  };

  const handleStatusChange = async (e) => {
    const value = e.target.value;
    setStatus(value);
    try {
      await updateCaseFields(db, userProfile.institutionId, selectedCaseId, { status: value });
    } catch (e2) {
      setError("Failed to update status");
    }
  };

  const handleRatingChange = async (value) => {
    setRating(value);
    try {
      await updateCaseFields(db, userProfile.institutionId, selectedCaseId, { rating: value });
    } catch (e) {
      setError("Failed to update rating");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="p-4 border-b border-white/10 text-xl font-bold text-sky-400">Institution Admin Dashboard</header>
      {error ? <div className="bg-red-900 text-red-300 p-2 text-xs">{error}</div> : null}

      <section className="p-4 border-b border-white/10">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="inline-flex items-center gap-2 rounded border border-sky-500/40 bg-sky-900/20 px-3 py-2 text-sm">
            <Lock size={14} />
            <span>Viewing: <strong>{selectedDepartmentName}</strong></span>
            {!isInstitutionAdmin ? <span className="ml-2 rounded bg-slate-800 px-2 py-0.5 text-[10px] uppercase">Locked</span> : null}
          </div>
          <div className="flex items-center gap-2">
            {isInstitutionAdmin ? (
              <select
                className="bg-slate-900 border border-white/10 rounded px-3 py-2 text-sm text-slate-200"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
              >
                <option value="all">All departments</option>
                <option value="general">General</option>
                {departments
                  .filter((d) => d.id !== "general")
                  .map((d) => <option key={d.id} value={d.id}>{d.name || d.id}</option>)}
              </select>
            ) : null}
            <button
              className="text-xs px-3 py-2 rounded border border-white/10 hover:bg-white/5"
              onClick={() => setPickedDepartmentId(null)}
            >
              Change department
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded border border-white/10 bg-slate-900 p-3">
            <div className="text-xs text-slate-400">Total cases</div>
            <div className="text-2xl font-semibold">{summary.totalCases}</div>
          </div>
          <div className="rounded border border-white/10 bg-slate-900 p-3">
            <div className="text-xs text-slate-400">Open cases</div>
            <div className="text-2xl font-semibold">{summary.openCases}</div>
          </div>
          <div className="rounded border border-white/10 bg-slate-900 p-3">
            <div className="text-xs text-slate-400">Resolved cases</div>
            <div className="text-2xl font-semibold">{summary.resolvedCases}</div>
          </div>
          <div className="rounded border border-white/10 bg-slate-900 p-3">
            <div className="text-xs text-slate-400">Avg rating</div>
            <div className="text-2xl font-semibold">{summary.avgRating}</div>
          </div>
        </div>
      </section>

      <div className="flex flex-1 flex-col md:flex-row">
        <aside className="md:w-2/5 border-r border-white/10 p-4 overflow-y-auto">
          <div className="mb-3 flex items-center gap-2 rounded border border-white/10 bg-slate-900 px-3">
            <Search size={14} className="text-slate-500" />
            <input
              className="w-full bg-transparent py-2 text-sm outline-none"
              placeholder="Search by studentId or snippet"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {[
              { id: "all", label: "All" },
              { id: "open", label: "Open" },
              { id: "in_progress", label: "In progress" },
              { id: "resolved", label: "Resolved" },
            ].map((chip) => (
              <button
                key={chip.id}
                className={`rounded-full border px-3 py-1 text-xs ${statusFilter === chip.id ? "bg-sky-600 border-sky-500 text-white" : "border-white/10 text-slate-300 hover:bg-white/5"}`}
                onClick={() => setStatusFilter(chip.id)}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {loading ? <div className="text-xs text-slate-400">Loading...</div> : null}
          {!loading && !filteredCases.length ? (
            <div className="rounded border border-white/10 bg-slate-900 p-6 text-center text-slate-400">
              <FileText size={20} className="mx-auto mb-2 text-slate-500" />
              <div className="text-sm">No cases for your department yet</div>
            </div>
          ) : null}

          <div className="space-y-2">
            {filteredCases.map((c) => (
              <div
                key={c.id}
                className={`cursor-pointer rounded border p-3 ${selectedCaseId === c.id ? "bg-sky-900/40 border-sky-500" : "bg-slate-900 border-white/5 hover:bg-sky-900/20"}`}
                onClick={() => setSelectedCaseId(c.id)}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-mono text-xs text-sky-300">{c.studentId || "unknown"}</div>
                  <div className="text-[10px] text-slate-500">{fmtTimestamp(c.lastUpdated)}</div>
                </div>
                <div className="mt-1 text-[11px] text-slate-300 truncate">{c.lastMessageSnippet || c.lastMessage || c.preview || "No snippet"}</div>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`rounded px-2 py-0.5 text-xs font-bold ${normalizeStatus(c.status) === "resolved" ? "bg-emerald-700" : normalizeStatus(c.status) === "in_progress" ? "bg-amber-700" : "bg-sky-700"}`}>
                    {normalizeStatus(c.status).replace("_", " ")}
                  </span>
                  {Number(c.rating) > 0 ? <span className="text-xs text-amber-400">* {c.rating}</span> : <span className="text-xs text-slate-500">No rating</span>}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <main className="flex-1 p-4 flex flex-col gap-4">
          <section className="rounded border border-white/10 bg-slate-900 p-3">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm font-semibold">Department AI Reports</div>
                <div className="text-xs text-slate-400">Last generated: {report?.createdAt?.toDate?.()?.toLocaleString?.() || "--"}</div>
              </div>
              <button
                className="rounded bg-sky-500 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                onClick={generateWeeklyReport}
                disabled={reportLoading || !user}
              >
                {reportLoading ? "Generating..." : "Generate Weekly Report"}
              </button>
            </div>
            {reportError ? <div className="mt-2 text-xs text-red-300">{reportError}</div> : null}
            {report ? (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-5">
                  <div className="rounded border border-white/10 p-2">Total: {report?.metrics?.totalCases ?? 0}</div>
                  <div className="rounded border border-white/10 p-2">Open: {report?.metrics?.openCases ?? 0}</div>
                  <div className="rounded border border-white/10 p-2">Resolved: {report?.metrics?.resolvedCases ?? 0}</div>
                  <div className="rounded border border-white/10 p-2">Avg rating: {report?.metrics?.avgRating ?? 0}</div>
                  <div className="rounded border border-white/10 p-2">New this week: {report?.metrics?.newCasesThisWeek ?? 0}</div>
                </div>
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                  <div>
                    <div className="mb-1 text-xs uppercase text-slate-400">Top Issues</div>
                    <ul className="space-y-1 text-xs text-slate-200">
                      {(report?.insights?.topIssues || []).slice(0, 4).map((issue, i) => (
                        <li key={`${i}-issue`}>- {issue?.title || "Issue"} ({issue?.count || 0})</li>
                      ))}
                      {!(report?.insights?.topIssues || []).length ? <li>- No issues yet</li> : null}
                    </ul>
                  </div>
                  <div>
                    <div className="mb-1 text-xs uppercase text-slate-400">Risk Flags</div>
                    <ul className="space-y-1 text-xs text-slate-200">
                      {(report?.insights?.riskFlags || []).slice(0, 4).map((flag, i) => (
                        <li key={`${i}-risk`}>- {flag?.studentId || "Unknown"}: {flag?.reason || "No reason"}</li>
                      ))}
                      {!(report?.insights?.riskFlags || []).length ? <li>- No risk flags</li> : null}
                    </ul>
                  </div>
                  <div>
                    <div className="mb-1 text-xs uppercase text-slate-400">Recommendations</div>
                    <ul className="space-y-1 text-xs text-slate-200">
                      {(report?.insights?.recommendations || []).slice(0, 5).map((item, i) => (
                        <li key={`${i}-rec`}>- {String(item)}</li>
                      ))}
                      {!(report?.insights?.recommendations || []).length ? <li>- I don't have enough institutional data for that.</li> : null}
                    </ul>
                  </div>
                </div>
              </div>
            ) : null}
          </section>

          {selectedCase ? (
            <div className="flex h-full flex-col rounded border border-white/10 bg-slate-900 p-4">
              <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center">
                <div className="min-w-0">
                  <div className="text-xs text-slate-400">Case</div>
                  <div className="truncate font-mono text-sm text-sky-300">{selectedCase.id}</div>
                  <div className="text-xs text-slate-500">Student: {selectedCase.studentId || "--"} | Updated: {fmtTimestamp(selectedCase.lastUpdated)}</div>
                </div>
                <div>
                  <label className="mr-2 text-xs text-slate-400">Status</label>
                  <select value={status} onChange={handleStatusChange} className="rounded border border-white/10 bg-slate-950 p-1 text-sm text-slate-200">
                    <option value="open">Open</option>
                    <option value="reviewing">In progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                <div>
                  <label className="mr-2 text-xs text-slate-400">Rating</label>
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button key={val} className={`mx-0.5 ${rating >= val ? "text-amber-400" : "text-slate-500"}`} onClick={() => handleRatingChange(val)}>*</button>
                  ))}
                </div>
              </div>

              <div className="mb-3 rounded border border-white/10 bg-slate-950 p-3">
                <div className="mb-2 text-xs text-slate-400">AI Suggestions</div>
                <div className="text-xs text-slate-300">Suggestions will appear here based on report insights.</div>
              </div>

              <div className="mb-4 flex-1 space-y-3 overflow-y-auto rounded border border-white/10 bg-slate-950 p-4">
                {messages.map((m) => (
                  <div key={m.id} className="rounded border border-white/10 bg-slate-900 p-2">
                    <div className="mb-1 text-xs text-slate-400">
                      {m.from} <span className="text-[10px] text-slate-500">{fmtTimestamp(m.createdAt)}</span>
                    </div>
                    <div className={`text-sm ${m.from === "admin" ? "text-sky-200" : "text-slate-100"}`}>{m.text}</div>
                  </div>
                ))}
              </div>

              <div className="mt-auto flex gap-2">
                <input
                  className="flex-1 rounded border border-white/10 bg-slate-800 p-2 text-slate-200"
                  placeholder="Add a remark..."
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleRemarkSend(); }}
                />
                <button className="rounded bg-sky-500 px-4 py-2 text-white" onClick={handleRemarkSend}>Send</button>
              </div>
            </div>
          ) : (
            <div className="rounded border border-white/10 bg-slate-900 p-4 text-sm text-slate-400">Select a case to view details.</div>
          )}
        </main>
      </div>
    </div>
  );
}
