"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Fuse from "fuse.js";
import type { SearchDoc } from "@/lib/search";

export function SearchBox() {
  const [query, setQuery] = useState("");
  const [docs, setDocs] = useState<SearchDoc[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        let res = await fetch("/search-index.json", { cache: "force-cache" });
        if (!res.ok) res = await fetch("/api/search-index", { cache: "force-cache" });
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
          { name: "excerpt", weight: 0.3 },
          { name: "slug", weight: 0.1 },
        ],
        threshold: 0.4,
        ignoreLocation: true,
        minMatchCharLength: 2,
      }),
    [docs],
  );

  const results = useMemo(() => {
    const q = query.trim();
    if (!q || q.length < 2) return [];
    return fuse.search(q).slice(0, 8).map((r) => r.item);
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
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search chapters…"
        aria-label="Search"
        className="h-9 w-full rounded-md border bg-background px-3 text-sm"
      />
      {open && results.length > 0 && (
        <ul className="absolute left-0 right-0 z-40 mt-1 max-h-80 overflow-auto rounded-md border bg-popover p-1 shadow-lg">
          {results.map((r) => (
            <li key={r.id}>
              <Link href={r.href ?? "#"} className="block rounded px-3 py-2 hover:bg-accent" onClick={() => setOpen(false)}>
                <span className="block text-sm font-medium">{r.title}</span>
                <span className="block truncate text-xs text-muted-foreground">{r.excerpt.slice(0, 120)}</span>
                <span className="text-[11px] text-muted-foreground">{r.type} · {r.href ?? r.slug}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {open && query.trim().length >= 2 && results.length === 0 && docs.length > 0 && (
        <div className="absolute left-0 right-0 z-40 mt-1 rounded-md border bg-popover px-3 py-2 text-sm text-muted-foreground shadow-lg">
          No results.
        </div>
      )}
    </div>
  );
}
