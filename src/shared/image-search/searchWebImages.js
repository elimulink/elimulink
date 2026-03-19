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

export function getImageSearchQuery(text) {
  const value = String(text || "").trim();
  if (!value) return "";
  const patterns = [
    /^(?:search|find|show)\s+(?:the\s+)?(?:web\s+)?images?\s+(?:for|of)\s+(.+)$/i,
    /^(?:web\s+)?image\s+search\s*:\s*(.+)$/i,
    /^images?\s*:\s*(.+)$/i,
  ];
  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return "";
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
    throw new Error("Web image search is unavailable right now.");
  }

  const data = await response.json();
  const results = Array.isArray(data?.results) ? data.results : [];
  return results
    .map(normalizeResult)
    .filter((item) => item.thumbnail && item.link)
    .slice(0, limit);
}
