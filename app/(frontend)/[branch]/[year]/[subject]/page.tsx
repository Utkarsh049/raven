import { getPayload } from "payload";
import config from "@payload-config";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Grid, GridCard } from "@/components/GridCard";

export const dynamicParams = true;
export const revalidate = 3600;

export async function generateStaticParams(): Promise<Array<{ branch: string; year: string; subject: string }>> {
  try {
    const payload = await getPayload({ config });
    const res = await payload.find({
      collection: "nodes",
      where: { status: { equals: "published" } },
      pagination: false,
      depth: 0,
      select: { id: true, slug: true, type: true, parent: true },
      overrideAccess: false,
    });
    const docs = (res.docs ?? []) as Array<{ id: string | number; slug: string; type: string; parent: unknown }>;
    const byId = new Map(docs.map((d) => [String(d.id), d]));

    const parentIdOf = (v: unknown): string | null => {
      if (!v) return null;
      if (typeof v === "string" || typeof v === "number") return String(v);
      if (typeof v === "object" && "id" in (v as { id?: unknown })) return String((v as { id?: unknown }).id ?? "");
      return null;
    };

    const params: Array<{ branch: string; year: string; subject: string }> = [];
    for (const doc of docs) {
      if (doc.type !== "subject" || !doc.slug) continue;
      const yId = parentIdOf(doc.parent);
      const yearNode = yId ? byId.get(yId) : null;
      if (!yearNode || yearNode.type !== "year" || !yearNode.slug) continue;
      const bId = parentIdOf(yearNode.parent);
      const branchNode = bId ? byId.get(bId) : null;
      if (!branchNode || branchNode.type !== "branch" || !branchNode.slug) continue;
      params.push({
        branch: String(branchNode.slug),
        year: String(yearNode.slug),
        subject: String(doc.slug),
      });
    }
    return params;
  } catch {
    return [];
  }
}

export default async function SubjectPage({ params }: { params: Promise<{ branch: string; year: string; subject: string }> }) {
  const { branch, year, subject } = await params;
  const payload = await getPayload({ config });
  const bRes = await payload.find({
    collection: "nodes",
    where: { slug: { equals: branch }, type: { equals: "branch" }, status: { equals: "published" } },
    limit: 1,
    depth: 0,
    select: { id: true, title: true, slug: true },
    overrideAccess: false,
  } as never);
  const b = bRes.docs?.[0] as { id: string | number; title: string } | undefined;
  if (!b) return notFound();
  const yRes = await payload.find({
    collection: "nodes",
    where: { slug: { equals: year }, type: { equals: "year" }, parent: { equals: b.id }, status: { equals: "published" } },
    limit: 1,
    depth: 0,
    select: { id: true, title: true, slug: true },
    overrideAccess: false,
  } as never);
  const y = yRes.docs?.[0] as { id: string | number; title: string } | undefined;
  if (!y) return notFound();
  const sRes = await payload.find({
    collection: "nodes",
    where: { slug: { equals: subject }, type: { equals: "subject" }, parent: { equals: y.id }, status: { equals: "published" } },
    limit: 1,
    depth: 0,
    select: { id: true, title: true, slug: true },
    overrideAccess: false,
  } as never);
  const s = sRes.docs?.[0] as { id: string | number; title: string } | undefined;
  if (!s) return notFound();
  const chsRes = await payload.find({
    collection: "nodes",
    where: { parent: { equals: s.id }, type: { equals: "chapter" }, status: { equals: "published" } },
    pagination: false,
    depth: 0,
    sort: "orderIndex",
    select: { id: true, title: true, slug: true },
    overrideAccess: false,
  } as never);
  const chs = (chsRes.docs ?? []) as unknown as Array<{ id: string | number; slug: string; title: string }>;

  const withHref: Array<{ title: string; href: string }> = chs.map((c) => ({
    title: String(c.title),
    href: `/${branch}/${year}/${subject}/${c.slug}`,
  }));
  return (
    <main id="main-content" className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <Breadcrumb
        items={[
          { label: String(b.title), href: `/${branch}` },
          { label: String(y.title), href: `/${branch}/${year}` },
          { label: String(s.title) },
        ]}
      />
      <div className="mt-3 sm:mt-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{String(s.title)}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Chapters</p>
      </div>
      {withHref.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">No chapters yet.</p>
      ) : (
        <div className="mt-6">
          <Grid>
            {withHref.map((c) => (
              <GridCard key={c.href} href={c.href} title={c.title} actionLabel="Read" />
            ))}
          </Grid>
        </div>
      )}
    </main>
  );
}

