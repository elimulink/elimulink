import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  FileUp,
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
  Sparkles,
  LogOut,
  UserCircle2,
  Users,
  Wallet,
  Mic,
  MicOff,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { auth } from "../lib/firebase";
import { logoutFamilySession } from "../auth/familySession";
import { resolveWarmIdToken } from "../shared/auth/idTokenCache.js";
import {
  clearRegisteredPasskeys,
  getSecureUnlockCapabilities,
  registerPasskey,
} from "../auth/secureLock";
import { apiUrl } from "../lib/apiUrl";
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
import { askStudentLiveChat } from "../lib/liveChatApi.js";
import "../shared/audio/audio-ui.css";
import LiveMultimodalSessionContainerV2 from "../shared/live/LiveMultimodalSessionContainerV2.jsx";
import ImageSearchPreviewModal from "../shared/image-search/ImagePreviewModal.jsx";
import {
  deriveActiveTopic,
  detectFollowUpIntent,
  formatAiServiceError,
  normalizeInput,
  resolveContinuationPrompt,
} from "../shared/chat/chatResponseBehavior.js";
import { fetchAssistantReplyJson, streamAssistantReplySse } from "../shared/chat/aiChatClient.js";
import { buildAiChatRequestBody } from "../shared/chat/aiRequestBody.js";
import { buildVisualActionPlan, runVisualActionPlan } from "../shared/chat/visualActionEngine.js";
import ResearchActionsContainer from "../shared/research/ResearchActionsContainer.jsx";
import { normalizeResearchSources } from "../shared/research/researchUtils.js";
import ResponseBlockRenderer from "../shared/assistant-blocks/ResponseBlockRenderer.jsx";
import imageAPI from "../services/imageAPI.js";
import ImageComparisonPicker from "../shared/chat-media/ImageComparisonPicker.jsx";
import DesktopSettingsLauncher from "../shared/settings/DesktopSettingsLauncher.jsx";
import DesktopSettingsWorkspace from "../shared/settings/DesktopSettingsWorkspace.jsx";
import SettingsPage from "../pages/SettingsPage";
import NotebookPage from "../pages/NotebookPage";
import SubgroupRoom from "../pages/SubgroupRoom";
import CoursesDashboard from "../pages/CoursesDashboard";
import AssignmentsPage from "../pages/AssignmentsPage";
import ResultsPage from "../pages/ResultsPage";
import InstitutionFeesPage from "../pages/InstitutionFeesPage";

const MAIN_ITEMS = [
  { key: "newchat", label: "NewChat", icon: LayoutGrid },
  { key: "calendar", label: "Calendar", icon: CalendarDays },
  { key: "notebook", label: "Notebook", icon: NotebookPen },
  { key: "courses", label: "Courses", icon: BookOpen },
  { key: "assignments", label: "Assignments", icon: ClipboardList },
  { key: "results", label: "Results", icon: GraduationCap },
];

const COLLABORATION_ITEMS = [
  { key: "subgroups", label: "Tuition / Study Groups", icon: Users },
];

const SYSTEM_ITEMS = [
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
const UNTITLED_CHAT_BASE = "New Chat";

const STUDENT_CHAT_MODEL_OPTIONS = [
  {
    key: "elimulink-student-ai",
    label: "ElimuLink AI",
    description: "Current Student assistant model",
  },
];

function timeGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function resolveProfileName(firebaseUser) {
  const displayName = String(firebaseUser?.displayName || "").trim();
  if (displayName) return displayName;
  const email = String(firebaseUser?.email || "").trim();
  if (email.includes("@")) return email.split("@")[0].replace(/[._-]+/g, " ");
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

function makeChatId() {
  return `chat-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isUntitledChatTitle(title) {
  return /^New Chat(?: \d+)?$/i.test(String(title || "").trim());
}

function nextUntitledChatTitle(chats = []) {
  const used = new Set((chats || []).map((chat) => String(chat?.title || "").trim()));
  if (!used.has(UNTITLED_CHAT_BASE)) return UNTITLED_CHAT_BASE;
  let i = 2;
  while (used.has(`${UNTITLED_CHAT_BASE} ${i}`)) i += 1;
  return `${UNTITLED_CHAT_BASE} ${i}`;
}

function normalizeChatTitles(chats = []) {
  const used = new Set();
  let untitledCounter = 1;

  return chats.map((chat) => {
    const next = { ...(chat || {}) };
    let title = String(next.title || "").trim();

    if (!title || isUntitledChatTitle(title)) {
      let candidate = untitledCounter === 1 ? UNTITLED_CHAT_BASE : `${UNTITLED_CHAT_BASE} ${untitledCounter}`;
      while (used.has(candidate)) {
        untitledCounter += 1;
        candidate = untitledCounter === 1 ? UNTITLED_CHAT_BASE : `${UNTITLED_CHAT_BASE} ${untitledCounter}`;
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

function createDefaultChat(title = UNTITLED_CHAT_BASE, assistantText = "") {
  return {
    id: makeChatId(),
    title,
    sessionId: "",
    activeTopic: "",
    updatedAt: Date.now(),
    messages: assistantText ? [{ role: "assistant", text: assistantText }] : [],
  };
}

function StatCard({ title, value, subtitle }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-white border border-slate-200/90 shadow-sm px-3.5 py-2.5 min-h-[74px]">
      <div>
        <div className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">{title}</div>
        <div className="mt-0.5 text-lg leading-tight font-bold text-slate-900 break-words">{value}</div>
        {subtitle ? <div className="text-[11px] text-slate-500 mt-0.5">{subtitle}</div> : null}
      </div>
      <div className="text-slate-400 shrink-0 ml-3">
        <BarChart3 size={16} />
      </div>
    </div>
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

function isErrorText(text) {
  const value = String(text || "").toLowerCase();
  return value.includes("failed to reach ai service") || value.includes("error (");
}

function Bubble({
  role,
  text,
  imageUrl = "",
  imageVariant = "image",
  diagramLabel = "",
  diagramSubject = "",
  diagramType = "",
  comparisonImages = [],
  comparisonTitle = "Which image do you like more?",
  comparisonSelectedIndex = null,
  comparisonSkipped = false,
  onComparisonChoose,
  onComparisonSkip,
  imageSearchResults = [],
  imageSearchQuery = "",
  sources = [],
  chatTitle = "",
  chatId = "",
  messageId = "",
  onImagePreview,
  onGeneratedImagePreview,
  onImageReuse,
  onAssistantSpeak,
  onRetry,
  onLearnMore,
  onCopy,
  onEdit,
  isCopied,
}) {
  const isUser = role === "user";
  const isError = !isUser && isErrorText(text);
  const hasComparisonChoices = !isUser && Array.isArray(comparisonImages) && comparisonImages.length >= 2;
  const isComparisonPending = hasComparisonChoices && !String(imageUrl || "").trim() && !comparisonSkipped;
  const researchSources = useMemo(
    () => normalizeResearchSources({ sources, imageSearchResults, text }),
    [imageSearchResults, sources, text]
  );
  return (
    <div className={`group flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={[
          "text-base leading-relaxed",
          isUser
            ? "max-w-[88%] md:max-w-[72%] rounded-[20px] rounded-br-lg border border-sky-100/80 bg-sky-50/95 px-4 py-2.5 text-slate-900 shadow-[0_4px_14px_rgba(15,23,42,0.06)] dark:border-sky-400/15 dark:bg-sky-500/15 dark:text-slate-50"
            : "max-w-[98%] md:max-w-[82%] bg-transparent px-0 py-0.5 text-slate-900 dark:text-slate-100",
        ].join(" ")}
      >
        {!isUser && isComparisonPending ? (
          <div className="mb-3">
            <ImageComparisonPicker
              title={comparisonTitle}
              images={comparisonImages}
              selectedIndex={comparisonSelectedIndex}
              onChoose={onComparisonChoose}
              onSkip={onComparisonSkip}
            />
          </div>
        ) : null}

        {isUser ? (
          <div>{text}</div>
        ) : (
          <ResponseBlockRenderer
            text={text}
            imageUrl={imageUrl}
            imageVariant={imageVariant}
            diagramLabel={diagramLabel}
            diagramSubject={diagramSubject}
            diagramType={diagramType}
            webImageResults={imageSearchResults}
            webImageQuery={imageSearchQuery}
            sources={researchSources}
            onWebImagePreview={onImagePreview}
            onWebImageReuse={onImageReuse}
            onGeneratedImagePreview={onGeneratedImagePreview}
          />
        )}

        {!isUser ? (
          <div className="mt-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => onAssistantSpeak?.(text)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
              title="Play audio"
            >
              <Volume2 size={13} />
              Speak
            </button>
          </div>
        ) : null}

        {!isUser && String(text || "").trim() ? (
          <ResearchActionsContainer
            family="ai"
            app="student"
            conversationId={chatId}
            messageIds={messageId ? [messageId] : []}
            sources={researchSources}
            sharePayload={{
              app: "student",
              title: chatTitle || "ElimuLink AI chat",
              message: text,
              sources: researchSources,
            }}
          />
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
        "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
        collapsed ? "justify-center px-2" : "",
        active ? "bg-indigo-600 text-white shadow-sm" : "text-slate-700 hover:bg-slate-100",
      ].join(" ")}
      title={collapsed ? label : undefined}
    >
      <span className="text-base">{Icon ? <Icon size={16} /> : null}</span>
      {!collapsed ? <span className="truncate">{label}</span> : null}
    </button>
  );
}

function SectionLabel({ collapsed, children }) {
  if (collapsed) return null;
  return <div className="px-3 pt-2 text-[11px] font-semibold tracking-wider text-slate-500">{children}</div>;
}

function isDesktopSettingsViewport() {
  return typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches;
}

function isWarmSimplePrompt(text, attachments = []) {
  const clean = String(text || "").trim();
  if (!clean) return false;
  if ((Array.isArray(attachments) ? attachments.length : 0) > 0) return false;
  if (clean.length > 36) return false;
  if (/\n/.test(clean)) return false;
  if (/[/:]/.test(clean)) return false;
  if (/\b(?:http|www\.|attach|upload|image|photo|diagram|chart|pdf|file|citation|source|sources|research paper|references?)\b/i.test(clean)) return false;
  const wordCount = clean.split(/\s+/).filter(Boolean).length;
  if (wordCount > 10) return false;
  return /^[a-z0-9 ,.!?'()-]+$/i.test(clean);
}

function logStudentChatTiming(label, startedAt, meta = {}) {
  if (!import.meta.env.DEV) return;
  console.debug("[AI_TIMING][student][frontend]", {
    label,
    elapsedMs: Math.round(performance.now() - startedAt),
    ...meta,
  });
}

export default function StudentLanding() {
  const firebaseUser = auth?.currentUser || null;
  const profileName = resolveProfileName(firebaseUser);
  const welcomeText = buildWelcomeMessage(profileName);

  const [active, setActive] = useState("newchat");
  const [input, setInput] = useState("");
  const [chats, setChats] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(CHAT_HISTORY_KEY) || "[]");
      return Array.isArray(saved) && saved.length > 0
        ? normalizeChatTitles(saved)
        : [createDefaultChat(UNTITLED_CHAT_BASE, "")];
    } catch {
      return [createDefaultChat(UNTITLED_CHAT_BASE, "")];
    }
  });
  const [activeChatId, setActiveChatId] = useState(() => {
    try {
      return localStorage.getItem(CHAT_ACTIVE_KEY) || "";
    } catch {
      return "";
    }
  });
  const [isNewChatMenuOpen, setIsNewChatMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationsMenuOpen, setIsNotificationsMenuOpen] = useState(false);
  const [isDesktopSettingsLauncherOpen, setIsDesktopSettingsLauncherOpen] = useState(false);
  const [selectedDesktopSettingsSection, setSelectedDesktopSettingsSection] = useState("general");
  const [useDesktopSettingsWorkspace, setUseDesktopSettingsWorkspace] = useState(false);
  const [desktopSettingsReturnView, setDesktopSettingsReturnView] = useState("newchat");
  const [desktopSecurityVersion, setDesktopSecurityVersion] = useState(0);
  const [globalSearch, setGlobalSearch] = useState("");
  const [notifications, setNotifications] = useState(() => [
    {
      id: "n1",
      title: "New activity",
      detail: "Your recent chats are now saved in history.",
      read: false,
    },
    {
      id: "n2",
      title: "Assignments update",
      detail: "Assignment tools were updated with AI helper shortcuts.",
      read: false,
    },
  ]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(() => {
    try {
      return localStorage.getItem("sidebar_more_open") === "1";
    } catch {
      return false;
    }
  });
  const [isMorePopupOpen, setIsMorePopupOpen] = useState(false);
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [isAiModeOn, setIsAiModeOn] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [lastPrompt, setLastPrompt] = useState("");
  const [copiedMessageIndex, setCopiedMessageIndex] = useState(null);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [mobileSuggestionIndex, setMobileSuggestionIndex] = useState(0);
  const [selectedChatModelKey, setSelectedChatModelKey] = useState(
    STUDENT_CHAT_MODEL_OPTIONS[0]?.key || "elimulink-student-ai",
  );
  const recognitionRef = useRef(null);
  const attachmentMenuRef = useRef(null);
  const mobileModelMenuRef = useRef(null);
  const newChatMenuRef = useRef(null);
  const desktopSettingsTriggerRef = useRef(null);
  const profileMenuRef = useRef(null);
  const notificationsMenuRef = useRef(null);
  const globalSearchInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const promptInputRef = useRef(null);
  const lastSpokenRef = useRef({ text: "", at: 0 });

  const [imageSearchPreview, setImageSearchPreview] = useState(null);
  const galleryInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const scanInputRef = useRef(null);
  const {
    mediaItems: attachments,
    previewItem,
    editorItem,
    toastItem,
    addFiles: addCapturedFiles,
    removeMedia,
    applyEditedMedia,
    clearMedia,
    openPreview,
    openEditor,
    closePreview,
    closeEditor,
    dismissToast,
    handlePaste,
  } = useCapturedMedia();
  const [aiEditItem, setAiEditItem] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem("sidebar_more_open", isMoreOpen ? "1" : "0");
    } catch {
      // no-op
    }
  }, [isMoreOpen]);

  useEffect(() => {
    if (!isAttachmentMenuOpen) return;
    const onDocumentMouseDown = (event) => {
      if (!attachmentMenuRef.current) return;
      if (!attachmentMenuRef.current.contains(event.target)) {
        setIsAttachmentMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocumentMouseDown);
    return () => document.removeEventListener("mousedown", onDocumentMouseDown);
  }, [isAttachmentMenuOpen]);

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
    setMobileSuggestionIndex(0);
  }, [activeChatId]);

  useEffect(() => {
    try {
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(chats));
    } catch {
      // no-op
    }
  }, [chats]);

  useEffect(() => {
    if (activeChatId && chats.some((chat) => chat.id === activeChatId)) return;
    setActiveChatId(chats[0]?.id || "");
  }, [activeChatId, chats]);

  useEffect(() => {
    try {
      if (activeChatId) localStorage.setItem(CHAT_ACTIVE_KEY, activeChatId);
    } catch {
      // no-op
    }
  }, [activeChatId]);

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
  }, [updateActiveChatMessages]);

  const moreItems = useMemo(() => [...MORE_ITEMS_BASE], []);

  const moreKeys = moreItems.map((item) => item.key);

  const settingsProfile = useMemo(
    () =>
      getStoredProfile({
        name: profileName,
        email: firebaseUser?.email || "student@elimulink.co.ke",
        phone: "+2547xx xxx xxx",
        avatarUrl: "",
      }),
    [active, profileName, firebaseUser]
  );
  const settingsPrefs = useMemo(
    () =>
      getStoredPreferences({
        muteNotifications: false,
        keyboardShortcuts: false,
        language: "en",
      }),
    [active]
  );
  const audioPlayer = useAudioPlayer({
    uid: firebaseUser?.uid || null,
    appLanguage: settingsPrefs?.language || "en",
  });

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

  const quickPrompts = [
    { label: "Summarize Biology lecture", icon: "✨" },
    { label: "Explain Photosynthesis", icon: "🌿" },
    { label: "Prep for History 202 exam", icon: "📘" },
    { label: "Write assignment draft", icon: "📝" },
    { label: "Help me learn", icon: "🎓" },
  ];

  const activeChat = chats.find((chat) => chat.id === activeChatId) || chats[0];
  const messages = activeChat?.messages || [];
  const hasConversation = messages.length > 0;
  const hasUserMessages = messages.some((message) => message?.role === "user");
  const canSend = input.trim().length > 0 || attachments.length > 0;
  const hasText = input.trim().length > 0;
  const activeChatModel =
    STUDENT_CHAT_MODEL_OPTIONS.find((model) => model.key === selectedChatModelKey) ||
    STUDENT_CHAT_MODEL_OPTIONS[0];
  const mobileSuggestionPool = useMemo(
    () => Array.from(new Set(quickPrompts.map((item) => String(item.label || "").trim()).filter(Boolean))),
    [quickPrompts],
  );
  const showMobileRotatingSuggestion =
    isMobile &&
    active === "newchat" &&
    !hasConversation &&
    !hasUserMessages &&
    !hasText &&
    !isAttachmentMenuOpen &&
    !isModelMenuOpen &&
    !isMobileDrawerOpen &&
    !voiceOpen &&
    mobileSuggestionPool.length > 0;
  const activeMobileSuggestion =
    mobileSuggestionPool.length > 0
      ? mobileSuggestionPool[mobileSuggestionIndex % mobileSuggestionPool.length]
      : "";
  const showMobileEntryGlow =
    isMobile &&
    active === "newchat" &&
    !hasConversation &&
    !hasText &&
    !isAttachmentMenuOpen &&
    !isModelMenuOpen &&
    !isMobileDrawerOpen &&
    !voiceOpen;
  const unreadNotifications = notifications.filter((item) => !item.read).length;

  useEffect(() => {
    if (!showMobileRotatingSuggestion || mobileSuggestionPool.length <= 1) return;
    const id = window.setInterval(() => {
      setMobileSuggestionIndex((current) => (current + 1) % mobileSuggestionPool.length);
    }, 5200);
    return () => window.clearInterval(id);
  }, [mobileSuggestionPool.length, showMobileRotatingSuggestion]);
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
  const desktopSharedLinksItems = useMemo(() => {
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
        type: "Conversation",
        dateShared: chat.updatedAt || Date.now(),
        url: String(chat.shareUrl || ""),
        canDelete: false,
      }));
  }, [chats]);
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
  const desktopArchivedChatsItems = useMemo(
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
  const profileInitials = initialsOf(user.name);
  const isMobile = useMemo(
    () => (typeof window !== "undefined" ? window.matchMedia("(max-width: 768px)").matches : false),
    []
  );
  const universityTitle = `ElimuLink • ${settingsProfile?.department || settingsProfile?.organization || "University"}`;

  const handleDesktopArchivedChatOpen = useCallback((item) => {
    const nextChatId = String(item?.chatId || item?.id || "");
    if (!nextChatId) return;
    setActiveChatId(nextChatId);
    setUseDesktopSettingsWorkspace(false);
  }, []);

  const handleDesktopArchivedChatRestore = useCallback(async (item) => {
    const nextChatId = String(item?.chatId || item?.id || "");
    if (!nextChatId) return;
    setChats((current) =>
      current.map((chat) =>
        String(chat.id || "") === nextChatId
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
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, activeChatId]);

  function updateActiveChatMessages(updater, titleHint) {
    const currentId = activeChat?.id;
    if (!currentId) return;
    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id !== currentId) return chat;
        let cursor = Date.now();
        const nextMessages = (updater(chat.messages || []) || []).map((message) => {
          if (message?.createdAt) {
            cursor = Math.max(cursor, Number(message.createdAt));
            return message;
          }
          cursor += 1;
          return { ...(message || {}), createdAt: cursor };
        });
        const currentTitle = String(chat.title || "").trim();
        const nextTitle =
          isUntitledChatTitle(currentTitle) && titleHint
            ? titleHint.slice(0, 40)
            : currentTitle || nextUntitledChatTitle(prev);
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

  function updateActiveChatSessionId(sessionId) {
    const nextSessionId = String(sessionId || "").trim();
    if (!nextSessionId || !activeChat?.id) return;
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === activeChat.id && String(chat?.sessionId || "").trim() !== nextSessionId
          ? { ...chat, sessionId: nextSessionId, updatedAt: Date.now() }
          : chat
      )
    );
  }

  function appendAssistantPlaceholder(streamId) {
    const now = Date.now();
    updateActiveChatMessages(
      (messages) => [...messages, { role: "assistant", text: "", streaming: true, streamId, createdAt: now }],
      "Reply"
    );
  }

  function updateStreamingAssistant(streamId, updater) {
    updateActiveChatMessages((messages) => {
      const idx = messages.findIndex((item) => item?.streamId === streamId);
      if (idx < 0) return messages;
      const next = [...messages];
      const current = next[idx];
      const nextText = updater(String(current?.text || ""));
      next[idx] = { ...current, text: nextText, streaming: true };
      return next;
    }, "Reply");
  }

  function finalizeStreamingAssistant(streamId, text, meta = {}) {
    updateActiveChatMessages((messages) => {
      const idx = messages.findIndex((item) => item?.streamId === streamId);
      if (idx < 0) {
        return [...messages, { role: "assistant", text, sources: meta.sources || [], createdAt: Date.now() }];
      }
      const next = [...messages];
      const current = next[idx] || {};
      next[idx] = {
        ...current,
        role: "assistant",
        text,
        sources: meta.sources || current.sources || [],
        streaming: false,
      };
      return next;
    }, "Reply");
  }

  function buildStudentRequestBody({ messageText, requestIntelligence = null }) {
    return buildAiChatRequestBody({
      messageText,
      appType: "student",
      sessionId: activeChat?.sessionId,
      requestIntelligence,
      extras: {
        preferredLanguage: String(settingsPrefs?.language || "en"),
      },
    });
  }

  async function streamAssistantReply({ token, messageText, streamId, timingStarted = 0, requestIntelligence = null }) {
    return streamAssistantReplySse({
      path: "/api/ai/student",
      token,
      body: buildStudentRequestBody({ messageText, requestIntelligence }),
      timingStarted,
      onChunk: (delta) => {
        updateStreamingAssistant(streamId, (prev) => `${prev}${delta}`);
      },
      onComplete: ({ sessionId, text, sources }) => {
        updateActiveChatSessionId(sessionId);
        finalizeStreamingAssistant(streamId, text, { sources });
      },
    });
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
    setActive("settings");
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
    window.location.replace("/login?returnTo=%2Fstudent");
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

  function toggleNotificationsMenu() {
    setIsNotificationsMenuOpen((prev) => !prev);
    setIsProfileMenuOpen(false);
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

    setActive("newchat");
    if (matchingChat?.id) {
      setActiveChatId(matchingChat.id);
      setGlobalSearch("");
      return;
    }

    setInput(query);
    setGlobalSearch("");
    setTimeout(() => promptInputRef.current?.focus(), 0);
  }

  async function handleLogout() {
    setIsProfileMenuOpen(false);
    await logoutFamilySession({
      clearKeys: ["activeDepartmentId", "activeDepartmentName", "elimulink_admin_token"],
    });
    window.location.href = "/login?returnTo=%2Fstudent";
  }

  function startNewChat() {
    const next = createDefaultChat(nextUntitledChatTitle(chats), "");
    setChats((prev) => [next, ...prev]);
    setActiveChatId(next.id);
    setActive("newchat");
    setIsNewChatMenuOpen(false);
  }

  function renameChatById(chatId) {
    const target = chats.find((chat) => chat.id === chatId);
    if (!target) return;
    const nextTitle = window.prompt("Rename chat", target.title || UNTITLED_CHAT_BASE);
    if (!nextTitle || !nextTitle.trim()) return;
    setChats((prev) =>
      prev.map((chat) => (chat.id === chatId ? { ...chat, title: nextTitle.trim() } : chat))
    );
  }

  function deleteChatById(chatId) {
    setChats((prev) => {
      const filtered = prev.filter((chat) => chat.id !== chatId);
      if (filtered.length === 0) {
        const fallback = createDefaultChat(UNTITLED_CHAT_BASE, "");
        setActiveChatId(fallback.id);
        return [fallback];
      }
      if (activeChatId === chatId) setActiveChatId(filtered[0].id);
      return filtered;
    });
  }

  function addFiles(fileList) {
    addCapturedFiles(fileList, "file");
  }

  function removeAttachment(id) {
    removeMedia(id);
  }

  function openAttachmentItem(item) {
    if (!item) return;
    openPreview(item);
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
          },
        ],
        "Edited image"
      );
    }
  }

  function toggleMic() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      updateActiveChatMessages(
        (m) => [...m, { role: "assistant", text: "Microphone is not supported in this browser." }],
        "Microphone support"
      );
      return;
    }

    if (!recognitionRef.current) {
      const recognition = new SpeechRecognition();
      recognition.lang = resolveSpeechLanguage(settingsPrefs?.language);
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
      recognitionRef.current.lang = resolveSpeechLanguage(settingsPrefs?.language);
      recognitionRef.current.start();
      setIsListening(true);
    } catch {
      setIsListening(false);
    }
  }

  const handleImageComparisonChoice = useCallback((messageId, choiceIndex, { skipped = false } = {}) => {
    if (!messageId) return;
    updateActiveChatMessages((chatMessages) =>
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
          imageVariant: message.imageVariant || "image",
          diagramLabel: message.diagramLabel || "",
          diagramSubject: message.diagramSubject || "",
          diagramType: message.diagramType || "",
          type: "image",
          text: choiceIndex === 0 ? "Thanks — I’ll continue with image 1." : "Got it — using image 2.",
        };
      })
    );
  }, []);

  async function sendMessage(text) {
    const pendingAttachments = attachments;
    const clean = text.trim();
    if (!clean && pendingAttachments.length === 0) return;

    const normalizedInput = normalizeInput(clean);
    const earlyFollowUpIntent = detectFollowUpIntent(normalizedInput.normalizedText || clean);
    const earlyContinuationCandidate = clean
      ? resolveContinuationPrompt(normalizedInput.normalizedText || clean, messages)
      : "";
    const hasStructuredContinuation =
      Boolean(earlyContinuationCandidate) &&
      earlyContinuationCandidate !== (normalizedInput.normalizedText || clean);
    const warmSimplePrompt =
      isWarmSimplePrompt(clean, pendingAttachments) &&
      !earlyFollowUpIntent.followUp &&
      !hasStructuredContinuation;
    const previousAssistantMessage = String(
      [...(Array.isArray(messages) ? messages : [])]
        .reverse()
        .find((message) => message?.role === "assistant")?.text || ""
    ).trim();
    const currentTopic = deriveActiveTopic(messages, activeChat?.activeTopic || "");
    const shouldReuseConversationContext = hasStructuredContinuation || earlyFollowUpIntent.followUp;
    const requestIntelligence = {
      originalMessage: clean,
      normalizedMessage: normalizedInput.changed ? normalizedInput.normalizedText : "",
      topic: shouldReuseConversationContext ? currentTopic : "",
      followUp: shouldReuseConversationContext ? earlyFollowUpIntent.followUp : false,
      followUpType: earlyFollowUpIntent.followUpType,
      targetLanguage: earlyFollowUpIntent.targetLanguage,
      previousAssistantMessage: shouldReuseConversationContext ? previousAssistantMessage : "",
    };
    if (warmSimplePrompt) {
      const streamId = `stream-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      updateActiveChatMessages(
        (m) => [
          ...m,
          { role: "user", text: clean, createdAt: Date.now(), streaming: false },
          { role: "assistant", text: "", streaming: true, streamId, createdAt: Date.now() },
        ],
        clean || "New Chat"
      );
      if (clean) setLastPrompt(clean);
      setInput("");
      clearMedia();
      requestAnimationFrame(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }));
      await new Promise((resolve) => requestAnimationFrame(() => resolve()));

      try {
        logStudentChatTiming("token_fetch_start", performance.now(), { simplePrompt: true });
        const token = await resolveWarmIdToken(auth);
        logStudentChatTiming("token_fetch_done", performance.now(), {
          simplePrompt: true,
          hasToken: Boolean(token),
        });
        if (!token) {
          finalizeStreamingAssistant(streamId, "Please sign in to use AI chat.");
          return;
        }

        logStudentChatTiming("request_sent", performance.now(), { simplePrompt: true });
        const streamResult = await streamAssistantReply({
          token,
          messageText: clean,
          streamId,
          requestIntelligence,
        });
        if (streamResult.ok) {
          updateActiveChatSessionId(streamResult.sessionId);
          return;
        }

        const result = await fetchAssistantReplyJson({
          path: "/api/ai/student",
          token,
          body: buildStudentRequestBody({ messageText: clean, requestIntelligence }),
        });
        if (!result.ok) {
          const code = result?.result?.code || result?.result?.error || `HTTP_${result.status}`;
          const message = result?.result?.message || code;
          finalizeStreamingAssistant(
            streamId,
            formatAiServiceError({ backendHealthy: true, status: result.status, message })
          );
          return;
        }
        updateActiveChatSessionId(result.sessionId);
        finalizeStreamingAssistant(streamId, result.text, { sources: result.sources });
      } catch {
        finalizeStreamingAssistant(streamId, formatAiServiceError({ backendHealthy: true }));
      }
      return;
    }

    const requestText = hasStructuredContinuation
      ? earlyContinuationCandidate
      : normalizedInput.normalizedText || clean;
    const visualActionPlan = buildVisualActionPlan({
      requestText,
      messages,
      pendingAttachmentCount: pendingAttachments.length,
      imageAPI,
    });

    const attachSummary =
      pendingAttachments.length > 0
        ? `\n\nAttachments:\n${pendingAttachments.map((a) => `- ${a.name}`).join("\n")}`
        : "";

    updateActiveChatMessages(
      (m) => [...m, { role: "user", text: (clean || "Sent attachments") + attachSummary }],
      clean || "New Chat"
    );
    if (clean) setLastPrompt(clean);
    setInput("");
    clearMedia();

    if (
      await runVisualActionPlan({
        plan: visualActionPlan,
        requestText,
        clean,
        messages,
        imageAPI,
        updateMessages: updateActiveChatMessages,
        labels: {
          generateImage: "Image generation",
          both: "Visual explanation",
          edit: "Image editing",
          search: "Web image search",
          edited: "Edited image",
        },
      })
    ) {
      return;
    }

    try {
      logStudentChatTiming("token_fetch_start", performance.now(), { simplePrompt: false });
      const token = await resolveWarmIdToken(auth);
      logStudentChatTiming("token_fetch_done", performance.now(), {
        simplePrompt: false,
        hasToken: Boolean(token),
      });
      if (!token) {
        updateActiveChatMessages(
          (m) => [...m, { role: "assistant", text: "Please sign in to use AI chat." }],
          clean || "Sign in"
        );
        return;
      }

      let response;
      if (pendingAttachments.length > 0) {
        const formData = new FormData();
        formData.append("message", clean || "Sent attachments");
        formData.append("preferredLanguage", String(settingsPrefs?.language || "en"));
        pendingAttachments.forEach((a) => {
          if (a?.file instanceof File) formData.append("files", a.file, a.name);
        });
        response = await fetch(apiUrl("/api/chat/upload"), {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
      } else {
        response = await fetch(apiUrl("/api/chat"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(buildStudentRequestBody({ messageText: requestText, requestIntelligence })),
        });
      }

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const code = result?.code || result?.error || `HTTP_${response.status}`;
        const message = result?.message || code;
        updateActiveChatMessages(
          (m) => [
            ...m,
            {
              role: "assistant",
              text: formatAiServiceError({ backendHealthy: true, status: response.status, message }),
            },
          ],
          clean || "Error"
        );
        return;
      }

      const reply = result?.text || result?.reply || result?.data?.reply || "Response received.";
      updateActiveChatSessionId(result?.data?.session_id || result?.session_id);
      updateActiveChatMessages(
        (m) => [...m, { role: "assistant", text: reply, sources: normalizeResearchSources(result) }],
        clean || "Reply"
      );
    } catch {
      updateActiveChatMessages(
        (m) => [
          ...m,
          { role: "assistant", text: formatAiServiceError({ backendHealthy: true }) },
        ],
        clean || "Request failed"
      );
    }
  }

  async function requestLiveVoiceReply(spokenText, liveContext = null) {
    const clean = String(spokenText || "").trim();
    if (!clean) return "";

    updateActiveChatMessages(
      (messages) => [...messages, { role: "user", text: clean }],
      clean || "Live voice"
    );
    if (clean) setLastPrompt(clean);

    try {
      const result = await askStudentLiveChat({
        text: resolveContinuationPrompt(clean, messages),
        context: {
          ...liveContext,
          preferredLanguage: String(settingsPrefs?.language || "en"),
        },
      });
      const reply = String(result?.text || result?.reply || result?.data?.reply || "Response received.").trim() || "Response received.";
      updateActiveChatMessages(
        (messages) => [
          ...messages,
          { role: "assistant", text: reply, sources: normalizeResearchSources(result) },
        ],
        clean || "Reply"
      );
      return reply;
    } catch {
      const errorText = formatAiServiceError({ backendHealthy: true });
      updateActiveChatMessages(
        (messages) => [...messages, { role: "assistant", text: errorText }],
        "Request failed"
      );
      return errorText;
    }
  }

  function speakAssistantText(text) {
    if (!text) return;
    const now = Date.now();
    const normalized = String(text).trim();
    if (!normalized) return;
    if (lastSpokenRef.current.text === normalized && now - lastSpokenRef.current.at < 2500) return;
    audioPlayer.playText(normalized);
    lastSpokenRef.current = { text: normalized, at: now };
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
    setTimeout(() => promptInputRef.current?.focus(), 0);
  }

  function handleNavClick(itemKey) {
    setIsMorePopupOpen(false);
    setIsMobileMoreOpen(false);
    setIsNewChatMenuOpen(false);
    setIsProfileMenuOpen(false);
    setIsNotificationsMenuOpen(false);

    setActive(itemKey);
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
    if (!isMobile) return;
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
            setActive(desktopSettingsReturnView || "newchat");
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
            sharedLinksMode: desktopSharedLinksItems.length ? "partial" : "preview",
            archivedChatsItems: desktopArchivedChatsItems,
            archivedChatsMode: desktopArchivedChatsItems.length ? "partial" : "preview",
            onOpenArchivedChat: handleDesktopArchivedChatOpen,
            onRestoreArchivedChat: handleDesktopArchivedChatRestore,
          }}
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
        onBack={() => setActive("newchat")}
        launcherSectionId={selectedDesktopSettingsSection}
        pageTitle="Student Settings"
        pageDescription="Manage your public student profile, preferences, and study workspace."
      />
    );
  }

  if (active === "notebook") {
    return (
      <NotebookPage
        onBack={() => setActive("newchat")}
        onOpenLive={() => setVoiceOpen(true)}
      />
    );
  }

  if (active === "subgroups") {
    return <SubgroupRoom onBack={() => setActive("newchat")} />;
  }

  if (active === "courses") {
    return <CoursesDashboard onBack={() => setActive("newchat")} audience="student" />;
  }

  if (active === "assignments") {
    return <AssignmentsPage audience="student" />;
  }

  if (active === "results") {
    return <ResultsPage audience="student" />;
  }

  if (active === "fees") {
    return <InstitutionFeesPage onBack={() => setActive("newchat")} audience="student" />;
  }

  return (
    <div className="min-h-[100dvh] h-[100dvh] bg-slate-50 flex flex-col overflow-hidden dark:bg-[#020617]">
      {isMobile ? (
        <div className="sticky top-0 z-40 bg-white/92 backdrop-blur-xl border-b border-slate-200/70 px-4 py-3 flex items-center justify-between dark:border-white/10 dark:bg-slate-950/88">
          <div className="font-semibold text-slate-900 truncate dark:text-white">{universityTitle}</div>
          <div className="flex items-center gap-2">
          <div ref={notificationsMenuRef} className="relative">
            <button
              onClick={toggleNotificationsMenu}
              className="h-9 w-9 rounded-full hover:bg-slate-100 grid place-items-center text-slate-700 relative"
              title="Notifications"
            >
              <Bell size={18} />
              {unreadNotifications > 0 ? (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-sky-500 text-white text-[10px] font-semibold leading-[18px] px-1">
                  {unreadNotifications > 9 ? "9+" : unreadNotifications}
                </span>
              ) : null}
            </button>

            {isNotificationsMenuOpen ? (
              <div className="absolute right-0 top-12 w-80 rounded-xl border border-slate-200 bg-white p-2 space-y-2 shadow-xl">
                <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-semibold tracking-wider text-slate-500">NOTIFICATIONS</div>
                    <div className="text-xs text-slate-600">
                      {settingsPrefs.muteNotifications ? "Muted from Settings" : "Recent updates"}
                    </div>
                  </div>
                  {!settingsPrefs.muteNotifications ? (
                    <button
                      onClick={() => setNotifications((prev) => prev.map((item) => ({ ...item, read: true })))}
                      className="text-xs font-semibold text-slate-700 hover:text-slate-900"
                    >
                      Mark all read
                    </button>
                  ) : null}
                </div>

                <div className="max-h-64 overflow-auto smart-scrollbar space-y-1">
                  {settingsPrefs.muteNotifications ? (
                    <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-sm text-slate-700">
                      Notifications are muted.
                      <button
                        onClick={openSettingsPanel}
                        className="ml-2 text-slate-900 font-semibold underline"
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
                            ? "bg-slate-50 border-slate-200 text-slate-800"
                            : "bg-indigo-600 text-white border-indigo-500",
                        ].join(" ")}
                      >
                        <div className="text-sm font-semibold">{item.title}</div>
                        <div className={item.read ? "text-xs text-slate-600" : "text-xs text-indigo-100"}>
                          {item.detail}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <div ref={profileMenuRef} className="relative">
            <button
              onClick={toggleProfileMenu}
              className="h-9 w-9 rounded-full bg-slate-200 overflow-hidden grid place-items-center text-slate-700"
              title="Profile"
            >
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs font-semibold">{profileInitials}</span>
              )}
            </button>

            {isProfileMenuOpen ? (
              <div className="absolute right-0 top-12 w-64 rounded-xl border border-slate-200 bg-white shadow-xl p-2">
                <div className="px-3 py-2 border-b border-slate-200">
                  <div className="text-sm font-semibold text-slate-900">{user.name}</div>
                  <div className="text-xs text-slate-500">{user.email}</div>
                </div>
                <div className="mt-2 space-y-1">
                  <button
                    onClick={openSettingsPanel}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-100"
                  >
                    Settings
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-rose-600 hover:bg-rose-50"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      ) : null}

      {!isMobile ? (
        <div className="w-full px-3 md:px-4 pt-2 pb-1 shrink-0">
        <div className="h-12 rounded-xl border border-slate-200 bg-white/95 shadow-sm px-2.5 md:px-3 flex items-center gap-2">
          <button
            className="md:hidden h-9 w-9 rounded-lg bg-white border border-slate-200 shadow-sm hover:bg-slate-50"
            onClick={() => setIsMobileDrawerOpen(true)}
            title="Open menu"
          >
            <Menu size={16} className="mx-auto text-slate-700" />
          </button>

          <div className="hidden md:flex items-center gap-2 shrink-0">
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-slate-800"
              title="Home"
            >
              <span className="h-6 w-6 rounded-md bg-emerald-500 text-white text-xs font-semibold inline-flex items-center justify-center">
                E
              </span>
              <ChevronDown size={14} className="text-slate-500" />
            </button>
            <button
              className="h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 inline-flex items-center justify-center"
              title="Calendar"
              onClick={() => handleNavClick("calendar")}
            >
              <CalendarDays size={14} />
            </button>
          </div>

          <div className="hidden md:flex flex-1 min-w-0 items-center justify-center">
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
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
                className="w-[58vw] min-w-[180px] max-w-[520px] h-9 rounded-full border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
              />
            </div>
          </div>

          <div className="hidden xl:flex items-center gap-1 mr-1">
            <button
              className="h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-100 inline-flex items-center justify-center"
              title="New Chat"
              onClick={startNewChat}
            >
              <Check size={16} />
            </button>
            <button
              className="h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-100 inline-flex items-center justify-center"
              title="Notebook"
              onClick={() => handleNavClick("notebook")}
            >
              <NotebookPen size={16} />
            </button>
            <button
              className="h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-100 inline-flex items-center justify-center"
              title="Courses"
              onClick={() => handleNavClick("courses")}
            >
              <BookOpen size={16} />
            </button>
            <button
              className="h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-100 inline-flex items-center justify-center"
              title="Results"
              onClick={() => handleNavClick("results")}
            >
              <BarChart3 size={16} />
            </button>
          </div>

          <div ref={notificationsMenuRef} className="relative">
            <button
              onClick={toggleNotificationsMenu}
              className="h-9 w-9 rounded-full bg-white border border-slate-200 shadow-sm hover:bg-slate-50 text-slate-700 relative"
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

          <div ref={profileMenuRef} className="relative">
            <button
              onClick={toggleProfileMenu}
              className="h-9 w-9 rounded-full overflow-hidden bg-white border border-slate-200 shadow-sm hover:bg-slate-50 text-slate-700 inline-flex items-center justify-center"
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

      {isMobileDrawerOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsMobileDrawerOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 bg-white/94 shadow-[0_20px_48px_rgba(15,23,42,0.22)] backdrop-blur-2xl">
            <div className="px-4 py-4 border-b border-slate-200/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-xl bg-gradient-to-br from-sky-400 via-indigo-500 to-fuchsia-500 shadow-[0_0_20px_rgba(99,102,241,0.35)]" />
                <div className="font-semibold text-slate-800">Home</div>
              </div>
              <button
                className="h-9 w-9 rounded-2xl bg-slate-100/70 text-slate-700 transition hover:bg-slate-100"
                onClick={() => setIsMobileDrawerOpen(false)}
              >
                <X size={16} className="mx-auto" />
              </button>
            </div>

            <nav className="p-2 space-y-3">
              <div className="space-y-1">
                <div className="px-3 pt-1 text-[11px] font-semibold tracking-wider text-slate-500">MAIN</div>
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
                                setActive("newchat");
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
                                {chat.title || UNTITLED_CHAT_BASE}
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
                <div className="px-3 pt-1 text-[11px] font-semibold tracking-wider text-slate-500">COLLABORATION</div>
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
                <div className="px-3 pt-1 text-[11px] font-semibold tracking-wider text-slate-500">SYSTEM</div>
                {SYSTEM_ITEMS.map((item) => (
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

      <div className="w-full px-4 md:px-6 pt-3 pb-6 grid grid-cols-12 gap-6 flex-1 min-h-0 overflow-hidden">
        <aside
          className={[
            "hidden md:block col-span-12 min-h-0",
            isSidebarOpen ? "md:col-span-3 lg:col-span-3" : "md:col-span-1 lg:col-span-1",
          ].join(" ")}
        >
          <div
            className={[
              "rounded-2xl bg-white border border-slate-200 shadow-sm overflow-visible transition-[width] duration-200 h-full flex flex-col",
              isSidebarOpen ? "w-full" : "w-[72px]",
            ].join(" ")}
          >
            <div className="relative px-3 py-3 bg-slate-50 border-b border-slate-200 flex items-center">
              {isSidebarOpen ? (
                <div className="flex items-center gap-2">
                  <div className="relative h-7 w-7 rounded-xl bg-gradient-to-br from-sky-400 via-indigo-500 to-fuchsia-500 shadow-[0_0_20px_rgba(99,102,241,0.35)]" />
                  <div className="text-base font-semibold text-slate-800">Home</div>
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
                  "absolute -right-3 top-1/2 -translate-y-1/2",
                  "h-9 w-9 rounded-full",
                  "border border-slate-200 bg-white shadow-sm",
                  "hover:bg-slate-100 text-slate-700",
                  "flex items-center justify-center",
                ].join(" ")}
                title={isSidebarOpen ? "Collapse" : "Expand"}
              >
                {isSidebarOpen ? "‹" : "›"}
              </button>
            </div>

            <nav className="p-2 space-y-3 relative flex-1 overflow-y-auto overflow-x-visible smart-scrollbar">
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
                        className="h-9 w-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 inline-flex items-center justify-center shrink-0"
                        title="Chat actions"
                      >
                        <Ellipsis size={16} />
                      </button>
                    ) : null}
                  </div>

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
                                setActive("newchat");
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
                                {chat.title || UNTITLED_CHAT_BASE}
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

                {SYSTEM_ITEMS.map((item) => (
                  <SidebarButton
                    key={item.key}
                    label={item.label}
                    icon={item.icon}
                    active={active === item.key}
                    collapsed={!isSidebarOpen}
                    onClick={() => handleNavClick(item.key)}
                  />
                ))}

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
                  <div className="absolute left-[74px] bottom-2 w-56 rounded-2xl bg-white border border-slate-200 shadow-lg p-2 z-20">
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

        <main
          className={[
            "col-span-12 min-w-0 flex flex-col overflow-hidden min-h-0",
            isSidebarOpen ? "md:col-span-9 lg:col-span-9" : "md:col-span-11 lg:col-span-11",
          ].join(" ")}
        >
          <div className="hidden">
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => addFiles(e.target.files)}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => addFiles(e.target.files)}
            />
            <input
              ref={scanInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => addFiles(e.target.files)}
            />
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={(e) => addFiles(e.target.files)}
            />
          </div>

          {isMobile ? (
          <div className="flex flex-col min-h-[calc(100dvh-56px)] bg-slate-50 dark:bg-[#020617]">
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-28">
              {messages.length === 0 ? (
                <div className="rounded-[28px] border border-slate-200/70 bg-white/72 px-5 py-4 shadow-[0_18px_48px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]">
                  <div className="text-sm font-medium text-slate-500 dark:text-slate-400">{timeGreeting()}</div>
                  <div className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-slate-900 dark:text-white">
                    Hi {firstNameOf(user.name)}, where should we start?
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Ask anything about coursework, assignments, revision, or research.
                  </div>
                </div>
              ) : null}

              {messages.map((m, idx) => (
                <Bubble
                  key={idx}
                  role={m.role}
                  text={m.text}
                  imageUrl={m.imageUrl || (m.type === "image" ? m.content || "" : "")}
                  imageVariant={m.imageVariant || "image"}
                  diagramLabel={m.diagramLabel || ""}
                  diagramSubject={m.diagramSubject || ""}
                  diagramType={m.diagramType || ""}
                  comparisonImages={m.imageOptions || []}
                  comparisonTitle={m.comparisonTitle || "Which image do you like more?"}
                  comparisonSelectedIndex={m.comparisonSelectedIndex ?? null}
                  comparisonSkipped={Boolean(m.comparisonSkipped)}
                  onComparisonChoose={(choiceIndex) => handleImageComparisonChoice(m.id, choiceIndex)}
                  onComparisonSkip={() => handleImageComparisonChoice(m.id, null, { skipped: true })}
                  imageSearchResults={m.imageSearchResults || []}
                  imageSearchQuery={m.imageSearchQuery || ""}
                  sources={m.sources || []}
                  chatId={activeChat?.conversationId || ""}
                  messageId={m.id || ""}
                  chatTitle={activeChat?.title || UNTITLED_CHAT_BASE}
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
                  onImageReuse={(result) => setInput(`Use this image in my workspace/report flow:\nTitle: ${result.title}\nSource: ${result.link}`)}
                  onAssistantSpeak={speakAssistantText}
                  onRetry={() => {
                    if (lastPrompt) sendMessage(lastPrompt);
                  }}
                  onLearnMore={() => sendMessage("Learn more about the error and how I can fix it.")}
                  onCopy={() => copyPromptText(idx, m.text)}
                  onEdit={m.role === "user" ? () => editPromptText(m.text) : undefined}
                  isCopied={copiedMessageIndex === idx}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="fixed left-0 right-0 bottom-0 bg-[linear-gradient(180deg,rgba(255,255,255,0),rgba(248,250,252,0.92)_36%,rgba(248,250,252,0.98)_100%)] px-4 pt-2 pb-[calc(14px+env(safe-area-inset-bottom))] dark:bg-[linear-gradient(180deg,rgba(2,6,23,0),rgba(2,6,23,0.9)_36%,rgba(2,6,23,0.98)_100%)]">
              <div ref={attachmentMenuRef} className="relative max-w-xl mx-auto space-y-2">
                {showMobileEntryGlow ? (
                  <>
                    <div className="pointer-events-none fixed left-0 top-[14%] z-[38] h-[62vh] w-7 rounded-r-full bg-[linear-gradient(180deg,rgba(168,85,247,0.0),rgba(168,85,247,0.35),rgba(14,165,233,0.28),rgba(168,85,247,0.0))] blur-[10px] opacity-90 elu-mobile-entry-glow" />
                    <div className="pointer-events-none fixed right-0 top-[14%] z-[38] h-[62vh] w-7 rounded-l-full bg-[linear-gradient(180deg,rgba(251,146,60,0.0),rgba(251,146,60,0.36),rgba(14,165,233,0.24),rgba(251,146,60,0.0))] blur-[10px] opacity-90 elu-mobile-entry-glow" />
                  </>
                ) : null}

                {showMobileRotatingSuggestion && activeMobileSuggestion ? (
                  <div className="px-1">
                    <button
                      key={activeMobileSuggestion}
                      type="button"
                      onClick={() => setInput(activeMobileSuggestion)}
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
                      onClick={() => {
                        setIsAttachmentMenuOpen(false);
                        setIsModelMenuOpen((value) => !value);
                      }}
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
                      {STUDENT_CHAT_MODEL_OPTIONS.map((modelOption) => {
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
                            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
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
                    "rounded-[24px] border px-2 py-1.5 backdrop-blur-xl transition-all duration-300",
                    showMobileEntryGlow
                      ? "border-sky-200/80 bg-white/92 shadow-[0_0_0_1px_rgba(14,165,233,0.08),0_18px_44px_rgba(14,165,233,0.18)] dark:border-sky-400/20 dark:bg-white/[0.07] dark:shadow-[0_0_0_1px_rgba(14,165,233,0.1),0_24px_48px_rgba(2,132,199,0.14)]"
                      : "border-slate-200/90 bg-white/95 shadow-[0_12px_28px_rgba(15,23,42,0.10)] dark:border-white/[0.12] dark:bg-white/[0.06] dark:shadow-[0_14px_30px_rgba(0,0,0,0.28)]",
                  ].join(" ")}
                >
                <AttachmentChipsTray
                  items={attachments}
                  onPreview={openAttachmentItem}
                  onRemove={removeAttachment}
                />
                <div className="flex items-end gap-2">
                  <button
                    onClick={() => {
                      setIsModelMenuOpen(false);
                      setIsAttachmentMenuOpen((value) => !value);
                    }}
                    className="h-10 w-10 rounded-[18px] border border-slate-200/90 bg-slate-50 text-[#1f3654] grid place-items-center dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-100"
                    title="Add attachment"
                    aria-expanded={isAttachmentMenuOpen}
                  >
                    <Plus size={20} />
                  </button>

                <div className="flex-1 px-1.5 py-1">
                  <textarea
                    ref={promptInputRef}
                    rows={1}
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      setIsModelMenuOpen(false);
                      if (e.target.value.trim()) setIsAttachmentMenuOpen(false);
                    }}
                    onPaste={handlePaste}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage(input);
                      }
                    }}
                    className="composer-plain-input min-h-[40px] max-h-[120px] w-full resize-none border-none bg-transparent py-2 text-[15px] leading-6 text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
                    placeholder="Type your message..."
                  />
                </div>

                <button
                  onClick={() => canSend && sendMessage(input)}
                  disabled={!canSend}
                  className={[
                    "h-10 w-10 rounded-[18px] text-white transition grid place-items-center self-end",
                    canSend
                      ? "bg-[linear-gradient(180deg,#0f7ae5,#0ea5b7)] shadow-[0_10px_20px_rgba(14,165,233,0.24)] hover:brightness-105 active:scale-[0.98]"
                      : "bg-slate-300 cursor-not-allowed",
                  ].join(" ")}
                  title="Send"
                >
                  <Send size={16} />
                </button>
                </div>
                </div>

                {isAttachmentMenuOpen ? (
                  <>
                    <button
                      type="button"
                      aria-label="Close tools"
                      className="fixed inset-0 z-[60] bg-slate-950/24 backdrop-blur-[2px]"
                      onClick={() => setIsAttachmentMenuOpen(false)}
                    />
                    <div className="fixed inset-x-0 bottom-0 z-[61] rounded-t-[32px] border border-white/60 bg-white/96 px-4 pb-[calc(16px+env(safe-area-inset-bottom))] pt-3 shadow-[0_-22px_48px_rgba(15,23,42,0.18)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/96">
                      <div className="mx-auto h-1.5 w-12 rounded-full bg-slate-200 dark:bg-white/15" />
                      <div className="mx-auto mt-4 max-w-xl">
                        <div className="flex items-center justify-between">
                          <div className="text-[13px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                            Tools
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsAttachmentMenuOpen(false)}
                            className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-700 dark:bg-white/8 dark:text-slate-100"
                            aria-label="Close tools"
                          >
                            <X size={16} />
                          </button>
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-2.5">
                          <MobileComposerToolCard
                            icon={<FileUp size={20} />}
                            label="Document"
                            onClick={() => {
                              setIsAttachmentMenuOpen(false);
                              fileInputRef.current?.click();
                            }}
                          />
                          <MobileComposerToolCard
                            icon={<Image size={20} />}
                            label="Gallery"
                            onClick={() => {
                              setIsAttachmentMenuOpen(false);
                              galleryInputRef.current?.click();
                            }}
                          />
                          <MobileComposerToolCard
                            icon={<Camera size={20} />}
                            label="Camera"
                            onClick={() => {
                              setIsAttachmentMenuOpen(false);
                              cameraInputRef.current?.click();
                            }}
                          />
                        </div>

                        <div className="mt-3 rounded-[26px] bg-slate-50/90 p-2 ring-1 ring-slate-200/70 dark:bg-white/5 dark:ring-white/10">
                          <MobileComposerToolRow
                            icon={<Sparkles size={18} />}
                            label="AI Image Generator"
                            onClick={() => {
                              setInput("Create an image concept for this topic...");
                              setIsAttachmentMenuOpen(false);
                              requestAnimationFrame(() => promptInputRef.current?.focus());
                            }}
                          />
                          <MobileComposerToolRow
                            icon={<NotebookPen size={18} />}
                            label="Problem Solving"
                            onClick={() => {
                              setInput("Help me solve this problem step by step...");
                              setIsAttachmentMenuOpen(false);
                              requestAnimationFrame(() => promptInputRef.current?.focus());
                            }}
                          />
                          <MobileComposerToolRow
                            icon={<ScanLine size={18} />}
                            label="Scan-to-Doc"
                            onClick={() => {
                              setIsAttachmentMenuOpen(false);
                              scanInputRef.current?.click();
                            }}
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

          {!isMobile ? (
          <div className="bg-transparent overflow-hidden flex-1 min-h-0 flex flex-col">
            <div className="px-5 py-3 border-b border-slate-200 bg-white/80 shrink-0">
              <div className="text-sm font-semibold text-slate-800">{activeChat?.title || UNTITLED_CHAT_BASE}</div>
              <div className="text-xs text-slate-500">
                AI Academic Assistant • {formatChatStamp(activeChat?.updatedAt)}
              </div>
            </div>

            <div className={[hasConversation ? "px-4 pt-2 pb-4" : "p-4", "flex-1 min-h-0 flex flex-col bg-transparent"].join(" ")}>
              {messages.length === 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5 shrink-0 mb-3">
                  <StatCard title="Next Class" value={user.nextClass} subtitle="From your timetable" />
                  <StatCard title="Balance" value={user.balance} subtitle="Fees portal" />
                  <StatCard title="Attendance" value={user.attendance} subtitle="This month" />
                  <StatCard title="GPA Progress" value={user.gpa} subtitle="Current GPA" />
                </div>
              ) : null}

              <div className="flex-1 min-h-0 overflow-y-auto smart-scrollbar px-3 py-4 space-y-3">
              {messages.length === 0 ? (
                  <div className="rounded-[28px] border border-slate-200/70 bg-white/72 px-5 py-4 shadow-[0_18px_48px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]">
                    <div className="text-sm font-medium text-slate-500 dark:text-slate-400">{timeGreeting()}</div>
                    <div className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-slate-900 dark:text-white">
                      Hi {firstNameOf(user.name)}, where should we start?
                    </div>
                    <div className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      Ask anything about coursework, assignments, revision, or research.
                    </div>
                  </div>
                ) : null}

                {messages.map((m, idx) => (
                <Bubble
                  key={idx}
                  role={m.role}
                  text={m.text}
                     imageUrl={m.imageUrl || (m.type === "image" ? m.content || "" : "")}
                     imageVariant={m.imageVariant || "image"}
                     diagramLabel={m.diagramLabel || ""}
                     diagramSubject={m.diagramSubject || ""}
                     diagramType={m.diagramType || ""}
                     comparisonImages={m.imageOptions || []}
                     comparisonTitle={m.comparisonTitle || "Which image do you like more?"}
                     comparisonSelectedIndex={m.comparisonSelectedIndex ?? null}
                     comparisonSkipped={Boolean(m.comparisonSkipped)}
                     onComparisonChoose={(choiceIndex) => handleImageComparisonChoice(m.id, choiceIndex)}
                     onComparisonSkip={() => handleImageComparisonChoice(m.id, null, { skipped: true })}
                     imageSearchResults={m.imageSearchResults || []}
                     imageSearchQuery={m.imageSearchQuery || ""}
                     sources={m.sources || []}
                     chatId={activeChat?.conversationId || ""}
                     messageId={m.id || ""}
                     chatTitle={activeChat?.title || UNTITLED_CHAT_BASE}
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
                    onImageReuse={(result) => setInput(`Use this image in my workspace/report flow:\nTitle: ${result.title}\nSource: ${result.link}`)}
                    onAssistantSpeak={speakAssistantText}
                    onRetry={() => {
                      if (lastPrompt) sendMessage(lastPrompt);
                    }}
                    onLearnMore={() => sendMessage("Learn more about the error and how I can fix it.")}
                    onCopy={() => copyPromptText(idx, m.text)}
                    onEdit={m.role === "user" ? () => editPromptText(m.text) : undefined}
                    isCopied={copiedMessageIndex === idx}
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>

              {messages.length === 0 ? (
                <div className="mt-3 flex flex-wrap gap-2 shrink-0">
                  {quickPrompts.map((p) => (
                    <button
                      key={p.label}
                      onClick={() => sendMessage(p.label)}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/88 px-4 py-2 text-sm text-slate-700 shadow-[0_12px_28px_rgba(15,23,42,0.08)] backdrop-blur-xl transition hover:bg-white dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-100 dark:hover:bg-white/[0.08]"
                    >
                      <span>{p.icon}</span>
                      <span>{p.label}</span>
                    </button>
                  ))}
                </div>
              ) : null}

              <AttachmentChipsTray
                items={attachments}
                onPreview={openAttachmentItem}
                onRemove={removeAttachment}
              />

              <div ref={attachmentMenuRef} className="mt-3 flex items-end gap-2 shrink-0 relative">
                <button
                  onClick={() => setIsAttachmentMenuOpen((v) => !v)}
                  className="h-11 w-11 rounded-xl border border-transparent bg-white/78 hover:bg-white text-slate-700 inline-flex items-center justify-center transition dark:bg-white/[0.05] dark:text-slate-100 dark:hover:bg-white/[0.09]"
                  title="Add attachment"
                >
                  <Plus size={17} />
                </button>

                {isAttachmentMenuOpen ? (
                  <div className="absolute left-0 bottom-12 z-20 rounded-xl border border-slate-200 bg-white shadow-lg p-2 w-44">
                    <button
                      onClick={() => {
                        setIsAttachmentMenuOpen(false);
                        galleryInputRef.current?.click();
                      }}
                      className="group w-full text-left px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-100 flex items-center justify-between"
                    >
                      <span>Photo</span>
                      <Image size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500" />
                    </button>
                    <button
                      onClick={() => {
                        setIsAttachmentMenuOpen(false);
                        cameraInputRef.current?.click();
                      }}
                      className="group w-full text-left px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-100 flex items-center justify-between"
                    >
                      <span>Camera</span>
                      <Camera size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500" />
                    </button>
                    <button
                      onClick={() => {
                        setIsAttachmentMenuOpen(false);
                        scanInputRef.current?.click();
                      }}
                      className="group w-full text-left px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-100 flex items-center justify-between"
                    >
                      <span>Scan</span>
                      <ScanLine size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500" />
                    </button>
                    <button
                      onClick={() => {
                        setIsAttachmentMenuOpen(false);
                        fileInputRef.current?.click();
                      }}
                      className="group w-full text-left px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-100 flex items-center justify-between"
                    >
                      <span>File</span>
                      <FileUp size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500" />
                    </button>
                  </div>
                ) : null}

                <div className="flex-1 flex items-center gap-2 rounded-2xl border border-transparent bg-white/74 px-3 py-2.5 backdrop-blur transition dark:bg-white/[0.05]">
                  <input
                    ref={promptInputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onPaste={handlePaste}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") sendMessage(input);
                    }}
                    className="composer-plain-input w-full outline-none text-[15px] text-slate-800 bg-transparent placeholder:text-slate-400"
                    placeholder="Type your message..."
                  />

                  <button
                    onClick={() => setIsAiModeOn((v) => !v)}
                    className={[
                      "h-9 px-3.5 rounded-xl border text-xs font-semibold transition",
                      isAiModeOn
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-transparent bg-slate-100/75 text-slate-700 hover:bg-slate-100 dark:bg-white/[0.05] dark:text-slate-100 dark:hover:bg-white/[0.09]",
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
                        : "border-transparent bg-slate-100/75 text-slate-700 hover:bg-slate-100 dark:bg-white/[0.05] dark:text-slate-100 dark:hover:bg-white/[0.09]",
                    ].join(" ")}
                    title={isListening ? "Stop voice input" : "Start voice input"}
                  >
                    {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                  </button>

                  <button
                    onClick={() => {
                      audioPlayer.closePlayer();
                      setVoiceOpen(true);
                    }}
                    className="h-9 w-9 rounded-xl border border-transparent bg-slate-100/75 text-slate-700 inline-flex items-center justify-center transition hover:bg-slate-100 dark:bg-white/[0.05] dark:text-slate-100 dark:hover:bg-white/[0.09]"
                    title="Open live voice chat"
                  >
                    <PhoneCall size={16} />
                  </button>

                  <button
                    onClick={() => canSend && sendMessage(input)}
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

              <div className="mt-3 text-xs text-slate-500">
                Backend will be Python. Later we will send messages and attachments to your API (for example /api/chat).
              </div>
            </div>
          </div>
          ) : null}
        </main>
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
        onClose={() => setVoiceOpen(false)}
        family="ai"
        app="student"
        settingsUid={firebaseUser?.uid || null}
        title="Study Live"
        subtitle="Talk through revision, assignments, and notes with AI."
        language={resolveSpeechLanguage(settingsPrefs?.language)}
        onAskAI={async ({ text, context }) => {
          const reply = await requestLiveVoiceReply(text, context);
          return { text: reply };
        }}
      />
      {toastItem ? (
        <div className="fixed left-1/2 -translate-x-1/2 z-[95] bottom-[calc(120px+env(safe-area-inset-bottom))] md:bottom-6">
          <ScreenshotPreviewToast
            item={toastItem}
            onPreview={openPreview}
            onAnnotate={(item) => {
              dismissToast();
              openEditor(item);
            }}
            onAskAI={(item) => {
              setInput(`Help me understand this screenshot and tell me what to focus on: ${item.name || "Screenshot"}`);
              dismissToast();
              setTimeout(() => promptInputRef.current?.focus(), 0);
            }}
            onDismiss={dismissToast}
          />
        </div>
      ) : null}
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
