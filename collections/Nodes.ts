import type { CollectionConfig } from "payload";
import { compileMarkdownToHtml } from "../lib/markdown";
import { resolveChapterPath } from "../lib/taxonomy";

function parentIdOf(v: unknown): string | null {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (typeof v === "object" && v !== null && "id" in (v as Record<string, unknown>)) {
    const id = (v as { id?: unknown }).id;
    return typeof id === "string" || typeof id === "number" ? String(id) : null;
  }
  return null;
}

async function findDescendantPublishedChapterIds(
  payload: { find: (args: never) => Promise<{ docs: Array<{ id: string; type: string; status: string; parent: unknown }> }> },
  ancestorId: string,
): Promise<string[]> {
  const res = await payload.find({
    collection: "nodes",
    pagination: false,
    depth: 0,
    select: { id: true, type: true, status: true, parent: true },
  } as never);
  const docs = (res.docs ?? []) as Array<{ id: string; type: string; status: string; parent: unknown }>;
  const byParent = new Map<string, string[]>();
  for (const d of docs) {
    const pid = parentIdOf(d.parent);
    if (!pid) continue;
    if (!byParent.has(pid)) byParent.set(pid, []);
    byParent.get(pid)!.push(String(d.id));
  }
  const descendantIds = new Set<string>();
  const stack = [...(byParent.get(String(ancestorId)) ?? [])];
  const seen = new Set<string>([String(ancestorId)]);
  while (stack.length) {
    const cur = stack.pop()!;
    if (seen.has(cur)) continue;
    seen.add(cur);
    descendantIds.add(cur);
    const kids = byParent.get(cur);
    if (kids) stack.push(...kids);
  }
  const out: string[] = [];
  for (const id of descendantIds) {
    const doc = docs.find((d) => String(d.id) === id);
    if (doc && (doc.type === "chapter" || doc.type === "topic") && doc.status === "published") out.push(id);
  }
  return out;
}

export const Nodes: CollectionConfig = {
  slug: "nodes",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "type", "slug", "status", "orderIndex"],
    group: "Taxonomy",
  },
  access: {
    read: ({ req }) => {
      if (req.user) return true;
      return { status: { equals: "published" } } as never;
    },
  },
  hooks: {
    beforeChange: [
      ({ data }) => {
        const blocks = (data as { blocks?: Array<{ blockType?: string; content?: string; compiledHtml?: string }> })?.blocks;
        if (!Array.isArray(blocks)) return data;
        for (const b of blocks) {
          if ((b as { blockType?: string }).blockType === "markdown") {
            const content = String((b as { content?: string }).content ?? "");
            (b as { compiledHtml: string }).compiledHtml = compileMarkdownToHtml(content);
          }
        }
        return data;
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, req }) => {
        try {
          const { revalidatePath } = await import("next/cache");
          const docStatus = (doc as { status?: string })?.status;
          const docType = (doc as { type?: string })?.type;
          const prevStatus = (previousDoc as { status?: string } | undefined)?.status;
          const prevType = (previousDoc as { type?: string } | undefined)?.type;
          const docId = String((doc as { id: string | number }).id);
          const prevId = previousDoc ? String((previousDoc as { id: string | number }).id) : null;
          const isChapterLike = (t?: string) => t === "chapter" || t === "topic";
          const isAncestorLike = (t?: string) => t === "branch" || t === "year" || t === "subject";

          try {
            const { writeSearchIndex } = await import("../lib/search");
            await writeSearchIndex(req.payload as never);
          } catch { }

          if (isChapterLike(docType) || (previousDoc && isChapterLike(prevType))) {
            const newPath = docStatus === "published" && isChapterLike(docType) ? await resolveChapterPath(req.payload as never, docId) : null;
            let oldPath: string | null = null;
            if (prevId && prevStatus === "published" && isChapterLike(prevType)) {
              if (prevId === docId) {
                const prevSlug = (previousDoc as { slug?: string })?.slug;
                const newSlug = (doc as { slug?: string })?.slug;
                const prevParent = parentIdOf((previousDoc as { parent?: unknown })?.parent);
                const newParent = parentIdOf((doc as { parent?: unknown })?.parent);
                if ((prevSlug && newSlug && prevSlug !== newSlug) || prevParent !== newParent) {
                  const chain: Array<{ slug: string; type: string; parent: unknown; id: string }> = [];
                  let cid: string | null = prevId;
                  const seen = new Set<string>();
                  for (let i = 0; i < 12 && cid; i++) {
                    if (seen.has(cid)) break;
                    seen.add(cid);
                    let n: { id: string; slug: string; type: string; parent: unknown } | null = null;
                    if (cid === prevId) {
                      n = { id: prevId, slug: String(prevSlug), type: String(prevType), parent: (previousDoc as { parent: unknown }).parent };
                    } else {
                      const r = await req.payload.find({ collection: "nodes", where: { id: { equals: cid } }, limit: 1, depth: 0, pagination: false } as never);
                      n = (r.docs?.[0] as unknown as typeof n) ?? null;
                    }
                    if (!n) break;
                    chain.unshift(n);
                    cid = parentIdOf(n.parent);
                  }
                  const m = new Map(chain.map((x) => [x.type, x.slug] as const));
                  const b = m.get("branch");
                  const y = m.get("year");
                  const s = m.get("subject");
                  const c = chain.find((x) => x.type === "chapter")?.slug;
                  if (b && y && s && c) oldPath = `/${b}/${y}/${s}/${c}`;
                  else oldPath = await resolveChapterPath(req.payload as never, prevId);
                } else {
                  oldPath = await resolveChapterPath(req.payload as never, prevId);
                }
              } else {
                oldPath = await resolveChapterPath(req.payload as never, prevId);
              }
            }
            if (newPath) revalidatePath(newPath);
            if (oldPath && oldPath !== newPath) revalidatePath(oldPath);
            if (!newPath && oldPath) revalidatePath(oldPath);
          }

          if (isAncestorLike(docType) || (previousDoc && isAncestorLike(prevType))) {
            const slugChanged = previousDoc && (previousDoc as { slug?: string }).slug !== (doc as { slug?: string }).slug;
            const parentChanged = previousDoc && parentIdOf((previousDoc as { parent?: unknown }).parent) !== parentIdOf((doc as { parent?: unknown }).parent);
            const statusChanged = prevStatus !== docStatus;
            if (docStatus === "published" || prevStatus === "published" || slugChanged || parentChanged || statusChanged) {
              revalidatePath("/");
              const descendantIds = await findDescendantPublishedChapterIds(req.payload as never, docId);
              for (const cid of descendantIds) {
                const p = await resolveChapterPath(req.payload as never, cid);
                if (p) {
                  revalidatePath(p);
                  // Also revalidate ancestor listings along this chapter path
                  const segments = p.split("/").filter(Boolean);
                  if (segments[0]) revalidatePath(`/${segments[0]}`);
                  if (segments[0] && segments[1]) revalidatePath(`/${segments[0]}/${segments[1]}`);
                  if (segments[0] && segments[1] && segments[2]) revalidatePath(`/${segments[0]}/${segments[1]}/${segments[2]}`);
                }
              }
              if (slugChanged && previousDoc) {
                const prevSlug = String((previousDoc as { slug: string }).slug);
                const newSlug = String((doc as { slug: string }).slug);
                const prevTypeStr = String((previousDoc as { type: string }).type);
                const segIndex: Record<string, number> = { branch: 1, year: 2, subject: 3 };
                const idx = segIndex[prevTypeStr];
                if (idx) {
                  for (const cid of descendantIds) {
                    const newP = await resolveChapterPath(req.payload as never, cid);
                    if (!newP) continue;
                    const parts = newP.split("/");
                    if (parts[idx] === newSlug) {
                      const oldP = [...parts];
                      oldP[idx] = prevSlug;
                      const oldPathStr = oldP.join("/");
                      revalidatePath(oldPathStr);
                      const oldSegs = oldPathStr.split("/").filter(Boolean);
                      if (oldSegs[0]) revalidatePath(`/${oldSegs[0]}`);
                      if (oldSegs[0] && oldSegs[1]) revalidatePath(`/${oldSegs[0]}/${oldSegs[1]}`);
                      if (oldSegs[0] && oldSegs[1] && oldSegs[2]) revalidatePath(`/${oldSegs[0]}/${oldSegs[1]}/${oldSegs[2]}`);
                    }
                  }
                }
              }
            }
          }
        } catch { }
      },
    ],
    afterDelete: [
      async ({ doc, req }) => {
        try {
          const { writeSearchIndex } = await import("../lib/search");
          await writeSearchIndex(req.payload as never);
        } catch { }
        try {
          const { revalidatePath } = await import("next/cache");
          const docType = (doc as { type?: string })?.type;
          const docStatus = (doc as { status?: string })?.status;
          const docId = String((doc as { id: string | number }).id);
          const isChapterLike = (t?: string) => t === "chapter" || t === "topic";
          const isAncestorLike = (t?: string) => t === "branch" || t === "year" || t === "subject";
          if (isChapterLike(docType) && docStatus === "published") {
            const chain: Array<{ slug: string; type: string; parent: unknown; id: string }> = [];
            let curId: string | null = docId;
            const seen = new Set<string>();
            for (let i = 0; i < 12 && curId; i++) {
              if (seen.has(curId)) break;
              seen.add(curId);
              let node: { id: string; slug: string; type: string; parent: unknown } | null = null;
              if (curId === docId) node = { id: docId, slug: String((doc as { slug: string }).slug), type: String(docType), parent: (doc as { parent: unknown }).parent };
              else {
                const res = await req.payload.find({ collection: "nodes", where: { id: { equals: curId } }, limit: 1, depth: 0, pagination: false } as never);
                node = (res.docs?.[0] as unknown as typeof node) ?? null;
              }
              if (!node) break;
              chain.unshift(node);
              curId = parentIdOf(node.parent);
            }
            const m = new Map(chain.map((n) => [n.type, n.slug] as const));
            const b = m.get("branch");
            const y = m.get("year");
            const s = m.get("subject");
            const c = chain.find((n) => n.type === "chapter")?.slug;
            if (b && y && s && c) revalidatePath(`/${b}/${y}/${s}/${c}`);
          }
          if (isAncestorLike(docType)) {
            const deletedSlug = String((doc as { slug: string }).slug);
            const resAll = await req.payload.find({ collection: "nodes", pagination: false, depth: 0, where: { type: { equals: "chapter" }, status: { equals: "published" } } } as never);
            for (const ch of (resAll.docs ?? []) as Array<{ id: string | number }>) {
              const cid = String((ch as { id: string | number }).id);
              const p = await resolveChapterPath(req.payload as never, cid);
              if (!p) {
                let cur: string | null = cid;
                let isDesc = false;
                const seen2 = new Set<string>();
                for (let i = 0; i < 12 && cur; i++) {
                  if (seen2.has(cur)) break;
                  seen2.add(cur);
                  if (cur === docId) { isDesc = true; break; }
                  const r = await req.payload.find({ collection: "nodes", where: { id: { equals: cur } }, limit: 1, depth: 0, pagination: false } as never);
                  const n = r.docs?.[0] as { parent?: unknown } | undefined;
                  if (!n) break;
                  cur = parentIdOf(n.parent);
                }
                if (isDesc) {
                  const chain2: Array<{ slug: string; type: string; parent: unknown; id: string }> = [];
                  let cid2: string | null = cid;
                  const seen3 = new Set<string>();
                  for (let i = 0; i < 12 && cid2; i++) {
                    if (seen3.has(cid2)) break;
                    seen3.add(cid2);
                    let n2: { id: string; slug: string; type: string; parent: unknown } | null = null;
                    if (cid2 === docId) n2 = { id: docId, slug: deletedSlug, type: String(docType), parent: (doc as { parent: unknown }).parent };
                    else {
                      const r2 = await req.payload.find({ collection: "nodes", where: { id: { equals: cid2 } }, limit: 1, depth: 0, pagination: false } as never);
                      n2 = (r2.docs?.[0] as unknown as typeof n2) ?? null;
                    }
                    if (!n2) break;
                    chain2.unshift(n2);
                    cid2 = parentIdOf(n2.parent);
                  }
                  const m2 = new Map(chain2.map((x) => [x.type, x.slug] as const));
                  const b2 = m2.get("branch");
                  const y2 = m2.get("year");
                  const s2 = m2.get("subject");
                  const c2 = chain2.find((x) => x.type === "chapter")?.slug;
                  if (b2 && y2 && s2 && c2) revalidatePath(`/${b2}/${y2}/${s2}/${c2}`);
                }
              }
            }
          }
        } catch { }
      },
    ],
  },
  fields: [
    { name: "title", type: "text", required: true },
    {
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      admin: { description: "URL-safe identifier, e.g. organic-chemistry" },
      validate: (val: unknown) => {
        if (typeof val !== "string" || !val) return true;
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(val)) return "Slug must be lowercase alphanumeric with hyphens";
        return true;
      },
    },
    {
      name: "type",
      type: "select",
      required: true,
      options: [
        { label: "Branch", value: "branch" },
        { label: "Year", value: "year" },
        { label: "Subject", value: "subject" },
        { label: "Chapter", value: "chapter" },
        { label: "Topic", value: "topic" },
      ],
    },
    {
      name: "parent",
      type: "relationship",
      relationTo: "nodes",
      hasMany: false,
      admin: { description: "Parent node in Branch → Year → Subject → Chapter → Topic" },
    },
    {
      name: "orderIndex",
      type: "number",
      required: true,
      defaultValue: 0,
      admin: { description: "Position among siblings, updated via drag-and-drop" },
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "draft",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Published", value: "published" },
      ],
    },
    {
      name: "blocks",
      type: "json",
      defaultValue: [],
      admin: {
        components: {
          Field: "@/components/admin/ChapterSplitView#ChapterSplitView",
        },
      },
    },
  ],
};
