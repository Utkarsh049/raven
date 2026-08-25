import { getPayload } from "payload";
import config from "@payload-config";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Grid, GridCard } from "@/components/GridCard";

export const dynamicParams = true;

export default async function SubjectPage({ params }: { params: Promise<{ branch: string; year: string; subject: string }> }) {
  const { branch, year, subject } = await params;
  const payload = await getPayload({ config });
  const bRes = await payload.find({ collection: "nodes", where: { slug: { equals: branch }, type: { equals: "branch" }, status: { equals: "published" } }, limit: 1, depth: 0, overrideAccess: false } as never);
  const b = bRes.docs?.[0] as { id: string | number; title: string } | undefined;
  if (!b) return notFound();
  const yRes = await payload.find({ collection: "nodes", where: { slug: { equals: year }, type: { equals: "year" }, parent: { equals: b.id }, status: { equals: "published" } }, limit: 1, depth: 0, overrideAccess: false } as never);
  const y = yRes.docs?.[0] as { id: string | number; title: string } | undefined;
  if (!y) return notFound();
  const sRes = await payload.find({ collection: "nodes", where: { slug: { equals: subject }, type: { equals: "subject" }, parent: { equals: y.id }, status: { equals: "published" } }, limit: 1, depth: 0, overrideAccess: false } as never);
  const s = sRes.docs?.[0] as { id: string | number; title: string } | undefined;
  if (!s) return notFound();
  const chsRes = await payload.find({ collection: "nodes", where: { parent: { equals: s.id }, type: { equals: "chapter" }, status: { equals: "published" } }, limit: 20, depth: 0, sort: "orderIndex", overrideAccess: false } as never);
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

