import { useMemo, useState } from "react";
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
import { parseAssistantResponseBlocks } from "./responseBlockParser";

function blockShellClass(tone = "default") {
  const tones = {
    default: "bg-transparent",
    note: "bg-transparent",
    warning: "bg-transparent",
    success: "bg-transparent",
  };
  return ["bg-transparent", tones[tone] || tones.default].join(" ");
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

function parseInlineMarkdown(text, keyPrefix = "inline") {
  const value = String(text || "");
  const parts = value.split(/(\[[^\]]+\]\(https?:\/\/[^)]+\)|`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_)/g);

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

function renderLooseText(text, keyPrefix = "loose") {
  const paragraphs = String(text || "")
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);

  return (
    <div className="space-y-3.5">
      {paragraphs.map((paragraph, index) => (
        <p key={`${keyPrefix}-${index}`} className="text-[15px] leading-[1.82] text-slate-800 md:text-[14px] md:leading-7 dark:text-slate-100">
          {parseInlineMarkdown(normalizeLooseLine(paragraph), `${keyPrefix}-${index}`)}
        </p>
      ))}
    </div>
  );
}

function renderMarkdownDocument(text) {
  const lines = String(text || "").replace(/\r\n/g, "\n").split("\n");
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
          {parseInlineMarkdown(headingMatch[2], `h-${index}`)}
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
            <p key={`quote-line-${index}-${qIndex}`}>{parseInlineMarkdown(item, `q-${index}-${qIndex}`)}</p>
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
        {parseInlineMarkdown(paragraph.join(" "), `p-${index}`)}
      </p>
    );
  }

  return <div className="space-y-3.5">{nodes}</div>;
}

export function PlainTextBlock({ block }) {
  return (
    <ResponseBlockShell icon={FileText} action={<CopyButton text={block.text} label="Copy" />} showHeader={false}>
      {renderLooseText(block.text, "plain")}
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

export function ListBlock({ block, compact = false }) {
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
          {parseInlineMarkdown(item.text, `list-item-${index}`)}
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
  return (
    <ResponseBlockShell icon={Table2} label="Table">
      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr>
              {(block.columns || []).map((column, index) => (
                <th
                  key={`th-${index}`}
                  className="border-b border-slate-200/90 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:border-white/10 dark:text-slate-300"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(block.rows || []).map((row, rowIndex) => (
              <tr key={`row-${rowIndex}`}>
                {row.map((cell, cellIndex) => (
                  <td
                    key={`cell-${rowIndex}-${cellIndex}`}
                    className="border-b border-slate-200/70 px-3 py-3 text-slate-700 last:border-b-0 dark:border-white/10 dark:text-slate-100"
                  >
                    {parseInlineMarkdown(cell, `cell-${rowIndex}-${cellIndex}`)}
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
      label="Image"
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
      <button
        type="button"
        onClick={() => onPreview?.(block.imageUrl)}
        className="block w-full overflow-hidden rounded-[18px] bg-slate-100 dark:bg-white/5"
      >
        <img src={block.imageUrl} alt={block.caption || "Generated image"} className="max-h-[380px] w-full object-cover" />
      </button>
      {block.caption ? (
        <p className="mt-3 text-[15px] leading-[1.82] text-slate-800 md:text-sm md:leading-7 dark:text-slate-100">{block.caption}</p>
      ) : null}
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

export function MathBlock({ block }) {
  return (
    <ResponseBlockShell icon={Sigma} label="Math" action={<CopyButton text={block.text} label="Copy" />}>
      <div className="overflow-x-auto rounded-xl bg-slate-50/70 px-4 py-3 font-mono text-sm leading-7 text-slate-800 dark:bg-transparent dark:px-0 dark:py-1 dark:text-slate-100">
        <pre className="whitespace-pre-wrap">{block.text}</pre>
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

export function MarkdownBlock({ block }) {
  return (
    <ResponseBlockShell icon={FileText} action={<CopyButton text={block.text} label="Copy" />} showHeader={false}>
      {renderMarkdownDocument(block.text)}
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

function NormalTextSegment({ block }) {
  return renderLooseText(block.text, "normal");
}

export default function ResponseBlockRenderer({
  text = "",
  imageUrl = "",
  sources = [],
  onGeneratedImagePreview,
}) {
  const blocks = useMemo(
    () => parseAssistantResponseBlocks({ text, imageUrl, sources }),
    [imageUrl, sources, text]
  );

  return (
    <div className="space-y-3.5 md:space-y-4">
      {blocks.map((block) => {
        switch (block.type) {
          case "plain_text":
            return <PlainTextBlock key={block.id} block={block} />;
          case "code":
            return <CodeBlock key={block.id} block={block} />;
          case "quote":
            return <QuoteBlock key={block.id} block={block} />;
          case "list":
            return <ListBlock key={block.id} block={block} />;
          case "table":
            return <TableBlock key={block.id} block={block} />;
          case "image":
            return <ImageBlock key={block.id} block={block} onPreview={onGeneratedImagePreview} />;
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
          case "math":
            return <MathBlock key={block.id} block={block} />;
          case "json":
            return <JsonDataBlock key={block.id} block={block} />;
          case "markdown":
            return <MarkdownBlock key={block.id} block={block} />;
          case "actions":
            return <ActionBlock key={block.id} block={block} />;
          default:
            return <NormalTextSegment key={block.id} block={block} />;
        }
      })}
    </div>
  );
}
