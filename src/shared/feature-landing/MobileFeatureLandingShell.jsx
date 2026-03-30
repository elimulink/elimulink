import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronRight,
  Menu,
  MoreHorizontal,
  MoreVertical,
  PhoneCall,
  Plus,
  Send,
  Settings2,
  Share2,
  X,
} from "lucide-react";
import "./mobile-feature-landing.css";

function BottomSheet({ open, title, onClose, children, size = "default" }) {
  if (!open) return null;
  return (
    <div className="mfl-sheet-layer" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="mfl-sheet-backdrop" onClick={onClose} aria-label="Close" />
      <div className={`mfl-sheet ${size === "large" ? "mfl-sheet-large" : ""}`}>
        <div className="mfl-sheet-handle" />
        <div className="mfl-sheet-header">
          <div className="mfl-sheet-title">{title}</div>
          <button type="button" className="mfl-sheet-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="mfl-sheet-body">{children}</div>
      </div>
    </div>
  );
}

function ActionIcon({ icon: Icon, size = 18 }) {
  if (!Icon) return null;
  return <Icon size={size} />;
}

function FloatingMenu({ open, className = "", children }) {
  if (!open) return null;
  return <div className={`mfl-floating-menu ${className}`}>{children}</div>;
}

export default function MobileFeatureLandingShell({
  featureName = "ElimuLink",
  featureSubtitle = "",
  featureDescription = "",
  featureIcon: FeatureIcon = null,
  workspaceLabel = "University",
  workspaceHint = "",
  workspaceBadge = "",
  onWorkspace,
  items = [],
  quickActions = [],
  institutionLabel = "",
  institutionDescription = "",
  institutionMeta = "",
  hideInstitutionStrip = false,
  featureStyle = "default",
  quickActionsStyle = "tiles",
  listStyle = "cards",
  inputPlaceholder = "New chat",
  onMenu,
  onShare,
  onSettings,
  onShareSubmit,
  shareConfig = null,
  utilityActions = [],
  onNewWork,
  onStartCall,
  onInputChange,
  inputValue = "",
  onInputSubmit,
  onOpenItem,
  emptyState = "No saved work yet.",
  emptyStateTitle = "Nothing here yet",
  emptyStateActionLabel = "",
  onEmptyStateAction,
}) {
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [composerHeight, setComposerHeight] = useState(0);
  const [utilityMenuOpen, setUtilityMenuOpen] = useState(false);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const [activeItemMenuId, setActiveItemMenuId] = useState(null);
  const [shareInvite, setShareInvite] = useState(shareConfig?.defaultEmail || "");
  const [shareAccess, setShareAccess] = useState(shareConfig?.defaultAccess || shareConfig?.accessOptions?.[0]?.value || "private");
  const [shareStatus, setShareStatus] = useState("");
  const [shareBusy, setShareBusy] = useState(false);
  const composerRef = useRef(null);
  const topbarMenuRef = useRef(null);
  const listRef = useRef(null);
  const hasInputValue = useMemo(() => String(inputValue || "").trim().length > 0, [inputValue]);
  const workspaceIsInteractive = typeof onWorkspace === "function";
  const resolvedQuickActions = quickActions.filter(Boolean).slice(0, 4);
  const resolvedUtilityActions = [
    typeof onSettings === "function"
      ? {
          key: "settings",
          label: "Workspace settings",
          icon: Settings2,
          onClick: onSettings,
        }
      : null,
    ...utilityActions,
  ].filter(Boolean);
  const shareMembers = Array.isArray(shareConfig?.members) ? shareConfig.members : [];
  const shareAccessOptions = Array.isArray(shareConfig?.accessOptions) && shareConfig.accessOptions.length
    ? shareConfig.accessOptions
    : [{ value: shareAccess, label: shareAccess }];

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const viewport = window.visualViewport;
    if (!viewport) return undefined;

    const updateKeyboardInset = () => {
      const nextInset = Math.max(0, window.innerHeight - (viewport.height + viewport.offsetTop));
      setKeyboardInset(nextInset);
    };

    updateKeyboardInset();
    viewport.addEventListener("resize", updateKeyboardInset);
    viewport.addEventListener("scroll", updateKeyboardInset);

    return () => {
      viewport.removeEventListener("resize", updateKeyboardInset);
      viewport.removeEventListener("scroll", updateKeyboardInset);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const node = composerRef.current;
    if (!node) return undefined;

    const updateComposerHeight = () => {
      setComposerHeight(node.getBoundingClientRect().height || 0);
    };

    updateComposerHeight();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateComposerHeight);
      return () => window.removeEventListener("resize", updateComposerHeight);
    }

    const observer = new ResizeObserver(() => updateComposerHeight());
    observer.observe(node);
    window.addEventListener("resize", updateComposerHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateComposerHeight);
    };
  }, []);

  useEffect(() => {
    setShareInvite(shareConfig?.defaultEmail || "");
  }, [shareConfig?.defaultEmail]);

  useEffect(() => {
    setShareAccess(shareConfig?.defaultAccess || shareConfig?.accessOptions?.[0]?.value || "private");
  }, [shareConfig?.defaultAccess, shareConfig?.accessOptions]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const handlePointerDown = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (utilityMenuOpen && !target.closest("[data-mfl-utility]")) {
        setUtilityMenuOpen(false);
      }
      if (activeItemMenuId && !target.closest("[data-mfl-row-menu]")) {
        setActiveItemMenuId(null);
      }
    };

    const handleEscape = (event) => {
      if (event.key !== "Escape") return;
      setUtilityMenuOpen(false);
      setActiveItemMenuId(null);
      setShareSheetOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [utilityMenuOpen, activeItemMenuId]);

  function handleInputKeyDown(event) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    onInputSubmit?.(String(event.currentTarget.value || "").trim());
  }

  function handleSend() {
    const nextValue = String(inputValue || "").trim();
    if (!nextValue) return;
    onInputSubmit?.(nextValue);
  }

  async function handleShareSubmit() {
    if (!onShareSubmit) {
      onShare?.();
      setShareSheetOpen(false);
      return;
    }
    setShareStatus("");
    setShareBusy(true);
    try {
      const result = await onShareSubmit({
        email: String(shareInvite || "").trim(),
        access: shareAccess,
      });
      if (result?.status) setShareStatus(result.status);
      if (result?.closeOnSuccess) setShareSheetOpen(false);
    } catch (error) {
      setShareStatus(error?.message || "Unable to complete sharing right now.");
    } finally {
      setShareBusy(false);
    }
  }

  function runUtilityAction(action) {
    setUtilityMenuOpen(false);
    action?.onClick?.();
  }

  function runItemAction(item, action) {
    setActiveItemMenuId(null);
    action?.onClick?.(item);
  }

  const utilityPrimaryActions = resolvedUtilityActions.filter((action) => !action.destructive);
  const utilityDangerActions = resolvedUtilityActions.filter((action) => action.destructive);
  const activeItem = items.find((item) => item.id === activeItemMenuId) || null;
  const activeItemActions = Array.isArray(activeItem?.actions) ? activeItem.actions : [];
  const activeItemPrimaryActions = activeItemActions.filter((action) => !action.destructive);
  const activeItemDangerActions = activeItemActions.filter((action) => action.destructive);
  const featureHeadClass = [
    "mfl-feature-card",
    featureStyle === "soft" ? "mfl-feature-card-soft" : "",
  ].join(" ").trim();
  const quickActionsClass = [
    "mfl-quick-actions-grid",
    quickActionsStyle === "rows" ? "mfl-quick-actions-list" : "",
  ].join(" ").trim();
  const quickActionItemClass = [
    "mfl-quick-action",
    quickActionsStyle === "rows" ? "mfl-quick-action-row" : "",
  ].join(" ").trim();
  const listClass = [
    "mfl-list",
    listStyle === "plain" ? "mfl-list-plain" : "",
  ].join(" ").trim();
  const listItemClass = [
    "mfl-list-item",
    listStyle === "plain" ? "mfl-list-item-plain" : "",
  ].join(" ").trim();

  return (
    <div className="mfl-page">
      <header className="mfl-topbar">
        <button type="button" className="mfl-pill mfl-icon-pill" onClick={onMenu} aria-label="Open menu">
          <Menu size={22} />
        </button>

        {workspaceIsInteractive ? (
          <button
            type="button"
            className="mfl-pill mfl-center-chip mfl-center-chip-button"
            onClick={onWorkspace}
            title={workspaceHint || workspaceLabel}
          >
            {workspaceLabel}
          </button>
        ) : (
          <div
            className="mfl-pill mfl-center-chip mfl-center-chip-display"
            title={workspaceHint || workspaceLabel}
            aria-label={workspaceHint || workspaceLabel}
          >
            {workspaceLabel}
          </div>
        )}

        <div className="mfl-topbar-right" ref={topbarMenuRef}>
          <button
            type="button"
            className="mfl-pill mfl-icon-pill"
            onClick={() => {
              setShareStatus("");
              setShareSheetOpen(true);
            }}
            aria-label="Share"
            title="Share"
          >
            <Share2 size={18} />
          </button>

          <div className="mfl-floating-anchor" data-mfl-utility>
            <button
              type="button"
              className="mfl-pill mfl-icon-pill"
              onClick={onMenu}
              aria-label="Open menu"
              title="Open menu"
            >
              <MoreVertical size={18} />
            </button>

            <FloatingMenu open={utilityMenuOpen}>
              <div className="mfl-menu-card">
                {utilityPrimaryActions.map((action) => (
                  <button
                    key={action.key || action.label}
                    type="button"
                    className="mfl-menu-action"
                    onClick={() => runUtilityAction(action)}
                  >
                    <span className="mfl-menu-action-main">
                      <span className="mfl-menu-action-icon">
                        <ActionIcon icon={action.icon} />
                      </span>
                      <span className="mfl-menu-action-label">{action.label}</span>
                    </span>
                  </button>
                ))}
                {utilityDangerActions.length ? <div className="mfl-menu-divider" /> : null}
                {utilityDangerActions.map((action) => (
                  <button
                    key={action.key || action.label}
                    type="button"
                    className="mfl-menu-action mfl-menu-action-danger"
                    onClick={() => runUtilityAction(action)}
                  >
                    <span className="mfl-menu-action-main">
                      <span className="mfl-menu-action-icon">
                        <ActionIcon icon={action.icon} />
                      </span>
                      <span className="mfl-menu-action-label">{action.label}</span>
                    </span>
                  </button>
                ))}
              </div>
            </FloatingMenu>
          </div>
        </div>
      </header>

      <div
        className="mfl-content"
        style={{ paddingBottom: `calc(${Math.max(composerHeight, 96)}px + ${keyboardInset}px + 12px)` }}
      >
        <section className="mfl-feature-head">
          <div className={featureHeadClass}>
            {workspaceBadge ? <div className="mfl-feature-badge">{workspaceBadge}</div> : null}
            <div className="mfl-feature-title-row">
              {FeatureIcon ? (
                <span className="mfl-feature-icon" aria-hidden="true">
                  <FeatureIcon size={26} />
                </span>
              ) : null}
              <div className="mfl-feature-copy">
                <h1 className="mfl-feature-title">{featureName}</h1>
                {featureSubtitle ? <div className="mfl-feature-subtitle">{featureSubtitle}</div> : null}
              </div>
            </div>
            {featureDescription ? <p className="mfl-feature-description">{featureDescription}</p> : null}
          </div>
        </section>

        {!hideInstitutionStrip && (institutionLabel || institutionDescription || institutionMeta) ? (
          <section className="mfl-context-strip" aria-label="Institution context">
            <div className="mfl-context-copy">
              {institutionLabel ? <div className="mfl-context-label">{institutionLabel}</div> : null}
              {institutionDescription ? <div className="mfl-context-description">{institutionDescription}</div> : null}
            </div>
            {institutionMeta ? <div className="mfl-context-meta">{institutionMeta}</div> : null}
          </section>
        ) : null}

        {resolvedQuickActions.length ? (
          <section className="mfl-quick-actions" aria-label={`${featureName} quick actions`}>
            <div className="mfl-section-head">
              <div className="mfl-section-title">Quick actions</div>
              <div className="mfl-section-caption">{featureName}</div>
            </div>
            <div className={quickActionsClass}>
              {resolvedQuickActions.map((action) => (
                <button
                  key={action.key || action.label}
                  type="button"
                  className={quickActionItemClass}
                  onClick={action.onClick}
                >
                  <span className="mfl-quick-action-icon">
                    <ActionIcon icon={action.icon} />
                  </span>
                  <span className="mfl-quick-action-label">{action.label}</span>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mfl-list-wrap" aria-label={`${featureName} work list`}>
          <div className="mfl-section-head">
            <div className="mfl-section-title">{featureName} workspace</div>
            <div className="mfl-section-caption">{items.length} item{items.length === 1 ? "" : "s"}</div>
          </div>

          <section className={listClass} ref={listRef}>
            {items.length ? (
              items.map((item) => (
                <div key={item.id} className="mfl-list-row">
                  <button type="button" className={listItemClass} onClick={() => onOpenItem?.(item)}>
                    <div className="mfl-item-copy">
                      <div className="mfl-item-title-row">
                        <div className="mfl-item-title">{item.title}</div>
                        {item.meta ? <div className="mfl-item-meta">{item.meta}</div> : null}
                      </div>
                      <div className="mfl-item-preview">{item.preview}</div>
                    </div>
                    <ChevronRight size={16} className="mfl-item-arrow" />
                  </button>
                  {Array.isArray(item.actions) && item.actions.length ? (
                    <div className="mfl-row-menu-anchor" data-mfl-row-menu>
                      <button
                        type="button"
                        className="mfl-row-menu-btn"
                        aria-label={`More actions for ${item.title}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          setActiveItemMenuId((prev) => (prev === item.id ? null : item.id));
                        }}
                      >
                        <MoreHorizontal size={17} />
                      </button>

                      <FloatingMenu open={activeItemMenuId === item.id} className="mfl-row-floating-menu">
                        <div className="mfl-menu-card">
                          {activeItemPrimaryActions.map((action) => (
                            <button
                              key={action.key || action.label}
                              type="button"
                              className="mfl-menu-action"
                              onClick={() => runItemAction(item, action)}
                            >
                              <span className="mfl-menu-action-main">
                                <span className="mfl-menu-action-icon">
                                  <ActionIcon icon={action.icon} />
                                </span>
                                <span className="mfl-menu-action-label">{action.label}</span>
                              </span>
                            </button>
                          ))}
                          {activeItemDangerActions.length ? <div className="mfl-menu-divider" /> : null}
                          {activeItemDangerActions.map((action) => (
                            <button
                              key={action.key || action.label}
                              type="button"
                              className="mfl-menu-action mfl-menu-action-danger"
                              onClick={() => runItemAction(item, action)}
                            >
                              <span className="mfl-menu-action-main">
                                <span className="mfl-menu-action-icon">
                                  <ActionIcon icon={action.icon} />
                                </span>
                                <span className="mfl-menu-action-label">{action.label}</span>
                              </span>
                            </button>
                          ))}
                        </div>
                      </FloatingMenu>
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="mfl-empty-card">
                <div className="mfl-empty-title">{emptyStateTitle}</div>
                <div className="mfl-empty-state">{emptyState}</div>
                {emptyStateActionLabel && typeof onEmptyStateAction === "function" ? (
                  <button type="button" className="mfl-empty-action" onClick={onEmptyStateAction}>
                    {emptyStateActionLabel}
                  </button>
                ) : null}
              </div>
            )}
          </section>
        </section>
      </div>

      <div ref={composerRef} className="mfl-composer-wrap" style={{ bottom: `${keyboardInset}px` }}>
        <div className="mfl-composer">
          <button type="button" className="mfl-composer-icon" onClick={onNewWork} aria-label="New work">
            <Plus size={22} />
          </button>

          <div className="mfl-composer-input-wrap">
            <input
              value={inputValue}
              onChange={(e) => onInputChange?.(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder={inputPlaceholder}
              className="mfl-composer-input"
            />
          </div>

          <button
            type="button"
            className={`mfl-composer-icon mfl-action-btn ${hasInputValue ? "mfl-send-btn" : "mfl-call-btn"}`}
            onClick={hasInputValue ? handleSend : onStartCall}
            aria-label={hasInputValue ? "Send" : "Start call"}
          >
            {hasInputValue ? <Send size={18} /> : <PhoneCall size={20} />}
          </button>
        </div>
      </div>

      <BottomSheet open={shareSheetOpen} title={shareConfig?.title || `Share ${featureName}`} onClose={() => setShareSheetOpen(false)} size="large">
        <div className="mfl-share-surface">
          {shareConfig?.description ? <div className="mfl-share-description">{shareConfig.description}</div> : null}

          <label className="mfl-field">
            <span className="mfl-field-label">{shareConfig?.emailLabel || "Invite by email"}</span>
            <input
              type="email"
              value={shareInvite}
              onChange={(event) => setShareInvite(event.target.value)}
              placeholder={shareConfig?.emailPlaceholder || "name@example.com"}
              className="mfl-field-input"
            />
          </label>

          <label className="mfl-field">
            <span className="mfl-field-label">{shareConfig?.accessLabel || "Access"}</span>
            <select className="mfl-field-input" value={shareAccess} onChange={(event) => setShareAccess(event.target.value)}>
              {shareAccessOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {shareMembers.length ? (
            <div className="mfl-share-members">
              <div className="mfl-share-members-title">
                {shareMembers.length === 1 ? "Owner" : shareConfig?.membersTitle || "People with access"}
              </div>
              <div className="mfl-share-members-list">
                {shareMembers.map((member) => (
                  <div key={member.key || member.label} className="mfl-share-member-row">
                    <div>
                      <div className="mfl-share-member-label">{member.label}</div>
                      {member.role ? <div className="mfl-share-member-role">{member.role}</div> : null}
                    </div>
                    {member.meta ? <div className="mfl-share-member-meta">{member.meta}</div> : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {shareConfig?.privacyNote ? <div className="mfl-share-note">{shareConfig.privacyNote}</div> : null}
          {shareStatus ? <div className="mfl-share-status">{shareStatus}</div> : null}

          <button type="button" className="mfl-share-submit" onClick={handleShareSubmit} disabled={shareBusy}>
            {shareBusy ? "Saving..." : shareConfig?.submitLabel || "Share"}
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
