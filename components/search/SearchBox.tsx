"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import Fuse from "fuse.js";
import type { SearchDoc } from "@/lib/search";

const TYPE_RANK: Record<string, number> = { subject: 0, chapter: 1, topic: 1 };

function typeBadge(type: string) {
  const t = String(type).toLowerCase();
  if (t === "admin") return "Admin";
  if (t === "subject") return "Subject";
  if (t === "chapter") return "Chapter";
  if (t === "topic") return "Topic";
  return t;
}

export function SearchBox() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [docs, setDocs] = useState<SearchDoc[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isMac, setIsMac] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  useEffect(() => {
    setIsMac(typeof navigator !== "undefined" && /(Mac|iPhone|iPod|iPad)/i.test(navigator.userAgent));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        let res = await fetch("/api/search-index");
        if (!res.ok) res = await fetch("/search-index.json");
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

    // Secret admin code word "vk18" (case-insensitive, handles any spacing or punctuation like VK18, vk 18, vk-18, Vk_18)
    const clean = q.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (clean === "vk18") {
      return [
        {
          id: "secret-admin-access",
          title: "Admin Dashboard",
          slug: "admin",
          type: "admin" as unknown as SearchDoc["type"],
          href: "/admin",
          excerpt: "Open Raven Control Panel & Content Management System",
        },
      ];
    }

    const raw = fuse.search(q).slice(0, 12);
    return raw
      .map((r) => ({ item: r.item, score: r.score ?? 1, typeRank: TYPE_RANK[r.item.type] ?? 2 }))
      .sort((a, b) => {
        if (a.typeRank !== b.typeRank) return a.typeRank - b.typeRank;
        return a.score - b.score;
      })
      .map((r) => r.item);
  }, [fuse, query]);

  // Reset active index when query changes or dropdown closes
  useEffect(() => {
    setActiveIndex(-1);
  }, [query, open]);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && itemRefs.current[activeIndex]) {
      itemRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K / Cmd+K shortcut to focus search
      if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        setOpen(true);
        return;
      }

      if (!open) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (results.length > 0) {
          setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
        }
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (results.length > 0) {
          setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
        }
        return;
      }

      if (e.key === "Enter") {
        if (results.length > 0) {
          const selected = activeIndex >= 0 && activeIndex < results.length ? results[activeIndex] : results[0];
          if (selected?.href) {
            e.preventDefault();
            setOpen(false);
            inputRef.current?.blur();
            router.push(selected.href);
          }
        }
        return;
      }

      if (e.key === "Escape") {
        setOpen(false);
        setActiveIndex(-1);
        inputRef.current?.blur();
      }
    };

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
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
  }, [open, results, activeIndex, router]);

  return (
    <div ref={containerRef} className="relative w-full min-w-0">
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search…"
          aria-label="Search"
          className="h-9 w-full rounded-full border bg-muted/50 pl-3.5 pr-14 sm:pr-16 text-sm transition-colors focus:bg-background focus:ring-2 focus:ring-ring focus:outline-none"
        />
        <kbd
          onClick={() => {
            inputRef.current?.focus();
            setOpen(true);
          }}
          className="pointer-events-none absolute right-2.5 hidden select-none items-center gap-0.5 rounded-md border bg-background/80 px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground shadow-xs sm:inline-flex"
        >
          {isMac ? "⌘" : "Ctrl"} K
        </kbd>
      </div>

      {/* Responsive search results dropdown: full-width with horizontal margins on mobile, anchored on desktop */}
      {open && results.length > 0 && (
        <div className="fixed left-3 right-3 top-[52px] z-50 max-h-[65dvh] overflow-y-auto overflow-x-hidden rounded-2xl border bg-popover/95 p-2 shadow-2xl backdrop-blur-md sm:absolute sm:left-0 sm:right-0 sm:top-full sm:mt-2 sm:max-h-[420px] sm:rounded-xl sm:p-1.5">
          <ul className="grid w-full min-w-0 gap-1" role="listbox">
            {results.map((r, i) => {
              const isSelected = i === activeIndex;
              return (
                <li key={r.id} className="w-full min-w-0" role="option" aria-selected={isSelected}>
                  <Link
                    ref={(el) => {
                      itemRefs.current[i] = el;
                    }}
                    href={r.href ?? "#"}
                    className={`flex w-full min-w-0 items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 transition-colors ${
                      isSelected
                        ? "bg-accent text-accent-foreground ring-1 ring-ring/30 shadow-xs"
                        : "hover:bg-accent/70 active:bg-accent"
                    }`}
                    onClick={() => {
                      setOpen(false);
                      setActiveIndex(-1);
                    }}
                    onMouseEnter={() => setActiveIndex(i)}
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
              );
            })}
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




