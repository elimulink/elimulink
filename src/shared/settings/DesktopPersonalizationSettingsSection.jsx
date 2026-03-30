import React, { useEffect, useMemo, useState } from "react";
import { getStoredThemeMode } from "../../lib/theme";
import {
  DEFAULT_APP_LANGUAGE,
  getStoredPreferences,
} from "../../lib/userSettings";
import { loadVoiceSettings } from "../audio/voiceSettings";
import { getDesktopSettingsPreviewState, saveDesktopSettingsPreviewState } from "./desktopSettingsPreviewStore";
import DesktopMemoryManager from "./DesktopMemoryManager.jsx";
import "./desktop-settings-workspace.css";

const STYLE_OPTIONS = ["Default", "Professional", "Friendly", "Candid", "Quirky", "Efficient", "Cynical"];
const CHARACTERISTIC_OPTIONS = ["More", "Default", "Less"];
const CHARACTERISTICS = ["Warm", "Enthusiastic", "Headers & Lists", "Emoji"];

const LANGUAGE_LABELS = {
  en: "English",
  sw: "Kiswahili",
  fr: "French",
  es: "Spanish",
  pt: "Portuguese",
  de: "German",
  it: "Italian",
  nl: "Dutch",
  zh: "Chinese (Simplified)",
  ja: "Japanese",
  ko: "Korean",
};

const VOICE_LABELS = {
  nova: "Sol",
  vega: "Spruce",
  ursa: "Juniper",
  orbit: "Ember",
  orion: "Vale",
  capella: "Arbor",
  dipper: "Maple",
  pegasus: "Cove",
  lyra: "Breeze",
};

function resolveLanguageLabel(code) {
  const normalized = String(code || DEFAULT_APP_LANGUAGE).trim().toLowerCase();
  return LANGUAGE_LABELS[normalized] || "English";
}

export default function DesktopPersonalizationSettingsSection({
  user,
  historyItems = [],
}) {
  const uid = user?.uid || null;
  const [prefs, setPrefs] = useState(() => {
    const stored = getDesktopSettingsPreviewState(
      "personalization",
      {
        personalizationStyleTone: "Default",
        personalizationCharacteristics: {
          warm: "Default",
          enthusiastic: "Default",
          headersLists: "Default",
          emoji: "Default",
        },
        personalizationCustomInstructions: "",
        personalizationNickname: "",
        personalizationOccupation: "",
        personalizationAboutYou: "",
      personalizationMemorySaved: true,
      personalizationMemoryHistory: true,
      personalizationMemoryItems: [],
      personalizationRecordHistory: false,
        personalizationAdvanced: {
          webSearch: true,
          canvas: false,
          voice: false,
          advancedVoice: false,
          connectorSearch: false,
        },
      },
      uid,
    );

    return {
      styleTone: stored.personalizationStyleTone || "Default",
      characteristics: {
        warm: stored.personalizationCharacteristics?.warm || "Default",
        enthusiastic: stored.personalizationCharacteristics?.enthusiastic || "Default",
        headersLists: stored.personalizationCharacteristics?.headersLists || "Default",
        emoji: stored.personalizationCharacteristics?.emoji || "Default",
      },
      customInstructions: stored.personalizationCustomInstructions || "",
      nickname: stored.personalizationNickname || "",
      occupation: stored.personalizationOccupation || "",
      aboutYou: stored.personalizationAboutYou || "",
      memorySaved: stored.personalizationMemorySaved !== false,
      memoryHistory: stored.personalizationMemoryHistory !== false,
      memoryItems: Array.isArray(stored.personalizationMemoryItems) ? stored.personalizationMemoryItems : [],
      recordHistory: !!stored.personalizationRecordHistory,
      advanced: {
        webSearch: stored.personalizationAdvanced?.webSearch !== false,
        canvas: !!stored.personalizationAdvanced?.canvas,
        voice: !!stored.personalizationAdvanced?.voice,
        advancedVoice: !!stored.personalizationAdvanced?.advancedVoice,
        connectorSearch: !!stored.personalizationAdvanced?.connectorSearch,
      },
    };
  });

  const themeMode = useMemo(() => getStoredThemeMode(), []);
  const storedLanguage = useMemo(
    () => getStoredPreferences({ language: DEFAULT_APP_LANGUAGE }, uid)?.language || DEFAULT_APP_LANGUAGE,
    [uid],
  );
  const voiceSettings = useMemo(() => loadVoiceSettings(uid), [uid]);

  useEffect(() => {
    saveDesktopSettingsPreviewState(
      "personalization",
      {
      personalizationStyleTone: prefs.styleTone,
      personalizationCharacteristics: prefs.characteristics,
      personalizationCustomInstructions: prefs.customInstructions,
      personalizationNickname: prefs.nickname,
      personalizationOccupation: prefs.occupation,
      personalizationAboutYou: prefs.aboutYou,
      personalizationMemorySaved: prefs.memorySaved,
      personalizationMemoryHistory: prefs.memoryHistory,
      personalizationMemoryItems: prefs.memoryItems,
      personalizationRecordHistory: prefs.recordHistory,
      personalizationAdvanced: prefs.advanced,
      },
      uid,
    );
  }, [prefs, uid]);
  const [isMemoryManagerOpen, setIsMemoryManagerOpen] = useState(false);

  function setCharacteristic(key, value) {
    setPrefs((current) => ({
      ...current,
      characteristics: {
        ...current.characteristics,
        [key]: value,
      },
    }));
  }

  function toggleAdvanced(key) {
    setPrefs((current) => ({
      ...current,
      advanced: {
        ...current.advanced,
        [key]: !current.advanced[key],
      },
    }));
  }

  return (
    <section className="dsw-section">
      <div className="dsw-section-header">
        <h2 className="dsw-section-title">Personalization</h2>
        <p className="dsw-section-description">
          Shape how the workspace sounds and behaves, while keeping your current theme, language, and voice preferences intact.
        </p>
      </div>

      <div className="dsw-card">
        <div className="dsw-status-note is-preview">
          <span className="dsw-status-chip">Mixed</span>
          Theme, language, and voice display are live. Personalization controls below are frontend only.
        </div>
        <div className="dsw-status-note">
          <span className="dsw-status-chip">Live</span>
          Theme, language, and voice chips below reuse your current saved ElimuLink preferences.
        </div>
        <div className="dsw-row dsw-row-top">
          <div>
            <div className="dsw-row-label">Current workspace defaults</div>
            <div className="dsw-row-help">
              Reusing existing settings already stored in the app.
            </div>
          </div>
          <div className="dsw-chip-list">
            <span className="dsw-chip">{themeMode[0].toUpperCase() + themeMode.slice(1)}</span>
            <span className="dsw-chip">{resolveLanguageLabel(storedLanguage)}</span>
            <span className="dsw-chip">{VOICE_LABELS[voiceSettings.voiceId] || "Sol"}</span>
          </div>
        </div>
      </div>

      <div className="dsw-card">
        <div className="dsw-row dsw-row-top">
          <div>
            <div className="dsw-row-label">Base style and tone</div>
            <div className="dsw-row-help">Choose the overall response character for this workspace.</div>
          </div>
        </div>
        <div className="dsw-segment-grid">
          {STYLE_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              className={`dsw-segment-button ${prefs.styleTone === option ? "is-active" : ""}`}
              onClick={() => setPrefs((current) => ({ ...current, styleTone: option }))}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="dsw-card">
        <div className="dsw-row dsw-row-top">
          <div>
            <div className="dsw-row-label">Characteristics</div>
            <div className="dsw-row-help">Fine-tune tone emphasis for the upcoming personalized assistant behavior.</div>
          </div>
        </div>

        <div className="dsw-characteristics-list">
          {CHARACTERISTICS.map((label) => {
            const key =
              label === "Headers & Lists"
                ? "headersLists"
                : label.toLowerCase();
            return (
              <div key={label} className="dsw-characteristic-row">
                <div className="dsw-row-label">{label}</div>
                <div className="dsw-notification-actions">
                  {CHARACTERISTIC_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`dsw-segment-button ${
                        prefs.characteristics[key] === option ? "is-active" : ""
                      }`}
                      onClick={() => setCharacteristic(key, option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="dsw-card">
        <div className="dsw-row dsw-row-top">
          <div>
            <div className="dsw-row-label">Custom instructions</div>
            <div className="dsw-row-help">Additional behavior, style, and tone preferences for future deeper personalization.</div>
          </div>
        </div>
        <textarea
          className="dsw-textarea"
          value={prefs.customInstructions}
          onChange={(event) => setPrefs((current) => ({ ...current, customInstructions: event.target.value }))}
          placeholder="Tell ElimuLink how you want responses to feel and what to emphasize."
        />
      </div>

      <div className="dsw-card">
        <div className="dsw-row dsw-row-top">
          <div>
            <div className="dsw-row-label">About you</div>
            <div className="dsw-row-help">Save lightweight personal context for future assistant tailoring.</div>
          </div>
        </div>

        <div className="dsw-account-fields">
          <label className="dsw-field">
            <span className="dsw-field-label">Nickname</span>
            <input
              type="text"
              className="dsw-input"
              value={prefs.nickname}
              onChange={(event) => setPrefs((current) => ({ ...current, nickname: event.target.value }))}
              placeholder="What should the assistant call you?"
            />
          </label>

          <label className="dsw-field">
            <span className="dsw-field-label">Occupation</span>
            <input
              type="text"
              className="dsw-input"
              value={prefs.occupation}
              onChange={(event) => setPrefs((current) => ({ ...current, occupation: event.target.value }))}
              placeholder="Student, teacher, researcher..."
            />
          </label>

          <label className="dsw-field">
            <span className="dsw-field-label">More about you</span>
            <textarea
              className="dsw-textarea"
              value={prefs.aboutYou}
              onChange={(event) => setPrefs((current) => ({ ...current, aboutYou: event.target.value }))}
              placeholder="Anything else that helps shape responses?"
            />
          </label>
        </div>
      </div>

      <div className="dsw-card">
        <div className="dsw-row dsw-row-top">
          <div>
            <div className="dsw-row-label">Memory</div>
            <div className="dsw-row-help">Frontend-first controls for future memory behavior.</div>
          </div>
          <button type="button" className="dsw-button" onClick={() => setIsMemoryManagerOpen(true)}>
            Manage
          </button>
        </div>

        <div className="dsw-stack">
          <div className="dsw-row">
            <div>
              <div className="dsw-row-label">Reference saved memories</div>
            </div>
            <label className="dsw-switch">
              <input
                type="checkbox"
                checked={prefs.memorySaved}
                onChange={() => setPrefs((current) => ({ ...current, memorySaved: !current.memorySaved }))}
              />
              <span className="dsw-switch-track" />
            </label>
          </div>

          <div className="dsw-divider" />

          <div className="dsw-row">
            <div>
              <div className="dsw-row-label">Reference chat history</div>
            </div>
            <label className="dsw-switch">
              <input
                type="checkbox"
                checked={prefs.memoryHistory}
                onChange={() => setPrefs((current) => ({ ...current, memoryHistory: !current.memoryHistory }))}
              />
              <span className="dsw-switch-track" />
            </label>
          </div>
        </div>
      </div>

      <div className="dsw-card">
        <div className="dsw-row">
          <div>
            <div className="dsw-row-label">Record mode</div>
            <div className="dsw-row-help">Prepare whether record history can be referenced in future flows.</div>
          </div>
          <label className="dsw-switch">
            <input
              type="checkbox"
              checked={prefs.recordHistory}
              onChange={() => setPrefs((current) => ({ ...current, recordHistory: !current.recordHistory }))}
            />
            <span className="dsw-switch-track" />
          </label>
        </div>
      </div>

      <div className="dsw-card">
        <div className="dsw-row dsw-row-top">
          <div>
            <div className="dsw-row-label">Advanced</div>
            <div className="dsw-row-help">Safe frontend toggles for future capability-specific behavior.</div>
          </div>
        </div>

        <div className="dsw-stack">
          {[
            ["webSearch", "Web search"],
            ["canvas", "Canvas"],
            ["voice", "Voice"],
            ["advancedVoice", "Advanced voice"],
            ["connectorSearch", "Connector search"],
          ].map(([key, label]) => (
            <React.Fragment key={key}>
              <div className="dsw-row">
                <div>
                  <div className="dsw-row-label">{label}</div>
                </div>
                <label className="dsw-switch">
                  <input
                    type="checkbox"
                    checked={Boolean(prefs.advanced[key])}
                    onChange={() => toggleAdvanced(key)}
                  />
                  <span className="dsw-switch-track" />
                </label>
              </div>
              {key !== "connectorSearch" ? <div className="dsw-divider" /> : null}
            </React.Fragment>
          ))}
        </div>
      </div>

      <DesktopMemoryManager
        open={isMemoryManagerOpen}
        onClose={() => setIsMemoryManagerOpen(false)}
        memorySaved={prefs.memorySaved}
        memoryHistory={prefs.memoryHistory}
        onToggleMemorySaved={() =>
          setPrefs((current) => ({ ...current, memorySaved: !current.memorySaved }))
        }
        onToggleMemoryHistory={() =>
          setPrefs((current) => ({ ...current, memoryHistory: !current.memoryHistory }))
        }
        savedMemoryItems={prefs.memoryItems}
        onRemoveMemoryItem={(item) =>
          setPrefs((current) => ({
            ...current,
            memoryItems: current.memoryItems.filter((memoryItem) => memoryItem.id !== item.id),
          }))
        }
        onClearMemoryItems={() =>
          setPrefs((current) => ({
            ...current,
            memoryItems: [],
          }))
        }
        historyItems={historyItems}
      />
    </section>
  );
}
