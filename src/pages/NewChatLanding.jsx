import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  Camera,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Copy,
  Ellipsis,
  Paperclip,
  GraduationCap,
  IdCard,
  Image,
  LayoutGrid,
  Menu,
  MessagesSquare,
  RefreshCcw,
  NotebookPen,
  Pencil,
  PhoneCall,
  Plus,
  Volume2,
  ScanLine,
  Send,
  Settings,
  Shield,
  Sparkles,
  LogOut,
  UserCircle2,
  Users,
  Wallet,
  Mic,
  MicOff,
  Search,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  X,
} from "lucide-react";
import { auth } from "../lib/firebase";
import { logoutFamilySession } from "../auth/familySession";
import {
  clearRegisteredPasskeys,
  getSecureUnlockCapabilities,
  registerPasskey,
} from "../auth/secureLock";
import { apiUrl } from "../lib/apiUrl";
import { readScopedJson, writeScopedJson } from "../lib/userScopedStorage";
import { getStoredPreferences, getStoredProfile } from "../lib/userSettings";
import AttachmentChipsTray from "../shared/chat-media/AttachmentChipsTray.jsx";
import ImageAnnotationEditor from "../shared/chat-media/ImageAnnotationEditor.jsx";
import AIImageEditModal from "../shared/chat-media/AIImageEditModal.jsx";
import ChatMediaPreviewModal from "../shared/chat-media/ImagePreviewModal.jsx";
import ScreenshotPreviewToast from "../shared/chat-media/ScreenshotPreviewToast.jsx";
import useCapturedMedia from "../shared/chat-media/useCapturedMedia.js";
import AudioPlaybackBar from "../shared/audio/AudioPlaybackBar.jsx";
import AudioSettingsPanel from "../shared/audio/AudioSettingsPanel.jsx";
import { useAudioPlayer } from "../shared/audio/useAudioPlayer.js";
import { askInstitutionLiveChat } from "../lib/liveChatApi.js";
import "../shared/audio/audio-ui.css";
import LiveMultimodalSessionContainerV2 from "../shared/live/LiveMultimodalSessionContainerV2.jsx";
import ImageSearchPreviewModal from "../shared/image-search/ImagePreviewModal.jsx";
import ImageSearchResults from "../shared/image-search/ImageSearchResults.jsx";
import { getImageSearchQuery, searchWebImages } from "../shared/image-search/searchWebImages.js";
import {
  getVagueImageEditClarification,
  getVagueImageRequestClarification,
  isImageClarificationQuestion,
  isImageEditFollowUpPrompt,
  isImageGenerationPrompt,
} from "../shared/image-generation/imageGenerationIntent.js";
import { shouldOfferImageComparison } from "../shared/image-generation/imageComparisonIntent.js";
import {
  deriveActiveTopic,
  detectFollowUpIntent,
  formatAiServiceError,
  normalizeInput,
  resolveContinuationPrompt,
} from "../shared/chat/chatResponseBehavior.js";
import {
  extractLinksFromText,
  formatExtractedLinksMessage,
  isLinkExtractionPrompt,
} from "../shared/link-extraction/linkExtraction.js";
import {
  archiveAllInstitutionConversations,
  createInstitutionConversation,
  createInstitutionConversationMessage,
  deleteInstitutionShareLink,
  deleteAllInstitutionConversations,
  exportInstitutionData,
  fetchInstitutionArchivedChats,
  fetchInstitutionConversation,
  fetchInstitutionShareLinks,
  fetchInstitutionShareLink,
  restoreInstitutionConversation,
} from "../lib/researchApi";
import ResearchActionsContainer from "../shared/research/ResearchActionsContainer.jsx";
import { normalizeResearchSources } from "../shared/research/researchUtils.js";
import ResponseBlockRenderer from "../shared/assistant-blocks/ResponseBlockRenderer.jsx";
import imageAPI from "../services/imageAPI.js";
import ImageComparisonPicker from "../shared/chat-media/ImageComparisonPicker.jsx";
import { AssistantStylePromptCard, AssistantStyleSelectorSheet } from "../shared/chat-style/AssistantStylePrompt.jsx";
import { useAssistantStylePreference } from "../shared/chat-style/useAssistantStylePreference.js";
import { analyzeVisualContext } from "../lib/visionApi.js";
import DesktopSettingsLauncher from "../shared/settings/DesktopSettingsLauncher.jsx";
import DesktopSettingsWorkspace from "../shared/settings/DesktopSettingsWorkspace.jsx";
import SettingsPage from "./SettingsPage";
import InstitutionMobileSettingsLanding from "./InstitutionMobileSettingsLanding.jsx";
import NotebookPage from "./NotebookPage";
import InstitutionCalendarPage from "./InstitutionCalendarPage";
import InstitutionFeesPage from "./InstitutionFeesPage";
import SubgroupRoom from "./SubgroupRoom";
import CoursesDashboard from "./CoursesDashboard";
import AssignmentsPage from "./AssignmentsPage";
import ResultsPage from "./ResultsPage";
import StudentAttendancePage from "../student/StudentAttendancePage";

const AdminAnalyticsLanding = lazy(() => import("./AdminAnalyticsLanding"));

const MAIN_ITEMS = [
  { key: "newchat", label: "NewChat", icon: LayoutGrid },
  { key: "calendar", label: "Calendar", icon: CalendarDays },
  { key: "notebook", label: "Notebook", icon: NotebookPen },
  { key: "courses", label: "Courses", icon: BookOpen },
  { key: "assignments", label: "Assignments", icon: ClipboardList },
  { key: "results", label: "Results", icon: GraduationCap },
];

const COLLABORATION_ITEMS = [
  { key: "subgroups", label: "Subgroups", icon: Users },
  { key: "messaging", label: "Messaging", icon: MessagesSquare },
];

const SETTINGS_ITEM = { key: "settings", label: "Settings", icon: Settings };
const MORE_ITEMS_BASE = [
  { key: "attendance", label: "Attendance", icon: BarChart3 },
  { key: "fees", label: "Fees Portal", icon: Wallet },
  { key: "profile", label: "Profile", icon: IdCard },
];

const CHAT_HISTORY_KEY = "institution_chat_threads_v1";
const CHAT_ACTIVE_KEY = "institution_chat_active_v1";
const ACTIVE_VIEW_KEY = "institution_active_view_v1";
const SHELL_ONBOARDING_HINT_KEY = "institution_shell_onboarding_seen_v1";
const UNTITLED_CHAT_BASE = "New Chat";
const AI_PATH = "/api/ai/chat";

const CHAT_MODE_CONFIG = {
  student: {
    title: "Hi there, where should we start?",
    subtitle:
      "Ask anything about coursework, assignments, revision, research, or coding.",
    starters: [
      {
        key: "assignment_help",
        label: "Assignment help",
        emoji: "📝",
        prefill: "Help me with this assignment...",
        suggestions: [
          "Help me answer this assignment step by step",
          "Explain this assignment question in simple terms",
          "Help me structure my response",
          "Give me a similar practice question",
        ],
      },
      {
        key: "notes_summary",
        label: "Notes summary",
        emoji: "📚",
        prefill: "Summarize these notes...",
        suggestions: [
          "Turn these notes into revision points",
          "Summarize this lecture in simple terms",
          "Create flashcards from this topic",
          "Extract the key ideas only",
        ],
      },
      {
        key: "exam_prep",
        label: "Exam prep",
        emoji: "🎯",
        prefill: "Help me revise...",
        suggestions: [
          "Quiz me on this topic",
          "Give me likely exam questions",
          "Explain this topic for revision",
          "Create a short revision guide",
        ],
      },
      {
        key: "research",
        label: "Research",
        emoji: "🔎",
        prefill: "Help me research...",
        suggestions: [
          "Help me find sources for this topic",
          "Turn this topic into research questions",
          "Summarize the background of this topic",
          "Help me build a research outline",
        ],
      },
      {
        key: "writing_help",
        label: "Writing help",
        emoji: "✍️",
        prefill: "Help me write...",
        suggestions: [
          "Help me write an introduction",
          "Improve this paragraph academically",
          "Rewrite this in a formal tone",
          "Help me organize my ideas",
        ],
      },
      {
        key: "code_help",
        label: "Code help",
        emoji: "💻",
        prefill: "Help me debug this code...",
        suggestions: [
          "Help me debug my code",
          "Help me write a function",
          "Help me simplify my code",
          "Help me learn this programming concept",
        ],
      },
    ],
  },

  admin: {
    title: "ElimuLink Institution Intelligence Workspace",
    subtitle:
      "Review operations, workflows, results readiness, attendance risk, subgroup activity, and institutional priorities.",
    starters: [
      {
        key: "workflow_review",
        label: "Workflow status",
        emoji: "🗂️",
        prefill: "Review institutional workflow status...",
        suggestions: [
          "Show me pending approvals",
          "Summarize workflow bottlenecks across departments",
          "Which operational items are blocked right now?",
          "Give me today's workflow snapshot",
        ],
      },
      {
        key: "results_oversight",
        label: "Results readiness",
        emoji: "📘",
        prefill: "Analyze result publication readiness...",
        suggestions: [
          "Summarize missing marks and approval blockers",
          "Show risks before results publication",
          "Explain the current approval queue",
          "Generate a results readiness summary",
        ],
      },
      {
        key: "attendance_alerts",
        label: "Attendance alerts",
        emoji: "📊",
        prefill: "Summarize attendance anomalies...",
        suggestions: [
          "Show attendance anomalies by subgroup",
          "Which classes show sustained low participation?",
          "Summarize attendance concerns",
          "Generate an attendance alert summary",
        ],
      },
      {
        key: "announcements",
        label: "Announcements",
        emoji: "📣",
        prefill: "Help me draft an announcement...",
        suggestions: [
          "Draft a notice to lecturers",
          "Draft a notice to students",
          "Rewrite this announcement professionally",
          "Summarize recent communication activity",
        ],
      },
      {
        key: "audit_and_compliance",
        label: "Audit & compliance",
        emoji: "🛡️",
        prefill: "Summarize recent audit activity...",
        suggestions: [
          "Show recent sensitive actions",
          "Summarize compliance-related events",
          "Flag unusual operational activity",
          "Draft a dean-level audit summary",
        ],
      },
      {
        key: "department_report",
        label: "Operations summary",
        emoji: "🧠",
        prefill: "Show subgroup activity summary and pending operational items...",
        suggestions: [
          "Create a weekly department summary",
          "Summarize subgroup activity for this week",
          "Review pending operational items by urgency",
          "Highlight operational risks",
          "Draft a board-ready department report",
        ],
      },
    ],
  },
};

const COMPOSER_TOOL_PRESETS = [
  { key: "create_image", label: "Create image", prompt: "Create an image concept for this topic..." },
  { key: "deep_research", label: "Deep research", prompt: "Help me do deep research on this topic..." },
  { key: "web_search", label: "Web search", prompt: "Find current web sources for this topic..." },
  { key: "study_learn", label: "Study / Learn", prompt: "Teach me this topic with a clear study plan..." },
  { key: "quizzes", label: "Quizzes", prompt: "Create a short quiz for this topic..." },
  { key: "explore_apps", label: "Explore apps", prompt: "Recommend useful academic apps for this task..." },
];

const INSTITUTION_CHAT_MODEL_OPTIONS = [
  {
    key: "elimulink-institution-ai",
    label: "ElimuLink AI",
    description: "Current Institution chat model",
  },
];

const EMPTY_ACADEMIC_CONTEXT = Object.freeze({
  course: "",
  topic: "",
  lecture: "",
  assignment: "",
  studyMode: "",
});

function timeGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function normalizeProfileName(value) {
  return String(value || "")
    .trim()
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function resolveProfileName(firebaseUser, preferredName = "") {
  const savedName = normalizeProfileName(preferredName);
  if (savedName) return savedName;
  const email = String(firebaseUser?.email || "").trim();
  if (email.includes("@")) return normalizeProfileName(email.split("@")[0]);
  const displayName = normalizeProfileName(firebaseUser?.displayName || "");
  if (displayName) return displayName;
  return "Scholar";
}

function firstNameOf(name) {
  const normalized = String(name || "").trim();
  if (!normalized) return "there";
  return normalized.split(/\s+/)[0];
}

function initialsOf(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (parts.length === 0) return "U";
  return parts.map((p) => p[0]?.toUpperCase() || "").join("");
}

function buildWelcomeMessage(name) {
  return `${timeGreeting()}, ${firstNameOf(name)}! I'm ElimuLink AI. What would you like to research today?`;
}

function getDefaultAssistantMessage(mode = "student", name = "Scholar") {
  if (mode === "admin") {
    return "Welcome to the ElimuLink Institution Administrative Assistant. I can help with workflow status, attendance anomalies, results readiness, subgroup operations, and institutional summaries.";
  }
  return buildWelcomeMessage(name);
}

function makeChatId() {
  return `chat-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isUntitledChatTitle(title, base = UNTITLED_CHAT_BASE) {
  const pattern = new RegExp(`^${escapeRegex(base)}(?: \\d+)?$`, "i");
  return pattern.test(String(title || "").trim());
}

function nextUntitledChatTitle(chats = [], base = UNTITLED_CHAT_BASE) {
  const used = new Set((chats || []).map((chat) => String(chat?.title || "").trim()));
  if (!used.has(base)) return base;
  let i = 2;
  while (used.has(`${base} ${i}`)) i += 1;
  return `${base} ${i}`;
}

function normalizeChatTitles(chats = [], base = UNTITLED_CHAT_BASE) {
  const used = new Set();
  let untitledCounter = 1;

  return chats.map((chat) => {
    const next = { ...(chat || {}) };
    let title = String(next.title || "").trim();

    if (!title || isUntitledChatTitle(title, base)) {
      let candidate = untitledCounter === 1 ? base : `${base} ${untitledCounter}`;
      while (used.has(candidate)) {
        untitledCounter += 1;
        candidate = untitledCounter === 1 ? base : `${base} ${untitledCounter}`;
      }
      title = candidate;
      untitledCounter += 1;
    } else if (used.has(title)) {
      let i = 2;
      let candidate = `${title} (${i})`;
      while (used.has(candidate)) {
        i += 1;
        candidate = `${title} (${i})`;
      }
      title = candidate;
    }

    used.add(title);
    return { ...next, title };
  });
}

function formatChatStamp(timestamp) {
  try {
    const date = new Date(timestamp || Date.now());
    if (Number.isNaN(date.getTime())) return "Now";
    const now = new Date();
    const sameDay = date.toDateString() === now.toDateString();
    return sameDay
      ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : date.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return "Now";
  }
}

function resolveSpeechLanguage(languageCode) {
  const code = String(languageCode || "en").trim().toLowerCase();
  const map = {
    en: "en-US",
    sw: "sw-KE",
    fr: "fr-FR",
    es: "es-ES",
    pt: "pt-PT",
    de: "de-DE",
    it: "it-IT",
    nl: "nl-NL",
    ru: "ru-RU",
    ar: "ar-SA",
    hi: "hi-IN",
    bn: "bn-BD",
    ta: "ta-IN",
    te: "te-IN",
    zh: "zh-CN",
    "zh-tw": "zh-TW",
    ja: "ja-JP",
    ko: "ko-KR",
    tr: "tr-TR",
    vi: "vi-VN",
  };
  if (map[code]) return map[code];
  if (code.includes("-")) return code;
  return "en-US";
}

function autoResizeTextarea(el, maxHeight = 176) {
  if (!el) return;
  el.style.height = "0px";
  const nextHeight = Math.min(Math.max(el.scrollHeight, 44), maxHeight);
  el.style.height = `${nextHeight}px`;
  el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
  el.style.scrollbarGutter = "stable";
}

function formatVoiceSessionDuration(durationMs) {
  const totalSeconds = Math.max(0, Math.round(Number(durationMs || 0) / 1000));
  if (totalSeconds < 60) return `${Math.max(1, totalSeconds)}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

function detectAcademicContext(message, previousContext = EMPTY_ACADEMIC_CONTEXT) {
  const raw = String(message || "").trim();
  const text = raw.toLowerCase();
  const next = { ...EMPTY_ACADEMIC_CONTEXT, ...previousContext };

  const courseMatch = raw.match(
    /\b(biology|chemistry|physics|mathematics|math|history|geography|economics|accounting|english|kiswahili|computer science|programming)\b/i
  );
  if (courseMatch) next.course = courseMatch[1];

  const topicMatch =
    raw.match(/\babout\s+([^.!?\n]+)/i) ||
    raw.match(/\bon\s+([^.!?\n]{4,80})/i) ||
    raw.match(/\btopic[:\s]+([^.!?\n]+)/i);
  if (topicMatch?.[1]) next.topic = topicMatch[1].trim();

  const lectureMatch = raw.match(/\blecture(?:\s+about|\s+on)?\s+([^.!?\n]+)/i);
  if (lectureMatch?.[1]) next.lecture = lectureMatch[1].trim();
  if (!next.lecture && text.includes("today") && text.includes("lecture")) {
    next.lecture = "Today's lecture";
  }

  const assignmentMatch = raw.match(/\bassignment\b[:\s-]*([^.!?\n]+)/i);
  if (assignmentMatch?.[1]) next.assignment = assignmentMatch[1].trim();
  if (!next.assignment && /\bassignment|homework|coursework\b/i.test(raw)) {
    next.assignment = "Current assignment";
  }

  if (/flashcard|revision card/i.test(raw)) next.studyMode = "flashcards";
  else if (/note|notes/i.test(raw)) next.studyMode = "notes";
  else if (/summari[sz]e/i.test(raw)) next.studyMode = "summary";
  else if (/simplif|explain simpler/i.test(raw)) next.studyMode = "simplify";
  else if (/quiz|revise|exam/i.test(raw)) next.studyMode = "revision";

  return next;
}

function mergeAcademicContext(previousContext, detectedContext, message) {
  const prev = { ...EMPTY_ACADEMIC_CONTEXT, ...(previousContext || {}) };
  const next = { ...prev, ...(detectedContext || {}) };
  const text = String(message || "").toLowerCase();

  const explicitReset = /\b(new topic|change topic|switch topic|different subject|start over)\b/.test(text);
  if (explicitReset) {
    return { ...EMPTY_ACADEMIC_CONTEXT, ...(detectedContext || {}) };
  }

  if (
    prev.course &&
    next.course &&
    String(prev.course).toLowerCase() !== String(next.course).toLowerCase()
  ) {
    return {
      ...EMPTY_ACADEMIC_CONTEXT,
      course: next.course,
      topic: next.topic,
      lecture: next.lecture,
      assignment: next.assignment,
      studyMode: next.studyMode || prev.studyMode,
    };
  }

  return next;
}

function buildAcademicContextBlock(context) {
  const ctx = { ...EMPTY_ACADEMIC_CONTEXT, ...(context || {}) };
  const lines = [];
  if (ctx.course) lines.push(`Course: ${ctx.course}`);
  if (ctx.topic) lines.push(`Topic: ${ctx.topic}`);
  if (ctx.lecture) lines.push(`Lecture: ${ctx.lecture}`);
  if (ctx.assignment) lines.push(`Assignment: ${ctx.assignment}`);
  if (ctx.studyMode) lines.push(`Study mode: ${ctx.studyMode}`);
  if (!lines.length) return "";
  return `Academic context:\n${lines.join("\n")}`;
}

function isInstitutionSimplePrompt(text, attachments = []) {
  const clean = String(text || "").trim();
  if (!clean) return false;
  if ((Array.isArray(attachments) ? attachments.length : 0) > 0) return false;
  if (clean.length > 160) return false;
  if (/\n/.test(clean)) return false;
  if (/[/:]/.test(clean)) return false;
  if (/\b(?:http|www\.|attach|upload|image|photo|diagram|chart|pdf|file|citation|source|sources|research paper|references?)\b/i.test(clean)) return false;
  if (/\b(?:compare|contrast|analyze critically|with citations|latest research|journal|scholar|dataset|table|markdown|code block)\b/i.test(clean)) return false;
  const wordCount = clean.split(/\s+/).filter(Boolean).length;
  if (wordCount > 28) return false;
  return /^[a-z0-9 ,.!?'()-]+$/i.test(clean);
}

function logInstitutionChatTiming(label, startedAt, meta = {}) {
  if (!import.meta.env.DEV) return;
  console.debug("[AI_TIMING][institution][frontend]", {
    label,
    elapsedMs: Math.round(performance.now() - startedAt),
    ...meta,
  });
}

function contextLabel(context) {
  const ctx = { ...EMPTY_ACADEMIC_CONTEXT, ...(context || {}) };
  const left = ctx.course ? String(ctx.course) : "";
  const right = ctx.topic ? String(ctx.topic) : "";
  if (left && right) return `${left} -> ${right}`;
  return left || right || "";
}

function startOfDay(value) {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
}

function sectionLabelFromTimestamp(timestamp, now = Date.now()) {
  const ts = Number(timestamp || 0);
  const date = new Date(ts || now);
  const nowDate = new Date(now);
  const dayMs = 24 * 60 * 60 * 1000;
  const diffDays = Math.floor((startOfDay(nowDate) - startOfDay(date)) / dayMs);

  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays <= 7) return "Earlier this week";
  if (date.getMonth() === nowDate.getMonth() && date.getFullYear() === nowDate.getFullYear()) {
    return "Earlier this month";
  }
  return date.toLocaleDateString([], { month: "short", year: "numeric" });
}

function createDefaultChat(title = UNTITLED_CHAT_BASE, assistantText = "", ownerUid = null) {
  return {
    id: makeChatId(),
    ownerUid,
    chatScope: "institution",
    sessionId: "",
    conversationId: "",
    shareId: "",
    shareUrl: "",
    isSharedView: false,
    activeTopic: "",
    title,
    updatedAt: Date.now(),
    messages: assistantText
      ? [{ role: "assistant", text: assistantText, ownerUid, createdAt: Date.now() }]
      : [],
  };
}

function StatCard({ title, value, subtitle }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-white border border-slate-900/20 shadow-[0_4px_14px_rgba(15,23,42,0.04)] px-3.5 py-2 min-h-[62px]">
      <div>
        <div className="text-[10px] font-semibold tracking-wide text-slate-600 uppercase">{title}</div>
        <div className="mt-0.5 text-[15px] leading-tight font-bold text-slate-900 break-words">{value}</div>
        {subtitle ? <div className="text-[11px] text-slate-600 mt-0.5">{subtitle}</div> : null}
      </div>
      <div className="text-slate-500 shrink-0 ml-3">
        <BarChart3 size={15} />
      </div>
    </div>
  );
}

function formatTimeAgo(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  const delta = Date.now() - date.getTime();
  if (delta < 60_000) return "Just now";
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)}m ago`;
  if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)}h ago`;
  return `${Math.floor(delta / 86_400_000)}d ago`;
}

function hasUserAuthoredChatHistory(items) {
  return Array.isArray(items) && items.some((chat) =>
    Array.isArray(chat?.messages) && chat.messages.some((message) =>
      String(message?.role || "") === "user" && String(message?.text || "").trim()
    )
  );
}

function MobileComposerToolCard({ icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[100px] flex-col items-center justify-center gap-2 rounded-[24px] bg-slate-100/80 px-3 py-4 text-slate-800 ring-1 ring-slate-200/70 transition active:scale-[0.98] dark:bg-white/6 dark:text-slate-100 dark:ring-white/10"
    >
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/70 text-slate-700 dark:bg-white/8 dark:text-slate-100">
        {icon}
      </span>
      <span className="text-[12px] font-medium">{label}</span>
    </button>
  );
}

function MobileComposerToolRow({ icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-[20px] px-3 py-3 text-left text-[14px] font-medium text-slate-800 transition active:scale-[0.99] hover:bg-white/80 dark:text-slate-100 dark:hover:bg-white/5"
    >
      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/80 text-slate-700 dark:bg-white/8 dark:text-slate-100">
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}

function PlaceholderPanel({ title, bullets = [] }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
      <div className="text-lg font-semibold text-slate-900">{title}</div>
      <div className="text-sm text-slate-600 mt-1">Coming next</div>
      <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
        {bullets.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-slate-400" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        disabled
        className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2 text-sm font-semibold text-slate-500 cursor-not-allowed"
      >
        Connect backend
      </button>
    </div>
  );
}

function isErrorText(text) {
  const value = String(text || "").toLowerCase();
  return value.includes("failed to reach ai service") || value.includes("error (");
}

function isLongAssistantResponse(text) {
  const value = String(text || "").trim();
  if (!value) return false;
  const codeFenceCount = (value.match(/```/g) || []).length;
  const nonCodeText = value.replace(/```[\s\S]*?```/g, "").trim();
  const lineCount = value.split(/\r?\n/).filter((line) => line.trim()).length;
  const paragraphCount = value.split(/\n{2,}/).filter((part) => part.trim()).length;
  const listItemCount = (value.match(/^\s*(?:[-*•]|\d+[.)])\s+/gm) || []).length;
  const headingCount = (value.match(/^#{1,4}\s+\S+/gm) || []).length;

  const isMostlyCode =
    codeFenceCount >= 2 &&
    nonCodeText.length < 220 &&
    value.replace(/```/g, "").length > nonCodeText.length * 2;
  if (isMostlyCode) return false;

  if (value.length >= 1800) return true;
  if (lineCount >= 24) return true;
  if (paragraphCount >= 7 && value.length >= 900) return true;
  if ((headingCount >= 2 || listItemCount >= 8) && value.length >= 900) return true;
  return false;
}

function getSuggestedAssistantActions(text, imageUrl = "", { showStudyTools = true, isError = false } = {}) {
  if (!showStudyTools || isError) return [];
  const value = String(text || "").trim();
  if (!value) return [];
  if (imageUrl) return [];

  const lower = value.toLowerCase();
  const lineCount = value.split(/\r?\n/).filter((line) => line.trim()).length;
  const paragraphCount = value.split(/\n{2,}/).filter((part) => part.trim()).length;
  const listItemCount = (value.match(/^\s*(?:[-*•]|\d+[.)])\s+/gm) || []).length;
  const codeFenceCount = (value.match(/```/g) || []).length;
  const nonCodeText = value.replace(/```[\s\S]*?```/g, "").trim();
  const isMostlyCode =
    codeFenceCount >= 2 &&
    nonCodeText.length < 220 &&
    value.replace(/```/g, "").length > nonCodeText.length * 2;
  const isVeryShort = value.length < 180 && lineCount <= 3;
  const isSimpleAck = /^(yes|no|okay|ok|sure|done|noted|thanks|thank you)[.!]?\s*$/i.test(value);
  const hasActionFlowEnding =
    /\b(next steps?|recommended actions?|action plan|to continue|choose one action)\b/i.test(lower) &&
    listItemCount >= 2;
  const isStatusLike =
    /^(success|done|completed|confirmed|status|warning|error|note)\s*[:\-]/i.test(value) ||
    /^(here is the generated image|here is the edited image)\.?$/i.test(value);

  if (isMostlyCode || isVeryShort || isSimpleAck || hasActionFlowEnding || isStatusLike) return [];

  const isAcademic =
    /\b(explain|define|compare|summarize|assignment|exam|research|lecture|theory|method|framework|policy|workflow|results|attendance|fees|department|institution|concept|diagram|process|structure|analysis)\b/.test(lower) ||
    value.length > 320 ||
    listItemCount >= 3 ||
    paragraphCount >= 3;
  if (!isAcademic) return [];

  const chips = [];
  const addChip = (chip) => {
    if (chips.some((item) => item.key === chip.key)) return;
    chips.push(chip);
  };

  if (value.length >= 700 || paragraphCount >= 4 || listItemCount >= 6 || lineCount >= 14) {
    addChip({ key: "summary", label: "Summarize this" });
  }

  if (/\b(explain|definition|concept|theory|topic|lecture|lesson|chapter|assignment|research|study|revision)\b/.test(lower) || paragraphCount >= 3 || listItemCount >= 3) {
    addChip({ key: "notes", label: "Turn into notes" });
  }

  if (/\b(technical|complex|theory|formula|equation|architecture|framework|methodology|algorithm|scientific|explain)\b/.test(lower) || value.length >= 500) {
    addChip({ key: "simpler", label: "Explain simpler" });
  }

  if (/\b(step|process|procedure|how to|method|implementation|diagram|structure|architecture|system|cycle|flow|pipeline|digestive|circuit|network)\b/.test(lower)) {
    addChip({ key: "diagram", label: "Make diagram" });
  }

  if (/\b(exam|revision|study|learning|concept|topic|lecture|memorize|key terms|definitions)\b/.test(lower)) {
    addChip({ key: "flashcards", label: "Generate flashcards" });
  }

  if (/\b(policy|memo|letter|proposal|report|announcement|email|draft|professional|formal|rewrite|statement)\b/.test(lower)) {
    addChip({ key: "formal", label: "Rewrite formally" });
  }

  return chips.slice(0, 4);
}

function Bubble({
  role,
  text,
  imageUrl = "",
  comparisonImages = [],
  comparisonTitle = "Which image do you like more?",
  comparisonSelectedIndex = null,
  comparisonSkipped = false,
  onComparisonChoose,
  onComparisonSkip,
  streaming = false,
  imageSearchResults = [],
  imageSearchQuery = "",
  sources = [],
  chatTitle = "",
  chatId = "",
  messageId = "",
  shareId = "",
  shareUrl = "",
  isSharedView = false,
  onImagePreview,
  onGeneratedImagePreview,
  onImageReuse,
  onAssistantSpeak,
  onRetry,
  onLearnMore,
  onCopy,
  onEdit,
  isCopied,
  isSpeaking,
  speakingText,
  reaction = null,
  onLike,
  onDislike,
  onRetryMessage,
  onSimplify,
  onDetailed,
  onSummarizeTool,
  onNotesTool,
  onFlashcardsTool,
  onSimplerTool,
  onDiagramTool,
  onRewriteFormalTool,
  showStudyTools = true,
}) {
  const isUser = role === "user";
  const isError = !isUser && isErrorText(text);
  const isActiveSpeak = !isUser && isSpeaking && speakingText === text;
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const hasComparisonChoices = !isUser && Array.isArray(comparisonImages) && comparisonImages.length >= 2;
  const isComparisonPending = hasComparisonChoices && !String(imageUrl || "").trim() && !comparisonSkipped;
  const researchSources = useMemo(
    () => normalizeResearchSources({ sources, imageSearchResults, text }),
    [imageSearchResults, sources, text]
  );
  const [renderedAssistantText, setRenderedAssistantText] = useState(() =>
    isUser ? String(text || "") : ""
  );
  const [isTypingAnim, setIsTypingAnim] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const typingFrameRef = useRef(null);
  const showActionRow = !streaming && !isTypingAnim && (Boolean(reaction) || isMoreOpen);
  const canCollapseResponse =
    !isUser && !streaming && !isTypingAnim && !imageUrl && isLongAssistantResponse(renderedAssistantText);
  const suggestedActions = useMemo(
    () =>
      getSuggestedAssistantActions(text, imageUrl, {
        showStudyTools,
        isError,
      }),
    [imageUrl, isError, showStudyTools, text]
  );

  useEffect(() => {
    setIsExpanded(false);
  }, [text, imageUrl]);

  useEffect(() => {
    if (isUser) return;
    const target = String(text || "");

    if (streaming) {
      setIsTypingAnim(true);
      setRenderedAssistantText(target);
      return;
    }

    if (typingFrameRef.current) {
      cancelAnimationFrame(typingFrameRef.current);
      typingFrameRef.current = null;
    }

    const current = String(renderedAssistantText || "");
    if (current === target) {
      setIsTypingAnim(false);
      return;
    }

    setIsTypingAnim(true);
    let i = current && target.startsWith(current) ? current.length : 0;
    if (i === 0) setRenderedAssistantText("");

    const step = () => {
      const remaining = target.length - i;
      const jump = Math.max(2, Math.ceil(remaining / 18));
      i = Math.min(target.length, i + jump);
      setRenderedAssistantText(target.slice(0, i));
      if (i < target.length) {
        typingFrameRef.current = requestAnimationFrame(step);
      } else {
        typingFrameRef.current = null;
        setIsTypingAnim(false);
      }
    };
    typingFrameRef.current = requestAnimationFrame(step);
    return () => {
      if (typingFrameRef.current) {
        cancelAnimationFrame(typingFrameRef.current);
        typingFrameRef.current = null;
      }
    };
  }, [isUser, text, streaming]);

  return (
    <div className={`group flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
        <div
        className={[
          isUser
            ? "max-w-[92%] md:max-w-[72%] text-[15px]"
            : "max-w-full md:max-w-[82%] text-[15px]",
          isUser
            ? "user-msg-bubble rounded-[20px] rounded-br-lg border border-sky-100/80 bg-sky-50/95 px-4 py-2.5 text-slate-900 shadow-[0_4px_14px_rgba(15,23,42,0.06)] md:px-4 md:py-3"
            : "assistant-msg-surface bg-transparent px-0 py-0.5 text-slate-900 dark:text-slate-50",
        ].join(" ")}
      >
        {isUser ? (
          <div className="leading-relaxed">{text}</div>
        ) : (
          <div className="space-y-3.5 md:space-y-4 text-[15px] leading-7 text-slate-900 md:leading-[1.78] dark:text-slate-50">
            {isComparisonPending ? (
              <ImageComparisonPicker
                title={comparisonTitle}
                images={comparisonImages}
                selectedIndex={comparisonSelectedIndex}
                onChoose={onComparisonChoose}
                onSkip={onComparisonSkip}
              />
            ) : null}
            {imageSearchResults.length ? (
              <ImageSearchResults
                query={imageSearchQuery}
                results={imageSearchResults}
                onPreview={onImagePreview}
                onReuse={onImageReuse}
              />
            ) : null}
            {String(renderedAssistantText || imageUrl || "").trim() ? (
              <div
                className={[
                  "relative",
                  canCollapseResponse && !isExpanded ? "max-h-[520px] overflow-hidden" : "",
                ].join(" ")}
              >
                <ResponseBlockRenderer
                  text={renderedAssistantText}
                  imageUrl={imageUrl}
                  sources={researchSources}
                  onGeneratedImagePreview={onGeneratedImagePreview}
                />
                {canCollapseResponse && !isExpanded ? (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-white dark:to-[#020617]">
                    <div className="absolute inset-x-0 bottom-0 h-px bg-slate-200/80 dark:bg-white/10" />
                  </div>
                ) : null}
              </div>
            ) : streaming ? (
              <div className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-300">
                <span className="typing-dot" />
                <span className="typing-dot typing-dot-delay-1" />
                <span className="typing-dot typing-dot-delay-2" />
              </div>
            ) : (
              <p className="leading-[1.72]">{String(text || "")}</p>
            )}
            {streaming || isTypingAnim ? <span className="typing-caret">▌</span> : null}
          </div>
        )}

          {!isUser ? (
            <div
            className={[
              "mt-2.5 md:mt-3 flex items-center gap-0.5 md:gap-1 transition-opacity",
              showActionRow ? "opacity-100" : "opacity-100 md:opacity-100",
            ].join(" ")}
          >
            <button
              type="button"
              onClick={onCopy}
              className="assistant-action-btn h-8 w-8 md:h-7 md:w-7 inline-flex items-center justify-center rounded-md text-slate-500/90 hover:bg-slate-100/80 hover:text-slate-700 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
              title="Copy response"
            >
              {isCopied ? <Check size={14} /> : <Copy size={14} />}
            </button>
            <button
              type="button"
              onClick={onLike}
              className={[
                "assistant-action-btn h-8 w-8 md:h-7 md:w-7 inline-flex items-center justify-center rounded-md transition",
                reaction === "like"
                  ? "bg-sky-50/90 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200"
                  : "text-slate-500/90 hover:bg-slate-100/80 hover:text-slate-700 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white",
              ].join(" ")}
              title="Like"
            >
              <ThumbsUp size={14} />
            </button>
            <button
              type="button"
              onClick={onDislike}
              className={[
                "assistant-action-btn h-8 w-8 md:h-7 md:w-7 inline-flex items-center justify-center rounded-md transition",
                reaction === "dislike"
                  ? "bg-slate-200/75 text-slate-700 dark:bg-white/10 dark:text-slate-100"
                  : "text-slate-500/90 hover:bg-slate-100/80 hover:text-slate-700 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white",
              ].join(" ")}
              title="Dislike"
            >
              <ThumbsDown size={14} />
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsMoreOpen((prev) => !prev)}
                className="assistant-action-btn h-8 w-8 md:h-7 md:w-7 inline-flex items-center justify-center rounded-md text-slate-500/90 hover:bg-slate-100/80 hover:text-slate-700 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                title="More"
              >
                <Ellipsis size={14} />
              </button>
              {isMoreOpen ? (
                <div className="absolute left-0 top-full z-10 mt-1.5 w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreOpen(false);
                      onRetryMessage?.();
                    }}
                    className="w-full rounded-lg px-2.5 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800"
                  >
                    Retry
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreOpen(false);
                      onSimplify?.();
                    }}
                    className="w-full rounded-lg px-2.5 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800"
                  >
                    Simplify answer
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreOpen(false);
                      onDetailed?.();
                    }}
                    className="w-full rounded-lg px-2.5 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800"
                  >
                    Make it more detailed
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreOpen(false);
                      onCopy?.();
                    }}
                    className="w-full rounded-lg px-2.5 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800"
                  >
                    Copy text
                  </button>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => onAssistantSpeak?.(text)}
              className={[
                "assistant-action-btn h-8 w-8 md:h-7 md:w-7 inline-flex items-center justify-center rounded-md",
                isActiveSpeak
                  ? "bg-sky-50/90 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200"
                  : "text-slate-500/90 hover:bg-slate-100/80 hover:text-slate-700 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white",
              ].join(" ")}
              title="Play audio"
            >
              <Volume2 size={14} />
            </button>
            </div>
          ) : null}

          {canCollapseResponse ? (
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.08]"
            >
              {isExpanded ? "Collapse response" : "Expand full response"}
              <ChevronDown
                size={13}
                className={["transition-transform duration-200", isExpanded ? "rotate-180" : ""].join(" ")}
              />
            </button>
          ) : null}

          {!isUser && !streaming && !isTypingAnim && String(text || "").trim() ? (
            <ResearchActionsContainer
              family="ai"
              app="institution"
              conversationId={chatId}
              messageIds={messageId ? [messageId] : []}
              sources={researchSources}
              backendMode="institution"
              sharePayload={{
                app: "institution",
                title: chatTitle || "ElimuLink AI chat",
                message: text,
                sources: researchSources,
              }}
              initialShareId={shareId}
              initialShareUrl={shareUrl}
              allowShareDelete={!isSharedView}
            />
          ) : null}

          {!isUser && !streaming && !isTypingAnim && suggestedActions.length > 0 ? (
            <div className="mt-2.5 border-t border-slate-200/70 pt-2.5 dark:border-slate-700/80">
              <div className="flex flex-wrap items-center gap-1.5">
                {suggestedActions.map((action) => (
                  <button
                    key={action.key}
                    type="button"
                    onClick={() => {
                      if (action.key === "summary") onSummarizeTool?.();
                      if (action.key === "notes") onNotesTool?.();
                      if (action.key === "flashcards") onFlashcardsTool?.();
                      if (action.key === "simpler") onSimplerTool?.();
                      if (action.key === "diagram") onDiagramTool?.();
                      if (action.key === "formal") onRewriteFormalTool?.();
                    }}
                    className="rounded-full border border-slate-200/80 bg-slate-50/85 px-2.5 py-1 text-[11px] text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
          </div>
        ) : null}

        {isUser ? (
          <div className="mt-2 flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-1 rounded-lg border border-white/30 bg-white/20 px-2 py-1 text-xs text-white hover:bg-white/25"
              title="Edit prompt"
            >
              <Pencil size={12} />
              Edit
            </button>
            <button
              type="button"
              onClick={onCopy}
              className="inline-flex items-center gap-1 rounded-lg border border-white/30 bg-white/20 px-2 py-1 text-xs text-white hover:bg-white/25"
              title="Copy prompt"
            >
              {isCopied ? <Check size={12} /> : <Copy size={12} />}
              {isCopied ? "Copied" : "Copy"}
            </button>
          </div>
        ) : null}

        {isError ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <RefreshCcw size={12} />
              Retry
            </button>
            <button
              type="button"
              onClick={onLearnMore}
              className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Learn more
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SidebarButton({ active, label, onClick, collapsed, icon: Icon, buttonRef = null }) {
  return (
    <button
      ref={buttonRef}
      onClick={onClick}
      className={[
        "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors duration-200",
        collapsed ? "justify-center px-2.5" : "",
        active
          ? "bg-slate-900 text-white shadow-[0_8px_18px_rgba(15,23,42,0.18)]"
          : "text-slate-900 hover:bg-slate-100/90 dark:text-slate-50 dark:hover:bg-white/5",
      ].join(" ")}
      title={collapsed ? label : undefined}
    >
      <span className={["text-base", active ? "text-white" : "text-slate-500 dark:text-slate-400"].join(" ")}>
        {Icon ? <Icon size={16} /> : null}
      </span>
      {!collapsed ? <span className="truncate">{label}</span> : null}
    </button>
  );
}

function SectionLabel({ collapsed, children }) {
  if (collapsed) return null;
  return <div className="px-3 pt-2 text-[10px] font-semibold tracking-[0.1em] text-slate-500 dark:text-slate-400">{children}</div>;
}

function isDesktopSettingsViewport() {
  return typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches;
}

export default function NewChatLanding({
  active: initialView = "chat",
  onOpenAdmin,
  chatMode = "student",
  workspaceContext = null,
  embeddedInAdminShell = false,
  userRole: initialUserRole,
  initialAssistantMessage,
}) {
  const firebaseUser = auth?.currentUser || null;
  const [profileVersion, setProfileVersion] = useState(0);
  const bootstrapProfile = useMemo(
    () => getStoredProfile({}, firebaseUser?.uid || null),
    [firebaseUser?.uid, profileVersion]
  );
  const profileName = useMemo(
    () => resolveProfileName(firebaseUser, bootstrapProfile?.name || ""),
    [bootstrapProfile?.name, firebaseUser]
  );
  const resolvedChatMode = chatMode === "admin" ? "admin" : "student";
  const isEmbeddedAdminChat = resolvedChatMode === "admin";
  const isAdminShellEmbed = isEmbeddedAdminChat && embeddedInAdminShell;
  const untitledChatBase = isEmbeddedAdminChat ? "Admin Workspace" : UNTITLED_CHAT_BASE;
  const storageScope = isEmbeddedAdminChat ? "institution_admin" : "institution";
  const chatsStorageKey = `${storageScope}_chats`;
  const activeChatStorageKey = `${storageScope}_active_chat`;
  const modeConfig = CHAT_MODE_CONFIG[resolvedChatMode];
  const starterSet = modeConfig.starters;
  const defaultAssistantMessage =
    String(initialAssistantMessage || "").trim() ||
    getDefaultAssistantMessage(resolvedChatMode, profileName);

  const [active, setActive] = useState(
    isEmbeddedAdminChat ? "newchat" : (initialView === "chat" ? "newchat" : (initialView || "newchat"))
  );
  const [liveNow, setLiveNow] = useState(() => new Date());
  const [userRole, setUserRole] = useState(initialUserRole || null);
  const [input, setInput] = useState("");
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState("");
  const [isNewChatMenuOpen, setIsNewChatMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationsMenuOpen, setIsNotificationsMenuOpen] = useState(false);
  const [isDesktopSettingsLauncherOpen, setIsDesktopSettingsLauncherOpen] = useState(false);
  const [selectedDesktopSettingsSection, setSelectedDesktopSettingsSection] = useState("general");
  const [useDesktopSettingsWorkspace, setUseDesktopSettingsWorkspace] = useState(false);
  const [desktopSettingsReturnView, setDesktopSettingsReturnView] = useState("newchat");
  const [desktopSecurityVersion, setDesktopSecurityVersion] = useState(0);
  const [globalSearch, setGlobalSearch] = useState("");
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [notifications, setNotifications] = useState(() => [
    {
      id: "n1",
      title: "New announcement posted",
      detail: "Check the latest update from your institution.",
      read: false,
      createdAt: Date.now() - 2 * 60 * 60 * 1000,
      type: "info",
    },
    {
      id: "n2",
      title: "Assignment due tomorrow",
      detail: "Reminder: one assignment is due by 5 PM.",
      read: false,
      createdAt: Date.now() - 30 * 60 * 1000,
      type: "assignments",
    },
  ]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [shouldRunShellOnboardingHint, setShouldRunShellOnboardingHint] = useState(false);
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(() => {
    try {
      return localStorage.getItem("sidebar_more_open") === "1";
    } catch {
      return false;
    }
  });
  const [isMorePopupOpen, setIsMorePopupOpen] = useState(false);
  const [isAttachOpen, setIsAttachOpen] = useState(false);
  const [isToolsPanelOpen, setIsToolsPanelOpen] = useState(false);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [isProfileSheetOpen, setIsProfileSheetOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifAnchor, setNotifAnchor] = useState(null);
  const [isAiModeOn, setIsAiModeOn] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [voices, setVoices] = useState([]);
  const [kbHeight, setKbHeight] = useState(0);
  const [composerHeight, setComposerHeight] = useState(108);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingText, setSpeakingText] = useState("");
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [voiceFeedbackCard, setVoiceFeedbackCard] = useState({ open: false, durationLabel: "" });
  const [lastPrompt, setLastPrompt] = useState("");
  const [copiedMessageIndex, setCopiedMessageIndex] = useState(null);
  const [feedbackByMessage, setFeedbackByMessage] = useState({});
  const [feedbackToast, setFeedbackToast] = useState({ open: false, text: "" });
  const [isChatScrolling, setIsChatScrolling] = useState(false);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const [chatScrollProgress, setChatScrollProgress] = useState(0);
  const [chatScrollLabel, setChatScrollLabel] = useState("Today");
  const [contextByChat, setContextByChat] = useState({});
  const [mobileScrollTop, setMobileScrollTop] = useState(0);
  const [desktopScrollTop, setDesktopScrollTop] = useState(0);
  const [mobileViewportHeight, setMobileViewportHeight] = useState(0);
  const [desktopViewportHeight, setDesktopViewportHeight] = useState(0);
  const [virtualizationTick, setVirtualizationTick] = useState(0);
  const [selectedStarter, setSelectedStarter] = useState(null);
  const [starterSuggestions, setStarterSuggestions] = useState([]);
  const [mobileSuggestionIndex, setMobileSuggestionIndex] = useState(0);
  const [selectedChatModelKey, setSelectedChatModelKey] = useState(
    INSTITUTION_CHAT_MODEL_OPTIONS[0]?.key || "elimulink-institution-ai",
  );
  const [currentUid, setCurrentUid] = useState(auth.currentUser?.uid || null);
  const [assistantStyle, setAssistantStyle] = useAssistantStylePreference(currentUid);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLiveNow(new Date());
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleProfileChange = () => setProfileVersion((current) => current + 1);
    window.addEventListener("elimulink-profile-change", handleProfileChange);
    return () => window.removeEventListener("elimulink-profile-change", handleProfileChange);
  }, []);
  const [showAssistantStylePrompt, setShowAssistantStylePrompt] = useState(false);
  const [showAssistantStyleSelector, setShowAssistantStyleSelector] = useState(false);
  const recognitionRef = useRef(null);
  const mobileAttachmentMenuRef = useRef(null);
  const mobileModelMenuRef = useRef(null);
  const desktopAttachmentMenuRef = useRef(null);
  const starterSuggestionsPanelRef = useRef(null);
  const newChatMenuRef = useRef(null);
  const desktopSettingsTriggerRef = useRef(null);
  const profileMenuRef = useRef(null);
  const notificationsMenuRef = useRef(null);
  const notifBtnRef = useRef(null);
  const globalSearchInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const mobileMessagesRef = useRef(null);
  const desktopMessagesRef = useRef(null);
  const mobileComposerRef = useRef(null);
  const mobilePromptInputRef = useRef(null);
  const desktopPromptInputRef = useRef(null);
  const lastSpokenRef = useRef({ text: "", at: 0 });
  const voiceSessionStartedAtRef = useRef(0);
  const voiceFeedbackTimerRef = useRef(null);
  const renderCountRef = useRef(0);
  const previousUidRef = useRef(auth.currentUser?.uid || null);
  const scrollHideTimerRef = useRef(null);
  const scrollFrameRef = useRef(null);
  const scrollLabelRef = useRef("Today");
  const mobileHeightMapRef = useRef(new Map());
  const desktopHeightMapRef = useRef(new Map());
  const chatsRef = useRef([]);
  const pendingInstitutionPersistenceRef = useRef(new Map());

  const fileInputRef = useRef(null);
  const attachmentSourceRef = useRef("file");
  const [fileAcceptMode, setFileAcceptMode] = useState("");
  const [fileCaptureMode, setFileCaptureMode] = useState("");
  const [imageSearchPreview, setImageSearchPreview] = useState(null);
  const {
    mediaItems: attachments,
    previewItem,
    editorItem,
    toastItem,
    mediaNotice,
    addFiles: addCapturedFiles,
    removeMedia,
    applyEditedMedia,
    clearMedia,
    openPreview,
    openEditor,
    closePreview,
    closeEditor,
    dismissToast,
    dismissMediaNotice,
    handlePaste,
  } = useCapturedMedia();
  const [aiEditItem, setAiEditItem] = useState(null);
  const [desktopSharedLinksRemoteItems, setDesktopSharedLinksRemoteItems] = useState([]);
  const [desktopSharedLinksLoaded, setDesktopSharedLinksLoaded] = useState(false);
  const [desktopArchivedChatsRemoteItems, setDesktopArchivedChatsRemoteItems] = useState([]);
  const [desktopArchivedChatsLoaded, setDesktopArchivedChatsLoaded] = useState(false);

  function clearSessionUiState() {
    setChats([]);
    setActiveChatId(null);
    setInput("");
    clearMedia();
    setNotifications([]);
    setSelectedStarter?.(null);
    setStarterSuggestions?.([]);
  }

  function normalizeOwnedChats(items, uid) {
    if (!uid || !Array.isArray(items)) return [];
    return items
      .map((chat) => ({
        ...chat,
        ownerUid: chat.ownerUid || uid,
        chatScope: chat.chatScope || storageScope,
        messages: Array.isArray(chat.messages) ? chat.messages : [],
      }))
      .filter((chat) => (chat.ownerUid || uid) === uid)
      .filter((chat) => (chat.chatScope || storageScope) === storageScope);
  }

  function syncActiveView(next, mode = "replace") {
    if (isEmbeddedAdminChat) {
      setActive(next === "chat" ? "newchat" : next);
      return;
    }
    if (typeof window !== "undefined") {
      const currentState = window.history.state || {};
      const nextState = { ...currentState, [ACTIVE_VIEW_KEY]: next };
      if (mode === "push") {
        window.history.pushState(nextState, "", window.location.href);
      } else {
        window.history.replaceState(nextState, "", window.location.href);
      }
    }
    setActive(next);
  }

  useEffect(() => {
    try {
      localStorage.setItem("sidebar_more_open", isMoreOpen ? "1" : "0");
    } catch {
      // no-op
    }
  }, [isMoreOpen]);

  useEffect(() => {
    let mounted = true;
    const resolveRole = async () => {
      try {
        const tokenResult = await auth.currentUser?.getIdTokenResult();
        const roleClaim = tokenResult?.claims?.role || tokenResult?.claims?.userRole;
        if (mounted && roleClaim) setUserRole(roleClaim);
      } catch {
        // no-op
      }
      if (import.meta.env.DEV) {
        const devRole = localStorage.getItem("dev_role");
        if (mounted && devRole) setUserRole(devRole);
      }
    };
    resolveRole();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    const updateVoices = () => setVoices(synth.getVoices());
    updateVoices();
    synth.onvoiceschanged = updateVoices;
    return () => {
      if (synth.onvoiceschanged === updateVoices) synth.onvoiceschanged = null;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const keyboard = Math.max(0, window.innerHeight - (vv.height + vv.offsetTop));
      setKbHeight(keyboard);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  useEffect(() => {
    if (active !== "newchat") {
      setKbHeight(0);
      setComposerHeight(108);
      return;
    }

    const id = requestAnimationFrame(() => {
      const vv = window.visualViewport;
      const nextKeyboard = vv
        ? Math.max(0, window.innerHeight - (vv.height + vv.offsetTop))
        : 0;
      setKbHeight(nextKeyboard);
      setMobileViewportHeight(mobileMessagesRef.current?.clientHeight || 0);
      setDesktopViewportHeight(desktopMessagesRef.current?.clientHeight || 0);
      setMobileScrollTop(mobileMessagesRef.current?.scrollTop || 0);
      setDesktopScrollTop(desktopMessagesRef.current?.scrollTop || 0);
      resizeComposerInputs();
    });

    return () => cancelAnimationFrame(id);
  }, [active, activeChatId]);

  useEffect(() => {
    if (!isAttachOpen) return;
    const onDocumentMouseDown = (event) => {
      const inMobile = mobileAttachmentMenuRef.current?.contains(event.target);
      const inDesktop = desktopAttachmentMenuRef.current?.contains(event.target);
      if (!inMobile && !inDesktop) {
        setIsAttachOpen(false);
        setIsToolsPanelOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocumentMouseDown);
    return () => document.removeEventListener("mousedown", onDocumentMouseDown);
  }, [isAttachOpen]);

  useEffect(() => {
    if (!isModelMenuOpen) return;
    const onDocumentMouseDown = (event) => {
      if (mobileModelMenuRef.current?.contains(event.target)) return;
      setIsModelMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocumentMouseDown);
    return () => document.removeEventListener("mousedown", onDocumentMouseDown);
  }, [isModelMenuOpen]);

  useEffect(() => {
    setMobileSuggestionIndex(0);
  }, [activeChatId, selectedStarter, starterSuggestions.length]);

  useEffect(() => {
    if (!isProfileMenuOpen && !isNotificationsMenuOpen) return;
    const onDocumentMouseDown = (event) => {
      const target = event.target;
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(target) &&
        notificationsMenuRef.current &&
        !notificationsMenuRef.current.contains(target)
      ) {
        setIsProfileMenuOpen(false);
        setIsNotificationsMenuOpen(false);
        return;
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(target)) {
        setIsProfileMenuOpen(false);
      }
      if (notificationsMenuRef.current && !notificationsMenuRef.current.contains(target)) {
        setIsNotificationsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocumentMouseDown);
    return () => document.removeEventListener("mousedown", onDocumentMouseDown);
  }, [isProfileMenuOpen, isNotificationsMenuOpen]);

  useEffect(() => {
    if (!isNotificationsMenuOpen) return;
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
  }, [isNotificationsMenuOpen]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = isProfileSheetOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isProfileSheetOpen]);

  useEffect(() => {
    if (isEmbeddedAdminChat) return;
    if (typeof window === "undefined") return;
    const currentState = window.history.state || {};
    const currentView = currentState[ACTIVE_VIEW_KEY];
    if (!currentView) {
      window.history.replaceState({ ...currentState, [ACTIVE_VIEW_KEY]: active }, "", window.location.href);
    } else if (currentView !== active) {
      setActive(currentView);
    }
    const onPopState = () => {
      const nextView = window.history.state?.[ACTIVE_VIEW_KEY] || "newchat";
      setActive(nextView);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [active, isEmbeddedAdminChat]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const match = window.location.pathname.match(/\/shared\/([^/]+)/i);
    const shareId = match?.[1] || "";
    if (!shareId) return;
    loadInstitutionSharedConversation(shareId).catch((error) => {
      console.error("Failed to load shared institution conversation", error);
    });
  }, [currentUid]);

  useEffect(() => {
    const unsubscribe = auth?.onAuthStateChanged
      ? auth.onAuthStateChanged((firebaseUser) => {
      const newUid = firebaseUser?.uid || null;
      const previousUid = previousUidRef.current;

      if (previousUid && previousUid !== newUid) {
        clearSessionUiState();
      }

      previousUidRef.current = newUid;
      setCurrentUid(newUid);
      })
      : () => {};

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUid) {
      clearSessionUiState();
      return;
    }

    const savedChats = readScopedJson(currentUid, chatsStorageKey, []);
    const savedActiveChatId = readScopedJson(currentUid, activeChatStorageKey, null);
    const ownedChats = normalizeChatTitles(normalizeOwnedChats(savedChats, currentUid), untitledChatBase);

    const nextChats =
      ownedChats.length > 0
        ? ownedChats
        : [{ ...createDefaultChat(untitledChatBase, defaultAssistantMessage, currentUid), chatScope: storageScope }];

    setChats(nextChats);
    setActiveChatId(
      nextChats.some((chat) => chat.id === savedActiveChatId)
        ? savedActiveChatId
        : nextChats[0]?.id || null
    );
  }, [activeChatStorageKey, chatsStorageKey, currentUid, defaultAssistantMessage, storageScope, untitledChatBase]);

  useEffect(() => {
    if (!currentUid) return;
    const ownedChats = normalizeOwnedChats(chats, currentUid);
    writeScopedJson(currentUid, chatsStorageKey, ownedChats);
  }, [chatsStorageKey, currentUid, chats]);

  useEffect(() => {
    chatsRef.current = chats;
  }, [chats]);

  useEffect(() => {
    const ownedChats = normalizeOwnedChats(chats, currentUid);
    if (activeChatId && ownedChats.some((chat) => chat.id === activeChatId)) return;
    setActiveChatId(ownedChats[0]?.id || null);
  }, [activeChatId, chats, currentUid]);

  useEffect(() => {
    if (!currentUid) return;
    writeScopedJson(currentUid, activeChatStorageKey, activeChatId);
  }, [activeChatStorageKey, currentUid, activeChatId]);

  useEffect(() => {
    if (!isNewChatMenuOpen) return;
    const onDocumentMouseDown = (event) => {
      if (!newChatMenuRef.current) return;
      if (!newChatMenuRef.current.contains(event.target)) setIsNewChatMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocumentMouseDown);
    return () => document.removeEventListener("mousedown", onDocumentMouseDown);
  }, [isNewChatMenuOpen]);

  useEffect(() => {
    const timers = new WeakMap();
    const onScroll = (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!target.classList.contains("smart-scrollbar")) return;
      target.classList.add("is-scrolling");
      const prev = timers.get(target);
      if (prev) clearTimeout(prev);
      const next = setTimeout(() => target.classList.remove("is-scrolling"), 220);
      timers.set(target, next);
    };
    document.addEventListener("scroll", onScroll, true);
    return () => document.removeEventListener("scroll", onScroll, true);
  }, []);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    renderCountRef.current += 1;
    console.debug("[NewChatLanding] render", {
      count: renderCountRef.current,
      active,
      chats: chats.length,
      messages: messages.length,
      attachments: attachments.length,
    });
  });

  const isAdminRole = [
    "admin",
    "department_head",
    "institution_admin",
    "staff",
    "departmentadmin",
    "superadmin",
  ].includes(String(userRole || "").toLowerCase());
  // TEMP FLAG — set to false later when role security is restored.
  const FORCE_SHOW_ADMIN = true;
  const canShowAdmin = FORCE_SHOW_ADMIN || import.meta.env.DEV || isAdminRole;
  const moreItems = useMemo(() => {
    if (!canShowAdmin) return MORE_ITEMS_BASE;
    return [...MORE_ITEMS_BASE, { key: "admin", label: "Admin", icon: Shield }];
  }, [canShowAdmin]);

  const moreKeys = useMemo(() => moreItems.map((item) => item.key), [moreItems]);

  const settingsProfile = useMemo(
    () =>
      getStoredProfile({
        name: profileName,
        email: firebaseUser?.email || "student@elimulink.co.ke",
        phone: "+2547xx xxx xxx",
        avatarUrl: "",
      }, currentUid),
    [active, profileName, firebaseUser, currentUid, profileVersion]
  );
  const settingsPrefs = useMemo(
    () =>
      getStoredPreferences({
        muteNotifications: false,
        keyboardShortcuts: false,
        language: "en-KE",
      }, currentUid),
    [active, currentUid]
  );
  const audioPlayer = useAudioPlayer({
    uid: currentUid,
    appLanguage: settingsPrefs?.language || "en-KE",
  });

  useEffect(() => {
    setIsSpeaking(audioPlayer.isPlaying);
    setSpeakingText(audioPlayer.isPlaying ? audioPlayer.activeText : "");
  }, [audioPlayer.activeText, audioPlayer.isPlaying]);

  const user = useMemo(
    () => ({
      name: settingsProfile?.name || profileName,
      email: settingsProfile?.email || firebaseUser?.email || "student@elimulink.co.ke",
      phone: settingsProfile?.phone || "+2547xx xxx xxx",
      avatarUrl: settingsProfile?.avatarUrl || "",
      nextClass: "Biology 101 at 10:00 AM",
      balance: "KES 12,000",
      attendance: "85%",
      gpa: "3.8",
    }),
    [settingsProfile, profileName, firebaseUser]
  );
  const landingGreeting = useMemo(() => timeGreeting(liveNow), [liveNow]);
  const landingName = useMemo(
    () => firstNameOf(settingsProfile?.name || user?.name || profileName),
    [settingsProfile?.name, user?.name, profileName]
  );
  const landingTitle = useMemo(() => {
    if (resolvedChatMode === "admin") return modeConfig.title;
    return `Hi ${landingName}, where should we start?`;
  }, [landingName, modeConfig.title, resolvedChatMode]);
  const adminOverviewCards = useMemo(
    () => [
      { title: "Pending Workflows", value: "12", subtitle: "Needs review" },
      { title: "Attendance Alerts", value: "5", subtitle: "Flagged classes" },
      { title: "Results Blockers", value: "7", subtitle: "Approval bottlenecks" },
      { title: "Subgroup Queues", value: "9", subtitle: "Awaiting action" },
    ],
    []
  );

  const preferredSpeechLanguage = useMemo(
    () => resolveSpeechLanguage(settingsPrefs?.language || "en-KE"),
    [settingsPrefs?.language]
  );

  const placeholderConfig = useMemo(
    () => ({
      calendar: {
        title: "Calendar",
        bullets: ["Connect schedules", "Sync classes and exams", "Set reminders"],
      },
      messaging: {
        title: "Messaging",
        bullets: ["Group chats", "Direct messages", "Admin announcements"],
      },
      attendance: {
        title: "Attendance",
        bullets: ["Track sessions", "Mark participation", "Export reports"],
      },
      fees: {
        title: "Fees Portal",
        bullets: ["View balances", "Payment history", "Download statements"],
      },
      profile: {
        title: "Profile",
        bullets: ["Update personal info", "Manage preferences", "View account status"],
      },
    }),
    []
  );

  const activePlaceholder = placeholderConfig[active];

  const safeChats = normalizeOwnedChats(chats, currentUid);
  const activeChat =
    safeChats.find((chat) => chat.id === activeChatId) || safeChats[0] || null;
  const messages = activeChat?.messages || [];
  const resolveMessageTimestamp = (message, idx) => {
    if (message?.createdAt) return Number(message.createdAt);
    if (activeChat?.updatedAt) return Number(activeChat.updatedAt) + idx;
    return Date.now() + idx;
  };
  const sectionLabelForIndex = (idx) => sectionLabelFromTimestamp(resolveMessageTimestamp(messages[idx], idx));
  const sectionKeyForIndex = (idx) => {
    const ts = resolveMessageTimestamp(messages[idx], idx);
    return `${sectionLabelFromTimestamp(ts)}::${new Date(ts).getFullYear()}-${new Date(ts).getMonth()}`;
  };
  const shouldShowSectionAnchor = (idx) => idx === 0 || sectionKeyForIndex(idx) !== sectionKeyForIndex(idx - 1);
  const activeAcademicContext = contextByChat[activeChat?.id || ""] || EMPTY_ACADEMIC_CONTEXT;
  const activeContextLabel = contextLabel(activeAcademicContext);
  const hasConversation = messages.length > 0;
  const hasUserMessages = messages.some((message) => message?.role === "user");
  const hasStreamingAssistantReply = messages.some((message) => Boolean(message?.streaming));
  const canSend = input.trim().length > 0 || attachments.length > 0;
  const hasText = input.trim().length > 0;
  const hasStarterSuggestions = !hasConversation && starterSuggestions.length > 0;
  const activeChatModel =
    INSTITUTION_CHAT_MODEL_OPTIONS.find((model) => model.key === selectedChatModelKey) ||
    INSTITUTION_CHAT_MODEL_OPTIONS[0];

  useEffect(() => {
    if (!hasStarterSuggestions || hasConversation) return;
    const onDocumentMouseDown = (event) => {
      if (starterSuggestionsPanelRef.current?.contains(event.target)) return;
      setStarterSuggestions([]);
    };
    document.addEventListener("mousedown", onDocumentMouseDown);
    return () => document.removeEventListener("mousedown", onDocumentMouseDown);
  }, [hasStarterSuggestions, hasConversation]);
  const mobileSuggestionPool = useMemo(() => {
    const pool = starterSuggestions.length
      ? starterSuggestions
      : starterSet.flatMap((starter) => (Array.isArray(starter.suggestions) ? starter.suggestions.slice(0, 2) : []));
    return Array.from(new Set(pool.map((item) => String(item || "").trim()).filter(Boolean))).slice(0, 12);
  }, [starterSet, starterSuggestions]);
  const showMobileRotatingSuggestion =
    active === "newchat" &&
    !hasConversation &&
    !hasUserMessages &&
    mobileSuggestionPool.length > 0 &&
    !hasText &&
    !hasStreamingAssistantReply &&
    !isAttachOpen &&
    !isModelMenuOpen &&
    !isMobileDrawerOpen &&
    !voiceOpen;
  const activeMobileSuggestion =
    mobileSuggestionPool.length > 0
      ? mobileSuggestionPool[mobileSuggestionIndex % mobileSuggestionPool.length]
      : "";
  const showMobileEntryGlow =
    active === "newchat" &&
    messages.length === 0 &&
    !hasText &&
    !isAttachOpen &&
    !isModelMenuOpen &&
    !isMobileDrawerOpen &&
    !voiceOpen;

  useEffect(() => {
    if (!showMobileRotatingSuggestion || mobileSuggestionPool.length <= 1) return;
    const id = window.setInterval(() => {
      setMobileSuggestionIndex((current) => (current + 1) % mobileSuggestionPool.length);
    }, 5200);
    return () => window.clearInterval(id);
  }, [mobileSuggestionPool.length, showMobileRotatingSuggestion]);

  const unreadNotifications = notifications.filter((item) => !item.read).length;
  const desktopSettingsUser = useMemo(
    () => ({
      ...user,
      uid: firebaseUser?.uid || null,
      email: firebaseUser?.email || user?.email || "",
      displayName: firebaseUser?.displayName || user?.name || "",
      providerData: firebaseUser?.providerData || [],
    }),
    [firebaseUser?.displayName, firebaseUser?.email, firebaseUser?.providerData, firebaseUser?.uid, user],
  );
  const desktopSecurityCapabilities = useMemo(
    () => getSecureUnlockCapabilities(auth?.currentUser || desktopSettingsUser || null),
    [desktopSecurityVersion, desktopSettingsUser],
  );
  const desktopSharedLinksFallbackItems = useMemo(() => {
    const seen = new Set();
    return (Array.isArray(chats) ? chats : [])
      .filter((chat) => chat?.shareId && chat?.shareUrl && !chat?.isSharedView)
      .filter((chat) => {
        const shareKey = String(chat.shareId || "");
        if (!shareKey || seen.has(shareKey)) return false;
        seen.add(shareKey);
        return true;
      })
      .map((chat) => ({
        id: String(chat.shareId || chat.id || ""),
        conversationId: String(chat.conversationId || ""),
        chatId: String(chat.id || ""),
        name: String(chat.title || "Shared conversation"),
        type: isEmbeddedAdminChat ? "Admin conversation" : "Conversation",
        dateShared: chat.updatedAt || Date.now(),
        url: String(chat.shareUrl || ""),
        canDelete: true,
      }));
  }, [chats, isEmbeddedAdminChat]);
  const desktopSharedLinksItems = useMemo(() => {
    if (desktopSharedLinksLoaded) {
      return desktopSharedLinksRemoteItems;
    }
    return desktopSharedLinksFallbackItems;
  }, [desktopSharedLinksFallbackItems, desktopSharedLinksLoaded, desktopSharedLinksRemoteItems]);
  const desktopPersonalizationHistoryItems = useMemo(
    () =>
      (Array.isArray(chats) ? chats : [])
        .filter((chat) => !chat?.isSharedView)
        .slice(0, 8)
        .map((chat) => ({
          id: String(chat.id || ""),
          title: String(chat.title || "Conversation"),
          updatedAt: chat.updatedAt || Date.now(),
          messageCount: Array.isArray(chat.messages) ? chat.messages.length : 0,
        })),
    [chats],
  );
  const desktopArchivedChatsFallbackItems = useMemo(
    () =>
      (Array.isArray(chats) ? chats : [])
        .filter((chat) => Boolean(chat?.archivedAt || chat?.isArchived || chat?.hiddenAt || chat?.isHidden))
        .map((chat) => {
          const lastAssistantText = Array.isArray(chat.messages)
            ? [...chat.messages]
                .reverse()
                .find((message) => typeof message?.text === "string" && message.text.trim())
            : null;
          return {
            id: String(chat.id || chat.conversationId || ""),
            chatId: String(chat.id || ""),
            conversationId: String(chat.conversationId || ""),
            title: String(chat.title || "Archived conversation"),
            preview: String(lastAssistantText?.text || "Conversation preview unavailable.").slice(0, 120),
            dateArchived: chat.archivedAt || chat.hiddenAt || chat.updatedAt || Date.now(),
            canOpen: true,
            canRestore: true,
            canDelete: false,
          };
        }),
    [chats],
  );
  const desktopArchivedChatsItems = useMemo(() => {
    if (desktopArchivedChatsLoaded) {
      return desktopArchivedChatsRemoteItems;
    }
    return desktopArchivedChatsFallbackItems;
  }, [desktopArchivedChatsFallbackItems, desktopArchivedChatsLoaded, desktopArchivedChatsRemoteItems]);
  const normalizedNotifications = useMemo(
    () =>
      notifications.map((item) => ({
        id: item.id,
        title: item.title,
        body: item.detail || "",
        createdAt: item.createdAt || null,
        type: item.type || "info",
        read: item.read,
      })),
    [notifications]
  );
  const profileInitials = initialsOf(user.name);

  const refreshDesktopArchivedChats = useCallback(async () => {
    const activeUser = auth?.currentUser || null;
    if (!activeUser?.uid) {
      setDesktopArchivedChatsRemoteItems([]);
      setDesktopArchivedChatsLoaded(false);
      return;
    }
    const payload = await fetchInstitutionArchivedChats({ limit: 100 });
    const rows = Array.isArray(payload?.archived_chats) ? payload.archived_chats : [];
    setDesktopArchivedChatsRemoteItems(
      rows.map((item) => {
        const conversationId = String(item?.conversation_id || item?.id || "");
        const matchingChat = (Array.isArray(chats) ? chats : []).find(
          (chat) => String(chat?.conversationId || "") === conversationId,
        );
        return {
          id: conversationId,
          chatId: String(matchingChat?.id || ""),
          conversationId,
          title: String(item?.title || matchingChat?.title || "Archived conversation"),
          preview: String(item?.preview || "Conversation preview unavailable.").slice(0, 120),
          dateArchived: item?.archived_at || item?.updated_at || Date.now(),
          canOpen: true,
          canRestore: true,
          canDelete: false,
        };
      }),
    );
    setDesktopArchivedChatsLoaded(true);
  }, [chats]);

  const refreshDesktopSharedLinks = useCallback(async () => {
    const activeUser = auth?.currentUser || null;
    if (!activeUser?.uid) {
      setDesktopSharedLinksRemoteItems([]);
      setDesktopSharedLinksLoaded(false);
      return;
    }
    const payload = await fetchInstitutionShareLinks({ limit: 100 });
    const rows = Array.isArray(payload?.share_links) ? payload.share_links : [];
    setDesktopSharedLinksRemoteItems(
      rows.map((item) => ({
        id: String(item?.id || ""),
        conversationId: String(item?.conversation_id || ""),
        chatId: String(
          (Array.isArray(chats) ? chats : []).find(
            (chat) => String(chat?.conversationId || "") === String(item?.conversation_id || ""),
          )?.id || "",
        ),
        name: String(item?.title || "Shared conversation"),
        type: String(item?.type || "Conversation"),
        dateShared: item?.updated_at || item?.created_at || Date.now(),
        url: String(item?.url || ""),
        canDelete: true,
      })),
    );
    setDesktopSharedLinksLoaded(true);
  }, [chats]);

  const handleDesktopArchivedChatOpen = useCallback(
    async (item) => {
      const nextConversationId = String(item?.conversationId || item?.id || "");
      const existingChat = (Array.isArray(chats) ? chats : []).find(
        (chat) => String(chat?.conversationId || "") === nextConversationId || String(chat?.id || "") === String(item?.chatId || ""),
      );

      if (existingChat?.id) {
        setActiveChatId(existingChat.id);
        setUseDesktopSettingsWorkspace(false);
        setActive("newchat");
        return;
      }

      if (!nextConversationId) return;
      const payload = await fetchInstitutionConversation(nextConversationId);
      const conversation = payload?.conversation || {};
      const messages = Array.isArray(payload?.messages) ? payload.messages : [];
      const nextChatId = makeChatId();
      const mappedChat = {
        ...createDefaultChat(String(conversation?.title || "Archived conversation"), "", currentUid),
        id: nextChatId,
        ownerUid: currentUid,
        chatScope: storageScope,
        conversationId: nextConversationId,
        archivedAt: item?.dateArchived || conversation?.archived_at || Date.now(),
        isArchived: true,
        messages: messages.map((message) => ({
          id: message?.id || "",
          conversationId: nextConversationId,
          role: message?.role || "assistant",
          text: message?.content || "",
          sources: message?.sources || [],
          ownerUid: currentUid,
          createdAt: Date.parse(message?.created_at || "") || Date.now(),
        })),
        updatedAt:
          Date.parse(conversation?.updated_at || conversation?.archived_at || "") || Date.now(),
      };
      setChats((current) => [mappedChat, ...(Array.isArray(current) ? current : [])]);
      setActiveChatId(nextChatId);
      setUseDesktopSettingsWorkspace(false);
      setActive("newchat");
    },
    [chats, currentUid, storageScope],
  );

  const handleDesktopArchivedChatRestore = useCallback(
    async (item) => {
      const nextConversationId = String(item?.conversationId || item?.id || "");
      if (!nextConversationId) return;
      await restoreInstitutionConversation(nextConversationId);
      setChats((current) =>
        current.map((chat) =>
          String(chat?.conversationId || "") === nextConversationId || String(chat?.id || "") === String(item?.chatId || "")
            ? {
                ...chat,
                archivedAt: null,
                hiddenAt: null,
                isArchived: false,
                isHidden: false,
                updatedAt: Date.now(),
              }
            : chat,
        ),
      );
      await refreshDesktopArchivedChats();
    },
    [refreshDesktopArchivedChats],
  );

  useEffect(() => {
    if (active !== SETTINGS_ITEM.key) return;
    if (!auth?.currentUser?.uid) {
      setDesktopSharedLinksRemoteItems([]);
      setDesktopSharedLinksLoaded(false);
      return;
    }
    refreshDesktopSharedLinks().catch(() => {
      setDesktopSharedLinksRemoteItems([]);
      setDesktopSharedLinksLoaded(false);
    });
  }, [active, refreshDesktopSharedLinks]);

  useEffect(() => {
    if (!useDesktopSettingsWorkspace || !isDesktopSettingsViewport()) return;
    if (!auth?.currentUser?.uid) {
      setDesktopArchivedChatsRemoteItems([]);
      setDesktopArchivedChatsLoaded(false);
      return;
    }
    refreshDesktopArchivedChats().catch(() => {
      setDesktopArchivedChatsRemoteItems([]);
      setDesktopArchivedChatsLoaded(false);
    });
  }, [refreshDesktopArchivedChats, useDesktopSettingsWorkspace]);

  const estimateMessageHeight = (message, mode) => {
    const text = String(message?.text || "");
    const charsPerLine = mode === "desktop" ? 90 : 44;
    const lines = Math.max(1, Math.ceil(text.length / charsPerLine));
    const base = message?.role === "user" ? 72 : 94;
    return Math.min(420, base + lines * 20);
  };

  const getMeasuredOrEstimatedHeight = (index, message, mode) => {
    const mapRef = mode === "desktop" ? desktopHeightMapRef : mobileHeightMapRef;
    return mapRef.current.get(index) || estimateMessageHeight(message, mode);
  };

  const buildVirtualWindow = (mode) => {
    const viewportHeight = mode === "desktop" ? desktopViewportHeight : mobileViewportHeight;
    const scrollTop = mode === "desktop" ? desktopScrollTop : mobileScrollTop;
    const overscan = 8;
    if (!messages.length) {
      return { items: [], paddingTop: 0, paddingBottom: 0 };
    }
    if (viewportHeight <= 0) {
      return {
        items: messages.map((message, index) => ({ index, message })),
        paddingTop: 0,
        paddingBottom: 0,
      };
    }

    const heights = messages.map((m, idx) => {
      const base = getMeasuredOrEstimatedHeight(idx, m, mode);
      const hasSection = idx === 0 || sectionKeyForIndex(idx) !== sectionKeyForIndex(idx - 1);
      return base + (hasSection ? (mode === "desktop" ? 34 : 30) : 0);
    });
    const totalHeight = heights.reduce((sum, h) => sum + h, 0);
    const targetBottom = scrollTop + Math.max(viewportHeight, 1);

    let offset = 0;
    let start = 0;
    while (start < heights.length && offset + heights[start] < scrollTop) {
      offset += heights[start];
      start += 1;
    }

    let end = start;
    let running = offset;
    while (end < heights.length && running < targetBottom) {
      running += heights[end];
      end += 1;
    }

    const from = Math.max(0, start - overscan);
    const to = Math.min(heights.length, end + overscan);
    const paddingTop = heights.slice(0, from).reduce((sum, h) => sum + h, 0);
    const renderedHeight = heights.slice(from, to).reduce((sum, h) => sum + h, 0);
    const paddingBottom = Math.max(0, totalHeight - paddingTop - renderedHeight);

    return {
      items: messages.slice(from, to).map((message, localIndex) => ({
        index: from + localIndex,
        message,
      })),
      paddingTop,
      paddingBottom,
    };
  };

  const mobileVirtualWindow = useMemo(
    () => buildVirtualWindow("mobile"),
    [messages, mobileScrollTop, mobileViewportHeight, virtualizationTick]
  );

  const desktopVirtualWindow = useMemo(
    () => buildVirtualWindow("desktop"),
    [messages, desktopScrollTop, desktopViewportHeight, virtualizationTick]
  );

  const getActivePromptInput = () => {
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches) {
      return desktopPromptInputRef.current || mobilePromptInputRef.current;
    }
    return mobilePromptInputRef.current || desktopPromptInputRef.current;
  };

  const focusPromptInput = () => {
    const node = getActivePromptInput();
    if (!node) return;
    node.focus();
    const value = String(node.value || "");
    if (typeof node.setSelectionRange === "function") {
      node.setSelectionRange(value.length, value.length);
    }
  };

  const resizeComposerInputs = () => {
    autoResizeTextarea(mobilePromptInputRef.current, 168);
    autoResizeTextarea(desktopPromptInputRef.current, 192);
  };

  const handleComposerInputChange = (value, target) => {
    setInput(value);
    setIsModelMenuOpen(false);
    if (value.trim()) {
      setIsAttachOpen(false);
      setIsToolsPanelOpen(false);
    }
    requestAnimationFrame(() => {
      if (target) {
        const maxHeight = Number(target.dataset?.maxheight || 176);
        autoResizeTextarea(target, Number.isFinite(maxHeight) ? maxHeight : 176);
      } else {
        resizeComposerInputs();
      }
    });
  };

  const scrollToBottom = (behavior = "smooth") => {
    setShowJumpToLatest(false);
    messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
    if (mobileMessagesRef.current) {
      mobileMessagesRef.current.scrollTo({ top: mobileMessagesRef.current.scrollHeight, behavior });
    }
    if (desktopMessagesRef.current) {
      desktopMessagesRef.current.scrollTo({ top: desktopMessagesRef.current.scrollHeight, behavior });
    }
  };

  useEffect(() => {
    const id = requestAnimationFrame(() => scrollToBottom("smooth"));
    return () => cancelAnimationFrame(id);
  }, [messages.length, activeChatId]);

  useEffect(() => {
    const id = setTimeout(() => scrollToBottom("auto"), 50);
    return () => clearTimeout(id);
  }, [kbHeight]);

  useEffect(() => {
    if (!mobileComposerRef.current || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const next = Math.ceil(entry.contentRect.height);
      if (next > 0) setComposerHeight(next);
    });
    observer.observe(mobileComposerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => resizeComposerInputs());
    return () => cancelAnimationFrame(id);
  }, [input, attachments.length, kbHeight]);

  useEffect(() => {
    const syncViewport = () => {
      setMobileViewportHeight(mobileMessagesRef.current?.clientHeight || 0);
      setDesktopViewportHeight(desktopMessagesRef.current?.clientHeight || 0);
    };
    syncViewport();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(syncViewport);
    if (mobileMessagesRef.current) observer.observe(mobileMessagesRef.current);
    if (desktopMessagesRef.current) observer.observe(desktopMessagesRef.current);
    return () => observer.disconnect();
  }, [active, kbHeight]);

  useEffect(() => {
    if (!feedbackToast.open) return;
    const id = setTimeout(() => setFeedbackToast({ open: false, text: "" }), 2200);
    return () => clearTimeout(id);
  }, [feedbackToast]);

  useEffect(() => {
    return () => {
      if (scrollHideTimerRef.current) clearTimeout(scrollHideTimerRef.current);
      if (scrollFrameRef.current) cancelAnimationFrame(scrollFrameRef.current);
      if (voiceFeedbackTimerRef.current) clearTimeout(voiceFeedbackTimerRef.current);
    };
  }, []);

  useEffect(() => {
    mobileHeightMapRef.current = new Map();
    desktopHeightMapRef.current = new Map();
    setVirtualizationTick((v) => v + 1);
  }, [activeChatId]);

  useEffect(() => {
    if (!messages.length) {
      scrollLabelRef.current = "Today";
      setChatScrollLabel("Today");
      return;
    }
    const next = sectionLabelForIndex(Math.max(0, messages.length - 1));
    scrollLabelRef.current = next;
    setChatScrollLabel(next);
  }, [messages.length, activeChatId]);

  function updateActiveChatMessages(updater, titleHint) {
    const currentId = activeChat?.id;
    if (!currentId) return;
    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id !== currentId) return chat;
        const rawMessages = updater(chat.messages || []);
        let cursor = Date.now();
        const nextMessages = (rawMessages || []).map((msg) => {
          if (msg?.createdAt) {
            cursor = Math.max(cursor, Number(msg.createdAt));
            return msg;
          }
          cursor += 1;
          return { ...(msg || {}), createdAt: cursor };
        });
        const currentTitle = String(chat.title || "").trim();
        const nextTitle =
          isUntitledChatTitle(currentTitle, untitledChatBase) && titleHint
            ? titleHint.slice(0, 40)
            : currentTitle || nextUntitledChatTitle(prev, untitledChatBase);
        return {
          ...chat,
          messages: nextMessages,
          activeTopic: deriveActiveTopic(nextMessages, chat?.activeTopic || ""),
          title: nextTitle,
          updatedAt: Date.now(),
        };
      })
    );
  }

  function updateChatMessagesById(chatId, updater, titleHint) {
    const targetChatId = String(chatId || "");
    if (!targetChatId) return;
    setChats((prev) =>
      prev.map((chat) => {
        if (String(chat.id || "") !== targetChatId) return chat;
        const rawMessages = updater(chat.messages || []);
        let cursor = Date.now();
        const nextMessages = (rawMessages || []).map((msg) => {
          if (msg?.createdAt) {
            cursor = Math.max(cursor, Number(msg.createdAt));
            return msg;
          }
          cursor += 1;
          return { ...(msg || {}), createdAt: cursor };
        });
        const currentTitle = String(chat.title || "").trim();
        const nextTitle =
          isUntitledChatTitle(currentTitle, untitledChatBase) && titleHint
            ? titleHint.slice(0, 40)
            : currentTitle || nextUntitledChatTitle(prev, untitledChatBase);
        return {
          ...chat,
          messages: nextMessages,
          activeTopic: deriveActiveTopic(nextMessages, chat?.activeTopic || ""),
          title: nextTitle,
          updatedAt: Date.now(),
        };
      })
    );
  }

  function patchActiveChat(patcher) {
    const currentId = activeChat?.id;
    if (!currentId) return;
    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id !== currentId) return chat;
        return { ...chat, ...(typeof patcher === "function" ? patcher(chat) : patcher), updatedAt: Date.now() };
      })
    );
  }

  function updateActiveChatSessionId(sessionId) {
    const nextSessionId = String(sessionId || "").trim();
    if (!nextSessionId) return;
    patchActiveChat((chat) => (String(chat?.sessionId || "").trim() === nextSessionId ? chat : { sessionId: nextSessionId }));
  }

  async function ensureInstitutionConversation(titleHint) {
    const existingId = String(activeChat?.conversationId || "");
    if (existingId.startsWith("conv_")) return existingId;
    const result = await createInstitutionConversation({
      title: String(titleHint || activeChat?.title || untitledChatBase || "New conversation").slice(0, 80),
      ownerUid: currentUid || null,
    });
    const conversationId = String(result?.conversation?.id || "");
    if (conversationId) {
      patchActiveChat({ conversationId });
    }
    return conversationId;
  }

  function applyPersistedExchangeToChat(userContent, persisted, options = {}) {
    const exchangeId = String(options?.exchangeId || "").trim();
    const targetChatId = String(options?.chatId || activeChat?.id || "");
    const userMessage = persisted?.user_message;
    const assistantMessage = persisted?.assistant_message;
    const conversation = persisted?.conversation;
    if (!assistantMessage || !conversation) return;
    setChats((prev) =>
      prev.map((chat) => {
        if (String(chat.id || "") !== targetChatId) return chat;
        const nextMessages = [...(chat.messages || [])];
        for (let index = nextMessages.length - 1; index >= 0; index -= 1) {
          const item = nextMessages[index];
          if (
            item?.role === "user" &&
            !item?.id &&
            (
              (exchangeId && String(item?.exchangeId || "") === exchangeId) ||
              String(item?.text || "") === String(userContent || "")
            )
          ) {
            nextMessages[index] = {
              ...item,
              id: userMessage?.id || item.id,
              conversationId: conversation.id,
              persistState: "persisted",
            };
            break;
          }
        }
        const existingAssistantIndex = nextMessages.findIndex((item) => item?.id === assistantMessage.id);
        if (existingAssistantIndex >= 0) {
          nextMessages[existingAssistantIndex] = {
            ...nextMessages[existingAssistantIndex],
            id: assistantMessage.id,
            conversationId: conversation.id,
            role: "assistant",
            text: assistantMessage.content,
            sources: assistantMessage.sources || [],
            ownerUid: currentUid,
            createdAt: Date.parse(assistantMessage.created_at || "") || nextMessages[existingAssistantIndex]?.createdAt || Date.now(),
          };
        } else {
          let matchedAssistantIndex = -1;
          for (let index = nextMessages.length - 1; index >= 0; index -= 1) {
            const item = nextMessages[index];
            if (item?.role !== "assistant") continue;
            if (item?.id) continue;
            if (exchangeId && String(item?.exchangeId || "") === exchangeId) {
              matchedAssistantIndex = index;
              break;
            }
            if (String(item?.text || "").trim() !== String(assistantMessage.content || "").trim()) continue;
            matchedAssistantIndex = index;
            break;
          }
          if (matchedAssistantIndex >= 0) {
            nextMessages[matchedAssistantIndex] = {
              ...nextMessages[matchedAssistantIndex],
              id: assistantMessage.id,
              conversationId: conversation.id,
              role: "assistant",
              text: assistantMessage.content,
              sources: assistantMessage.sources || [],
              ownerUid: currentUid,
              streaming: false,
              streamId: undefined,
              persistState: "persisted",
              createdAt:
                Date.parse(assistantMessage.created_at || "") || nextMessages[matchedAssistantIndex]?.createdAt || Date.now(),
            };
          } else {
            nextMessages.push({
              id: assistantMessage.id,
              conversationId: conversation.id,
              role: "assistant",
              text: assistantMessage.content,
              sources: assistantMessage.sources || [],
              ownerUid: currentUid,
              persistState: "persisted",
              createdAt: Date.parse(assistantMessage.created_at || "") || Date.now(),
            });
          }
        }
        return {
          ...chat,
          conversationId: conversation.id,
          messages: nextMessages,
          updatedAt: Date.now(),
        };
      })
    );
  }

  async function persistInstitutionExchange({ userContent, assistantContent, sources, titleHint, applyToChat = true, exchangeId = "" }) {
    const conversationId = await ensureInstitutionConversation(titleHint);
    if (!conversationId) {
      throw new Error("Failed to create institution conversation.");
    }
    const citations = (sources || []).map((source, index) => ({
      id: `cit_${conversationId}_${index}`,
      source_id: source?.id || null,
      label: source?.title || source?.domain || `Source ${index + 1}`,
      position: index,
    }));
    const payload = await createInstitutionConversationMessage(conversationId, {
      content: userContent,
      assistant_content: assistantContent,
      citations,
      sources: sources || [],
    });
    if (applyToChat) {
      applyPersistedExchangeToChat(userContent, payload, { exchangeId });
    }
    return payload;
  }

  function markExchangePersistenceState(chatId, exchangeId, persistState) {
    if (!exchangeId) return;
    updateChatMessagesById(
      chatId,
      (chatMessages) =>
        chatMessages.map((message) =>
          String(message?.exchangeId || "") === String(exchangeId)
            ? { ...message, persistState }
            : message
        ),
      activeChat?.title || untitledChatBase
    );
  }

  async function reconcilePersistedInstitutionExchange({ conversationId, userContent, assistantContent }) {
    if (!conversationId) return null;
    const result = await fetchInstitutionConversation(conversationId);
    const messages = Array.isArray(result?.messages) ? result.messages : [];
    for (let index = messages.length - 1; index >= 1; index -= 1) {
      const assistantMessage = messages[index];
      const userMessage = messages[index - 1];
      if (assistantMessage?.role !== "assistant" || userMessage?.role !== "user") continue;
      if (String(userMessage?.content || "") !== String(userContent || "")) continue;
      if (String(assistantMessage?.content || "") !== String(assistantContent || "")) continue;
      return {
        conversation: result?.conversation,
        user_message: userMessage,
        assistant_message: assistantMessage,
      };
    }
    return null;
  }

  function queueInstitutionExchangePersistence({
    chatId,
    exchangeId,
    userContent,
    assistantContent,
    sources,
    titleHint,
    timingStarted = 0,
  }) {
    if (!assistantContent) return;
    if (exchangeId && pendingInstitutionPersistenceRef.current.has(exchangeId)) return;

    const task = {
      attempts: 0,
      chatId,
      exchangeId,
      userContent,
      assistantContent,
      sources,
      titleHint,
      timingStarted,
    };
    if (exchangeId) pendingInstitutionPersistenceRef.current.set(exchangeId, task);
    markExchangePersistenceState(chatId, exchangeId, "pending");

    const runAttempt = async () => {
      task.attempts += 1;
      markExchangePersistenceState(chatId, exchangeId, task.attempts > 1 ? "retrying" : "pending");
      try {
        const payload = await persistInstitutionExchange({
          userContent,
          assistantContent,
          sources,
          titleHint,
          applyToChat: false,
          exchangeId,
        });
        applyPersistedExchangeToChat(userContent, payload, { exchangeId, chatId });
        markExchangePersistenceState(chatId, exchangeId, "persisted");
        pendingInstitutionPersistenceRef.current.delete(exchangeId);
        if (timingStarted) {
          logInstitutionChatTiming("persistence_complete", timingStarted, {
            attempt: task.attempts,
            conversationId: String(payload?.conversation?.id || ""),
          });
        }
        return;
      } catch (error) {
        const conversationId = String(
          chatsRef.current.find((chat) => String(chat?.id || "") === String(chatId || ""))?.conversationId || ""
        );
        try {
          const reconciled = await reconcilePersistedInstitutionExchange({
            conversationId,
            userContent,
            assistantContent,
          });
          if (reconciled) {
            applyPersistedExchangeToChat(userContent, reconciled, { exchangeId, chatId });
            markExchangePersistenceState(chatId, exchangeId, "persisted");
            pendingInstitutionPersistenceRef.current.delete(exchangeId);
            if (timingStarted) {
              logInstitutionChatTiming("persistence_reconciled", timingStarted, {
                attempt: task.attempts,
                conversationId,
              });
            }
            return;
          }
        } catch {
          // Ignore reconciliation failures and continue to retry/fail handling.
        }

        const canRetry = task.attempts < 2 && !error?.status;
        if (canRetry) {
          if (timingStarted) {
            logInstitutionChatTiming("persistence_retry_scheduled", timingStarted, {
              attempt: task.attempts,
            });
          }
          setTimeout(() => {
            void runAttempt();
          }, 1500);
          return;
        }

        markExchangePersistenceState(chatId, exchangeId, "failed");
        pendingInstitutionPersistenceRef.current.delete(exchangeId);
        console.error("[InstitutionPersistence] Failed to persist exchange", error);
        if (timingStarted) {
          logInstitutionChatTiming("persistence_failed", timingStarted, {
            attempt: task.attempts,
            status: error?.status || null,
          });
        }
      }
    };

    Promise.resolve().then(runAttempt);
  }

  async function loadInstitutionSharedConversation(shareId) {
    if (!shareId) return;
    const result = await fetchInstitutionShareLink(shareId);
    const sharedConversation = result?.conversation;
    if (!sharedConversation?.id) return;
    const sharedChatId = `shared-${shareId}`;
    const sharedMessages = Array.isArray(sharedConversation.messages)
      ? sharedConversation.messages.map((message) => ({
          id: message.id,
          conversationId: sharedConversation.id,
          role: message.role,
          text: message.content,
          sources: message.sources || [],
          ownerUid: currentUid,
          createdAt: Date.parse(message.created_at || "") || Date.now(),
        }))
      : [];
    const sharedChat = {
      id: sharedChatId,
      ownerUid: currentUid,
      chatScope: storageScope,
      conversationId: sharedConversation.id,
      shareId,
      shareUrl: `${window.location.origin}/shared/${shareId}`,
      isSharedView: true,
      title: sharedConversation.title || "Shared conversation",
      updatedAt: Date.now(),
      messages: sharedMessages,
    };
    setChats((prev) => {
      const others = prev.filter((chat) => chat.id !== sharedChatId);
      return [sharedChat, ...others];
    });
    setActiveChatId(sharedChatId);
    setActive("newchat");
  }

  function openSettingsPanel(options = {}) {
    const { skipLauncher = false, anchorEl = null } = options;
    setIsProfileMenuOpen(false);
    setIsNotificationsMenuOpen(false);
    if (!skipLauncher && isDesktopSettingsViewport()) {
      if (anchorEl) {
        desktopSettingsTriggerRef.current = anchorEl;
      }
      setIsMoreOpen(false);
      setIsMorePopupOpen(false);
      setIsDesktopSettingsLauncherOpen(true);
      return;
    }
    setIsDesktopSettingsLauncherOpen(false);
    if (!skipLauncher || !isDesktopSettingsViewport()) {
      setUseDesktopSettingsWorkspace(false);
    }
    syncActiveView("settings", "push");
  }

  function handleDesktopSettingsSectionSelect(sectionId) {
    setDesktopSettingsReturnView(active === SETTINGS_ITEM.key ? desktopSettingsReturnView : active);
    setSelectedDesktopSettingsSection(sectionId);
    setUseDesktopSettingsWorkspace(true);
    setIsDesktopSettingsLauncherOpen(false);
    openSettingsPanel({ skipLauncher: true });
  }

  async function handleDesktopSecurityAddPasskey() {
    const activeUser = auth?.currentUser || null;
    if (!activeUser) {
      window.alert("Sign in again before setting up a passkey.");
      return;
    }
    try {
      await registerPasskey(activeUser, { label: "This device" });
      setDesktopSecurityVersion((value) => value + 1);
    } catch (error) {
      window.alert(String(error?.message || error || "Passkey setup failed."));
    }
  }

  function handleDesktopSecurityRemovePasskey() {
    const activeUser = auth?.currentUser || null;
    if (!activeUser?.uid) {
      window.alert("No passkey is registered for this account on this device.");
      return;
    }
    clearRegisteredPasskeys(activeUser.uid);
    setDesktopSecurityVersion((value) => value + 1);
  }

  function handleDesktopSecurityChangePassword() {
    window.alert("Password change will use email verification flow.");
  }

  async function handleDesktopSecurityLogoutCurrentDevice() {
    await logoutFamilySession({
      clearKeys: ["activeDepartmentId", "activeDepartmentName", "elimulink_admin_token"],
    }).catch(() => {});
    window.location.replace("/login?returnTo=%2Finstitution");
  }

  function handleDesktopSecurityLogoutAllDevices() {
    window.alert("Log out all devices can be wired later.");
  }

  function handleDesktopAccountChangeEmail({ newEmail }) {
    return {
      status: "verification-ready",
      message: `Verification is required before switching this account to ${newEmail}. Connect the real verification send step here.`,
    };
  }

  function handleDesktopAccountManageSubscription() {
    window.alert("Subscription management can be connected to billing later.");
  }

  function handleDesktopAccountManagePayment() {
    window.alert("Payment management can be connected later.");
  }

  function handleDesktopAccountDelete() {
    window.alert("Account deletion remains protected until the full flow is connected.");
  }

  async function handleDesktopSharedLinkDelete(item) {
    const shareId = String(item?.id || "");
    if (!shareId) return;
    await deleteInstitutionShareLink(shareId);
    setChats((prev) =>
      (Array.isArray(prev) ? prev : []).map((chat) =>
        chat?.shareId === shareId
          ? {
              ...chat,
              shareId: "",
              shareUrl: "",
            }
          : chat,
      ),
    );
    await refreshDesktopSharedLinks().catch(() => {
      setDesktopSharedLinksRemoteItems([]);
      setDesktopSharedLinksLoaded(false);
    });
  }

  async function handleDataControlsExport() {
    const { blob, filename } = await exportInstitutionData();
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = (filename.match(/filename=\"?([^\";]+)\"?/) || [])[1] || "elimulink-institution-export.json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    return { message: "Institution data export downloaded." };
  }

  async function handleDataControlsArchiveAllChats() {
    const payload = await archiveAllInstitutionConversations();
    const archivedIds = new Set(Array.isArray(payload?.archived_conversation_ids) ? payload.archived_conversation_ids.map(String) : []);
    if (archivedIds.size) {
      setChats((current) =>
        (Array.isArray(current) ? current : []).map((chat) =>
          archivedIds.has(String(chat?.conversationId || chat?.id || ""))
            ? {
                ...chat,
                archivedAt: Date.now(),
                isArchived: true,
                hiddenAt: Date.now(),
                isHidden: true,
                updatedAt: Date.now(),
              }
            : chat,
        ),
      );
    }
    await refreshDesktopArchivedChats().catch(() => {
      setDesktopArchivedChatsRemoteItems([]);
      setDesktopArchivedChatsLoaded(false);
    });
    return {
      message: archivedIds.size
        ? `${archivedIds.size} chat${archivedIds.size === 1 ? "" : "s"} archived.`
        : "No active chats were available to archive.",
    };
  }

  async function handleDataControlsDeleteAllChats() {
    const payload = await deleteAllInstitutionConversations();
    const deletedIds = new Set(Array.isArray(payload?.deleted_conversation_ids) ? payload.deleted_conversation_ids.map(String) : []);
    if (deletedIds.size) {
      setActiveChatId((current) => {
        const activeChat = (Array.isArray(chats) ? chats : []).find((chat) => String(chat?.id || "") === String(current || ""));
        return activeChat && deletedIds.has(String(activeChat?.conversationId || activeChat?.id || "")) ? null : current;
      });
      setChats((current) =>
        (Array.isArray(current) ? current : []).filter(
          (chat) => !deletedIds.has(String(chat?.conversationId || chat?.id || "")),
        ),
      );
    }
    await Promise.allSettled([
      refreshDesktopArchivedChats().catch(() => {
        setDesktopArchivedChatsRemoteItems([]);
        setDesktopArchivedChatsLoaded(false);
      }),
      refreshDesktopSharedLinks().catch(() => {
        setDesktopSharedLinksRemoteItems([]);
        setDesktopSharedLinksLoaded(false);
      }),
    ]);
    return {
      message: deletedIds.size
        ? `${deletedIds.size} chat${deletedIds.size === 1 ? "" : "s"} deleted.`
        : "No owned chats were available to delete.",
    };
  }

  function openAdminPanel() {
    setIsProfileMenuOpen(false);
    setIsNotificationsMenuOpen(false);
    setIsMobileDrawerOpen(false);
    setIsMobileMoreOpen(false);
    setIsMorePopupOpen(false);
    if (typeof onOpenAdmin === "function") {
      onOpenAdmin();
      return;
    }
    syncActiveView("admin", "push");
  }

  function toggleNotificationsMenu() {
    setIsNotificationsMenuOpen((prev) => !prev);
    setIsProfileMenuOpen(false);
  }

  function openMobileNotifications() {
    const btn = notifBtnRef.current;
    if (!btn || typeof window === "undefined") {
      setIsNotifOpen((prev) => !prev);
      return;
    }
    const rect = btn.getBoundingClientRect();
    const panelWidth = Math.min(360, window.innerWidth - 24);
    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
    const left = clamp(rect.right - panelWidth, 12, window.innerWidth - panelWidth - 12);
    const top = rect.bottom + 10;
    setNotifAnchor({ top, left, width: panelWidth });
    setIsNotifOpen(true);
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
  }

  function markAllNotificationsRead() {
    setNotifications([]);
  }

  function toggleProfileMenu() {
    setIsProfileMenuOpen((prev) => !prev);
    setIsNotificationsMenuOpen(false);
  }

  function runGlobalSearch() {
    const query = String(globalSearch || "").trim();
    if (!query) return;
    const queryLower = query.toLowerCase();
    const matchingChat = chats.find((chat) =>
      String(chat?.title || "")
        .toLowerCase()
        .includes(queryLower)
    );

    syncActiveView("newchat", "push");
    if (matchingChat?.id) {
      setActiveChatId(matchingChat.id);
      setGlobalSearch("");
      return;
    }

    setInput(query);
    setGlobalSearch("");
    setTimeout(() => focusPromptInput(), 0);
  }

  async function handleLogout() {
    clearSessionUiState();
    setIsProfileMenuOpen(false);
    setIsProfileSheetOpen(false);
    await logoutFamilySession({
      clearKeys: ["activeDepartmentId", "activeDepartmentName", "elimulink_admin_token"],
    });
    try {
      localStorage.removeItem("elimulink_admin_token");
    } catch {
      // no-op
    }
    window.location.href = "/login?returnTo=%2Finstitution";
  }

  function startNewChat() {
    const next = {
      ...createDefaultChat(nextUntitledChatTitle(chats, untitledChatBase), "", currentUid),
      chatScope: storageScope,
    };
    setChats((prev) => [next, ...prev]);
    setActiveChatId(next.id);
    setContextByChat((prev) => ({ ...prev, [next.id]: { ...EMPTY_ACADEMIC_CONTEXT } }));
    syncActiveView("newchat", "push");
    setIsNewChatMenuOpen(false);
  }

  function renameChatById(chatId) {
    const target = chats.find((chat) => chat.id === chatId);
    if (!target) return;
    const nextTitle = window.prompt("Rename chat", target.title || untitledChatBase);
    if (!nextTitle || !nextTitle.trim()) return;
    setChats((prev) =>
      prev.map((chat) => (chat.id === chatId ? { ...chat, title: nextTitle.trim() } : chat))
    );
  }

  function deleteChatById(chatId) {
    setChats((prev) => {
      const filtered = prev.filter((chat) => chat.id !== chatId);
      if (filtered.length === 0) {
        const fallback = {
          ...createDefaultChat(untitledChatBase, "", currentUid),
          chatScope: storageScope,
        };
        setActiveChatId(fallback.id);
        return [fallback];
      }
      if (activeChatId === chatId) setActiveChatId(filtered[0].id);
      return filtered;
    });
  }

  function formatFileSize(bytes) {
    if (bytes === null || bytes === undefined) return "";
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  }

  function openAttachmentPicker({ accept = "", capture = "", source = "file" } = {}) {
    setIsAttachOpen(false);
    setIsToolsPanelOpen(false);
    setFileAcceptMode(accept);
    setFileCaptureMode(capture);
    attachmentSourceRef.current = source;
    setTimeout(() => {
      if (!fileInputRef.current) return;
      fileInputRef.current.accept = accept;
      if (capture) {
        fileInputRef.current.setAttribute("capture", capture);
      } else {
        fileInputRef.current.removeAttribute("capture");
      }
      fileInputRef.current.click();
    }, 0);
  }

  function addFiles(fileList, source = "file") {
    addCapturedFiles(fileList, source);
  }

  function removeAttachment(id) {
    removeMedia(id);
  }

  function openAttachmentItem(item) {
    if (!item) return;
    openPreview(item);
  }

  function readAttachmentFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Could not read this image attachment."));
      reader.readAsDataURL(file);
    });
  }

  async function buildVisionAttachmentSummary(imageAttachments, userPrompt) {
    const validImages = (Array.isArray(imageAttachments) ? imageAttachments : [])
      .filter((item) => item?.isImage && item?.file)
      .slice(0, 10);
    if (!validImages.length) return "";

    const promptText = String(userPrompt || "").trim();
    const visionPrompt = promptText
      ? `Inspect this image carefully for this user request: ${promptText}. Describe the visible content, readable text, diagrams, and any details needed to answer.`
      : "Describe this image clearly. Include readable text, diagrams, objects, and important visual details.";

    const summaries = await Promise.all(
      validImages.map(async (item, index) => {
        try {
          const imageDataUrl = await readAttachmentFileAsDataUrl(item.file);
          const visualResult = await analyzeVisualContext({
            imageDataUrl,
            prompt: visionPrompt,
            family: "ai",
            app: storageScope,
          });
          const answer = String(visualResult?.answer || "").trim();
          if (!answer) return "";
          return `Image ${index + 1}${item?.name ? ` (${item.name})` : ""}: ${answer}`;
        } catch {
          return "";
        }
      })
    );

    const cleanSummaries = summaries.map((item) => String(item || "").trim()).filter(Boolean);
    if (!cleanSummaries.length) return "";
    return `\n\nImage analysis:\n${cleanSummaries.join("\n\n")}`;
  }

  async function handleAiEditApply({ imageUrl, file, text, previousItem }) {
    if (previousItem?.id && attachments.some((entry) => entry.id === previousItem.id) && file) {
      await applyEditedMedia(previousItem.id, file);
      return;
    }

    if (previousItem?.source === "ai-generated") {
      updateActiveChatMessages(
        (messages) => [
          ...messages,
          {
            role: "assistant",
            text: text || "Updated ✅",
            imageUrl,
            type: "image",
            ownerUid: currentUid,
            createdAt: Date.now(),
          },
        ],
        "Edited image"
      );
    }
  }

  function toggleAttachmentPanel() {
    setIsModelMenuOpen(false);
    setIsAttachOpen((prev) => {
      const next = !prev;
      if (!next) setIsToolsPanelOpen(false);
      return next;
    });
  }

  function toggleModelMenu() {
    setIsAttachOpen(false);
    setIsToolsPanelOpen(false);
    setIsModelMenuOpen((value) => !value);
  }

  function applyToolPreset(prompt) {
    setIsAttachOpen(false);
    setIsToolsPanelOpen(false);
    setIsModelMenuOpen(false);
    setInput(prompt);
    requestAnimationFrame(() => focusPromptInput());
  }

  function applyStarter(starter) {
    setSelectedStarter(starter.key);
    setInput(starter.prefill);
    setStarterSuggestions(starter.suggestions);
    setIsModelMenuOpen(false);
    requestAnimationFrame(() => focusPromptInput());
  }

  function applySuggestion(suggestion) {
    setInput(suggestion);
    setIsAttachOpen(false);
    setIsToolsPanelOpen(false);
    setIsModelMenuOpen(false);
    requestAnimationFrame(() => focusPromptInput());
  }

  function setMessageFeedback(messageKey, reaction) {
    setFeedbackByMessage((prev) => {
      const current = prev[messageKey];
      const next = current === reaction ? null : reaction;
      return { ...prev, [messageKey]: next };
    });
    setFeedbackToast({ open: true, text: "Thank you for your feedback!" });
  }

  function resolveScrollLabelFromPosition(mode, scrollTop) {
    if (!messages.length) return "Today";
    const heights = messages.map((m, idx) => {
      const base = getMeasuredOrEstimatedHeight(idx, m, mode);
      const hasSection = idx === 0 || sectionKeyForIndex(idx) !== sectionKeyForIndex(idx - 1);
      return base + (hasSection ? (mode === "desktop" ? 34 : 30) : 0);
    });
    let offset = 0;
    let visibleIdx = 0;
    while (visibleIdx < heights.length && offset + heights[visibleIdx] < scrollTop + 12) {
      offset += heights[visibleIdx];
      visibleIdx += 1;
    }
    const bounded = Math.max(0, Math.min(messages.length - 1, visibleIdx));
    return sectionLabelForIndex(bounded);
  }

  function measureVirtualRow(mode, index, node) {
    if (!node) return;
    const mapRef = mode === "desktop" ? desktopHeightMapRef : mobileHeightMapRef;
    const nextHeight = Math.ceil(node.getBoundingClientRect().height);
    if (!nextHeight) return;
    const prev = mapRef.current.get(index);
    if (prev === nextHeight) return;
    mapRef.current.set(index, nextHeight);
    setVirtualizationTick((v) => v + 1);
  }

  function handleChatScroll(event) {
    const el = event.currentTarget;
    if (!el) return;
    if (el === mobileMessagesRef.current) {
      setMobileScrollTop(el.scrollTop);
      setMobileViewportHeight(el.clientHeight || 0);
    } else if (el === desktopMessagesRef.current) {
      setDesktopScrollTop(el.scrollTop);
      setDesktopViewportHeight(el.clientHeight || 0);
    }
    if (isAttachOpen) {
      setIsAttachOpen(false);
      setIsToolsPanelOpen(false);
    }
    if (isModelMenuOpen) {
      setIsModelMenuOpen(false);
    }
    const mode = el === desktopMessagesRef.current ? "desktop" : "mobile";
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowJumpToLatest(distanceFromBottom > 180);
    const max = Math.max(1, el.scrollHeight - el.clientHeight);
    const progress = Math.min(1, Math.max(0, el.scrollTop / max));
    if (scrollFrameRef.current) cancelAnimationFrame(scrollFrameRef.current);
    scrollFrameRef.current = requestAnimationFrame(() => {
      setChatScrollProgress(progress);
      const nextLabel = resolveScrollLabelFromPosition(mode, el.scrollTop);
      if (scrollLabelRef.current !== nextLabel) {
        scrollLabelRef.current = nextLabel;
        setChatScrollLabel(nextLabel);
      }
    });
    setIsChatScrolling(true);
    if (scrollHideTimerRef.current) clearTimeout(scrollHideTimerRef.current);
    scrollHideTimerRef.current = setTimeout(() => setIsChatScrolling(false), 900);
  }

  async function shareAssistantMessage(text) {
    const value = String(text || "").trim();
    if (!value) return;
    try {
      if (navigator.share) {
        await navigator.share({ text: value });
        return;
      }
    } catch {
      // fallback to clipboard below
    }
    try {
      await navigator.clipboard.writeText(value);
      setFeedbackToast({ open: true, text: "Response copied for sharing." });
    } catch {
      // ignore clipboard errors
    }
  }

  function handleFileInputChange(event) {
    const files = event.target.files;
    addFiles(files, attachmentSourceRef.current || "file");
    event.target.value = "";
  }

  function dismissVoiceFeedbackCard() {
    if (voiceFeedbackTimerRef.current) {
      clearTimeout(voiceFeedbackTimerRef.current);
      voiceFeedbackTimerRef.current = null;
    }
    setVoiceFeedbackCard({ open: false, durationLabel: "" });
  }

  function openLiveVoiceSession() {
    dismissVoiceFeedbackCard();
    voiceSessionStartedAtRef.current = Date.now();
    setVoiceOpen(true);
  }

  function closeLiveVoiceSession() {
    setVoiceOpen(false);
    const durationMs = voiceSessionStartedAtRef.current
      ? Date.now() - voiceSessionStartedAtRef.current
      : 0;
    voiceSessionStartedAtRef.current = 0;
    if (voiceFeedbackTimerRef.current) {
      clearTimeout(voiceFeedbackTimerRef.current);
    }
    setVoiceFeedbackCard({
      open: true,
      durationLabel: formatVoiceSessionDuration(durationMs),
    });
    voiceFeedbackTimerRef.current = setTimeout(() => {
      setVoiceFeedbackCard({ open: false, durationLabel: "" });
      voiceFeedbackTimerRef.current = null;
    }, 6500);
  }

  function submitVoiceSessionRating(reaction) {
    dismissVoiceFeedbackCard();
    setFeedbackToast({
      open: true,
      text:
        reaction === "like"
          ? "Thanks for rating the voice chat."
          : "Thanks. We'll keep improving voice chat.",
    });
  }

  function toggleMic() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      updateActiveChatMessages(
        (m) => [
          ...m,
          { role: "assistant", text: "Microphone is not supported in this browser.", ownerUid: currentUid, createdAt: Date.now() },
        ],
        "Microphone support"
      );
      return;
    }

    if (!recognitionRef.current) {
      const recognition = new SpeechRecognition();
      recognition.lang = preferredSpeechLanguage;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onresult = (event) => {
        const transcript = event?.results?.[0]?.[0]?.transcript || "";
        if (transcript.trim()) {
          setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);
      recognitionRef.current = recognition;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    try {
      recognitionRef.current.lang = preferredSpeechLanguage;
      recognitionRef.current.start();
      setIsListening(true);
    } catch {
      setIsListening(false);
    }
  }

  async function isBackendHealthy() {
    try {
      const response = await fetch(apiUrl("/api/health"));
      return response.ok;
    } catch {
      return false;
    }
  }

  function appendAssistantPlaceholder(streamId) {
    const now = Date.now();
    updateActiveChatMessages(
      (m) => [...m, { role: "assistant", text: "", streaming: true, streamId, ownerUid: currentUid, createdAt: now }],
      "Reply"
    );
  }

  function updateStreamingAssistant(streamId, updater) {
    updateActiveChatMessages((m) => {
      const idx = m.findIndex((item) => item?.streamId === streamId);
      if (idx < 0) return m;
      const next = [...m];
      const current = next[idx];
      const nextText = updater(String(current?.text || ""));
      next[idx] = { ...current, text: nextText, streaming: true, ownerUid: currentUid };
      return next;
    }, "Reply");
  }

  function finalizeStreamingAssistant(streamId, text, meta = {}) {
      updateActiveChatMessages((m) => {
        const idx = m.findIndex((item) => item?.streamId === streamId);
        if (idx < 0) {
          return [...m, { role: "assistant", text, sources: meta.sources || [], ownerUid: currentUid, createdAt: Date.now() }];
        }
        const next = [...m];
        const current = next[idx] || {};
        next[idx] = {
          role: "assistant",
          text,
          sources: meta.sources || current.sources || [],
          ownerUid: currentUid,
          createdAt: current.createdAt || Date.now(),
        };
        return next;
      }, "Reply");
    }

  function buildAssistantRequestBody({ messageText, academicContext, simplePrompt = false, requestIntelligence = null }) {
    const intelligence = requestIntelligence || {};
    const body = {
      message: simplePrompt ? String(messageText || "").trim() : withAcademicContext(messageText, academicContext),
      normalizedMessage: String(intelligence.normalizedMessage || "").trim() || undefined,
      topic: String(intelligence.topic || "").trim() || undefined,
      followUp: Boolean(intelligence.followUp),
      followUpType: String(intelligence.followUpType || "").trim() || undefined,
      targetLanguage: String(intelligence.targetLanguage || "").trim() || undefined,
      previousAssistantMessage: String(intelligence.previousAssistantMessage || "").trim() || undefined,
      mode: resolvedChatMode,
      app_type: "institution",
      session_id: String(activeChat?.sessionId || "").trim() || undefined,
      workspaceContext,
    };

    if (!simplePrompt) {
      body.context = {
        mode: resolvedChatMode,
        workspace: workspaceContext || null,
      };
      body.preferredLanguage = String(settingsPrefs?.language || "en-KE");
      body.metadata = {
        academicContext: academicContext || EMPTY_ACADEMIC_CONTEXT,
        mode: resolvedChatMode,
        workspaceContext: workspaceContext || null,
        requestIntelligence: {
          topic: String(intelligence.topic || "").trim(),
          followUp: Boolean(intelligence.followUp),
          followUpType: String(intelligence.followUpType || "").trim(),
          targetLanguage: String(intelligence.targetLanguage || "").trim(),
        },
      };
    }

    return body;
  }

  function withAcademicContext(messageText, context) {
    const contextBlock = buildAcademicContextBlock(context);
    if (!contextBlock) return messageText;
    return `${messageText}\n\n${contextBlock}`;
  }

  async function fetchAssistantReplyFull({ token, messageText, academicContext, simplePrompt = false, timingStarted = 0, requestIntelligence = null }) {
    const requestUrl = apiUrl(AI_PATH);
    const response = await fetch(requestUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(buildAssistantRequestBody({ messageText, academicContext, simplePrompt, requestIntelligence })),
    });

    const result = await response.json().catch(() => ({}));
    if (timingStarted) {
      logInstitutionChatTiming("full_response_received", timingStarted, {
        status: response.status,
      });
    }
    if (import.meta.env.DEV) {
      console.debug("[NewChatLanding][AI_RESPONSE]", { status: response.status, ok: response.ok, mode: "fallback" });
    }
    if (!response.ok) {
      const message = result?.message || result?.error || "AI service unavailable.";
      const backendHealthy = response.status === 404 ? await isBackendHealthy() : true;
      return {
        ok: false,
        text: formatAiServiceError({ backendHealthy, status: response.status, message }),
      };
    }

      return {
        ok: true,
        text: result?.text || result?.reply || result?.data?.reply || "Response received.",
        sources: normalizeResearchSources(result),
        sessionId: String(result?.data?.session_id || result?.session_id || ""),
      };
    }

  async function streamAssistantReply({ token, messageText, streamId, academicContext, simplePrompt = false, timingStarted = 0, requestIntelligence = null }) {
    const requestUrl = `${apiUrl(AI_PATH)}?stream=1`;
    const response = await fetch(requestUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(buildAssistantRequestBody({ messageText, academicContext, simplePrompt, requestIntelligence })),
    });

    const contentType = String(response.headers.get("content-type") || "");
    if (!response.ok || !response.body || !contentType.includes("text/event-stream")) {
      return { ok: false, reason: "no_stream" };
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    let streamedText = "";
    let gotChunk = false;
    let firstChunkLogged = false;

    const processEvent = (eventBlock) => {
      const lines = eventBlock.split("\n");
      let eventType = "message";
      const dataLines = [];
      for (const line of lines) {
        if (line.startsWith("event:")) eventType = line.slice(6).trim();
        if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
      }
      const payloadRaw = dataLines.join("\n");
      if (!payloadRaw) return false;
      let payload = {};
      try {
        payload = JSON.parse(payloadRaw);
      } catch {
        payload = {};
      }

      if (eventType === "chunk") {
        const delta = String(payload?.delta || "");
        if (delta) {
          gotChunk = true;
          if (!firstChunkLogged && timingStarted) {
            firstChunkLogged = true;
            logInstitutionChatTiming("first_chunk", timingStarted, {
              simplePrompt,
            });
          }
          streamedText += delta;
          updateStreamingAssistant(streamId, (prev) => `${prev}${delta}`);
          requestAnimationFrame(() => scrollToBottom("auto"));
        }
      }
      if (eventType === "done") {
        const finalText = String(payload?.text || streamedText).trim();
        updateActiveChatSessionId(payload?.session_id);
        finalizeStreamingAssistant(streamId, finalText || streamedText || "Response received.");
        if (timingStarted) {
          logInstitutionChatTiming("stream_complete", timingStarted, {
            chars: (finalText || streamedText || "").length,
          });
        }
        return {
          completed: true,
          sessionId: String(payload?.session_id || ""),
          text: finalText || streamedText || "Response received.",
        };
      }
      return { completed: false };
    };

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let sepIndex = buffer.search(/\r?\n\r?\n/);
        while (sepIndex >= 0) {
          const delimiter = buffer.slice(sepIndex).startsWith("\r\n\r\n") ? 4 : 2;
          const rawEvent = buffer.slice(0, sepIndex);
          buffer = buffer.slice(sepIndex + delimiter);
          const completed = processEvent(rawEvent);
          if (completed?.completed) {
            return { ok: true, sessionId: completed.sessionId, text: completed.text };
          }
          sepIndex = buffer.search(/\r?\n\r?\n/);
        }
      }
    } catch {
      return { ok: false, reason: "stream_read_error", gotChunk, streamedText };
    }

    if (gotChunk) {
      finalizeStreamingAssistant(streamId, streamedText || "Response received.");
      return { ok: true };
    }
    return { ok: false, reason: "empty_stream" };
  }

  const handleImageComparisonChoice = useCallback(
    (messageId, choiceIndex, { skipped = false } = {}) => {
      if (!messageId) return;
      updateActiveChatMessages(
        (chatMessages) =>
          chatMessages.map((message) => {
            if (message.id !== messageId) return message;
            if (skipped) {
              return {
                ...message,
                comparisonSkipped: true,
                comparisonSelectedIndex: null,
                selectedImageIndex: null,
                selectedImageUrl: "",
                imageUrl: "",
                type: "text",
                text: "Skipped.",
              };
            }

            const options = Array.isArray(message.imageOptions) ? message.imageOptions : [];
            const selected = options[choiceIndex] || options.find((item) => Number(item?.index) === choiceIndex + 1);
            const selectedImageUrl = String(selected?.image || "").trim();
            if (!selectedImageUrl) return message;

            return {
              ...message,
              comparisonSelectedIndex: choiceIndex,
              selectedImageIndex: choiceIndex,
              selectedImageUrl,
              imageUrl: selectedImageUrl,
              type: "image",
              text: choiceIndex === 0 ? "Thanks — I’ll continue with image 1." : "Got it — using image 2.",
            };
          }),
        untitledChatBase
      );
    },
    [untitledChatBase, updateActiveChatMessages]
  );

  async function sendMessage(text) {
    const timingStarted = performance.now();
    const pendingAttachments = attachments;
    const clean = text.trim();
    if (!clean && pendingAttachments.length === 0) return;
    const normalizedInput = normalizeInput(clean);
    const followUpIntent = detectFollowUpIntent(normalizedInput.normalizedText || clean);
    const previousAssistantMessage = String(
      [...(Array.isArray(messages) ? messages : [])]
        .reverse()
        .find((message) => message?.role === "assistant")?.text || ""
    ).trim();
    const currentTopic = deriveActiveTopic(messages, activeChat?.activeTopic || "");
    const continuationPrompt =
      clean && !followUpIntent.followUp ? resolveContinuationPrompt(normalizedInput.normalizedText || clean, messages) : "";
    const latestAssistantText = String(
      [...(Array.isArray(messages) ? messages : [])]
        .reverse()
        .find((message) => message?.role === "assistant")?.text || ""
    ).trim();
    const awaitingImageDescription =
      pendingAttachments.length === 0 &&
      !continuationPrompt &&
      isImageClarificationQuestion(latestAssistantText);
    const requestPrompt =
      continuationPrompt || (awaitingImageDescription ? `Generate an image of ${normalizedInput.normalizedText || clean}` : normalizedInput.normalizedText || clean);
    const requestIntelligence = {
      originalMessage: clean,
      normalizedMessage: normalizedInput.changed ? normalizedInput.normalizedText : "",
      topic: currentTopic,
      followUp: followUpIntent.followUp,
      followUpType: followUpIntent.followUpType,
      targetLanguage: followUpIntent.targetLanguage,
      previousAssistantMessage,
    };
    const simplePrompt = isInstitutionSimplePrompt(requestPrompt, pendingAttachments);
    const shouldExtractLinks = isLinkExtractionPrompt(requestPrompt);
    const shouldGenerateImage =
      !shouldExtractLinks &&
      pendingAttachments.length === 0 &&
      isImageGenerationPrompt(requestPrompt);
    const imageGenerationClarification = shouldGenerateImage
      ? getVagueImageRequestClarification(requestPrompt)
      : "";
    const shouldEditLatestImage =
      !shouldExtractLinks &&
      pendingAttachments.length === 0 &&
      !shouldGenerateImage &&
      (isImageEditFollowUpPrompt(requestPrompt) ||
        Boolean(getVagueImageEditClarification(requestPrompt)));
    const imageEditClarification = shouldEditLatestImage
      ? getVagueImageEditClarification(requestPrompt)
      : "";
    const latestImageUrl = shouldEditLatestImage
      ? imageAPI.getLatestImageFromMessages(messages)
      : "";
    const imageSearchQuery = simplePrompt
      ? ""
      : getImageSearchQuery(requestPrompt, {
          hasAttachments: pendingAttachments.length > 0,
          shouldGenerateImage,
          shouldEditImage: shouldEditLatestImage,
        });

    const attachSummary =
      pendingAttachments.length > 0
        ? `\n\nAttachments:\n${pendingAttachments.map((a) => `- ${a.name}`).join("\n")}`
        : "";
    const messageText = `${clean || "Sent attachments"}${attachSummary}`;
    const exchangeId = `ex-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const assistantBaseText = requestPrompt || clean || "Sent attachments";
    const imageVisionContext = simplePrompt || shouldExtractLinks
      ? ""
      : await buildVisionAttachmentSummary(pendingAttachments, clean);
    const assistantRequestText = `${assistantBaseText}${attachSummary}${imageVisionContext}`;
    const currentContext = contextByChat[activeChat?.id || ""] || EMPTY_ACADEMIC_CONTEXT;
    const detectedContext = simplePrompt ? currentContext : detectAcademicContext(assistantRequestText, currentContext);
    const mergedContext = simplePrompt ? currentContext : mergeAcademicContext(currentContext, detectedContext, assistantRequestText);
    if (activeChat?.id && !simplePrompt) {
      setContextByChat((prev) => ({ ...prev, [activeChat.id]: mergedContext }));
    }

    updateActiveChatMessages(
      (m) => [...m, { role: "user", text: messageText, ownerUid: currentUid, createdAt: Date.now(), exchangeId, persistState: "local" }],
      clean || untitledChatBase
    );
    logInstitutionChatTiming("frontend_send_start", timingStarted, {
      textLength: clean.length,
      simplePrompt,
      hasAttachments: pendingAttachments.length > 0,
    });
    if (clean) setLastPrompt(clean);
    setInput("");
    clearMedia();
    setSelectedStarter(null);
    setStarterSuggestions([]);
    requestAnimationFrame(() => scrollToBottom("smooth"));

    if (shouldExtractLinks) {
      const firstImageAttachment = pendingAttachments.find((item) => item?.isImage && item?.file);
      try {
        let sourceText = clean;
        let sourceLabel = "your message";

        if (firstImageAttachment?.file) {
          const imageDataUrl = await readAttachmentFileAsDataUrl(firstImageAttachment.file);
          const visualResult = await analyzeVisualContext({
            imageDataUrl,
            prompt:
              "Read every visible URL/link from this image or document screenshot. Preserve the text exactly and include wrapped or broken links in plain text only.",
            family: "ai",
            app: storageScope,
          });
          sourceText = `${String(visualResult?.answer || "")}\n${clean}`.trim();
          sourceLabel = firstImageAttachment.name || "the uploaded image";
        }

        const extraction = extractLinksFromText(sourceText);
        updateActiveChatMessages(
          (messages) => [
            ...messages,
            {
              role: "assistant",
              text: formatExtractedLinksMessage({
                links: extraction.links,
                uncertain: extraction.uncertain,
                sourceLabel,
              }),
              ownerUid: currentUid,
              createdAt: Date.now(),
            },
          ],
          clean || "Extract links"
        );
      } catch (error) {
        const fallback = extractLinksFromText(clean);
        updateActiveChatMessages(
          (messages) => [
            ...messages,
            {
              role: "assistant",
              text: fallback.links.length
                ? formatExtractedLinksMessage({
                    links: fallback.links,
                    uncertain: fallback.uncertain,
                    sourceLabel: "your message",
                  })
                : String(error?.message || "I couldn't extract links from that upload right now."),
              ownerUid: currentUid,
              createdAt: Date.now(),
            },
          ],
          clean || "Extract links"
        );
      }
      return;
    }

    if (shouldGenerateImage) {
      if (imageGenerationClarification) {
        updateActiveChatMessages(
          (messages) => [
            ...messages,
            {
              role: "assistant",
              text: imageGenerationClarification,
              ownerUid: currentUid,
              createdAt: Date.now(),
            },
          ],
          clean || untitledChatBase
        );
        return;
      }
      try {
        const shouldCompareImage = shouldOfferImageComparison(requestPrompt, {
          isNewChat: messages.length <= 1,
          hasExistingDirection: Boolean(imageAPI.getLatestImageFromMessages(messages)),
          hasShownComparison: messages.some(
            (message) => Boolean(message?.comparison) || (Array.isArray(message?.imageOptions) && message.imageOptions.length >= 2)
          ),
        });
        const imageResult = await imageAPI.generateImage(requestPrompt, {
          idToken,
          compare: shouldCompareImage,
        });
        if (Array.isArray(imageResult.images) && imageResult.images.length >= 2) {
          updateActiveChatMessages(
            (messages) => [
              ...messages,
              {
                id: Date.now(),
                role: "assistant",
                text: "",
                type: "image-comparison",
                comparison: true,
                comparisonTitle: imageResult.text || "Which image do you like more?",
                comparisonSelectedIndex: null,
                selectedImageIndex: null,
                selectedImageUrl: "",
                imageUrl: "",
                imageOptions: imageResult.images.map((item, index) => ({
                  index: index + 1,
                  image: item.image,
                  model: item.model || "",
                })),
                ownerUid: currentUid,
                createdAt: Date.now(),
              },
            ],
            clean || untitledChatBase
          );
          return;
        }
        const imageUrl = imageResult.image;
        updateActiveChatMessages(
          (messages) => [
            ...messages,
            {
              role: "assistant",
              text: "Done ✅",
              imageUrl,
              type: "image",
              ownerUid: currentUid,
              createdAt: Date.now(),
            },
          ],
          clean || untitledChatBase
        );
      } catch (error) {
        updateActiveChatMessages(
          (messages) => [
            ...messages,
            {
              role: "assistant",
              text: String(error?.message || "Image generation is unavailable right now."),
              ownerUid: currentUid,
              createdAt: Date.now(),
            },
          ],
          clean || untitledChatBase
        );
      }
      return;
    }

    if (shouldEditLatestImage) {
      if (imageEditClarification && latestImageUrl) {
        updateActiveChatMessages(
          (chatMessages) => [
            ...chatMessages,
            {
              role: "assistant",
              text: imageEditClarification,
              ownerUid: currentUid,
              createdAt: Date.now(),
            },
          ],
          clean || untitledChatBase
        );
        return;
      }
      if (!latestImageUrl) {
        updateActiveChatMessages(
          (chatMessages) => [
            ...chatMessages,
            {
              role: "assistant",
              text: "Please generate or upload an image first, then tell me how you want it edited.",
              ownerUid: currentUid,
              createdAt: Date.now(),
            },
          ],
          clean || untitledChatBase
        );
        return;
      }

      try {
        const result = await imageAPI.editImage({
          imageDataUrl: latestImageUrl,
          prompt: requestPrompt,
        });
        updateActiveChatMessages(
          (chatMessages) => [
            ...chatMessages,
            {
              role: "assistant",
              text: result.text || "Updated ✅",
              imageUrl: result.image,
              type: "image",
              ownerUid: currentUid,
              createdAt: Date.now(),
            },
          ],
          "Edited image"
        );
      } catch (error) {
        updateActiveChatMessages(
          (chatMessages) => [
            ...chatMessages,
            {
              role: "assistant",
              text: String(error?.message || "Image editing is unavailable right now."),
              ownerUid: currentUid,
              createdAt: Date.now(),
            },
          ],
          "Edited image"
        );
      }
      return;
    }

    if (imageSearchQuery) {
      try {
        const results = await searchWebImages(imageSearchQuery, { limit: 8 });
        updateActiveChatMessages(
          (messages) => [
            ...messages,
              {
                role: "assistant",
                text: results.length
                  ? `Here are some web image results for "${imageSearchQuery}". You can preview, open the source, or reuse one in your workspace flow.`
                  : `I couldn't find image results for "${imageSearchQuery}" right now.`,
                imageSearchResults: results,
                imageSearchQuery,
                sources: normalizeResearchSources({ imageSearchResults: results }),
                ownerUid: currentUid,
                createdAt: Date.now(),
              },
          ],
          clean || untitledChatBase
        );
      } catch (error) {
        updateActiveChatMessages(
          (messages) => [
            ...messages,
            {
              role: "assistant",
              text: String(error?.message || "Web image search is unavailable right now."),
              ownerUid: currentUid,
              createdAt: Date.now(),
            },
          ],
          clean || untitledChatBase
        );
      }
      return;
    }

    let streamId = null;
    const shouldUseInstitutionResearchFlow = storageScope === "institution" || storageScope === "institution_admin";
    if (shouldUseInstitutionResearchFlow) {
      streamId = `stream-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      appendAssistantPlaceholder(streamId);
      updateActiveChatMessages(
        (chatMessages) =>
          chatMessages.map((message) =>
            String(message?.streamId || "") === streamId
              ? { ...message, exchangeId, persistState: "pending" }
              : message
          ),
        clean || untitledChatBase
      );
      requestAnimationFrame(() => scrollToBottom("auto"));
      logInstitutionChatTiming("placeholder_visible", timingStarted, {
        streamId,
      });
    }

    try {
      let token = await auth?.currentUser?.getIdToken().catch(() => null);
      if (!token) {
        token = await auth?.currentUser?.getIdToken(true).catch(() => null);
      }
      if (!token) {
        if (streamId) {
          finalizeStreamingAssistant(streamId, "Please sign in to use AI chat.");
        } else {
          updateActiveChatMessages(
            (m) => [...m, { role: "assistant", text: "Please sign in to use AI chat.", ownerUid: currentUid, createdAt: Date.now() }],
            clean || "Sign in"
          );
        }
        return;
      }

      if (shouldUseInstitutionResearchFlow) {
        if (import.meta.env.DEV) {
          console.debug("[NewChatLanding][AI_REQUEST]", {
            url: apiUrl(AI_PATH),
            hasText: Boolean(clean),
            attachments: pendingAttachments.length,
            mode: simplePrompt ? "institution-fast-stream" : "institution-stream",
            simplePrompt,
          });
        }
        logInstitutionChatTiming("request_dispatched", timingStarted, {
          mode: simplePrompt ? "institution-fast-stream" : "institution-stream",
          sessionId: String(activeChat?.sessionId || ""),
        });

        const streamResult = await streamAssistantReply({
          token,
          messageText: assistantRequestText,
          streamId,
          academicContext: mergedContext,
          simplePrompt,
          timingStarted,
          requestIntelligence,
        });
        if (streamResult.ok) {
          updateActiveChatSessionId(streamResult.sessionId);
          queueInstitutionExchangePersistence({
            chatId: activeChat?.id,
            exchangeId,
            userContent: messageText,
            assistantContent: String(streamResult.text || ""),
            sources: [],
            titleHint: clean || untitledChatBase,
            timingStarted,
          });
          return;
        }

          const fallback = await fetchAssistantReplyFull({
            token,
            messageText: assistantRequestText,
            academicContext: mergedContext,
            simplePrompt,
            timingStarted,
            requestIntelligence,
          });
        updateActiveChatSessionId(fallback.sessionId);
        finalizeStreamingAssistant(streamId, fallback.text, { sources: fallback.sources || [] });
        queueInstitutionExchangePersistence({
          chatId: activeChat?.id,
          exchangeId,
          userContent: messageText,
          assistantContent: String(fallback?.text || ""),
          sources: Array.isArray(fallback?.sources) ? fallback.sources : [],
          titleHint: clean || untitledChatBase,
          timingStarted,
        });
        return;
      }

      streamId = `stream-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      appendAssistantPlaceholder(streamId);
      requestAnimationFrame(() => scrollToBottom("auto"));

      if (import.meta.env.DEV) {
        console.debug("[NewChatLanding][AI_REQUEST]", {
          url: apiUrl(AI_PATH),
          hasText: Boolean(clean),
          attachments: pendingAttachments.length,
          mode: "stream-first",
        });
      }

      const streamResult = await streamAssistantReply({
        token,
        messageText: assistantRequestText,
        streamId,
        academicContext: mergedContext,
        simplePrompt,
        timingStarted,
        requestIntelligence,
      });
      if (streamResult.ok) {
        updateActiveChatSessionId(streamResult.sessionId);
        return;
      }

      const fallback = await fetchAssistantReplyFull({
        token,
        messageText: assistantRequestText,
        academicContext: mergedContext,
        simplePrompt,
        timingStarted,
        requestIntelligence,
      });
      updateActiveChatSessionId(fallback.sessionId);
      finalizeStreamingAssistant(streamId, fallback.text, { sources: fallback.sources || [] });
    } catch {
      const backendHealthy = await isBackendHealthy();
      const errorText = formatAiServiceError({ backendHealthy });
      if (streamId) {
        finalizeStreamingAssistant(streamId, errorText);
      } else {
        updateActiveChatMessages(
          (m) => [...m, { role: "assistant", text: errorText, ownerUid: currentUid, createdAt: Date.now() }],
          clean || "Request failed"
        );
      }
    }
  }

  async function requestLiveVoiceReply(spokenText, liveContext = null) {
    const clean = String(spokenText || "").trim();
    if (!clean) return "";
    const requestPrompt = resolveContinuationPrompt(clean, messages);

    const currentContext = contextByChat[activeChat?.id || ""] || EMPTY_ACADEMIC_CONTEXT;
    const detectedContext = detectAcademicContext(requestPrompt, currentContext);
    const mergedContext = mergeAcademicContext(currentContext, detectedContext, requestPrompt);
    if (activeChat?.id) {
      setContextByChat((prev) => ({ ...prev, [activeChat.id]: mergedContext }));
    }

    const shouldUseInstitutionResearchFlow =
      storageScope === "institution" || storageScope === "institution_admin";

    if (!shouldUseInstitutionResearchFlow) {
      updateActiveChatMessages(
        (messages) => [
          ...messages,
          { role: "user", text: clean, ownerUid: currentUid, createdAt: Date.now() },
        ],
        clean || untitledChatBase
      );
    }
    if (clean) setLastPrompt(clean);
    requestAnimationFrame(() => scrollToBottom("smooth"));

    try {
      const fullReply = await askInstitutionLiveChat({
        text: requestPrompt,
        context: {
          ...liveContext,
          academicContext: mergedContext,
          storageScope,
          activeChatId: activeChat?.id || "",
        },
      });
      const assistantText = String(fullReply?.text || "Response received.").trim() || "Response received.";
      const assistantSources = Array.isArray(fullReply?.sources) ? fullReply.sources : [];

      if (shouldUseInstitutionResearchFlow) {
        await persistInstitutionExchange({
          userContent: clean,
          assistantContent: assistantText,
          sources: assistantSources,
          titleHint: clean || untitledChatBase,
        });
      } else {
        updateActiveChatMessages(
          (messages) => [
            ...messages,
            {
              role: "assistant",
              text: assistantText,
              sources: assistantSources,
              ownerUid: currentUid,
              createdAt: Date.now(),
            },
          ],
          clean || untitledChatBase
        );
      }

      requestAnimationFrame(() => scrollToBottom("smooth"));
      return assistantText;
    } catch {
      const backendHealthy = await isBackendHealthy();
      const errorText = formatAiServiceError({ backendHealthy });
      updateActiveChatMessages(
        (messages) => [
          ...messages,
          { role: "assistant", text: errorText, ownerUid: currentUid, createdAt: Date.now() },
        ],
        clean || "Request failed"
      );
      return errorText;
    }
  }

  function stripMarkdown(raw) {
    const value = String(raw || "");
    return value
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/[*_~>#-]{1,3}/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function speakText(rawText) {
    if (!rawText) return;
    const cleaned = stripMarkdown(rawText);
    if (!cleaned) return;
    const clipped = cleaned.length > 1800 ? `${cleaned.slice(0, 1800)}…` : cleaned;
    const now = Date.now();
    audioPlayer.playText(clipped);
    lastSpokenRef.current = { text: clipped, at: now };
  }

  function speakAssistantText(text) {
    speakText(text);
  }

  async function copyPromptText(index, text) {
    const value = String(text || "");
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const temp = document.createElement("textarea");
        temp.value = value;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand("copy");
        document.body.removeChild(temp);
      }
      setCopiedMessageIndex(index);
      setTimeout(() => setCopiedMessageIndex(null), 1200);
    } catch {
      setCopiedMessageIndex(null);
    }
  }

  function editPromptText(text) {
    const value = String(text || "");
    setInput(value);
    setTimeout(() => focusPromptInput(), 0);
  }

  function handleNavClick(itemKey) {
    setIsMorePopupOpen(false);
    setIsMobileMoreOpen(false);
    setIsNewChatMenuOpen(false);
    setIsProfileMenuOpen(false);
    setIsNotificationsMenuOpen(false);
    setIsMobileDrawerOpen(false);
    setIsAttachOpen(false);
    setIsToolsPanelOpen(false);

    if (itemKey === "admin") {
      if (!canShowAdmin) return;
      syncActiveView("admin", "push");
      return;
    }
    syncActiveView(itemKey, "push");
  }

  useEffect(() => {
    const onWindowKeyDown = (event) => {
      const target = event.target;
      const isTypingTarget =
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        globalSearchInputRef.current?.focus();
        globalSearchInputRef.current?.select();
        return;
      }

      if (event.key === "/" && !event.ctrlKey && !event.metaKey && !event.altKey) {
        if (isTypingTarget) return;
        event.preventDefault();
        globalSearchInputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", onWindowKeyDown);
    return () => window.removeEventListener("keydown", onWindowKeyDown);
  }, []);

  useEffect(() => {
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    if (isMobile) return;
    if (active !== "newchat") {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      return;
    }
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [active]);

  useEffect(() => {
    if (active !== SETTINGS_ITEM.key) {
      setIsDesktopSettingsLauncherOpen(false);
    }
  }, [active]);

  if (active === "settings") {
    if (useDesktopSettingsWorkspace && isDesktopSettingsViewport()) {
      return (
        <DesktopSettingsWorkspace
          user={desktopSettingsUser}
          activeSection={selectedDesktopSettingsSection}
          onSelectSection={setSelectedDesktopSettingsSection}
          onClose={() => {
            setUseDesktopSettingsWorkspace(false);
            syncActiveView(desktopSettingsReturnView || "newchat", "push");
          }}
          generalProps={{ user: desktopSettingsUser }}
          personalizationProps={{
            historyItems: desktopPersonalizationHistoryItems,
          }}
          securityProps={{
            capabilities: {
              ...desktopSecurityCapabilities,
              provider: desktopSecurityCapabilities?.federatedProvider,
              hasPasskey: desktopSecurityCapabilities?.passkey,
              passkeyRegistered: desktopSecurityCapabilities?.passkey,
            },
            onAddPasskey: handleDesktopSecurityAddPasskey,
            onRemovePasskey: handleDesktopSecurityRemovePasskey,
            onChangePassword: handleDesktopSecurityChangePassword,
            onLogoutCurrentDevice: handleDesktopSecurityLogoutCurrentDevice,
            onLogoutAllDevices: handleDesktopSecurityLogoutAllDevices,
          }}
          accountProps={{
            user: desktopSettingsUser,
            currentPlan: "Education",
            onChangeEmail: handleDesktopAccountChangeEmail,
            onManageSubscription: handleDesktopAccountManageSubscription,
            onManagePayment: handleDesktopAccountManagePayment,
            onDeleteAccount: handleDesktopAccountDelete,
          }}
          dataControlsProps={{
            sharedLinksItems: desktopSharedLinksItems,
            onDeleteSharedLink: handleDesktopSharedLinkDelete,
            sharedLinksMode: desktopSharedLinksLoaded
              ? "live"
              : desktopSharedLinksFallbackItems.length
                ? "partial"
                : "preview",
            archivedChatsItems: desktopArchivedChatsItems,
            archivedChatsMode: desktopArchivedChatsLoaded
              ? "live"
              : desktopArchivedChatsFallbackItems.length
                ? "partial"
                : "preview",
            onOpenArchivedChat: handleDesktopArchivedChatOpen,
            onRestoreArchivedChat: handleDesktopArchivedChatRestore,
            onExportData: handleDataControlsExport,
            onArchiveAllChats: handleDataControlsArchiveAllChats,
            onDeleteAllChats: handleDataControlsDeleteAllChats,
          }}
        />
      );
    }
    if (!isDesktopSettingsViewport()) {
      return (
        <InstitutionMobileSettingsLanding
          user={{
            ...user,
            uid: firebaseUser?.uid || null,
            email: firebaseUser?.email || user?.email || "",
            displayName: firebaseUser?.displayName || user?.name || "",
            providerData: firebaseUser?.providerData || [],
          }}
          onBack={() => syncActiveView("newchat", "push")}
          canShowAdmin={isAdminRole}
          onOpenAdmin={openAdminPanel}
          onLogout={handleLogout}
          sharedLinksItems={desktopSharedLinksItems}
          onDeleteSharedLink={handleDesktopSharedLinkDelete}
          sharedLinksMode={
            desktopSharedLinksLoaded
              ? "live"
              : desktopSharedLinksFallbackItems.length
                ? "partial"
                : "preview"
          }
          archivedChatsItems={desktopArchivedChatsItems}
          archivedChatsMode={
            desktopArchivedChatsLoaded
              ? "live"
              : desktopArchivedChatsFallbackItems.length
                ? "partial"
                : "preview"
          }
          onOpenArchivedChat={handleDesktopArchivedChatOpen}
          onRestoreArchivedChat={handleDesktopArchivedChatRestore}
          onExportData={handleDataControlsExport}
          onArchiveAllChats={handleDataControlsArchiveAllChats}
          onDeleteAllChats={handleDataControlsDeleteAllChats}
        />
      );
    }
    return (
      <SettingsPage
        user={{
          ...user,
          uid: firebaseUser?.uid || null,
          email: firebaseUser?.email || user?.email || "",
          displayName: firebaseUser?.displayName || user?.name || "",
          providerData: firebaseUser?.providerData || [],
        }}
        onBack={() => syncActiveView("newchat", "push")}
        canShowAdmin={isAdminRole}
        onOpenAdmin={openAdminPanel}
        launcherSectionId={selectedDesktopSettingsSection}
      />
    );
  }

  if (active === "profile") {
    const name = firebaseUser?.displayName || "Student";
    const email = firebaseUser?.email || "—";
    const photo = firebaseUser?.photoURL || null;
    const uid = firebaseUser?.uid || "—";
    const role = userRole || "unknown";
    return (
      <div className="min-h-[100dvh] bg-slate-50 text-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-lg font-semibold text-slate-900">Profile</div>
          <div className="mt-4 flex items-center gap-3">
            <div className="h-14 w-14 rounded-full overflow-hidden bg-slate-900 text-white flex items-center justify-center text-sm font-semibold">
              {photo ? <img src={photo} alt="Profile avatar" className="h-full w-full object-cover" /> : initialsOf(name)}
            </div>
            <div className="min-w-0">
              <div className="text-base font-semibold text-slate-900 truncate">{name}</div>
              <div className="text-sm text-slate-600 truncate">{email}</div>
            </div>
          </div>

          <div className="mt-4 space-y-2 text-sm text-slate-700">
            <div className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
              <span className="text-slate-500">UID</span>
              <span className="ml-3 truncate max-w-[60%]">{uid}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
              <span className="text-slate-500">Role</span>
              <span className="ml-3 truncate max-w-[60%]">{role}</span>
            </div>
          </div>
          <button
            onClick={() => syncActiveView("newchat", "push")}
            className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Back to chat
          </button>
        </div>
      </div>
    );
  }

  if (active === "notebook") {
    return (
      <NotebookPage
        onBack={() => syncActiveView("newchat", "push")}
        onOpenMainMenu={() => setIsMobileDrawerOpen(true)}
        onOpenLive={openLiveVoiceSession}
        enableDesktopLanding
      />
    );
  }

  if (active === "subgroups") {
    return <SubgroupRoom onBack={() => syncActiveView("newchat", "push")} />;
  }

  if (active === "calendar") {
    return <InstitutionCalendarPage onBack={() => syncActiveView("newchat", "push")} onOpenMainMenu={() => setIsMobileDrawerOpen(true)} />;
  }

  if (active === "fees") {
    return <InstitutionFeesPage onBack={() => syncActiveView("newchat", "push")} onOpenMainMenu={() => setIsMobileDrawerOpen(true)} />;
  }

  if (active === "courses") {
    return <CoursesDashboard onBack={() => syncActiveView("newchat", "push")} onOpenMainMenu={() => setIsMobileDrawerOpen(true)} />;
  }

  if (active === "assignments") {
    return <AssignmentsPage onOpenMainMenu={() => setIsMobileDrawerOpen(true)} />;
  }

  if (active === "results") {
    return <ResultsPage onOpenMainMenu={() => setIsMobileDrawerOpen(true)} />;
  }

  if (active === "attendance") {
    return (
      <StudentAttendancePage
        user={user}
        profile={settingsProfile}
        onBack={() => syncActiveView("newchat", "push")}
        onOpenMainMenu={() => setIsMobileDrawerOpen(true)}
      />
    );
  }

  if (active === "admin") {
    return (
      <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
        <AdminAnalyticsLanding />
      </Suspense>
    );
  }

  return (
    <div
      className={[
        isAdminShellEmbed
          ? "h-full min-h-0 bg-transparent dark:bg-transparent flex flex-col overflow-hidden"
          : "min-h-[100dvh] h-[100dvh] bg-white dark:bg-[#020617] flex flex-col overflow-hidden md:h-[100dvh] md:overflow-hidden",
      ].join(" ")}
    >
      {!isAdminShellEmbed ? (
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 pointer-events-none">
        <div className="relative flex items-center justify-between px-3.5 py-3.5 pointer-events-auto">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              className="relative h-10 w-10 rounded-[18px] border border-slate-200/70 bg-white/70 shadow-[0_10px_24px_rgba(14,30,63,0.08)] backdrop-blur-xl grid place-items-center text-slate-700 dark:border-white/[0.1] dark:bg-slate-900/78 dark:text-slate-100"
              onClick={() => setIsMobileDrawerOpen(true)}
              title="Menu"
            >
              <Menu size={16} />
            </button>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="relative px-3.5 py-1.5 rounded-full border border-slate-200/70 bg-white/56 shadow-[0_8px_18px_rgba(14,30,63,0.05)] backdrop-blur-xl text-[14px] font-semibold text-[#16335f] dark:border-white/[0.1] dark:bg-slate-900/66 dark:text-white">
                ElimuLink
              </span>
              <span className="relative px-3.5 py-1.5 rounded-full border border-cyan-100/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.62),rgba(236,249,255,0.5))] shadow-[0_8px_18px_rgba(14,30,63,0.05)] backdrop-blur-xl text-[14px] font-semibold text-[#1171c8] dark:border-white/[0.1] dark:bg-slate-900/66 dark:text-white">
                University
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <button
                ref={notifBtnRef}
                onClick={openMobileNotifications}
                className="relative h-10 w-10 rounded-[18px] border border-slate-200/70 bg-white/70 shadow-[0_10px_24px_rgba(14,30,63,0.08)] backdrop-blur-xl grid place-items-center text-slate-700 dark:border-white/[0.1] dark:bg-slate-900/78 dark:text-slate-100"
                title="Notifications"
              >
                <Bell size={18} />
                {unreadNotifications > 0 ? (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-[linear-gradient(180deg,#1c8bf2,#0ea5b7)] text-white text-[10px] font-semibold leading-[18px] px-1 shadow-[0_6px_12px_rgba(14,165,233,0.28)]">
                    {unreadNotifications > 9 ? "9+" : unreadNotifications}
                  </span>
                ) : null}
              </button>
            </div>

            <div ref={profileMenuRef} className="relative">
              <button
                onClick={() => setIsProfileSheetOpen(true)}
                className="relative h-10 min-w-[2.5rem] px-2 rounded-full border border-slate-200/70 bg-white/70 shadow-[0_10px_24px_rgba(14,30,63,0.08)] backdrop-blur-xl overflow-hidden grid place-items-center text-slate-700 dark:border-white/[0.1] dark:bg-slate-900/78 dark:text-slate-100"
                title="Profile"
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs font-semibold">{profileInitials}</span>
                )}
              </button>

            </div>
          </div>
        </div>
        {import.meta.env.DEV ? (
          <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500 md:hidden px-3">
            <span className="rounded-full border border-slate-200 bg-white/80 px-2 py-0.5 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200">role: {String(userRole || "unknown")}</span>
            <span className="rounded-full border border-slate-200 bg-white/80 px-2 py-0.5 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200">view: {String(active || "unknown")}</span>
          </div>
        ) : null}
      </div>
      ) : null}

      {isNotifOpen && notifAnchor ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-transparent md:hidden"
            aria-label="Close notifications"
            onClick={() => setIsNotifOpen(false)}
          />
          <div
            className="fixed z-50 rounded-2xl border border-slate-200 bg-white p-2 space-y-2 shadow-xl md:hidden dark:border-slate-700 dark:bg-slate-900"
            style={{ top: notifAnchor.top, left: notifAnchor.left, width: notifAnchor.width }}
          >
            <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 flex items-center justify-between dark:bg-slate-800 dark:border-slate-700">
              <div>
                <div className="text-[11px] font-semibold tracking-wider text-slate-500 dark:text-slate-300">NOTIFICATIONS</div>
                <div className="text-xs text-slate-600 dark:text-slate-200">
                  {settingsPrefs.muteNotifications ? "Muted from Settings" : "Recent updates"}
                </div>
              </div>
              {!settingsPrefs.muteNotifications ? (
                <button
                  onClick={markAllNotificationsRead}
                  className="text-xs font-semibold text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white"
                >
                  Mark all read
                </button>
              ) : null}
            </div>

            <div className="max-h-64 overflow-auto smart-scrollbar space-y-2">
              {settingsPrefs.muteNotifications ? (
                <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-sm text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100">
                  Notifications are muted.
                  <button onClick={openSettingsPanel} className="ml-2 text-slate-900 font-semibold underline dark:text-white">
                    Open Settings
                  </button>
                </div>
              ) : (
                normalizedNotifications.map((item) => (
                  <div key={item.id} className="rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">{item.title}</div>
                    <div className="text-xs text-slate-600 mt-1 dark:text-slate-300">{item.body}</div>
                    {item.createdAt ? (
                      <div className="text-[11px] text-slate-400 mt-1 dark:text-slate-500">{formatTimeAgo(item.createdAt)}</div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      ) : null}

      {isProfileSheetOpen ? (
        <>
          <button
            type="button"
            aria-label="Close profile sheet"
            className="fixed inset-0 z-[60] bg-black/30 md:hidden"
            onClick={() => setIsProfileSheetOpen(false)}
          />
          <div
            className="fixed bottom-0 left-0 right-0 z-[70] rounded-t-3xl bg-white shadow-2xl md:hidden dark:bg-slate-900"
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          >
            <div className="p-3">
              <div className="mb-3 flex items-center justify-between">
                <div className="mx-auto h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-600" />
                <button
                  type="button"
                  onClick={() => setIsProfileSheetOpen(false)}
                  className="absolute right-3 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Done
                </button>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-full overflow-hidden bg-slate-900 text-white flex items-center justify-center text-xs font-semibold">
                    {auth.currentUser?.photoURL ? (
                      <img src={auth.currentUser.photoURL} alt="Profile avatar" className="h-full w-full object-cover" />
                    ) : (
                      profileInitials || "S"
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate dark:text-white">
                      {auth.currentUser?.displayName || "Student"}
                    </div>
                    <div className="text-xs text-slate-600 truncate dark:text-slate-300">{auth.currentUser?.email || ""}</div>
                  </div>
                </div>
              </div>

              <div className="mt-3 space-y-1">
                <button
                  onClick={() => {
                    setIsProfileSheetOpen(false);
                    syncActiveView("profile", "push");
                  }}
                  className="w-full text-left px-3 py-3 rounded-xl text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2"
                >
                  <IdCard size={16} />
                  Profile & Account
                </button>
                <button
                  onClick={() => {
                    setIsProfileSheetOpen(false);
                    syncActiveView("settings", "push");
                  }}
                  className="w-full text-left px-3 py-3 rounded-xl text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2"
                >
                  <Settings size={16} />
                  Settings
                </button>
                {canShowAdmin ? (
                  <button
                    onClick={() => {
                      setIsProfileSheetOpen(false);
                      openAdminPanel();
                    }}
                    className="w-full text-left px-3 py-3 rounded-xl text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2 dark:text-slate-100 dark:hover:bg-slate-800"
                  >
                    <Shield size={16} />
                    Admin
                  </button>
                ) : null}
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-3 rounded-xl text-sm text-red-700 hover:bg-red-50 flex items-center gap-2 dark:text-red-300 dark:hover:bg-red-950/40"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {!isAdminShellEmbed ? (
      <div className="pointer-events-none fixed inset-x-0 top-0 z-20 hidden w-full px-4 pt-2 md:block md:px-5">
          <div className="flex h-12 items-center gap-2 px-2.5 md:px-3">
          <button
            className="pointer-events-auto h-9 w-9 rounded-lg border border-slate-200/80 bg-white/80 shadow-sm backdrop-blur-xl hover:bg-white/90 md:hidden"
            onClick={() => setIsMobileDrawerOpen(true)}
            title="Open menu"
          >
            <Menu size={16} className="mx-auto text-slate-700" />
          </button>

          <div
            className={[
              "hidden md:flex flex-1 min-w-0 items-center justify-end pr-3 xl:pr-4 transition-[padding] duration-300 ease-out",
              isSidebarOpen ? "pl-[288px]" : "pl-[90px]",
            ].join(" ")}
          >
            <div className="relative w-full max-w-[640px]">
              <Search size={18} className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
              <input
                ref={globalSearchInputRef}
                value={globalSearch}
                onChange={(event) => setGlobalSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    runGlobalSearch();
                  }
                }}
                placeholder="Search Ctrl K"
                className="pointer-events-auto h-9 w-full rounded-full border border-slate-900/15 bg-white/70 pl-10 pr-4 text-sm text-slate-900 shadow-[0_10px_26px_rgba(15,23,42,0.08)] backdrop-blur-xl outline-none placeholder:text-slate-500 focus:border-slate-900/25 focus:ring-2 focus:ring-slate-200 dark:border-white/10 dark:bg-slate-900/55 dark:text-slate-50 dark:placeholder:text-slate-400 dark:focus:ring-slate-700/40"
              />
            </div>
          </div>

          <div className="pointer-events-auto mr-1 hidden items-center gap-1 rounded-full border border-slate-900/15 bg-white/65 px-1.5 py-1 shadow-[0_10px_26px_rgba(15,23,42,0.08)] backdrop-blur-xl xl:flex dark:border-white/10 dark:bg-slate-900/50">
            <button
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-900/15 text-slate-600 hover:bg-white/70 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"
              title="New Chat"
              onClick={startNewChat}
            >
              <Check size={16} />
            </button>
            <button
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-900/15 text-slate-600 hover:bg-white/70 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"
              title="Notebook"
              onClick={() => handleNavClick("notebook")}
            >
              <NotebookPen size={16} />
            </button>
            <button
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-900/15 text-slate-500 hover:bg-white/70 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"
              title="Courses"
              onClick={() => handleNavClick("courses")}
            >
              <BookOpen size={16} />
            </button>
            <button
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-900/15 text-slate-500 hover:bg-white/70 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"
              title="Results"
              onClick={() => handleNavClick("results")}
            >
              <BarChart3 size={16} />
            </button>
          </div>

          <div ref={notificationsMenuRef} className="pointer-events-auto relative">
            <button
              onClick={toggleNotificationsMenu}
              className="relative h-9 w-9 rounded-full border border-slate-900/15 bg-white/75 text-slate-700 shadow-[0_10px_26px_rgba(15,23,42,0.08)] backdrop-blur-xl hover:bg-white/90 dark:border-white/10 dark:bg-slate-900/55 dark:text-slate-100 dark:hover:bg-slate-800/80"
              title="Notifications"
            >
              <Bell size={16} className="mx-auto" />
              {unreadNotifications > 0 ? (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-sky-500 text-white text-[10px] font-semibold leading-[18px] px-1">
                  {unreadNotifications > 9 ? "9+" : unreadNotifications}
                </span>
              ) : null}
            </button>

            {isNotificationsMenuOpen ? (
              <div className="absolute right-0 top-12 w-80 rounded-xl border border-slate-200 bg-white p-2 space-y-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 flex items-center justify-between dark:bg-slate-800 dark:border-slate-700">
                  <div>
                    <div className="text-[11px] font-semibold tracking-wider text-slate-500 dark:text-slate-300">NOTIFICATIONS</div>
                    <div className="text-xs text-slate-600 dark:text-slate-200">
                      {settingsPrefs.muteNotifications ? "Muted from Settings" : "Recent updates"}
                    </div>
                  </div>
                  {!settingsPrefs.muteNotifications ? (
                    <button
                      onClick={() => setNotifications((prev) => prev.map((item) => ({ ...item, read: true })))}
                      className="text-xs font-semibold text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white"
                    >
                      Mark all read
                    </button>
                  ) : null}
                </div>

                <div className="max-h-64 overflow-auto smart-scrollbar space-y-1">
                  {settingsPrefs.muteNotifications ? (
                    <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-sm text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100">
                      Notifications are muted.
                      <button
                        onClick={openSettingsPanel}
                        className="ml-2 text-slate-900 font-semibold underline dark:text-white"
                      >
                        Open Settings
                      </button>
                    </div>
                  ) : (
                    notifications.map((item) => (
                      <div
                        key={item.id}
                        className={[
                          "rounded-lg px-3 py-2 border",
                          item.read
                            ? "bg-slate-50 border-slate-200 text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                            : "bg-indigo-600 text-white border-indigo-500",
                        ].join(" ")}
                      >
                        <div className="text-sm font-semibold">{item.title}</div>
                        <div
                          className={
                            item.read ? "text-xs text-slate-600 dark:text-slate-300" : "text-xs text-indigo-100"
                          }
                        >
                          {item.detail}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <div ref={profileMenuRef} className="pointer-events-auto relative">
            <button
              onClick={toggleProfileMenu}
              className="inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-slate-900/15 bg-white/75 text-slate-700 shadow-[0_10px_26px_rgba(15,23,42,0.08)] backdrop-blur-xl hover:bg-white/90 dark:border-white/10 dark:bg-slate-900/55 dark:text-slate-100 dark:hover:bg-slate-800/80"
              title={`${user.name} profile`}
            >
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="Profile avatar" className="h-full w-full object-cover" />
              ) : profileInitials ? (
                <span className="text-xs font-semibold">{profileInitials}</span>
              ) : (
                <UserCircle2 size={20} />
              )}
            </button>

            {isProfileMenuOpen ? (
              <>
                <div className="fixed inset-0 z-[70] md:hidden">
                  <button
                    type="button"
                    aria-label="Close profile menu"
                    className="absolute inset-0 bg-black/45"
                    onClick={() => setIsProfileMenuOpen(false)}
                  />
                  <div
                    className="absolute inset-x-0 bottom-0 rounded-t-3xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
                    style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div className="mx-auto h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-600" />
                      <button
                        type="button"
                        onClick={() => setIsProfileMenuOpen(false)}
                        className="absolute right-3 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                      >
                        Done
                      </button>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-700 dark:bg-slate-800">
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-full overflow-hidden bg-slate-900 text-white flex items-center justify-center text-xs font-semibold">
                          {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt="Profile avatar" className="h-full w-full object-cover" />
                          ) : (
                            profileInitials
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900 truncate dark:text-white">{user.name}</div>
                          <div className="text-xs text-slate-600 truncate dark:text-slate-300">{user.email}</div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 space-y-1">
                      <button
                        onClick={() => openSettingsPanel()}
                        className="w-full text-left px-3 py-3 rounded-xl text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                      >
                        <IdCard size={16} />
                        Profile & Account
                      </button>
                      <button
                        onClick={() => openSettingsPanel({ anchorEl: desktopSettingsTriggerRef.current })}
                        className="w-full text-left px-3 py-3 rounded-xl text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                      >
                        <Settings size={16} />
                        Settings
                      </button>
                      {canShowAdmin ? (
                        <button
                          onClick={openAdminPanel}
                          className="w-full text-left px-3 py-3 rounded-xl text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                        >
                          <Shield size={16} />
                          Admin
                        </button>
                      ) : null}
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-3 py-3 rounded-xl text-sm text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40 flex items-center gap-2"
                      >
                        <LogOut size={16} />
                        Logout
                      </button>
                    </div>
                  </div>
                </div>

                <div className="absolute right-0 top-12 hidden w-80 rounded-xl border border-slate-200 bg-white p-2 space-y-2 shadow-xl dark:border-slate-700 dark:bg-slate-900 md:block">
                  <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 dark:bg-slate-800 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full overflow-hidden bg-slate-900 text-white flex items-center justify-center text-xs font-semibold">
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt="Profile avatar" className="h-full w-full object-cover" />
                        ) : (
                          profileInitials
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 truncate dark:text-white">{user.name}</div>
                        <div className="text-xs text-slate-600 truncate dark:text-slate-300">{user.email}</div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => openSettingsPanel()}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                  >
                    <IdCard size={15} />
                    Profile & Account
                  </button>
                  <button
                    onClick={() => openSettingsPanel({ anchorEl: desktopSettingsTriggerRef.current })}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                  >
                    <Settings size={15} />
                    Settings
                  </button>
                  {canShowAdmin ? (
                    <button
                      onClick={openAdminPanel}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                    >
                      <Shield size={15} />
                      Admin
                    </button>
                  ) : null}
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40 flex items-center gap-2"
                  >
                    <LogOut size={15} />
                    Logout
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
      ) : null}

      {!isAdminShellEmbed && isMobileDrawerOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-slate-950/28 backdrop-blur-[2px]" onClick={() => setIsMobileDrawerOpen(false)} />
          <div className="absolute left-0 top-0 flex h-full w-72 flex-col overflow-hidden bg-white shadow-[0_20px_48px_rgba(15,23,42,0.22)] dark:bg-slate-950">
            <div className="px-4 py-4 flex items-center justify-between border-b border-slate-200/60 dark:border-white/[0.04]">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-xl bg-gradient-to-br from-sky-400 via-indigo-500 to-fuchsia-500 shadow-[0_0_20px_rgba(99,102,241,0.35)]" />
                <div className="font-semibold text-slate-800">Home</div>
              </div>
              <button
                className="h-9 w-9 rounded-2xl bg-slate-100/70 text-slate-700 transition hover:bg-slate-100 dark:bg-white/[0.05] dark:text-slate-100 dark:hover:bg-white/[0.08]"
                onClick={() => setIsMobileDrawerOpen(false)}
              >
                <X size={16} className="mx-auto" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto overscroll-contain p-2 pb-6 space-y-3">
              <div className="space-y-1">
                <div className="px-3 pt-1 text-[11px] font-semibold tracking-wider text-slate-500 dark:text-slate-400">MAIN</div>
                <div className="space-y-1 relative" ref={newChatMenuRef}>
                  <div className="flex items-center gap-1">
                    <div className="flex-1">
                        <SidebarButton
                          label="NewChat"
                          icon={LayoutGrid}
                          active={active === "newchat"}
                          collapsed={false}
                          onClick={() => {
                            setIsMobileDrawerOpen(false);
                            startNewChat();
                          }}
                        />
                    </div>
                    <button
                      onClick={() => setIsNewChatMenuOpen((v) => !v)}
                      className="h-9 w-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 inline-flex items-center justify-center"
                      title="Chat actions"
                    >
                      <Ellipsis size={16} />
                    </button>
                  </div>

                  {isNewChatMenuOpen ? (
                    <div className="absolute left-0 top-full mt-1 w-48 rounded-xl border border-blue-200/60 bg-blue-500/20 backdrop-blur-sm p-1 space-y-1 z-30">
                      <div className="px-2 py-1 text-[11px] font-semibold tracking-wider text-slate-500 dark:text-slate-400">CHAT HISTORY</div>
                      <div className="max-h-44 overflow-auto smart-scrollbar space-y-1">
                        {chats.map((chat) => (
                          <div
                            key={chat.id}
                            className={[
                              "flex items-center gap-2 px-2 py-1 rounded-lg",
                              activeChatId === chat.id
                                ? "bg-indigo-600 text-white shadow-sm"
                                : "hover:bg-blue-500/20",
                            ].join(" ")}
                          >
                            <button
                              onClick={() => {
                                syncActiveView("newchat", "push");
                                setActiveChatId(chat.id);
                                setIsMobileDrawerOpen(false);
                                setIsNewChatMenuOpen(false);
                              }}
                              className="flex-1 text-left min-w-0"
                              title={chat.title}
                            >
                              <div
                                className={[
                                  "text-sm truncate",
                                  activeChatId === chat.id ? "text-white font-semibold" : "text-slate-700 font-medium",
                                ].join(" ")}
                              >
                                {chat.title || untitledChatBase}
                              </div>
                              <div
                                className={[
                                  "text-[11px]",
                                  activeChatId === chat.id ? "text-indigo-100" : "text-slate-500",
                                ].join(" ")}
                              >
                                {formatChatStamp(chat.updatedAt)}
                              </div>
                            </button>
                            <button
                              onClick={() => renameChatById(chat.id)}
                              className={[
                                "h-7 w-7 inline-flex items-center justify-center rounded-md border",
                                activeChatId === chat.id
                                  ? "border-white/35 text-white hover:bg-white/15"
                                  : "border-slate-200 text-slate-600 hover:bg-slate-100",
                              ].join(" ")}
                              title="Rename chat"
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              onClick={() => deleteChatById(chat.id)}
                              className={[
                                "h-7 w-7 inline-flex items-center justify-center rounded-md border",
                                activeChatId === chat.id
                                  ? "border-white/35 text-white hover:bg-white/15"
                                  : "border-slate-200 text-slate-600 hover:bg-slate-100",
                              ].join(" ")}
                              title="Delete chat"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                {MAIN_ITEMS.filter((item) => item.key !== "newchat").map((item) => (
                  <SidebarButton
                    key={item.key}
                    label={item.label}
                    icon={item.icon}
                    active={active === item.key}
                    collapsed={false}
                    onClick={() => {
                      setIsMobileDrawerOpen(false);
                      handleNavClick(item.key);
                    }}
                  />
                ))}
              </div>

              <div className="space-y-1">
                <div className="px-3 pt-1 text-[11px] font-semibold tracking-wider text-slate-500 dark:text-slate-400">COLLABORATION</div>
                {COLLABORATION_ITEMS.map((item) => (
                  <SidebarButton
                    key={item.key}
                    label={item.label}
                    icon={item.icon}
                    active={active === item.key}
                    collapsed={false}
                    onClick={() => {
                      setIsMobileDrawerOpen(false);
                      handleNavClick(item.key);
                    }}
                  />
                ))}
              </div>

              <div className="space-y-1">
                <div className="px-3 pt-1 text-[11px] font-semibold tracking-wider text-slate-500 dark:text-slate-400">SYSTEM</div>

                <SidebarButton
                  label={SETTINGS_ITEM.label}
                  icon={SETTINGS_ITEM.icon}
                  active={active === SETTINGS_ITEM.key}
                  collapsed={false}
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    handleNavClick(SETTINGS_ITEM.key);
                  }}
                />

                <button
                  onClick={() => setIsMobileMoreOpen((v) => !v)}
                  className={[
                    "w-full text-left px-3 py-2 rounded-xl text-sm flex items-center gap-2 transition",
                    moreKeys.includes(active) ? "bg-indigo-600 text-white" : "text-slate-700 hover:bg-slate-100",
                  ].join(" ")}
                >
                  <Ellipsis size={16} />
                  <span className="flex-1">More</span>
                  {isMobileMoreOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                <div className="px-3 -mt-1 text-xs text-slate-500 dark:text-slate-400">Role: {String(userRole || "unknown")}</div>

                {isMobileMoreOpen ? (
                  <div className="pl-2 space-y-1">
                    {moreItems.map((item) => (
                      <SidebarButton
                        key={item.key}
                        label={item.label}
                        icon={item.icon}
                        active={active === item.key}
                        collapsed={false}
                        onClick={() => {
                          setIsMobileDrawerOpen(false);
                          handleNavClick(item.key);
                        }}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            </nav>
          </div>
        </div>
      ) : null}

      <div
        className={[
          "w-full flex-1 min-h-0 overflow-hidden",
          isAdminShellEmbed ? "px-0 py-0" : "px-4 md:px-5 pt-0 pb-4",
        ].join(" ")}
      >
        <div className={["h-full min-h-0", isAdminShellEmbed ? "" : "md:flex md:gap-4"].join(" ")}>
        {!isAdminShellEmbed ? (
        <aside
          className={[
            "hidden md:block h-full min-h-0 shrink-0 transition-[width] duration-300 ease-out",
            isSidebarOpen ? "w-[272px]" : "w-[74px]",
          ].join(" ")}
        >
          <div
            className={[
              "surface-elevated rounded-2xl bg-slate-50/90 border border-slate-900/15 shadow-[0_10px_22px_rgba(15,23,42,0.05)] overflow-visible h-full flex flex-col",
              "transition-all duration-300 ease-out",
            ].join(" ")}
          >
            <div className="relative flex items-center border-b border-slate-900/15 bg-slate-50/95 px-3 py-3 dark:border-white/10 dark:bg-slate-900/95">
              {isSidebarOpen ? (
                <div className="flex items-center gap-2">
                  <div className="relative h-7 w-7 rounded-xl bg-gradient-to-br from-sky-400 via-indigo-500 to-fuchsia-500 shadow-[0_0_20px_rgba(99,102,241,0.22)]" />
                  <div className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">Workspace</div>
                </div>
              ) : (
                <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-sky-400 via-indigo-500 to-fuchsia-500" />
              )}
              <button
                onClick={() => {
                  setIsSidebarOpen((v) => !v);
                  setIsMorePopupOpen(false);
                }}
                className={[
                  "absolute -right-2.5 top-1/2 -translate-y-1/2",
                  "h-8 w-8 rounded-xl",
                  "border border-slate-900/15 bg-white/95 shadow-sm",
                  "hover:bg-slate-100 text-slate-600",
                  "flex items-center justify-center",
                ].join(" ")}
                title={isSidebarOpen ? "Collapse" : "Expand"}
              >
                <ChevronRight
                  size={15}
                  className={["transition-transform duration-300", isSidebarOpen ? "rotate-180" : ""].join(" ")}
                />
              </button>
            </div>

            <nav className="p-2.5 pb-4 space-y-3 relative flex-1 min-h-0 overflow-y-auto overflow-x-visible smart-scrollbar">
              {isSidebarOpen ? (
                <div className="px-2 pb-1">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      value={sidebarSearch}
                      onChange={(event) => setSidebarSearch(event.target.value)}
                      placeholder="Search"
                      className="h-9 w-full rounded-xl border border-slate-900/15 bg-slate-50/90 pl-9 pr-3 text-[13px] text-slate-900 placeholder:text-slate-500 outline-none focus:border-slate-900/25 focus:ring-2 focus:ring-slate-200"
                    />
                  </div>
                </div>
              ) : null}
              <div className="space-y-1">
                <SectionLabel collapsed={!isSidebarOpen}>MAIN</SectionLabel>
                <div className="space-y-1 relative" ref={newChatMenuRef}>
                  <div className="flex items-center gap-1">
                    <div className="flex-1">
                      <SidebarButton
                        label="NewChat"
                        icon={LayoutGrid}
                        active={active === "newchat"}
                        collapsed={!isSidebarOpen}
                        onClick={startNewChat}
                      />
                    </div>
                    {isSidebarOpen ? (
                      <button
                        onClick={() => setIsNewChatMenuOpen((v) => !v)}
                        className="h-9 w-9 rounded-lg border border-slate-900/15 bg-white hover:bg-slate-100 text-slate-700 inline-flex items-center justify-center shrink-0"
                        title="Chat actions"
                      >
                        <Ellipsis size={16} />
                      </button>
                    ) : null}
                  </div>
                  {!isSidebarOpen ? (
                    <div className="mt-1 flex justify-center">
                      <button
                        onClick={() => setIsNewChatMenuOpen((v) => !v)}
                        className="h-8 w-8 rounded-lg border border-slate-900/15 bg-white hover:bg-slate-100 text-slate-700 inline-flex items-center justify-center shadow-sm"
                        title="Chat history"
                      >
                        <Ellipsis size={15} />
                      </button>
                    </div>
                  ) : null}

                  {isSidebarOpen && isNewChatMenuOpen ? (
                    <div className="absolute left-2 right-2 top-full mt-1 rounded-xl border border-blue-200/60 bg-blue-500/20 backdrop-blur-sm p-1 space-y-1 z-30">
                      <div className="px-2 py-1 text-[11px] font-semibold tracking-wider text-slate-500">CHAT HISTORY</div>
                      <div className="max-h-44 overflow-auto smart-scrollbar space-y-1">
                        {chats.map((chat) => (
                          <div
                            key={chat.id}
                            className={[
                              "flex items-center gap-2 px-2 py-1 rounded-lg",
                              activeChatId === chat.id
                                ? "bg-indigo-600 text-white shadow-sm"
                                : "hover:bg-blue-500/20",
                            ].join(" ")}
                          >
                            <button
                              onClick={() => {
                                syncActiveView("newchat", "push");
                                setActiveChatId(chat.id);
                                setIsNewChatMenuOpen(false);
                              }}
                              className="flex-1 text-left min-w-0"
                              title={chat.title}
                            >
                              <div
                                className={[
                                  "text-sm truncate",
                                  activeChatId === chat.id ? "text-white font-semibold" : "text-slate-700 font-medium",
                                ].join(" ")}
                              >
                                {chat.title || untitledChatBase}
                              </div>
                              <div
                                className={[
                                  "text-[11px]",
                                  activeChatId === chat.id ? "text-indigo-100" : "text-slate-500",
                                ].join(" ")}
                              >
                                {formatChatStamp(chat.updatedAt)}
                              </div>
                            </button>
                            <button
                              onClick={() => renameChatById(chat.id)}
                              className={[
                                "h-7 w-7 inline-flex items-center justify-center rounded-md border",
                                activeChatId === chat.id
                                  ? "border-white/35 text-white hover:bg-white/15"
                                  : "border-slate-200 text-slate-600 hover:bg-slate-100",
                              ].join(" ")}
                              title="Rename chat"
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              onClick={() => deleteChatById(chat.id)}
                              className={[
                                "h-7 w-7 inline-flex items-center justify-center rounded-md border",
                                activeChatId === chat.id
                                  ? "border-white/35 text-white hover:bg-white/15"
                                  : "border-slate-200 text-slate-600 hover:bg-slate-100",
                              ].join(" ")}
                              title="Delete chat"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {!isSidebarOpen && isNewChatMenuOpen ? (
                    <div className="absolute left-[72px] top-0 w-[264px] rounded-2xl border border-blue-200/70 bg-blue-500/20 p-2 shadow-[0_18px_50px_rgba(15,23,42,0.14)] backdrop-blur-md z-30">
                      <div className="px-2 py-1 text-[11px] font-semibold tracking-[0.16em] text-slate-500">CHAT HISTORY</div>
                      <div className="mt-1 max-h-52 overflow-auto smart-scrollbar space-y-1">
                        {chats.map((chat) => (
                          <div
                            key={chat.id}
                            className={[
                              "flex items-center gap-2 rounded-xl px-2.5 py-2",
                              activeChatId === chat.id
                                ? "bg-indigo-600 text-white shadow-sm"
                                : "bg-white/65 hover:bg-white/85",
                            ].join(" ")}
                          >
                            <button
                              onClick={() => {
                                syncActiveView("newchat", "push");
                                setActiveChatId(chat.id);
                                setIsNewChatMenuOpen(false);
                              }}
                              className="min-w-0 flex-1 text-left"
                              title={chat.title}
                            >
                              <div
                                className={[
                                  "truncate text-sm",
                                  activeChatId === chat.id ? "font-semibold text-white" : "font-medium text-slate-800",
                                ].join(" ")}
                              >
                                {chat.title || untitledChatBase}
                              </div>
                              <div
                                className={[
                                  "mt-0.5 text-[11px]",
                                  activeChatId === chat.id ? "text-indigo-100" : "text-slate-500",
                                ].join(" ")}
                              >
                                {formatChatStamp(chat.updatedAt)}
                              </div>
                            </button>
                            <button
                              onClick={() => renameChatById(chat.id)}
                              className={[
                                "h-8 w-8 inline-flex items-center justify-center rounded-lg border",
                                activeChatId === chat.id
                                  ? "border-white/35 text-white hover:bg-white/15"
                                  : "border-slate-300/80 text-slate-700 hover:bg-white",
                              ].join(" ")}
                              title="Rename chat"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => deleteChatById(chat.id)}
                              className={[
                                "h-8 w-8 inline-flex items-center justify-center rounded-lg border",
                                activeChatId === chat.id
                                  ? "border-white/35 text-white hover:bg-white/15"
                                  : "border-slate-300/80 text-slate-700 hover:bg-white",
                              ].join(" ")}
                              title="Delete chat"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                {MAIN_ITEMS.filter((item) => item.key !== "newchat").map((item) => (
                  <SidebarButton
                    key={item.key}
                    label={item.label}
                    icon={item.icon}
                    active={active === item.key}
                    collapsed={!isSidebarOpen}
                    onClick={() => handleNavClick(item.key)}
                  />
                ))}
              </div>

              <div className="space-y-1">
                <SectionLabel collapsed={!isSidebarOpen}>COLLABORATION</SectionLabel>
                {COLLABORATION_ITEMS.map((item) => (
                  <SidebarButton
                    key={item.key}
                    label={item.label}
                    icon={item.icon}
                    active={active === item.key}
                    collapsed={!isSidebarOpen}
                    onClick={() => handleNavClick(item.key)}
                  />
                ))}
              </div>

              <div className="space-y-1">
                <SectionLabel collapsed={!isSidebarOpen}>SYSTEM</SectionLabel>

                <div className="relative">
                  <SidebarButton
                    buttonRef={desktopSettingsTriggerRef}
                    label={SETTINGS_ITEM.label}
                    icon={SETTINGS_ITEM.icon}
                    active={active === SETTINGS_ITEM.key || isDesktopSettingsLauncherOpen}
                    collapsed={!isSidebarOpen}
                    onClick={() => openSettingsPanel({ anchorEl: desktopSettingsTriggerRef.current })}
                  />
                  <DesktopSettingsLauncher
                    open={isDesktopSettingsLauncherOpen}
                    anchorRef={desktopSettingsTriggerRef}
                    onClose={() => setIsDesktopSettingsLauncherOpen(false)}
                    onSelectSection={handleDesktopSettingsSectionSelect}
                  />
                </div>

                <button
                  onClick={() => {
                    if (isSidebarOpen) {
                      setIsMoreOpen((v) => !v);
                    } else {
                      setIsMorePopupOpen((v) => !v);
                    }
                  }}
                  className={[
                    "w-full text-left px-3 py-2 rounded-xl text-sm flex items-center gap-2 transition",
                    !isSidebarOpen ? "justify-center" : "",
                    moreKeys.includes(active) ? "bg-indigo-600 text-white" : "text-slate-700 hover:bg-slate-100",
                  ].join(" ")}
                  title={!isSidebarOpen ? "More" : undefined}
                >
                  <Ellipsis size={16} />
                  {isSidebarOpen ? (
                    <>
                      <span className="flex-1">More</span>
                      {isMoreOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </>
                  ) : null}
                </button>

                {isSidebarOpen && isMoreOpen ? (
                  <div className="pl-2 space-y-1">
                    {moreItems.map((item) => (
                      <SidebarButton
                        key={item.key}
                        label={item.label}
                        icon={item.icon}
                        active={active === item.key}
                        collapsed={false}
                        onClick={() => handleNavClick(item.key)}
                      />
                    ))}
                  </div>
                ) : null}

                {!isSidebarOpen && isMorePopupOpen ? (
                  <div className="absolute left-[66px] bottom-2 w-56 rounded-2xl bg-white border border-slate-200 shadow-lg p-2 z-20">
                    <div className="px-2 py-1 text-[11px] font-semibold tracking-wider text-slate-500">MORE</div>
                    <div className="mt-1 space-y-1">
                      {moreItems.map((item) => (
                        <SidebarButton
                          key={item.key}
                          label={item.label}
                          icon={item.icon}
                          active={active === item.key}
                          collapsed={false}
                          onClick={() => {
                            setIsMorePopupOpen(false);
                            handleNavClick(item.key);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </nav>
          </div>
        </aside>
        ) : null}

        <main
          className={[
            "min-w-0 flex flex-col overflow-hidden min-h-0 flex-1",
          ].join(" ")}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            accept={fileAcceptMode || undefined}
            capture={fileCaptureMode || undefined}
            onChange={handleFileInputChange}
          />

          {active === "newchat" ? (
            <div className="md:hidden h-[100dvh] overflow-hidden flex flex-col bg-white dark:bg-[#020617]">
              <div
                ref={mobileMessagesRef}
                onScroll={handleChatScroll}
                className="chat-scroll-surface flex-1 overflow-y-auto overscroll-none touch-pan-y bg-white px-1 pt-24 pb-[calc(96px+env(safe-area-inset-bottom))] space-y-4 dark:bg-[#020617]"
                style={{ paddingBottom: `calc(${composerHeight}px + env(safe-area-inset-bottom) + ${kbHeight}px + 28px)` }}
              >
                {messages.length === 0 ? (
                  <div className="px-1 pt-4 pb-2">
                    <div className="text-[11px] font-semibold tracking-[0.18em] uppercase text-slate-500 dark:text-slate-300">
                      {landingGreeting}
                    </div>
                    <div className="mt-2 text-[29px] leading-[1.12] font-semibold tracking-[-0.03em] text-slate-950 dark:text-white">
                      {landingTitle}
                    </div>
                    <div className="mt-2.5 max-w-[32ch] text-[14px] leading-relaxed text-slate-700 dark:text-slate-300">
                      {modeConfig.subtitle}
                    </div>
                  </div>
                ) : null}

                {messages.length === 0 ? (
                  <div className="flex flex-wrap items-start justify-start gap-2 px-1 pt-3 pb-2">
                    {starterSet.map((starter) => {
                      const isActive = selectedStarter === starter.key;
                      return (
                        <button
                          key={starter.key}
                          onClick={() => applyStarter(starter)}
                          className={[
                            "inline-flex items-center gap-2 rounded-full border px-3.5 py-2.5 text-left text-[12px] font-semibold leading-tight bg-white shadow-[0_10px_24px_rgba(14,30,63,0.06)] transition active:scale-[0.99] dark:border-slate-700/90 dark:bg-slate-900/96 dark:shadow-[0_12px_28px_rgba(0,0,0,0.32)]",
                            isActive
                              ? "border-cyan-200 bg-[linear-gradient(180deg,rgba(239,248,255,0.98),rgba(232,250,249,0.96))] text-[#103765] dark:border-sky-500/70 dark:bg-sky-500/15 dark:text-white"
                              : "border-slate-200/90 text-slate-700 hover:border-sky-200 hover:bg-slate-50 dark:text-slate-100 dark:hover:border-slate-600 dark:hover:bg-slate-800/95",
                          ].join(" ")}
                        >
                          <span className="text-[14px] leading-none">{starter.emoji}</span>
                          <span>{starter.label}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                {activeContextLabel ? (
                  <div className="inline-flex items-center rounded-full border border-slate-200/80 bg-white/85 px-3 py-1 text-[11px] text-slate-700 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-300">
                    {activeContextLabel}
                  </div>
                ) : null}

                {messages.length > 0 ? <div style={{ height: mobileVirtualWindow.paddingTop }} /> : null}
                {mobileVirtualWindow.items.map(({ message: m, index: idx }) => (
                  <div key={idx} ref={(node) => measureVirtualRow("mobile", idx, node)}>
                    {shouldShowSectionAnchor(idx) ? (
                      <div className="my-2.5 flex items-center gap-2.5">
                        <span className="text-[10px] font-semibold tracking-[0.08em] text-slate-500 uppercase dark:text-slate-400">
                          {sectionLabelForIndex(idx)}
                        </span>
                        <span className="h-px flex-1 bg-slate-200/70 dark:bg-slate-800" />
                      </div>
                    ) : null}
                    <Bubble
                      role={m.role}
                      text={m.text}
                      imageUrl={m.imageUrl || (m.type === "image" ? m.content || "" : "")}
                      comparisonImages={m.imageOptions || []}
                      comparisonTitle={m.comparisonTitle || "Which image do you like more?"}
                      comparisonSelectedIndex={m.comparisonSelectedIndex ?? null}
                      comparisonSkipped={Boolean(m.comparisonSkipped)}
                      onComparisonChoose={(choiceIndex) => handleImageComparisonChoice(m.id, choiceIndex)}
                      onComparisonSkip={() => handleImageComparisonChoice(m.id, null, { skipped: true })}
                      streaming={Boolean(m.streaming)}
                      imageSearchResults={m.imageSearchResults || []}
                      imageSearchQuery={m.imageSearchQuery || ""}
                      sources={m.sources || []}
                      chatId={activeChat?.conversationId || ""}
                      messageId={m.id || ""}
                      shareId={activeChat?.shareId || ""}
                      shareUrl={activeChat?.shareUrl || ""}
                      isSharedView={Boolean(activeChat?.isSharedView)}
                      chatTitle={activeChat?.title || untitledChatBase}
                      onImagePreview={setImageSearchPreview}
                      onGeneratedImagePreview={(imageUrl) =>
                        openPreview({
                          id: `generated-mobile-${idx}`,
                          name: "Generated image",
                          url: imageUrl,
                          isImage: true,
                          source: "ai-generated",
                        })
                      }
                      onImageReuse={(result) => {
                        setInput(`Use this image in my workspace/report flow:\nTitle: ${result.title}\nSource: ${result.link}`);
                        requestAnimationFrame(() => focusPromptInput());
                      }}
                      onAssistantSpeak={speakAssistantText}
                      isSpeaking={isSpeaking}
                      speakingText={speakingText}
                      onRetry={() => {
                        if (lastPrompt) sendMessage(lastPrompt);
                      }}
                      onLearnMore={() => sendMessage("Learn more about the error and how I can fix it.")}
                      onCopy={() => copyPromptText(idx, m.text)}
                      onEdit={m.role === "user" ? () => editPromptText(m.text) : undefined}
                      isCopied={copiedMessageIndex === idx}
                      reaction={feedbackByMessage[`${activeChat?.id || "chat"}:${idx}`] || null}
                      onLike={() => setMessageFeedback(`${activeChat?.id || "chat"}:${idx}`, "like")}
                      onDislike={() => setMessageFeedback(`${activeChat?.id || "chat"}:${idx}`, "dislike")}
                      onRetryMessage={() => lastPrompt && sendMessage(lastPrompt)}
                      onSimplify={() => sendMessage("Please simplify your last answer in clear student-friendly language.")}
                      onDetailed={() => sendMessage("Please make your last answer more detailed with steps and practical examples.")}
                      onSummarizeTool={() => sendMessage(`Summarize this answer for me:\n\n${m.text}`)}
                      onNotesTool={() => sendMessage(`Turn this answer into clean study notes:\n\n${m.text}`)}
                      onFlashcardsTool={() => sendMessage(`Generate revision flashcards (Q/A) from this answer:\n\n${m.text}`)}
                      onSimplerTool={() => sendMessage(`Explain this answer in simpler student-friendly language:\n\n${m.text}`)}
                      onDiagramTool={() => sendMessage(`Create a clear diagram from this explanation:\n\n${m.text}`)}
                      onRewriteFormalTool={() => sendMessage(`Rewrite this in a polished formal academic/institutional tone:\n\n${m.text}`)}
                      showStudyTools={!isEmbeddedAdminChat}
                    />
                  </div>
                ))}
                {messages.length > 0 ? <div style={{ height: mobileVirtualWindow.paddingBottom }} /> : null}
                <div ref={messagesEndRef} />
              </div>

              <div
                ref={mobileComposerRef}
                className={[
                  "fixed left-0 right-0 bottom-0 z-50 bg-transparent px-4 pt-2 pb-[calc(14px+env(safe-area-inset-bottom))] md:static md:z-auto",
                  isMobileDrawerOpen ? "pointer-events-none opacity-0" : "opacity-100",
                ].join(" ")}
                style={{ bottom: `${kbHeight}px` }}
              >
                <div ref={mobileAttachmentMenuRef} className="relative max-w-xl mx-auto space-y-2">
                  {showMobileRotatingSuggestion && activeMobileSuggestion ? (
                    <div className="px-1">
                      <button
                        key={activeMobileSuggestion}
                        type="button"
                        onClick={() => applySuggestion(activeMobileSuggestion)}
                        className="elu-rotating-suggestion-chip inline-flex max-w-full items-center gap-2 rounded-full border border-slate-200/80 bg-white/92 px-3.5 py-2 text-left text-[13px] text-slate-700 shadow-[0_12px_28px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/90 dark:text-slate-100"
                      >
                        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-600 dark:text-sky-300">
                          Try
                        </span>
                        <span className="truncate">{activeMobileSuggestion}</span>
                      </button>
                    </div>
                  ) : null}

                  <div className="flex items-center justify-center">
                    <div ref={mobileModelMenuRef} className="relative">
                      <button
                        type="button"
                        onClick={toggleModelMenu}
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/70 bg-slate-100/90 px-3.5 py-1.5 text-[12px] font-semibold text-slate-700 shadow-[0_8px_20px_rgba(15,23,42,0.08)] backdrop-blur-xl transition active:scale-[0.98] dark:border-white/10 dark:bg-white/8 dark:text-slate-100"
                        aria-expanded={isModelMenuOpen}
                      >
                        <span className="max-w-[140px] truncate">{activeChatModel?.label || "ElimuLink AI"}</span>
                        <ChevronDown size={14} />
                      </button>

                      <div
                        className={[
                          "absolute left-1/2 bottom-[calc(100%+10px)] z-[70] w-64 -translate-x-1/2 rounded-[24px] border border-slate-200/80 bg-white/96 p-2 shadow-[0_20px_44px_rgba(15,23,42,0.16)] backdrop-blur-xl transition duration-150 dark:border-white/10 dark:bg-slate-950/96",
                          isModelMenuOpen ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-2 pointer-events-none",
                        ].join(" ")}
                      >
                        <div className="px-2 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                          Model
                        </div>
                        {INSTITUTION_CHAT_MODEL_OPTIONS.map((modelOption) => {
                          const isSelected = modelOption.key === selectedChatModelKey;
                          return (
                            <button
                              key={modelOption.key}
                              type="button"
                              onClick={() => {
                                setSelectedChatModelKey(modelOption.key);
                                setIsModelMenuOpen(false);
                              }}
                              className={[
                                "w-full rounded-2xl px-3 py-3 text-left transition",
                                isSelected
                                  ? "bg-sky-50 text-slate-900 dark:bg-sky-500/15 dark:text-white"
                                  : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5",
                              ].join(" ")}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-[14px] font-semibold">{modelOption.label}</span>
                                {isSelected ? <Check size={16} /> : null}
                              </div>
                              <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
                                {modelOption.description}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div
                    className={[
                      "relative surface-elevated rounded-[24px] border px-2 py-1.5 backdrop-blur-xl transition-all duration-300",
                      showMobileEntryGlow
                        ? "border-cyan-300/75 bg-white/94 shadow-[0_18px_44px_rgba(15,23,42,0.12)] dark:border-cyan-400/25 dark:bg-slate-950/72 dark:shadow-[0_18px_38px_rgba(0,0,0,0.28)]"
                        : "border-cyan-200/70 bg-white/94 shadow-[0_12px_28px_rgba(15,23,42,0.10)] dark:border-cyan-400/15 dark:bg-slate-950/72 dark:shadow-[0_14px_30px_rgba(0,0,0,0.24)]",
                    ].join(" ")}
                  >
                    <AttachmentChipsTray
                      items={attachments}
                      onPreview={openAttachmentItem}
                      onRemove={removeAttachment}
                    />

                    {mediaNotice ? (
                      <div className="mb-1.5 flex items-center justify-between gap-2 rounded-2xl border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-[11px] font-medium text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
                        <span>{mediaNotice}</span>
                        <button
                          type="button"
                          onClick={dismissMediaNotice}
                          className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/80 text-amber-900 dark:bg-white/10 dark:text-amber-100"
                          aria-label="Dismiss upload notice"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : null}

                    <div className="flex items-end gap-1.5">
                      <div className="relative shrink-0 self-end">
                        <button
                          type="button"
                          onClick={toggleAttachmentPanel}
                          className="grid h-10 w-10 place-items-center rounded-[18px] border border-slate-200/90 bg-slate-50 text-[#1f3654] transition active:scale-[0.98] dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-100"
                          title="Add attachment"
                          aria-expanded={isAttachOpen}
                        >
                          <Plus size={20} />
                        </button>
                      </div>

                      <textarea
                        ref={mobilePromptInputRef}
                        data-maxheight="120"
                        rows={1}
                        value={input}
                        onChange={(e) => handleComposerInputChange(e.target.value, e.target)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage(input);
                        }
                      }}
                      onPaste={handlePaste}
                      className="composer-plain-input max-h-[120px] min-h-[40px] flex-1 resize-none appearance-none border-0 bg-transparent px-1.5 py-2 text-[15px] leading-6 text-slate-900 outline-none shadow-none ring-0 placeholder:text-slate-500 dark:bg-transparent dark:text-slate-50 dark:placeholder:text-slate-400"
                      placeholder="Type your message..."
                      />

                      <button
                        onClick={() => {
                          audioPlayer.closePlayer();
                          openLiveVoiceSession();
                        }}
                        className="grid h-10 w-10 shrink-0 place-items-center self-end rounded-[18px] border border-slate-200/90 bg-slate-50 text-[#1f3654] transition active:scale-[0.98] dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-100"
                        title="Open live voice chat"
                      >
                        <PhoneCall size={18} />
                      </button>

                      <button
                        onClick={() => (hasText ? sendMessage(input) : toggleMic())}
                        className={[
                          "relative shrink-0 self-end rounded-[18px] border transition grid place-items-center overflow-hidden",
                          hasText
                            ? "h-10 w-10 border-sky-500/20 bg-[linear-gradient(180deg,#0f7ae5,#0ea5b7)] text-white shadow-[0_10px_20px_rgba(14,165,233,0.24)] hover:brightness-105 active:scale-[0.98]"
                            : "h-10 w-10 border-slate-200/90 bg-slate-50 text-[#1f3654] active:scale-[0.98] dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-100",
                        ].join(" ")}
                        title={hasText ? "Send" : "Live AI ready"}
                      >
                      {!hasText ? (
                        <>
                            <span className="absolute inset-0 rounded-2xl border border-sky-300/20" />
                            <Mic size={18} className="relative z-10" />
                          </>
                        ) : (
                          <Send size={18} className="transition-transform duration-200" />
                        )}
                      </button>
                    </div>
                  </div>

                  {isAttachOpen ? (
                    <>
                      <button
                        type="button"
                        aria-label="Close tools"
                        className="fixed inset-0 z-[60] bg-slate-950/24 backdrop-blur-[2px]"
                        onClick={() => {
                          setIsAttachOpen(false);
                          setIsToolsPanelOpen(false);
                        }}
                      />
                      <div
                        className="fixed left-0 right-0 z-[61] rounded-t-[32px] border border-white/60 bg-white/96 px-4 pb-[calc(16px+env(safe-area-inset-bottom))] pt-3 shadow-[0_-22px_48px_rgba(15,23,42,0.18)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/96"
                        style={{ bottom: `${kbHeight}px` }}
                      >
                        <div className="mx-auto h-1.5 w-12 rounded-full bg-slate-200 dark:bg-white/15" />
                        <div className="mx-auto mt-4 max-w-xl">
                          <div className="flex items-center justify-between">
                            <div className="text-[13px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                              Tools
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setIsAttachOpen(false);
                                setIsToolsPanelOpen(false);
                              }}
                              className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-700 dark:bg-white/8 dark:text-slate-100"
                              aria-label="Close tools"
                            >
                              <X size={16} />
                            </button>
                          </div>

                          <div className="mt-4 grid grid-cols-3 gap-2.5">
                            <MobileComposerToolCard
                              icon={<Paperclip size={20} />}
                              label="Document"
                              onClick={() => openAttachmentPicker({ source: "file" })}
                            />
                            <MobileComposerToolCard
                              icon={<Image size={20} />}
                              label="Gallery"
                              onClick={() => openAttachmentPicker({ accept: "image/*", source: "photo" })}
                            />
                            <MobileComposerToolCard
                              icon={<Camera size={20} />}
                              label="Camera"
                              onClick={() =>
                                openAttachmentPicker({
                                  accept: "image/*",
                                  capture: "environment",
                                  source: "camera",
                                })
                              }
                            />
                          </div>

                          <div className="mt-3 rounded-[26px] bg-slate-50/90 p-2 ring-1 ring-slate-200/70 dark:bg-white/5 dark:ring-white/10">
                            <MobileComposerToolRow
                              icon={<Sparkles size={18} />}
                              label="AI Image Generator"
                              onClick={() => applyToolPreset(COMPOSER_TOOL_PRESETS[0].prompt)}
                            />
                            <MobileComposerToolRow
                              icon={<NotebookPen size={18} />}
                              label="Problem Solving"
                              onClick={() => applyToolPreset("Help me solve this problem step by step...")}
                            />
                            <MobileComposerToolRow
                              icon={<ScanLine size={18} />}
                              label="Scan-to-Doc"
                              onClick={() =>
                                openAttachmentPicker({
                                  accept: "image/*",
                                  capture: "environment",
                                  source: "scan",
                                })
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {active !== "newchat" ? (
            <div className="md:hidden flex-1 overflow-y-auto bg-slate-50 px-4 pt-20 pb-24 dark:bg-slate-950">
              <PlaceholderPanel
                title={activePlaceholder?.title || "Coming soon"}
                bullets={activePlaceholder?.bullets || ["Feature wiring", "Permissions setup", "Backend connection"]}
              />
            </div>
          ) : null}

          {active === "newchat" ? (
            <div className="relative hidden md:flex flex-1 min-h-0 flex-col bg-transparent dark:bg-transparent">
            <div className={["shrink-0 bg-transparent", isEmbeddedAdminChat ? "px-0 pt-0 pb-1" : "px-4 py-2.5"].join(" ")}>
              <div
                className={["group/chat-header relative w-full", isEmbeddedAdminChat ? "" : "mx-auto max-w-[1180px]"].join(" ")}
                title={`${isEmbeddedAdminChat ? "Institution Admin Assistant" : "AI Academic Assistant"} • ${formatChatStamp(activeChat?.updatedAt)}`}
              >
                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                  {activeChat?.title || untitledChatBase}
                </div>
                <div className="pointer-events-none absolute left-0 top-full mt-1 text-xs text-slate-500 opacity-0 transition-opacity duration-150 group-hover/chat-header:opacity-100 dark:text-slate-400">
                  {isEmbeddedAdminChat ? "Institution Admin Assistant" : "AI Academic Assistant"} • {formatChatStamp(activeChat?.updatedAt)}
                </div>
              </div>
            </div>

            <div className={[isEmbeddedAdminChat ? (hasConversation ? "px-0 pt-0 pb-0" : "px-0 pt-2 pb-0") : (hasConversation ? "px-4 pt-1 pb-2" : "px-4 pt-14 pb-2 md:pt-24"), "flex-1 min-h-0 flex flex-col"].join(" ")}>
              <div className={["w-full flex-1 min-h-0 flex flex-col", isEmbeddedAdminChat ? "max-w-[1180px] mx-auto" : "max-w-[1180px] mx-auto"].join(" ")}>
              {messages.length === 0 && !isEmbeddedAdminChat ? (
                <div className="grid w-full max-w-[920px] mx-auto grid-cols-2 gap-2 shrink-0 mb-2 md:mt-0.5 lg:grid-cols-4">
                  <StatCard title="Next Class" value={user.nextClass} subtitle="From your timetable" />
                  <StatCard title="Balance" value={user.balance} subtitle="Fees portal" />
                  <StatCard title="Attendance" value={user.attendance} subtitle="This month" />
                  <StatCard title="GPA Progress" value={user.gpa} subtitle="Current GPA" />
                </div>
              ) : null}
              {messages.length === 0 && isEmbeddedAdminChat ? (
                <div className="grid w-full max-w-[920px] mx-auto grid-cols-2 gap-2 shrink-0 mb-2 md:mt-0.5 lg:grid-cols-4">
                  {adminOverviewCards.map((item) => (
                    <StatCard key={item.title} title={item.title} value={item.value} subtitle={item.subtitle} />
                  ))}
                </div>
              ) : null}

              <div
                ref={desktopMessagesRef}
                onScroll={handleChatScroll}
                className={["chat-scroll-surface flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-3", isEmbeddedAdminChat ? "px-0 pt-2 pb-1 md:pt-2" : "px-3 pt-4 pb-3 md:pt-5"].join(" ")}
              >
                <div className={["w-full space-y-4", isEmbeddedAdminChat ? "max-w-[920px] mx-auto pb-3" : "max-w-[920px] mx-auto pb-6 md:pt-1"].join(" ")}>
                  {messages.length === 0 ? (
                    <div className="px-2 pt-0.5 pb-0.5">
                      <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">
                        {landingGreeting}
                      </div>
                      <div className="mt-2 text-[34px] leading-[1.08] font-semibold tracking-[-0.04em] text-slate-950 dark:text-white">
                        {landingTitle}
                      </div>
                      <div className="mt-2 max-w-[44ch] text-[15px] leading-7 text-slate-700 dark:text-slate-300">
                        {modeConfig.subtitle}
                      </div>
                    </div>
                  ) : null}

                  {messages.length === 0 ? (
                    <div className="flex w-full max-w-[820px] flex-wrap gap-2 px-2 pt-0.5">
                      {starterSet.map((starter) => {
                        const isActive = selectedStarter === starter.key;
                        return (
                          <button
                            key={starter.key}
                            onClick={() => applyStarter(starter)}
                            className={[
                              "inline-flex min-w-[170px] flex-1 items-center gap-2 rounded-full border px-3.5 py-2.5 text-left text-[12px] font-semibold leading-tight bg-white shadow-[0_10px_24px_rgba(14,30,63,0.06)] transition active:scale-[0.99] dark:border-slate-700/90 dark:bg-slate-900/96 dark:shadow-[0_12px_28px_rgba(0,0,0,0.32)]",
                              isActive
                                ? "border-cyan-200 bg-[linear-gradient(180deg,rgba(239,248,255,0.98),rgba(232,250,249,0.96))] text-[#103765] dark:border-sky-500/70 dark:bg-sky-500/15 dark:text-white"
                                : "border-slate-900/20 text-slate-700 hover:border-slate-900/30 hover:bg-slate-50 dark:text-slate-100 dark:hover:border-slate-600 dark:hover:bg-slate-800/95",
                            ].join(" ")}
                          >
                            <span className="text-[14px] leading-none">{starter.emoji}</span>
                            <span className="truncate">{starter.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}

                  {messages.length > 0 ? <div style={{ height: desktopVirtualWindow.paddingTop }} /> : null}
                  {desktopVirtualWindow.items.map(({ message: m, index: idx }) => (
                      <div key={idx} ref={(node) => measureVirtualRow("desktop", idx, node)}>
                        {shouldShowSectionAnchor(idx) ? (
                          <div className="my-3 flex items-center gap-3">
                            <span className="text-[10px] font-semibold tracking-[0.08em] text-slate-500 uppercase dark:text-slate-400">
                              {sectionLabelForIndex(idx)}
                            </span>
                            <span className="h-px flex-1 bg-slate-200/70 dark:bg-slate-800" />
                          </div>
                        ) : null}
                        <Bubble
                          role={m.role}
                          text={m.text}
                          imageUrl={m.imageUrl || (m.type === "image" ? m.content || "" : "")}
                          comparisonImages={m.imageOptions || []}
                          comparisonTitle={m.comparisonTitle || "Which image do you like more?"}
                          comparisonSelectedIndex={m.comparisonSelectedIndex ?? null}
                          comparisonSkipped={Boolean(m.comparisonSkipped)}
                          onComparisonChoose={(choiceIndex) => handleImageComparisonChoice(m.id, choiceIndex)}
                          onComparisonSkip={() => handleImageComparisonChoice(m.id, null, { skipped: true })}
                          streaming={Boolean(m.streaming)}
                          imageSearchResults={m.imageSearchResults || []}
                          imageSearchQuery={m.imageSearchQuery || ""}
                          sources={m.sources || []}
                          chatId={activeChat?.conversationId || ""}
                          messageId={m.id || ""}
                          shareId={activeChat?.shareId || ""}
                          shareUrl={activeChat?.shareUrl || ""}
                          isSharedView={Boolean(activeChat?.isSharedView)}
                          chatTitle={activeChat?.title || untitledChatBase}
                          onImagePreview={setImageSearchPreview}
                          onGeneratedImagePreview={(imageUrl) =>
                            openPreview({
                              id: `generated-desktop-${idx}`,
                              name: "Generated image",
                              url: imageUrl,
                              isImage: true,
                              source: "ai-generated",
                            })
                          }
                          onImageReuse={(result) => {
                            setInput(`Use this image in my workspace/report flow:\nTitle: ${result.title}\nSource: ${result.link}`);
                            requestAnimationFrame(() => focusPromptInput());
                          }}
                          onAssistantSpeak={speakAssistantText}
                          isSpeaking={isSpeaking}
                          speakingText={speakingText}
                          onRetry={() => {
                            if (lastPrompt) sendMessage(lastPrompt);
                          }}
                          onLearnMore={() => sendMessage("Learn more about the error and how I can fix it.")}
                          onCopy={() => copyPromptText(idx, m.text)}
                          onEdit={m.role === "user" ? () => editPromptText(m.text) : undefined}
                          isCopied={copiedMessageIndex === idx}
                          reaction={feedbackByMessage[`${activeChat?.id || "chat"}:${idx}`] || null}
                          onLike={() => setMessageFeedback(`${activeChat?.id || "chat"}:${idx}`, "like")}
                          onDislike={() => setMessageFeedback(`${activeChat?.id || "chat"}:${idx}`, "dislike")}
                          onRetryMessage={() => lastPrompt && sendMessage(lastPrompt)}
                          onSimplify={() => sendMessage("Please simplify your last answer in clear student-friendly language.")}
                          onDetailed={() => sendMessage("Please make your last answer more detailed with steps and practical examples.")}
                          onSummarizeTool={() => sendMessage(`Summarize this answer for me:\n\n${m.text}`)}
                          onNotesTool={() => sendMessage(`Turn this answer into clean study notes:\n\n${m.text}`)}
                          onFlashcardsTool={() => sendMessage(`Generate revision flashcards (Q/A) from this answer:\n\n${m.text}`)}
                          onSimplerTool={() => sendMessage(`Explain this answer in simpler student-friendly language:\n\n${m.text}`)}
                          onDiagramTool={() => sendMessage(`Create a clear diagram from this explanation:\n\n${m.text}`)}
                          onRewriteFormalTool={() => sendMessage(`Rewrite this in a polished formal academic/institutional tone:\n\n${m.text}`)}
                          showStudyTools={!isEmbeddedAdminChat}
                        />
                      </div>
                  ))}
                  {messages.length > 0 ? <div style={{ height: desktopVirtualWindow.paddingBottom }} /> : null}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {hasStarterSuggestions && !hasConversation ? (
                <div ref={starterSuggestionsPanelRef} className="surface-elevated mt-3 rounded-2xl border border-slate-900/15 bg-white/95 p-2.5 shadow-[0_10px_24px_rgba(15,23,42,0.05)] shrink-0 max-w-[920px] w-full mx-auto dark:border-slate-700 dark:bg-slate-900">
                  <div className="px-2 pb-1.5 text-[10px] font-semibold tracking-[0.08em] text-slate-500 uppercase dark:text-slate-400">
                    Suggested prompts
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {starterSuggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => applySuggestion(suggestion)}
                        className="w-full text-left rounded-xl border border-transparent px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:border-slate-200/80 dark:text-slate-100 dark:hover:border-slate-700 dark:hover:bg-slate-800"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div ref={desktopAttachmentMenuRef} className={["shrink-0 relative z-10 max-w-[920px] w-full mx-auto", isEmbeddedAdminChat ? "mt-auto pt-3" : "mt-2"].join(" ")}>
                <div className="surface-elevated rounded-[28px] border border-slate-900/15 bg-white/94 px-3 py-2.5 shadow-[0_0_0_1px_rgba(15,23,42,0.03),0_12px_28px_rgba(15,23,42,0.08)] backdrop-blur-xl transition focus-within:border-slate-900/25 dark:border-cyan-400/15 dark:bg-slate-950/72 dark:shadow-[0_0_0_1px_rgba(34,211,238,0.10),0_0_14px_rgba(14,165,233,0.12),0_14px_30px_rgba(0,0,0,0.24)]">
                  <AttachmentChipsTray
                    items={attachments}
                    onPreview={openAttachmentItem}
                    onRemove={removeAttachment}
                  />

                  {mediaNotice ? (
                    <div className="mb-1.5 flex items-center justify-between gap-2 rounded-2xl border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-[11px] font-medium text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
                      <span>{mediaNotice}</span>
                      <button
                        type="button"
                        onClick={dismissMediaNotice}
                        className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/80 text-amber-900 dark:bg-white/10 dark:text-amber-100"
                        aria-label="Dismiss upload notice"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : null}

                  <div className="flex items-end gap-2">
                    <button
                      onClick={toggleAttachmentPanel}
                      className="h-10 w-10 shrink-0 rounded-2xl border border-slate-900/15 bg-slate-100/70 hover:bg-slate-100 text-slate-700 inline-flex items-center justify-center transition active:scale-[0.98] dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-100 dark:hover:bg-white/[0.09]"
                      title="Add attachment"
                    >
                      <Plus size={17} />
                    </button>

                    <textarea
                      ref={desktopPromptInputRef}
                      data-maxheight="192"
                      rows={1}
                      value={input}
                      onChange={(e) => handleComposerInputChange(e.target.value, e.target)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage(input);
                        }
                      }}
                      onPaste={handlePaste}
                      className="composer-plain-input min-h-[44px] flex-1 resize-none bg-transparent py-2 text-[15px] leading-6 text-slate-900 outline-none placeholder:text-slate-500 dark:text-slate-50 dark:placeholder:text-slate-400"
                      placeholder="Type your message..."
                    />

                    <button
                      onClick={() => setIsAiModeOn((v) => !v)}
                      className={[
                        "h-9 px-3.5 rounded-xl border text-xs font-semibold transition",
                        isAiModeOn
                          ? "border-slate-900/20 bg-slate-900 text-white"
                          : "border-slate-900/15 bg-slate-100/75 text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-100 dark:hover:bg-white/[0.09]",
                      ].join(" ")}
                      title="AI conversation mode"
                    >
                      <span className="inline-flex items-center gap-1"><Sparkles size={14} /> AI</span>
                    </button>

                    <button
                      onClick={toggleMic}
                      className={[
                        "h-9 w-9 rounded-xl border inline-flex items-center justify-center transition",
                        isListening
                          ? "border-red-500 bg-red-500 text-white"
                          : "border-slate-900/15 bg-slate-100/75 text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-100 dark:hover:bg-white/[0.09]",
                      ].join(" ")}
                      title={isListening ? "Stop voice input" : "Start voice input"}
                    >
                      {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                    </button>

                    <button
                      onClick={() => {
                        audioPlayer.closePlayer();
                        openLiveVoiceSession();
                      }}
                      className="h-9 w-9 rounded-xl border border-slate-900/15 bg-slate-100/75 text-slate-700 inline-flex items-center justify-center transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-100 dark:hover:bg-white/[0.09]"
                      title="Open live voice chat"
                    >
                      <PhoneCall size={16} />
                    </button>

                    <button
                      onClick={() => {
                        if (!canSend) return;
                        sendMessage(input);
                      }}
                      disabled={!canSend}
                      className={[
                        "h-10 w-10 rounded-xl text-white shadow-sm transition",
                        canSend ? "bg-sky-500 hover:bg-sky-600 active:scale-[0.98]" : "bg-slate-300 cursor-not-allowed",
                      ].join(" ")}
                      title="Send"
                    >
                      <Send size={16} className="mx-auto" />
                    </button>
                  </div>
                </div>

                <div
                  className={[
                    "surface-elevated absolute left-2 bottom-[calc(100%+10px)] z-20 w-72 rounded-2xl border border-white/45 bg-white/72 backdrop-blur-xl shadow-[0_20px_42px_rgba(15,23,42,0.18)] p-2 origin-bottom-left transition duration-150 dark:border-slate-700 dark:bg-slate-900/95",
                    isAttachOpen ? "opacity-100 translate-y-0 scale-100 pointer-events-auto" : "opacity-0 translate-y-1.5 scale-95 pointer-events-none",
                  ].join(" ")}
                >
                  <div className="grid grid-cols-4 gap-1.5">
                    <button
                      onClick={() => openAttachmentPicker({ accept: "image/*", source: "photo" })}
                      className="group rounded-xl border border-slate-200/70 bg-white/75 px-1.5 py-2 text-center text-[10px] font-medium text-slate-700 hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      <span className="mx-auto mb-1 inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-100">
                        <Image size={16} />
                      </span>
                      <span>Photo</span>
                    </button>
                    <button
                      onClick={() => openAttachmentPicker({ source: "file" })}
                      className="group rounded-xl border border-slate-200/70 bg-white/75 px-1.5 py-2 text-center text-[10px] font-medium text-slate-700 hover:border-slate-300 hover:bg-white"
                    >
                      <span className="mx-auto mb-1 inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                        <Paperclip size={16} />
                      </span>
                      <span>Files</span>
                    </button>
                    <button
                      onClick={() => openAttachmentPicker({ accept: "image/*", capture: "environment", source: "camera" })}
                      className="group rounded-xl border border-slate-200/70 bg-white/75 px-1.5 py-2 text-center text-[10px] font-medium text-slate-700 hover:border-slate-300 hover:bg-white"
                    >
                      <span className="mx-auto mb-1 inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                        <Camera size={16} />
                      </span>
                      <span>Camera</span>
                    </button>
                    <button
                      onClick={() => openAttachmentPicker({ accept: "image/*", capture: "environment", source: "scan" })}
                      className="group rounded-xl border border-slate-200/70 bg-white/75 px-1.5 py-2 text-center text-[10px] font-medium text-slate-700 hover:border-slate-300 hover:bg-white"
                    >
                      <span className="mx-auto mb-1 inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                        <ScanLine size={16} />
                      </span>
                      <span>Scan</span>
                    </button>
                  </div>

                  <div className="mt-2 rounded-xl border border-slate-200/70 bg-white/65 p-1.5 dark:border-slate-700 dark:bg-slate-800/90">
                    <div className="relative overflow-hidden">
                      <div className={`transition-transform duration-200 ${isToolsPanelOpen ? "-translate-x-full" : "translate-x-0"}`}>
                        <button
                          onClick={() => setIsToolsPanelOpen(true)}
                          className="w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-[12px] font-medium text-slate-700 hover:bg-white/80 dark:text-slate-100 dark:hover:bg-slate-700"
                        >
                          <span className="inline-flex items-center gap-1.5"><Sparkles size={14} /> Tools</span>
                          <ChevronRight size={14} />
                        </button>
                      </div>
                      <div
                        className={[
                          "absolute inset-0 transition-transform duration-200",
                          isToolsPanelOpen ? "translate-x-0" : "translate-x-full",
                        ].join(" ")}
                      >
                        <div className="rounded-lg bg-white/90 p-1 dark:bg-slate-900">
                          <button
                            onClick={() => setIsToolsPanelOpen(false)}
                            className="mb-1 inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            <ChevronDown size={12} />
                            Back
                          </button>
                          <div className="grid grid-cols-2 gap-1">
                            {COMPOSER_TOOL_PRESETS.map((tool) => (
                              <button
                                key={tool.key}
                                onClick={() => applyToolPreset(tool.prompt)}
                                className="rounded-md border border-slate-200/80 bg-white px-2 py-1.5 text-left text-[11px] text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                              >
                                {tool.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              </div>
            </div>

            <div className="mt-3 text-xs text-slate-500 hidden">
              Backend will be Python. Later we will send messages and attachments to your API (for example /api/chat).
            </div>
            </div>
          ) : null}

          {active !== "newchat" ? (
            <div className="hidden md:flex flex-1 min-h-0 rounded-2xl bg-slate-50/80 border border-slate-200/80 shadow-[0_10px_24px_rgba(15,23,42,0.05)] p-6">
              <div className="w-full max-w-2xl">
                <PlaceholderPanel
                  title={activePlaceholder?.title || "Coming soon"}
                  bullets={activePlaceholder?.bullets || ["Feature wiring", "Permissions setup", "Backend connection"]}
                />
              </div>
            </div>
          ) : null}
        </main>
      </div>
      </div>
      {audioPlayer.isOpen && !voiceOpen ? (
        <div className="elu-audio-shell">
          <AudioPlaybackBar
            isPlaying={audioPlayer.isPlaying}
            currentTime={audioPlayer.currentTime}
            duration={audioPlayer.duration}
            onTogglePlay={audioPlayer.togglePlay}
            onSeek={audioPlayer.seekTo}
            onClose={audioPlayer.closePlayer}
            onOpenSettings={() => audioPlayer.setIsSettingsOpen((value) => !value)}
          />

          {audioPlayer.isSettingsOpen ? (
            <AudioSettingsPanel
              playbackRate={audioPlayer.playbackRate}
              playbackRates={audioPlayer.playbackRates}
              setPlaybackRate={audioPlayer.setPlaybackRate}
              voiceId={audioPlayer.voiceId}
              setVoice={audioPlayer.setVoice}
              language={audioPlayer.language}
              setLanguage={audioPlayer.setLanguage}
              voices={audioPlayer.voiceOptions}
              languages={audioPlayer.languages}
              isSupported={audioPlayer.isSupported}
              followAppLanguage={audioPlayer.followAppLanguage}
              setFollowAppLanguage={audioPlayer.setFollowAppLanguage}
              captionsEnabled={audioPlayer.captionsEnabled}
              setCaptionsEnabled={audioPlayer.setCaptionsEnabled}
              autoPlayReplies={audioPlayer.autoPlayReplies}
              setAutoPlayReplies={audioPlayer.setAutoPlayReplies}
              isPreviewingVoice={audioPlayer.isPreviewingVoice}
              previewVoiceId={audioPlayer.previewVoiceId}
              previewError={audioPlayer.previewError}
              onPreviewVoice={audioPlayer.previewVoice}
              onDone={() => audioPlayer.setIsSettingsOpen(false)}
            />
          ) : null}
        </div>
      ) : null}
      <LiveMultimodalSessionContainerV2
        open={voiceOpen}
        onClose={closeLiveVoiceSession}
        family="ai"
        app="institution"
        settingsUid={currentUid}
        title="Institution Live"
        subtitle="Talk naturally with AI for coursework, research, and institution support."
        language={preferredSpeechLanguage}
        onAskAI={async ({ text, context }) => {
          const reply = await requestLiveVoiceReply(text, context);
          return { text: reply };
        }}
      />
      {voiceFeedbackCard.open && !voiceOpen ? (
        <div
          className="fixed left-1/2 z-[92] w-[min(420px,calc(100vw-24px))] -translate-x-1/2"
          style={{ bottom: `${Math.max(96, composerHeight + kbHeight + 14)}px` }}
        >
          <div className="flex items-center gap-3 rounded-[22px] border border-slate-200/80 bg-white/96 px-3 py-2.5 shadow-[0_18px_40px_rgba(15,23,42,0.14)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/92 dark:shadow-[0_18px_40px_rgba(0,0,0,0.42)]">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-200">
              <Volume2 size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-slate-900 dark:text-slate-50">
                Voice chat ended
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {voiceFeedbackCard.durationLabel || "Rate this session"}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => submitVoiceSessionRating("like")}
                className="grid h-9 w-9 place-items-center rounded-2xl border border-slate-200/80 bg-slate-50 text-slate-600 transition hover:bg-sky-50 hover:text-sky-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-sky-500/15 dark:hover:text-sky-200"
                aria-label="Like voice chat"
              >
                <ThumbsUp size={15} />
              </button>
              <button
                type="button"
                onClick={() => submitVoiceSessionRating("dislike")}
                className="grid h-9 w-9 place-items-center rounded-2xl border border-slate-200/80 bg-slate-50 text-slate-600 transition hover:bg-slate-100 hover:text-slate-800 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white"
                aria-label="Dislike voice chat"
              >
                <ThumbsDown size={15} />
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {feedbackToast.open ? (
        <div className="fixed left-1/2 -translate-x-1/2 z-[90] bottom-[calc(82px+env(safe-area-inset-bottom))] md:bottom-5">
          <div className="rounded-xl border border-slate-200 bg-slate-900 text-white/95 px-4 py-2 text-sm shadow-lg">
            {feedbackToast.text || "Thank you for your feedback!"}
          </div>
        </div>
      ) : null}
      {toastItem ? (
        <div className="fixed left-1/2 -translate-x-1/2 z-[95] bottom-[calc(138px+env(safe-area-inset-bottom))] md:bottom-6">
          <ScreenshotPreviewToast
            item={toastItem}
            onPreview={openPreview}
            onAnnotate={(item) => {
              dismissToast();
              openEditor(item);
            }}
            onAskAI={(item) => {
              dismissToast();
              const screenshotPrompt =
                String(input || "").trim() ||
                `Explain this screenshot, read any visible text, extract any links, and tell me what to focus on: ${item.name || "Screenshot"}`;
              sendMessage(screenshotPrompt);
            }}
            onDismiss={dismissToast}
          />
        </div>
      ) : null}
      {active === "newchat" && showJumpToLatest && !voiceOpen ? (
        <button
          type="button"
          onClick={() => scrollToBottom("smooth")}
          className="fixed right-3 z-[78] grid h-11 w-11 place-items-center rounded-full border border-slate-200/80 bg-white/95 text-slate-700 shadow-[0_14px_30px_rgba(15,23,42,0.16)] backdrop-blur-xl transition hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950/92 dark:text-slate-100 dark:shadow-[0_16px_34px_rgba(0,0,0,0.42)]"
          style={{ bottom: `${Math.max(92, composerHeight + kbHeight + 14)}px` }}
          aria-label="Scroll to latest message"
        >
          <ChevronDown size={22} strokeWidth={2.4} />
        </button>
      ) : null}
      <div
        className={[
          "pointer-events-none fixed right-3 md:right-3 top-[40%] z-[70] transition-all duration-300",
          isChatScrolling ? "opacity-100 translate-x-0" : "opacity-0 translate-x-1.5",
        ].join(" ")}
      >
        <div className="mb-2 -ml-16 w-20 rounded-full border border-slate-200/70 bg-white/90 px-2.5 py-1 text-[11px] text-slate-700 text-center shadow-[0_6px_18px_rgba(15,23,42,0.08)] backdrop-blur-sm md:text-xs">
          {chatScrollLabel}
        </div>
        <div className="relative h-20 md:h-24 w-[3px] md:w-1 rounded-full bg-slate-400/25 overflow-hidden backdrop-blur-sm">
          <div
            className="absolute left-0 right-0 h-7 md:h-8 rounded-full bg-slate-500/55"
            style={{ top: `${chatScrollProgress * 100}%`, transform: "translateY(-50%)" }}
          />
        </div>
      </div>
      <ChatMediaPreviewModal
        item={previewItem}
        onClose={closePreview}
        onAnnotate={(item) => {
          closePreview();
          openEditor(item);
        }}
        onEditImage={(item) => {
          closePreview();
          setAiEditItem(item);
        }}
      />
      <ImageAnnotationEditor
        open={Boolean(editorItem)}
        item={editorItem}
        onClose={closeEditor}
        onApply={async (file) => {
          if (!editorItem) return;
          await applyEditedMedia(editorItem.id, file);
          closeEditor();
          setFeedbackToast({ open: true, text: "Annotated image attached and ready to send." });
          requestAnimationFrame(() => {
            focusPromptInput();
            scrollToBottom("smooth");
          });
        }}
      />
      <AIImageEditModal
        open={Boolean(aiEditItem)}
        item={aiEditItem}
        onClose={() => setAiEditItem(null)}
        onApply={handleAiEditApply}
      />
      <ImageSearchPreviewModal result={imageSearchPreview} onClose={() => setImageSearchPreview(null)} />
    </div>
  );
}



