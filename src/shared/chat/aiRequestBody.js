function normalizeRequestIntelligence(requestIntelligence = null) {
  const intelligence = requestIntelligence || {};
  return {
    normalizedMessage: String(intelligence.normalizedMessage || "").trim() || undefined,
    topic: String(intelligence.topic || "").trim() || undefined,
    followUp: Boolean(intelligence.followUp),
    followUpType: String(intelligence.followUpType || "").trim() || undefined,
    targetLanguage: String(intelligence.targetLanguage || "").trim() || undefined,
    previousAssistantMessage: String(intelligence.previousAssistantMessage || "").trim() || undefined,
    pendingAssistantIntent: String(intelligence.pendingAssistantIntent || "").trim() || undefined,
    pendingAssistantMode: String(intelligence.pendingAssistantMode || "").trim() || undefined,
    newTopic: Boolean(intelligence.newTopic),
    routeHint: String(intelligence.routeHint || "").trim() || undefined,
  };
}

export function buildAiChatRequestBody({
  messageText,
  appType,
  sessionId = "",
  requestIntelligence = null,
  extras = null,
} = {}) {
  const intelligence = normalizeRequestIntelligence(requestIntelligence);
  return {
    message: String(messageText || "").trim(),
    app_type: String(appType || "").trim() || undefined,
    session_id: String(sessionId || "").trim() || undefined,
    normalizedMessage: intelligence.normalizedMessage,
    topic: intelligence.topic,
    followUp: intelligence.followUp,
    followUpType: intelligence.followUpType,
    targetLanguage: intelligence.targetLanguage,
    previousAssistantMessage: intelligence.previousAssistantMessage,
    pendingAssistantIntent: intelligence.pendingAssistantIntent,
    pendingAssistantMode: intelligence.pendingAssistantMode,
    newTopic: intelligence.newTopic,
    routeHint: intelligence.routeHint,
    ...(extras || {}),
  };
}
