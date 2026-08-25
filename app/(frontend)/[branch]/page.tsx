import Link from "next/link";
import { getPayload } from "payload";
import config from "@payload-config";
import { notFound } from "next/navigation";

export const dynamicParams = true;

export default async function BranchPage({ params }: { params: Promise<{ branch: string }> }) {
  const { branch } = await params;
  const payload = await getPayload({ config });
  const r = await payload.find({ collection: "nodes", where: { slug: { equals: branch }, type: { equals: "branch" }, status: { equals: "published" } }, limit: 1, depth: 0, overrideAccess: false } as never);
  const node = r.docs?.[0] as { id: string | number; title: string } | undefined;
  if (!node) return notFound();
  const yearsRes = await payload.find({ collection: "nodes", where: { parent: { equals: node.id }, type: { equals: "year" }, status: { equals: "published" } }, limit: 20, depth: 0, sort: "orderIndex", overrideAccess: false } as never);
  const years = (yearsRes.docs ?? []) as unknown as Array<{ slug: string; title: string }>;
  return (
    <main id="main-content" className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{String(node.title)}</h1>
      <p className="mt-1 text-sm text-muted-foreground">Years</p>
      {years.length === 0 ? <p className="mt-6 text-sm text-muted-foreground">No years yet.</p> : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-4">
          {years.map((y) => (
            <Link key={y.slug} href={`/${branch}/${y.slug}`} className="group flex aspect-square flex-col justify-between rounded-2xl border bg-card p-4 sm:p-5 shadow-sm transition-colors hover:bg-accent hover:border-accent-foreground/10 active:scale-[0.98]">
              <span className="text-sm sm:text-base font-semibold leading-tight line-clamp-3">{y.title}</span>
              <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground group-hover:text-foreground">Open <span aria-hidden>→</span></span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
