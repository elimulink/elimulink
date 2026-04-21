import {
  isImageEditFollowUpPrompt,
  isImageGenerationPrompt,
} from "../image-generation/imageGenerationIntent.js";

function normalizeResult(item, index) {
  return {
    id: item.id || `${item.url || item.foreign_landing_url || "image"}-${index}`,
    title: item.title || item.creator || `Image ${index + 1}`,
    thumbnail: item.thumbnail || item.url,
    image: item.url || item.thumbnail,
    link: item.foreign_landing_url || item.url,
    sourceTitle: item.provider || item.source || "Openverse",
  };
}

const WEB_IMAGE_SEARCH_PATTERNS = [
  /^(?:show|show me|search|find|browse|get)\s+(?:me\s+)?(?:the\s+)?(?:web\s+)?(?:images?|pictures?|photos?|visuals?|diagrams?|illustrations?)\s+(?:for|of|about)\s+(.+)$/i,
  /^(?:show|show me|get|find|browse)\s+(?:me\s+)?images?\s+(.+)$/i,
  /^(?:show|show me|get|find|browse)\s+(?:me\s+)?photos?\s+(.+)$/i,
  /^(?:show|show me|get|find|browse)\s+(?:me\s+)?illustrations?\s+(.+)$/i,
  /^search\s+(?:the\s+)?web\s+for\s+(?:images?|pictures?|photos?|visuals?|diagrams?|illustrations?)\s+(?:of|about)\s+(.+)$/i,
  /^(?:web\s+)?image\s+search\s*(?:for|:)\s*(.+)$/i,
  /^(?:images?|pictures?|photos?|diagrams?)\s*:\s*(.+)$/i,
  /^(?:show|find|get|browse)\s+(?:me\s+)?(?:real|reference)\s+(?:images?|pictures?|photos?|visuals?|diagrams?|illustrations?)\s+(?:of|for|about)\s+(.+)$/i,
  /^(?:show|find|get)\s+(?:me\s+)?(?:examples?|visual references?)\s+(?:from\s+the\s+web\s+)?(?:of|for)\s+(.+)$/i,
  /^(?:show|show me|find|get)\s+(?:me\s+)?diagrams?\s+(?:of|for|about)\s+(.+)$/i,
  /^(?:i need|give me)\s+(?:images?|pictures?|photos?|diagrams?)\s+(?:of|for|about)\s+(.+)$/i,
  /^(?:explain|describe|teach me)\s+(.+?)\s+and\s+show\s+(?:me\s+)?(?:images?|pictures?|photos?|diagrams?)$/i,
];

const WEB_IMAGE_REFERENCE_HINT = /\b(real|reference|web)\s+(images?|pictures?|photos?|visuals?|diagrams?|illustrations?)\b/i;
const WEB_IMAGE_GENERAL_HINT =
  /\b(?:images?|pictures?|photos?|visuals?|diagrams?|illustrations?)\b/i;
const WEB_IMAGE_CASUAL_BLOCKLIST = /\b(uploaded image|this image|previous image|generated image|edit image|analy[sz]e (?:this|the) image)\b/i;

export function getImageSearchQuery(text, {
  hasAttachments = false,
  shouldGenerateImage = false,
  shouldEditImage = false,
} = {}) {
  const value = String(text || "").trim();
  if (!value) return "";
  if (hasAttachments || shouldGenerateImage || shouldEditImage) return "";
  if (isImageGenerationPrompt(value) || isImageEditFollowUpPrompt(value)) return "";
  if (WEB_IMAGE_CASUAL_BLOCKLIST.test(value)) return "";

  for (const pattern of WEB_IMAGE_SEARCH_PATTERNS) {
    const match = value.match(pattern);
    if (match?.[1]) return match[1].trim();
  }

  if (
    WEB_IMAGE_REFERENCE_HINT.test(value) &&
    /\b(show|find|get|browse|search|examples?|references?)\b/i.test(value)
  ) {
    return value
      .replace(/^(?:please\s+)?(?:show|find|get|browse|search)\s+(?:me\s+)?/i, "")
      .replace(/\b(?:real|reference|web)\s+(?:images?|pictures?|photos?|visuals?)\b/gi, "")
      .replace(/^(?:of|for|about)\s+/i, "")
      .trim();
  }

  if (
    WEB_IMAGE_GENERAL_HINT.test(value) &&
    /\b(show|show me|find|find me|get|search|browse|need|give me)\b/i.test(value)
  ) {
    return value
      .replace(/^(?:please\s+)?(?:show|show me|find|find me|get|search|browse|need|give me)\s+(?:me\s+)?/i, "")
      .replace(/\b(?:images?|pictures?|photos?|visuals?|diagrams?|illustrations?)\b/gi, "")
      .replace(/^(?:of|for|about)\s+/i, "")
      .replace(/\s+and\s+show\s*$/i, "")
      .trim();
  }

  return "";
}

export function resolveWebImageSearchQuery(text, options = {}) {
  return getImageSearchQuery(text, options);
}

export async function searchWebImages(query, { limit = 8 } = {}) {
  const clean = String(query || "").trim();
  if (!clean) return [];

  const endpoint = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(clean)}&page_size=${limit}`;
  const response = await fetch(endpoint, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Image search could not reach the image provider right now.");
  }

  let data = {};
  try {
    data = await response.json();
  } catch {
    throw new Error("Image search returned an unreadable response.");
  }
  const results = Array.isArray(data?.results) ? data.results : [];
  return results
    .map(normalizeResult)
    .filter((item) => item.thumbnail && item.link)
    .slice(0, limit);
}
