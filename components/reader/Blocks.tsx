export type ReaderBlock =
  | { blockType: "markdown"; id?: string; content: string; compiledHtml?: string }
  | { blockType: "image"; id?: string; url: string; alt: string; caption?: string }
  | { blockType: "youtube"; id?: string; videoId: string; title: string };

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

export function MarkdownBlock({ content, compiledHtml }: { content: string; compiledHtml?: string }) {
  const html = compiledHtml?.trim() ? compiledHtml : fallbackHtml(content);
  return <div className="prose prose-zinc max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: html }} />;
}

function fallbackHtml(text: string) {
  const esc = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const paras = esc
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
  return paras || "<p></p>";
}

export function ImageBlock({ url, alt, caption }: { url: string; alt: string; caption?: string }) {
  return (
    <figure className="overflow-hidden rounded-lg border">
      <img src={url} alt={alt} className="w-full object-cover" loading="lazy" />
      {(caption || alt) && <figcaption className="bg-muted/30 px-3 py-2 text-xs text-muted-foreground">{caption || alt}</figcaption>}
    </figure>
  );
}

export function YoutubeBlock({ videoId, title }: { videoId: string; title: string }) {
  const id = extractYoutubeId(videoId);
  const thumb = /^[a-zA-Z0-9_-]{11}$/.test(id) ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : "";
  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="relative aspect-video bg-zinc-900">
        {thumb ? <img src={thumb} alt={title} className="h-full w-full object-cover" loading="lazy" /> : <div className="grid h-full place-items-center text-sm text-zinc-400">Invalid YouTube ID</div>}
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/20">
          <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-zinc-900">▶</span>
        </div>
      </div>
      <div className="bg-muted/30 px-3 py-2 text-xs">
        <span className="font-medium">{title || "Video"}</span>
      </div>
    </div>
  );
}

export function BlockRenderer({ blocks }: { blocks: ReaderBlock[] }) {
  if (!blocks?.length) return <p className="text-sm text-muted-foreground">No content yet.</p>;
  return (
    <div className="space-y-6">
      {blocks.map((b, i) => (
        <div key={(b as { id?: string }).id ?? `${b.blockType}-${i}`}>
          {b.blockType === "markdown" && <MarkdownBlock content={(b as { content: string }).content} compiledHtml={(b as { compiledHtml?: string }).compiledHtml} />}
          {b.blockType === "image" && <ImageBlock url={(b as { url: string }).url} alt={(b as { alt: string }).alt} caption={(b as { caption?: string }).caption} />}
          {b.blockType === "youtube" && <YoutubeBlock videoId={(b as { videoId: string }).videoId} title={(b as { title: string }).title} />}
        </div>
      ))}
    </div>
  );
}
