const URL_PATTERN = /(https?:\/\/[^\s)]+|www\.[^\s)]+)/gi;
const HEADING_PATTERN = /^#{1,4}\s+\S+/m;
const HEADING_OR_LIST_PATTERN = /^(?:\s*#{1,6}\s+\S+|\s{0,6}[-*•]\s+|\s{0,6}\d+[.)]\s+)/m;
const MARKDOWN_LINK_PATTERN = /\[[^\]]+\]\((https?:\/\/[^)]+)\)/;
const MARKDOWN_BOLD_PATTERN = /(\*\*[^*]+\*\*|__[^_]+__)/;
const MATH_PATTERN = /(\$\$[\s\S]+?\$\$|\$[^$\n]+\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\))/;
const STRUCTURED_MATH_PATTERN =
  /(Problem:\s*\n[\s\S]*(?:Given:|Steps:)\s*\n[\s\S]*Final Answer:\s*\n[\s\S]*\\\[\\boxed\{)/i;
const MATH_STEPS_FINAL_PATTERN = /^Final Answer\s*[:\-]/im;
const SIMPLE_DEFINITION_PATTERN =
  /^(?:[A-Z][\w\s()/.-]{1,80})\s+(?:is|are|refers to|means)\s+[\s\S]{12,420}$/;
const EXPLICIT_NOTE_PREFIX_PATTERN =
  /^(note|summary|study notes|revision notes|key points|takeaways?)\s*[:\-]/i;
const EXPLICIT_ACTION_PREFIX_PATTERN = /^(actions?|next steps?|quick actions?)\s*[:\-]/i;
const EXPLICIT_LINKS_PREFIX_PATTERN = /^(sources?|references?|citations?|links?)\s*[:\-]/i;
const VISUAL_STATUS_TEXT_PATTERN =
  /^(?:here (?:is|are)|i (?:prepared|generated|created)|showing|displaying|searching images|preparing visuals|these are|this is)\b/i;
const SUPPORTED_EXPLICIT_BLOCK_TYPES = new Set([
  "normal_text",
  "list",
  "table",
  "math",
  "math_steps",
  "links",
  "generated_image",
  "image",
  "web_image_row",
  "diagram_block",
  "visual_group",
]);

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
  if (HEADING_OR_LIST_PATTERN.test(shape.text)) return false;
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
  const headerCells = lines[0]
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim())
    .filter(Boolean);
  const dividerCells = lines[1]
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
  if (headerCells.length < 2) return false;
  if (dividerCells.length !== headerCells.length) return false;
  if (!dividerCells.every((cell) => /^:?-{3,}:?$/.test(cell))) return false;
  return lines.slice(2).every((line) => {
    const rowCells = line.replace(/^\|/, "").replace(/\|$/, "").split("|");
    return rowCells.length === headerCells.length;
  });
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
  if (STRUCTURED_MATH_PATTERN.test(text)) return true;
  if (MATH_PATTERN.test(text)) return true;
  const formulaScore =
    (text.match(/[=^√∑∫π]/g) || []).length +
    (text.match(/\b(sin|cos|tan|log|lim|frac|sqrt)\b/gi) || []).length;
  return formulaScore >= 2 && text.length <= 400;
}

function extractSection(text, label, nextLabels = []) {
  const source = String(text || "");
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedNext = nextLabels.map((item) => item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const pattern = new RegExp(
    escapedNext
      ? `(?:^|\\n\\n)${escapedLabel}:\\s*\\n([\\s\\S]*?)(?=\\n\\n(?:${escapedNext}):|$)`
      : `(?:^|\\n\\n)${escapedLabel}:\\s*\\n([\\s\\S]*)$`,
    "i"
  );
  const match = source.match(pattern);
  return match ? match[1].trim() : "";
}

function splitMathStepChunks(text) {
  const source = String(text || "").trim();
  if (!source) return [];

  if (/^Step\s*\d+\s*[:.\-]/im.test(source)) {
    return source
      .split(/(?=^Step\s*\d+\s*[:.\-]\s*)/gim)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return source
    .split(/(?=^\d+[.)]\s+)/gm)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseMathStepEntry(stepText, index) {
  const lines = cleanText(stepText)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return null;

  const firstLine = lines[0];
  const headingMatch = firstLine.match(/^(Step\s*\d+|[1-9]\d*[.)])\s*[:.\-]?\s*(.*)$/i);
  const rawTitle = headingMatch ? headingMatch[1].replace(/\.$/, "") : `Step ${index + 1}`;
  const title = /^\d+(?:[.)])?$/.test(rawTitle) ? `Step ${rawTitle.replace(/[.)]/g, "")}` : rawTitle;
  const remainder = headingMatch ? headingMatch[2].trim() : firstLine;
  const bodyLines = headingMatch ? [remainder, ...lines.slice(1)] : lines.slice();
  const compactLines = bodyLines.filter(Boolean);

  let equation = "";
  const explanationLines = [];
  const items = [];

  compactLines.forEach((line) => {
    if (/^[-*•]\s+/.test(line)) {
      items.push(line.replace(/^[-*•]\s+/, "").trim());
      return;
    }
    const mathMatch = !equation ? line.match(MATH_PATTERN) : null;
    if (!equation && mathMatch) {
      const prefix = line.slice(0, mathMatch.index || 0).replace(/[:\s]+$/, "").trim();
      if (prefix) explanationLines.push(prefix);
      equation = mathMatch[0].trim();
      const suffix = line.slice((mathMatch.index || 0) + mathMatch[0].length).replace(/^[\s:.-]+/, "").trim();
      if (suffix) explanationLines.push(suffix);
      return;
    }
    if (!equation && /[=+\-*/^]|\\(?:frac|sqrt|boxed|int|sum|lim|cdot|times|pm|left|right)/.test(line)) {
      const pieces = line.split(/\s*:\s*/);
      if (pieces.length > 1) {
        explanationLines.push(pieces.slice(0, -1).join(": ").trim());
        equation = pieces[pieces.length - 1].trim();
        return;
      }
      equation = line;
      return;
    }
    explanationLines.push(line);
  });

  return {
    title,
    explanation: explanationLines.join(" ").trim(),
    equation: equation.trim(),
    items,
  };
}

function parseMathStepsBlock(text) {
  const source = String(text || "").replace(/\r\n/g, "\n").trim();
  if (!source) return null;

  const hasFinalAnswer = MATH_STEPS_FINAL_PATTERN.test(source);
  const stepMarkerCount = (source.match(/(?:^|\n)(?:Step\s*\d+|[1-9]\d*[.)])\s*[:.\-]?\s+/gim) || []).length;
  const hasSectionShape = /(?:^|\n)Problem:\s*\n/i.test(source) || /(?:^|\n)Steps:\s*\n/i.test(source);
  const mathSignalCount =
    (source.match(MATH_PATTERN) || []).length +
    (source.match(/\\(?:frac|sqrt|boxed|int|sum|pm|times|cdot|begin\{bmatrix\})/g) || []).length +
    (source.match(/[=^+\-*/]/g) || []).length;

  if (!hasFinalAnswer) return null;
  if (stepMarkerCount < 2 && !STRUCTURED_MATH_PATTERN.test(source) && !hasSectionShape) return null;
  if (mathSignalCount < 2 && !isMathBlock(source)) return null;

  const problem = extractSection(source, "Problem", ["Given", "Formula / Principle", "Formula", "Substitution", "Steps", "Final Answer"]);
  const intro = extractSection(source, "Intro", ["Given", "Formula / Principle", "Formula", "Substitution", "Steps", "Final Answer"]);
  const given = extractSection(source, "Given", ["Formula / Principle", "Formula", "Substitution", "Steps", "Final Answer"]);
  const formula =
    extractSection(source, "Formula / Principle", ["Substitution", "Steps", "Final Answer"]) ||
    extractSection(source, "Formula", ["Substitution", "Steps", "Final Answer"]);
  const substitution = extractSection(source, "Substitution", ["Steps", "Final Answer"]);
  const stepsBody = extractSection(source, "Steps", ["Final Answer"]);
  const finalAnswer = extractSection(source, "Final Answer", []);

  const rawSteps = splitMathStepChunks(stepsBody || source.replace(/^.*?Steps:\s*\n/i, "").replace(/\n\nFinal Answer:[\s\S]*$/i, ""));
  const steps = rawSteps.map(parseMathStepEntry).filter(Boolean);

  if (!finalAnswer || steps.length < 2) return null;

  return {
    id: "math-steps-main",
    type: "math_steps",
    text: source,
    problem,
    intro,
    given,
    formula,
    substitution,
    steps,
    finalAnswer,
  };
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

function isSafeLinkBlock(value) {
  const text = cleanText(value);
  if (!text) return false;
  const urls = text.match(URL_PATTERN) || [];
  if (!urls.length) return false;
  if (EXPLICIT_LINKS_PREFIX_PATTERN.test(text)) return true;

  const lines = text.split("\n").filter(Boolean);
  const urlHeavyLines = lines.filter((line) => {
    const normalizedLine = line.trim();
    if (!normalizedLine) return false;
    const lineUrls = normalizedLine.match(URL_PATTERN) || [];
    const strippedLine = normalizedLine.replace(URL_PATTERN, "").replace(/[-*•\d.)\s:[\]()]/g, "").trim();
    return lineUrls.length >= 1 && strippedLine.length <= 24;
  });
  if (urlHeavyLines.length >= 2) return true;

  const stripped = text
    .replace(URL_PATTERN, "")
    .replace(MARKDOWN_LINK_PATTERN, "")
    .replace(/[-*•\d.)\s:[\]]/g, "")
    .trim();
  return urls.length >= 2 || stripped.length <= 18;
}

function isMarkdownBlock(value) {
  const text = cleanText(value);
  if (!text || text.length < 40) return false;
  const hasHeading = HEADING_PATTERN.test(text);
  const hasLink = MARKDOWN_LINK_PATTERN.test(text);
  const hasBold = MARKDOWN_BOLD_PATTERN.test(text);
  const hasQuote = /^\s*>\s+/m.test(text);
  const hasList = /^(\s{0,6}[-*•]\s+|\s{0,6}\d+[.)]\s+)/m.test(text);
  if (hasHeading) return true;
  if (hasList && text.length >= 24) return true;
  if (hasQuote && text.length >= 24) return true;
  if (hasLink && (hasBold || hasQuote || hasList)) return true;
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
    const domain = safeDomainLabel(href);
    links.push({
      title: match[1],
      url: href,
      description: "",
      domain,
      sourceName: sourceNameFromDomain(domain),
    });
  }

  const rawUrls = text.match(URL_PATTERN) || [];
  rawUrls.forEach((item) => {
    const url = item.startsWith("http") ? item : `https://${item}`;
    if (seen.has(url)) return;
    seen.add(url);
    const domain = safeDomainLabel(url);
    links.push({
      title: domain,
      url,
      description: "",
      domain,
      sourceName: sourceNameFromDomain(domain),
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

function sourceNameFromDomain(domain) {
  const raw = String(domain || "").trim().toLowerCase();
  if (!raw) return "Source";
  const overrides = {
    "worldbank.org": "World Bank",
    "un.org": "United Nations",
    "unesco.org": "UNESCO",
    "who.int": "WHO",
    "wikipedia.org": "Wikipedia",
    "britannica.com": "Britannica",
    "example.com": "Example",
  };
  if (overrides[raw]) return overrides[raw];
  const firstLabel = raw.split(".")[0] || raw;
  return firstLabel
    .split("-")
    .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(" ");
}

function normalizeSourceLinks(sources = []) {
  const seen = new Set();
  return (Array.isArray(sources) ? sources : [])
    .map((source) => {
      const url = String(source?.url || source?.href || "").trim();
      if (!url || seen.has(url)) return null;
      seen.add(url);
      const domain = String(source?.domain || safeDomainLabel(url)).trim();
      return {
        title: String(source?.title || source?.label || safeDomainLabel(url)).trim(),
        url,
        description: String(source?.snippet || source?.description || "").trim(),
        domain,
        sourceName: String(source?.sourceName || sourceNameFromDomain(domain)).trim(),
      };
    })
    .filter(Boolean);
}

function normalizeWebImageResults(results = []) {
  return (Array.isArray(results) ? results : [])
    .map((item, index) => {
      const thumbnail = String(item?.thumbnail || item?.image || item?.url || "").trim();
      const link = String(item?.link || item?.url || "").trim();
      if (!thumbnail || !link) return null;
      return {
        id: String(item?.id || `${link}-${index}`),
        title: String(item?.title || `Image ${index + 1}`).trim(),
        thumbnail,
        image: String(item?.image || thumbnail).trim(),
        link,
        sourceTitle: String(item?.sourceTitle || item?.source || "Open source").trim(),
      };
    })
    .filter(Boolean);
}

function normalizeExplicitBlock(block, index = 0) {
  const type = String(block?.type || "").trim();
  if (!SUPPORTED_EXPLICIT_BLOCK_TYPES.has(type)) return null;

  if (type === "table") {
    const columns = Array.isArray(block?.columns) ? block.columns.map((cell) => String(cell || "").trim()) : [];
    const rows = Array.isArray(block?.rows)
      ? block.rows.map((row) => (Array.isArray(row) ? row.map((cell) => String(cell || "").trim()) : []))
      : [];
    if (!columns.length || !rows.length) return null;
    return { id: String(block?.id || `explicit-table-${index}`), type, columns, rows };
  }

  if (type === "list") {
    const items = Array.isArray(block?.items)
      ? block.items
          .map((item) =>
            typeof item === "string"
              ? { depth: 0, ordered: false, text: String(item || "").trim() }
              : {
                  depth: Math.max(0, Math.min(3, Number(item?.depth || 0) || 0)),
                  ordered: Boolean(item?.ordered),
                  text: String(item?.text || "").trim(),
                }
          )
          .filter((item) => item.text)
      : [];
    if (!items.length) return null;
    return { id: String(block?.id || `explicit-list-${index}`), type, items };
  }

  if (type === "links") {
    const links = normalizeSourceLinks(block?.links || block?.items || []);
    if (!links.length) return null;
    return { id: String(block?.id || `explicit-links-${index}`), type, title: String(block?.title || "").trim(), links };
  }

  if (type === "web_image_row") {
    const items = normalizeWebImageResults(block?.items || []);
    if (!items.length) return null;
    return { id: String(block?.id || `explicit-web-${index}`), type, query: cleanText(block?.query), items };
  }

  if (type === "diagram_block" || type === "generated_image" || type === "image") {
    const imageUrl = String(block?.imageUrl || block?.url || "").trim();
    if (!imageUrl) return null;
    return {
      id: String(block?.id || `explicit-image-${index}`),
      type: type === "generated_image" ? "image" : type,
      imageUrl,
      caption: cleanText(block?.caption || block?.text),
      subtitle: String(block?.subtitle || block?.label || "").trim(),
      subject: String(block?.subject || "").trim(),
      diagramType: String(block?.diagramType || "").trim(),
    };
  }

  if (type === "visual_group") {
    const sections = Array.isArray(block?.sections) ? block.sections : [];
    const normalizedSections = sections
      .map((section, sectionIndex) => {
        if (section?.type === "web_images") {
          const items = normalizeWebImageResults(section?.items || []);
          if (!items.length) return null;
          return {
            id: String(section?.id || `explicit-section-web-${sectionIndex}`),
            type: "web_images",
            title: String(section?.title || "Real Web Images").trim(),
            query: cleanText(section?.query),
            items,
          };
        }
        if (section?.type === "diagram") {
          const imageUrl = String(section?.imageUrl || section?.url || "").trim();
          if (!imageUrl) return null;
          return {
            id: String(section?.id || `explicit-section-diagram-${sectionIndex}`),
            type: "diagram",
            title: String(section?.title || section?.subtitle || "AI Sketch").trim(),
            imageUrl,
            caption: cleanText(section?.caption || section?.text),
            subtitle: String(section?.subtitle || section?.title || "").trim(),
            subject: String(section?.subject || "").trim(),
            diagramType: String(section?.diagramType || "").trim(),
          };
        }
        return null;
      })
      .filter(Boolean);
    if (!normalizedSections.length) return null;
    return { id: String(block?.id || `explicit-visual-group-${index}`), type, sections: normalizedSections };
  }

  if (type === "math_steps") {
    const parsed = block?.text ? parseMathStepsBlock(String(block.text || "")) : null;
    return parsed ? { ...parsed, id: String(block?.id || parsed.id || `explicit-math-steps-${index}`) } : null;
  }

  if (type === "math") {
    const mathText = cleanText(block?.text || "");
    return mathText ? { id: String(block?.id || `explicit-math-${index}`), type, text: mathText } : null;
  }

  const plainText = cleanText(block?.text || "");
  return plainText ? { id: String(block?.id || `explicit-${type}-${index}`), type, text: plainText } : null;
}

function parseExplicitStructuredBlocks(value) {
  const text = cleanText(value);
  if (!text || !isJsonBlock(text)) return null;
  try {
    const parsed = JSON.parse(text);
    const rawBlocks = Array.isArray(parsed?.blocks)
      ? parsed.blocks
      : Array.isArray(parsed)
        ? parsed
        : parsed?.type
          ? [parsed]
          : [];
    const normalized = rawBlocks.map((block, index) => normalizeExplicitBlock(block, index)).filter(Boolean);
    return normalized.length ? normalized : null;
  } catch {
    return null;
  }
}

function shouldRenderTextAlongsideVisuals(value) {
  const text = cleanText(value);
  if (!text) return false;
  const shape = getTextShape(text);
  if (shape.text.length <= 160 && shape.paragraphCount <= 2 && shape.listItemCount === 0 && !isMathBlock(text) && VISUAL_STATUS_TEXT_PATTERN.test(text)) {
    return false;
  }
  if (shape.text.length <= 120 && shape.paragraphCount <= 1 && !HEADING_OR_LIST_PATTERN.test(text) && !MARKDOWN_LINK_PATTERN.test(text)) {
    return false;
  }
  return true;
}

export function extractAssistantSources(text = "", sources = []) {
  const textSources = toLinksFromText(text);
  const normalizedSources = normalizeSourceLinks(sources);
  const merged = [...normalizedSources, ...textSources];
  const seen = new Set();
  return merged.filter((item) => {
    const key = String(item?.url || "").trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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

  if (shouldStayPlain && !isSafeLinkBlock(segment)) {
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

  if (isSafeLinkBlock(segment)) {
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

function mergeAdjacentBlocks(blocks = []) {
  const merged = [];
  const canMerge = (type) => ["normal_text", "plain_text", "note", "markdown", "list"].includes(type);

  for (const block of blocks || []) {
    const previous = merged[merged.length - 1];
    if (previous && block && previous.type === block.type && canMerge(previous.type)) {
      if (previous.type === "list") {
        previous.items = [...(previous.items || []), ...(block.items || [])];
      } else {
        previous.text = [previous.text, block.text].filter(Boolean).join("\n\n").trim();
      }
      continue;
    }
    merged.push(block);
  }

  return merged;
}

export function parseAssistantResponseBlocks({
  text = "",
  imageUrl = "",
  imageVariant = "image",
  diagramLabel = "",
  diagramSubject = "",
  diagramType = "",
  webImageResults = [],
  webImageQuery = "",
  sources = [],
} = {}) {
  const blocks = [];
  const explicitBlocks = parseExplicitStructuredBlocks(text);
  if (explicitBlocks?.length) {
    return mergeAdjacentBlocks(explicitBlocks);
  }
  const codeAwareSegments = splitByCodeFence(text);
  const normalizedWebImageResults = normalizeWebImageResults(webImageResults);
  const hasDiagram = Boolean(imageUrl) && imageVariant === "diagram";
  const hasWebImages = normalizedWebImageResults.length > 0;
  const shouldParseTextBody = !imageUrl && !hasWebImages ? Boolean(cleanText(text)) : shouldRenderTextAlongsideVisuals(text);
  const visualCaptionText = shouldParseTextBody ? "" : cleanText(text);

  if (hasWebImages && hasDiagram) {
    blocks.push({
      id: "visual-group-main",
      type: "visual_group",
      sections: [
        {
          id: "visual-group-web-images",
          type: "web_images",
          title: "Real Web Images",
          query: cleanText(webImageQuery),
          items: normalizedWebImageResults,
        },
        {
          id: "visual-group-diagram",
          type: "diagram",
          title: String(diagramLabel || "").trim() || "AI Sketch",
          imageUrl,
          caption: visualCaptionText,
          subtitle: String(diagramLabel || "").trim(),
          subject: String(diagramSubject || "").trim(),
          diagramType: String(diagramType || "").trim(),
        },
      ],
    });
  } else {
    if (imageUrl) {
      blocks.push({
        id: "image-main",
        type: imageVariant === "diagram" ? "diagram_block" : "image",
        imageUrl,
        caption: visualCaptionText,
        subtitle: String(diagramLabel || "").trim(),
        subject: String(diagramSubject || "").trim(),
        diagramType: String(diagramType || "").trim(),
      });
    }

    if (hasWebImages) {
      blocks.push({
        id: "web-image-row-main",
        type: "web_image_row",
        query: cleanText(webImageQuery),
        items: normalizedWebImageResults,
      });
    }
  }

  if (codeAwareSegments.length === 1 && codeAwareSegments[0]?.kind === "text") {
    const mathStepsBlock = parseMathStepsBlock(codeAwareSegments[0].value);
    if (mathStepsBlock) {
      blocks.push(mathStepsBlock);
    }
  }

  if (shouldParseTextBody && !blocks.some((block) => block.type === "math_steps")) {
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
  }

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

  return mergeAdjacentBlocks(blocks);
}
