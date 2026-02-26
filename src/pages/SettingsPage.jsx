import { useEffect, useMemo, useState } from "react";
import { getStoredThemeMode, setThemeMode } from "../lib/theme";
import {
  getStoredPreferences,
  getStoredProfile,
  saveStoredPreferences,
  saveStoredProfile,
} from "../lib/userSettings";

function Section({ title, description, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{label}</span>
        {hint ? <span className="text-xs text-slate-500 dark:text-slate-400">{hint}</span> : null}
      </div>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function Input(props) {
  return (
    <input
      {...props}
      className={[
        "w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900",
        "placeholder:text-slate-400",
        "focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-300",
        "dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-slate-600 dark:focus:border-slate-600",
        props.className || "",
      ].join(" ")}
    />
  );
}

function Button({ variant = "primary", className = "", ...props }) {
  const base =
    "inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-medium transition active:scale-[0.99]";
  const styles = {
    primary:
      "bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white",
    ghost:
      "bg-transparent text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800",
    softDanger:
      "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200 dark:hover:bg-red-950/45",
  };
  return <button {...props} className={`${base} ${styles[variant]} ${className}`} />;
}

function Toggle({ checked, onChange, label, sublabel }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
      <div>
        <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{label}</div>
        {sublabel ? <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{sublabel}</div> : null}
      </div>
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
    </div>
  );
}

export default function SettingsPage({ user, onBack }) {
  const [form, setForm] = useState(() =>
    getStoredProfile({
      name: user?.name || "Scholar",
      email: user?.email || "scholar@elimulink.demo",
      phone: user?.phone || "+2547xx xxx xxx",
    })
  );
  const [prefs, setPrefs] = useState(() => {
    const stored = getStoredPreferences({
      muteNotifications: false,
      keyboardShortcuts: false,
    });
    return { ...stored, theme: getStoredThemeMode() };
  });
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);

  const resolvedTheme = useMemo(() => prefs.theme, [prefs.theme]);

  useEffect(() => {
    setThemeMode(resolvedTheme);
  }, [resolvedTheme]);

  async function onSave() {
    setSaving(true);
    try {
      saveStoredProfile(form);
      saveStoredPreferences({
        muteNotifications: !!prefs.muteNotifications,
        keyboardShortcuts: !!prefs.keyboardShortcuts,
      });
      await new Promise((r) => setTimeout(r, 450));
      setSavedAt(new Date());
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-full bg-slate-100 dark:bg-slate-950">
      <div className="mx-auto max-w-5xl p-4 md:p-8">
        <div className="mb-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => onBack?.()}
            className="w-fit rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Back
          </button>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Settings</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">Manage account, preferences, and support.</p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
              Frontend now
            </span>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
              Backend later
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Section title="Profile & Account" description="Name, email, phone, password.">
            <div className="space-y-4">
              <Field label="Full name">
                <Input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Your name"
                />
              </Field>
              <Field label="Email" hint="Read-only now, update from account backend later">
                <Input value={form.email} disabled />
              </Field>
              <Field label="Phone">
                <Input
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="+254..."
                />
              </Field>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="ghost" onClick={() => alert("Change password (backend later)")}>
                  Change password
                </Button>
                <Button type="button" onClick={onSave} disabled={saving} className="ml-auto">
                  {saving ? "Saving..." : "Save changes"}
                </Button>
              </div>
              {savedAt ? (
                <div className="text-xs text-slate-500 dark:text-slate-400">Saved {savedAt.toLocaleString()}</div>
              ) : null}
            </div>
          </Section>

          <Section title="Preferences" description="Theme, notifications, shortcuts.">
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
                <div className="text-sm font-medium text-slate-800 dark:text-slate-200">Theme</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {["system", "light", "dark"].map((t) => {
                    const active = prefs.theme === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setPrefs((p) => ({ ...p, theme: t }))}
                        className={[
                          "rounded-xl px-3 py-2 text-sm transition",
                          active
                            ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                            : "bg-white text-slate-700 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800",
                        ].join(" ")}
                      >
                        {t[0].toUpperCase() + t.slice(1)}
                      </button>
                    );
                  })}
                </div>
              </div>
              <Toggle
                checked={prefs.muteNotifications}
                onChange={(v) => setPrefs((p) => ({ ...p, muteNotifications: v }))}
                label="Mute notifications"
                sublabel="Pause non-critical alerts."
              />
              <Toggle
                checked={prefs.keyboardShortcuts}
                onChange={(v) => setPrefs((p) => ({ ...p, keyboardShortcuts: v }))}
                label="Keyboard shortcuts"
                sublabel="Power-user navigation keys."
              />
            </div>
          </Section>

          <Section title="Tools" description="Personal tools and downloads.">
            <div className="space-y-3">
              <Button variant="ghost" type="button" className="w-full justify-between" onClick={() => alert("Personal tools (frontend preview, backend later)")}>
                Personal tools
                <span className="text-xs text-slate-500 dark:text-slate-400">Backend later</span>
              </Button>
              <Button variant="ghost" type="button" className="w-full justify-between" onClick={() => alert("Download app (frontend preview, backend later)")}>
                Download app
                <span className="text-xs text-slate-500 dark:text-slate-400">Backend later</span>
              </Button>
              <Button variant="ghost" type="button" className="w-full justify-between" onClick={() => alert("Advanced settings (frontend preview, backend later)")}>
                Advanced settings
                <span className="text-xs text-slate-500 dark:text-slate-400">Backend later</span>
              </Button>
            </div>
          </Section>

          <Section title="Support" description="Help and account actions.">
            <div className="space-y-3">
              <Button variant="ghost" type="button" className="w-full justify-between" onClick={() => alert("Help center") }>
                Help
                <span className="text-xs text-slate-500 dark:text-slate-400">Available</span>
              </Button>
              <Button variant="softDanger" type="button" className="w-full justify-between" onClick={() => alert("Move to trash (backend later)")}>
                Trash
                <span className="text-xs text-red-600/80 dark:text-red-200/80">Backend later</span>
              </Button>
              <Button variant="softDanger" type="button" className="w-full justify-between" onClick={() => alert("Logout (backend later)")}>
                Logout
                <span className="text-xs text-red-600/80 dark:text-red-200/80">Backend later</span>
              </Button>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
