const URL_PATTERN = /(https?:\/\/[^\s)]+|www\.[^\s)]+)/gi;
const HEADING_PATTERN = /^#{1,4}\s+\S+/m;
const MARKDOWN_LINK_PATTERN = /\[[^\]]+\]\((https?:\/\/[^)]+)\)/;
const MARKDOWN_BOLD_PATTERN = /(\*\*[^*]+\*\*|__[^_]+__)/;
const MATH_PATTERN = /(\$\$[\s\S]+?\$\$|\$[^$\n]+\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\))/;
const SIMPLE_DEFINITION_PATTERN =
  /^(?:[A-Z][\w\s()/.-]{1,80})\s+(?:is|are|refers to|means)\s+[\s\S]{12,420}$/;
const EXPLICIT_NOTE_PREFIX_PATTERN =
  /^(note|summary|study notes|revision notes|key points|takeaways?)\s*[:\-]/i;
const EXPLICIT_ACTION_PREFIX_PATTERN = /^(actions?|next steps?|quick actions?)\s*[:\-]/i;

function cleanText(value) {
  return String(value || "").replace(/\r\n/g, "\n").trim();
}

function splitByCodeFence(text) {
  const source = String(text || "").replace(/\r\n/g, "\n");
  const segments = [];
  const fencePattern = /```([\w+-]*)\n?([\s\S]*?)```/g;
  let cursor = 0;
  let match;

  while ((match = fencePattern.exec(source)) !== null) {
    if (match.index > cursor) {
      segments.push({
        kind: "text",
        value: source.slice(cursor, match.index),
      });
    }

    segments.push({
      kind: "code",
      value: match[2] || "",
      language: String(match[1] || "").trim(),
    });
    cursor = fencePattern.lastIndex;
  }

  if (cursor < source.length) {
    segments.push({
      kind: "text",
      value: source.slice(cursor),
    });
  }

  return segments.filter((segment) => cleanText(segment.value));
}

function splitTextIntoParagraphs(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function getTextShape(value) {
  const text = cleanText(value);
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  return {
    text,
    lines,
    lineCount: lines.length,
    paragraphCount: splitTextIntoParagraphs(text).length,
    listItemCount: lines.filter((line) => /^(\s{0,6}[-*â€¢]\s+|\s{0,6}\d+[.)]\s+)/.test(line)).length,
    headingCount: lines.filter((line) => HEADING_PATTERN.test(line)).length,
    hasCodeFence: /```/.test(text),
  };
}

function isSimpleDirectAnswer(value) {
  const shape = getTextShape(value);
  if (!shape.text || shape.hasCodeFence) return false;
  if (EXPLICIT_NOTE_PREFIX_PATTERN.test(shape.text) || EXPLICIT_ACTION_PREFIX_PATTERN.test(shape.text)) return false;
  if (shape.lineCount <= 3 && shape.paragraphCount <= 2 && shape.listItemCount <= 2 && shape.text.length <= 520) {
    return true;
  }
  return SIMPLE_DEFINITION_PATTERN.test(shape.text) && shape.lineCount <= 5 && shape.listItemCount <= 2;
}

function isJsonBlock(value) {
  const text = cleanText(value);
  if (!text) return false;
  const startsJson = (text.startsWith("{") && text.endsWith("}")) || (text.startsWith("[") && text.endsWith("]"));
  if (!startsJson) return false;
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

function isMarkdownTable(value) {
  const lines = cleanText(value).split("\n").filter(Boolean);
  if (lines.length < 2) return false;
  const hasHeader = /^\|?.+\|.+\|?$/.test(lines[0]);
  const hasDivider = /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(lines[1]);
  return hasHeader && hasDivider;
}

function isListBlock(value) {
  const lines = cleanText(value).split("\n").filter(Boolean);
  if (lines.length < 2) return false;
  return lines.every((line) => /^(\s{0,6}[-*•]\s+|\s{0,6}\d+[.)]\s+)/.test(line));
}

function isQuoteBlock(value) {
  const lines = cleanText(value).split("\n").filter(Boolean);
  if (!lines.length) return false;
  return lines.every((line) => /^\s*>\s+/.test(line)) || /^"[\s\S]+"$/.test(cleanText(value));
}

function isWarningBlock(value) {
  const text = cleanText(value);
  return /^(warning|caution|important|risk|alert)\s*[:\-]/i.test(text) || /^⚠/.test(text);
}

function isSuccessBlock(value) {
  const text = cleanText(value);
  return /^(success|done|completed|confirmed|status)\s*[:\-]/i.test(text) || /^✅/.test(text);
}

function isNoteBlock(value) {
  const text = cleanText(value);
  return /^(note|summary|study notes|revision notes|key points|takeaways?)\s*[:\-]/i.test(text);
}

function isActionBlock(value) {
  const text = cleanText(value);
  const lines = text.split("\n").filter(Boolean);
  const actionLead = /^(actions?|next steps?|quick actions?)\s*[:\-]/i.test(text);
  const actionableItems = lines.filter((line) =>
    /^(\s{0,6}[-*•]\s+|\s{0,6}\d+[.)]\s+)/.test(line) &&
    /(copy|open|download|retry|continue|summarize|turn into|generate|explain|create|save)/i.test(line)
  );
  return actionLead && actionableItems.length >= 1;
}

function isMathBlock(value) {
  const text = cleanText(value);
  if (!text) return false;
  if (MATH_PATTERN.test(text)) return true;
  const formulaScore =
    (text.match(/[=^√∑∫π]/g) || []).length +
    (text.match(/\b(sin|cos|tan|log|lim|frac|sqrt)\b/gi) || []).length;
  return formulaScore >= 2 && text.length <= 400;
}

function isLinkBlock(value) {
  const text = cleanText(value);
  if (!text) return false;
  const urls = text.match(URL_PATTERN) || [];
  if (!urls.length) return false;
  const stripped = text
    .replace(URL_PATTERN, "")
    .replace(MARKDOWN_LINK_PATTERN, "")
    .replace(/[-*•\d.)\s:[\]]/g, "")
    .trim();
  return urls.length >= 2 || stripped.length <= 40;
}

function isMarkdownBlock(value) {
  const text = cleanText(value);
  if (!text || text.length < 40) return false;
  const hasHeading = HEADING_PATTERN.test(text);
  const hasLink = MARKDOWN_LINK_PATTERN.test(text);
  const hasBold = MARKDOWN_BOLD_PATTERN.test(text);
  const hasQuote = /^\s*>\s+/m.test(text);
  const hasList = /^(\s{0,6}[-*•]\s+|\s{0,6}\d+[.)]\s+)/m.test(text);
  if (hasHeading && (hasList || hasBold || hasQuote || hasLink || text.length >= 60)) return true;
  return [hasLink, hasBold, hasQuote, hasList].filter(Boolean).length >= 2;
}

function isPlainTextBlock(value) {
  const text = cleanText(value);
  if (!text || text.length < 220) return false;
  return /^(plain text|draft|template|copy this|message to send|email draft|letter draft)\s*[:\-]/i.test(text);
}

function toListItems(value) {
  return cleanText(value)
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const depth = Math.min(3, Math.floor((line.match(/^\s+/)?.[0]?.length || 0) / 2));
      const ordered = /^\s{0,6}\d+[.)]\s+/.test(line);
      const text = line.replace(/^(\s{0,6}[-*•]\s+|\s{0,6}\d+[.)]\s+)/, "").trim();
      return { depth, ordered, text };
    });
}

function toTableData(value) {
  const lines = cleanText(value)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const rows = lines
    .filter((line, index) => index !== 1)
    .map((line) =>
      line
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((cell) => cell.trim())
    );
  return {
    columns: rows[0] || [],
    rows: rows.slice(1),
  };
}

function toQuoteText(value) {
  return cleanText(value)
    .split("\n")
    .map((line) => line.replace(/^\s*>\s?/, ""))
    .join("\n")
    .replace(/^"|"$/g, "")
    .trim();
}

function toActionItems(value) {
  const text = cleanText(value);
  return text
    .split("\n")
    .filter((line) => /^(\s{0,6}[-*•]\s+|\s{0,6}\d+[.)]\s+)/.test(line))
    .map((line) => line.replace(/^(\s{0,6}[-*•]\s+|\s{0,6}\d+[.)]\s+)/, "").trim())
    .filter(Boolean);
}

function toLinksFromText(value) {
  const text = cleanText(value);
  const links = [];
  const seen = new Set();
  const inlineLinkPattern = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
  let match;

  while ((match = inlineLinkPattern.exec(text)) !== null) {
    const href = match[2];
    if (seen.has(href)) continue;
    seen.add(href);
    links.push({
      title: match[1],
      url: href,
      description: "",
      domain: safeDomainLabel(href),
    });
  }

  const rawUrls = text.match(URL_PATTERN) || [];
  rawUrls.forEach((item) => {
    const url = item.startsWith("http") ? item : `https://${item}`;
    if (seen.has(url)) return;
    seen.add(url);
    links.push({
      title: safeDomainLabel(url),
      url,
      description: "",
      domain: safeDomainLabel(url),
    });
  });

  return links;
}

function safeDomainLabel(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return String(url || "").replace(/^https?:\/\//, "").split("/")[0] || "Source";
  }
}

function normalizeSourceLinks(sources = []) {
  const seen = new Set();
  return (Array.isArray(sources) ? sources : [])
    .map((source) => {
      const url = String(source?.url || source?.href || "").trim();
      if (!url || seen.has(url)) return null;
      seen.add(url);
      return {
        title: String(source?.title || source?.label || safeDomainLabel(url)).trim(),
        url,
        description: String(source?.snippet || source?.description || "").trim(),
        domain: String(source?.domain || safeDomainLabel(url)).trim(),
      };
    })
    .filter(Boolean);
}

function buildTextBlock(segment, index) {
  const shape = getTextShape(segment);
  const shouldStayPlain =
    isSimpleDirectAnswer(segment) ||
    (shape.listItemCount > 0 &&
      shape.listItemCount <= 3 &&
      shape.text.length < 260 &&
      !EXPLICIT_NOTE_PREFIX_PATTERN.test(shape.text) &&
      !EXPLICIT_ACTION_PREFIX_PATTERN.test(shape.text));

  if (isJsonBlock(segment)) {
    return {
      id: `json-${index}`,
      type: "json",
      raw: cleanText(segment),
      data: JSON.parse(cleanText(segment)),
    };
  }

  if (isMarkdownTable(segment)) {
    return {
      id: `table-${index}`,
      type: "table",
      ...toTableData(segment),
    };
  }

  if (shouldStayPlain && !isLinkBlock(segment)) {
    return {
      id: `text-${index}`,
      type: "normal_text",
      text: cleanText(segment),
    };
  }

  if (isMathBlock(segment)) {
    return {
      id: `math-${index}`,
      type: "math",
      text: cleanText(segment),
    };
  }

  if (isActionBlock(segment)) {
    return {
      id: `actions-${index}`,
      type: "actions",
      items: toActionItems(segment),
    };
  }

  if (isWarningBlock(segment)) {
    return {
      id: `warning-${index}`,
      type: "warning",
      text: cleanText(segment).replace(/^(warning|caution|important|risk|alert)\s*[:\-]\s*/i, ""),
    };
  }

  if (isSuccessBlock(segment)) {
    return {
      id: `success-${index}`,
      type: "success",
      text: cleanText(segment).replace(/^(success|done|completed|confirmed|status)\s*[:\-]\s*/i, ""),
    };
  }

  if (isNoteBlock(segment)) {
    return {
      id: `note-${index}`,
      type: "note",
      text: cleanText(segment).replace(/^(note|summary|study notes|revision notes|key points|takeaways?)\s*[:\-]\s*/i, ""),
    };
  }

  if (isListBlock(segment)) {
    return {
      id: `list-${index}`,
      type: "list",
      items: toListItems(segment),
    };
  }

  if (isQuoteBlock(segment)) {
    return {
      id: `quote-${index}`,
      type: "quote",
      text: toQuoteText(segment),
    };
  }

  if (isLinkBlock(segment)) {
    const links = toLinksFromText(segment);
    if (links.length) {
      return {
        id: `links-${index}`,
        type: "links",
        links,
      };
    }
  }

  if (isPlainTextBlock(segment)) {
    return {
      id: `plain-${index}`,
      type: "plain_text",
      text: cleanText(segment).replace(
        /^(plain text|draft|template|copy this|message to send|email draft|letter draft)\s*[:\-]\s*/i,
        ""
      ),
    };
  }

  if (isMarkdownBlock(segment)) {
    return {
      id: `markdown-${index}`,
      type: "markdown",
      text: cleanText(segment),
    };
  }

  return {
    id: `text-${index}`,
    type: "normal_text",
    text: cleanText(segment),
  };
}

export function parseAssistantResponseBlocks({
  text = "",
  imageUrl = "",
  sources = [],
} = {}) {
  const blocks = [];
  const codeAwareSegments = splitByCodeFence(text);

  if (imageUrl) {
    blocks.push({
      id: "image-main",
      type: "image",
      imageUrl,
      caption: cleanText(text),
    });
  }

  codeAwareSegments.forEach((segment, segmentIndex) => {
    if (segment.kind === "code") {
      blocks.push({
        id: `code-${segmentIndex}`,
        type: "code",
        language: segment.language || "code",
        code: segment.value.replace(/^\n+|\n+$/g, ""),
      });
      return;
    }

    splitTextIntoParagraphs(segment.value).forEach((chunk, chunkIndex) => {
      blocks.push(buildTextBlock(chunk, `${segmentIndex}-${chunkIndex}`));
    });
  });

  const sourceLinks = normalizeSourceLinks(sources);
  if (sourceLinks.length) {
    blocks.push({
      id: "sources-block",
      type: "links",
      title: "Sources",
      links: sourceLinks,
    });
  }

  if (!blocks.length && cleanText(text)) {
    blocks.push({
      id: "text-fallback",
      type: "normal_text",
      text: cleanText(text),
    });
  }

  return blocks;
}
