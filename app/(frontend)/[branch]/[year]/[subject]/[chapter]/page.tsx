import config from "@payload-config";
import { getPayload } from "payload";
import { notFound } from "next/navigation";

type Params = { branch: string; year: string; subject: string; chapter: string };

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
