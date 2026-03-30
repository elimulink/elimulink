import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown, ShieldCheck } from "lucide-react";
import { getStoredThemeMode, setThemeMode } from "../../lib/theme";
import {
  DEFAULT_APP_LANGUAGE,
  getStoredPreferences,
  saveStoredPreferences,
} from "../../lib/userSettings";
import { loadVoiceSettings, saveVoiceSettings } from "../audio/voiceSettings";
import DesktopMfaSetupManager from "./DesktopMfaSetupManager.jsx";
import "./desktop-settings-workspace.css";

const LANGUAGE_OPTIONS = [
  { code: "auto", label: "Auto-detect" },
  { code: "en", label: "English" },
  { code: "sw", label: "Kiswahili (Swahili)" },
  { code: "fr", label: "French" },
  { code: "es", label: "Spanish" },
  { code: "pt", label: "Portuguese" },
  { code: "de", label: "German" },
  { code: "it", label: "Italian" },
  { code: "nl", label: "Dutch" },
  { code: "zh", label: "Chinese (Simplified)" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
];

const THEME_OPTIONS = [
  { id: "system", label: "System" },
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
];

const ACCENT_OPTIONS = [
  { id: "default", label: "Default" },
  { id: "blue", label: "Blue" },
  { id: "green", label: "Green" },
  { id: "yellow", label: "Yellow" },
  { id: "pink", label: "Pink" },
  { id: "orange", label: "Orange" },
  { id: "purple", label: "Purple" },
];

const VOICE_PRESET_TO_ID = {
  Sol: "nova",
  Spruce: "vega",
  Juniper: "ursa",
  Ember: "orbit",
  Vale: "orion",
  Arbor: "capella",
  Maple: "dipper",
  Cove: "pegasus",
  Breeze: "lyra",
};

const VOICE_OPTIONS = Object.keys(VOICE_PRESET_TO_ID);

function Card({ title, description, children }) {
  return (
    <section className="el-settings-section-card">
      <div className="el-settings-section-head">
        <div className="el-settings-section-title">{title}</div>
        {description ? <p className="el-settings-section-description">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function ChoiceChips({ value, onChange, options }) {
  return (
    <div className="el-settings-choice-grid">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          className={`el-settings-choice-chip ${value === option.id ? "is-active" : ""}`}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="el-settings-select-field">
      <div className="el-settings-select-label">{label}</div>
      <div className="el-settings-select-shell">
        <select value={value} onChange={(event) => onChange(event.target.value)} className="el-settings-select">
          {options.map((option) => (
            <option key={option.code} value={option.code}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown size={16} />
      </div>
    </label>
  );
}

export default function DesktopGeneralSettingsSection({ user }) {
  const uid = user?.uid || null;
  const [prefs, setPrefs] = useState(() => {
    const stored = getStoredPreferences(
      {
        language: DEFAULT_APP_LANGUAGE,
        languageMode: "manual",
        spokenLanguage: "auto",
        accentColor: "default",
        separateVoiceEnabled: false,
      },
      uid,
    );
    return {
      ...stored,
      theme: getStoredThemeMode(),
    };
  });
  const [voiceSettings, setVoiceSettings] = useState(() => loadVoiceSettings(uid));
  const [isMfaManagerOpen, setIsMfaManagerOpen] = useState(false);

  const selectedVoicePreset = useMemo(() => {
    const matched = Object.entries(VOICE_PRESET_TO_ID).find(([, voiceId]) => voiceId === voiceSettings.voiceId);
    return matched?.[0] || "Sol";
  }, [voiceSettings.voiceId]);
  const languageSelectValue = prefs.languageMode === "auto" ? "auto" : prefs.language || DEFAULT_APP_LANGUAGE;

  useEffect(() => {
    setThemeMode(String(prefs.theme || "system"));
  }, [prefs.theme]);

  useEffect(() => {
    const nextPrefs = {
      ...getStoredPreferences({}, uid),
      ...prefs,
      language: prefs.language || DEFAULT_APP_LANGUAGE,
    };
    saveStoredPreferences(nextPrefs, uid);
  }, [prefs, uid]);

  useEffect(() => {
    saveVoiceSettings(voiceSettings, uid);
  }, [voiceSettings, uid]);

  return (
    <div className="el-settings-general-layout">
      <Card
        title="Set up MFA"
        description="Add another layer of sign-in protection for your workspace. Multi-factor enrollment is not wired yet in this desktop pass."
      >
        <div className="el-settings-mfa-card">
          <div className="el-settings-mfa-copy">
            <ShieldCheck size={18} />
            <div>
              <div className="el-settings-mfa-title">Extra account protection</div>
              <div className="el-settings-mfa-subtitle">
                Enable a stronger sign-in flow when this feature is connected.
              </div>
            </div>
          </div>
          <button
            type="button"
            className="el-settings-primary-button"
            onClick={() => setIsMfaManagerOpen(true)}
          >
            Set up MFA
          </button>
        </div>
      </Card>

      <Card title="Appearance" description="Choose how the workspace should look on this device.">
        <ChoiceChips
          value={prefs.theme || "system"}
          onChange={(theme) => setPrefs((current) => ({ ...current, theme }))}
          options={THEME_OPTIONS}
        />
      </Card>

      <Card title="Accent color" description="Saved as a desktop placeholder for the upcoming visual theme layer.">
        <ChoiceChips
          value={prefs.accentColor || "default"}
          onChange={(accentColor) => setPrefs((current) => ({ ...current, accentColor }))}
          options={ACCENT_OPTIONS}
        />
      </Card>

      <div className="el-settings-two-column-grid">
        <Card title="Language" description="Set the main workspace language.">
          <SelectField
            label="Language"
            value={languageSelectValue}
            onChange={(languageValue) =>
              setPrefs((current) => ({
                ...current,
                languageMode: languageValue === "auto" ? "auto" : "manual",
                language: languageValue === "auto" ? current.language || DEFAULT_APP_LANGUAGE : languageValue,
              }))
            }
            options={LANGUAGE_OPTIONS}
          />
        </Card>

        <Card title="Spoken language" description="Prepared for future speech preference controls.">
          <SelectField
            label="Spoken language"
            value={prefs.spokenLanguage || "auto"}
            onChange={(spokenLanguage) => setPrefs((current) => ({ ...current, spokenLanguage }))}
            options={LANGUAGE_OPTIONS}
          />
        </Card>
      </div>

      <Card title="Voice" description="Choose the voice profile used for AI audio playback.">
        <ChoiceChips
          value={selectedVoicePreset}
          onChange={(preset) =>
            setVoiceSettings((current) => ({
              ...current,
              voiceId: VOICE_PRESET_TO_ID[preset] || current.voiceId,
            }))
          }
          options={VOICE_OPTIONS.map((option) => ({ id: option, label: option }))}
        />
      </Card>

      <Card title="Separate Voice" description="Prepared for future split voice behavior between workspace contexts.">
        <div className="el-settings-toggle-row">
          <div>
            <div className="el-settings-toggle-title">Separate Voice</div>
            <div className="el-settings-toggle-subtitle">
              Keep an independent voice preference for this upcoming mode.
            </div>
          </div>
          <button
            type="button"
            className={`el-settings-toggle ${prefs.separateVoiceEnabled ? "is-active" : ""}`}
            aria-pressed={prefs.separateVoiceEnabled === true}
            onClick={() =>
              setPrefs((current) => ({
                ...current,
                separateVoiceEnabled: !current.separateVoiceEnabled,
              }))
            }
          >
            <span />
          </button>
        </div>
      </Card>

      <DesktopMfaSetupManager
        open={isMfaManagerOpen}
        onClose={() => setIsMfaManagerOpen(false)}
      />
    </div>
  );
}
