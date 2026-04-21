from __future__ import annotations

import re
from typing import Any, Dict, List, Tuple

import httpx

from ..utils import ProviderTimeoutError
from .ai_service import call_gemini_text

RESEARCH_TRIGGER_PATTERNS = (
    re.compile(r"\bwith\s+(?:sources|citations|references)\b", re.IGNORECASE),
    re.compile(r"\b(?:add|include|give|show|provide)\s+(?:sources|citations|references)\b", re.IGNORECASE),
    re.compile(r"\b(?:give|show|provide)\s+(?:me\s+)?references?\s+for\b", re.IGNORECASE),
    re.compile(r"\bcite\b|\bcitations?\b|\breferences?\b", re.IGNORECASE),
    re.compile(r"\bsupport\s+(?:this|that|it|the answer)?\s+with\s+(?:sources|citations|evidence)\b", re.IGNORECASE),
    re.compile(r"\bresearch\b[\s\S]*\b(?:with\s+citations|with\s+sources|with\s+references)\b", re.IGNORECASE),
    re.compile(r"\bdeep research\b", re.IGNORECASE),
    re.compile(r"\b(?:use|find)\s+papers?\b", re.IGNORECASE),
    re.compile(r"\bpeer[- ]reviewed\b|\bjournal sources?\b", re.IGNORECASE),
)

INLINE_CITATION_PATTERN = re.compile(r"\[\d+(?:\s*,\s*\d+)*\]")


def is_research_prompt(message: str) -> bool:
    text = str(message or "").strip().lower()
    if not text:
        return False
    return any(pattern.search(text) for pattern in RESEARCH_TRIGGER_PATTERNS)


def normalize_research_sources(sources: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    normalized: List[Dict[str, Any]] = []
    seen: set[str] = set()
    for index, source in enumerate(sources or [], start=1):
        url = str(source.get("url") or "").strip()
        title = str(source.get("title") or "").strip()
        if not url or not title:
            continue
        snippet = str(source.get("snippet") or "").strip()
        domain = str(source.get("domain") or source.get("provider") or "").strip() or "Source"
        provider = str(source.get("provider") or "research").strip() or "research"
        key = f"{url.lower()}|{title.lower()}"
        if key in seen:
            continue
        seen.add(key)
        normalized.append(
            {
                "id": str(source.get("id") or f"research-source-{index}"),
                "title": title,
                "url": url,
                "snippet": snippet[:360],
                "domain": domain,
                "provider": provider,
                "sourceType": "research",
                "grounded": True,
            }
        )
    return normalized


def _rebuild_abstract(abstract_index: dict[str, list[int]] | None) -> str:
    if not isinstance(abstract_index, dict) or not abstract_index:
        return ""
    positions: dict[int, str] = {}
    for word, indexes in abstract_index.items():
        if not isinstance(indexes, list):
            continue
        for index in indexes:
            if isinstance(index, int) and index >= 0:
                positions[index] = str(word)
    if not positions:
        return ""
    return " ".join(positions[index] for index in sorted(positions))


def _source_from_openalex(item: dict[str, Any], index: int) -> Dict[str, Any] | None:
    title = str(item.get("display_name") or "").strip()
    doi = str(item.get("doi") or "").strip()
    primary_location = item.get("primary_location") or {}
    url = (
        str(primary_location.get("landing_page_url") or "").strip()
        or doi
        or str(item.get("id") or "").strip()
    )
    if not title or not url:
        return None

    host = (
        str((primary_location.get("source") or {}).get("host_organization_name") or "").strip()
        or str((primary_location.get("source") or {}).get("display_name") or "").strip()
        or "OpenAlex"
    )
    snippet = _rebuild_abstract(item.get("abstract_inverted_index"))
    if not snippet:
        authors = item.get("authorships") or []
        first_author = ""
        if isinstance(authors, list) and authors:
            first_author = str(((authors[0] or {}).get("author") or {}).get("display_name") or "").strip()
        year = str(item.get("publication_year") or "").strip()
        parts = [part for part in [first_author, year, host] if part]
        snippet = " | ".join(parts)

    return {
        "id": str(item.get("id") or f"openalex-{index}"),
        "title": title,
        "url": url,
        "snippet": snippet[:360].strip(),
        "domain": host,
        "provider": "openalex",
    }


async def fetch_research_sources(query: str, limit: int = 5) -> List[Dict[str, Any]]:
    clean = str(query or "").strip()
    if not clean:
        return []

    params = {
        "search": clean,
        "per-page": str(max(1, min(limit, 8))),
        "mailto": "research@elimulink.local",
    }

    try:
        async with httpx.AsyncClient(timeout=12.0, follow_redirects=True) as client:
            response = await client.get("https://api.openalex.org/works", params=params)
            response.raise_for_status()
            payload = response.json() if response.content else {}
    except httpx.TimeoutException as exc:
        raise ProviderTimeoutError("RESEARCH_TIMEOUT") from exc
    except httpx.RequestError:
        return []
    except httpx.HTTPStatusError:
        return []
    except ValueError:
        return []

    results = payload.get("results") if isinstance(payload, dict) else []
    sources: List[Dict[str, Any]] = []
    seen_urls: set[str] = set()
    for index, item in enumerate(results or []):
        source = _source_from_openalex(item or {}, index)
        if not source:
            continue
        url_key = str(source.get("url") or "").strip().lower()
        if not url_key or url_key in seen_urls:
            continue
        seen_urls.add(url_key)
        sources.append(source)
        if len(sources) >= limit:
            break
    return sources


def build_research_prompt(message: str, sources: List[Dict[str, Any]]) -> str:
    lines = [
        "Research mode is active.",
        "Answer the user's question first.",
        "Use only the provided sources for citation markers like [1], [2], [3].",
        "Do not fabricate citations or source claims.",
        "If a point is not supported by the provided sources, phrase it carefully as a general explanation or leave it uncited.",
        "Do not imply comprehensive literature coverage or verified grounding beyond the provided source list.",
        "",
        f"USER_REQUEST:\n{str(message or '').strip()}",
        "",
        "PROVIDED_SOURCES:",
    ]
    for index, source in enumerate(sources, start=1):
        lines.extend(
            [
                f"[{index}] {source.get('title')}",
                f"URL: {source.get('url')}",
                f"Snippet: {source.get('snippet') or 'No snippet available.'}",
                "",
            ]
        )
    return "\n".join(lines).strip()


async def generate_research_answer(
    message: str,
    context: Dict[str, Any],
    mode: str | None = None,
    workspace_context: Dict[str, Any] | None = None,
    assistant_style: str | None = None,
) -> Tuple[str, List[Dict[str, Any]]]:
    sources = normalize_research_sources(await fetch_research_sources(message, limit=5))
    if not sources:
        general_explanation = await call_gemini_text(
            (
                "No reliable sources were found for this request. "
                "Give a concise general explanation without citations and do not pretend to have sourced evidence.\n\n"
                f"USER_REQUEST:\n{str(message or '').strip()}"
            ),
            context,
            mode=mode,
            workspace_context=workspace_context,
            assistant_style=assistant_style,
        )
        return (
            f"General explanation only: I couldn't retrieve reliable sources for this request right now.\n\n{general_explanation}",
            [],
        )

    answer = await call_gemini_text(
        build_research_prompt(message, sources),
        context,
        mode=mode,
        workspace_context=workspace_context,
        assistant_style=assistant_style,
    )
    if sources and not INLINE_CITATION_PATTERN.search(answer):
        answer = (
            f"{answer.rstrip()}\n\nSource list attached below. This reply should be read as a concise sourced summary, not a fully cited paragraph."
        ).strip()
    return answer, sources
