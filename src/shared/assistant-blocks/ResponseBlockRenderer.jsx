import React, { useMemo, useState } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronRight,
  Code2,
  Copy,
  Download,
  FileText,
  Image as ImageIcon,
  Link2,
  ListChecks,
  Quote,
  Sigma,
  Table2,
} from "lucide-react";
import CitationChip from "../research/CitationChip.jsx";
import SourcesDrawer from "../research/SourcesDrawer.jsx";
import ImageSearchResults from "../image-search/ImageSearchResults.jsx";
import { parseAssistantResponseBlocks } from "./responseBlockParser";

const MATH_DELIMITER_PATTERN = /(\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|\$\$[\s\S]+?\$\$|\$[^$\n]+\$)/g;

function blockShellClass(tone = "default") {
  const tones = {
    default: "bg-transparent",
    note: "bg-transparent",
    warning: "bg-transparent",
    success: "bg-transparent",
  };
  return ["bg-transparent", tones[tone] || tones.default].join(" ");
}

class BlockRenderBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidUpdate(prevProps) {
    if (prevProps.blockId !== this.props.blockId && this.state.failed) {
      this.setState({ failed: false });
    }
  }

  render() {
    if (this.state.failed) {
      return (
        <section className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-sm leading-6 text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100">
          {this.props.fallbackText || "I could not render this section cleanly, so I am showing a safe fallback."}
        </section>
      );
    }
    return this.props.children;
  }
}

function ResponseBlockShell({ icon: Icon, label, action, children, tone = "default", showHeader = true }) {
  return (
    <section className={blockShellClass(tone)}>
      {showHeader && (label || action) ? (
        <div className="mb-2 flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
          <div className="inline-flex min-w-0 items-center gap-2">
            {Icon ? <Icon size={14} className="shrink-0 text-slate-500 dark:text-slate-400" /> : null}
            <span className="truncate">{label}</span>
          </div>
          {action || null}
        </div>
      ) : null}
      <div>{children}</div>
    </section>
  );
}

function CopyButton({ text, label = "Copy" }) {
  const [copied, setCopied] = useState(false);

  const copyValue = async () => {
    try {
      await navigator.clipboard.writeText(String(text || ""));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={copyValue}
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-semibold normal-case tracking-normal text-slate-600 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5"
      title={label}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "Copied" : label}
    </button>
  );
}

function parseInlineMarkdown(text, keyPrefix = "inline", citationResolver = null) {
  const value = String(text || "");
  const parts = value.split(/(\[[^\]]+\]\(https?:\/\/[^)]+\)|\[\d+(?:\s*,\s*\d+)*\]|`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_)/g);

  return parts
    .filter((part) => part !== "")
    .map((part, index) => {
      const key = `${keyPrefix}-${index}`;
      const linkMatch = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/);
      if (linkMatch) {
        return (
          <a
            key={key}
            href={linkMatch[2]}
            target="_blank"
            rel="noreferrer"
            className="text-sky-600 underline decoration-sky-300 underline-offset-4 dark:text-sky-300 dark:decoration-sky-500/60"
          >
            {linkMatch[1]}
          </a>
        );
      }
      const citationMatch = part.match(/^\[(\d+(?:\s*,\s*\d+)*)\]$/);
      if (citationMatch && typeof citationResolver === "function") {
        const indices = citationMatch[1]
          .split(",")
          .map((item) => Number.parseInt(item.trim(), 10))
          .filter((item) => Number.isInteger(item) && item > 0);
        if (indices.length) {
          return (
            <button
              key={key}
              type="button"
              onClick={() => citationResolver(indices)}
              className="mx-0.5 inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-white/75 dark:hover:bg-white/10 dark:hover:text-white"
            >
              {part}
            </button>
          );
        }
      }
      if (/^`[^`]+`$/.test(part)) {
        return (
          <code
            key={key}
            className="rounded-md bg-transparent px-1 py-0.5 text-[0.92em] font-semibold text-slate-800 dark:text-slate-100"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      if (/^\*\*[^*]+\*\*$/.test(part) || /^__[^_]+__$/.test(part)) {
        return <strong key={key}>{part.slice(2, -2)}</strong>;
      }
      if (/^\*[^*]+\*$/.test(part) || /^_[^_]+_$/.test(part)) {
        return <em key={key}>{part.slice(1, -1)}</em>;
      }
      return <span key={key}>{part}</span>;
    });
}

function normalizeLooseLine(value) {
  return String(value || "")
    .replace(/^\s{0,3}#{1,6}\s+/, "")
    .replace(/^\s*>\s?/, "")
    .replace(/^\s{0,6}[-*•]\s+/, "")
    .replace(/^\s{0,6}\d+[.)]\s+/, "");
}

function renderLooseText(text, keyPrefix = "loose", citationResolver = null) {
  const paragraphs = String(text || "")
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);

  return (
    <div className="space-y-3.5">
      {paragraphs.map((paragraph, index) => (
        <p key={`${keyPrefix}-${index}`} className="text-[15px] leading-[1.82] text-slate-800 md:text-[14px] md:leading-7 dark:text-slate-100">
          {parseInlineMarkdown(normalizeLooseLine(paragraph), `${keyPrefix}-${index}`, citationResolver)}
        </p>
      ))}
    </div>
  );
}

function renderMarkdownDocument(text, citationResolver = null) {
  const lines = String(text || "").replace(/\r\n/g, "\n").split("\n");
  commandMap["\\rightarrow"] = "->";

  const nodes = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      const Tag = `h${Math.min(4, headingMatch[1].length + 1)}`;
      if (nodes.length > 0) {
        nodes.push(
          <div
            key={`divider-${index}`}
            className="my-2 h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-white/10"
          />
        );
      }
      nodes.push(
        <Tag
          key={`heading-${index}`}
          className="mt-1 text-[15px] font-semibold tracking-[-0.02em] text-slate-900 first:mt-0 dark:text-slate-100"
        >
          {parseInlineMarkdown(headingMatch[2], `h-${index}`, citationResolver)}
        </Tag>
      );
      index += 1;
      continue;
    }

    if (/^\s*>\s+/.test(line)) {
      const quoteLines = [];
      while (index < lines.length && /^\s*>\s+/.test(lines[index])) {
        quoteLines.push(lines[index].replace(/^\s*>\s?/, ""));
        index += 1;
      }
      nodes.push(
        <blockquote
          key={`quote-${index}`}
          className="border-l-2 border-slate-300 pl-4 text-sm leading-7 text-slate-700 dark:border-white/20 dark:text-slate-200"
        >
          {quoteLines.map((item, qIndex) => (
            <p key={`quote-line-${index}-${qIndex}`}>{parseInlineMarkdown(item, `q-${index}-${qIndex}`, citationResolver)}</p>
          ))}
        </blockquote>
      );
      continue;
    }

    if (/^(\s{0,6}[-*•]\s+|\s{0,6}\d+[.)]\s+)/.test(line)) {
      const listLines = [];
      while (index < lines.length && /^(\s{0,6}[-*•]\s+|\s{0,6}\d+[.)]\s+)/.test(lines[index])) {
        listLines.push(lines[index]);
        index += 1;
      }
      nodes.push(
          <ListBlock
            key={`md-list-${index}`}
            block={{
            items: listLines.map((item) => ({
              depth: Math.min(3, Math.floor((item.match(/^\s+/)?.[0]?.length || 0) / 2)),
              ordered: /^\s{0,6}\d+[.)]\s+/.test(item),
              text: item.replace(/^(\s{0,6}[-*•]\s+|\s{0,6}\d+[.)]\s+)/, "").trim(),
            })),
            }}
            compact
            citationResolver={citationResolver}
          />
        );
      continue;
    }

    const paragraph = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^(#{1,4})\s+/.test(lines[index]) &&
      !/^\s*>\s+/.test(lines[index]) &&
      !/^(\s{0,6}[-*•]\s+|\s{0,6}\d+[.)]\s+)/.test(lines[index])
    ) {
      paragraph.push(lines[index]);
      index += 1;
    }
    nodes.push(
      <p key={`p-${index}`} className="text-[15px] leading-[1.82] text-slate-800 md:text-[14px] md:leading-7 dark:text-slate-100">
        {parseInlineMarkdown(paragraph.join(" "), `p-${index}`, citationResolver)}
      </p>
    );
  }

  return <div className="space-y-3.5">{nodes}</div>;
}

export function PlainTextBlock({ block, citationResolver = null }) {
  return (
    <ResponseBlockShell icon={FileText} action={<CopyButton text={block.text} label="Copy" />} showHeader={false}>
      {renderLooseText(block.text, "plain", citationResolver)}
    </ResponseBlockShell>
  );
}

export function CodeBlock({ block }) {
  return (
    <ResponseBlockShell
      icon={Code2}
      label={block.language || "Code"}
      action={<CopyButton text={block.code} label="Copy" />}
    >
      <pre className="overflow-x-auto rounded-xl bg-slate-50/70 px-3 py-3 text-[13px] leading-6 text-slate-900 dark:bg-transparent dark:px-0 dark:py-1 dark:text-slate-100">
        <code>{block.code}</code>
      </pre>
    </ResponseBlockShell>
  );
}

export function QuoteBlock({ block }) {
  return (
    <ResponseBlockShell icon={Quote} label="Quote">
      <blockquote className="border-l-2 border-sky-400/80 pl-4 text-sm leading-7 text-slate-700 dark:text-slate-100">
        {block.text}
      </blockquote>
    </ResponseBlockShell>
  );
}

export function ListBlock({ block, compact = false, citationResolver = null }) {
  const hasOrdered = Array.isArray(block.items) && block.items.some((item) => item.ordered);
  const Tag = hasOrdered ? "ol" : "ul";

  const content = (
    <Tag className={hasOrdered ? "list-decimal space-y-2.5 pl-5" : "list-disc space-y-2.5 pl-5"}>
      {(block.items || []).map((item, index) => (
        <li
          key={`list-item-${index}`}
          className="text-[15px] leading-[1.82] text-slate-800 md:text-[14px] md:leading-7 dark:text-slate-100"
          style={{ marginLeft: `${Math.min(3, item.depth || 0) * 14}px` }}
        >
          {parseInlineMarkdown(item.text, `list-item-${index}`, citationResolver)}
        </li>
      ))}
    </Tag>
  );

  if (compact) return content;
  return (
    <ResponseBlockShell icon={ListChecks} label="List" showHeader={false}>
      {content}
    </ResponseBlockShell>
  );
}

export function TableBlock({ block }) {
  const columns = Array.isArray(block.columns) ? block.columns : [];
  const rows = Array.isArray(block.rows) ? block.rows : [];
  const compactMobileCards = columns.length >= 2 && columns.length <= 3;

  return (
    <ResponseBlockShell icon={Table2} label="Table">
      {compactMobileCards ? (
        <div className="space-y-3 md:hidden">
          {rows.map((row, rowIndex) => {
            const titleCell = row[0] || `Row ${rowIndex + 1}`;
            return (
              <section
                key={`mobile-row-${rowIndex}`}
                className="rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-3 dark:border-white/10 dark:bg-white/[0.04]"
              >
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  {columns[0] || "Topic"}
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {parseInlineMarkdown(titleCell, `mobile-title-${rowIndex}`)}
                </div>
                <div className="mt-3 space-y-2">
                  {columns.slice(1).map((column, columnIndex) => (
                    <div key={`mobile-cell-${rowIndex}-${columnIndex}`} className="rounded-xl bg-slate-50/80 px-3 py-2 dark:bg-white/[0.05]">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                        {column}
                      </div>
                      <div className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-100">
                        {parseInlineMarkdown(row[columnIndex + 1] || "", `mobile-cell-${rowIndex}-${columnIndex}`)}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : null}
      <div className={compactMobileCards ? "hidden md:block overflow-x-auto rounded-2xl border border-slate-200/70 dark:border-white/10" : "overflow-x-auto rounded-2xl border border-slate-200/70 dark:border-white/10"}>
        <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr>
              {columns.map((column, index) => (
                <th
                  key={`th-${index}`}
                  className="border-b border-slate-200/90 bg-slate-50/80 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={`row-${rowIndex}`}>
                {row.map((cell, cellIndex) => (
                  <td
                    key={`cell-${rowIndex}-${cellIndex}`}
                    className="border-b border-slate-200/70 px-3 py-3 align-top text-slate-700 last:border-b-0 dark:border-white/10 dark:text-slate-100"
                  >
                    <div className="min-w-[120px] break-words leading-6">
                      {parseInlineMarkdown(cell, `cell-${rowIndex}-${cellIndex}`)}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ResponseBlockShell>
  );
}

export function ImageBlock({ block, onPreview }) {
  return (
    <ResponseBlockShell
      icon={ImageIcon}
      label="Generated Image"
      action={
        <a
          href={block.imageUrl}
          download="elimulink-image.png"
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 px-2.5 py-1 text-[11px] font-semibold normal-case tracking-normal text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
        >
          <Download size={12} />
          Download
        </a>
      }
    >
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700 dark:text-sky-300">
        AI-generated image
      </div>
      <button
        type="button"
        onClick={() => onPreview?.(block.imageUrl)}
        className="block w-full overflow-hidden rounded-[18px] bg-slate-100 dark:bg-white/5"
      >
        <img src={block.imageUrl} alt={block.caption || "Generated image"} loading="lazy" className="max-h-[380px] w-full object-cover" />
      </button>
      {block.caption ? (
        <p className="mt-3 text-[15px] leading-[1.82] text-slate-800 md:text-sm md:leading-7 dark:text-slate-100">{block.caption}</p>
      ) : null}
    </ResponseBlockShell>
  );
}

function WebImageRowContent({ block, onPreview, onReuse }) {
  return (
    <ImageSearchResults
      query={block.query}
      results={block.items}
      onPreview={onPreview}
      onReuse={onReuse}
      layout="row"
      eyebrow="Real Web Images"
      titlePrefix="Web image results for"
    />
  );
}

export function WebImageRowBlock({ block, onPreview, onReuse, grouped = false }) {
  const content = <WebImageRowContent block={block} onPreview={onPreview} onReuse={onReuse} />;
  if (grouped) return content;

  return <ResponseBlockShell icon={ImageIcon} label="Real Web Images">{content}</ResponseBlockShell>;
}

function DiagramContent({ block, onPreview }) {
  const subtitle = String(block.subtitle || "").trim() || "AI Instructional Sketch";
  const subject = String(block.subject || "").trim();
  const diagramType = String(block.diagramType || "").trim();

  return (
    <>
      <div
        className="rounded-[22px] border border-emerald-200/80 bg-emerald-50/60 p-3 dark:border-emerald-300/15 dark:bg-emerald-500/10"
        data-diagram-subject={subject || undefined}
        data-diagram-type={diagramType || undefined}
      >
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">
          AI-generated instructional visual
        </div>
        <button
          type="button"
          onClick={() => onPreview?.(block.imageUrl)}
          className="block w-full overflow-hidden rounded-[18px] bg-white/80 dark:bg-white/5"
        >
          <img src={block.imageUrl} alt={block.caption || subtitle} loading="lazy" className="max-h-[420px] w-full object-contain" />
        </button>
      </div>
      {block.caption ? (
        <p className="mt-3 text-[15px] leading-[1.82] text-slate-800 md:text-sm md:leading-7 dark:text-slate-100">{block.caption}</p>
      ) : null}
    </>
  );
}

export function DiagramBlock({ block, onPreview, grouped = false }) {
  const subtitle = String(block.subtitle || "").trim() || "AI Instructional Sketch";
  const content = <DiagramContent block={block} onPreview={onPreview} />;
  if (grouped) return content;

  return (
    <ResponseBlockShell
      icon={ImageIcon}
      label={subtitle}
      action={
        <a
          href={block.imageUrl}
          download="elimulink-diagram.png"
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 px-2.5 py-1 text-[11px] font-semibold normal-case tracking-normal text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
        >
          <Download size={12} />
          Download
        </a>
      }
    >
      {content}
    </ResponseBlockShell>
  );
}

export function VisualGroupBlock({ block, onWebImagePreview, onWebImageReuse, onGeneratedImagePreview }) {
  const sections = Array.isArray(block.sections) ? block.sections : [];

  return (
    <ResponseBlockShell icon={ImageIcon} label="Visual Answer">
      <div className="space-y-5">
        {sections.map((section, index) => (
          <section
            key={section.id || `visual-section-${index}`}
            className="space-y-3 rounded-[22px] border border-slate-200/80 bg-slate-50/45 p-3 first:pt-3 dark:border-white/10 dark:bg-white/[0.03]"
          >
            <div className="px-1">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  {section.title || (section.type === "web_images" ? "Real Web Images" : "AI Instructional Sketch")}
                </div>
            </div>
            {section.type === "web_images" ? (
              <WebImageRowBlock
                block={{ query: section.query, items: section.items }}
                onPreview={onWebImagePreview}
                onReuse={onWebImageReuse}
                grouped
              />
            ) : section.type === "diagram" ? (
              <DiagramBlock
                block={{
                  imageUrl: section.imageUrl,
                  caption: section.caption,
                  subtitle: section.subtitle || section.title,
                  subject: section.subject,
                  diagramType: section.diagramType,
                }}
                onPreview={onGeneratedImagePreview}
                grouped
              />
            ) : null}
          </section>
        ))}
      </div>
    </ResponseBlockShell>
  );
}

export function FileAttachmentBlock({ block }) {
  return (
    <ResponseBlockShell icon={FileText} label="File">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
            {block.fileName || "Attachment"}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-300">{block.fileType || "File attachment"}</div>
        </div>
        {block.url ? (
          <a
            href={block.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-white/10 dark:text-slate-100"
          >
            Open
            <ChevronRight size={14} />
          </a>
        ) : null}
      </div>
    </ResponseBlockShell>
  );
}

export function LinkSourceBlock({ block }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerSources, setDrawerSources] = useState([]);
  const [drawerTitle, setDrawerTitle] = useState("Sources");

  const groupedSources = useMemo(() => {
    const items = Array.isArray(block.links) ? block.links : [];
    const groups = [];
    const byKey = new Map();
    items.forEach((item) => {
      const key = String(item?.sourceName || item?.domain || item?.title || item?.url || "").trim();
      if (!key) return;
      if (!byKey.has(key)) {
        const group = { key, sourceName: item.sourceName || item.domain || item.title || "Source", domain: item.domain || "", items: [] };
        byKey.set(key, group);
        groups.push(group);
      }
      byKey.get(key).items.push(item);
    });
    return groups;
  }, [block.links]);

  const openDrawer = (sources, title = "Sources") => {
    setDrawerSources(Array.isArray(sources) ? sources : []);
    setDrawerTitle(title);
    setDrawerOpen(true);
  };

  return (
    <ResponseBlockShell icon={Link2} label={block.title || "Sources"}>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {groupedSources.map((group, index) => (
            <CitationChip
              key={group.key}
              label={group.sourceName || group.domain || `Source ${index + 1}`}
              countLabel={group.items.length > 0 ? `+${group.items.length}` : ""}
              indexLabel={index >= 0 ? `[${index + 1}]` : ""}
              onClick={() => openDrawer(group.items, group.sourceName || "Sources")}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => openDrawer(Array.isArray(block.links) ? block.links : [], block.title || "Sources")}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-white/75 dark:hover:bg-white/10 dark:hover:text-white"
        >
          <Link2 size={14} />
          Sources
        </button>
      </div>
      <SourcesDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={drawerTitle}
        sources={drawerSources}
      />
    </ResponseBlockShell>
  );
}

export function NoteBlock({ block }) {
  return (
    <ResponseBlockShell icon={FileText} tone="note" showHeader={false}>
      {renderLooseText(block.text, "note")}
    </ResponseBlockShell>
  );
}

export function WarningAlertBlock({ block }) {
  return (
    <ResponseBlockShell icon={AlertTriangle} label="Warning" tone="warning">
      <div className="whitespace-pre-wrap text-[15px] leading-[1.82] text-amber-900 md:text-sm md:leading-7 dark:text-amber-100">{block.text}</div>
    </ResponseBlockShell>
  );
}

export function SuccessInfoBlock({ block }) {
  return (
    <ResponseBlockShell icon={CheckCircle2} label="Status" tone="success">
      <div className="whitespace-pre-wrap text-[15px] leading-[1.82] text-emerald-900 md:text-sm md:leading-7 dark:text-emerald-100">{block.text}</div>
    </ResponseBlockShell>
  );
}

function extractBalancedGroup(source, startIndex) {
  if (source[startIndex] !== "{") return null;
  let depth = 0;
  for (let index = startIndex; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth === 0) {
      return {
        content: source.slice(startIndex + 1, index),
        endIndex: index + 1,
      };
    }
  }
  return null;
}

function splitMatrixRows(content) {
  return String(content || "")
    .split(/\\\\/)
    .map((row) => row.trim())
    .filter(Boolean);
}

function splitMatrixColumns(row) {
  return String(row || "")
    .split("&")
    .map((cell) => cell.trim())
    .filter((cell) => cell !== "");
}

function normalizeMathDisplayText(value) {
  const superscriptMap = {
    "0": "⁰",
    "1": "¹",
    "2": "²",
    "3": "³",
    "4": "⁴",
    "5": "⁵",
    "6": "⁶",
    "7": "⁷",
    "8": "⁸",
    "9": "⁹",
    "+": "⁺",
    "-": "⁻",
  };

  return String(value || "")
    .replace(/\*\*/g, "^")
    .replace(/(\d)\*([a-zA-Z])/g, "$1$2")
    .replace(/([a-zA-Z])\*(\d)/g, "$1$2")
    .replace(/\^([0-9+-]+)/g, (_match, exponent) =>
      String(exponent)
        .split("")
        .map((char) => superscriptMap[char] || char)
        .join("")
    );
}

function normalizeMathLatexText(value) {
  return String(value || "")
    .replace(/\*\*/g, "^")
    .replace(/(\d)\*([a-zA-Z])/g, "$1$2")
    .replace(/([a-zA-Z])\*(\d)/g, "$1$2");
}

function renderLatexLite(text, keyPrefix = "latex") {
  const source = normalizeMathDisplayText(String(text || "").trim());
  if (!source) return null;

  const commandMap = {
    "\\cdot": "·",
    "\\times": "×",
    "\\pm": "±",
    "\\ge": "≥",
    "\\le": "≤",
    "\\neq": "≠",
    "\\int": "∫",
    "\\sum": "∑",
    "\\to": "→",
    "\\infty": "∞",
    "\\pi": "π",
    "\\quad": "  ",
    "\\,": " ",
  };

  const nodes = [];
  let index = 0;
  let plainBuffer = "";

  const flushPlain = () => {
    if (!plainBuffer) return;
    nodes.push(
      <span key={`${keyPrefix}-text-${nodes.length}`} className="whitespace-pre-wrap">
        {plainBuffer}
      </span>
    );
    plainBuffer = "";
  };

  while (index < source.length) {
    if (source.startsWith("\\boxed{", index)) {
      flushPlain();
      const group = extractBalancedGroup(source, index + "\\boxed".length);
      if (!group) {
        plainBuffer += source[index];
        index += 1;
        continue;
      }
      nodes.push(
        <span
          key={`${keyPrefix}-boxed-${nodes.length}`}
          className="inline-flex items-center rounded-xl border-2 border-sky-400/80 bg-white px-3 py-1.5 font-semibold text-slate-900 shadow-sm dark:border-sky-300/70 dark:bg-slate-950 dark:text-white"
        >
          {renderLatexLite(group.content, `${keyPrefix}-boxed-${nodes.length}`)}
        </span>
      );
      index = group.endIndex;
      continue;
    }

    if (source.startsWith("\\frac{", index)) {
      flushPlain();
      const numerator = extractBalancedGroup(source, index + "\\frac".length);
      const denominator = numerator ? extractBalancedGroup(source, numerator.endIndex) : null;
      if (!numerator || !denominator) {
        plainBuffer += source[index];
        index += 1;
        continue;
      }
      nodes.push(
        <span key={`${keyPrefix}-frac-${nodes.length}`} className="mx-1 inline-flex flex-col items-center align-middle text-center leading-none">
          <span className="border-b border-current px-1 pb-0.5">
            {renderLatexLite(numerator.content, `${keyPrefix}-num-${nodes.length}`)}
          </span>
          <span className="px-1 pt-0.5">
            {renderLatexLite(denominator.content, `${keyPrefix}-den-${nodes.length}`)}
          </span>
        </span>
      );
      index = denominator.endIndex;
      continue;
    }

    if (source.startsWith("\\sqrt{", index)) {
      flushPlain();
      const group = extractBalancedGroup(source, index + "\\sqrt".length);
      if (!group) {
        plainBuffer += source[index];
        index += 1;
        continue;
      }
      nodes.push(
        <span key={`${keyPrefix}-sqrt-${nodes.length}`} className="mx-0.5 inline-flex items-start">
          <span className="pr-1 text-lg leading-none">√</span>
          <span className="border-t border-current px-1 pt-0.5">
            {renderLatexLite(group.content, `${keyPrefix}-sqrt-inner-${nodes.length}`)}
          </span>
        </span>
      );
      index = group.endIndex;
      continue;
    }

    if (source.startsWith("\\text{", index)) {
      flushPlain();
      const group = extractBalancedGroup(source, index + "\\text".length);
      if (!group) {
        plainBuffer += source[index];
        index += 1;
        continue;
      }
      nodes.push(
        <span key={`${keyPrefix}-textcmd-${nodes.length}`} className="whitespace-pre-wrap">
          {group.content.replace(/\\ /g, " ")}
        </span>
      );
      index = group.endIndex;
      continue;
    }

    if (source.startsWith("\\mathrm{", index)) {
      flushPlain();
      const group = extractBalancedGroup(source, index + "\\mathrm".length);
      if (!group) {
        plainBuffer += source[index];
        index += 1;
        continue;
      }
      nodes.push(
        <span key={`${keyPrefix}-mathrm-${nodes.length}`} className="whitespace-pre-wrap">
          {renderLatexLite(group.content, `${keyPrefix}-mathrm-${nodes.length}`)}
        </span>
      );
      index = group.endIndex;
      continue;
    }

    if (source.startsWith("\\begin{bmatrix}", index)) {
      flushPlain();
      const endToken = "\\end{bmatrix}";
      const endIndex = source.indexOf(endToken, index);
      if (endIndex === -1) {
        plainBuffer += source[index];
        index += 1;
        continue;
      }
      const matrixContent = source.slice(index + "\\begin{bmatrix}".length, endIndex);
      const rows = splitMatrixRows(matrixContent);
      nodes.push(
        <span
          key={`${keyPrefix}-matrix-${nodes.length}`}
          className="my-1 inline-flex overflow-x-auto rounded-xl border border-slate-300/80 bg-white/80 px-2 py-1 dark:border-white/15 dark:bg-white/[0.04]"
        >
          <span className="pr-2 text-lg leading-none text-slate-400">[</span>
          <span className="inline-grid gap-1">
            {rows.map((row, rowIndex) => {
              const columns = splitMatrixColumns(row);
              return (
                <span key={`${keyPrefix}-matrix-row-${rowIndex}`} className="inline-flex items-center gap-3">
                  {columns.map((cell, cellIndex) => (
                    <span key={`${keyPrefix}-matrix-cell-${rowIndex}-${cellIndex}`} className="min-w-[1.25rem] text-center">
                      {renderLatexLite(cell, `${keyPrefix}-matrix-cell-${rowIndex}-${cellIndex}`)}
                    </span>
                  ))}
                </span>
              );
            })}
          </span>
          <span className="pl-2 text-lg leading-none text-slate-400">]</span>
        </span>
      );
      index = endIndex + endToken.length;
      continue;
    }

    const matchedCommand = Object.keys(commandMap).find((command) => source.startsWith(command, index));
    if (matchedCommand) {
      plainBuffer += commandMap[matchedCommand];
      index += matchedCommand.length;
      continue;
    }

    if (source[index] === "_") {
      flushPlain();
      let subscript = "";
      if (source[index + 1] === "{") {
        const group = extractBalancedGroup(source, index + 1);
        if (group) {
          subscript = group.content;
          index = group.endIndex;
        } else {
          index += 1;
        }
      } else {
        let cursor = index + 1;
        while (cursor < source.length && /[A-Za-z0-9+-]/.test(source[cursor])) {
          subscript += source[cursor];
          cursor += 1;
        }
        index = cursor;
      }
      if (subscript) {
        nodes.push(
          <sub key={`${keyPrefix}-sub-${nodes.length}`} className="align-sub text-[0.78em]">
            {renderLatexLite(subscript, `${keyPrefix}-sub-${nodes.length}`)}
          </sub>
        );
      }
      continue;
    }

    plainBuffer += source[index];
    index += 1;
  }

  flushPlain();
  return nodes;
}

function stripMathDelimiters(value) {
  const text = String(value || "").trim();
  if ((text.startsWith("\\[") && text.endsWith("\\]")) || (text.startsWith("\\(") && text.endsWith("\\)"))) {
    return text.slice(2, -2).trim();
  }
  if (text.startsWith("$$") && text.endsWith("$$")) {
    return text.slice(2, -2).trim();
  }
  if (text.startsWith("$") && text.endsWith("$")) {
    return text.slice(1, -1).trim();
  }
  return text;
}

function isLikelyStandaloneMath(value) {
  const text = String(value || "").trim();
  if (!text) return false;
  MATH_DELIMITER_PATTERN.lastIndex = 0;
  if (MATH_DELIMITER_PATTERN.test(text)) return true;
  return (
    /\\(?:frac|sqrt|boxed|int|sum|lim|cdot|times|pm|begin\{bmatrix\}|vec|overline|left|right)/.test(text) ||
    (/[=^]/.test(text) && /[A-Za-z0-9]/.test(text)) ||
    /^[-+]?[\d\s/().]+$/.test(text)
  );
}

function renderKatexExpression(expression, { displayMode = false, keyPrefix = "katex" } = {}) {
  const cleaned = stripMathDelimiters(normalizeMathLatexText(expression));
  if (!cleaned) return null;

  try {
    const html = katex.renderToString(cleaned, {
      throwOnError: false,
      strict: "ignore",
      displayMode,
      trust: false,
      output: "html",
    });

    return (
      <span
        key={`${keyPrefix}-html`}
        className={
          displayMode
            ? "block min-w-max [&_.katex]:text-[1.04rem] [&_.katex-display]:my-0 [&_.katex]:leading-tight sm:[&_.katex]:text-[1.08rem]"
            : "inline-block max-w-full align-middle [&_.katex]:text-[1em] [&_.katex]:leading-tight"
        }
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  } catch {
    return renderLatexLite(normalizeMathDisplayText(cleaned), `${keyPrefix}-fallback`);
  }
}

function renderMathAwareText(text, keyPrefix = "math-aware") {
  const source = String(text || "");
  const parts = source.split(MATH_DELIMITER_PATTERN).filter((part) => part !== "");

  return parts.map((part, index) => {
    if ((part.startsWith("\\[") && part.endsWith("\\]")) || (part.startsWith("$$") && part.endsWith("$$"))) {
      return (
        <div
          key={`${keyPrefix}-display-${index}`}
          className="my-2.5 w-full px-0 py-1 text-slate-900 dark:text-white"
        >
          {renderKatexExpression(part, { displayMode: true, keyPrefix: `${keyPrefix}-display-${index}` })}
        </div>
      );
    }
    if ((part.startsWith("\\(") && part.endsWith("\\)")) || (part.startsWith("$") && part.endsWith("$"))) {
      return (
        <span
          key={`${keyPrefix}-inline-${index}`}
          className="mx-0.5 inline-flex min-w-0 max-w-full align-middle text-slate-900 dark:text-white"
        >
          {renderKatexExpression(part, { displayMode: false, keyPrefix: `${keyPrefix}-inline-${index}` })}
        </span>
      );
    }
    return (
      <span key={`${keyPrefix}-plain-${index}`} className="whitespace-pre-wrap">
        {part}
      </span>
    );
  });
}

function renderStandaloneMathText(text, keyPrefix = "standalone-math", displayMode = true) {
  if (!isLikelyStandaloneMath(text)) {
    return <span className="whitespace-pre-wrap">{text}</span>;
  }

  const rawText = String(text || "").trim();
  MATH_DELIMITER_PATTERN.lastIndex = 0;
  const hasDelimiter = MATH_DELIMITER_PATTERN.test(rawText);
  const expression = hasDelimiter ? rawText : `\\(${rawText}\\)`;
  if (displayMode) {
    return (
      <div className="w-full px-0 py-1 text-slate-900 dark:text-white">
        {renderKatexExpression(expression, {
          displayMode: true,
          keyPrefix,
        })}
      </div>
    );
  }

  return renderKatexExpression(expression, { displayMode: false, keyPrefix });
}

function extractSection(text, label, nextLabels = []) {
  const source = String(text || "");
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedNext = nextLabels.map((item) => item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const pattern = new RegExp(
    escapedNext
      ? `${escapedLabel}:\\s*\\n([\\s\\S]*?)(?=\\n\\n(?:${escapedNext}):|$)`
      : `${escapedLabel}:\\s*\\n([\\s\\S]*)$`,
    "i"
  );
  const match = source.match(pattern);
  return match ? match[1].trim() : "";
}

function parseStructuredMathText(text) {
  const source = String(text || "").replace(/\r\n/g, "\n").trim();
  if (!source) return null;
  if (!source.startsWith("Problem:") || !source.includes("Final Answer:")) return null;

  const problem = extractSection(source, "Problem", ["Given", "Formula / Principle", "Formula", "Substitution", "Steps", "Final Answer"]);
  const given = extractSection(source, "Given", ["Formula / Principle", "Formula", "Substitution", "Steps", "Final Answer"]);
  const formula =
    extractSection(source, "Formula / Principle", ["Substitution", "Steps", "Final Answer"]) ||
    extractSection(source, "Formula", ["Substitution", "Steps", "Final Answer"]);
  const substitution = extractSection(source, "Substitution", ["Steps", "Final Answer"]);
  const stepsBody = extractSection(source, "Steps", ["Final Answer"]);
  const finalAnswer = extractSection(source, "Final Answer", []);
  if (!problem || !finalAnswer) return null;

  const stepLines = String(stepsBody || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return {
    problem,
    given,
    formula,
    substitution,
    steps: stepLines.map((line, index) => ({
      title: `Step ${index + 1}`,
      explanation: line,
      equation: "",
      items: [],
    })),
    finalAnswer,
  };
}

function MathSection({ label, children, emphasize = false, compact = false }) {
  return (
    <section
      className={
        emphasize
          ? "rounded-2xl border border-sky-200/80 bg-sky-50/80 px-4 py-3 shadow-[0_8px_20px_rgba(14,165,233,0.08)] dark:border-sky-300/20 dark:bg-sky-500/10"
          : compact
            ? "px-0 py-0"
            : "px-0 py-0"
      }
    >
      <div className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${emphasize ? "text-sky-700 dark:text-sky-300" : "text-slate-500 dark:text-slate-400"}`}>
        {label}
      </div>
      <div className={emphasize ? "mt-2" : compact ? "mt-1.5" : "mt-2"}>{children}</div>
    </section>
  );
}

function MathStepsBlockContent({ block }) {
  const fallbackStructured = !block?.steps?.length ? parseStructuredMathText(block?.text || "") : null;
  const data = fallbackStructured
    ? { ...block, ...fallbackStructured, type: "math_steps" }
    : block;

  const supportSections = [
    data.given
      ? {
          label: "Given",
          content: (
            <div className="space-y-1.5">
              {String(data.given)
                .split("\n")
                .filter(Boolean)
                .map((line, index) => (
                  <div key={`given-${index}`} className="text-[14px] leading-6 text-slate-700 dark:text-slate-200">
                    {renderMathAwareText(line, `math-given-${index}`)}
                  </div>
                ))}
            </div>
          ),
        }
      : null,
    data.formula
      ? {
          label: "Formula / Principle",
          content: (
            <div className="text-[14px] leading-6 text-slate-700 dark:text-slate-200">
              {renderMathAwareText(data.formula, "math-formula")}
            </div>
          ),
        }
      : null,
    data.substitution
      ? {
          label: "Substitution",
          content: (
            <div className="text-[14px] leading-6 text-slate-700 dark:text-slate-200">
              {renderMathAwareText(data.substitution, "math-substitution")}
            </div>
          ),
        }
      : null,
  ].filter(Boolean);

  return (
    <div className="space-y-3">
      {data.intro ? (
        <div className="text-[14px] leading-6 text-slate-600 dark:text-slate-300">{renderMathAwareText(data.intro, "math-intro")}</div>
      ) : null}

      <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-start lg:gap-0">
        <div className="min-w-0 lg:flex-[0.95] lg:pr-5">
          {data.problem ? (
            <MathSection label="Problem" compact>
              <div className="text-[15px] leading-7 text-slate-800 dark:text-slate-100">
                {renderMathAwareText(data.problem, "math-problem")}
              </div>
            </MathSection>
          ) : null}

          {supportSections.length ? (
            <div className="mt-3 space-y-3">
              {supportSections.map((section) => (
                <MathSection key={section.label} label={section.label} compact>
                  {section.content}
                </MathSection>
              ))}
            </div>
          ) : null}
        </div>

        <div className="hidden lg:block lg:w-px lg:self-stretch lg:bg-slate-200/90 dark:lg:bg-white/10" />

        <div className="min-w-0 lg:flex-[1.55] lg:pl-5">
          <MathSection label="Steps" compact>
          <div className="space-y-2.5">
              {(data.steps || []).map((step, index) => (
                <div
                  key={`step-${index}`}
                  className={`pl-3 ${index === 0 ? "" : "border-t border-slate-200/80 pt-2.5 dark:border-white/10"} border-l border-slate-300/90 dark:border-slate-500/60`}
                >
                  <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    {step.title || `Step ${index + 1}`}
                  </div>
                  {step.explanation ? (
                    <div className="mt-1 text-[14px] leading-6 text-slate-700 dark:text-slate-200">
                      {renderMathAwareText(step.explanation, `math-step-text-${index}`)}
                    </div>
                  ) : null}
                  {step.equation ? (
                    <div className="mt-1">{renderStandaloneMathText(step.equation, `math-step-eq-${index}`, true)}</div>
                  ) : null}
                  {Array.isArray(step.items) && step.items.length ? (
                    <ul className="mt-1.5 space-y-1 text-[14px] leading-6 text-slate-700 dark:text-slate-200">
                      {step.items.map((item, itemIndex) => (
                        <li key={`step-${index}-item-${itemIndex}`} className="flex gap-2">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300 dark:bg-slate-500" />
                          <span>{renderMathAwareText(item, `math-step-item-${index}-${itemIndex}`)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </div>
          </MathSection>
        </div>
      </div>

      {data.finalAnswer ? (
        <MathSection label="Final Answer" emphasize>
          <div className="text-[15px] leading-7 text-slate-900 dark:text-white">
            {renderStandaloneMathText(data.finalAnswer, "math-final-answer", true)}
          </div>
        </MathSection>
      ) : null}
    </div>
  );
}

export function MathStepsBlock({ block }) {
  const normalizedText = String(block?.text || "");
  const looksLikeChemistry =
    /\b(?:molar mass|moles?|stoichiometry|empirical formula|molecular formula|concentration|molarity|pH|balanced equation|reactants?|products?)\b/i.test(
      normalizedText
    ) || /\\mathrm\{[A-Z][a-z]?(?:_\{\d+\})?/.test(normalizedText);
  const blockLabel = looksLikeChemistry ? "Chemistry Steps" : "Math Steps";

  return (
    <ResponseBlockShell icon={Sigma} label={blockLabel} action={<CopyButton text={block.text} label="Copy" />}>
      <MathStepsBlockContent block={block} />
    </ResponseBlockShell>
  );
}

export function MathBlock({ block }) {
  const normalizedText = String(block?.text || "");
  const looksLikeChemistry =
    /\b(?:molar mass|moles?|stoichiometry|empirical formula|molecular formula|concentration|molarity|pH|balanced equation|reactants?|products?)\b/i.test(
      normalizedText
    ) || /\\mathrm\{[A-Z][a-z]?(?:_\{\d+\})?/.test(normalizedText);
  const blockLabel = looksLikeChemistry ? "Chemistry" : "Math";
  const structured = parseStructuredMathText(block.text);

  if (structured) {
    return <MathStepsBlock block={{ ...block, ...structured }} />;
  }

  return (
    <ResponseBlockShell icon={Sigma} label={blockLabel} action={<CopyButton text={block.text} label="Copy" />}>
      <div className="space-y-3 px-1 text-sm leading-7 text-slate-800 dark:text-slate-100">
        <div className="space-y-2">
          {String(block.text || "")
            .split("\n")
            .filter((line) => line.trim())
            .map((line, index) => (
              <div
                key={`math-line-${index}`}
                className={/^\s*(Final Answer|Answer)\s*:/i.test(line) ? "rounded-2xl border border-sky-200/80 bg-sky-50/80 px-3 py-2.5 shadow-[0_8px_20px_rgba(14,165,233,0.08)] dark:border-sky-300/20 dark:bg-sky-500/10" : ""}
              >
                {renderMathAwareText(line, `math-line-${index}`)}
              </div>
            ))}
        </div>
      </div>
    </ResponseBlockShell>
  );
}

export function JsonDataBlock({ block }) {
  const rawJson = useMemo(() => {
    try {
      return JSON.stringify(block.data, null, 2);
    } catch {
      return block.raw || "";
    }
  }, [block.data, block.raw]);

  return (
    <ResponseBlockShell icon={Code2} label="JSON" action={<CopyButton text={rawJson} label="Copy" />}>
      <pre className="overflow-x-auto rounded-xl bg-slate-50/70 px-4 py-3 text-[13px] leading-6 text-slate-900 dark:bg-transparent dark:px-0 dark:py-1 dark:text-slate-100">
        <code>{rawJson}</code>
      </pre>
    </ResponseBlockShell>
  );
}

export function MarkdownBlock({ block, citationResolver = null }) {
  return (
    <ResponseBlockShell icon={FileText} action={<CopyButton text={block.text} label="Copy" />} showHeader={false}>
      {renderMarkdownDocument(block.text, citationResolver)}
    </ResponseBlockShell>
  );
}

export function ActionBlock({ block }) {
  return (
    <ResponseBlockShell icon={ListChecks} label="Actions">
      <div className="flex flex-wrap gap-2">
        {(block.items || []).map((item, index) => (
          <button
            key={`action-${index}`}
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-white/70 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100 dark:hover:bg-white/[0.08]"
          >
            {item}
          </button>
        ))}
      </div>
    </ResponseBlockShell>
  );
}

function NormalTextSegment({ block, citationResolver = null }) {
  return renderLooseText(block.text, "normal", citationResolver);
}

export default function ResponseBlockRenderer({
  text = "",
  imageUrl = "",
  imageVariant = "image",
  diagramLabel = "",
  diagramSubject = "",
  diagramType = "",
  webImageResults = [],
  webImageQuery = "",
  sources = [],
  onWebImagePreview,
  onWebImageReuse,
  onGeneratedImagePreview,
}) {
  const blocks = useMemo(
    () =>
      parseAssistantResponseBlocks({
        text,
        imageUrl,
        imageVariant,
        diagramLabel,
        diagramSubject,
        diagramType,
        webImageResults,
        webImageQuery,
        sources,
      }),
    [diagramLabel, diagramSubject, diagramType, imageUrl, imageVariant, sources, text, webImageQuery, webImageResults]
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerSources, setDrawerSources] = useState([]);
  const [drawerTitle, setDrawerTitle] = useState("Sources");
  const normalizedSources = useMemo(() => (Array.isArray(sources) ? sources : []), [sources]);

  const openCitationSources = (indices = []) => {
    const resolvedSources = indices
      .map((value) => normalizedSources[value - 1])
      .filter(Boolean);
    if (!resolvedSources.length) return;
    setDrawerSources(resolvedSources);
    setDrawerTitle(resolvedSources.length === 1 ? resolvedSources[0].title || "Source" : "Sources");
    setDrawerOpen(true);
  };

  const renderBlock = (block) => {
    switch (block.type) {
      case "plain_text":
        return <PlainTextBlock key={block.id} block={block} citationResolver={openCitationSources} />;
      case "code":
        return <CodeBlock key={block.id} block={block} />;
      case "quote":
        return <QuoteBlock key={block.id} block={block} />;
      case "list":
        return <ListBlock key={block.id} block={block} citationResolver={openCitationSources} />;
      case "table":
        return <TableBlock key={block.id} block={block} />;
      case "visual_group":
        return (
          <VisualGroupBlock
            key={block.id}
            block={block}
            onWebImagePreview={onWebImagePreview}
            onWebImageReuse={onWebImageReuse}
            onGeneratedImagePreview={onGeneratedImagePreview}
          />
        );
      case "web_image_row":
        return <WebImageRowBlock key={block.id} block={block} onPreview={onWebImagePreview} onReuse={onWebImageReuse} />;
      case "image":
        return <ImageBlock key={block.id} block={block} onPreview={onGeneratedImagePreview} />;
      case "diagram_block":
        return <DiagramBlock key={block.id} block={block} onPreview={onGeneratedImagePreview} />;
      case "file":
        return <FileAttachmentBlock key={block.id} block={block} />;
      case "links":
        return <LinkSourceBlock key={block.id} block={block} />;
      case "note":
        return <NoteBlock key={block.id} block={block} />;
      case "warning":
        return <WarningAlertBlock key={block.id} block={block} />;
      case "success":
        return <SuccessInfoBlock key={block.id} block={block} />;
      case "math_steps":
        return <MathStepsBlock key={block.id} block={block} />;
      case "math":
        return <MathBlock key={block.id} block={block} />;
      case "json":
        return <JsonDataBlock key={block.id} block={block} />;
      case "markdown":
        return <MarkdownBlock key={block.id} block={block} citationResolver={openCitationSources} />;
      case "actions":
        return <ActionBlock key={block.id} block={block} />;
      default:
        return <NormalTextSegment key={block.id} block={block} citationResolver={openCitationSources} />;
    }
  };

  return (
    <>
      <div className="space-y-3.5 md:space-y-4">
        {blocks.map((block) => (
          <BlockRenderBoundary key={block.id} blockId={block.id} fallbackText={block?.text || block?.caption || "I could not render this section cleanly."}>
            {renderBlock(block)}
          </BlockRenderBoundary>
        ))}
      </div>
      <SourcesDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={drawerTitle}
        sources={drawerSources}
      />
    </>
  );
}
