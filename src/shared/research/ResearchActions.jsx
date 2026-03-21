import React, { useMemo, useState } from "react";
import CitationChip from "./CitationChip";
import SourcesDrawer from "./SourcesDrawer";
import ShareChatButton from "./ShareChatButton";
import ShareChatModal from "./ShareChatModal";
import { createShareChatLink } from "./researchUtils";

export default function ResearchActions({
  sources = [],
  sharePayload = null,
  onCreateShareLink,
  onOpenSources,
  sourcesLoading = false,
  sourcesError = "",
  shareError = "",
  shareLoading = false,
  shareUrl = "",
  onDeleteShareLink,
  shareDeleteLoading = false,
  allowShareDelete = false,
  disableShare = false,
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [activeChipIndex, setActiveChipIndex] = useState(-1);
  const [localShareUrl, setLocalShareUrl] = useState("");

  const visibleChips = useMemo(() => sources.slice(0, 4), [sources]);

  const handleCreateLink = async () => {
    if (disableShare) return;
    try {
      if (onCreateShareLink) {
        const nextUrl = await onCreateShareLink();
        if (nextUrl) setLocalShareUrl(String(nextUrl));
        return;
      }
      const nextUrl = createShareChatLink(sharePayload || {});
      setLocalShareUrl(String(nextUrl || ""));
    } catch {
      return;
    }
  };

  const handleOpenSources = async (index = -1) => {
    setActiveChipIndex(index);
    setDrawerOpen(true);
    if (typeof onOpenSources === "function") {
      await onOpenSources();
    }
  };

  return (
    <>
      <div className="mt-3 space-y-3">
        {visibleChips.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {visibleChips.map((source, index) => (
              <CitationChip
                key={source.id ?? index}
                label={source.domain || source.title || `Source ${index + 1}`}
                active={activeChipIndex === index && drawerOpen}
                onClick={() => handleOpenSources(index)}
              />
            ))}
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          <ShareChatButton onClick={() => setShareOpen(true)} disabled={disableShare && !shareUrl}>
            {shareLoading ? "Sharing..." : "Share"}
          </ShareChatButton>

          {sources.length > 0 ? (
            <button
              type="button"
              onClick={() => handleOpenSources(-1)}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-white/75 dark:hover:bg-white/10 dark:hover:text-white"
            >
              Sources
            </button>
          ) : null}
        </div>
      </div>

      <SourcesDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sources={sources}
        loading={sourcesLoading}
        error={sourcesError}
      />

      <ShareChatModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        shareUrl={shareUrl || localShareUrl}
        onCreateLink={handleCreateLink}
        onDeleteLink={onDeleteShareLink}
        isCreating={shareLoading}
        isDeleting={shareDeleteLoading}
        error={shareError}
        allowDelete={allowShareDelete}
      />
    </>
  );
}
