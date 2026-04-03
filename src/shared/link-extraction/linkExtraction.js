const LINK_EXTRACTION_PROMPTS = [
  /\bextract\s+(that\s+|the\s+|all\s+)?links?\b/i,
  /\bget\s+(that\s+|the\s+|all\s+)?links?\b/i,
  /\bcopy\s+(that\s+|the\s+|all\s+)?links?\b/i,
  /\bfind\s+(that\s+|the\s+|all\s+)?links?\b/i,
  /\bgrab\s+(that\s+|the\s+|all\s+)?links?\b/i,
  /\bwhat\s+is\s+(that\s+|the\s+)?links?\b/i,
  /\bextract\s+(that\s+|the\s+)?url\b/i,
  /\bget\s+(that\s+|the\s+)?url\b/i,
];

const TRAILING_PUNCTUATION_RE = /[)\].,;:!?'"`<>]+$/;
const URL_CANDIDATE_RE =
  /((?:https?:\/\/|www\.|youtu\.be\/|bit\.ly\/|tinyurl\.com\/|t\.co\/)[^\s<>"'`]+|[a-z0-9.-]+\.[a-z]{2,}(?:\/[^\s<>"'`]*)?)/gi;

function normalizeWrappedText(rawText) {
  return String(rawText || "")
    .replace(/\u00a0/g, " ")
    .replace(/[\u200b\u200c\u200d]/g, "")
    .replace(/-\s*\n\s*/g, "")
    .replace(/([:/?&=#._-])\s*\n\s*/g, "$1")
    .replace(/\b(www\.)\s*\n\s*/gi, "$1")
    .replace(/\b(https?:\/\/)\s*\n\s*/gi, "$1")
    .replace(/\n+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function stripTrailingPunctuation(value) {
  let next = String(value || "").trim();
  while (TRAILING_PUNCTUATION_RE.test(next)) {
    next = next.replace(TRAILING_PUNCTUATION_RE, "");
  }
  return next;
}

function toDisplayUrl(rawUrl) {
  const cleaned = stripTrailingPunctuation(rawUrl).replace(/\s+/g, "");
  if (!cleaned) return "";

  if (/^https?:\/\//i.test(cleaned)) return cleaned;
  return `https://${cleaned}`;
}

function looksLikeDomainToken(value) {
  const token = String(value || "").toLowerCase();
  if (!token.includes(".")) return false;
  if (/^[\d.]+$/.test(token)) return false;
  if (/\.(png|jpe?g|gif|webp|svg|pdf|docx?|xlsx?|pptx?)$/i.test(token)) return false;
  return /^[a-z0-9.-]+\.[a-z]{2,}(?:\/[^\s]*)?$/i.test(token);
}

export function isLinkExtractionPrompt(text) {
  const clean = String(text || "").trim();
  if (!clean) return false;
  return LINK_EXTRACTION_PROMPTS.some((pattern) => pattern.test(clean));
}

export function extractLinksFromText(rawText) {
  const normalizedText = normalizeWrappedText(rawText);
  if (!normalizedText) {
    return { links: [], uncertain: false };
  }

  const seen = new Set();
  const links = [];
  let match;

  while ((match = URL_CANDIDATE_RE.exec(normalizedText)) !== null) {
    const rawCandidate = stripTrailingPunctuation(match[0]);
    if (!rawCandidate) continue;
    if (!/^https?:\/\//i.test(rawCandidate) && !/^www\./i.test(rawCandidate) && !looksLikeDomainToken(rawCandidate)) {
      continue;
    }

    const href = toDisplayUrl(rawCandidate);
    const label = rawCandidate;
    const key = href.toLowerCase();
    if (!href || seen.has(key)) continue;

    seen.add(key);
    links.push({ label, href });
  }

  const uncertain =
    /https?:\/\/\S*$|www\.\S*$/i.test(normalizedText) && links.length === 0;

  return { links, uncertain };
}

export function formatExtractedLinksMessage({ links, uncertain = false, sourceLabel = "" } = {}) {
  const safeLinks = Array.isArray(links) ? links.filter((item) => item?.href) : [];
  if (!safeLinks.length) {
    return uncertain
      ? "I found a link-like fragment, but it is too unclear to reconstruct confidently. Please upload a sharper screenshot or paste the text."
      : "I couldn't find a visible link in that content. Please upload a clearer screenshot or paste the text directly.";
  }

  const heading = sourceLabel
    ? `Extracted links from ${sourceLabel}:`
    : "Extracted links:";
  const list = safeLinks
    .map((item, index) => `${index + 1}. [${item.label || item.href}](${item.href})`)
    .join("\n");
  const note = uncertain
    ? "\n\nNote: one link looked partially unclear, so please quickly verify before sharing."
    : "";

  return `${heading}\n\n${list}${note}`;
}
