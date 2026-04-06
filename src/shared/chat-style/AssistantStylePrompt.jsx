import React from "react";

const STYLE_OPTIONS = [
  {
    key: "default",
    title: "Balanced",
    description: "Clear, helpful, and flexible for everyday chat.",
  },
  {
    key: "friendly",
    title: "Friendly",
    description: "Warmer tone with a little more personality.",
  },
  {
    key: "concise",
    title: "Concise",
    description: "Shorter answers with less extra wording.",
  },
  {
    key: "formal",
    title: "Formal",
    description: "More polished and institutional in tone.",
  },
];

function StyleCard({ option, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(option.key)}
      className={`rounded-2xl border p-4 text-left transition ${
        selected
          ? "border-sky-500 bg-sky-50 text-slate-900 shadow-sm dark:border-sky-400 dark:bg-sky-500/10 dark:text-white"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
      }`}
    >
      <div className="text-sm font-semibold">{option.title}</div>
      <div className="mt-1 text-xs leading-5 opacity-80">{option.description}</div>
    </button>
  );
}

export function AssistantStylePromptCard({ onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
    >
      Assistant style
    </button>
  );
}

export function AssistantStyleSelectorSheet({ open, value, onSelect, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/40 p-3 sm:items-center">
      <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-950">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-slate-900 dark:text-white">Choose assistant style</div>
            <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Pick the tone you want for New Chat.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Close
          </button>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {STYLE_OPTIONS.map((option) => (
            <StyleCard
              key={option.key}
              option={option}
              selected={value === option.key}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
