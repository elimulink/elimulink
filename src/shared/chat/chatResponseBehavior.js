const FOLLOW_UP_ACCEPTANCE_PATTERN =
  /^(yes|yeah|yep|okay|ok|sure|continue|continue please|go on|go ahead|proceed|do that|show me|explain more|tell me more)$/i;
const FOLLOW_UP_DETAIL_PATTERN = /^(explain more|tell me more|more details|expand|go deeper)$/i;
const FOLLOW_UP_LANGUAGE_PATTERN =
  /\b(?:continue|explain|say|reply|answer|write|translate|summari[sz]e|simplify)\s+(?:that\s+|this\s+)?(?:in|using)\s+(english|swahili|kiswahili)\b/i;
const FOLLOW_UP_TRIGGER_PATTERN =
  /^(?:give me|show me|tell me|explain|brief history|history|continue|go on|go ahead|what happened next|what next|who ruled|where is it|where are they|were they colonis(?:e|z)ed|what about it|what about them|simpler|simplify|expand|more details|detail|details|who are they|who is it|what is it|what happened after(?:wards)?)(?:\b|$)/i;
const FOLLOW_UP_PRONOUN_PATTERN = /\b(?:it|they|them|this|that|there|he|she|those|these)\b/i;
const CONTINUATION_SENTENCE_PATTERN =
  /\b(?:next(?:,)?\s+)?(?:i can|i'll|i will|let me|next step is|the next useful step is)\s+([^.!?\n]+[.!?]?)/gi;
const ASSISTANT_ROLES = new Set(["assistant", "ai"]);
const TOPIC_STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "this",
  "that",
  "these",
  "those",
  "it",
  "they",
  "them",
  "there",
  "here",
  "what",
  "who",
  "where",
  "when",
  "why",
  "how",
  "do",
  "does",
  "did",
  "is",
  "are",
  "was",
  "were",
  "can",
  "could",
  "would",
  "should",
  "will",
  "please",
  "give",
  "tell",
  "show",
  "explain",
  "brief",
  "history",
  "more",
  "details",
  "simpler",
  "simple",
  "continue",
  "next",
  "topic",
  "about",
  "talk",
  "know",
  "me",
  "us",
  "you",
  "i",
  "we",
  "of",
  "on",
  "for",
  "in",
  "to",
  "and",
  "or",
  "with",
  "from",
]);

function getLastAssistantMessageText(items = []) {
  for (let index = (Array.isArray(items) ? items.length : 0) - 1; index >= 0; index -= 1) {
    const message = items[index] || {};
    const role = String(message.role || "").trim().toLowerCase();
    if (ASSISTANT_ROLES.has(role) && String(message.text || "").trim()) {
      return String(message.text || "").trim();
    }
  }
  return "";
}

function isLikelyTopicSource(message = {}) {
  const role = String(message?.role || "").trim().toLowerCase();
  if (!["user", "assistant", "ai"].includes(role)) return false;
  const text = String(message?.text || "").trim();
  if (!text) return false;
  if (/^(yes|yeah|yep|okay|ok|sure|done|noted|thanks|thank you)[.!]?\s*$/i.test(text)) return false;
  if (text.length < 8) return false;
  return true;
}

function normalizeTopicCandidate(value = "") {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/^[\s:,-]+|[\s:,-]+$/g, "")
    .trim();
}

function isStopwordTopic(value = "") {
  const words = String(value || "")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return true;
  if (words.every((word) => TOPIC_STOPWORDS.has(word))) return true;
  return TOPIC_STOPWORDS.has(words[0]);
}

function extractTopicFromText(text = "") {
  const raw = String(text || "").trim();
  if (!raw) return "";

  const explicitPatterns = [
    /\b(?:about|on|for|of|regarding)\s+([^.!?\n]{2,90})/i,
    /\b(?:brief history(?: of)?|history(?: of)?|background(?: of)?|overview(?: of)?|summary(?: of)?|explain(?: more)?|define|describe|tell me about|what is|what are|who is|who are|where is|where are|were they colonis(?:e|z)ed|who ruled(?: them)?|what happened next|what happened after(?:wards)?)\s+(?:of\s+)?([^.!?\n]{2,90})/i,
  ];

  for (const pattern of explicitPatterns) {
    const match = raw.match(pattern);
    const candidate = normalizeTopicCandidate(match?.[1] || "");
    if (candidate && !isStopwordTopic(candidate)) return candidate;
  }

  const capitalizedMatches = [...raw.matchAll(/\b([A-Z][\w'’-]*(?:\s+[A-Z][\w'’-]*){0,4})\b/g)]
    .map((match) => normalizeTopicCandidate(match?.[1] || ""))
    .filter(Boolean)
    .filter((candidate) => !isStopwordTopic(candidate));
  if (capitalizedMatches.length) {
    return capitalizedMatches[capitalizedMatches.length - 1];
  }

  return "";
}

function normalizeLanguageLabel(value = "") {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "";
  if (normalized === "kiswahili" || normalized === "swahili") return "swahili";
  if (normalized === "english") return "english";
  return normalized;
}

function applyWordCase(sourceWord = "", replacement = "") {
  if (!sourceWord) return replacement;
  if (sourceWord.toUpperCase() === sourceWord) return replacement.toUpperCase();
  if (sourceWord[0] === sourceWord[0]?.toUpperCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

const TYPO_NORMALIZATIONS = [
  ["wat", "what"],
  ["chidl", "child"],
  ["reslts", "results"],
  ["pls", "please"],
];

export function normalizeInput(text = "") {
  const trimmed = String(text || "").replace(/\s+/g, " ").trim();
  if (!trimmed) {
    return {
      originalText: "",
      normalizedText: "",
      changed: false,
    };
  }

  let normalizedText = trimmed;
  for (const [wrong, right] of TYPO_NORMALIZATIONS) {
    normalizedText = normalizedText.replace(
      new RegExp(`\\b${wrong}\\b`, "gi"),
      (match) => applyWordCase(match, right),
    );
  }

  return {
    originalText: trimmed,
    normalizedText,
    changed: normalizedText !== trimmed,
  };
}

export function detectFollowUpIntent(inputText = "") {
  const clean = String(inputText || "").replace(/\s+/g, " ").trim();
  if (!clean) {
    return {
      followUp: false,
      followUpType: "",
      targetLanguage: "",
    };
  }

  const languageMatch = clean.match(FOLLOW_UP_LANGUAGE_PATTERN);
  const targetLanguage = normalizeLanguageLabel(languageMatch?.[1] || "");
  if (targetLanguage) {
    return {
      followUp: true,
      followUpType: "CONTINUE_IN_LANGUAGE",
      targetLanguage,
    };
  }

  if (/^(?:continue|go on|go ahead|proceed|keep going|continue please)$/i.test(clean)) {
    return { followUp: true, followUpType: "CONTINUE", targetLanguage: "" };
  }

  if (/^(?:simplify|simplify that|make it simpler|simpler|explain simply|put it simply)$/i.test(clean)) {
    return { followUp: true, followUpType: "SIMPLIFY", targetLanguage: "" };
  }

  if (/^(?:summari[sz]e|summari[sz]e that|short summary|give me a summary|sum it up)$/i.test(clean)) {
    return { followUp: true, followUpType: "SUMMARIZE", targetLanguage: "" };
  }

  if (/^(?:explain more|tell me more|go deeper|expand|more details|explain that more)$/i.test(clean)) {
    return { followUp: true, followUpType: "EXPLAIN_MORE", targetLanguage: "" };
  }

  return {
    followUp: false,
    followUpType: "",
    targetLanguage: "",
  };
}

function extractActiveTopic(items = []) {
  const list = Array.isArray(items) ? items : [];
  for (let index = list.length - 1; index >= 0; index -= 1) {
    const message = list[index] || {};
    if (!isLikelyTopicSource(message)) continue;
    const topic = extractTopicFromText(message.text || "");
    if (topic) return topic;
  }
  return "";
}

export function deriveActiveTopic(items = [], fallbackTopic = "") {
  const fromItems = extractActiveTopic(items);
  if (fromItems) return fromItems;
  return normalizeTopicCandidate(fallbackTopic);
}

function isContextDependentFollowUp(cleanText = "") {
  const clean = String(cleanText || "").trim();
  if (!clean) return false;
  if (FOLLOW_UP_ACCEPTANCE_PATTERN.test(clean)) return true;
  if (FOLLOW_UP_TRIGGER_PATTERN.test(clean)) return true;
  if (clean.length <= 64 && FOLLOW_UP_PRONOUN_PATTERN.test(clean)) return true;
  if (clean.length <= 40 && /^(?:yes|continue|go on|go ahead|explain more|tell me more|simpler|expand|more details)$/i.test(clean)) {
    return true;
  }
  return false;
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
  if (!isContextDependentFollowUp(clean)) return clean;

  const lastAssistantText = getLastAssistantMessageText(items);
  const offeredStep = extractLastOfferedContinuation(lastAssistantText);
  if (offeredStep) {
    return `Please continue with the last suggested next step from your previous answer: ${offeredStep}`;
  }

  const activeTopic = extractActiveTopic(items);
  if (activeTopic) {
    return [
      `Active topic: ${activeTopic}.`,
      `The user's follow-up is: ${clean}.`,
      `Interpret pronouns like it, they, them, this, that, and there using the active topic.`,
      "Answer directly without asking the user to repeat the topic.",
    ].join(" ");
  }

  if (FOLLOW_UP_DETAIL_PATTERN.test(clean)) {
    return "The user is asking for a clearer continuation of the previous answer. Ask one short clarification only if the topic is genuinely ambiguous; otherwise continue the most recent topic.";
  }

  return "The user is asking a follow-up that depends on the recent conversation, but the topic is not fully clear. Ask one short clarification before answering if needed.";
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
