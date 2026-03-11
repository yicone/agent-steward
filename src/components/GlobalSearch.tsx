"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Source } from "@/lib/types";

const SEARCH_DEBOUNCE_MS = 250;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SearchResult = {
  sessionId: string;
  source: Source;
  title: string;
  cwd: string;
  snippet: string;
};

type ApiResponse = {
  results?: SearchResult[];
  error?: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Render a snippet string that may contain <mark>…</mark> tags safely. */
function SnippetHtml({ html }: { html: string }) {
  if (!html) return null;
  // Split on the literal <mark>…</mark> tags produced by SQLite snippet().
  // This avoids dangerouslySetInnerHTML entirely — no XSS risk regardless of
  // what text content was stored in the index.
  const parts = html.split(/(<mark>|<\/mark>)/);
  const nodes: React.ReactNode[] = [];
  let inMark = false;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!;
    if (part === "<mark>") { inMark = true; continue; }
    if (part === "</mark>") { inMark = false; continue; }
    if (inMark) {
      nodes.push(
        <mark key={i} className="rounded-sm bg-yellow-300/60 px-0 text-inherit dark:bg-yellow-500/40">
          {part}
        </mark>
      );
    } else {
      nodes.push(part);
    }
  }
  return <span>{nodes}</span>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export type GlobalSearchProps = {
  /** Called when the user selects a session from results. */
  onSelect(sessionId: string, source: Source): void;
};

export function GlobalSearch({ onSelect }: GlobalSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- open/close ----

  const openPanel = useCallback(() => {
    setOpen(true);
    setQuery("");
    setResults([]);
    setError(null);
    setActiveIndex(0);
  }, []);

  const closePanel = useCallback(() => {
    setOpen(false);
  }, []);

  // ---- Cmd+K / Ctrl+K global shortcut ----

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (open) {
          closePanel();
        } else {
          openPanel();
        }
      }
      if (e.key === "Escape" && open) {
        closePanel();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, openPanel, closePanel]);

  // ---- Focus input when opened ----

  useEffect(() => {
    if (open) {
      // Defer to after the render
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // ---- Debounced search ----

  const doSearch = useCallback((q: string) => {
    if (!q.trim()) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`/api/search?q=${encodeURIComponent(q)}&limit=20`)
      .then((r) => r.json() as Promise<ApiResponse>)
      .then((data) => {
        setResults(data.results ?? []);
        setError(data.error ?? null);
        setActiveIndex(0);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleQueryChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      setQuery(v);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => doSearch(v), SEARCH_DEBOUNCE_MS);
    },
    [doSearch]
  );

  // ---- Keyboard navigation inside panel ----

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && results[activeIndex]) {
        const r = results[activeIndex]!;
        onSelect(r.sessionId, r.source);
        closePanel();
      } else if (e.key === "Escape") {
        closePanel();
      }
    },
    [results, activeIndex, onSelect, closePanel]
  );

  // ---- Render ----

  if (!open) {
    return (
      <button
        type="button"
        onClick={openPanel}
        className="flex items-center gap-1.5 rounded-md border border-border/60 bg-background/8 px-2.5 py-1 text-xs text-muted transition-colors hover:border-accent/40 hover:text-foreground"
        title="Global search (Cmd+K)"
        aria-label="Open global search"
      >
        <span>🔍</span>
        <span>Search sessions</span>
        <kbd className="ml-1 hidden rounded border border-border/60 px-1 py-0.5 font-mono text-[10px] opacity-70 sm:inline">
          ⌘K
        </kbd>
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={closePanel}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Global session search"
        className="fixed left-1/2 top-[15vh] z-50 w-full max-w-xl -translate-x-1/2 rounded-xl border border-border/80 bg-card shadow-2xl"
      >
        {/* Search input */}
        <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
          <span className="text-muted">🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleQueryChange}
            onKeyDown={handleKeyDown}
            placeholder="Search across all indexed sessions…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
            autoComplete="off"
            spellCheck={false}
          />
          {loading && <span className="text-xs text-muted">Searching…</span>}
          <kbd
            className="cursor-pointer rounded border border-border/60 px-1.5 py-0.5 font-mono text-[10px] text-muted hover:text-foreground"
            onClick={closePanel}
            title="Close (Esc)"
          >
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-auto">
          {error ? (
            <div className="px-4 py-3 text-xs text-red-400">{error}</div>
          ) : results.length === 0 && query.trim() && !loading ? (
            <div className="px-4 py-3 text-xs text-muted">No indexed sessions match &ldquo;{query}&rdquo;. Sessions are indexed when you open them.</div>
          ) : results.length === 0 && !query.trim() ? (
            <div className="px-4 py-3 text-xs text-muted">
              Type to search session titles, conversations, and tool outputs.
              <br />
              <span className="opacity-70">Sessions are indexed the first time you open them.</span>
            </div>
          ) : (
            <ul role="listbox">
              {results.map((r, i) => (
                <li
                  key={`${r.source}:${r.sessionId}`}
                  role="option"
                  aria-selected={i === activeIndex}
                  className={cn(
                    "cursor-pointer border-b border-border/40 px-4 py-2.5 transition-colors last:border-0",
                    i === activeIndex ? "bg-accent/10" : "hover:bg-background/8"
                  )}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => {
                    onSelect(r.sessionId, r.source);
                    closePanel();
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Badge className="shrink-0 capitalize">{r.source}</Badge>
                    <span className="truncate text-sm font-medium">
                      {r.title || r.sessionId}
                    </span>
                  </div>
                  {r.cwd ? (
                    <div className="mt-0.5 truncate font-mono text-xs text-muted">{r.cwd}</div>
                  ) : null}
                  {r.snippet ? (
                    <div className="mt-1 line-clamp-2 text-xs text-muted/80">
                      <SnippetHtml html={r.snippet} />
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer hint */}
        {results.length > 0 ? (
          <div className="border-t border-border/40 px-4 py-1.5 text-[10px] text-muted">
            ↑↓ navigate · Enter open · Esc close
          </div>
        ) : null}
      </div>
    </>
  );
}
