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
    return raw
      .map((r) => ({ item: r.item, score: r.score ?? 1, typeRank: TYPE_RANK[r.item.type] ?? 2 }))
      .sort((a, b) => {
        if (a.typeRank !== b.typeRank) return a.typeRank - b.typeRank;
        return a.score - b.score;
      })
      .map((r) => r.item);
  }, [fuse, query]);

  return (
    <div className="relative w-full">
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 180)}
        placeholder="Search…"
        aria-label="Search"
        className="h-9 sm:h-9 w-full rounded-full border bg-muted/40 px-3.5 sm:px-3 text-sm focus:bg-background"
      />
      {/* Desktop: anchored dropdown */}
      {open && results.length > 0 && (
        <ul className="hidden sm:block absolute left-0 right-0 z-40 mt-2 max-h-[420px] overflow-auto rounded-xl border bg-popover p-2 shadow-xl">
          {results.map((r) => (
            <li key={r.id}>
              <Link
                href={r.href ?? "#"}
                className="flex items-start justify-between gap-3 rounded-lg px-3 py-2.5 hover:bg-accent"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setOpen(false)}
              >
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{r.title}</span>
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {typeBadge(r.type)}
                    </span>
                  </span>
                  <span className="mt-1 block line-clamp-2 text-xs leading-relaxed text-muted-foreground">{r.excerpt.slice(0, 140)}</span>
                  {r.href && <span className="mt-1 block truncate text-[11px] text-muted-foreground/60">{r.href}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {/* Mobile: full-width sheet */}
      {open && results.length > 0 && (
        <div className="sm:hidden fixed inset-x-0 top-[48px] z-40 max-h-[58dvh] overflow-auto border-y bg-background p-2 shadow-lg">
          <ul className="grid gap-1">
            {results.map((r) => (
              <li key={r.id}>
                <Link
                  href={r.href ?? "#"}
                  className="flex min-h-[64px] items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 active:bg-accent"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setOpen(false)}
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[15px] font-semibold">{r.title}</span>
                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        {typeBadge(r.type)}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">{r.excerpt.slice(0, 90)}</span>
                  </span>
                  <span className="shrink-0 text-muted-foreground">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {open && query.trim().length >= 1 && results.length === 0 && docs.length > 0 && (
        <div className="absolute left-0 right-0 z-40 mt-2 rounded-xl border bg-popover px-3 py-3 text-sm text-muted-foreground shadow-lg sm:shadow-xl">
          No results.
        </div>
      )}
    </div>
  );
}
