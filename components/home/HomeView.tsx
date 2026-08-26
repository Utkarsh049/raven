"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePinsStore } from "@/lib/pins-store";
import { useSettingsStore } from "@/lib/settings-store";
import { Grid, GridCard } from "@/components/GridCard";

export type BranchItem = { id: string | number; slug: string; title: string };
export type YearItem = { id: string | number; slug: string; title: string; parent: unknown };

interface HomeViewProps {
  initialBranches: BranchItem[];
  initialYears: YearItem[];
}

function parentIdOf(v: unknown): string | null {
  if (!v) return null;
  if (typeof v === "string" || typeof v === "number") return String(v);
  if (typeof v === "object" && "id" in (v as { id?: unknown })) return String((v as { id?: unknown }).id ?? "");
  return null;
}

function getInitialHomeTab(): "home" | "pinned" {
  if (typeof window === "undefined") return "home";
  const params = new URLSearchParams(window.location.search);
  const tabParam = params.get("tab");
  if (tabParam === "pinned") return "pinned";
  if (tabParam === "home" || tabParam === "browse") return "home";
  const saved = sessionStorage.getItem("raven_active_tab");
  if (saved === "pinned") return "pinned";
  return "home";
}

export function HomeView({ initialBranches, initialYears }: HomeViewProps) {
  const [activeTab, setActiveTab] = useState<"home" | "pinned">(getInitialHomeTab);
  const pins = usePinsStore((s) => s.pins);
  const togglePin = usePinsStore((s) => s.toggle);
  const preferredBranchSlug = useSettingsStore((s) => s.branchSlug);

  // Sync tab state with browser back/forward history (popstate)
  useEffect(() => {
    const onPopState = () => {
      setActiveTab(getInitialHomeTab());
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const handleTabChange = (tab: "home" | "pinned") => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("raven_active_tab", tab);
      const url = new URL(window.location.href);
      if (tab === "pinned") {
        url.searchParams.set("tab", "pinned");
      } else {
        url.searchParams.delete("tab");
      }
      window.history.replaceState(null, "", url.toString());
    }
  };

  // Find preferred branch if set, or fallback to first branch
  const activeBranch =
    (preferredBranchSlug && initialBranches.find((b) => b.slug === preferredBranchSlug)) ||
    initialBranches[0];

  const activeBranchYears = activeBranch
    ? initialYears.filter((y) => parentIdOf(y.parent) === String(activeBranch.id))
    : [];

  return (
    <main id="main-content" className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header & Segmented Tab Switcher */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {activeTab === "home"
              ? activeBranch
                ? activeBranch.title
                : "Curriculum"
              : "Pinned Chapters"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeTab === "home"
              ? "Browse academic years, subjects, and chapters offline."
              : "Quick access to your bookmarked chapters, available offline."}
          </p>
        </div>

        {/* Tab Toggle Switch */}
        <div className="inline-flex self-start sm:self-auto p-1 rounded-xl bg-muted/80 border">
          <button
            type="button"
            onClick={() => handleTabChange("home")}
            className={`inline-flex items-center px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all ${
              activeTab === "home"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Browse
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("pinned")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all ${
              activeTab === "pinned"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>Pinned</span>
            {pins.length > 0 && (
              <span className="ml-1 inline-flex items-center justify-center px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-foreground text-background">
                {pins.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Tab: Browse (Home) */}
      {activeTab === "home" && (
        <div className="mt-6 space-y-8">
          {/* Years Section for current branch */}
          {activeBranch && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold tracking-tight text-foreground">Academic Years</h2>
                {initialBranches.length > 1 && (
                  <span className="text-xs text-muted-foreground">
                    Branch: <span className="font-medium text-foreground">{activeBranch.title}</span>
                  </span>
                )}
              </div>

              {activeBranchYears.length === 0 ? (
                <p className="text-sm text-muted-foreground">No academic years published yet.</p>
              ) : (
                <Grid>
                  {activeBranchYears.map((y) => (
                    <GridCard
                      key={y.slug}
                      href={`/${activeBranch.slug}/${y.slug}`}
                      title={y.title}
                      actionLabel="Explore"
                    />
                  ))}
                </Grid>
              )}
            </section>
          )}

          {/* All Branches list if more than 1 branch exists */}
          {initialBranches.length > 1 && (
            <section className="pt-6 border-t">
              <h2 className="text-base font-semibold tracking-tight text-foreground mb-4">All Branches</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {initialBranches.map((b) => (
                  <Link
                    key={b.slug}
                    href={`/${b.slug}`}
                    className={`flex items-center justify-between p-3.5 rounded-xl border text-sm font-medium transition-all ${
                      b.slug === activeBranch?.slug
                        ? "bg-accent border-border font-semibold"
                        : "bg-card hover:bg-accent/60"
                    }`}
                  >
                    <span className="truncate">{b.title}</span>
                    <span className="text-xs text-muted-foreground">→</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Tab: Pinned Chapters */}
      {activeTab === "pinned" && (
        <div className="mt-6">
          {pins.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed p-8 sm:p-14 text-center bg-card/40">
              <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center mb-3 text-muted-foreground">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="17" x2="12" y2="22" />
                  <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a1 1 0 0 0 0-2H8a1 1 0 0 0 0 2h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-foreground">No pinned chapters yet</h3>
              <p className="mt-1.5 max-w-sm text-xs sm:text-sm text-muted-foreground leading-relaxed">
                When reading any chapter, tap the pin icon in the top right to save it here for fast 1-click access even when offline.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("home")}
                className="mt-5 inline-flex items-center rounded-xl bg-foreground px-4 py-2 text-xs font-semibold text-background hover:opacity-90 transition-opacity"
              >
                Browse Curriculum
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {pins.map((pin) => (
                <div
                  key={pin.id}
                  className="group relative flex flex-col justify-between rounded-2xl border bg-card p-4 sm:p-5 shadow-xs transition-all hover:bg-accent/50 hover:border-border/80 hover:shadow-md"
                >
                  <div className="min-w-0 pr-6">
                    <span className="inline-block rounded bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                      {pin.kind}
                    </span>
                    <Link
                      href={pin.href}
                      className="block text-sm sm:text-base font-semibold text-foreground hover:underline line-clamp-2 break-words"
                    >
                      {pin.title}
                    </Link>
                  </div>

                  <div className="mt-4 flex items-center justify-between pt-3 border-t border-border/40 text-xs">
                    <Link
                      href={pin.href}
                      className="inline-flex items-center gap-1 font-semibold text-foreground group-hover:text-primary transition-colors"
                    >
                      Read Chapter <span aria-hidden>→</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() =>
                        togglePin({
                          id: pin.id,
                          href: pin.href,
                          title: pin.title,
                          kind: pin.kind,
                        })
                      }
                      className="rounded px-2 py-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors font-medium"
                      title="Remove from pinned"
                    >
                      Unpin
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
