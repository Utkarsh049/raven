"use client";

import { useState } from "react";
import Link from "next/link";
import { PinnedList } from "@/components/pins/PinnedList";

type YearItem = { slug: string; title: string; href: string; subjects: Array<{ slug: string; title: string; href: string }> };

export function HomeTabs({ years }: { years: YearItem[] }) {
  const [tab, setTab] = useState<"home" | "pinned">("home");

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex gap-1 rounded-full bg-muted p-1 w-fit">
        <button
          type="button"
          onClick={() => setTab("home")}
          className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${tab === "home" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          Home
        </button>
        <button
          type="button"
          onClick={() => setTab("pinned")}
          className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${tab === "pinned" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          Pinned
        </button>
      </div>

      {tab === "home" ? (
        <div className="mt-6 sm:mt-8">
          {years.length === 0 ? (
            <p className="text-sm text-muted-foreground">No published years yet.</p>
          ) : (
            <div className="grid gap-6 sm:gap-8">
              {years.map((y) => (
                <section key={y.href} className="rounded-2xl border bg-card p-4 sm:p-6">
                  <Link href={y.href} className="inline-flex items-center gap-2 text-lg sm:text-xl font-bold hover:underline">
                    {y.title}
                    <span className="text-muted-foreground">→</span>
                  </Link>
                  {y.subjects.length > 0 ? (
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {y.subjects.map((s) => (
                        <Link
                          key={s.href}
                          href={s.href}
                          className="group flex min-h-[88px] sm:min-h-[110px] flex-col justify-between rounded-xl border bg-background p-4 sm:p-5 shadow-sm transition-colors hover:bg-accent hover:border-accent-foreground/10 active:scale-[0.99]"
                        >
                          <span className="text-sm sm:text-[15px] font-semibold leading-tight line-clamp-2">{s.title}</span>
                          <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground group-hover:text-foreground">
                            Open <span aria-hidden>→</span>
                          </span>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">No subjects</p>
                  )}
                </section>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-6 sm:mt-8">
          <p className="mb-4 text-sm text-muted-foreground">Your pinned chapters — available offline.</p>
          <PinnedList />
        </div>
      )}
    </div>
  );
}
