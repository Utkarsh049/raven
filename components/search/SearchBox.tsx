"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
    // Boost by type: subject > chapter/topic > content-heavy
    return raw
      .map((r) => ({ item: r.item, score: r.score ?? 1, typeRank: TYPE_RANK[r.item.type] ?? 2 }))
      .sort((a, b) => {
        if (a.typeRank !== b.typeRank) return a.typeRank - b.typeRank;
        return a.score - b.score;
      })
      .map((r) => r.item);
  }, [fuse, query]);

  return (
    <div className="relative w-full max-w-md">
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 180)}
        placeholder="Search subjects, chapters…"
        aria-label="Search"
        className="h-9 w-full rounded-md border bg-background px-3 text-sm"
      />
      {open && results.length > 0 && (
        <ul className="absolute left-0 right-0 z-40 mt-1 max-h-96 overflow-auto rounded-md border bg-popover p-1 shadow-lg">
          {results.map((r) => (
            <li key={r.id}>
              <Link
                href={r.href ?? "#"}
                className="flex items-start justify-between gap-2 rounded px-3 py-2 hover:bg-accent"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setOpen(false)}
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{r.title}</span>
                    <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {typeBadge(r.type)}
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">{r.excerpt.slice(0, 110)}</span>
                  {r.href && <span className="block truncate text-[11px] text-muted-foreground/70">{r.href}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {open && query.trim().length >= 1 && results.length === 0 && docs.length > 0 && (
        <div className="absolute left-0 right-0 z-40 mt-1 rounded-md border bg-popover px-3 py-2 text-sm text-muted-foreground shadow-lg">
          No results.
        </div>
      )}
    </div>
  );
}
