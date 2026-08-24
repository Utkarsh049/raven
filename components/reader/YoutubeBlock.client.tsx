"use client";

import Image from "next/image";
import { useState } from "react";

function extractYoutubeId(input: string) {
  const s = String(input ?? "").trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
  try {
    const u = new URL(s);
    if (u.hostname.includes("youtu.be")) {
      const seg = u.pathname.split("/").filter(Boolean)[0];
      if (seg && /^[a-zA-Z0-9_-]{11}$/.test(seg)) return seg;
    }
    const v = u.searchParams.get("v");
    if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
  } catch {}
  return s;
}

export function YoutubeBlock({ videoId, title }: { videoId: string; title: string }) {
  const [playing, setPlaying] = useState(false);
  const id = extractYoutubeId(videoId);
  const isValid = /^[a-zA-Z0-9_-]{11}$/.test(id);
  const thumb = isValid ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : "";

  if (playing && isValid) {
    return (
      <div className="overflow-hidden rounded-lg border">
        <div className="relative aspect-video bg-zinc-900">
          <iframe
            src={`https://www.youtube.com/embed/${id}?autoplay=1`}
            title={title || "Video"}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        <div className="bg-muted/30 px-3 py-2 text-xs">
          <span className="font-medium">{title || "Video"}</span>
          <a href={`https://www.youtube.com/watch?v=${id}`} target="_blank" rel="noopener noreferrer" className="ml-2 text-muted-foreground underline">
            Open on YouTube
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <button
        type="button"
        onClick={() => {
          if (isValid) setPlaying(true);
        }}
        className="relative flex aspect-video w-full items-center justify-center bg-zinc-900 text-left"
        aria-label={isValid ? `Play ${title || "video"}` : "Invalid YouTube ID"}
      >
        {thumb ? (
          <Image src={thumb} alt={title || "YouTube thumbnail"} fill sizes="(max-width: 768px) 100vw, 672px" className="object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-sm text-zinc-400">Invalid YouTube ID</div>
        )}
        {isValid && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/20">
            <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-zinc-900">▶</span>
          </div>
        )}
      </button>
      <div className="bg-muted/30 px-3 py-2 text-xs">
        <span className="font-medium">{title || "Video"}</span>
        {isValid && (
          <a href={`https://www.youtube.com/watch?v=${id}`} target="_blank" rel="noopener noreferrer" className="ml-2 text-muted-foreground underline">
            Open on YouTube
          </a>
        )}
      </div>
    </div>
  );
}
