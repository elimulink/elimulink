import {
  Archive,
  BookOpen,
  ChevronDown,
  Copy,
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

function CoursesWorkspaceModal({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="absolute inset-x-0 top-0 mx-auto flex min-h-full max-w-3xl items-start justify-center px-4 py-10">
        <div className="w-full rounded-[30px] border border-slate-200/80 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.14)] dark:border-white/10 dark:bg-[#0d182b] dark:shadow-[0_24px_80px_rgba(2,8,23,0.45)]">
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-5 dark:border-white/10">
            <div>
              <div className="text-lg font-semibold text-slate-900 dark:text-slate-50">{title}</div>
              <div className="mt-1 text-sm text-slate-500 dark:text-slate-300">Courses desktop workspace flow.</div>
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

function SnapshotStat({ label, value, sub }) {
  return (
    <div className="rounded-[22px] border border-slate-200/80 bg-white px-4 py-4 dark:border-white/10 dark:bg-[#101c31]">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-slate-50">{value}</div>
      {sub ? <div className="mt-1 text-sm text-slate-500 dark:text-slate-300">{sub}</div> : null}
    </div>
  );
}

export default function CoursesDesktopLanding(props) {
  const {
    isLandingMenuOpen,
    setIsLandingMenuOpen,
    isLandingShareOpen,
    setIsLandingShareOpen,
    isLandingSettingsOpen,
    setIsLandingSettingsOpen,
    isLandingUtilityMenuOpen,
    setIsLandingUtilityMenuOpen,
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
    selectedCourseLabel,
    overviewMetrics,
    planItems,
    onOpenDashboard,
    onQuickMaterials,
    onQuickRegisteredUnits,
    onQuickTemplates,
    onQuickSubgroup,
    onRenameWorkspace,
    onMoveWorkspace,
    onArchiveWorkspace,
    onOpenMainMenu,
  } = props;

  return (
    <div className="min-h-[100dvh] bg-[linear-gradient(180deg,#f8fafc_0%,#f4f7fb_48%,#eef3f9_100%)] px-6 py-6 dark:bg-[linear-gradient(180deg,#06111f_0%,#0a1527_48%,#0c1830_100%)]">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-7xl flex-col gap-6">
        <div className="relative flex items-start justify-between gap-6 bg-transparent px-7 py-6">
          <div className="absolute -left-5 top-1" data-courses-landing-menu>
            <button
              type="button"
              onClick={() => {
                if (onOpenMainMenu) {
                  onOpenMainMenu();
                  return;
                }
                setIsLandingMenuOpen((prev) => !prev);
              }}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-[0_12px_30px_rgba(15,23,42,0.06)] hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              {isLandingMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            {isLandingMenuOpen && !onOpenMainMenu ? (
              <div className="mt-3 w-64 rounded-[24px] border border-slate-200 bg-white p-3 shadow-[0_24px_60px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-[#0d182b] dark:shadow-[0_24px_60px_rgba(2,8,23,0.45)]">
                <button type="button" onClick={() => setIsLandingMenuOpen(false)} className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800">
                  <span>Courses home</span>
                  <ChevronDown size={16} />
                </button>
                <button type="button" onClick={() => { setIsLandingMenuOpen(false); onOpenDashboard(); }} className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800">
                  <span>Open course dashboard</span>
                  <BookOpen size={16} />
                </button>
                <button type="button" onClick={() => { setIsLandingMenuOpen(false); onQuickMaterials(); }} className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800">
                  <span>Course materials</span>
                  <GraduationCap size={16} />
                </button>
              </div>
            ) : null}
          </div>

          <div className="max-w-3xl">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">Institution Workspace</div>
            <div className="mt-3 flex items-center gap-3">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-transparent text-slate-700 dark:text-slate-100">
                <BookOpen size={22} />
              </span>
              <div>
                <h1 className="text-3xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-slate-50">Courses</h1>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Review course performance, attendance patterns, and study direction before stepping into the full dashboard.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-full bg-white/70 p-1.5 shadow-[0_8px_22px_rgba(15,23,42,0.04)] dark:bg-white/[0.05] dark:shadow-[0_8px_22px_rgba(2,8,23,0.28)]" data-courses-utility-menu>
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
                  <button type="button" onClick={() => { setIsLandingUtilityMenuOpen(false); setLandingDeleteOpen(true); }} className="flex w-full items-center gap-3 rounded-[18px] px-4 py-3 text-left text-[14px] text-rose-600 transition hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10"><Trash2 size={16} /><span>Delete</span></button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid flex-1 grid-cols-12 gap-6">
          <section className="col-span-12 space-y-6 lg:col-span-8">
            <div className="rounded-[30px] border border-slate-200/80 bg-white/92 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-[#0d182b]/96 dark:shadow-[0_20px_50px_rgba(2,8,23,0.34)]">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <div className="text-lg font-semibold text-slate-900 dark:text-slate-50">Course dashboard preview</div>
                  <div className="mt-1 text-sm text-slate-500 dark:text-slate-300">A calmer entry view into the same course analytics and study signals already in Courses.</div>
                </div>
                <div className="rounded-full bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:bg-slate-900 dark:text-slate-200">{selectedCourseLabel}</div>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
                {overviewMetrics.map((metric) => (
                  <SnapshotStat key={metric.label} label={metric.label} value={metric.value} sub={metric.sub} />
                ))}
              </div>
            </div>

            <div className="rounded-[30px] border border-slate-200/80 bg-white/92 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-[#0d182b]/96 dark:shadow-[0_20px_50px_rgba(2,8,23,0.34)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold text-slate-900 dark:text-slate-50">Study direction</div>
                  <div className="mt-1 text-sm text-slate-500 dark:text-slate-300">Keep the dashboard feel, but surface the most useful next academic moves first.</div>
                </div>
                <button type="button" onClick={onOpenDashboard} className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white">Open dashboard</button>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {planItems.map((item) => (
                  <div key={item.title} className="rounded-[24px] border border-slate-200 bg-slate-50/80 px-5 py-4 dark:border-white/10 dark:bg-[#101c31]">
                    <div className="text-base font-semibold text-slate-900 dark:text-slate-50">{item.title}</div>
                    <div className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{item.body}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <aside className="col-span-12 flex flex-col gap-5 lg:col-span-4">
            <section className="rounded-[28px] border border-slate-200/80 bg-white/92 px-5 py-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-[#0d182b]/96 dark:shadow-[0_18px_44px_rgba(2,8,23,0.34)]">
              <div className="flex items-start gap-4">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100">EL</div>
                <div>
                  <div className="text-lg font-semibold text-slate-900 dark:text-slate-50">{landingWorkspaceSettings.linkedInstitution || "ElimuLink University"}</div>
                  <div className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">Course clarity, academic focus, and calm access to the full dashboard.</div>
                </div>
              </div>
            </section>

            <section className="rounded-[30px] border border-slate-200/80 bg-white/92 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-[#0d182b]/96 dark:shadow-[0_20px_50px_rgba(2,8,23,0.34)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold text-slate-900 dark:text-slate-50">New work</div>
                  <div className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">Open the full course dashboard and continue with the existing course analytics flow.</div>
                </div>
                <button type="button" onClick={onOpenDashboard} className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-700 shadow-[inset_0_0_0_1px_rgba(226,232,240,0.8)] hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-100 dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] dark:hover:bg-slate-800">
                  <BookOpen size={20} />
                </button>
              </div>
              <button type="button" onClick={onOpenDashboard} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white">Open course dashboard</button>
            </section>

            <section className="rounded-[30px] border border-slate-200/80 bg-white/92 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-[#0d182b]/96 dark:shadow-[0_20px_50px_rgba(2,8,23,0.34)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-slate-900 dark:text-slate-50">Workspace snapshot</div>
                  <div className="mt-1 text-sm text-slate-500 dark:text-slate-300">Light context before entering the full Courses dashboard.</div>
                </div>
                <button type="button" onClick={() => setIsLandingSettingsOpen(true)} className="text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white">Open settings</button>
              </div>
              <div className="mt-5 space-y-3">
                {[
                  ["Selected course", selectedCourseLabel],
                  ["Default view", landingWorkspaceSettings.defaultView],
                  ["Semester", landingWorkspaceSettings.semesterLabel],
                  ["Focus", landingWorkspaceSettings.focus],
                  ["Insights", landingWorkspaceSettings.insightsMode],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#101c31]">
                    <span className="text-sm text-slate-500 dark:text-slate-300">{label}</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">{value}</span>
                  </div>
                ))}
              </div>
              {landingWorkspaceStatus ? <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-white/10 dark:bg-[#101c31] dark:text-slate-300">{landingWorkspaceStatus}</div> : null}
            </section>

            <section className="rounded-[30px] border border-slate-200/80 bg-white/92 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-[#0d182b]/96 dark:shadow-[0_20px_50px_rgba(2,8,23,0.34)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-slate-900 dark:text-slate-50">Quick actions</div>
                  <div className="mt-1 text-sm text-slate-500 dark:text-slate-300">Compact course shortcuts that fit the dashboard workflow.</div>
                </div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-300">Courses</div>
              </div>
              <div className="mt-5 space-y-3">
                {[
                  ["Course materials", "Jump into course documents and resources.", BookOpen, onQuickMaterials],
                  ["Registered units", "Review the current unit set for this semester.", GraduationCap, onQuickRegisteredUnits],
                  ["Templates", "Open a safe frontend-first academic template shortcut.", Sparkles, onQuickTemplates],
                  ["Subgroup", "Link subgroup context without leaving the landing.", Rows3, onQuickSubgroup],
                ].map(([label, desc, Icon, action]) => (
                  <button key={label} type="button" onClick={action} className="flex w-full items-center gap-4 rounded-[22px] border border-slate-200 bg-white px-4 py-4 text-left transition hover:bg-slate-50 dark:border-white/10 dark:bg-[#101c31] dark:hover:bg-slate-800">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-100"><Icon size={18} /></span>
                    <span className="min-w-0">
                      <span className="block text-base font-semibold text-slate-950 dark:text-slate-50">{label}</span>
                      <span className="mt-1 block text-sm leading-6 text-slate-500 dark:text-slate-300">{desc}</span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>

      <CoursesWorkspaceModal open={isLandingShareOpen} title="Share Courses workspace" onClose={() => setIsLandingShareOpen(false)}>
        <div className="space-y-5">
          <div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">Invite by email</div>
            <input value={landingShareInvite} onChange={(event) => setLandingShareInvite(event.target.value)} placeholder="lecturer@elimulink.edu" className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-300 dark:border-white/10 dark:bg-slate-900 dark:text-slate-50 dark:placeholder:text-slate-400" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">Access level</div>
            <div className="mt-2 grid grid-cols-2 gap-3">
              {["only invited", "anyone with link", "institution only", "subgroup only"].map((option) => (
                <button key={option} type="button" onClick={() => setLandingShareAccess(option)} className={["rounded-2xl border px-4 py-3 text-left text-sm capitalize transition", landingShareAccess === option ? "border-slate-950 bg-slate-950 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"].join(" ")}>{option}</button>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600 dark:border-white/10 dark:bg-[#101c31] dark:text-slate-300">Share for Courses stays frontend-first in this pass so it does not collide with Notebook workspace logic.</div>
          {landingShareStatus ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">{landingShareStatus}</div> : null}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setIsLandingShareOpen(false)} className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">Close</button>
            <button type="button" onClick={() => setLandingShareStatus("Courses workspace sharing is prepared here as a safe frontend-first flow.")} className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white">Save share setup</button>
          </div>
        </div>
      </CoursesWorkspaceModal>

      <CoursesWorkspaceModal open={isLandingSettingsOpen} title="Courses workspace settings" onClose={() => setIsLandingSettingsOpen(false)}>
        <div className="space-y-5">
          <label className="block"><div className="text-sm font-semibold text-slate-900 dark:text-slate-50">Workspace name</div><input value={landingWorkspaceSettings.name} onChange={(event) => setLandingWorkspaceSettings((prev) => ({ ...prev, name: event.target.value }))} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-300 dark:border-white/10 dark:bg-slate-900 dark:text-slate-50" /></label>
          <label className="block"><div className="text-sm font-semibold text-slate-900 dark:text-slate-50">Description</div><textarea value={landingWorkspaceSettings.description} onChange={(event) => setLandingWorkspaceSettings((prev) => ({ ...prev, description: event.target.value }))} rows={4} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-300 dark:border-white/10 dark:bg-slate-900 dark:text-slate-50" /></label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block"><div className="text-sm font-semibold text-slate-900 dark:text-slate-50">Default view</div><input value={landingWorkspaceSettings.defaultView} onChange={(event) => setLandingWorkspaceSettings((prev) => ({ ...prev, defaultView: event.target.value }))} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-300 dark:border-white/10 dark:bg-slate-900 dark:text-slate-50" /></label>
            <label className="block"><div className="text-sm font-semibold text-slate-900 dark:text-slate-50">Insights mode</div><input value={landingWorkspaceSettings.insightsMode} onChange={(event) => setLandingWorkspaceSettings((prev) => ({ ...prev, insightsMode: event.target.value }))} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-300 dark:border-white/10 dark:bg-slate-900 dark:text-slate-50" /></label>
          </div>
          {landingWorkspaceStatus ? <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-white/10 dark:bg-[#101c31] dark:text-slate-300">{landingWorkspaceStatus}</div> : null}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setIsLandingSettingsOpen(false)} className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">Close</button>
            <button type="button" onClick={() => setLandingWorkspaceStatus("Courses workspace settings are saved locally for this desktop landing pass.")} className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white">Save settings</button>
          </div>
        </div>
      </CoursesWorkspaceModal>

      <CoursesWorkspaceModal open={landingDeleteOpen} title="Delete Courses workspace" onClose={() => setLandingDeleteOpen(false)}>
        <div className="space-y-5">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm leading-6 text-rose-700">Deleting the Courses workspace is not connected to backend deletion in this pass. This stays a safe frontend-first confirmation only.</div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setLandingDeleteOpen(false)} className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
            <button type="button" onClick={() => { setLandingDeleteOpen(false); setLandingWorkspaceStatus("Delete is prepared here as a safe frontend-first Courses action."); }} className="rounded-full bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-700">Confirm delete</button>
          </div>
        </div>
      </CoursesWorkspaceModal>
    </div>
  );
}
