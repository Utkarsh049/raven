import config from "@payload-config";
import { getPayload } from "payload";
import { notFound } from "next/navigation";

type Params = { branch: string; year: string; subject: string; chapter: string };

export const dynamicParams = true;

export async function generateStaticParams(): Promise<Params[]> {
  try {
    const payload = await getPayload({ config });
    const res = await payload.find({
      collection: "nodes",
      pagination: false,
      depth: 0,
      select: { slug: true, type: true, parent: true, status: true },
      overrideAccess: false,
    });
    const docs = (res.docs ?? []) as Array<{ id: string | number; slug: string; type: string; parent: unknown; status: string }>;
    const byId = new Map<string, (typeof docs)[number]>();
    for (const d of docs) byId.set(String(d.id), d);
    const parentIdOf = (v: unknown): string | null => {
      if (!v) return null;
      if (typeof v === "string") return v;
      if (typeof v === "object" && v !== null && "id" in (v as Record<string, unknown>)) {
        const id = (v as { id?: unknown }).id;
        return typeof id === "string" || typeof id === "number" ? String(id) : null;
      }
      return null;
    };
    const params: Params[] = [];
    for (const doc of docs) {
      if (doc.type !== "chapter" || doc.status !== "published") continue;
      const chain: Array<{ slug: string; type: string; parent: unknown; id: string }> = [];
      let curId: string | null = String(doc.id);
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
      const branch = m.get("branch");
      const year = m.get("year");
      const subject = m.get("subject");
      const chapter = chain.find((n) => n.type === "chapter")?.slug;
      if (branch && year && subject && chapter) params.push({ branch, year, subject, chapter });
    }
    return params;
  } catch {
    return [];
  }
}

export default async function ChapterPage({ params }: { params: Promise<Params> }) {
  const { branch, year, subject, chapter } = await params;

  const payload = await getPayload({ config });

  const resolve = async (slug: string, type: string, parentId?: string | number) => {
    const res = await payload.find({
      collection: "nodes",
      overrideAccess: false,
      where: {
        slug: { equals: slug },
        type: { equals: type },
        ...(parentId ? { parent: { equals: parentId } } : {}),
        status: { equals: "published" },
      },
      limit: 1,
      depth: 0,
    });
    return res.docs[0] ?? null;
  };

  const branchNode = await resolve(branch, "branch");
  if (!branchNode) return notFound();
  const yearNode = await resolve(year, "year", branchNode.id as string);
  if (!yearNode) return notFound();
  const subjectNode = await resolve(subject, "subject", yearNode.id as string);
  if (!subjectNode) return notFound();
  const chapterNode = await resolve(chapter, "chapter", subjectNode.id as string);
  if (!chapterNode) return notFound();

  const blocks = (chapterNode.blocks ?? []) as Array<{ blockType: string } & Record<string, unknown>>;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <nav className="mb-6 text-sm text-zinc-500">
        {branch} / {year} / {subject} / <span className="font-medium text-zinc-900 dark:text-zinc-100">{chapter}</span>
      </nav>
      <h1 className="text-3xl font-semibold tracking-tight">{chapterNode.title as string}</h1>
      <p className="mt-2 text-sm text-zinc-500">
        {(chapterNode.status as string) === "published" ? "Published" : "Draft"} — placeholder preview (Phase 3)
      </p>
      {blocks.length === 0 ? (
        <p className="mt-8 rounded-lg border border-dashed p-8 text-center text-sm text-zinc-500">
          No blocks yet. Add markdown / image / youtube blocks in Payload admin.
        </p>
      ) : (
        <div className="mt-8 space-y-6">
          {blocks.map((b, i) => (
            <div key={i} className="rounded-lg border p-4">
              <div className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-500">{b.blockType}</div>
              <pre className="overflow-auto text-xs">{JSON.stringify(b, null, 2)}</pre>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
