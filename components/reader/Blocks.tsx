"use client";

import { useState } from "react";
import { compileMarkdownToHtml } from "@/lib/markdown";

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

function sanitizeHtml(dirty: string): string {
  let html = String(dirty ?? "");
  // Strip script/style/iframe and their content (case-insensitive)
  html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script\s*>/gi, "");
  html = html.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style\s*>/gi, "");
  html = html.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe\s*>/gi, "");
  // Remove on* event handler attributes (onclick, onerror, etc.)
  html = html.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'`>]+)/gi, "");
  // Neutralize javascript:, data:, vbscript: urls in href/src attributes
  // Replace the attribute value with "#" to keep tag structure but remove dangerous scheme
  html = html.replace(/\s+href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'`>]+))/gi, (match, dq, sq, bare) => {
    const val = (dq ?? sq ?? bare ?? "").trim();
    const lower = val.toLowerCase().replace(/\s/g, "");
    if (lower.startsWith("javascript:") || lower.startsWith("data:") || lower.startsWith("vbscript:")) {
      return ' href="#"';
    }
    return match;
  });
  html = html.replace(/\s+src\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'`>]+))/gi, (match, dq, sq, bare) => {
    const val = (dq ?? sq ?? bare ?? "").trim();
    const lower = val.toLowerCase().replace(/\s/g, "");
    if (lower.startsWith("javascript:") || lower.startsWith("data:") || lower.startsWith("vbscript:")) {
      return ' src="#"';
    }
    return match;
  });
  // Remove any remaining javascript:/data:/vbscript: references that might be obfuscated
  html = html.replace(/javascript\s*:/gi, "");
  html = html.replace(/vbscript\s*:/gi, "");
  // Allowlist of safe tags
  const allowed = new Set(["p", "h1", "h2", "h3", "ul", "ol", "li", "blockquote", "pre", "code", "strong", "em", "a", "br", "hr"]);
  html = html.replace(/<\/?([a-zA-Z0-9]+)(\s[^>]*)?>/g, (match, tagName, attrs) => {
    const tag = String(tagName).toLowerCase();
    if (!allowed.has(tag)) return "";
    const isClosing = match.startsWith("</");
    if (isClosing) return `</${tag}>`;
    if (tag === "br" || tag === "hr") return `<${tag}>`;
    if (tag === "a") {
      // Only preserve safe href on <a>
      const hrefMatch = attrs ? String(attrs).match(/\shref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'`>]+))/i) : null;
      let href = hrefMatch ? (hrefMatch[1] ?? hrefMatch[2] ?? hrefMatch[3] ?? "") : "";
      href = href.trim();
      const lower = href.toLowerCase();
      if (!href || lower.startsWith("javascript:") || lower.startsWith("data:") || lower.startsWith("vbscript:")) {
        return `<a>`;
      }
      // Escape double quotes in href
      const escHref = href.replace(/"/g, "&quot;");
      return `<a href="${escHref}">`;
    }
    // Strip all attributes from other allowed tags
    return `<${tag}>`;
  });
  return html;
}

export function MarkdownBlock({ content, compiledHtml }: { content: string; compiledHtml?: string }) {
  // For live preview always recompute from current content to avoid stale compiledHtml.
  // For published display where content is empty/missing, fall back to sanitized compiledHtml.
  const raw =
    content != null && String(content).trim()
      ? compileMarkdownToHtml(content)
      : compiledHtml?.trim()
        ? compiledHtml
        : fallbackHtml(content ?? "");
  const html = sanitizeHtml(raw);
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
  const hasUrl = Boolean(url && url.trim());

  if (!hasUrl) {
    return (
      <figure className="overflow-hidden rounded-lg border border-dashed border-border p-5 text-center text-xs text-muted-foreground bg-muted/10">
        <p className="font-medium">Image block (no URL set yet)</p>
        {(caption || alt) && <figcaption className="mt-1 text-[11px] text-muted-foreground">{caption || alt}</figcaption>}
      </figure>
    );
  }

  return (
    <figure className="overflow-hidden rounded-lg border">
      <img src={url} alt={alt || ""} className="w-full object-cover" loading="lazy" />
      {(caption || alt) && <figcaption className="bg-muted/30 px-3 py-2 text-xs text-muted-foreground">{caption || alt}</figcaption>}
    </figure>
  );
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
        {thumb ? <img src={thumb} alt={title} className="h-full w-full object-cover" loading="lazy" /> : <div className="grid h-full place-items-center text-sm text-zinc-400">Invalid YouTube ID</div>}
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
