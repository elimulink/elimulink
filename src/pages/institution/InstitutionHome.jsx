import React, { useMemo, useState } from "react";
import {
  Search as SearchIcon,
  Send,
  Megaphone,
  Headphones,
  BarChart3,
  GitBranch,
  Mail,
} from "lucide-react";
import { apiUrl } from "../../lib/apiUrl";

function getGreetingByHour(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function getDisplayName(user, userProfile) {
  return (
    userProfile?.fullName ||
    userProfile?.name ||
    user?.displayName ||
    "Guest Scholar"
  );
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

  const quickFill = (text) => {
    setQuery(text);
    setStatus("");
    setTimeout(() => {
      const el = document.getElementById("institution-ai-input");
      el?.focus?.();
    }, 0);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    void sendMessage(query);
  };

  const sendMessage = async (rawText) => {
    const text = String(rawText || "").trim();
    if (!text || isThinking) return;

    setStatus("");
    setIsThinking(true);
    const userMessageId = Date.now();
    const assistantMessageId = userMessageId + 1;
    setMessages((prev) => [
      ...prev,
      { id: userMessageId, role: "user", text },
      { id: assistantMessageId, role: "ai", text: "" },
    ]);
    setQuery("");

    try {
      if (!user) throw new Error("Please sign in");
      const idToken = await user.getIdToken();
      const requestBody = {
        message: text,
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
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(requestBody),
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
        aiText = await readInstitutionStream(response, (_delta, nextText) => {
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
                text: `Error${status}: ${error?.message || "Failed to fetch AI response."}`,
              }
            : message
        )
      );
      setStatus(`Error${status}: ${error?.message || "Failed to fetch"}`);
    } finally {
      setIsThinking(false);
    }
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
          <div className="w-full bg-white border border-slate-200 rounded-full shadow-sm flex items-center gap-3 px-4 sm:px-5 py-3">
            <SearchIcon className="h-5 w-5 text-slate-400" />
            <input
              id="institution-ai-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 outline-none text-sm sm:text-base placeholder:text-slate-400"
              placeholder="Ask about policies, draft a memo, generate report..."
            />
            <button
              type="submit"
              disabled={isThinking}
              className="h-10 w-12 sm:h-12 sm:w-14 rounded-full bg-sky-600 hover:bg-sky-500 transition flex items-center justify-center"
              aria-label="Send"
            >
              <Send className="h-5 w-5 text-white" />
            </button>
          </div>
          {status ? (
            <div className="mt-3 text-sm text-slate-600">{status}</div>
          ) : null}
        </form>

        {messages.length > 0 ? (
          <div className="mt-6 space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`rounded-xl border p-3 ${
                  message.role === "user"
                    ? "bg-sky-50 border-sky-200 text-slate-900"
                    : "bg-white border-slate-200 text-slate-800"
                }`}
              >
                <div className="text-xs font-semibold uppercase tracking-wide mb-1 text-slate-500">
                  {message.role === "user" ? "You" : "ElimuLink AI"}
                </div>
                <div className="text-sm whitespace-pre-wrap">{message.text}</div>
              </div>
            ))}
            {isThinking ? <div className="text-sm text-slate-500">AI is thinking...</div> : null}
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
    </div>
  );
}
