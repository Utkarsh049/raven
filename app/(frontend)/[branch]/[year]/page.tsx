import { getPayload } from "payload";
import config from "@payload-config";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Grid, GridCard } from "@/components/GridCard";

export const dynamicParams = true;

export default async function YearPage({ params }: { params: Promise<{ branch: string; year: string }> }) {
  const { branch, year } = await params;
  const payload = await getPayload({ config });
  const bRes = await payload.find({ collection: "nodes", where: { slug: { equals: branch }, type: { equals: "branch" }, status: { equals: "published" } }, limit: 1, depth: 0, overrideAccess: false } as never);
  const b = bRes.docs?.[0] as { id: string | number; title: string } | undefined;
  if (!b) return notFound();
  const yRes = await payload.find({ collection: "nodes", where: { slug: { equals: year }, type: { equals: "year" }, parent: { equals: b.id }, status: { equals: "published" } }, limit: 1, depth: 0, overrideAccess: false } as never);
  const y = yRes.docs?.[0] as { id: string | number; title: string } | undefined;
  if (!y) return notFound();
  const subsRes = await payload.find({ collection: "nodes", where: { parent: { equals: y.id }, type: { equals: "subject" }, status: { equals: "published" } }, limit: 20, depth: 0, sort: "orderIndex", overrideAccess: false } as never);
  const subs = (subsRes.docs ?? []) as unknown as Array<{ slug: string; title: string }>;
  return (
    <main id="main-content" className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <Breadcrumb
        items={[
          { label: String(b.title), href: `/${branch}` },
          { label: String(y.title) },
        ]}
      />
      <div className="mt-3 sm:mt-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{String(y.title)}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Subjects</p>
      </div>
      {subs.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">No subjects yet.</p>
      ) : (
        <div className="mt-6">
          <Grid>
            {subs.map((s) => (
              <GridCard key={s.slug} href={`/${branch}/${year}/${s.slug}`} title={s.title} />
            ))}
          </Grid>
        </div>
      )}
    </main>
  );
}

