"use client";

import { usePinsStore } from "@/lib/pins-store";

export function PinButton({ id, href, title, kind }: { id: string; href: string; title: string; kind: "subject" | "chapter" }) {
  const toggle = usePinsStore((s) => s.toggle);
  const hydrated = usePinsStore((s) => s.hydrated);
  const pinned = usePinsStore((s) => s.pins.some((p) => p.id === id));

  if (!hydrated) {
    return (
      <button
        type="button"
        disabled
        aria-label="Pin"
        className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm font-medium bg-background opacity-60"
      >
        <span aria-hidden>☆</span> Pin
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => toggle({ id, href, title, kind })}
      aria-pressed={pinned}
      aria-label={pinned ? "Unpin" : "Pin"}
      className={`inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm font-medium ${pinned ? "bg-foreground text-background border-foreground" : "bg-background hover:bg-accent"}`}
    >
      <span aria-hidden>{pinned ? "★" : "☆"}</span>
      {pinned ? "Pinned" : "Pin"}
    </button>
  );
}
