function safeString(value) {
  return String(value || "").trim();
}

function isMeaningfulSource(source) {
  const url = safeString(source?.url || source?.link || source?.href);
  const domain = safeString(source?.domain || source?.provider || domainFromUrl(url));
  const title = safeString(source?.title || source?.label);
  const snippet = safeString(source?.snippet || source?.text || source?.summary || source?.description);

  if (!url && !domain && !title && !snippet) return false;
  if (!url && !domain && /^source\s*\d+$/i.test(title)) return false;
  return Boolean(url || domain || title || snippet);
}

function toBase64Url(raw) {
  const utf8 = encodeURIComponent(raw).replace(/%([0-9A-F]{2})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );
  return window.btoa(utf8).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function domainFromUrl(url) {
  const value = safeString(url);
  if (!value) return "";
  try {
    const parsed = new URL(value, window.location.origin);
    return parsed.hostname.replace(/^www\./i, "");
  } catch {
    return "";
  }
}

export function detectTextSources(text) {
  const value = safeString(text);
  if (!value) return [];
  const matches = value.match(/https?:\/\/\S+/gi) || [];
  return matches.map((url, index) => ({
    id: `text-source-${index}`,
    title: domainFromUrl(url) || `Source ${index + 1}`,
    domain: domainFromUrl(url),
    url,
    snippet: "",
  }));
}

export function normalizeResearchSources(input = {}) {
  const directSources = Array.isArray(input?.sources)
    ? input.sources
    : Array.isArray(input?.citations)
      ? input.citations
      : [];

  const fromDirect = directSources
    .filter(isMeaningfulSource)
    .map((source, index) => {
      const url = safeString(source?.url || source?.link || source?.href);
      const domain = safeString(source?.domain || source?.provider || domainFromUrl(url));
      const title = safeString(source?.title || source?.label || domain || `Source ${index + 1}`);
      const snippet = safeString(source?.snippet || source?.text || source?.summary || source?.description);
      if (!title && !url && !snippet) return null;
      return {
        id: safeString(source?.id || `${title}-${index}`) || `source-${index}`,
        title,
        domain,
        snippet,
        url,
        faviconUrl: safeString(source?.favicon_url || source?.faviconUrl || source?.favicon || ""),
      };
    })
    .filter(Boolean);

  const imageResults = Array.isArray(input?.imageSearchResults) ? input.imageSearchResults : [];
  const fromImages = imageResults
    .map((item, index) => {
      const url = safeString(item?.link || item?.url);
      const domain = safeString(item?.provider || item?.domain || domainFromUrl(url));
      const title = safeString(item?.title || domain || `Image source ${index + 1}`);
      const snippet = safeString(item?.description || item?.creator || item?.license || item?.source);
      if (!title && !url) return null;
      return {
        id: safeString(item?.id || `${title}-${index}`) || `image-source-${index}`,
        title,
        domain,
        snippet,
        url,
        faviconUrl: safeString(item?.faviconUrl || item?.favicon_url || ""),
      };
    })
    .filter(Boolean);

  const combined = [...fromDirect, ...fromImages, ...detectTextSources(input?.text)];
  const seen = new Set();
  return combined.filter((item) => {
    const key = `${item.url || ""}|${item.title}|${item.domain}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function createShareChatLink(payload = {}) {
  const message = safeString(payload?.message || payload?.text).slice(0, 1800);
  const title = safeString(payload?.title || "ElimuLink AI");
  const app = safeString(payload?.app || "ai");
  const sources = normalizeResearchSources({ sources: payload?.sources }).slice(0, 8);
  const encoded = toBase64Url(
    JSON.stringify({
      title,
      app,
      message,
      sources,
      createdAt: Date.now(),
    })
  );
  return `${window.location.origin}${window.location.pathname}#share=${encoded}`;
}
