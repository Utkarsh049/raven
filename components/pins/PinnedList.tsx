"use client";

import Link from "next/link";
import { usePinsStore } from "@/lib/pins-store";

export function PinnedList() {
  const pins = usePinsStore((s) => s.pins);
  const hydrated = usePinsStore((s) => s.hydrated);

  if (!hydrated) return <p className="text-sm text-muted-foreground">Loading pins…</p>;
  if (pins.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center">
        <p className="text-sm font-medium">No pinned items yet</p>
        <p className="mt-1 text-xs text-muted-foreground">Pin a chapter to see it here — works offline.</p>
      </div>
    );
  }

  return (
    <ul className="grid gap-2">
      {pins.map((p) => (
        <li key={p.id} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
          <div className="min-w-0 flex-1">
            <Link href={p.href} className="block truncate text-sm font-medium hover:underline">
              {p.title}
            </Link>
            <span className="text-xs text-muted-foreground capitalize">
              {p.kind} · {p.href}
            </span>
          </div>
          <Link href={p.href} className="shrink-0 rounded-md border px-2 py-1 text-xs hover:bg-accent">
            Open
          </Link>
        </li>
      ))}
    </ul>
  );
}
