import React, { useMemo, useState } from "react";
import { CalendarDays, FileText, FolderOpen, Mail, MessageSquareText, Video } from "lucide-react";
import "./desktop-settings-workspace.css";

const APP_CARDS = [
  { id: "gmail", label: "Gmail", description: "Email assistance", icon: Mail, connected: true, tone: "is-red" },
  { id: "drive", label: "Google Drive", description: "Files and folders", icon: FolderOpen, connected: false, tone: "is-green" },
  { id: "docs", label: "Google Docs", description: "Document drafting", icon: FileText, connected: false, tone: "is-blue" },
  { id: "calendar", label: "Google Calendar", description: "Events and reminders", icon: CalendarDays, connected: false, tone: "is-yellow" },
  { id: "meet", label: "Meet", description: "Meetings and calls", icon: Video, connected: false, tone: "is-teal" },
  { id: "el-calendar", label: "ElimuLink Calendar", description: "Academic planning", icon: CalendarDays, connected: true, tone: "is-indigo" },
  { id: "el-meet", label: "ElimuLink Meet", description: "Institution sessions", icon: MessageSquareText, connected: true, tone: "is-slate" },
];

export default function DesktopAppsSettingsSection() {
  const [advancedMessage, setAdvancedMessage] = useState("");

  const summary = useMemo(() => {
    const connectedCount = APP_CARDS.filter((app) => app.connected).length;
    return `${connectedCount} connected / ${APP_CARDS.length - connectedCount} available`;
  }, []);

  return (
    <section className="dsw-section">
      <div className="dsw-section-header">
        <h2 className="dsw-section-title">Apps</h2>
        <p className="dsw-section-description">
          Connect your favourite apps for smarter help and manage the apps ElimuLink can use.
        </p>
      </div>

      <div className="dsw-card">
        <div className="dsw-status-note is-preview">
          <span className="dsw-status-chip">Preview</span>
          App cards are ready here; connection permissions can be added without changing this layout.
        </div>

        <div className="dsw-row">
          <div>
            <div className="dsw-row-label">Apps</div>
            <div className="dsw-row-help">{summary}</div>
          </div>
          <button
            type="button"
            className="dsw-button dsw-button-primary"
            onClick={() => window.alert("App connections can be explored in a later integration pass.")}
          >
            Explore apps
          </button>
        </div>

        <div className="dsw-app-grid">
          {APP_CARDS.map((app) => {
            const Icon = app.icon;
            return (
              <div key={app.id} className="dsw-app-card">
                <div className={`dsw-app-icon ${app.tone}`}>
                  <Icon size={18} strokeWidth={2} />
                </div>

                <div className="dsw-app-copy">
                  <div className="dsw-app-title">{app.label}</div>
                  <div className="dsw-app-meta">{app.description}</div>
                </div>

                <span className={`dsw-app-badge ${app.connected ? "is-connected" : "is-available"}`}>
                  {app.connected ? "Connected" : "Available"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="dsw-card">
        <div className="dsw-row">
          <div>
            <div className="dsw-row-label">Advanced settings</div>
            <div className="dsw-row-help">
              Prepare permissions, usage, and sync controls for a later integration pass.
            </div>
          </div>
          <button
            type="button"
            className="dsw-button"
            onClick={() => setAdvancedMessage("Advanced app permissions and sync settings will open here later.")}
          >
            Advanced settings
          </button>
        </div>
      </div>

      {advancedMessage ? <div className="dsw-inline-note">{advancedMessage}</div> : null}
    </section>
  );
}
