import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createInstitutionShareLink,
  deleteInstitutionShareLink,
  fetchInstitutionMessageSources,
} from "../../lib/researchApi";
import ResearchActions from "./ResearchActions";
import { createShareChatLink } from "./researchUtils";

export default function ResearchActionsContainer({
  family,
  app,
  conversationId = "",
  messageIds = [],
  sources = [],
  sharePayload = null,
  backendMode = "fallback",
  initialShareId = "",
  initialShareUrl = "",
  allowShareDelete = false,
}) {
  const [shareUrl, setShareUrl] = useState(initialShareUrl);
  const [shareId, setShareId] = useState(initialShareId);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareDeleteLoading, setShareDeleteLoading] = useState(false);
  const [shareError, setShareError] = useState("");
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [sourcesError, setSourcesError] = useState("");
  const [resolvedSources, setResolvedSources] = useState(sources);

  const isInstitutionBackend = backendMode === "institution";

  useEffect(() => {
    setShareId(initialShareId || "");
  }, [initialShareId]);

  useEffect(() => {
    setShareUrl(initialShareUrl || "");
  }, [initialShareUrl]);

  useEffect(() => {
    setResolvedSources(sources);
  }, [sources]);
  const handleCreateShareLink = useCallback(async () => {
    setShareError("");
    const hasBackendConversationId = String(conversationId || "").startsWith("conv_");
    const validMessageIds = Array.isArray(messageIds)
      ? messageIds.filter((messageId) => String(messageId || "").startsWith("msg_"))
      : [];

    if (isInstitutionBackend) {
      if (!hasBackendConversationId || validMessageIds.length === 0) {
        throw new Error("Share link is available after the conversation is saved.");
      }
      setShareLoading(true);
      try {
        const result = await createInstitutionShareLink({
          conversationId,
          messageIds: validMessageIds,
          visibility: "unlisted",
          allowContinueChat: true,
          expiresInDays: 30,
          baseUrl: window.location.origin,
        });
        setShareId(String(result?.share_link?.id || ""));
        setShareUrl(String(result?.share_link?.url || ""));
        return result?.share_link?.url || "";
      } catch (error) {
        const message = String(error?.message || "Failed to create share link.");
        setShareError(message);
        throw error;
      } finally {
        setShareLoading(false);
      }
    }

    const url = createShareChatLink(sharePayload || {});
    setShareUrl(url);
    return url;
  }, [conversationId, isInstitutionBackend, messageIds, sharePayload]);

  const handleDeleteShareLink = useCallback(async () => {
    if (!isInstitutionBackend || !shareId) return;
    setShareDeleteLoading(true);
    setShareError("");
    try {
      await deleteInstitutionShareLink(shareId);
      setShareId("");
      setShareUrl("");
    } catch (error) {
      setShareError(String(error?.message || "Failed to revoke share link."));
    } finally {
      setShareDeleteLoading(false);
    }
  }, [isInstitutionBackend, shareId]);

  const handleOpenSources = useCallback(async () => {
    setSourcesError("");
    if (!isInstitutionBackend) {
      setResolvedSources(sources);
      return;
    }
    const firstMessageId = Array.isArray(messageIds) ? messageIds.find((value) => String(value || "").startsWith("msg_")) : "";
    if (!firstMessageId) {
      setResolvedSources(sources);
      return;
    }
    setSourcesLoading(true);
    try {
      const result = await fetchInstitutionMessageSources(firstMessageId);
      setResolvedSources(Array.isArray(result?.sources) ? result.sources : []);
    } catch (error) {
      setSourcesError(String(error?.message || "Failed to load sources."));
      setResolvedSources(sources);
    } finally {
      setSourcesLoading(false);
    }
  }, [isInstitutionBackend, messageIds, sources]);

  const effectiveSources = useMemo(() => resolvedSources || [], [resolvedSources]);

  return (
    <ResearchActions
      sources={effectiveSources}
      sharePayload={sharePayload}
      onCreateShareLink={handleCreateShareLink}
      onOpenSources={handleOpenSources}
      sourcesLoading={sourcesLoading}
      sourcesError={sourcesError}
      shareError={shareError}
      shareLoading={shareLoading}
      shareUrl={shareUrl}
      onDeleteShareLink={handleDeleteShareLink}
      shareDeleteLoading={shareDeleteLoading}
      allowShareDelete={isInstitutionBackend && allowShareDelete}
      disableShare={isInstitutionBackend && (!String(conversationId || "").startsWith("conv_") || !Array.isArray(messageIds) || messageIds.length === 0)}
    />
  );
}
