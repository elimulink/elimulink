import {
  Archive,
  ChevronDown,
  Copy,
  FileText,
  GraduationCap,
  Menu,
  MoreHorizontal,
  PenLine,
  Rows3,
  Sparkles,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";

function ResultsSnapshotStat({ label, value, sub }) {
  return (
    <div className="rounded-[22px] border border-slate-200/80 bg-white px-4 py-4 dark:border-white/10 dark:bg-[#101c31]">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-slate-50">{value}</div>
      {sub ? <div className="mt-1 text-sm text-slate-700 dark:text-slate-300">{sub}</div> : null}
    </div>
  );
}

function ResultsTrendPreview({ snapshot }) {
  const values = [
    Math.max(Number(snapshot.gpa) || 0, 0.4),
    Math.max(Number(snapshot.cgpa) || 0, 0.4),
    Math.max((Number(snapshot.credits) || 0) / 10, 0.4),
    Math.max(snapshot.standing === "Good" ? 3.8 : snapshot.standing === "Probation" ? 1.6 : 2.8, 0.4),
  ];
  const max = Math.max(...values, 4);
  return (
    <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-[#101c31]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-600 dark:text-slate-300">Performance trend</div>
          <div className="mt-1 text-sm text-slate-700 dark:text-slate-300">A quick desktop read on GPA, credits, and current academic standing.</div>
        </div>
        <TrendingUp size={16} className="text-slate-500 dark:text-slate-300" />
      </div>
      <div className="mt-5 flex h-28 items-end gap-3">
        {values.map((value, index) => (
          <div key={index} className="flex flex-1 flex-col items-center gap-2">
            <div
              className="w-full rounded-t-[18px] bg-[linear-gradient(180deg,#2563eb_0%,#22c55e_100%)] opacity-95"
              style={{ height: `${Math.max(18, (value / max) * 100)}%` }}
            />
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600 dark:text-slate-400">
              {["GPA", "CGPA", "Credits", "Standing"][index]}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResultsWorkspaceModal({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-slate-950/30 backdrop-blur-[1px]" onClick={onClose} />
      <div className="absolute inset-x-0 top-0 mx-auto flex min-h-full max-w-3xl items-start justify-center px-4 py-10">
        <div className="w-full rounded-[30px] border border-slate-200/80 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.14)] dark:border-white/10 dark:bg-[#0d182b] dark:shadow-[0_24px_80px_rgba(2,8,23,0.45)]">
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-5 dark:border-white/10">
            <div>
              <div className="text-lg font-semibold text-slate-900 dark:text-slate-50">{title}</div>
              <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">Results desktop workspace flow.</div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <X size={18} />
            </button>
          </div>
          <div className="px-6 py-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default function ResultsDesktopLanding(props) {
  const {
    isLandingMenuOpen,
    setIsLandingMenuOpen,
    isLandingShareOpen,
    setIsLandingShareOpen,
    isLandingSettingsOpen,
    setIsLandingSettingsOpen,
    isLandingUtilityMenuOpen,
    setIsLandingUtilityMenuOpen,
    landingRowMenuId,
    setLandingRowMenuId,
    landingMoveMenuId,
    setLandingMoveMenuId,
    landingShareInvite,
    setLandingShareInvite,
    landingShareAccess,
    setLandingShareAccess,
    landingShareStatus,
    setLandingShareStatus,
    landingWorkspaceStatus,
    setLandingWorkspaceStatus,
    landingDeleteOpen,
    setLandingDeleteOpen,
    landingWorkspaceSettings,
    setLandingWorkspaceSettings,
    landingRows,
    resultsLoading,
    snapshot,
    onOpenRow,
    onPrimaryAction,
    onQuickSemester,
    onQuickTranscript,
    onQuickTrends,
    onQuickSubgroup,
    onRenameWorkspace,
    onMoveWorkspace,
    onArchiveWorkspace,
    onRenameRow,
    onMoveRow,
    onArchiveRow,
    onDeleteRow,
  } = props;

  return (
    <div className="min-h-[100dvh] bg-[linear-gradient(180deg,#f8fafc_0%,#f4f7fb_48%,#eef3f9_100%)] px-6 py-6 dark:bg-[linear-gradient(180deg,#06111f_0%,#0a1527_48%,#0c1830_100%)]">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-7xl flex-col gap-6">
        <div className="relative flex items-start justify-between gap-6 bg-transparent px-7 py-6">
          <div className="absolute -left-5 top-1" data-results-landing-menu>
            <button
              type="button"
              onClick={() => setIsLandingMenuOpen((prev) => !prev)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-[0_12px_30px_rgba(15,23,42,0.06)] hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              {isLandingMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            {isLandingMenuOpen ? (
              <div className="mt-3 w-64 rounded-[24px] border border-slate-200 bg-white p-3 shadow-[0_24px_60px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-[#0d182b] dark:shadow-[0_24px_60px_rgba(2,8,23,0.45)]">
                <button type="button" onClick={() => setIsLandingMenuOpen(false)} className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800">
                  <span>Results home</span>
                  <ChevronDown size={16} />
                </button>
                <button type="button" onClick={() => { setIsLandingMenuOpen(false); onPrimaryAction(); }} className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800">
                  <span>Open latest results</span>
                  <GraduationCap size={16} />
                </button>
                <button type="button" onClick={() => { setIsLandingMenuOpen(false); onQuickTranscript(); }} className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800">
                  <span>Transcript snapshot</span>
                  <FileText size={16} />
                </button>
              </div>
            ) : null}
          </div>

          <div className="max-w-3xl">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300">Institution Workspace</div>
            <div className="mt-3 flex items-center gap-3">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-transparent text-slate-700 dark:text-slate-100">
                <GraduationCap size={22} />
              </span>
              <div>
                <h1 className="text-3xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-slate-50">Results</h1>
                <p className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-300">
                  Review semester performance, open result breakdowns, and move into the existing results workspace only when needed.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-full bg-white/70 p-1.5 shadow-[0_8px_22px_rgba(15,23,42,0.04)] dark:bg-white/[0.05] dark:shadow-[0_8px_22px_rgba(2,8,23,0.28)]" data-results-utility-menu>
            <button type="button" onClick={() => { setLandingShareStatus(""); setIsLandingShareOpen(true); }} className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200/70 bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">
              <Copy size={15} />
              Share
            </button>
            <button type="button" onClick={() => { setLandingWorkspaceStatus(""); setIsLandingSettingsOpen(true); }} className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200/70 bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">
              <Rows3 size={15} />
              Settings
            </button>
            <div className="relative">
              <button type="button" onClick={() => setIsLandingUtilityMenuOpen((prev) => !prev)} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/70 bg-white text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100">
                <MoreHorizontal size={16} />
              </button>
              {isLandingUtilityMenuOpen ? (
                <div className="absolute right-0 top-14 z-30 w-72 rounded-[26px] border border-slate-200/80 bg-white p-2.5 shadow-[0_22px_56px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-[#0d182b] dark:shadow-[0_22px_56px_rgba(2,8,23,0.45)]">
                  <button type="button" onClick={() => { setIsLandingUtilityMenuOpen(false); onRenameWorkspace(); }} className="flex w-full items-center gap-3 rounded-[18px] px-4 py-3 text-left text-[14px] text-slate-700 transition hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800"><PenLine size={16} /><span>Rename workspace</span></button>
                  <button type="button" onClick={() => { setIsLandingUtilityMenuOpen(false); onMoveWorkspace(); }} className="flex w-full items-center justify-between gap-3 rounded-[18px] px-4 py-3 text-left text-[14px] text-slate-700 transition hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800"><span className="flex items-center gap-3"><Rows3 size={16} /><span>Move to workspace / project</span></span><ChevronDown size={15} className="-rotate-90 text-slate-400 dark:text-slate-500" /></button>
                  <button type="button" onClick={() => { setIsLandingUtilityMenuOpen(false); onArchiveWorkspace(); }} className="mt-1 flex w-full items-center gap-3 rounded-[18px] px-4 py-3 text-left text-[14px] text-slate-700 transition hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800"><Archive size={16} /><span>Archive</span></button>
                  <div className="my-2 border-t border-slate-100 dark:border-white/10" />
                  <button type="button" onClick={() => { setIsLandingUtilityMenuOpen(false); setLandingDeleteOpen(true); }} className="flex w-full items-center gap-3 rounded-[18px] px-4 py-3 text-left text-[14px] text-rose-600 transition hover:bg-rose-50"><Trash2 size={16} /><span>Delete</span></button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid flex-1 grid-cols-12 gap-6">
          <section className="col-span-12 rounded-[30px] border border-slate-200/80 bg-white/92 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-[#0d182b]/96 dark:shadow-[0_20px_50px_rgba(2,8,23,0.34)] lg:col-span-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-lg font-semibold text-slate-950 dark:text-slate-50">Semester results</div>
                <div className="mt-1 text-sm text-slate-700 dark:text-slate-300">Open published result rows and continue into the existing breakdown flow.</div>
              </div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">
                {resultsLoading ? "Syncing results..." : `${landingRows.length} items`}
              </div>
            </div>

            <div className="mt-6 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="grid grid-cols-2 gap-4">
                <ResultsSnapshotStat label="Current GPA" value={snapshot.gpa.toFixed(2)} sub="Active semester" />
                <ResultsSnapshotStat label="CGPA" value={snapshot.cgpa.toFixed(2)} sub="Cumulative standing" />
                <ResultsSnapshotStat label="Credits" value={String(snapshot.credits)} sub="Completed load" />
                <ResultsSnapshotStat label="Standing" value={snapshot.standing} sub="Academic position" />
              </div>
              <ResultsTrendPreview snapshot={snapshot} />
            </div>

            <div className="mt-6">
              {landingRows.length ? (
                landingRows.map((item) => (
                  <div key={item.id} data-results-row-menu className="group relative flex items-start justify-between gap-4 border-t border-slate-200/70 bg-transparent px-5 py-5 transition hover:bg-slate-50/75 first:border-t-0 dark:border-white/10 dark:hover:bg-white/[0.03]">
                    <button type="button" onClick={() => onOpenRow(item)} className="min-w-0 flex flex-1 items-start gap-4 text-left">
                      <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-100"><GraduationCap size={18} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-lg font-semibold tracking-[-0.02em] text-slate-950 dark:text-slate-50">{item.title}</span>
                        <span className="mt-1 block text-sm leading-6 text-slate-700 dark:text-slate-300">{item.preview}</span>
                      </span>
                    </button>

                    <div className="flex items-start gap-3">
                      <div className="rounded-full bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600 dark:bg-slate-900 dark:text-slate-300">{item.meta}</div>
                      <div className="relative">
                        <button type="button" onClick={(event) => { event.stopPropagation(); setLandingRowMenuId((prev) => prev === item.id ? null : item.id); setLandingMoveMenuId(null); }} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-transparent bg-white/0 text-slate-400 opacity-0 transition hover:border-slate-200 hover:bg-white hover:text-slate-700 group-hover:opacity-100 group-focus-within:opacity-100 dark:text-slate-300 dark:hover:border-white/10 dark:hover:bg-slate-800 dark:hover:text-slate-100">
                          <MoreHorizontal size={16} />
                        </button>
                        {landingRowMenuId === item.id ? (
                          <div className="absolute right-0 top-11 z-20 w-60 rounded-[24px] border border-slate-200/80 bg-white p-2.5 shadow-[0_22px_56px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-[#0d182b] dark:shadow-[0_22px_56px_rgba(2,8,23,0.45)]">
                            <button type="button" onClick={() => { setLandingRowMenuId(null); onRenameRow(item.id); }} className="flex w-full items-center gap-3 rounded-[16px] px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800"><PenLine size={16} /><span>Rename</span></button>
                            <div className="relative">
                              <button type="button" onClick={() => setLandingMoveMenuId((prev) => prev === item.id ? null : item.id)} className="flex w-full items-center justify-between gap-3 rounded-[16px] px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800"><span className="flex items-center gap-3"><Rows3 size={16} /><span>Move</span></span><ChevronDown size={14} className="-rotate-90 text-slate-400 dark:text-slate-500" /></button>
                              {landingMoveMenuId === item.id ? (
                                <div className="absolute left-full top-0 ml-2 w-56 rounded-[22px] border border-slate-200/80 bg-white p-2.5 shadow-[0_20px_52px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-[#0d182b] dark:shadow-[0_20px_52px_rgba(2,8,23,0.45)]">
                                  <button type="button" onClick={() => { setLandingRowMenuId(null); setLandingMoveMenuId(null); onMoveRow(item.id, "Transcript"); }} className="flex w-full items-center gap-3 rounded-[14px] px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800"><FileText size={16} /><span>Transcript</span></button>
                                  <button type="button" onClick={() => { setLandingRowMenuId(null); setLandingMoveMenuId(null); onMoveRow(item.id, "Subgroup"); }} className="flex w-full items-center gap-3 rounded-[14px] px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800"><Sparkles size={16} /><span>Subgroup</span></button>
                                </div>
                              ) : null}
                            </div>
                            <button type="button" onClick={() => { setLandingRowMenuId(null); onArchiveRow(item.id); }} className="flex w-full items-center gap-3 rounded-[16px] px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800"><Archive size={16} /><span>Archive</span></button>
                            <div className="my-2 border-t border-slate-100 dark:border-white/10" />
                            <button type="button" onClick={() => { setLandingRowMenuId(null); onDeleteRow(item.id); }} className="flex w-full items-center gap-3 rounded-[16px] px-4 py-3 text-left text-sm text-rose-600 hover:bg-rose-50"><Trash2 size={16} /><span>Delete</span></button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50/80 px-6 py-10 text-center dark:border-white/10 dark:bg-[#101c31]">
                  <div className="text-lg font-semibold text-slate-950 dark:text-slate-50">No result rows yet</div>
                  <div className="mt-2 text-sm text-slate-700 dark:text-slate-300">Published semester results will appear here when available.</div>
                </div>
              )}
            </div>
          </section>

          <aside className="col-span-12 flex flex-col gap-5 lg:col-span-4">
            <section className="rounded-[28px] border border-slate-200/80 bg-white/92 px-5 py-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-[#0d182b]/96 dark:shadow-[0_18px_44px_rgba(2,8,23,0.34)]">
              <div className="flex items-start gap-4">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100">EL</div>
                <div>
                  <div className="text-lg font-semibold text-slate-950 dark:text-slate-50">{landingWorkspaceSettings.linkedInstitution || "ElimuLink University"}</div>
                  <div className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-300">Clarity around performance, progress, and next-step academic support.</div>
                </div>
              </div>
            </section>

            <section className="rounded-[30px] border border-slate-200/80 bg-white/92 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-[#0d182b]/96 dark:shadow-[0_20px_50px_rgba(2,8,23,0.34)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold text-slate-950 dark:text-slate-50">New work</div>
                  <div className="mt-2 text-sm leading-7 text-slate-700 dark:text-slate-300">Open the latest results view and continue into the existing Results workspace.</div>
                </div>
                <button type="button" onClick={onPrimaryAction} className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-700 shadow-[inset_0_0_0_1px_rgba(226,232,240,0.8)] hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-100 dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] dark:hover:bg-slate-800">
                  <GraduationCap size={20} />
                </button>
              </div>
              <button type="button" onClick={onPrimaryAction} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white">View latest results</button>
            </section>

            <section className="rounded-[30px] border border-slate-200/80 bg-white/92 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-[#0d182b]/96 dark:shadow-[0_20px_50px_rgba(2,8,23,0.34)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-slate-950 dark:text-slate-50">Workspace snapshot</div>
                  <div className="mt-1 text-sm text-slate-700 dark:text-slate-300">A quick read on the current Results workspace.</div>
                </div>
                <button type="button" onClick={() => setIsLandingSettingsOpen(true)} className="text-sm font-medium text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white">Open settings</button>
              </div>
              <div className="mt-5 space-y-3">
                {[
                  ["Current GPA", snapshot.gpa.toFixed(2)],
                  ["CGPA", snapshot.cgpa.toFixed(2)],
                  ["Credits", String(snapshot.credits)],
                  ["Standing", snapshot.standing],
                  ["Default view", landingWorkspaceSettings.defaultView],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#101c31]">
                    <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
                    <span className="text-sm font-semibold text-slate-950 dark:text-slate-50">{value}</span>
                  </div>
                ))}
              </div>
              {landingWorkspaceStatus ? <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-white/10 dark:bg-[#101c31] dark:text-slate-300">{landingWorkspaceStatus}</div> : null}
            </section>

            <section className="rounded-[30px] border border-slate-200/80 bg-white/92 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-[#0d182b]/96 dark:shadow-[0_20px_50px_rgba(2,8,23,0.34)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-slate-950 dark:text-slate-50">Quick actions</div>
                  <div className="mt-1 text-sm text-slate-700 dark:text-slate-300">Lightweight Results shortcuts for this workspace.</div>
                </div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">Results</div>
              </div>
              <div className="mt-5 space-y-3">
                {[
                  ["Semester view", "Jump straight into published semester rows.", GraduationCap, onQuickSemester],
                  ["Transcript snapshot", "Open transcript and export context.", FileText, onQuickTranscript],
                  ["Performance trends", "Review GPA direction and patterns.", TrendingUp, onQuickTrends],
                  ["Subgroup", "Link a subgroup for shared academic context.", Sparkles, onQuickSubgroup],
                ].map(([label, desc, Icon, action]) => (
                  <button key={label} type="button" onClick={action} className="flex w-full items-center gap-4 rounded-[22px] border border-slate-200 bg-white px-4 py-4 text-left transition hover:bg-slate-50 dark:border-white/10 dark:bg-[#101c31] dark:hover:bg-slate-800">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-100"><Icon size={18} /></span>
                    <span className="min-w-0">
                      <span className="block text-base font-semibold text-slate-950 dark:text-slate-50">{label}</span>
                      <span className="mt-1 block text-sm leading-6 text-slate-700 dark:text-slate-300">{desc}</span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>

      <ResultsWorkspaceModal open={isLandingShareOpen} title="Share Results workspace" onClose={() => setIsLandingShareOpen(false)}>
        <div className="space-y-5">
          <div>
            <div className="text-sm font-semibold text-slate-900">Invite by email</div>
            <input value={landingShareInvite} onChange={(event) => setLandingShareInvite(event.target.value)} placeholder="lecturer@elimulink.edu" className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-300" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900">Access level</div>
            <div className="mt-2 grid grid-cols-2 gap-3">
              {["only invited", "anyone with link", "institution only", "subgroup only"].map((option) => (
                <button key={option} type="button" onClick={() => setLandingShareAccess(option)} className={["rounded-2xl border px-4 py-3 text-left text-sm capitalize transition", landingShareAccess === option ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"].join(" ")}>{option}</button>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">Share for Results is desktop-polished here and stays frontend-first in this pass so it does not collide with Notebook sharing.</div>
          {landingShareStatus ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{landingShareStatus}</div> : null}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setIsLandingShareOpen(false)} className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Close</button>
            <button type="button" onClick={() => setLandingShareStatus("Results workspace sharing is prepared here as a safe frontend-first flow.")} className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-900">Save share setup</button>
          </div>
        </div>
      </ResultsWorkspaceModal>

      <ResultsWorkspaceModal open={isLandingSettingsOpen} title="Results workspace settings" onClose={() => setIsLandingSettingsOpen(false)}>
        <div className="space-y-5">
          <label className="block"><div className="text-sm font-semibold text-slate-900">Workspace name</div><input value={landingWorkspaceSettings.name} onChange={(event) => setLandingWorkspaceSettings((prev) => ({ ...prev, name: event.target.value }))} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-300" /></label>
          <label className="block"><div className="text-sm font-semibold text-slate-900">Description</div><textarea value={landingWorkspaceSettings.description} onChange={(event) => setLandingWorkspaceSettings((prev) => ({ ...prev, description: event.target.value }))} rows={4} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-300" /></label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block"><div className="text-sm font-semibold text-slate-900">Default view</div><input value={landingWorkspaceSettings.defaultView} onChange={(event) => setLandingWorkspaceSettings((prev) => ({ ...prev, defaultView: event.target.value }))} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-300" /></label>
            <label className="block"><div className="text-sm font-semibold text-slate-900">Collaboration</div><input value={landingWorkspaceSettings.collaboration} onChange={(event) => setLandingWorkspaceSettings((prev) => ({ ...prev, collaboration: event.target.value }))} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-300" /></label>
          </div>
          {landingWorkspaceStatus ? <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">{landingWorkspaceStatus}</div> : null}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setIsLandingSettingsOpen(false)} className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Close</button>
            <button type="button" onClick={() => setLandingWorkspaceStatus("Results workspace settings are saved locally for this desktop landing pass.")} className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-900">Save settings</button>
          </div>
        </div>
      </ResultsWorkspaceModal>

      <ResultsWorkspaceModal open={landingDeleteOpen} title="Delete Results workspace" onClose={() => setLandingDeleteOpen(false)}>
        <div className="space-y-5">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm leading-6 text-rose-700">Deleting the Results workspace is not connected to backend deletion in this pass. This stays a safe frontend-first confirmation only.</div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setLandingDeleteOpen(false)} className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
            <button type="button" onClick={() => { setLandingDeleteOpen(false); setLandingWorkspaceStatus("Delete is prepared here as a safe frontend-first Results action."); }} className="rounded-full bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-700">Confirm delete</button>
          </div>
        </div>
      </ResultsWorkspaceModal>
    </div>
  );
}
