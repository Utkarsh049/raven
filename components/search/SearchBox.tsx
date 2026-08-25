"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import Fuse from "fuse.js";
import type { SearchDoc } from "@/lib/search";

const TYPE_RANK: Record<string, number> = { subject: 0, chapter: 1, topic: 1 };

function typeBadge(type: string) {
  const t = String(type).toLowerCase();
  if (t === "subject") return "Subject";
  if (t === "chapter") return "Chapter";
  if (t === "topic") return "Topic";
  return t;
}

export function SearchBox() {
  const [query, setQuery] = useState("");
  const [docs, setDocs] = useState<SearchDoc[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        let res = await fetch("/api/search-index", { cache: "no-store" });
        if (!res.ok) res = await fetch("/search-index.json", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as SearchDoc[];
        if (!cancelled) setDocs(Array.isArray(json) ? json : []);
      } catch {}
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  const fuse = useMemo(
    () =>
      new Fuse(docs, {
        keys: [
          { name: "title", weight: 0.6 },
          { name: "slug", weight: 0.2 },
          { name: "excerpt", weight: 0.2 },
        ],
        threshold: 0.4,
        ignoreLocation: true,
        minMatchCharLength: 2,
        includeScore: true,
      }),
    [docs],
  );

  const results = useMemo(() => {
    const q = query.trim();
    if (!q || q.length < 1) return [];
    const raw = fuse.search(q).slice(0, 12);
    return raw
      .map((r) => ({ item: r.item, score: r.score ?? 1, typeRank: TYPE_RANK[r.item.type] ?? 2 }))
      .sort((a, b) => {
        if (a.typeRank !== b.typeRank) return a.typeRank - b.typeRank;
        return a.score - b.score;
      })
      .map((r) => r.item);
  }, [fuse, query]);

  return (
    <div ref={containerRef} className="relative w-full min-w-0">
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search…"
        aria-label="Search"
        className="h-9 w-full rounded-full border bg-muted/50 px-3.5 text-sm transition-colors focus:bg-background focus:ring-2 focus:ring-ring focus:outline-none"
      />

      {/* Responsive search results dropdown: full-width with horizontal margins on mobile, anchored on desktop */}
      {open && results.length > 0 && (
        <div className="fixed left-3 right-3 top-[52px] z-50 max-h-[65dvh] overflow-y-auto overflow-x-hidden rounded-2xl border bg-popover/95 p-2 shadow-2xl backdrop-blur-md sm:absolute sm:left-0 sm:right-0 sm:top-full sm:mt-2 sm:max-h-[420px] sm:rounded-xl sm:p-1.5">
          <ul className="grid w-full min-w-0 gap-1">
            {results.map((r) => (
              <li key={r.id} className="w-full min-w-0">
                <Link
                  href={r.href ?? "#"}
                  className="flex w-full min-w-0 items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 hover:bg-accent active:bg-accent transition-colors"
                  onClick={() => setOpen(false)}
                >
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <div className="flex min-w-0 items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-foreground min-w-0 flex-1">
                        {r.title}
                      </span>
                      <span className="shrink-0 rounded bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {typeBadge(r.type)}
                      </span>
                    </div>
                    {r.excerpt && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground min-w-0">
                        {r.excerpt.slice(0, 100)}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground ml-1" aria-hidden>
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {open && query.trim().length >= 1 && results.length === 0 && docs.length > 0 && (
        <div className="fixed left-3 right-3 top-[52px] z-50 rounded-2xl border bg-popover/95 px-4 py-3 text-sm text-muted-foreground shadow-2xl backdrop-blur-md sm:absolute sm:left-0 sm:right-0 sm:top-full sm:mt-2 sm:rounded-xl">
          No results found.
        </div>
      )}
    </div>
  );
}



