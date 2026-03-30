import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Bell,
  BrushCleaning,
  CalendarDays,
  ChevronRight,
  Database,
  Lock,
  Puzzle,
  Settings,
  Shield,
  User,
} from "lucide-react";
import "./desktop-settings-launcher.css";

const DEFAULT_ITEMS = [
  { id: "general", label: "General", icon: Settings },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "personalization", label: "Personalization", icon: BrushCleaning },
  { id: "tools", label: "Tools & Integrations", icon: Puzzle },
  { id: "schedules", label: "Schedules", icon: CalendarDays },
  { id: "data", label: "Data controls", icon: Database },
  { id: "security", label: "Security", icon: Lock },
  { id: "account", label: "Account", icon: User },
  { id: "parental", label: "Parental controls", icon: Shield },
];

const PANEL_WIDTH = 324;
const VIEWPORT_GUTTER = 16;
const PANEL_GAP = 10;

export default function DesktopSettingsLauncher({
  open,
  anchorRef,
  onClose,
  onSelectSection,
  items = DEFAULT_ITEMS,
}) {
  const panelRef = useRef(null);
  const [position, setPosition] = useState({ top: VIEWPORT_GUTTER, left: VIEWPORT_GUTTER });

  useLayoutEffect(() => {
    if (!open) return undefined;

    function updatePosition() {
      const anchor = anchorRef?.current;
      if (!anchor || typeof window === "undefined") return;

      const rect = anchor.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const panelHeight = panelRef.current?.offsetHeight || 560;

      let left = rect.left;
      if (left < VIEWPORT_GUTTER) {
        left = VIEWPORT_GUTTER;
      }
      if (left + PANEL_WIDTH > viewportWidth - VIEWPORT_GUTTER) {
        left = Math.max(VIEWPORT_GUTTER, viewportWidth - PANEL_WIDTH - VIEWPORT_GUTTER);
      }

      const preferredTop = rect.top - 6;
      const maxTop = Math.max(VIEWPORT_GUTTER, viewportHeight - panelHeight - VIEWPORT_GUTTER);
      const top = Math.min(Math.max(preferredTop, VIEWPORT_GUTTER), maxTop);
      setPosition({ top, left });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return undefined;

    function handlePointerDown(event) {
      const target = event.target;
      const insidePanel = panelRef.current?.contains(target);
      const insideAnchor = anchorRef?.current?.contains(target);

      if (!insidePanel && !insideAnchor) {
        onClose?.();
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose?.();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, anchorRef, onClose]);

  if (!open) return null;

  const launcher = (
    <div
      className="el-settings-launcher-layer"
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
    >
      <div className="el-settings-launcher" ref={panelRef}>
        <div className="el-settings-launcher-head">
          <div className="el-settings-launcher-title">Settings</div>
          <div className="el-settings-launcher-subtitle">Choose a section to open</div>
        </div>

        <div className="el-settings-launcher-list">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className="el-settings-launcher-item"
                onClick={() => onSelectSection?.(item.id)}
              >
                <span className="el-settings-launcher-icon">
                  <Icon size={16} strokeWidth={2} />
                </span>

                <span className="el-settings-launcher-label">{item.label}</span>

                <span className="el-settings-launcher-arrow">
                  <ChevronRight size={16} strokeWidth={2} />
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return launcher;
  return createPortal(launcher, document.body);
}
