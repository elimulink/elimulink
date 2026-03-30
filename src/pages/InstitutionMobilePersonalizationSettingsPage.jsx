import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Clock3, History, Lightbulb, Search, Sparkles, Volume2, Wand2 } from "lucide-react";
import { getStoredThemeMode } from "../lib/theme";
import { DEFAULT_APP_LANGUAGE, getStoredPreferences, getStoredLanguage, saveStoredPreferences } from "../lib/userSettings";
import { loadVoiceSettings } from "../shared/audio/voiceSettings";

const STYLE_OPTIONS = ["Default", "Professional", "Friendly", "Candid", "Quirky", "Efficient", "Cynical"];
const CHARACTERISTIC_OPTIONS = ["More", "Default", "Less"];
const CHARACTERISTICS = [
  { key: "warm", label: "Warm" },
  { key: "enthusiastic", label: "Enthusiastic" },
  { key: "headersLists", label: "Headers & Lists" },
  { key: "emoji", label: "Emoji" },
];

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

function surfaceClasses(extra = "") {
  return `rounded-[28px] bg-white/96 shadow-[0_16px_48px_rgba(15,23,42,0.05)] ring-1 ring-slate-200/75 ${extra}`.trim();
}

function resolveLanguageLabel(code) {
  const normalized = String(code || DEFAULT_APP_LANGUAGE).trim().toLowerCase();
  return LANGUAGE_LABELS[normalized] || "English";
}

function MobilePageBar({ title, onBack }) {
  return (
    <div className="sticky top-0 z-10 bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(248,250,252,0.92)_72%,rgba(248,250,252,0))] px-4 pt-3 pb-4 backdrop-blur-[2px]">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/80"
          aria-label="Back"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="min-w-0 flex-1 pt-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Institution settings</div>
          <div className="mt-0.5 text-[1.35rem] font-semibold leading-none tracking-[-0.02em] text-slate-950">{title}</div>
        </div>
      </div>
    </div>
  );
}

function SectionHeading({ title, description }) {
  return (
    <div className="px-1 pb-2">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{title}</div>
      {description ? <div className="mt-1 text-[13px] leading-5 text-slate-500">{description}</div> : null}
    </div>
  );
}

function SelectorRow({ label, value, subtitle, onClick, icon = null, showDivider = false, note = "" }) {
  const Icon = icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex w-full items-center gap-3 px-1 py-4 text-left transition",
        showDivider ? "border-t border-slate-200/80" : "",
      ].join(" ")}
    >
      {Icon ? (
        <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-slate-700 ring-1 ring-slate-200/75">
          <Icon size={17} />
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-medium tracking-[-0.01em] text-slate-950">{label}</div>
        <div className="mt-0.5 text-[13px] leading-5 text-slate-500">
          {value}
          {subtitle ? <span className="ml-1 text-slate-400">· {subtitle}</span> : null}
          {note ? <span className="ml-1 text-slate-400">{note}</span> : null}
        </div>
      </div>
      <ChevronRight size={18} className="shrink-0 text-slate-300" />
    </button>
  );
}

function ToggleRow({ label, subtitle, checked, onChange, icon = null, showDivider = false }) {
  const Icon = icon;
  return (
    <div className={[showDivider ? "border-t border-slate-200/80" : "", "px-1 py-4"].join(" ")}>
      <div className="flex items-center gap-3">
        {Icon ? (
          <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-slate-700 ring-1 ring-slate-200/75">
            <Icon size={17} />
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-medium tracking-[-0.01em] text-slate-950">{label}</div>
          <div className="mt-0.5 text-[13px] leading-5 text-slate-500">{subtitle}</div>
        </div>
        <button
          type="button"
          onClick={() => onChange(!checked)}
          className={[
            "relative h-6 w-11 shrink-0 rounded-full transition",
            checked ? "bg-slate-900" : "bg-slate-300",
          ].join(" ")}
          aria-pressed={checked}
        >
          <span
            className={[
              "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition",
              checked ? "left-5" : "left-0.5",
            ].join(" ")}
          />
        </button>
      </div>
    </div>
  );
}

function TextField({ label, value, onChange, placeholder, showDivider = false, multiline = false }) {
  const Tag = multiline ? "textarea" : "input";
  return (
    <div className={[showDivider ? "border-t border-slate-200/80" : "", "px-1 py-4"].join(" ")}>
      <label className="block">
        <div className="text-[13px] font-medium text-slate-700">{label}</div>
        <Tag
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          rows={multiline ? 4 : undefined}
          className={[
            "mt-2 w-full rounded-[20px] bg-slate-50 px-4 py-3 text-[15px] text-slate-900 ring-1 ring-slate-200/80 outline-none placeholder:text-slate-400",
            multiline ? "resize-none leading-6" : "",
          ].join(" ")}
        />
      </label>
    </div>
  );
}

function SelectionSheet({ open, title, subtitle, options, selectedValue, onClose, onSelect }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40">
      <button type="button" className="absolute inset-0 bg-slate-950/35" aria-label="Close" onClick={onClose} />
      <div
        className="absolute inset-x-0 bottom-0 rounded-t-[30px] bg-white px-4 pt-3 shadow-[0_-22px_60px_rgba(15,23,42,0.22)] ring-1 ring-slate-200/80"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto h-1.5 w-12 rounded-full bg-slate-200" />
        <div className="px-1 pt-4 pb-2">
          <div className="text-[1.1rem] font-medium tracking-[-0.02em] text-slate-950">{title}</div>
          {subtitle ? <div className="mt-1 text-[13px] leading-5 text-slate-500">{subtitle}</div> : null}
        </div>
        <div className="mt-2 overflow-hidden rounded-[24px] bg-slate-50/90 ring-1 ring-slate-200/80">
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
                index > 0 ? "border-t border-slate-200/80" : "",
              ].join(" ")}
            >
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-medium text-slate-950">{option.label}</div>
              </div>
              {selectedValue === option.value ? (
                <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-950 text-white text-[11px] font-semibold">
                  ✓
                </div>
              ) : null}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function MemoryPreviewSheet({ open, onClose, memorySaved, memoryHistory, historyItems = [], memoryItems = [] }) {
  if (!open) return null;

  const previewMemories = Array.isArray(memoryItems) ? memoryItems.slice(0, 4) : [];
  const previewHistory = Array.isArray(historyItems) ? historyItems.slice(0, 4) : [];

  return (
    <div className="fixed inset-0 z-40">
      <button type="button" className="absolute inset-0 bg-slate-950/35" aria-label="Close" onClick={onClose} />
      <div
        className="absolute inset-x-0 bottom-0 rounded-t-[30px] bg-white px-4 pt-3 shadow-[0_-22px_60px_rgba(15,23,42,0.22)] ring-1 ring-slate-200/80"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto h-1.5 w-12 rounded-full bg-slate-200" />
        <div className="px-1 pt-4 pb-2">
          <div className="text-[1.1rem] font-medium tracking-[-0.02em] text-slate-950">Memory</div>
          <div className="mt-1 text-[13px] leading-5 text-slate-500">
            Saved memories remain preview-only. Chat history remains a future reference layer for mobile.
          </div>
        </div>

        <div className="mt-2 space-y-3">
          <div className="rounded-[22px] bg-slate-50/90 px-4 py-4 ring-1 ring-slate-200/80">
            <div className="text-[13px] font-semibold uppercase tracking-[0.14em] text-slate-400">Status</div>
            <div className="mt-3 flex flex-wrap gap-2 text-[13px]">
              <span className="rounded-full bg-white px-3 py-1 text-slate-700 ring-1 ring-slate-200/80">
                Saved memories {memorySaved ? "On" : "Off"}
              </span>
              <span className="rounded-full bg-white px-3 py-1 text-slate-700 ring-1 ring-slate-200/80">
                Chat history {memoryHistory ? "On" : "Off"}
              </span>
            </div>
          </div>

          <div className="rounded-[22px] bg-slate-50/90 px-4 py-4 ring-1 ring-slate-200/80">
            <div className="text-[13px] font-semibold uppercase tracking-[0.14em] text-slate-400">Saved memory items</div>
            <div className="mt-3 space-y-2">
              {previewMemories.length ? (
                previewMemories.map((item, index) => (
                  <div key={item.id || index} className="rounded-[18px] bg-white px-4 py-3 ring-1 ring-slate-200/80">
                    <div className="text-[14px] font-medium text-slate-950">{item.title || "Memory item"}</div>
                    <div className="mt-1 text-[13px] leading-5 text-slate-500">{item.value || "No details provided."}</div>
                  </div>
                ))
              ) : (
                <div className="rounded-[18px] bg-white px-4 py-3 text-[13px] leading-5 text-slate-500 ring-1 ring-slate-200/80">
                  No saved memory items yet.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[22px] bg-slate-50/90 px-4 py-4 ring-1 ring-slate-200/80">
            <div className="text-[13px] font-semibold uppercase tracking-[0.14em] text-slate-400">Recent chat history</div>
            <div className="mt-3 space-y-2">
              {previewHistory.length ? (
                previewHistory.map((item, index) => (
                  <div key={item.id || index} className="rounded-[18px] bg-white px-4 py-3 ring-1 ring-slate-200/80">
                    <div className="text-[14px] font-medium text-slate-950">{item.title || "Conversation"}</div>
                    <div className="mt-1 text-[13px] leading-5 text-slate-500">
                      {item.messageCount ? `${item.messageCount} messages` : "Conversation history available"}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[18px] bg-white px-4 py-3 text-[13px] leading-5 text-slate-500 ring-1 ring-slate-200/80">
                  No chat history available yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InstitutionMobilePersonalizationSettingsPage({ user, onBack, historyItems = [] }) {
  const uid = user?.uid || null;
  const themeMode = useMemo(() => getStoredThemeMode(), []);
  const storedLanguage = useMemo(() => getStoredLanguage(DEFAULT_APP_LANGUAGE, uid), [uid]);
  const voiceSettings = useMemo(() => loadVoiceSettings(uid), [uid]);

  const [openSheet, setOpenSheet] = useState("");
  const [isMemorySheetOpen, setIsMemorySheetOpen] = useState(false);
  const [prefs, setPrefs] = useState(() =>
    getStoredPreferences(
      {
        personalizationStyleTone: "Default",
        personalizationCharacteristics: {
          warm: "Default",
          enthusiastic: "Default",
          headersLists: "Default",
          emoji: "Default",
        },
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
    ),
  );

  function savePrefs(nextPrefs) {
    setPrefs(nextPrefs);
    saveStoredPreferences(nextPrefs, uid);
  }

  function updatePref(key, value) {
    savePrefs({
      ...prefs,
      [key]: value,
    });
  }

  function updateCharacteristic(key, value) {
    savePrefs({
      ...prefs,
      personalizationCharacteristics: {
        ...(prefs.personalizationCharacteristics || {}),
        [key]: value,
      },
    });
  }

  function updateAdvanced(key, value) {
    savePrefs({
      ...prefs,
      personalizationAdvanced: {
        ...(prefs.personalizationAdvanced || {}),
        [key]: value,
      },
    });
  }

  return (
    <div className="min-h-[100dvh] bg-[linear-gradient(180deg,#fbfcfe_0%,#f6f8fb_100%)]">
      <MobilePageBar title="Personalization" onBack={onBack} />

      <div className="px-4 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <section className={surfaceClasses("px-4 py-4")}>
          <SectionHeading title="Current defaults" description="These reflect the theme, language, and voice already saved elsewhere in the app." />
          <div className="mt-1 flex flex-wrap gap-2 px-1">
            <span className="rounded-full bg-slate-50 px-3 py-1 text-[12px] font-medium text-slate-700 ring-1 ring-slate-200/80">
              {themeMode[0].toUpperCase() + themeMode.slice(1)}
            </span>
            <span className="rounded-full bg-slate-50 px-3 py-1 text-[12px] font-medium text-slate-700 ring-1 ring-slate-200/80">
              {resolveLanguageLabel(storedLanguage)}
            </span>
            <span className="rounded-full bg-slate-50 px-3 py-1 text-[12px] font-medium text-slate-700 ring-1 ring-slate-200/80">
              {VOICE_LABELS[voiceSettings.voiceId] || "Sol"}
            </span>
          </div>
        </section>

        <section className={surfaceClasses("mt-4 px-4 py-3")}>
          <SectionHeading title="Style & tone" description="Keep the main response style simple and easy to adjust on mobile." />
          <SelectorRow
            label="Base style and tone"
            value={prefs.personalizationStyleTone || "Default"}
            subtitle="Assistant behavior"
            onClick={() => setOpenSheet("style-tone")}
            icon={Sparkles}
          />
          <SelectorRow
            label="Warm"
            value={prefs.personalizationCharacteristics?.warm || "Default"}
            subtitle="Characteristic"
            onClick={() => setOpenSheet("warm")}
            icon={Sparkles}
            showDivider
          />
          <SelectorRow
            label="Headers & Lists"
            value={prefs.personalizationCharacteristics?.headersLists || "Default"}
            subtitle="Formatting"
            onClick={() => setOpenSheet("headersLists")}
            icon={Wand2}
            showDivider
          />
        </section>

        <section className={surfaceClasses("mt-4 px-4 py-3")}>
          <SectionHeading title="About you" description="A small mobile layer for the personal context already present in the desktop blueprint." />
          <TextField
            label="Nickname"
            value={prefs.personalizationNickname || ""}
            onChange={(event) => updatePref("personalizationNickname", event.target.value)}
            placeholder="How you want ElimuLink to address you"
          />
          <TextField
            label="Occupation"
            value={prefs.personalizationOccupation || ""}
            onChange={(event) => updatePref("personalizationOccupation", event.target.value)}
            placeholder="Student, lecturer, researcher..."
            showDivider
          />
          <TextField
            label="More about you"
            value={prefs.personalizationAboutYou || ""}
            onChange={(event) => updatePref("personalizationAboutYou", event.target.value)}
            placeholder="Anything helpful for future personalization"
            showDivider
            multiline
          />
        </section>

        <section className={surfaceClasses("mt-4 px-4 py-3")}>
          <SectionHeading title="Memory" description="Memory stays honest here: saved memory is still preview-first, and chat history remains a future reference layer." />
          <ToggleRow
            label="Reference saved memories"
            subtitle="Use future remembered facts and preferences when that memory layer is available."
            checked={prefs.personalizationMemorySaved !== false}
            onChange={(next) => updatePref("personalizationMemorySaved", next)}
            icon={Lightbulb}
          />
          <ToggleRow
            label="Reference chat history"
            subtitle="Use current workspace conversation history when that reference layer is available."
            checked={prefs.personalizationMemoryHistory !== false}
            onChange={(next) => updatePref("personalizationMemoryHistory", next)}
            icon={History}
            showDivider
          />
          <SelectorRow
            label="Manage"
            value="Preview memory view"
            subtitle="Summary only"
            onClick={() => setIsMemorySheetOpen(true)}
            icon={History}
            showDivider
          />
        </section>

        <section className={surfaceClasses("mt-4 px-4 py-3")}>
          <SectionHeading title="Record mode" description="Keep record history behavior visible without overloading the page." />
          <ToggleRow
            label="Reference record history"
            subtitle="Prepare future use of past records and responses in personalized behavior."
            checked={!!prefs.personalizationRecordHistory}
            onChange={(next) => updatePref("personalizationRecordHistory", next)}
            icon={Clock3}
          />
        </section>

        <section className={surfaceClasses("mt-4 px-4 py-3")}>
          <SectionHeading title="Advanced" description="Only the strongest safe advanced toggles are shown here in this mobile step." />
          <ToggleRow
            label="Web search"
            subtitle="Allow web search in personalized responses."
            checked={prefs.personalizationAdvanced?.webSearch !== false}
            onChange={(next) => updateAdvanced("webSearch", next)}
            icon={Search}
          />
          <ToggleRow
            label="Canvas"
            subtitle="Prepare canvas-style support for deeper work."
            checked={!!prefs.personalizationAdvanced?.canvas}
            onChange={(next) => updateAdvanced("canvas", next)}
            icon={Wand2}
            showDivider
          />
          <ToggleRow
            label="Voice"
            subtitle="Allow personalized voice-oriented behavior."
            checked={!!prefs.personalizationAdvanced?.voice}
            onChange={(next) => updateAdvanced("voice", next)}
            icon={Volume2}
            showDivider
          />
          <ToggleRow
            label="Connector search"
            subtitle="Prepare connector-assisted search behavior."
            checked={!!prefs.personalizationAdvanced?.connectorSearch}
            onChange={(next) => updateAdvanced("connectorSearch", next)}
            icon={Search}
            showDivider
          />
        </section>

        <div className="mt-4 rounded-[22px] bg-slate-50/90 px-4 py-4 text-[13px] leading-6 text-slate-500 ring-1 ring-slate-200/75">
          Personalization controls on this mobile page remain intentionally lighter than desktop. They save safely, but memory execution and most assistant behavior are still frontend-first.
        </div>
      </div>

      <SelectionSheet
        open={openSheet === "style-tone"}
        title="Base style and tone"
        subtitle="Choose the overall response character."
        options={STYLE_OPTIONS.map((option) => ({ value: option, label: option }))}
        selectedValue={prefs.personalizationStyleTone || "Default"}
        onClose={() => setOpenSheet("")}
        onSelect={(value) => updatePref("personalizationStyleTone", value)}
      />

      <SelectionSheet
        open={openSheet === "warm"}
        title="Warm"
        subtitle="Adjust how warm the assistant should feel."
        options={CHARACTERISTIC_OPTIONS.map((option) => ({ value: option, label: option }))}
        selectedValue={prefs.personalizationCharacteristics?.warm || "Default"}
        onClose={() => setOpenSheet("")}
        onSelect={(value) => updateCharacteristic("warm", value)}
      />

      <SelectionSheet
        open={openSheet === "headersLists"}
        title="Headers & Lists"
        subtitle="Adjust how often structured formatting is used."
        options={CHARACTERISTIC_OPTIONS.map((option) => ({ value: option, label: option }))}
        selectedValue={prefs.personalizationCharacteristics?.headersLists || "Default"}
        onClose={() => setOpenSheet("")}
        onSelect={(value) => updateCharacteristic("headersLists", value)}
      />

      <MemoryPreviewSheet
        open={isMemorySheetOpen}
        onClose={() => setIsMemorySheetOpen(false)}
        memorySaved={prefs.personalizationMemorySaved !== false}
        memoryHistory={prefs.personalizationMemoryHistory !== false}
        historyItems={historyItems}
        memoryItems={prefs.personalizationMemoryItems || []}
      />
    </div>
  );
}
