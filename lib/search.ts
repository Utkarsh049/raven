import type { Payload } from "payload";

export type SearchDoc = {
  id: string;
  title: string;
  slug: string;
  type: string;
  href: string | null;
  excerpt: string;
};

function parentIdOf(v: unknown): string | null {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (typeof v === "object" && v !== null && "id" in (v as Record<string, unknown>)) {
    const id = (v as { id?: unknown }).id;
    return typeof id === "string" || typeof id === "number" ? String(id) : null;
  }
  return null;
}

function excerptFromBlocks(blocks: unknown): string {
  if (!Array.isArray(blocks)) return "";
  const parts: string[] = [];
  for (const b of blocks as Array<Record<string, unknown>>) {
    if (b.blockType === "markdown") {
      const t = String((b.compiledHtml as string) ?? b.content ?? "");
      const plain = t.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (plain) parts.push(plain);
    } else if (b.blockType === "image") {
      const cap = String((b.caption as string) ?? b.alt ?? "").trim();
      if (cap) parts.push(cap);
    } else if (b.blockType === "youtube") {
      const yt = String((b.title as string) ?? "").trim();
      if (yt) parts.push(yt);
    }
    if (parts.join(" ").length > 600) break;
  }
  return parts.join(" ").slice(0, 600);
}

export async function buildSearchIndex(payload: Payload): Promise<SearchDoc[]> {
  const res = await payload.find({
    collection: "nodes",
    pagination: false,
    depth: 0,
    overrideAccess: false,
    select: { title: true, slug: true, type: true, status: true, parent: true, blocks: true },
  } as never);

  const docs = (res.docs ?? []) as Array<{
    id: string | number;
    title: string;
    slug: string;
    type: string;
    status: string;
    parent: unknown;
    blocks?: unknown;
  }>;

  const byId = new Map<string, (typeof docs)[number]>();
  for (const d of docs) byId.set(String(d.id), d);

  const out: SearchDoc[] = [];
  for (const d of docs) {
    if (d.status !== "published") continue;
    if (d.type !== "chapter" && d.type !== "subject" && d.type !== "topic") continue;
    let href: string | null = null;
    if (d.type === "chapter" || d.type === "topic") {
      const chain: Array<{ slug: string; type: string; parent: unknown; id: string }> = [];
      let curId: string | null = String(d.id);
      const seen = new Set<string>();
      for (let i = 0; i < 12 && curId; i++) {
        if (seen.has(curId)) break;
        seen.add(curId);
        const node = byId.get(curId);
        if (!node) break;
        chain.unshift({ id: curId, slug: node.slug, type: node.type, parent: node.parent });
        curId = parentIdOf(node.parent);
      }
      const m = new Map(chain.map((n) => [n.type, n.slug] as const));
      const b = m.get("branch");
      const y = m.get("year");
      const s = m.get("subject");
      const c = chain.find((n) => n.type === "chapter")?.slug;
      if (b && y && s && c) href = `/${b}/${y}/${s}/${c}`;
    }
    out.push({
      id: String(d.id),
      title: String(d.title ?? ""),
      slug: String(d.slug ?? ""),
      type: String(d.type),
      href,
      excerpt: excerptFromBlocks(d.blocks),
    });
  }
  return out;
}

export async function writeSearchIndex(payload: Payload) {
  const docs = await buildSearchIndex(payload as never);
  const json = JSON.stringify(docs);
  try {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const outPath = path.join(process.cwd(), "public", "search-index.json");
    await fs.writeFile(outPath, json, "utf-8");
  } catch {}
  return docs;
}
