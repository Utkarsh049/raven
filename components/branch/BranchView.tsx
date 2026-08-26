"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePinsStore } from "@/lib/pins-store";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Grid, GridCard } from "@/components/GridCard";

interface BranchViewProps {
  branchSlug: string;
  branchTitle: string;
  years: Array<{ slug: string; title: string }>;
}

function getInitialBranchTab(): "browse" | "pinned" {
  if (typeof window === "undefined") return "browse";
  const params = new URLSearchParams(window.location.search);
  const tabParam = params.get("tab");
  if (tabParam === "pinned") return "pinned";
  if (tabParam === "browse" || tabParam === "years") return "browse";
  const saved = sessionStorage.getItem("raven_active_tab");
  if (saved === "pinned") return "pinned";
  return "browse";
}

export function BranchView({ branchSlug, branchTitle, years }: BranchViewProps) {
  const [activeTab, setActiveTab] = useState<"browse" | "pinned">(getInitialBranchTab);
  const pins = usePinsStore((s) => s.pins);
  const togglePin = usePinsStore((s) => s.toggle);

  // Sync tab state with browser back/forward history (popstate)
  useEffect(() => {
    const onPopState = () => {
      setActiveTab(getInitialBranchTab());
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const handleTabChange = (tab: "browse" | "pinned") => {
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

  return (
    <main id="main-content" className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <Breadcrumb items={[{ label: branchTitle }]} />

      {/* Header & Segmented Tab Switcher */}
      <div className="mt-3 sm:mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {activeTab === "browse" ? branchTitle : "Pinned Chapters"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeTab === "browse"
              ? "Academic Years"
              : "Bookmarked chapters available for fast offline reading."}
          </p>
        </div>

        {/* Tab Toggle Switch */}
        <div className="inline-flex self-start sm:self-auto p-1 rounded-xl bg-muted/80 border">
          <button
            type="button"
            onClick={() => handleTabChange("browse")}
            className={`inline-flex items-center px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all ${
              activeTab === "browse"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Years
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

      {/* Browse Tab: Years Grid */}
      {activeTab === "browse" && (
        <div className="mt-6">
          {years.length === 0 ? (
            <p className="text-sm text-muted-foreground">No years published yet.</p>
          ) : (
            <Grid>
              {years.map((y) => (
                <GridCard
                  key={y.slug}
                  href={`/${branchSlug}/${y.slug}`}
                  title={y.title}
                  actionLabel="Open"
                />
              ))}
            </Grid>
          )}
        </div>
      )}

      {/* Pinned Tab: Pinned Chapters Grid */}
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
                When reading any chapter, tap the pin icon in the top right to save it here for fast access offline.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("browse")}
                className="mt-5 inline-flex items-center rounded-xl bg-foreground px-4 py-2 text-xs font-semibold text-background hover:opacity-90 transition-opacity"
              >
                Browse Years
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
