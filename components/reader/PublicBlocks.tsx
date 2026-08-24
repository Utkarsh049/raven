import * as React from "react";
import Image from "next/image";
import { YoutubeBlock } from "./YoutubeBlock.client";

export type ReaderBlock =
  | { blockType: "markdown"; id?: string; content: string; compiledHtml?: string }
  | { blockType: "image"; id?: string; url: string; alt: string; caption?: string }
  | { blockType: "youtube"; id?: string; videoId: string; title: string };

function sanitizeHtml(dirty: string): string {
  let html = String(dirty ?? "");
  html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script\s*>/gi, "");
  html = html.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style\s*>/gi, "");
  html = html.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe\s*>/gi, "");
  html = html.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'`>]+)/gi, "");
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
  html = html.replace(/javascript\s*:/gi, "");
  html = html.replace(/vbscript\s*:/gi, "");
  const allowed = new Set(["p", "h1", "h2", "h3", "ul", "ol", "li", "blockquote", "pre", "code", "strong", "em", "a", "br", "hr"]);
  html = html.replace(/<\/?([a-zA-Z0-9]+)(\s[^>]*)?>/g, (match, tagName, attrs) => {
    const tag = String(tagName).toLowerCase();
    if (!allowed.has(tag)) return "";
    const isClosing = match.startsWith("</");
    if (isClosing) return `</${tag}>`;
    if (tag === "br" || tag === "hr") return `<${tag}>`;
    if (tag === "a") {
      const hrefMatch = attrs ? String(attrs).match(/\shref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'`>]+))/i) : null;
      let href = hrefMatch ? (hrefMatch[1] ?? hrefMatch[2] ?? hrefMatch[3] ?? "") : "";
      href = href.trim();
      const lower = href.toLowerCase();
      if (!href || lower.startsWith("javascript:") || lower.startsWith("data:") || lower.startsWith("vbscript:")) {
        return `<a>`;
      }
      const escHref = href.replace(/"/g, "&quot;");
      return `<a href="${escHref}">`;
    }
    return `<${tag}>`;
  });
  return html;
}

export function PublicMarkdownBlock({ compiledHtml }: { compiledHtml?: string }) {
  const html = sanitizeHtml(compiledHtml ?? "");
  if (!html.trim()) return null;
  return <div className="prose prose-zinc max-w-none dark:prose-invert prose-p:break-words prose-a:break-words prose-pre:overflow-x-auto prose-pre:max-w-full text-[15px] leading-7 sm:text-base prose-a:underline-offset-4 prose-a:focus-visible:outline-none prose-a:focus-visible:ring-2 prose-a:focus-visible:ring-ring" dangerouslySetInnerHTML={{ __html: html }} />;
}

const TINY_BLUR = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

export function PublicImageBlock({ url, alt, caption, priority }: { url: string; alt: string; caption?: string; priority?: boolean }) {
  const hasUrl = Boolean(url && url.trim());
  if (!hasUrl) {
    return (
      <figure className="overflow-hidden rounded-lg border border-dashed border-border p-5 text-center text-xs text-muted-foreground bg-muted/10">
        <p className="font-medium">Image block (no URL set yet)</p>
        {(caption || alt) && <figcaption className="mt-1 text-[11px] text-muted-foreground">{caption || alt}</figcaption>}
      </figure>
    );
  }
  const [imgError, setImgError] = React.useState(false);
  if (imgError) {
    return (
      <figure className="overflow-hidden rounded-lg border border-dashed bg-muted/10 p-5 text-center">
        <p className="text-xs text-muted-foreground">Image failed to load</p>
        <a href={url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs underline">
          Open image
        </a>
        {alt && <figcaption className="mt-2 text-xs text-muted-foreground">{alt}</figcaption>}
      </figure>
    );
  }
  return (
    <figure className="overflow-hidden rounded-lg border bg-muted/10">
      <div className="relative w-full aspect-[16/10]">
        <Image
          src={url}
          alt={alt || ""}
          fill
          sizes="(max-width: 768px) 100vw, 672px"
          className="object-cover"
          priority={Boolean(priority)}
          placeholder="blur"
          blurDataURL={TINY_BLUR}
          onError={() => setImgError(true)}
        />
      </div>
      {(caption || alt) && <figcaption className="bg-muted/30 px-3 py-2 text-xs text-muted-foreground">{caption || alt}</figcaption>}
    </figure>
  );
}

export function PublicBlockRenderer({ blocks }: { blocks: ReaderBlock[] }) {
  const visible = (blocks ?? []).filter((b) => {
    if (b.blockType === "markdown") return Boolean(String((b as { compiledHtml?: string }).compiledHtml ?? (b as { content?: string }).content ?? "").trim());
    if (b.blockType === "image") return Boolean(String((b as { url?: string }).url ?? "").trim());
    if (b.blockType === "youtube") return Boolean(String((b as { videoId?: string }).videoId ?? "").trim());
    return true;
  });
  if (!visible.length) return <p className="text-sm text-muted-foreground">No content yet.</p>;
  const firstImageIndex = visible.findIndex((b) => b.blockType === "image" && Boolean((b as { url?: string }).url?.trim()));
  return (
    <div className="space-y-6">
      {visible.map((b, i) => (
        <div key={(b as { id?: string }).id ?? `${b.blockType}-${i}`}>
          {b.blockType === "markdown" && <PublicMarkdownBlock compiledHtml={(b as { compiledHtml?: string }).compiledHtml} />}
          {b.blockType === "image" && <PublicImageBlock url={(b as { url: string }).url} alt={(b as { alt: string }).alt} caption={(b as { caption?: string }).caption} priority={i === firstImageIndex} />}
          {b.blockType === "youtube" && <YoutubeBlock videoId={(b as { videoId: string }).videoId} title={(b as { title: string }).title} />}
        </div>
      ))}
    </div>
  );
}
