import React from "react";
import DesktopAppsSettingsSection from "./DesktopAppsSettingsSection.jsx";
import DesktopDataControlsSettingsSection from "./DesktopDataControlsSettingsSection.jsx";
import DesktopGeneralSettingsSection from "./DesktopGeneralSettingsSection.jsx";
import DesktopAccountSettingsSection from "./DesktopAccountSettingsSection.jsx";
import DesktopNotificationsSettingsSection from "./DesktopNotificationsSettingsSection.jsx";
import DesktopParentalControlsSettingsSection from "./DesktopParentalControlsSettingsSection.jsx";
import DesktopPersonalizationSettingsSection from "./DesktopPersonalizationSettingsSection.jsx";
import DesktopSchedulesSettingsSection from "./DesktopSchedulesSettingsSection.jsx";
import DesktopSecuritySettingsSection from "./DesktopSecuritySettingsSection.jsx";
import "./desktop-settings-workspace.css";

const DEFAULT_SECTIONS = [
  { id: "general", label: "General" },
  { id: "notifications", label: "Notifications" },
  { id: "personalization", label: "Personalization" },
  { id: "apps", label: "Apps" },
  { id: "schedules", label: "Schedules" },
  { id: "dataControls", label: "Data controls" },
  { id: "security", label: "Security" },
  { id: "parentalControls", label: "Parental controls" },
  { id: "account", label: "Account" },
];

const SECTION_LABELS = {
  general: "General",
  notifications: "Notifications",
  personalization: "Personalization",
  apps: "Apps",
  schedules: "Schedules",
  dataControls: "Data controls",
  security: "Security",
  parentalControls: "Parental controls",
  account: "Account",
};

function PlaceholderSection({ activeSection }) {
  return (
    <section className="dsw-section">
      <div className="dsw-section-header">
        <h2 className="dsw-section-title">{SECTION_LABELS[activeSection] || "Settings"}</h2>
        <p className="dsw-section-description">
          This area is reserved in the new ElimuLink desktop settings workspace and will open here as its wiring is completed.
        </p>
      </div>

      <div className="dsw-card dsw-placeholder-card">
        <div className="dsw-status-note is-preview">
          <span className="dsw-status-chip">Preview</span>
          Placeholder only for this migration step.
        </div>
        <div className="dsw-placeholder-title">Section not built yet</div>
        <div className="dsw-placeholder-text">
          The navigation and workspace shell are already stable, so future settings can be added here without changing the overall desktop flow.
        </div>
      </div>
    </section>
  );
}

export default function DesktopSettingsWorkspace({
  user,
  activeSection: activeSectionProp = "general",
  activeSectionId,
  onSelectSection,
  onChangeSection,
  onClose,
  generalProps,
  notificationsProps,
  personalizationProps,
  securityProps,
  accountProps,
  dataControlsProps,
  sections = DEFAULT_SECTIONS,
}) {
  const resolvedActiveSection = activeSectionId || activeSectionProp || "general";
  const handleSelectSection = onSelectSection || onChangeSection;
  const selectedSection =
    sections.find((section) => section.id === resolvedActiveSection) || sections[0] || DEFAULT_SECTIONS[0];

  const renderContent = () => {
    if (selectedSection.id === "general") {
      return <DesktopGeneralSettingsSection user={user} {...generalProps} />;
    }

    if (selectedSection.id === "security") {
      return <DesktopSecuritySettingsSection {...securityProps} />;
    }

    if (selectedSection.id === "notifications") {
      return <DesktopNotificationsSettingsSection user={user} {...notificationsProps} />;
    }

    if (selectedSection.id === "personalization") {
      return <DesktopPersonalizationSettingsSection user={user} {...personalizationProps} />;
    }

    if (selectedSection.id === "apps") {
      return <DesktopAppsSettingsSection />;
    }

    if (selectedSection.id === "schedules") {
      return <DesktopSchedulesSettingsSection user={user} />;
    }

    if (selectedSection.id === "dataControls") {
      return <DesktopDataControlsSettingsSection user={user} {...dataControlsProps} />;
    }

    if (selectedSection.id === "parentalControls") {
      return <DesktopParentalControlsSettingsSection user={user} />;
    }

    if (selectedSection.id === "account") {
      return <DesktopAccountSettingsSection user={user} {...accountProps} />;
    }

    return <PlaceholderSection activeSection={selectedSection.id} />;
  };

  return (
    <div className="dsw-shell">
      <aside className="dsw-sidebar">
        <div className="dsw-sidebar-header">
          <div>
            <div className="dsw-sidebar-kicker">ELIMULINK</div>
            <div className="dsw-sidebar-title">Settings</div>
            <div className="dsw-sidebar-copy">Desktop workspace preferences</div>
          </div>
          <button type="button" className="dsw-close" onClick={onClose}>
            Close
          </button>
        </div>

        <nav className="dsw-nav">
          {sections.map((section) => {
            const isActive = section.id === selectedSection.id;
            return (
              <button
                key={section.id}
                type="button"
                className={`dsw-nav-item ${isActive ? "is-active" : ""}`}
                onClick={() => handleSelectSection?.(section.id)}
              >
                {section.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="dsw-content">
        <div className="dsw-content-inner">{renderContent()}</div>
      </main>
    </div>
  );
}
