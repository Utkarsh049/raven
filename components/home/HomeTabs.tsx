"use client";

import { useState } from "react";
import Link from "next/link";
import { PinnedList } from "@/components/pins/PinnedList";

type YearItem = { slug: string; title: string; href: string; subjects: Array<{ slug: string; title: string; href: string }> };

export function HomeTabs({ years }: { years: YearItem[] }) {
  const [tab, setTab] = useState<"home" | "pinned">("home");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-8 sm:px-6">
      <div className="flex gap-2 border-b">
        <button
          type="button"
          onClick={() => setTab("home")}
          className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${tab === "home" ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Home
        </button>
        <button
          type="button"
          onClick={() => setTab("pinned")}
          className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${tab === "pinned" ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Pinned
        </button>
      </div>

      {tab === "home" ? (
        <div className="mt-6">
          {years.length === 0 ? (
            <p className="text-sm text-muted-foreground">No published years yet.</p>
          ) : (
            <ul className="grid gap-6">
              {years.map((y) => (
                <li key={y.href}>
                  <Link href={y.href} className="text-base font-semibold hover:underline">
                    {y.title}
                  </Link>
                  {y.subjects.length > 0 ? (
                    <ul className="mt-2 grid gap-1.5">
                      {y.subjects.map((s) => (
                        <li key={s.href}>
                          <Link href={s.href} className="text-sm text-muted-foreground hover:text-foreground hover:underline">
                            {s.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">No subjects</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="mt-6">
          <p className="mb-4 text-sm text-muted-foreground">Your pinned chapters — available offline.</p>
          <PinnedList />
        </div>
      )}
    </div>
  );
}
