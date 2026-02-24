let recognitionInstance = null;

function getRecognitionCtor() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function isSpeechRecognitionSupported() {
  return Boolean(getRecognitionCtor());
}

export function startRecognition({ onResult, onError, onEnd } = {}) {
  const Ctor = getRecognitionCtor();
  if (!Ctor) return false;

  if (recognitionInstance) {
    try {
      recognitionInstance.stop();
    } catch (e) {}
    recognitionInstance = null;
  }

  const recognition = new Ctor();
  const preferredLang =
    typeof navigator !== "undefined" && Array.isArray(navigator.languages) && navigator.languages.includes("en-KE")
      ? "en-KE"
      : "en-US";
  recognition.lang = preferredLang;
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onresult = (event) => {
    let finalText = "";
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const item = event.results[i];
      if (item.isFinal) {
        finalText += item[0]?.transcript || "";
      }
    }
    if (finalText.trim() && typeof onResult === "function") {
      onResult(finalText.trim());
    }
  };

  recognition.onerror = (event) => {
    if (typeof onError === "function") onError(event);
  };

  recognition.onend = () => {
    if (recognitionInstance === recognition) {
      recognitionInstance = null;
    }
    if (typeof onEnd === "function") onEnd();
  };

  recognitionInstance = recognition;
  recognition.start();
  return true;
}

export function stopRecognition() {
  if (!recognitionInstance) return;
  try {
    recognitionInstance.stop();
  } catch (e) {}
}

function sanitizeSpokenText(text) {
  const raw = String(text || "");
  const withoutUrls = raw.replace(/https?:\/\/\S+/gi, "");
  return withoutUrls.replace(/\s+/g, " ").trim().slice(0, 800);
}

export function speak(text) {
  if (typeof window === "undefined" || !window.speechSynthesis) return false;
  const cleaned = sanitizeSpokenText(text);
  if (!cleaned) return false;
  const utterance = new SpeechSynthesisUtterance(cleaned);
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  return true;
}

export function cancelSpeak() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
}
