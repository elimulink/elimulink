import React, { Suspense, useCallback, useMemo, useRef, useState } from "react";
import {
  Paperclip,
  Search as SearchIcon,
  Send,
  PhoneCall,
  Megaphone,
  Headphones,
  BarChart3,
  GitBranch,
  Mail,
} from "lucide-react";
import { apiUrl } from "../../lib/apiUrl";
import { askInstitutionLiveChat } from "../../lib/liveChatApi";
import { getStoredLanguage } from "../../lib/userSettings";
import imageAPI from "../../services/imageAPI";
import {
  isImageClarificationQuestion,
  getVagueImageRequestClarification,
  isImageGenerationPrompt,
} from "../../shared/image-generation/imageGenerationIntent";
import { shouldOfferImageComparison } from "../../shared/image-generation/imageComparisonIntent";
import {
  formatAiServiceError,
  resolveContinuationPrompt,
} from "../../shared/chat/chatResponseBehavior";
import AttachmentChipsTray from "../../shared/chat-media/AttachmentChipsTray.jsx";
import ChatMediaPreviewModal from "../../shared/chat-media/ImagePreviewModal.jsx";
import useCapturedMedia from "../../shared/chat-media/useCapturedMedia.js";
import ImageComparisonPicker from "../../shared/chat-media/ImageComparisonPicker.jsx";
import "../../shared/chat-media/chat-media.css";
import { resolveInstitutionDisplayName } from "../../institution/institutionIdentity";

const LiveMultimodalSessionContainerV2 = React.lazy(() =>
  import("../../shared/live/LiveMultimodalSessionContainerV2.jsx")
);

function getGreetingByHour(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function getDisplayName(user, userProfile) {
  return resolveInstitutionDisplayName(userProfile, user, {
    preferUsername: true,
    fallback: "Guest Scholar",
  });
}

function isUltraShortGreetingPrompt(text) {
  const normalized = String(text || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z'\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized || normalized.length > 20) return false;
  return new Set([
    "hello",
    "hi",
    "hey",
    "morning",
    "good morning",
    "afternoon",
    "good afternoon",
    "evening",
    "good evening",
  ]).has(normalized);
}

const Card = ({ icon: Icon, title, subtitle, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full text-left rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition p-4 sm:p-6"
  >
    <div className="h-20 rounded-lg bg-slate-50 flex items-center justify-center mb-3">
      <Icon className="h-10 w-10 text-sky-600" />
    </div>
    <div className="text-base font-semibold text-slate-900">{title}</div>
    <div className="mt-1 text-sm text-slate-500">{subtitle}</div>
  </button>
);

async function readInstitutionStream(response, onDelta) {
  const reader = response.body?.getReader?.();
  if (!reader) {
    const data = await response.json().catch(() => ({}));
    return String(data?.text || "");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let finalText = "";
  let accumulatedText = "";

  const applyEventBlock = (block) => {
    const lines = String(block || "").split("\n");
    const eventName = lines
      .find((line) => line.startsWith("event:"))
      ?.slice(6)
      .trim();
    const dataLine = lines.find((line) => line.startsWith("data:"));
    if (!eventName || !dataLine) return;
    let payload = {};
    try {
      payload = JSON.parse(dataLine.slice(5).trim() || "{}");
    } catch {
      return;
    }
    if (eventName === "chunk" && payload?.delta) {
      const delta = String(payload.delta);
      accumulatedText += delta;
      onDelta(delta, accumulatedText);
    }
    if (eventName === "done") {
      finalText = String(payload?.text || accumulatedText || "");
    }
    if (eventName === "error") {
      throw new Error(String(payload?.message || "Failed to stream AI response."));
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (value) {
      buffer += decoder.decode(value, { stream: !done });
      const blocks = buffer.replace(/\r\n/g, "\n").split("\n\n");
      buffer = blocks.pop() || "";
      blocks.forEach(applyEventBlock);
    }
    if (done) break;
  }

  if (buffer.trim()) applyEventBlock(buffer.replace(/\r\n/g, "\n"));
  return finalText || accumulatedText;
}

function getAttachmentGridClass(count) {
  if (count <= 1) return "grid-cols-1";
  if (count === 2) return "grid-cols-2";
  if (count === 3) return "grid-cols-2";
  if (count === 4) return "grid-cols-2";
  return "grid-cols-2 sm:grid-cols-3";
}

function getAttachmentItemClass(count, index) {
  const base =
    "overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_8px_20px_rgba(15,23,42,0.05)] transition hover:shadow-[0_12px_26px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-900 dark:hover:shadow-[0_12px_26px_rgba(0,0,0,0.24)]";

  if (count <= 1) {
    return `${base} aspect-[4/3] max-h-[340px]`;
  }

  if (count === 2) {
    return `${base} aspect-[4/5] sm:aspect-square max-h-[260px]`;
  }

  if (count === 3) {
    return index === 0
      ? `${base} col-span-2 aspect-[16/9] max-h-[300px]`
      : `${base} aspect-[4/5] max-h-[220px]`;
  }

  if (count === 4) {
    return `${base} aspect-square max-h-[220px]`;
  }

  return index === 0
    ? `${base} col-span-2 sm:col-span-2 sm:row-span-2 aspect-[4/3] sm:aspect-auto min-h-[220px] sm:min-h-[320px]`
    : `${base} aspect-square min-h-[140px] sm:min-h-[180px]`;
}

async function readFileAsDataUrl(file) {
  if (!file) return "";
  return await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

const InstitutionAttachmentGrid = React.memo(function InstitutionAttachmentGrid({
  items,
  messageId,
  onPreview,
}) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <div className={`mb-3 grid grid-flow-dense gap-2 ${getAttachmentGridClass(items.length)}`}>
      {items.map((attachment, index) => (
        <button
          key={attachment.id || `${messageId}-attachment-${index}`}
          type="button"
          onClick={() => onPreview(attachment)}
          className={getAttachmentItemClass(items.length, index)}
        >
          <img
            src={attachment.previewUrl || attachment.url}
            alt={attachment.name || `Attachment ${index + 1}`}
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        </button>
      ))}
    </div>
  );
});

const InstitutionMessageRow = React.memo(function InstitutionMessageRow({
  message,
  onPreview,
  onImageChoice,
}) {
  const isUser = message.role === "user";
  return (
    <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`w-full max-w-[92%] sm:max-w-[78%] md:max-w-[68%] lg:max-w-[620px] rounded-2xl border p-3 text-left ${
          isUser
            ? "bg-sky-50 border-sky-200 text-slate-900 ml-auto rounded-br-md"
            : "bg-white border-slate-200 text-slate-800 mr-auto rounded-bl-md"
        }`}
      >
        <div className="text-xs font-semibold uppercase tracking-wide mb-1 text-slate-500">
          {isUser ? "You" : "ElimuLink AI"}
        </div>
        {message.role === "ai" && Array.isArray(message.imageOptions) && message.imageOptions.length >= 2 && !message.selectedImageUrl && !message.comparisonSkipped ? (
          <div className="mb-3">
            <ImageComparisonPicker
              title={message.comparisonTitle || "Which image do you like more?"}
              images={message.imageOptions}
              selectedIndex={message.comparisonSelectedIndex ?? null}
              onChoose={(choiceIndex) => onImageChoice(message.id, choiceIndex)}
              onSkip={() => onImageChoice(message.id, null, { skipped: true })}
            />
          </div>
        ) : null}
        <InstitutionAttachmentGrid items={message.attachments} messageId={message.id} onPreview={onPreview} />
        {message.role === "ai" && message.imageUrl ? (
          <img
            src={message.imageUrl}
            alt={message.text || "Generated image"}
            className="mb-3 w-full max-w-xl rounded-lg border border-slate-200 object-contain"
            loading="lazy"
            decoding="async"
          />
        ) : null}
        <div className="text-sm whitespace-pre-wrap">{message.text}</div>
      </div>
    </div>
  );
}, (prev, next) => prev.message === next.message && prev.onPreview === next.onPreview && prev.onImageChoice === next.onImageChoice);

export default function InstitutionHome({
  user,
  userProfile,
  userRole,
  activeDepartmentId,
  activeDepartmentName,
}) {
  const greeting = useMemo(() => getGreetingByHour(), []);
  const name = useMemo(() => getDisplayName(user, userProfile), [user, userProfile]);

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState([]);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const fileInputRef = useRef(null);
  const {
    mediaItems: attachments,
    previewItem,
    addFiles,
    removeMedia,
    clearMedia,
    openPreview,
    closePreview,
    handlePaste,
    mediaNotice,
  } = useCapturedMedia();

  const quickFill = (text) => {
    setQuery(text);
    setStatus("");
    setTimeout(() => {
      const el = document.getElementById("institution-ai-input");
      el?.focus?.();
    }, 0);
  };

  const openLiveSession = () => {
    setStatus("");
    setVoiceOpen(true);
  };

  const canSend = query.trim().length > 0 || attachments.length > 0;

  const handleFileUpload = useCallback(() => {
    fileInputRef.current?.click?.();
  }, []);

  const requestLiveVoiceReply = async ({ text, context }) => {
    const liveContext = {
      ...context,
      hostMode: "institution",
      institutionId: userProfile?.institutionId || null,
      departmentId: activeDepartmentId || "general",
      departmentName: activeDepartmentName || "General",
      userName: name,
    };
    const data = await askInstitutionLiveChat({ text, context: liveContext });
    return { text: String(data?.text || "Connection error.").trim() || "Connection error." };
  };

  const handleImageComparisonChoice = useCallback((messageId, choiceIndex, { skipped = false } = {}) => {
    if (!messageId) return;
    setMessages((currentMessages) =>
      currentMessages.map((message) => {
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
      })
    );
  }, []);

  const handlePreviewAttachment = useCallback((item) => {
    openPreview(item);
  }, [openPreview]);

  const handleSubmit = (e) => {
    e.preventDefault();
    void sendMessage(query);
  };

  const sendMessage = async (rawText) => {
    const pendingAttachments = attachments;
    const text = String(rawText || "").trim();
    if (!text && pendingAttachments.length === 0) return;
    if (isThinking) return;
    const frontendTimingStarted = performance.now();
    console.debug("[AI_TIMING][institution] frontend_send_start", {
      at: frontendTimingStarted,
      textLength: text.length,
    });
    const requestText = isUltraShortGreetingPrompt(text) ? text : resolveContinuationPrompt(text, messages);
    const latestAssistantText = String(
      [...messages].reverse().find((message) => message?.role === "ai")?.text || ""
    ).trim();
    const effectiveRequestText = isImageClarificationQuestion(latestAssistantText)
      ? `Generate an image of ${text}`
      : requestText;
    const shouldGenerateImage = pendingAttachments.length === 0 && isImageGenerationPrompt(effectiveRequestText);
    const imageGenerationClarification = shouldGenerateImage
      ? getVagueImageRequestClarification(effectiveRequestText)
      : "";

    setStatus("");
    setIsThinking(true);
    const userMessageId = Date.now();
    const assistantMessageId = userMessageId + 1;
    const messageText = text || `Sent ${pendingAttachments.length} image${pendingAttachments.length === 1 ? "" : "s"}`;
    const idTokenPromise = user.getIdToken();

    const attachmentDisplayItems = await Promise.all(
      pendingAttachments.map(async (item) => ({
        ...item,
        previewUrl: item.previewUrl || (item.file ? await readFileAsDataUrl(item.file) : item.url || ""),
      }))
    );
    attachmentDisplayItems.forEach((item) => {
      if (!item.url && item.previewUrl) item.url = item.previewUrl;
    });
    setMessages((prev) => [
      ...prev,
      { id: userMessageId, role: "user", text: messageText, attachments: attachmentDisplayItems },
        {
          id: assistantMessageId,
          role: "ai",
        text: shouldGenerateImage ? "Generating image..." : "Typing...",
          type: shouldGenerateImage ? "image" : "text",
          imageUrl: "",
        },
    ]);
    setQuery("");

    try {
      if (!user) throw new Error("Please sign in");

      clearMedia();

      if (pendingAttachments.length > 0) {
        const idToken = await idTokenPromise;
        const formData = new FormData();
        formData.append("message", text || `Sent ${pendingAttachments.length} image${pendingAttachments.length === 1 ? "" : "s"}`);
        formData.append("institutionId", userProfile?.institutionId || "");
        formData.append("departmentId", activeDepartmentId || "general");
        pendingAttachments.forEach((item) => {
          if (item?.file instanceof File) {
            formData.append("files", item.file, item.name);
          }
        });
        const response = await fetch(apiUrl("/api/chat/upload"), {
          method: "POST",
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
          body: formData,
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          const error = new Error(data?.message || data?.error || `Request failed (${response.status})`);
          error.status = response.status;
          error.body = data;
          throw error;
        }
        const aiText = data?.text || "I could not generate a response.";
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantMessageId
              ? { ...message, text: aiText, type: "text" }
              : message
          )
        );
        requestAnimationFrame(() => {
          console.debug("[AI_TIMING][institution] frontend_render_complete", {
            elapsedMs: Math.round(performance.now() - frontendTimingStarted),
          });
        });
        return;
      }

      if (shouldGenerateImage) {
        const idToken = await idTokenPromise;
        if (imageGenerationClarification) {
          setMessages((prev) =>
            prev.map((message) =>
              message.id === assistantMessageId
                ? {
                    ...message,
                    type: "text",
                    imageUrl: "",
                    text: imageGenerationClarification,
                  }
                : message
            )
          );
          return;
        }
        const shouldCompareImage = shouldOfferImageComparison(effectiveRequestText, {
          isNewChat: messages.length <= 1,
          hasExistingDirection: Boolean(imageAPI.getLatestImageFromMessages(messages)),
          hasShownComparison: messages.some(
            (message) => Boolean(message?.comparison) || (Array.isArray(message?.imageOptions) && message.imageOptions.length >= 2)
          ),
        });
        const imageResult = await imageAPI.generateImage(effectiveRequestText, {
          idToken,
          compare: shouldCompareImage,
        });
        if (Array.isArray(imageResult.images) && imageResult.images.length >= 2) {
          setMessages((prev) =>
            prev.map((message) =>
              message.id === assistantMessageId
                ? {
                    ...message,
                    type: "image-comparison",
                    comparison: true,
                    comparisonTitle: imageResult.text || "Which image do you like more?",
                    comparisonSelectedIndex: null,
                    selectedImageIndex: null,
                    selectedImageUrl: "",
                    imageUrl: "",
                    text: "",
                    imageOptions: imageResult.images.map((item, index) => ({
                      index: index + 1,
                      image: item.image,
                      model: item.model || "",
                    })),
                  }
                : message
            )
          );
          return;
        }
        const imageUrl = imageResult.image;
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantMessageId
                ? {
                    ...message,
                    type: "image",
                    imageUrl,
                    text: "Done ✅",
                  }
                : message
          )
        );
        return;
      }

      const requestBody = {
        message: effectiveRequestText,
        text,
        hostMode: "institution",
        institutionId: userProfile?.institutionId || null,
        departmentId: activeDepartmentId || "general",
        departmentName: activeDepartmentName || "General",
        mode: activeDepartmentName || "General",
      };

      const response = await fetch(apiUrl("/api/ai/student?stream=1"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await idTokenPromise}`,
        },
        body: JSON.stringify(requestBody),
      });
      console.debug("[AI_TIMING][institution] frontend_request_dispatched", {
        elapsedMs: Math.round(performance.now() - frontendTimingStarted),
        status: response.status,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const error = new Error(data?.message || data?.error || `Request failed (${response.status})`);
        error.status = response.status;
        error.body = data;
        throw error;
      }

      const contentType = response.headers.get("content-type") || "";
      let aiText = "";
      if (contentType.includes("text/event-stream")) {
        let sawFirstChunk = false;
        aiText = await readInstitutionStream(response, (_delta, nextText) => {
          if (!sawFirstChunk) {
            sawFirstChunk = true;
            console.debug("[AI_TIMING][institution] frontend_first_chunk", {
              elapsedMs: Math.round(performance.now() - frontendTimingStarted),
            });
          }
          setMessages((prev) =>
            prev.map((message) =>
              message.id === assistantMessageId ? { ...message, text: nextText } : message
            )
          );
        });
      } else {
        const data = await response.json().catch(() => ({}));
        aiText = data?.text || "I could not generate a response.";
      }

      setMessages((prev) =>
        prev.map((message) =>
          message.id === assistantMessageId
            ? { ...message, text: aiText || "I could not generate a response." }
            : message
        )
      );
      requestAnimationFrame(() => {
        console.debug("[AI_TIMING][institution] frontend_render_complete", {
          elapsedMs: Math.round(performance.now() - frontendTimingStarted),
        });
      });
    } catch (error) {
      const status = error?.status ? ` (${error.status})` : "";
      console.error("[AI_ERROR][institutionHome]", {
        status: error?.status || null,
        message: error?.message || null,
        body: error?.body || null,
      });
      setMessages((prev) =>
        prev.map((message) =>
          message.id === assistantMessageId
            ? {
                ...message,
                text: formatAiServiceError({
                  backendHealthy: true,
                  status: error?.status || null,
                  message: error?.message || "Failed to fetch AI response.",
                }),
              }
            : message
        )
      );
      setStatus(
        formatAiServiceError({
          backendHealthy: true,
          status: error?.status || null,
          message: error?.message || "Failed to fetch",
        })
      );
    } finally {
      setIsThinking(false);
    }
  };

  const handleAttachmentUpload = (event) => {
    addFiles(event.target.files, "file");
    event.target.value = "";
  };

  return (
    <div className="bg-slate-50 text-slate-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
          {greeting}, {name}
        </div>
        <div className="mt-2 text-base sm:text-lg text-slate-600">
          How can I assist your institution today?
        </div>

        <form onSubmit={handleSubmit} className="mt-6">
          <AttachmentChipsTray
            items={attachments}
            onPreview={openPreview}
            onRemove={removeMedia}
          />
          <div className="w-full bg-white border border-slate-200 rounded-[28px] shadow-sm px-4 sm:px-5 py-3">
            <div className="flex items-start gap-3">
              <SearchIcon className="mt-1 h-5 w-5 text-slate-400" />
              <textarea
                id="institution-ai-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onPaste={handlePaste}
                rows={1}
                className="flex-1 resize-none outline-none text-sm sm:text-base placeholder:text-slate-400 bg-transparent pt-0.5 min-h-[34px]"
                placeholder="Ask about policies, draft a memo, generate report..."
              />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleFileUpload}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                title="Attach images"
              >
                <Paperclip size={14} />
                Images
              </button>
              <button
                type="button"
                onClick={openLiveSession}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                aria-label="Open live voice chat"
                title="Open live voice chat"
              >
                <PhoneCall className="h-4 w-4" />
                Live
              </button>
              <div className="flex-1" />
              <button
                type="submit"
                disabled={isThinking || !canSend}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-sky-600 px-4 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Send"
              >
                <Send className="h-5 w-5" />
                Send
              </button>
            </div>
          </div>
          {status ? (
            <div className="mt-3 text-sm text-slate-600">{status}</div>
          ) : null}
          {mediaNotice ? (
            <div className="mt-2 text-xs font-medium text-sky-700">{mediaNotice}</div>
          ) : null}
        </form>

        {messages.length > 0 ? (
          <div className="mt-6 space-y-3">
            {messages.map((message) => (
              <InstitutionMessageRow
                key={message.id}
                message={message}
                onPreview={handlePreviewAttachment}
                onImageChoice={handleImageComparisonChoice}
              />
            ))}
            {isThinking ? (
              <div className="text-sm text-slate-500">
                {messages[messages.length - 1]?.type === "image" ? "Generating image..." : "AI is thinking..."}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card
            icon={Megaphone}
            title="Draft Announcement"
            subtitle="Quickly create an announcement"
            onClick={() =>
              quickFill(
                "Draft an official announcement for students about: "
              )
            }
          />
          <Card
            icon={Headphones}
            title="Student Support"
            subtitle="Assist students with queries"
            onClick={() =>
              quickFill(
                "Help me respond to a student inquiry about: "
              )
            }
          />
          <Card
            icon={BarChart3}
            title="Generate Report"
            subtitle="Summarize data and trends"
            onClick={() =>
              quickFill(
                "Generate a short institutional report summary about: "
              )
            }
          />
          <Card
            icon={GitBranch}
            title="Department Guidance"
            subtitle="Manage department workflows"
            onClick={() =>
              quickFill(
                `Give department guidance for ${activeDepartmentName || "my department"} on: `
              )
            }
          />
        </div>

        <div className="mt-10">
          <div className="text-xl font-bold text-slate-900">Recent Activity</div>

          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-sky-50 flex items-center justify-center">
                <Mail className="h-5 w-5 text-sky-600" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-slate-900">
                  Policy update memo draft ready for review
                </div>
                <div className="text-sm text-slate-500">
                  {activeDepartmentName || "General"} • 10m ago
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-sky-50 flex items-center justify-center">
                <Mail className="h-5 w-5 text-sky-600" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-slate-900">
                  Summary report generated for Counseling Dept
                </div>
                <div className="text-sm text-slate-500">
                  Analytics • 1h ago
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-sky-50 flex items-center justify-center">
                <Mail className="h-5 w-5 text-sky-600" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-slate-900">
                  New student inquiry about financial aid
                </div>
                <div className="text-sm text-slate-500">
                  Student Support • 2m ago
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 text-xs text-slate-500">
            Role: <span className="font-medium">{userRole || "unknown"}</span>{" "}
            • Department:{" "}
            <span className="font-medium">
              {activeDepartmentName || activeDepartmentId || "general"}
            </span>
          </div>
        </div>
      </div>

      <Suspense fallback={null}>
        <LiveMultimodalSessionContainerV2
          open={voiceOpen}
          onClose={() => setVoiceOpen(false)}
          family="ai"
          app="institution"
          settingsUid={user?.uid || null}
          title="Institution Live"
          subtitle="Talk through study support and institution tasks with AI."
          language={getStoredLanguage("en-US", user?.uid || null)}
          onAskAI={requestLiveVoiceReply}
        />
      </Suspense>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleAttachmentUpload}
      />
      <ChatMediaPreviewModal item={previewItem} onClose={closePreview} />
    </div>
  );
}
