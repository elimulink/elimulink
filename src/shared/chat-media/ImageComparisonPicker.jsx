import { Check, SkipForward } from "lucide-react";

export default function ImageComparisonPicker({
  title = "Which image do you like more?",
  images = [],
  selectedIndex = null,
  onChoose,
  onSkip,
}) {
  const items = Array.isArray(images) ? images.slice(0, 2) : [];
  if (items.length < 2) return null;

  return (
    <div className="w-full rounded-[22px] border border-slate-200/80 bg-white/95 p-3 shadow-[0_10px_30px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-slate-950/90">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">{title}</div>
        {typeof onSkip === "function" ? (
          <button
            type="button"
            onClick={onSkip}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
          >
            <SkipForward size={12} />
            Skip
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {items.map((item, index) => {
          const imageUrl = String(item?.image || item?.url || "").trim();
          const isSelected = selectedIndex === index;
          return (
            <button
              key={`${item?.index || index}-${index}`}
              type="button"
              onClick={() => onChoose?.(index)}
              className={[
                "group relative overflow-hidden rounded-[18px] border bg-slate-50 text-left transition active:scale-[0.995]",
                isSelected
                  ? "border-sky-400 ring-2 ring-sky-300/40 dark:border-sky-300 dark:ring-sky-400/30"
                  : "border-slate-200/80 hover:border-slate-300 dark:border-white/10 dark:hover:border-white/20",
              ].join(" ")}
              aria-label={`Choose image ${index + 1}`}
            >
              <div className="absolute left-2 top-2 z-10 rounded-full bg-black/55 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur">
                {index + 1}
              </div>
              {isSelected ? (
                <div className="absolute right-2 top-2 z-10 rounded-full bg-sky-500 px-2 py-1 text-[11px] font-semibold text-white shadow-sm">
                  <Check size={11} className="inline-block" /> Selected
                </div>
              ) : null}
              <div className="aspect-square bg-slate-100 dark:bg-slate-900">
                <img
                  src={imageUrl}
                  alt={`Image option ${index + 1}`}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                  loading="lazy"
                />
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChoose?.(0)}
          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
        >
          Choose 1
        </button>
        <button
          type="button"
          onClick={() => onChoose?.(1)}
          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
        >
          Choose 2
        </button>
      </div>
    </div>
  );
}
