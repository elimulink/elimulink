const FOLLOW_UP_ACCEPTANCE_PATTERN =
  /^(yes|yeah|yep|okay|ok|sure|continue|continue please|go on|go ahead|proceed|do that|explain more|tell me more)$/i;
const FOLLOW_UP_DETAIL_PATTERN = /^(explain more|tell me more|more details|expand|go deeper)$/i;
const FOLLOW_UP_LANGUAGE_PATTERN =
  /\b(?:continue|explain|say|reply|answer|write|translate|summari[sz]e|simplify)\s+(?:that\s+|this\s+)?(?:in|using)\s+(english|swahili|kiswahili)\b/i;
const FOLLOW_UP_TRIGGER_PATTERN =
  /^(?:give me|show me|tell me|explain|brief history|history|continue|go on|go ahead|what happened next|what next|who ruled|where is it|where are they|were they colonis(?:e|z)ed|what about it|what about them|simpler|simplify|expand|more details|detail|details|who are they|who is it|what is it|what happened after(?:wards)?)(?:\b|$)/i;
const FOLLOW_UP_PRONOUN_PATTERN = /\b(?:it|they|them|this|that|there|he|she|those|these)\b/i;
const SOURCE_FOLLOW_UP_PATTERN =
  /^(?:with\s+(?:sources|citations|references)|add\s+(?:sources|citations|references)|give\s+me\s+(?:sources|citations|references)(?:\s+for\s+(?:it|this|that|them))?|can\s+you\s+(?:add|give)\s+(?:sources|citations|references)(?:\s+for\s+(?:it|this|that|them))?|cite\s+(?:this|that|it|them)|references?\s+for\s+(?:this|that|it|them))$/i;
const EXPLICIT_RESEARCH_PATTERN =
  /\b(?:with\s+(?:sources|citations|references)|with\s+evidence|cite\b|citations?\b|references?\b|support\s+(?:this|that|it|the answer)?\s+with\s+(?:sources|citations|evidence)|deep research|research using sources|use papers?|peer[- ]reviewed|journal sources?)\b/i;
const CONTEXTUAL_FOLLOW_UP_PATTERN =
  /\b(?:sources?|citations?|references?|example|examples|steps?|break\s+it\s+down|simplify|summari[sz]e|explain|expand|more\s+details|go\s+deeper|translate)\b/i;
const CONTINUATION_SENTENCE_PATTERN =
  /\b(?:next(?:,)?\s+)?(?:i can|i'll|i will|let me|next step is|the next useful step is)\s+([^.!?\n]+[.!?]?)/gi;
const ASSISTANT_CONTINUATION_QUESTION_PATTERNS = [
  /would you like (?:me to )?([^?.!]+)\?/i,
  /do you want (?:me to )?([^?.!]+)\?/i,
  /should i ([^?.!]+)\?/i,
  /can i ([^?.!]+)\?/i,
  /if you'd like,?\s*i can ([^.!?\n]+)/i,
  /i can also ([^.!?\n]+?)(?: if you'd like| if you want)?[.!?]?$/i,
];
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
  "solve",
  "calculate",
  "compute",
  "differentiate",
  "integrate",
  "draw",
  "find",
  "final",
  "step",
  "answer",
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
  "if",
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
    /\b(?:brief history(?: of)?|history(?: of)?|background(?: of)?|overview(?: of)?|summary(?: of)?|explain(?: more)?|define|describe|tell me about|what is|what are|what's|wat is|wat are|wats|who is|who are|where is|where are|were they colonis(?:e|z)ed|who ruled(?: them)?|what happened next|what happened after(?:wards)?)\s+(?:of\s+)?([^.!?\n]{2,90})/i,
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
  ["im", "i'm"],
  ["wats", "what's"],
  ["whats", "what's"],
  ["dont", "don't"],
  ["cant", "can't"],
];

const CONVERSATIONAL_LEAD_IN_PATTERN =
  /^(?:(?:okay|ok|alright|well|so|then|now|right|cool|nice|interesting|that's interesting|that is interesting|fair enough|got it|i see|by the way|hmm|mm|uhm|uh)\b[,\.\s-]*)+/i;
const ORDINARY_CONVERSATION_PATTERNS = [
  /^(?:hi|hello|hey|good\s+(?:morning|afternoon|evening))\b[.!?]*$/i,
  /^(?:i(?:'m| am)\s+good(?:\s+what\s+about\s+you)?|how\s+are\s+you(?:\s+doing)?|what(?:'s| is)\s+your\s+name|who\s+are\s+you|do\s+you\s+have\s+feelings|why\s+do(?:n't| not)\s+you\s+have\s+feelings|can\s+you\s+feel)\b[?!.\s]*$/i,
  /^(?:thanks|thank\s+you)\b[.!?]*$/i,
];
const EXPLICIT_MATH_ROUTE_PATTERN =
  /\b(?:solve|calculate|compute|evaluate|simplify|factor|expand|differentiate|deriv(?:ative)?|integrate|integration|probability|fraction|equation|algebra)\b|[0-9xyza]\s*[\+\-\*\/=]\s*[0-9xyza]/i;
const EXPLICIT_PHYSICS_ROUTE_PATTERN =
  /\b(?:force|velocity|acceleration|motion|newton|energy|power|momentum|current|voltage|resistance|circuit|ray|reflection|refraction|vector)\b/i;
const EXPLICIT_CHEMISTRY_ROUTE_PATTERN =
  /\b(?:moles?|molar|molarity|stoichiometry|acid|base|ph|reaction|compound|atom|molecule|electron|chemistry|water purification|distillation)\b/i;
const EXPLICIT_WORKFLOW_ROUTE_PATTERN =
  /\b(?:apply|application|register|registration|create club|club registration|submit|submission)\b/i;

const EXPLICIT_NEW_TOPIC_PATTERNS = [
  /^(?:what is|what are|what's|who is|who are|who's|why|how|how are you|can you|do you|are you|define|explain|describe|summari[sz]e|outline|tell me about)\s+.+$/i,
  /^(?:show|show me|find|find me|get|search|browse)\s+.+$/i,
  /^(?:i need|i want)\s+(?:images?|pictures?|photos?|diagrams?|sources?|references?)\s+.+$/i,
];

function stripConversationalLeadIn(text = "") {
  let clean = String(text || "").trim();
  let previous = "";
  while (clean && clean !== previous) {
    previous = clean;
    clean = clean
      .replace(CONVERSATIONAL_LEAD_IN_PATTERN, "")
      .replace(/^(?:and|but|then)\b[,\.\s-]*/i, "")
      .trim();
  }
  return clean;
}

export function isOrdinaryConversationPrompt(text = "") {
  const clean = stripConversationalLeadIn(String(text || "").trim());
  if (!clean) return false;
  return ORDINARY_CONVERSATION_PATTERNS.some((pattern) => pattern.test(clean));
}

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

export function isExplicitNewTopicPrompt(text = "") {
  const clean = stripConversationalLeadIn(String(text || "").trim());
  if (!clean) return false;
  if (/^(?:yes|yeah|yep|okay|ok|sure|continue|go on|go ahead|do that)$/i.test(clean)) return false;
  if (FOLLOW_UP_LANGUAGE_PATTERN.test(clean)) return false;
  if (SOURCE_FOLLOW_UP_PATTERN.test(clean)) return false;
  if (clean.length <= 120 && FOLLOW_UP_PRONOUN_PATTERN.test(clean) && CONTEXTUAL_FOLLOW_UP_PATTERN.test(clean)) {
    return false;
  }
  if (isOrdinaryConversationPrompt(clean)) return true;
  return EXPLICIT_NEW_TOPIC_PATTERNS.some((pattern) => pattern.test(clean));
}

export function detectInstitutionRouteHint(text = "", { followUp = false, newTopic = false } = {}) {
  const clean = stripConversationalLeadIn(String(text || "").replace(/\s+/g, " ").trim());
  if (!clean) return "general_chat";
  if (EXPLICIT_RESEARCH_PATTERN.test(clean)) return "research_with_sources";
  if (EXPLICIT_CHEMISTRY_ROUTE_PATTERN.test(clean)) return "chemistry_solver";
  if (EXPLICIT_PHYSICS_ROUTE_PATTERN.test(clean)) return "physics_solver";
  if (EXPLICIT_MATH_ROUTE_PATTERN.test(clean)) return "math_solver";
  if (followUp && !newTopic) return "general_chat";
  if (EXPLICIT_WORKFLOW_ROUTE_PATTERN.test(clean)) return "workflow_assistant";
  if (isOrdinaryConversationPrompt(clean) || newTopic) return "general_chat";
  return "";
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

  if (isExplicitNewTopicPrompt(clean)) {
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

  if (FOLLOW_UP_ACCEPTANCE_PATTERN.test(clean)) {
    return { followUp: true, followUpType: "ACCEPT_CONTINUATION", targetLanguage: "" };
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

  if (SOURCE_FOLLOW_UP_PATTERN.test(clean)) {
    return { followUp: true, followUpType: "ADD_SOURCES", targetLanguage: "" };
  }

  return {
    followUp: false,
    followUpType: "",
    targetLanguage: "",
  };
}

function extractActiveTopic(items = []) {
  const list = Array.isArray(items) ? items : [];
  for (const preferredRole of ["user", "assistant", "ai"]) {
    for (let index = list.length - 1; index >= 0; index -= 1) {
      const message = list[index] || {};
      const role = String(message?.role || "").trim().toLowerCase();
      if (role !== preferredRole) continue;
      if (!isLikelyTopicSource(message)) continue;
      const topic = extractTopicFromText(message.text || "");
      if (topic) return topic;
    }
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
  if (isExplicitNewTopicPrompt(clean)) return false;
  if (SOURCE_FOLLOW_UP_PATTERN.test(clean)) return true;
  if (FOLLOW_UP_ACCEPTANCE_PATTERN.test(clean)) return true;
  if (FOLLOW_UP_TRIGGER_PATTERN.test(clean)) return true;
  if (clean.length <= 64 && FOLLOW_UP_PRONOUN_PATTERN.test(clean)) return true;
  if (clean.length <= 40 && /^(?:yes|continue|go on|go ahead|explain more|tell me more|simpler|expand|more details)$/i.test(clean)) {
    return true;
  }
  return false;
}

function extractPendingAssistantIntent(text = "") {
  const value = String(text || "").trim();
  if (!value) return "";

  for (const pattern of ASSISTANT_CONTINUATION_QUESTION_PATTERNS) {
    const match = value.match(pattern);
    const candidate = normalizeTopicCandidate(match?.[1] || "");
    if (candidate && !isStopwordTopic(candidate)) {
      return candidate.replace(/\b(for you|for me)\b/gi, "").replace(/\s+/g, " ").trim();
    }
  }

  const trailingSentence = value
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(-3)
    .find((sentence) =>
      /\b(example|examples|for example|simple example|break this down|walk through|steps?|expand|go deeper|more detail|summary|quiz|flashcards?|diagram|draft|compare)\b/i.test(
        sentence,
      ),
    );
  if (!trailingSentence) return "";

  return trailingSentence.replace(/[.?!]+$/, "").trim();
}

function getLastMeaningfulUserText(items = []) {
  for (let index = (Array.isArray(items) ? items.length : 0) - 1; index >= 0; index -= 1) {
    const message = items[index] || {};
    const role = String(message?.role || "").trim().toLowerCase();
    const text = String(message?.text || "").trim();
    if (role !== "user" || !text) continue;
    if (!isLikelyTopicSource(message)) continue;
    return text;
  }
  return "";
}

function detectPendingAssistantMode(items = []) {
  const list = Array.isArray(items) ? items : [];
  const lastAssistant = [...list]
    .reverse()
    .find((message) => ASSISTANT_ROLES.has(String(message?.role || "").trim().toLowerCase()));
  const assistantText = String(lastAssistant?.text || "").trim();
  const assistantType = String(lastAssistant?.type || "").trim().toLowerCase();
  const lastUserText = getLastMeaningfulUserText(list);

  if (["web_image_row", "diagram_block", "visual_group", "image"].includes(assistantType)) {
    return "visual";
  }
  if (Array.isArray(lastAssistant?.sources) && lastAssistant.sources.length > 0) {
    return "research_with_sources";
  }
  if (EXPLICIT_RESEARCH_PATTERN.test(assistantText) || EXPLICIT_RESEARCH_PATTERN.test(lastUserText)) {
    return "research_with_sources";
  }
  if (EXPLICIT_CHEMISTRY_ROUTE_PATTERN.test(lastUserText) || EXPLICIT_CHEMISTRY_ROUTE_PATTERN.test(assistantText)) {
    return "chemistry_solver";
  }
  if (EXPLICIT_PHYSICS_ROUTE_PATTERN.test(lastUserText) || EXPLICIT_PHYSICS_ROUTE_PATTERN.test(assistantText)) {
    return "physics_solver";
  }
  if (EXPLICIT_MATH_ROUTE_PATTERN.test(lastUserText) || /\b(?:final answer|step\s*\d+|simplify|equation|solution)\b/i.test(assistantText)) {
    return "math_solver";
  }
  return "general_chat";
}

export function derivePendingAssistantContext(items = []) {
  const lastAssistantText = getLastAssistantMessageText(items);
  return {
    pendingAssistantIntent: extractPendingAssistantIntent(lastAssistantText),
    pendingAssistantMode: detectPendingAssistantMode(items),
    previousAssistantMessage: lastAssistantText,
  };
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
  const normalizedForTopicCheck = stripConversationalLeadIn(clean);
  if (isExplicitNewTopicPrompt(clean)) return clean;
  if (!isContextDependentFollowUp(clean)) return clean;

  const { pendingAssistantIntent, pendingAssistantMode, previousAssistantMessage: lastAssistantText } =
    derivePendingAssistantContext(items);
  const activeTopic = extractActiveTopic(items);
  const weakSubjectTopic =
    ["math_solver", "physics_solver", "chemistry_solver"].includes(String(pendingAssistantMode || "")) &&
    /^(?:solve|final|step|answer|divide|subtract|add|multiply|simplify|integrate|differentiate)$/i.test(activeTopic);
  const stableActiveTopic = weakSubjectTopic ? "" : activeTopic;

  if (FOLLOW_UP_ACCEPTANCE_PATTERN.test(clean) && pendingAssistantIntent) {
    const modeClause =
      pendingAssistantMode && pendingAssistantMode !== "general_chat" && pendingAssistantMode !== "visual"
        ? ` Keep the same ${pendingAssistantMode.replace(/_/g, " ")} mode while you continue.`
        : pendingAssistantMode === "visual"
          ? " Keep the same visual context while you continue."
          : "";
    return stableActiveTopic
      ? `Stay on the same topic (${stableActiveTopic}) and continue naturally with the next helpful step you already offered: ${pendingAssistantIntent}. Do not restart the explanation or ask the user to repeat the topic.${modeClause}`
      : `Continue naturally with the next helpful step you already offered in your previous answer: ${pendingAssistantIntent}. Do not restart the topic.${modeClause}`;
  }

  if (SOURCE_FOLLOW_UP_PATTERN.test(clean) && stableActiveTopic) {
    return `Stay on the same topic (${stableActiveTopic}) and add concise supporting sources or references. Keep the flow natural and do not restart the topic.`;
  }

  const offeredStep = extractLastOfferedContinuation(lastAssistantText);
  if (offeredStep) {
    return `Pick up the last helpful next step from your previous answer and continue naturally: ${offeredStep}`;
  }

  if (stableActiveTopic) {
    return [
      `Active topic: ${stableActiveTopic}.`,
      `The user's follow-up is: ${normalizedForTopicCheck || clean}.`,
      `Interpret pronouns like it, they, them, this, that, and there using the active topic.`,
      "Answer directly without asking the user to repeat the topic.",
    ].join(" ");
  }

  if (FOLLOW_UP_DETAIL_PATTERN.test(clean)) {
    return "The user wants you to continue the previous answer more clearly. Continue the most recent topic naturally, and ask one short clarification only if the topic is genuinely ambiguous.";
  }

  return "The user is asking a follow-up that depends on the recent conversation. Continue naturally if the topic is reasonably clear; otherwise ask one short clarification before answering.";
}

export function formatAiServiceError({ backendHealthy = true, status = null, message = "" } = {}) {
  const cleanMessage = String(message || "").trim();
  if (!backendHealthy) {
    return "I can't reach the AI service right now, but this should be temporary. Please try again in a moment.";
  }
  if (status) {
    return `I hit a temporary problem while generating that reply (status ${status}). Please try again in a moment.`;
  }
  if (cleanMessage) {
    return `I hit a temporary problem while generating that reply. ${cleanMessage}`;
  }
  return "I hit a temporary problem while generating that reply. Please try again in a moment.";
}
