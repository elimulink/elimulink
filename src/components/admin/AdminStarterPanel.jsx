export default function AdminStarterPanel({
  title,
  subtitle,
  stats = [],
  actions = [],
  highlights = [],
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-300/70 bg-white p-4 shadow-sm">
        <div className="text-lg font-semibold text-slate-900">{title}</div>
        <div className="mt-1 text-sm text-slate-700">{subtitle}</div>
      </div>

      {stats.length ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-slate-300/70 bg-white p-4 shadow-sm"
            >
              <div className="text-sm font-medium text-slate-700">{stat.label}</div>
              <div className="mt-1.5 text-2xl font-semibold text-slate-900">{stat.value}</div>
              {stat.note ? <div className="mt-1 text-xs text-slate-600">{stat.note}</div> : null}
            </div>
          ))}
        </div>
      ) : null}

      {actions.length ? (
        <div className="rounded-2xl border border-slate-300/70 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-slate-700">Quick Actions</div>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {actions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                className="rounded-xl border border-slate-300/70 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {highlights.length ? (
        <div className="rounded-2xl border border-slate-300/70 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-slate-700">Highlights</div>
          <div className="mt-2.5 space-y-2">
            {highlights.map((item, index) => (
              <div
                key={`${item}-${index}`}
                className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-800"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
