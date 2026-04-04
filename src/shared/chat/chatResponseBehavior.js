const FOLLOW_UP_ACCEPTANCE_PATTERN =
  /^(yes|yeah|yep|okay|ok|sure|continue|continue please|go on|go ahead|proceed|do that|show me|explain more|tell me more)$/i;
const FOLLOW_UP_DETAIL_PATTERN = /^(explain more|tell me more|more details|expand|go deeper)$/i;
const CONTINUATION_SENTENCE_PATTERN =
  /\b(?:next(?:,)?\s+)?(?:i can|i'll|i will|let me|next step is|the next useful step is)\s+([^.!?\n]+[.!?]?)/gi;

function getLastAssistantMessageText(items = []) {
  for (let index = (Array.isArray(items) ? items.length : 0) - 1; index >= 0; index -= 1) {
    const message = items[index] || {};
    if (message.role === "assistant" && String(message.text || "").trim()) {
      return String(message.text || "").trim();
    }
  }
  return "";
}

function extractLastOfferedContinuation(text = "") {
  const value = String(text || "").trim();
  if (!value) return "";

  const matches = [...value.matchAll(CONTINUATION_SENTENCE_PATTERN)]
    .map((match) => String(match?.[0] || "").trim())
    .filter(Boolean);
  if (matches.length) return matches[matches.length - 1].replace(/\s+/g, " ");

  const sentences = value
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const fallback = sentences
    .slice(-3)
    .find((sentence) =>
      /\b(next|continue|step by step|notes|flashcards|diagram|compare|summarize|simpler|detail|explain)\b/i.test(
        sentence,
      ),
    );
  return fallback || "";
}

export function resolveContinuationPrompt(userText, items = []) {
  const clean = String(userText || "").trim();
  if (!FOLLOW_UP_ACCEPTANCE_PATTERN.test(clean)) return clean;

  const lastAssistantText = getLastAssistantMessageText(items);
  const offeredStep = extractLastOfferedContinuation(lastAssistantText);
  if (offeredStep) {
    return `Please continue with the last suggested next step from your previous answer: ${offeredStep}`;
  }
  if (FOLLOW_UP_DETAIL_PATTERN.test(clean)) {
    return "Please expand your previous answer with a clearer, more detailed explanation and practical examples.";
  }
  return "Please continue directly from your previous answer and carry out the most relevant next step you just proposed.";
}

export function formatAiServiceError({ backendHealthy = true, status = null, message = "" } = {}) {
  const cleanMessage = String(message || "").trim();
  if (!backendHealthy) {
    return "The backend is unavailable right now. Please try again later.";
  }
  if (status) {
    return `Something went wrong while contacting the AI (status ${status}). Please try again.`;
  }
  if (cleanMessage) {
    return `Something went wrong while contacting the AI. ${cleanMessage}`;
  }
  return "Something went wrong while contacting the AI. Please try again.";
}
