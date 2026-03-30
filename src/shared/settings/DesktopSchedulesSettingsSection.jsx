import React, { useEffect, useState } from "react";
import { getDesktopSettingsPreviewState, saveDesktopSettingsPreviewState } from "./desktopSettingsPreviewStore";
import "./desktop-settings-workspace.css";

const CADENCE_OPTIONS = ["weekly", "biweekly", "monthly"];
const STUDY_DEFAULT_OPTIONS = ["Balanced", "Exam season", "Deadline focus"];
const REMINDER_OPTIONS = ["15 minutes before", "30 minutes before", "1 hour before"];

export default function DesktopSchedulesSettingsSection({ user }) {
  const uid = user?.uid || null;
  const [prefs, setPrefs] = useState(() => {
    const stored = getDesktopSettingsPreviewState(
      "schedules",
      {
        scheduleClassReminders: true,
        scheduleAssignmentReminders: true,
        scheduleReportCadence: "weekly",
        scheduleCalendarSync: false,
        scheduleStudyDefault: "Balanced",
        scheduleReminderLeadTime: "30 minutes before",
        scheduleTimingPreference: "Respect my local timezone",
      },
      uid,
    );

    return {
      classReminders: stored.scheduleClassReminders !== false,
      assignmentReminders: stored.scheduleAssignmentReminders !== false,
      reportCadence: stored.scheduleReportCadence || "weekly",
      calendarSync: !!stored.scheduleCalendarSync,
      studyDefault: stored.scheduleStudyDefault || "Balanced",
      reminderLeadTime: stored.scheduleReminderLeadTime || "30 minutes before",
      timingPreference: stored.scheduleTimingPreference || "Respect my local timezone",
    };
  });

  useEffect(() => {
    saveDesktopSettingsPreviewState(
      "schedules",
      {
      scheduleClassReminders: prefs.classReminders,
      scheduleAssignmentReminders: prefs.assignmentReminders,
      scheduleReportCadence: prefs.reportCadence,
      scheduleCalendarSync: prefs.calendarSync,
      scheduleStudyDefault: prefs.studyDefault,
      scheduleReminderLeadTime: prefs.reminderLeadTime,
      scheduleTimingPreference: prefs.timingPreference,
      },
      uid,
    );
  }, [prefs, uid]);

  return (
    <section className="dsw-section">
      <div className="dsw-section-header">
        <h2 className="dsw-section-title">Schedules</h2>
        <p className="dsw-section-description">
          Control reminders, schedule defaults, report cadence, and timetable behavior for your workspace.
        </p>
      </div>

      <div className="dsw-card">
        <div className="dsw-status-note is-preview">
          <span className="dsw-status-chip">Frontend only</span>
          These schedule controls are preview preferences and are not yet connected to reminders or sync services.
        </div>
        <div className="dsw-row">
          <div>
            <div className="dsw-row-label">Class reminders</div>
            <div className="dsw-row-help">Enable reminders for upcoming classes and timetable sessions.</div>
          </div>
          <label className="dsw-switch">
            <input
              type="checkbox"
              checked={prefs.classReminders}
              onChange={() =>
                setPrefs((current) => ({ ...current, classReminders: !current.classReminders }))
              }
            />
            <span className="dsw-switch-track" />
          </label>
        </div>

        <div className="dsw-divider" />

        <div className="dsw-row">
          <div>
            <div className="dsw-row-label">Assignment due reminders</div>
            <div className="dsw-row-help">Stay ahead of deadlines with assignment reminder prompts.</div>
          </div>
          <label className="dsw-switch">
            <input
              type="checkbox"
              checked={prefs.assignmentReminders}
              onChange={() =>
                setPrefs((current) => ({
                  ...current,
                  assignmentReminders: !current.assignmentReminders,
                }))
              }
            />
            <span className="dsw-switch-track" />
          </label>
        </div>
      </div>

      <div className="dsw-card">
        <div className="dsw-row dsw-row-top">
          <div>
            <div className="dsw-row-label">Report cadence</div>
            <div className="dsw-row-help">
              Preserve a simple cadence preference for academic or operational summaries.
            </div>
          </div>
        </div>

        <div className="dsw-segment-grid">
          {CADENCE_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              className={`dsw-segment-button ${prefs.reportCadence === option ? "is-active" : ""}`}
              onClick={() => setPrefs((current) => ({ ...current, reportCadence: option }))}
            >
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="dsw-card">
        <div className="dsw-row">
          <div>
            <div className="dsw-row-label">Calendar sync</div>
            <div className="dsw-row-help">
              Prepare calendar sync behavior and show whether schedule sync is currently enabled.
            </div>
          </div>
          <label className="dsw-switch">
            <input
              type="checkbox"
              checked={prefs.calendarSync}
              onChange={() => setPrefs((current) => ({ ...current, calendarSync: !current.calendarSync }))}
            />
            <span className="dsw-switch-track" />
          </label>
        </div>

        <div className="dsw-divider" />

        <div className="dsw-static-value">
          {prefs.calendarSync ? "Calendar sync enabled" : "Calendar sync disabled"}
        </div>
      </div>

      <div className="dsw-card">
        <div className="dsw-row dsw-row-top">
          <div>
            <div className="dsw-row-label">Study schedule defaults</div>
            <div className="dsw-row-help">Pick the default scheduling behavior to use when study plans are generated.</div>
          </div>
        </div>

        <div className="dsw-segment-grid">
          {STUDY_DEFAULT_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              className={`dsw-segment-button ${prefs.studyDefault === option ? "is-active" : ""}`}
              onClick={() => setPrefs((current) => ({ ...current, studyDefault: option }))}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="dsw-card">
        <div className="dsw-row dsw-row-top">
          <div>
            <div className="dsw-row-label">Timetable-related preferences</div>
            <div className="dsw-row-help">Set reminder timing and how timetable timing should be interpreted.</div>
          </div>
        </div>

        <div className="dsw-account-fields">
          <label className="dsw-field">
            <span className="dsw-field-label">Reminder timing</span>
            <select
              className="dsw-input"
              value={prefs.reminderLeadTime}
              onChange={(event) =>
                setPrefs((current) => ({ ...current, reminderLeadTime: event.target.value }))
              }
            >
              {REMINDER_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="dsw-field">
            <span className="dsw-field-label">Timing preference</span>
            <input
              type="text"
              className="dsw-input"
              value={prefs.timingPreference}
              onChange={(event) =>
                setPrefs((current) => ({ ...current, timingPreference: event.target.value }))
              }
              placeholder="Respect my local timezone"
            />
          </label>
        </div>
      </div>
    </section>
  );
}
