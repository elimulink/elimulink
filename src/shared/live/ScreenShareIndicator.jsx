import React from "react";
import { MonitorUp } from "lucide-react";

export default function ScreenShareIndicator({
  isSharing,
  shareSurface = "unknown",
  onStop,
}) {
  if (!isSharing) return null;

  const labelMap = {
    monitor: "Entire screen sharing",
    window: "App/window sharing",
    browser: "Tab/app sharing",
    unknown: "Screen sharing active",
  };

  return (
    <div className="fixed left-1/2 top-4 z-[140] -translate-x-1/2">
      <div className="flex items-center gap-3 rounded-full border border-white/20 bg-[#0d1324]/90 px-4 py-2.5 shadow-[0_12px_34px_rgba(0,0,0,0.28)] backdrop-blur-xl">
        <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]" />
        <MonitorUp size={15} className="text-white/80" />
        <div className="text-sm font-medium text-white">
          {labelMap[shareSurface] || "Screen sharing active"}
        </div>
        <button
          type="button"
          onClick={onStop}
          className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white transition hover:bg-white/15"
        >
          Stop
        </button>
      </div>
    </div>
  );
}
