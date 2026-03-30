import {
  Archive,
  ChevronDown,
  ClipboardList,
  Copy,
  ListChecks,
  Menu,
  MoreHorizontal,
  PenLine,
  Plus,
  Rows3,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

function AssignmentSnapshotStat({ label, value, sub }) {
  return (
    <div className="rounded-[22px] border border-slate-200/80 bg-white px-4 py-4 dark:border-white/10 dark:bg-[#101c31]">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-slate-50">{value}</div>
      {sub ? <div className="mt-1 text-sm text-slate-700 dark:text-slate-300">{sub}</div> : null}
    </div>
  );
}

function AssignmentPulseChart({ values }) {
  const max = Math.max(...values, 1);
  return (
    <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-[#101c31]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-600 dark:text-slate-300">Deadline pulse</div>
          <div className="mt-1 text-sm text-slate-700 dark:text-slate-300">Current workload intensity across active assignment groups.</div>
        </div>
        <Sparkles size={16} className="text-slate-500 dark:text-slate-300" />
      </div>
      <div className="mt-5 flex h-28 items-end gap-3">
        {values.map((value, index) => (
          <div key={index} className="flex flex-1 flex-col items-center gap-2">
            <div
              className="w-full rounded-t-[18px] bg-[linear-gradient(180deg,#2563eb_0%,#14b8a6_100%)] opacity-95"
              style={{ height: `${Math.max(18, (value / max) * 100)}%` }}
            />
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600 dark:text-slate-400">
              {["Focus", "Draft", "Review", "Submit"][index] || `S${index + 1}`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AssignmentsWorkspaceModal({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-slate-950/30 backdrop-blur-[1px]" onClick={onClose} />
      <div className="absolute inset-x-0 top-0 mx-auto flex min-h-full max-w-3xl items-start justify-center px-4 py-10">
        <div className="w-full rounded-[30px] border border-slate-200/80 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.14)] dark:border-white/10 dark:bg-[#0d182b] dark:shadow-[0_24px_80px_rgba(2,8,23,0.45)]">
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-5 dark:border-white/10">
            <div>
              <div className="text-lg font-semibold text-slate-900 dark:text-slate-50">{title}</div>
              <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">Assignments desktop workspace flow.</div>
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

export default function AssignmentsDesktopLanding(props) {
  const {
    isLandingMenuOpen,
    setIsLandingMenuOpen,
    isLandingShareOpen,
    setIsLandingShareOpen,
    isLandingSettingsOpen,
    setIsLandingSettingsOpen,
    isLandingUtilityMenuOpen,
    setIsLandingUtilityMenuOpen,
    landingAssignmentMenuId,
    setLandingAssignmentMenuId,
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
    landingAssignments,
    assignmentsLoading,
    dueSoonCount,
    onOpenAssignment,
    onCreateAssignment,
    onSubmissionTracker,
    onTemplate,
    onSubgroupShortcut,
    onRenameWorkspace,
    onMoveWorkspace,
    onArchiveWorkspace,
    onRenameAssignment,
    onMoveAssignment,
    onArchiveAssignment,
    onDeleteAssignment,
  } = props;

  const assignmentBars = [
    Math.max(landingAssignments.length, 1),
    Math.max(dueSoonCount, 1),
    Math.max(landingAssignments.filter((item) => /review|submitted/i.test(item.status || "")).length, 1),
    Math.max(landingAssignments.filter((item) => /draft|progress|active/i.test(item.status || "")).length, 1),
  ];

  return (
    <div className="min-h-[100dvh] bg-[linear-gradient(180deg,#f8fafc_0%,#f4f7fb_48%,#eef3f9_100%)] px-6 py-6 dark:bg-[linear-gradient(180deg,#06111f_0%,#0a1527_48%,#0c1830_100%)]">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-7xl flex-col gap-6">
        <div className="relative flex items-start justify-between gap-6 bg-transparent px-7 py-6">
          <div className="absolute -left-5 top-1" data-assignments-landing-menu>
            <button
              type="button"
              onClick={() => setIsLandingMenuOpen((prev) => !prev)}
              aria-expanded={isLandingMenuOpen}
              aria-label="Toggle assignments menu"
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-[0_12px_30px_rgba(15,23,42,0.06)] hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              {isLandingMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>

            {isLandingMenuOpen ? (
              <div className="mt-3 w-64 rounded-[24px] border border-slate-200 bg-white p-3 shadow-[0_24px_60px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-[#0d182b] dark:shadow-[0_24px_60px_rgba(2,8,23,0.45)]">
                <button
                  type="button"
                  onClick={() => setIsLandingMenuOpen(false)}
                  className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  <span>Assignments home</span>
                  <ChevronDown size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsLandingMenuOpen(false);
                    onCreateAssignment();
                  }}
                  className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  <span>New assignment</span>
                  <ClipboardList size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsLandingMenuOpen(false);
                    onSubmissionTracker();
                  }}
                  className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  <span>Open assignments</span>
                  <ListChecks size={16} />
                </button>
              </div>
            ) : null}
          </div>

          <div className="max-w-3xl">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300">Institution Workspace</div>
            <div className="mt-3 flex items-center gap-3">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-transparent text-slate-700 dark:text-slate-100">
                <ClipboardList size={22} />
              </span>
              <div>
                <h1 className="text-3xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-slate-50">Assignments</h1>
                <p className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-300">
                  Review active coursework, open assignment workflows, and start a fresh draft without dropping directly into tools.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-full bg-white/70 p-1.5 shadow-[0_8px_22px_rgba(15,23,42,0.04)] dark:bg-white/[0.05] dark:shadow-[0_8px_22px_rgba(2,8,23,0.28)]" data-assignments-utility-menu>
            <button
              type="button"
              onClick={() => {
                setLandingShareStatus("");
                setIsLandingShareOpen(true);
              }}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200/70 bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              <Copy size={15} />
              Share
            </button>
            <button
              type="button"
              onClick={() => {
                setLandingWorkspaceStatus("");
                setIsLandingSettingsOpen(true);
              }}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200/70 bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              <Rows3 size={15} />
              Settings
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsLandingUtilityMenuOpen((prev) => !prev)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/70 bg-white text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              >
                <MoreHorizontal size={16} />
              </button>
              {isLandingUtilityMenuOpen ? (
                <div className="absolute right-0 top-14 z-30 w-72 rounded-[26px] border border-slate-200/80 bg-white p-2.5 shadow-[0_22px_56px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-[#0d182b] dark:shadow-[0_22px_56px_rgba(2,8,23,0.45)]">
                  <button
                    type="button"
                    onClick={() => {
                      setIsLandingUtilityMenuOpen(false);
                      onRenameWorkspace();
                    }}
                    className="flex w-full items-center gap-3 rounded-[18px] px-4 py-3 text-left text-[14px] text-slate-700 transition hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800"
                  >
                    <PenLine size={16} />
                    <span>Rename workspace</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsLandingUtilityMenuOpen(false);
                      onMoveWorkspace();
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-[18px] px-4 py-3 text-left text-[14px] text-slate-700 transition hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800"
                  >
                    <span className="flex items-center gap-3">
                      <Rows3 size={16} />
                      <span>Move to workspace / project</span>
                    </span>
                    <ChevronDown size={15} className="-rotate-90 text-slate-400" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsLandingUtilityMenuOpen(false);
                      onArchiveWorkspace();
                    }}
                    className="mt-1 flex w-full items-center gap-3 rounded-[18px] px-4 py-3 text-left text-[14px] text-slate-700 transition hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800"
                  >
                    <Archive size={16} />
                    <span>Archive</span>
                  </button>
                  <div className="my-2 border-t border-slate-100 dark:border-white/10" />
                  <button
                    type="button"
                    onClick={() => {
                      setIsLandingUtilityMenuOpen(false);
                      setLandingDeleteOpen(true);
                    }}
                    className="flex w-full items-center gap-3 rounded-[18px] px-4 py-3 text-left text-[14px] text-rose-600 transition hover:bg-rose-50"
                  >
                    <Trash2 size={16} />
                    <span>Delete</span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid flex-1 grid-cols-12 gap-6">
          <section className="col-span-12 rounded-[30px] border border-slate-200/80 bg-white/92 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-[#0d182b]/96 dark:shadow-[0_20px_50px_rgba(2,8,23,0.34)] lg:col-span-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-lg font-semibold text-slate-950 dark:text-slate-50">Active assignments</div>
                <div className="mt-1 text-sm text-slate-700 dark:text-slate-300">Open coursework, review deadlines, and continue the existing assignments flow.</div>
              </div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">
                {assignmentsLoading ? "Syncing assignments..." : `${landingAssignments.length} items`}
              </div>
            </div>

            <div className="mt-6 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="grid grid-cols-2 gap-4">
                <AssignmentSnapshotStat label="Assignments" value={landingAssignments.length} sub="Active coursework" />
                <AssignmentSnapshotStat label="Due soon" value={dueSoonCount} sub="Closest deadlines" />
                <AssignmentSnapshotStat label="Default view" value={landingWorkspaceSettings.defaultView} sub="Current workspace mode" />
                <AssignmentSnapshotStat label="Collaboration" value={landingWorkspaceSettings.collaboration} sub="Assignment support flow" />
              </div>
              <AssignmentPulseChart values={assignmentBars} />
            </div>

            <div className="mt-6">
              {landingAssignments.length ? (
                landingAssignments.map((item) => (
                  <div
                    key={item.id}
                    data-assignments-row-menu
                    className="group relative flex items-start justify-between gap-4 border-t border-slate-200/70 bg-transparent px-5 py-5 transition hover:bg-slate-50/75 first:border-t-0 dark:border-white/10 dark:hover:bg-white/[0.03]"
                  >
                    <button type="button" onClick={() => onOpenAssignment(item)} className="min-w-0 flex flex-1 items-start gap-4 text-left">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-transparent text-slate-700 dark:text-slate-200">
                            <ClipboardList size={16} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="text-base font-semibold text-slate-950 dark:text-slate-50">{item.title}</div>
                            <div className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-300">{item.preview}</div>
                          </div>
                        </div>
                      </div>
                    </button>

                    <div className="relative flex shrink-0 items-start gap-2">
                      <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600 dark:text-slate-300">{item.status}</div>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setLandingMoveMenuId(null);
                          setLandingAssignmentMenuId((prev) => (prev === item.id ? null : item.id));
                        }}
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-white hover:text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-50 ${landingAssignmentMenuId === item.id ? "bg-white text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.08)] dark:bg-slate-800 dark:text-slate-50 dark:shadow-[0_8px_18px_rgba(2,8,23,0.3)]" : "opacity-0 group-hover:opacity-100"}`}
                      >
                        <MoreHorizontal size={16} />
                      </button>
                      {landingAssignmentMenuId === item.id ? (
                        <div className="absolute right-0 top-10 z-20 w-60 rounded-[24px] border border-slate-200/80 bg-white p-2.5 shadow-[0_22px_56px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-[#0d182b] dark:shadow-[0_22px_56px_rgba(2,8,23,0.45)]">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onRenameAssignment(item.id);
                              setLandingAssignmentMenuId(null);
                            }}
                            className="flex w-full items-center gap-3 rounded-[18px] px-4 py-3 text-left text-[14px] text-slate-700 transition hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800"
                          >
                            <PenLine size={15} />
                            <span>Rename</span>
                          </button>
                          <div className="relative">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setLandingMoveMenuId((prev) => (prev === item.id ? null : item.id));
                              }}
                              className="flex w-full items-center justify-between gap-3 rounded-[18px] px-4 py-3 text-left text-[14px] text-slate-700 transition hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800"
                            >
                              <span className="flex items-center gap-3">
                                <Rows3 size={15} />
                                <span>Move</span>
                              </span>
                              <ChevronDown size={15} className="-rotate-90 text-slate-400 dark:text-slate-500" />
                            </button>
                            {landingMoveMenuId === item.id ? (
                              <div className="absolute left-[calc(100%+0.5rem)] top-0 w-52 rounded-[24px] border border-slate-200/80 bg-white p-2.5 shadow-[0_22px_56px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-[#0d182b] dark:shadow-[0_22px_56px_rgba(2,8,23,0.45)]">
                                {["Assignments", "Subgroup"].map((destination) => (
                                  <button
                                    key={destination}
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      onMoveAssignment(item.id, destination);
                                    }}
                                    className="flex w-full items-center gap-3 rounded-[18px] px-4 py-3 text-left text-[14px] text-slate-700 transition hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800"
                                  >
                                    <ClipboardList size={15} />
                                    <span>{destination}</span>
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onArchiveAssignment(item.id);
                              setLandingAssignmentMenuId(null);
                            }}
                            className="mt-1 flex w-full items-center gap-3 rounded-[18px] px-4 py-3 text-left text-[14px] text-slate-700 transition hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800"
                          >
                            <Archive size={15} />
                            <span>Archive</span>
                          </button>
                          <div className="my-2 border-t border-slate-100 dark:border-white/10" />
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onDeleteAssignment(item.id);
                            }}
                            className="flex w-full items-center gap-3 rounded-[18px] px-4 py-3 text-left text-[14px] text-rose-600 transition hover:bg-rose-50"
                          >
                            <Trash2 size={15} />
                            <span>Delete</span>
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50/70 px-6 py-10 text-center dark:border-white/10 dark:bg-[#101c31]">
                  <div className="text-lg font-semibold text-slate-950 dark:text-slate-50">No assignments yet</div>
                  <div className="mt-2 text-sm text-slate-700 dark:text-slate-300">Create a new assignment draft to start this workspace.</div>
                </div>
              )}
            </div>
          </section>

          <aside className="col-span-12 flex flex-col gap-6 lg:col-span-4">
            <section className="rounded-[26px] border border-slate-200/70 bg-white/90 px-5 py-3.5 shadow-[0_14px_36px_rgba(15,23,42,0.045)] dark:border-white/10 dark:bg-[#0d182b]/96 dark:shadow-[0_14px_36px_rgba(2,8,23,0.34)]">
              <div className="flex items-start gap-4">
                <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-transparent text-sm font-semibold text-slate-700 dark:text-slate-100">EL</div>
                <div className="min-w-0 pt-0.5">
                  <div className="text-sm font-semibold text-slate-950 dark:text-slate-50">{landingWorkspaceSettings.linkedInstitution}</div>
                  <div className="mt-0.5 text-sm leading-7 text-slate-700 dark:text-slate-300">Supporting structured coursework, deadlines, and academic follow-through.</div>
                </div>
              </div>
            </section>

            <div className="rounded-[30px] border border-slate-200/70 bg-white/92 p-5 shadow-[0_18px_42px_rgba(15,23,42,0.055)] dark:border-white/10 dark:bg-[#0d182b]/96 dark:shadow-[0_18px_42px_rgba(2,8,23,0.34)]">
              <div className="rounded-[24px] border border-slate-200/70 bg-slate-50/70 p-5 dark:border-white/10 dark:bg-[#101c31]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-lg font-semibold text-slate-950 dark:text-slate-50">New work</div>
                    <div className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">Start a new assignment draft and continue inside the existing assignments flow.</div>
                  </div>
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-[0_10px_20px_rgba(15,23,42,0.06)] dark:bg-slate-900 dark:text-slate-100 dark:shadow-[0_10px_20px_rgba(2,8,23,0.3)]">
                    <Plus size={18} />
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onCreateAssignment}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                >
                  <ClipboardList size={16} />
                  New assignment
                </button>
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-lg font-semibold text-slate-950 dark:text-slate-50">Workspace snapshot</div>
                  <button
                    type="button"
                    onClick={() => {
                      setLandingWorkspaceStatus("");
                      setIsLandingSettingsOpen(true);
                    }}
                    className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 transition hover:text-slate-700 dark:text-slate-300 dark:hover:text-white"
                  >
                    Open settings
                  </button>
                </div>
                <div className="mt-4 space-y-3 text-sm text-slate-700 dark:text-slate-300">
                  <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200/70 dark:bg-[#101c31] dark:ring-white/10">
                    <span>Default view</span>
                    <span className="font-medium text-slate-950 dark:text-slate-50">{landingWorkspaceSettings.defaultView}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200/70 dark:bg-[#101c31] dark:ring-white/10">
                    <span>Assignments</span>
                    <span className="font-medium text-slate-950 dark:text-slate-50">{landingAssignments.length}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200/70 dark:bg-[#101c31] dark:ring-white/10">
                    <span>Due soon</span>
                    <span className="font-medium text-slate-950 dark:text-slate-50">{dueSoonCount}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200/70 dark:bg-[#101c31] dark:ring-white/10">
                    <span>Subgroup</span>
                    <span className="font-medium text-right text-slate-950 dark:text-slate-50">{landingWorkspaceSettings.subgroup}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200/70 dark:bg-[#101c31] dark:ring-white/10">
                    <span>Collaboration</span>
                    <span className="font-medium text-slate-950 dark:text-slate-50">{landingWorkspaceSettings.collaboration}</span>
                  </div>
                </div>
              </div>
            </div>

            <section className="rounded-[26px] border border-slate-200/70 bg-white/90 px-5 py-4.5 shadow-[0_14px_36px_rgba(15,23,42,0.045)] dark:border-white/10 dark:bg-[#0d182b]/96 dark:shadow-[0_14px_36px_rgba(2,8,23,0.34)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-slate-950 dark:text-slate-50">Quick actions</div>
                  <div className="mt-1 text-sm text-slate-700 dark:text-slate-300">Lightweight assignments shortcuts for this workspace.</div>
                </div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">Assignments</div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <button
                  type="button"
                  onClick={onCreateAssignment}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-[#101c31] dark:hover:bg-slate-800"
                >
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-100">
                    <ClipboardList size={16} />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-slate-950 dark:text-slate-50">New assignment draft</span>
                    <span className="mt-1 block text-xs text-slate-700 dark:text-slate-300">Start a new assignment using the existing create flow.</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={onSubmissionTracker}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-[#101c31] dark:hover:bg-slate-800"
                >
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-100">
                    <ListChecks size={16} />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-slate-950 dark:text-slate-50">Submission tracker</span>
                    <span className="mt-1 block text-xs text-slate-700 dark:text-slate-300">Jump into the current assignments tracker view.</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={onTemplate}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                    <Sparkles size={16} />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-slate-900">Templates</span>
                    <span className="mt-1 block text-xs text-slate-500">Start with a prepared assignment draft title.</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={onSubgroupShortcut}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                    <Rows3 size={16} />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-slate-900">Subgroup</span>
                    <span className="mt-1 block text-xs text-slate-500">Prepare subgroup-specific assignment coordination.</span>
                  </span>
                </button>
              </div>
            </section>
          </aside>
        </div>
      </div>

      <AssignmentsWorkspaceModal open={isLandingShareOpen} title="Share Assignments Workspace" onClose={() => setIsLandingShareOpen(false)}>
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-5">
            <label className="block">
              <div className="mb-2 text-sm font-medium text-slate-700">Email invite</div>
              <input
                value={landingShareInvite}
                onChange={(e) => setLandingShareInvite(e.target.value)}
                placeholder="name@institution.edu"
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none"
              />
            </label>
            <label className="block">
              <div className="mb-2 text-sm font-medium text-slate-700">Access level</div>
              <select
                value={landingShareAccess}
                onChange={(e) => setLandingShareAccess(e.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none"
              >
                <option value="institution-only">Institution only</option>
                <option value="only-invited">Only invited</option>
                <option value="subgroup-only">Subgroup only</option>
                <option value="anyone-with-link">Anyone with link</option>
              </select>
            </label>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setLandingShareStatus(landingShareInvite ? `Invite prepared for ${landingShareInvite}.` : "Add an email first.")}
                className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Add invite
              </button>
              <button
                type="button"
                onClick={() => setLandingShareStatus("Assignments workspace link is prepared as a safe frontend-first share action.")}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Copy link
              </button>
            </div>
            <div className="rounded-2xl border border-sky-100 bg-sky-50/80 px-4 py-3 text-sm text-sky-900">
              This Assignments share flow is polished and contextual, but remains frontend-first in this pass.
            </div>
            {landingShareStatus ? <div className="text-sm font-medium text-emerald-700">{landingShareStatus}</div> : null}
          </div>
          <div className="space-y-5">
            <div>
              <div className="text-sm font-medium text-slate-700">Owner and members</div>
              <div className="mt-3 space-y-3">
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div>
                    <div className="text-sm text-slate-800">Assignments workspace owner</div>
                    <div className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Owner</div>
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Owner</span>
                </div>
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-slate-700">Quick share targets</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {["Course group", "Subgroup", "Lecturer"].map((target) => (
                  <button
                    key={target}
                    type="button"
                    onClick={() => setLandingShareStatus(`${target} is prepared here as a frontend share shortcut.`)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {target}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </AssignmentsWorkspaceModal>

      <AssignmentsWorkspaceModal open={isLandingSettingsOpen} title="Assignments Workspace Settings" onClose={() => setIsLandingSettingsOpen(false)}>
        <div className="grid gap-6 lg:grid-cols-2">
          <label className="block">
            <div className="mb-2 text-sm font-medium text-slate-700">Workspace name</div>
            <input
              value={landingWorkspaceSettings.name}
              onChange={(e) => setLandingWorkspaceSettings((prev) => ({ ...prev, name: e.target.value }))}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none"
            />
          </label>
          <label className="block">
            <div className="mb-2 text-sm font-medium text-slate-700">Default view</div>
            <select
              value={landingWorkspaceSettings.defaultView}
              onChange={(e) => setLandingWorkspaceSettings((prev) => ({ ...prev, defaultView: e.target.value }))}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none"
            >
              <option value="my assignments">My assignments</option>
              <option value="ai tools">AI tools</option>
              <option value="exam prep">Exam prep</option>
            </select>
          </label>
          <label className="block lg:col-span-2">
            <div className="mb-2 text-sm font-medium text-slate-700">Description</div>
            <textarea
              rows={4}
              value={landingWorkspaceSettings.description}
              onChange={(e) => setLandingWorkspaceSettings((prev) => ({ ...prev, description: e.target.value }))}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
            />
          </label>
          <label className="block">
            <div className="mb-2 text-sm font-medium text-slate-700">Linked institution</div>
            <input
              value={landingWorkspaceSettings.linkedInstitution}
              onChange={(e) => setLandingWorkspaceSettings((prev) => ({ ...prev, linkedInstitution: e.target.value }))}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none"
            />
          </label>
          <label className="block">
            <div className="mb-2 text-sm font-medium text-slate-700">Subgroup</div>
            <input
              value={landingWorkspaceSettings.subgroup}
              onChange={(e) => setLandingWorkspaceSettings((prev) => ({ ...prev, subgroup: e.target.value }))}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none"
            />
          </label>
          <label className="block">
            <div className="mb-2 text-sm font-medium text-slate-700">Reminder mode</div>
            <select
              value={landingWorkspaceSettings.reminderMode}
              onChange={(e) => setLandingWorkspaceSettings((prev) => ({ ...prev, reminderMode: e.target.value }))}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none"
            >
              <option value="due-date reminders">Due-date reminders</option>
              <option value="weekly summary">Weekly summary</option>
              <option value="minimal">Minimal</option>
            </select>
          </label>
          <label className="block">
            <div className="mb-2 text-sm font-medium text-slate-700">Collaboration</div>
            <select
              value={landingWorkspaceSettings.collaboration}
              onChange={(e) => setLandingWorkspaceSettings((prev) => ({ ...prev, collaboration: e.target.value }))}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none"
            >
              <option value="members can view">Members can view</option>
              <option value="members can comment">Members can comment</option>
              <option value="members can edit">Members can edit</option>
            </select>
          </label>
          <div className="lg:col-span-2 flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setLandingWorkspaceStatus("Assignments workspace settings saved locally for this frontend-first pass.")}
              className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Save settings
            </button>
            <button
              type="button"
              onClick={() => setLandingWorkspaceStatus("Archive is prepared here as a safe frontend-first assignments action.")}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Archive workspace
            </button>
            <button
              type="button"
              onClick={() => setLandingDeleteOpen(true)}
              className="inline-flex items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700 hover:bg-rose-100"
            >
              Delete workspace
            </button>
          </div>
          {landingWorkspaceStatus ? <div className="lg:col-span-2 text-sm font-medium text-emerald-700">{landingWorkspaceStatus}</div> : null}
        </div>
      </AssignmentsWorkspaceModal>

      <AssignmentsWorkspaceModal open={landingDeleteOpen} title="Delete Assignments Workspace" onClose={() => setLandingDeleteOpen(false)}>
        <div className="space-y-4">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-6 text-rose-900">
            Delete is not connected to a real persisted assignments workspace yet. This action remains intentionally safe in this pass.
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setLandingDeleteOpen(false)}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </div>
      </AssignmentsWorkspaceModal>
    </div>
  );
}
