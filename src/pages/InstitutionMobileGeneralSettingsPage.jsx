import { useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Palette, Play, Volume2, X } from "lucide-react";
import { textToSpeechWithFallback } from "../lib/speechProviders";
import { getStoredThemeMode, setThemeMode } from "../lib/theme";
import {
  DEFAULT_APP_LANGUAGE,
  getStoredPreferences,
  saveStoredPreferences,
} from "../lib/userSettings";
import { VOICE_OPTIONS } from "../shared/audio/voiceOptions";
import { loadVoiceSettings, saveVoiceSettings } from "../shared/audio/voiceSettings";

const THEME_OPTIONS = [
  { id: "system", label: "System" },
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
];

const ACCENT_OPTIONS = [
  { id: "default", label: "Default", dot: "bg-slate-400" },
  { id: "blue", label: "Blue", dot: "bg-sky-500" },
  { id: "green", label: "Green", dot: "bg-emerald-500" },
  { id: "yellow", label: "Yellow", dot: "bg-amber-400" },
  { id: "pink", label: "Pink", dot: "bg-pink-500" },
  { id: "orange", label: "Orange", dot: "bg-orange-500" },
  { id: "purple", label: "Purple", dot: "bg-violet-500" },
];

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

const SPOKEN_LANGUAGE_OPTIONS = LANGUAGE_OPTIONS.filter((option) => option.code !== "auto");

const VOICE_PRESETS = [
  { label: "Sol", voiceId: "nova" },
  { label: "Spruce", voiceId: "vega" },
  { label: "Juniper", voiceId: "ursa" },
  { label: "Ember", voiceId: "orbit" },
  { label: "Vale", voiceId: "orion" },
  { label: "Arbor", voiceId: "capella" },
  { label: "Maple", voiceId: "dipper" },
  { label: "Cove", voiceId: "pegasus" },
  { label: "Breeze", voiceId: "lyra" },
];

function surfaceClasses(extra = "") {
  return `rounded-[28px] bg-white/96 shadow-[0_16px_48px_rgba(15,23,42,0.05)] ring-1 ring-slate-200/75 dark:bg-slate-900/96 dark:ring-white/10 dark:shadow-[0_20px_60px_rgba(2,8,23,0.34)] ${extra}`.trim();
}

function labelForTheme(value) {
  return THEME_OPTIONS.find((option) => option.id === value)?.label || "System";
}

function labelForAccent(value) {
  return ACCENT_OPTIONS.find((option) => option.id === value)?.label || "Default";
}

function labelForLanguage(value, mode = "manual") {
  if (mode === "auto" || value === "auto") return "Auto-detect";
  return LANGUAGE_OPTIONS.find((option) => option.code === value)?.label || "English";
}

function voicePresetForId(voiceId) {
  return VOICE_PRESETS.find((voice) => voice.voiceId === voiceId) || VOICE_PRESETS[0];
}

function voiceOptionForId(voiceId) {
  return VOICE_OPTIONS.find((voice) => voice.id === voiceId) || VOICE_OPTIONS[0];
}

function MobilePageBar({ title, onBack }) {
  return (
    <div className="sticky top-0 z-10 bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(248,250,252,0.92)_72%,rgba(248,250,252,0))] px-4 pt-3 pb-4 backdrop-blur-[2px] dark:bg-[linear-gradient(180deg,rgba(6,17,31,0.98),rgba(6,17,31,0.92)_72%,rgba(6,17,31,0))]">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/80 dark:bg-slate-900 dark:text-slate-100 dark:ring-white/10"
          aria-label="Back"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="min-w-0 flex-1 pt-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-300">Institution settings</div>
          <div className="mt-0.5 text-[1.35rem] font-semibold leading-none tracking-[-0.02em] text-slate-950 dark:text-slate-50">{title}</div>
        </div>
      </div>
    </div>
  );
}

function SettingRow({ label, value, onClick, showDivider = false, subtle = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex w-full items-center gap-3 px-1 py-4 text-left transition",
        showDivider ? "border-t border-slate-200/80 dark:border-white/10" : "",
      ].join(" ")}
    >
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-medium tracking-[-0.01em] text-slate-950 dark:text-slate-50">{label}</div>
        <div className="mt-0.5 text-[13px] leading-5 text-slate-500 dark:text-slate-300">
          {value}
          {subtle ? <span className="ml-1 text-slate-400 dark:text-slate-400">{subtle}</span> : null}
        </div>
      </div>
      <ChevronRight size={18} className="shrink-0 text-slate-300 dark:text-slate-500" />
    </button>
  );
}

function ToggleRow({ label, subtitle, checked, onChange }) {
  return (
    <div className="flex items-center gap-3 px-1 py-4">
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-medium tracking-[-0.01em] text-slate-950 dark:text-slate-50">{label}</div>
        <div className="mt-0.5 text-[13px] leading-5 text-slate-500 dark:text-slate-300">{subtitle}</div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={[
          "relative h-6 w-11 shrink-0 rounded-full transition",
          checked ? "bg-slate-900 dark:bg-slate-100" : "bg-slate-300 dark:bg-slate-700",
        ].join(" ")}
        aria-pressed={checked}
      >
        <span
          className={[
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition",
            checked ? "left-5 dark:bg-slate-900" : "left-0.5",
          ].join(" ")}
        />
      </button>
    </div>
  );
}

function SelectionSheet({ title, subtitle, open, onClose, options, selectedValue, onSelect, renderOption }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40">
      <button type="button" className="absolute inset-0 bg-slate-950/35" aria-label="Close" onClick={onClose} />
      <div
        className="absolute inset-x-0 bottom-0 rounded-t-[30px] bg-white px-4 pt-3 shadow-[0_-22px_60px_rgba(15,23,42,0.22)] ring-1 ring-slate-200/80 dark:bg-slate-950 dark:ring-white/10"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto h-1.5 w-12 rounded-full bg-slate-200 dark:bg-slate-700" />
        <div className="flex items-start justify-between gap-3 px-1 pt-4 pb-2">
          <div>
            <div className="text-[1.1rem] font-medium tracking-[-0.02em] text-slate-950 dark:text-slate-50">{title}</div>
            {subtitle ? <div className="mt-1 text-[13px] leading-5 text-slate-500 dark:text-slate-300">{subtitle}</div> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-50 text-slate-600 ring-1 ring-slate-200/80 dark:bg-slate-900 dark:text-slate-200 dark:ring-white/10"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-2 overflow-hidden rounded-[24px] bg-slate-50/90 ring-1 ring-slate-200/80 dark:bg-slate-900/80 dark:ring-white/10">
          {options.map((option, index) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onSelect(option.value);
                onClose();
              }}
              className={[
                "flex w-full items-center gap-3 px-4 py-4 text-left transition",
                index > 0 ? "border-t border-slate-200/80 dark:border-white/10" : "",
              ].join(" ")}
            >
              <div className="min-w-0 flex-1">{renderOption ? renderOption(option, option.value === selectedValue) : (
                <>
                  <div className="text-[15px] font-medium text-slate-950 dark:text-slate-50">{option.label}</div>
                  {option.subtitle ? <div className="mt-0.5 text-sm text-slate-500 dark:text-slate-300">{option.subtitle}</div> : null}
                </>
              )}</div>
              {option.value === selectedValue ? (
                <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-950 text-white dark:bg-slate-100 dark:text-slate-900">
                  <Check size={14} />
                </div>
              ) : null}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function MobileVoiceChooser({ uid, voiceSettings, onChangeVoiceSettings, onBack }) {
  const [previewingVoiceId, setPreviewingVoiceId] = useState("");
  const [previewError, setPreviewError] = useState("");
  const selectedPreset = voicePresetForId(voiceSettings.voiceId);
  const selectedVoice = voiceOptionForId(voiceSettings.voiceId);

  async function handlePreview(voice) {
    try {
      setPreviewError("");
      setPreviewingVoiceId(voice.id);
      const blob = await textToSpeechWithFallback({
        text: voice.sampleText,
        voiceId: voice.id,
        speed: voiceSettings.speechRate,
      });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => {
        URL.revokeObjectURL(url);
        setPreviewingVoiceId("");
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        setPreviewingVoiceId("");
        setPreviewError("Could not play preview.");
      };
      await audio.play();
    } catch {
      setPreviewingVoiceId("");
      setPreviewError("Voice preview failed.");
    }
  }

  return (
    <div className="min-h-[100dvh] bg-[linear-gradient(180deg,#fbfcfe_0%,#f6f8fb_100%)] dark:bg-[linear-gradient(180deg,#06111f_0%,#0a1527_100%)]">
      <MobilePageBar title="Voice" onBack={onBack} />
      <div className="px-4 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <section className={surfaceClasses("mb-4 px-5 py-5")}>
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(180deg,#8b97f4_0%,#6f7bde_100%)] text-[1.7rem] font-medium text-white shadow-[0_16px_32px_rgba(99,102,241,0.18)]">
            {selectedPreset.label.slice(0, 1)}
          </div>
          <div className="mt-4 text-[1.5rem] font-semibold tracking-[-0.03em] text-slate-950">{selectedPreset.label}</div>
          <div className="mt-1 text-sm leading-6 text-slate-600">
            {selectedVoice.tone} voice with a {selectedVoice.personality.toLowerCase()} delivery.
          </div>
          <button
            type="button"
            onClick={onBack}
            className="mt-5 inline-flex w-full items-center justify-center rounded-[22px] bg-slate-950 px-4 py-3 text-sm font-semibold text-white"
          >
            Done
          </button>
        </section>

        {previewError ? (
          <div className="mb-4 rounded-[22px] bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200/80">{previewError}</div>
        ) : null}

        <section className={surfaceClasses("px-4 py-3")}>
          <div className="px-1 pb-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Available voices</div>
            <div className="mt-1 text-[13px] leading-5 text-slate-500">Choose one voice for mobile playback and previews.</div>
          </div>

          {VOICE_PRESETS.map((preset, index) => {
            const voice = voiceOptionForId(preset.voiceId);
            const selected = voiceSettings.voiceId === preset.voiceId;
            const previewing = previewingVoiceId === preset.voiceId;
            return (
              <div key={preset.voiceId} className={index > 0 ? "border-t border-slate-200/80" : ""}>
                <div className="flex items-start gap-3 px-1 py-4">
                  <button
                    type="button"
                    onClick={() => {
                      const next = { ...voiceSettings, voiceId: preset.voiceId };
                      onChangeVoiceSettings(next);
                      saveVoiceSettings(next, uid);
                    }}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <div className="text-[15px] font-medium tracking-[-0.01em] text-slate-950">{preset.label}</div>
                      {selected ? (
                        <span className="rounded-full bg-slate-950 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
                          Current
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-0.5 text-[13px] leading-5 text-slate-500">
                      {voice.tone} · {voice.personality}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePreview(voice)}
                    className="inline-flex h-10 items-center gap-1 rounded-full bg-slate-50 px-3 text-xs font-semibold text-slate-700 ring-1 ring-slate-200/80"
                  >
                    {previewing ? <Volume2 size={14} /> : <Play size={14} />}
                    {previewing ? "Playing" : "Preview"}
                  </button>
                </div>
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
}

export default function InstitutionMobileGeneralSettingsPage({ user, onBack }) {
  const uid = user?.uid || null;
  const [prefs, setPrefs] = useState(() =>
    getStoredPreferences(
      {
        language: DEFAULT_APP_LANGUAGE,
        languageMode: "manual",
        spokenLanguage: "auto",
        accentColor: "default",
        separateVoiceEnabled: false,
      },
      uid,
    ),
  );
  const [voiceSettings, setVoiceSettings] = useState(() => loadVoiceSettings(uid));
  const [openSheet, setOpenSheet] = useState("");
  const [showVoiceChooser, setShowVoiceChooser] = useState(false);

  const themeValue = getStoredThemeMode();
  const appLanguageValue = prefs.languageMode === "auto" ? "auto" : prefs.language || DEFAULT_APP_LANGUAGE;
  const spokenLanguageValue = prefs.spokenLanguage || "auto";
  const selectedVoicePreset = useMemo(() => voicePresetForId(voiceSettings.voiceId), [voiceSettings.voiceId]);

  function savePrefs(nextPrefs) {
    setPrefs(nextPrefs);
    saveStoredPreferences(nextPrefs, uid);
  }

  function updatePref(key, value) {
    const nextPrefs = { ...prefs, [key]: value };
    savePrefs(nextPrefs);
  }

  if (showVoiceChooser) {
    return (
      <MobileVoiceChooser
        uid={uid}
        voiceSettings={voiceSettings}
        onChangeVoiceSettings={setVoiceSettings}
        onBack={() => setShowVoiceChooser(false)}
      />
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[linear-gradient(180deg,#fbfcfe_0%,#f6f8fb_100%)] dark:bg-[linear-gradient(180deg,#06111f_0%,#0a1527_100%)]">
      <MobilePageBar title="General" onBack={onBack} />

      <div className="px-4 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <section className={surfaceClasses("px-4 py-3")}>
          <div className="px-1 pb-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">General</div>
            <div className="mt-1 text-[13px] leading-5 text-slate-500">Appearance, language, and voice preferences for this device.</div>
          </div>

          <SettingRow label="Appearance" value={labelForTheme(themeValue)} onClick={() => setOpenSheet("theme")} />
          <SettingRow
            label="Accent color"
            value={labelForAccent(prefs.accentColor || "default")}
            subtle="Local preview"
            onClick={() => setOpenSheet("accent")}
            showDivider
          />
          <SettingRow
            label="App language"
            value={labelForLanguage(appLanguageValue, prefs.languageMode)}
            onClick={() => setOpenSheet("app-language")}
            showDivider
          />
          <SettingRow
            label="Spoken language"
            value={spokenLanguageValue === "auto" ? "Auto-detect" : labelForLanguage(spokenLanguageValue)}
            subtle="Prepared"
            onClick={() => setOpenSheet("spoken-language")}
            showDivider
          />
          <SettingRow
            label="Voice"
            value={selectedVoicePreset.label}
            onClick={() => setShowVoiceChooser(true)}
            showDivider
          />
          <div className="border-t border-slate-200/80">
            <ToggleRow
              label="Separate voice mode"
              subtitle="Keep a separate saved voice preference for future workspace contexts."
              checked={prefs.separateVoiceEnabled === true}
              onChange={(next) => updatePref("separateVoiceEnabled", next)}
            />
          </div>
        </section>

        <div className="mt-4 rounded-[22px] bg-slate-50/90 px-4 py-4 text-[13px] leading-6 text-slate-500 ring-1 ring-slate-200/75 dark:bg-slate-900/80 dark:text-slate-300 dark:ring-white/10">
          Accent color, spoken language, and separate voice mode are available here as safe local preferences while the broader mobile settings system is still being shaped.
        </div>
      </div>

      <SelectionSheet
        title="Appearance"
        subtitle="Choose how ElimuLink should look on this device."
        open={openSheet === "theme"}
        onClose={() => setOpenSheet("")}
        selectedValue={themeValue}
        onSelect={(value) => setThemeMode(value)}
        options={THEME_OPTIONS.map((option) => ({ value: option.id, label: option.label }))}
      />

      <SelectionSheet
        title="Accent color"
        subtitle="Accent color is currently kept as a safe local preview preference."
        open={openSheet === "accent"}
        onClose={() => setOpenSheet("")}
        selectedValue={prefs.accentColor || "default"}
        onSelect={(value) => updatePref("accentColor", value)}
        options={ACCENT_OPTIONS.map((option) => ({ value: option.id, label: option.label, dot: option.dot }))}
        renderOption={(option, selected) => (
          <div className="flex items-center gap-3">
            <span className={`inline-flex h-3.5 w-3.5 rounded-full ${option.dot}`} />
            <div className="text-[15px] font-medium text-slate-950">{option.label}</div>
            {selected ? <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Current</span> : null}
          </div>
        )}
      />

      <SelectionSheet
        title="App language"
        subtitle="The selected language is saved with your current app preferences."
        open={openSheet === "app-language"}
        onClose={() => setOpenSheet("")}
        selectedValue={appLanguageValue}
        onSelect={(value) =>
          savePrefs({
            ...prefs,
            languageMode: value === "auto" ? "auto" : "manual",
            language: value === "auto" ? prefs.language || DEFAULT_APP_LANGUAGE : value,
          })
        }
        options={LANGUAGE_OPTIONS.map((option) => ({ value: option.code, label: option.label }))}
      />

      <SelectionSheet
        title="Spoken language"
        subtitle="This row is prepared for future speech preference behavior and currently saves locally."
        open={openSheet === "spoken-language"}
        onClose={() => setOpenSheet("")}
        selectedValue={spokenLanguageValue}
        onSelect={(value) => updatePref("spokenLanguage", value)}
        options={[
          { value: "auto", label: "Auto-detect" },
          ...SPOKEN_LANGUAGE_OPTIONS.map((option) => ({ value: option.code, label: option.label })),
        ]}
      />
    </div>
  );
}
