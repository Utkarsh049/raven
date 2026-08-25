"use client";

import { useEffect, useState } from "react";
import { useSettingsStore, type Theme } from "@/lib/settings-store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type BranchOption = { slug: string; title: string };


export function SettingsDrawer() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const branchSlug = useSettingsStore((s) => s.branchSlug);
  const theme = useSettingsStore((s) => s.theme);
  const setBranchSlug = useSettingsStore((s) => s.setBranchSlug);
  const setTheme = useSettingsStore((s) => s.setTheme);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const id = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
      return () => cancelAnimationFrame(id);
    }
    setVisible(false);
    const t = setTimeout(() => setMounted(false), 300);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [mounted]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingBranches(true);
    fetch("/api/nodes?where[type][equals]=branch&where[status][equals]=published&limit=100&depth=0", { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        const docs = (json?.docs ?? []) as Array<{ slug: string; title: string }>;
        setBranches(docs.map((d) => ({ slug: d.slug, title: d.title })).filter((b) => b.slug));
      })
      .catch(() => {
        if (!cancelled) setBranches([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingBranches(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label="Open settings"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-md border bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <span aria-hidden className="text-base leading-none">⚙</span>
      </button>

      {mounted && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            aria-label="Close settings"
            onClick={() => setOpen(false)}
            className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Settings"
            className={`relative flex h-[100dvh] w-[88vw] sm:w-[380px] max-w-[90vw] flex-col border-l bg-background shadow-xl transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform ${visible ? "translate-x-0" : "translate-x-full"}`}
          >
            <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
              <h2 className="text-sm font-semibold">Settings</h2>
              <button type="button" onClick={() => setOpen(false)} className="rounded px-2 py-1 text-sm text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Close">
                ✕
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 space-y-6">
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Branch</h3>
                <p className="text-xs text-muted-foreground">Preferred branch for navigation. Saved offline.</p>
                {loadingBranches ? (
                  <p className="text-sm text-muted-foreground">Loading branches…</p>
                ) : branches.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No published branches yet.</p>
                ) : (
                  <div className="grid gap-2">
                    <label htmlFor="branch-select" className="text-xs font-medium">
                      Preferred branch
                    </label>
                    <Select
                      value={branchSlug ?? "none"}
                      onValueChange={(val) => setBranchSlug(val === "none" ? null : val)}
                    >
                      <SelectTrigger id="branch-select" className="w-full bg-background">
                        <SelectValue placeholder="Select a branch" />
                      </SelectTrigger>
                      <SelectContent className="z-[70]" position="popper">
                        <SelectItem value="none">— No preference —</SelectItem>
                        {branches.map((b) => (
                          <SelectItem key={b.slug} value={b.slug}>
                            {b.title} ({b.slug})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {branchSlug ? (
                      <a href={`/${branchSlug}`} className="text-xs text-primary underline">
                        Go to {branchSlug}
                      </a>
                    ) : (
                      <p className="text-xs text-muted-foreground">Browse from the home page or a chapter link.</p>
                    )}
                  </div>
                )}
              </section>

              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Theme</h3>
                <p className="text-xs text-muted-foreground">Applied instantly and remembered offline.</p>
                <div className="grid grid-cols-3 gap-2">
                  {(["light", "dark", "system"] as Theme[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTheme(t)}
                      className={`rounded-md border px-3 py-2 text-sm font-medium capitalize ${theme === t ? "bg-foreground text-background border-foreground" : "bg-background hover:bg-accent"}`}
                      aria-pressed={theme === t}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </section>
            </div>

            <div className="shrink-0 border-t px-4 py-3 text-xs text-muted-foreground">Branch & theme persist in IndexedDB — works offline.</div>
          </aside>
        </div>
      )}
    </>
  );
}
