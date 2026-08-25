import { getPayload } from "payload";
import config from "@payload-config";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Grid, GridCard } from "@/components/GridCard";

export const dynamicParams = true;
export const revalidate = 3600;

export default async function BranchPage({ params }: { params: Promise<{ branch: string }> }) {
  const { branch } = await params;
  const payload = await getPayload({ config });
  const r = await payload.find({ collection: "nodes", where: { slug: { equals: branch }, type: { equals: "branch" }, status: { equals: "published" } }, limit: 1, depth: 0, overrideAccess: false } as never);
  const node = r.docs?.[0] as { id: string | number; title: string } | undefined;
  if (!node) return notFound();
  const yearsRes = await payload.find({ collection: "nodes", where: { parent: { equals: node.id }, type: { equals: "year" }, status: { equals: "published" } }, limit: 20, depth: 0, sort: "orderIndex", overrideAccess: false } as never);
  const years = (yearsRes.docs ?? []) as unknown as Array<{ slug: string; title: string }>;
  return (
    <main id="main-content" className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <Breadcrumb items={[{ label: String(node.title) }]} />
      <div className="mt-3 sm:mt-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{String(node.title)}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Years</p>
      </div>
      {years.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">No years yet.</p>
      ) : (
        <div className="mt-6">
          <Grid>
            {years.map((y) => (
              <GridCard key={y.slug} href={`/${branch}/${y.slug}`} title={y.title} />
            ))}
          </Grid>
        </div>
      )}
    </main>
  );
}

