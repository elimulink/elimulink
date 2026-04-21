import React from "react";
import { ExternalLink, Expand, FolderPlus } from "lucide-react";
import "./image-search.css";

export default function ImageSearchResults({
  query,
  results = [],
  onPreview,
  onReuse,
  layout = "grid",
  eyebrow = "Web Image Search",
  titlePrefix = "Image results for",
  countLabel = "results",
  showReuse = true,
}) {
  const displayResults = (Array.isArray(results) ? results : []).filter(
    (result) => result?.thumbnail && result?.link
  );
  if (!displayResults.length) return null;
  const isRow = layout === "row";

  return (
    <div className={`image-search-results ${isRow ? "image-search-results-row-mode" : ""}`}>
      <div className="image-search-results-header">
        <div>
          <div className="image-search-results-eyebrow">{eyebrow}</div>
          <div className="image-search-results-title">
            {query ? `${titlePrefix} "${query}"` : "Image results"}
          </div>
        </div>
        <div className="image-search-results-count">{displayResults.length} {countLabel}</div>
      </div>

      <div className={isRow ? "image-search-results-row" : "image-search-results-grid"}>
        {displayResults.map((result) => (
          <article key={result.id || result.link} className="image-search-card">
            <button
              type="button"
              className="image-search-card-media"
              onClick={() => onPreview?.(result)}
            >
              <img src={result.thumbnail} alt={result.title} loading="lazy" className="image-search-card-image" />
            </button>

            <div className="image-search-card-body">
              <div className="image-search-card-title">{result.title || "Untitled image"}</div>
              <a
                href={result.link}
                target="_blank"
                rel="noreferrer"
                className="image-search-card-link"
              >
                {result.sourceTitle || "Open source"}
              </a>
            </div>

            <div className="image-search-card-actions">
              <button type="button" className="image-search-action" onClick={() => onPreview?.(result)}>
                <Expand size={14} />
                <span>Preview</span>
              </button>
              <a
                href={result.link}
                target="_blank"
                rel="noreferrer"
                className="image-search-action"
              >
                <ExternalLink size={14} />
                <span>Source</span>
              </a>
              {showReuse ? (
                <button type="button" className="image-search-action" onClick={() => onReuse?.(result)}>
                  <FolderPlus size={14} />
                  <span>Reuse</span>
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
