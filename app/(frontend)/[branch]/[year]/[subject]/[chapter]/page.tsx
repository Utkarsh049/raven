import config from "@payload-config";
import Link from "next/link";
import { getPayload } from "payload";
import { notFound } from "next/navigation";
import { PublicBlockRenderer, type ReaderBlock } from "@/components/reader/PublicBlocks";
import { PinButton } from "@/components/pins/PinButton";
import { Breadcrumb } from "@/components/Breadcrumb";

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

  const blocks = (chapterNode.blocks ?? []) as ReaderBlock[];

  return (
    <main id="main-content" className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <Breadcrumb
        items={[
          { label: String(branchNode.title || branch), href: `/${branch}` },
          { label: String(yearNode.title || year), href: `/${branch}/${year}` },
          { label: String(subjectNode.title || subject), href: `/${branch}/${year}/${subject}` },
          { label: String(chapterNode.title || chapter) },
        ]}
      />
      <div className="mt-3 sm:mt-4 flex flex-wrap items-start justify-between gap-3">
        <h1 className="min-w-0 flex-1 text-2xl font-bold tracking-tight sm:text-3xl break-words">
          {chapterNode.title as string}
        </h1>
        <PinButton
          id={String(chapterNode.id)}
          href={`/${branch}/${year}/${subject}/${chapter}`}
          title={String(chapterNode.title)}
          kind="chapter"
        />
      </div>
      <div className="mt-6 sm:mt-8 max-w-3xl">
        <PublicBlockRenderer blocks={blocks} />
      </div>
    </main>
  );
}

