import React, { useEffect, useMemo, useState } from "react";
import { Check, Play, Volume2 } from "lucide-react";
import { textToSpeechWithFallback } from "../../lib/speechProviders";
import { VOICE_OPTIONS } from "./voiceOptions";
import { DEFAULT_VOICE_SETTINGS, loadVoiceSettings, saveVoiceSettings } from "./voiceSettings";

function normalizeSettings(settings = {}) {
  return {
    ...DEFAULT_VOICE_SETTINGS,
    ...settings,
  };
}

export default function VoiceAudioSettingsPanel({
  uid = null,
  settings: controlledSettings,
  onChangeSettings,
  previewingVoiceId = "",
  onPreviewVoice,
  previewError = "",
  compact = false,
}) {
  const isControlled = Boolean(controlledSettings && onChangeSettings);
  const [internalSettings, setInternalSettings] = useState(() => loadVoiceSettings(uid));
  const [internalPreviewingVoiceId, setInternalPreviewingVoiceId] = useState("");
  const [internalPreviewError, setInternalPreviewError] = useState("");

  useEffect(() => {
    if (!isControlled) {
      setInternalSettings(loadVoiceSettings(uid));
    }
  }, [isControlled, uid]);

  const settings = normalizeSettings(isControlled ? controlledSettings : internalSettings);
  const activePreviewingVoiceId = onPreviewVoice ? previewingVoiceId : internalPreviewingVoiceId;
  const activePreviewError = onPreviewVoice ? previewError : internalPreviewError;

  const updateSettings = (updater) => {
    const next =
      typeof updater === "function" ? normalizeSettings(updater(settings)) : normalizeSettings(updater);

    if (isControlled) {
      onChangeSettings(next);
      return;
    }

    setInternalSettings(next);
    saveVoiceSettings(next, uid);
  };

  const handlePreviewVoice = async (voice) => {
    if (onPreviewVoice) {
      onPreviewVoice(voice);
      return;
    }

    try {
      setInternalPreviewError("");
      setInternalPreviewingVoiceId(voice.id);
      const blob = await textToSpeechWithFallback({
        text: voice.sampleText,
        voiceId: voice.id,
        speed: settings.speechRate,
      });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);

      audio.onended = () => {
        URL.revokeObjectURL(url);
        setInternalPreviewingVoiceId("");
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        setInternalPreviewingVoiceId("");
        setInternalPreviewError("Could not play preview.");
      };

      await audio.play();
    } catch {
      setInternalPreviewingVoiceId("");
      setInternalPreviewError("Voice preview failed.");
    }
  };

  const speedLabel = useMemo(() => `${Number(settings.speechRate || 1).toFixed(2)}x`, [settings.speechRate]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Voice & Audio</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Choose a real voice personality for AI replies and live voice mode.
        </p>
      </div>

      {activePreviewError ? (
        <div className="rounded-2xl bg-red-500/95 px-4 py-3 text-sm text-white">{activePreviewError}</div>
      ) : null}

      <div className={`grid gap-3 ${compact ? "" : "md:grid-cols-2"}`}>
        {VOICE_OPTIONS.map((voice) => {
          const active = settings.voiceId === voice.id;
          const previewing = activePreviewingVoiceId === voice.id;

          return (
            <div
              key={voice.id}
              className={`rounded-[26px] p-4 ring-1 transition ${
                active
                  ? "bg-sky-50 ring-sky-300 shadow-[0_12px_30px_rgba(14,165,233,0.10)] dark:bg-sky-500/10 dark:ring-sky-400/60"
                  : "bg-slate-50/95 ring-slate-200 dark:bg-slate-950 dark:ring-slate-800"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <button
                  type="button"
                  onClick={() => updateSettings((prev) => ({ ...prev, voiceId: voice.id }))}
                  className="flex-1 text-left"
                >
                  <div className="flex items-center gap-2">
                    <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">{voice.name}</div>
                    {active ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-sky-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                        <Check size={11} />
                        Selected
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {voice.tone} · {voice.range}
                  </div>
                  <div className="mt-1 text-sm text-slate-700 dark:text-slate-300">{voice.personality}</div>
                </button>

                <button
                  type="button"
                  onClick={() => handlePreviewVoice(voice)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                >
                  {previewing ? <Volume2 size={14} /> : <Play size={14} />}
                  {previewing ? "Playing..." : "Preview"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Captions</div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Show live transcript and AI reply text in live mode.
              </div>
            </div>
            <Toggle
              checked={settings.captionsEnabled}
              onChange={(checked) =>
                updateSettings((prev) => ({ ...prev, captionsEnabled: checked }))
              }
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Auto-play AI replies</div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Play AI voice replies automatically when available.
              </div>
            </div>
            <Toggle
              checked={settings.autoPlayReplies}
              onChange={(checked) =>
                updateSettings((prev) => ({ ...prev, autoPlayReplies: checked }))
              }
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Speech speed</div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Control how quickly AI speaks in previews, playback, and live mode.
            </div>
          </div>
          <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700">
            {speedLabel}
          </div>
        </div>

        <input
          type="range"
          min="0.75"
          max="1.25"
          step="0.05"
          value={settings.speechRate}
          onChange={(e) =>
            updateSettings((prev) => ({ ...prev, speechRate: Number(e.target.value) }))
          }
          className="mt-4 w-full accent-sky-600"
        />
        <div className="mt-2 flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span>Slower</span>
          <span>Balanced</span>
          <span>Faster</span>
        </div>
      </div>
    </div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={[
        "relative h-6 w-11 rounded-full transition",
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
  );
}
