import { apiUrl } from "../../lib/apiUrl";
import { normalizeResearchSources } from "../research/researchUtils.js";

export async function fetchAssistantReplyJson({
  path,
  token,
  body,
  timingStarted = 0,
  onTiming = null,
} = {}) {
  const response = await fetch(apiUrl(path), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body || {}),
  });

  const result = await response.json().catch(() => ({}));
  if (timingStarted && typeof onTiming === "function") {
    onTiming("full_response_received", timingStarted, {
      status: response.status,
    });
  }

  return {
    ok: response.ok,
    status: response.status,
    result,
    text: result?.text || result?.reply || result?.data?.reply || "Response received.",
    sources: normalizeResearchSources(result),
    sessionId: String(result?.data?.session_id || result?.session_id || ""),
  };
}

export async function streamAssistantReplySse({
  path,
  token,
  body,
  timingStarted = 0,
  onFirstChunk = null,
  onChunk = null,
  onComplete = null,
} = {}) {
  const response = await fetch(`${apiUrl(path)}?stream=1`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body || {}),
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
  let firstChunkSeen = false;

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
        if (!firstChunkSeen) {
          firstChunkSeen = true;
          if (typeof onFirstChunk === "function") {
            onFirstChunk({ timingStarted });
          }
        }
        streamedText += delta;
        onChunk?.(delta, streamedText);
      }
    }

    if (eventType === "done") {
      const finalText = String(payload?.text || streamedText).trim() || "Response received.";
      const normalizedSources = normalizeResearchSources({ sources: payload?.sources });
      const completedPayload = {
        completed: true,
        sessionId: String(payload?.session_id || ""),
        text: finalText,
        sources: normalizedSources,
      };
      onComplete?.(completedPayload);
      return completedPayload;
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
          return {
            ok: true,
            sessionId: completed.sessionId,
            text: completed.text,
            sources: completed.sources || [],
          };
        }
        sepIndex = buffer.search(/\r?\n\r?\n/);
      }
    }
  } catch {
    return { ok: false, reason: gotChunk ? "stream_interrupted" : "stream_failed" };
  } finally {
    reader.releaseLock();
  }

  return gotChunk
    ? {
        ok: true,
        sessionId: "",
        text: streamedText || "Response received.",
        sources: [],
      }
    : { ok: false, reason: "empty_stream" };
}
