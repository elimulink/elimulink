import React from "react";
import { ExternalLink, Expand, FolderPlus } from "lucide-react";
import "./image-search.css";

export default function ImageSearchResults({
  query,
  results = [],
  onPreview,
  onReuse,
}) {
  const displayResults = (Array.isArray(results) ? results : []).filter(
    (result) => result?.thumbnail && result?.link
  );
  if (!displayResults.length) return null;

  return (
    <div className="image-search-results">
      <div className="image-search-results-header">
        <div>
          <div className="image-search-results-eyebrow">Web Image Search</div>
          <div className="image-search-results-title">
            {query ? `Image results for "${query}"` : "Image results"}
          </div>
        </div>
        <div className="image-search-results-count">{displayResults.length} results</div>
      </div>

      <div className="image-search-results-grid">
        {displayResults.map((result) => (
          <article key={result.id || result.link} className="image-search-card">
            <button
              type="button"
              className="image-search-card-media"
              onClick={() => onPreview?.(result)}
            >
              <img src={result.thumbnail} alt={result.title} className="image-search-card-image" />
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
              <button type="button" className="image-search-action" onClick={() => onReuse?.(result)}>
                <FolderPlus size={14} />
                <span>Reuse</span>
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
