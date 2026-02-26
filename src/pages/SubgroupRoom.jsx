import { useMemo, useState } from "react";

const leftNav = [
  { key: "overview", label: "Overview" },
  { key: "board", label: "Board" },
  { key: "notes", label: "Notes" },
  { key: "assignments", label: "Assignments" },
  { key: "files", label: "Files" },
  { key: "members", label: "Members" },
  { key: "admin", label: "Admin" },
  { key: "settings", label: "Settings" },
];

function NavItem({ active, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className={[
        "w-full text-left px-3 py-2 rounded-lg text-sm",
        active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function Pill({ text }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700">
      {text}
    </span>
  );
}

function Dropdown({ label, items }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50"
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        {label} {"\u25BE"}
      </button>
      {open ? (
        <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden z-20">
          {items.map((it) => (
            <button
              key={it.label}
              onClick={() => {
                setOpen(false);
                it.onClick?.();
              }}
              className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
              type="button"
            >
              {it.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function RightTabs({ tab, setTab }) {
  const tabs = [
    { key: "chat", label: "Chat" },
    { key: "ai", label: "AI" },
    { key: "comments", label: "Comments" },
    { key: "activity", label: "Activity" },
  ];
  return (
    <div className="flex gap-2 flex-wrap">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => setTab(t.key)}
          className={[
            "px-3 py-2 rounded-lg text-sm border",
            tab === t.key
              ? "bg-slate-900 text-white border-slate-900"
              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50",
          ].join(" ")}
          type="button"
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export default function SubgroupRoom({ onBack }) {
  const [active, setActive] = useState("board");
  const [rightTab, setRightTab] = useState("chat");

  const group = useMemo(
    () => ({
      id: "grp_123",
      name: "CSC 202 - Study Group",
      course: "Computer Science",
      locked: false,
      role: "group_admin",
    }),
    []
  );

  const members = useMemo(
    () => [
      { name: "Alice", status: "online" },
      { name: "Tony", status: "online" },
      { name: "Sarah", status: "away" },
      { name: "Matthew", status: "offline" },
    ],
    []
  );

  const canAdmin = group.role === "group_admin";

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="bg-white border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => onBack?.()}
              className="mb-2 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              {"<"} Back to NewChat
            </button>
            <div className="text-lg font-semibold text-slate-900 truncate">{group.name}</div>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <Pill text={group.course} />
              <Pill text={group.locked ? "Locked" : "Unlocked"} />
              <Pill text={group.role} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              className="hidden md:block rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
              placeholder="Search notes/files..."
            />
            <button className="rounded-xl bg-slate-900 text-white px-4 py-2 text-sm font-semibold hover:bg-slate-800">
              Invite
            </button>

            <Dropdown
              label="More"
              items={[
                { label: "Export board", onClick: () => alert("Export later") },
                { label: "Open audit log", onClick: () => setRightTab("activity") },
                { label: "Report issue", onClick: () => alert("Report later") },
              ]}
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-6 grid grid-cols-12 gap-6">
        <aside className="col-span-12 md:col-span-3 lg:col-span-2">
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 text-xs font-semibold text-slate-500 bg-slate-50 border-b border-slate-200">
              Subgroup Menu
            </div>
            <nav className="p-2 space-y-1">
              {leftNav
                .filter((x) => (x.key === "admin" ? canAdmin : true))
                .map((item) => (
                  <NavItem
                    key={item.key}
                    label={item.label}
                    active={active === item.key}
                    onClick={() => setActive(item.key)}
                  />
                ))}
            </nav>
          </div>

          <div className="mt-4 rounded-2xl bg-white border border-slate-200 shadow-sm p-4">
            <div className="text-sm font-semibold text-slate-900">Live Members</div>
            <div className="mt-3 space-y-2">
              {members.map((m) => (
                <div key={m.name} className="flex items-center justify-between text-sm">
                  <div className="text-slate-800">{m.name}</div>
                  <div className="text-slate-500">{m.status}</div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <main className="col-span-12 md:col-span-6 lg:col-span-7">
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  {active === "board" ? "Shared Board" : active[0].toUpperCase() + active.slice(1)}
                </div>
                <div className="text-xs text-slate-500">Phase 1: shared notes + presence + uploads</div>
              </div>

              {active === "board" && canAdmin ? (
                <Dropdown
                  label="Admin Controls"
                  items={[
                    { label: "Lock board", onClick: () => alert("Lock later") },
                    { label: "Mute member", onClick: () => alert("Mute later") },
                    { label: "Remove member", onClick: () => alert("Remove later") },
                  ]}
                />
              ) : null}
            </div>

            <div className="p-5">
              {active === "board" ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm text-slate-700">
                    Board MVP: start with shared text or markdown. Later upgrade to canvas whiteboard and cursors.
                  </div>
                  <textarea
                    className="mt-3 w-full min-h-[320px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                    placeholder="Shared notes board (realtime later)..."
                  />
                  <div className="mt-3 flex gap-2">
                    <button className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm hover:bg-slate-50">
                      Upload file
                    </button>
                    <button className="rounded-xl bg-slate-900 text-white px-4 py-2 text-sm font-semibold hover:bg-slate-800">
                      Save (local)
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-700">
                  This is the <b>{active}</b> page placeholder. We will implement it page-by-page.
                </div>
              )}
            </div>
          </div>
        </main>

        <aside className="col-span-12 md:col-span-3 lg:col-span-3">
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
              <div className="text-sm font-semibold text-slate-900">Side Panel</div>
              <div className="mt-3">
                <RightTabs tab={rightTab} setTab={setRightTab} />
              </div>
            </div>

            <div className="p-4">
              {rightTab === "chat" ? (
                <div className="text-sm text-slate-700">
                  Group chat (realtime later)
                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 h-[220px] overflow-auto" />
                  <div className="mt-3 flex gap-2">
                    <input className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none" placeholder="Message..." />
                    <button className="rounded-xl bg-blue-600 text-white px-4 py-2 text-sm font-semibold">Send</button>
                  </div>
                </div>
              ) : rightTab === "ai" ? (
                <div className="text-sm text-slate-700">
                  AI assistant (Phase 3)
                  <div className="mt-2 text-xs text-slate-500">
                    Will use subgroup context + library retrieval + citations.
                  </div>
                  <button
                    className="mt-3 w-full rounded-xl bg-slate-900 text-white px-4 py-2 text-sm font-semibold"
                    onClick={() => alert("Wire /api/subgroups/{id}/ai later")}
                  >
                    Ask AI
                  </button>
                </div>
              ) : rightTab === "comments" ? (
                <div className="text-sm text-slate-700">
                  Comments (Phase 2)
                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 h-[260px]" />
                </div>
              ) : (
                <div className="text-sm text-slate-700">
                  Activity or audit (Phase 2+)
                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 h-[260px]" />
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
