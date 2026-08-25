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
    <main id="main-content" className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">{String(node.title)}</h1>
      {years.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">No years yet.</p> : (
        <ul className="mt-6 grid gap-2">
          {years.map((y) => (
            <li key={y.slug}><Link href={`/${branch}/${y.slug}`} className="rounded-md border px-3 py-2 text-sm hover:bg-accent flex justify-between">{y.title}<span>→</span></Link></li>
          ))}
        </ul>
      )}
    </main>
  );
}
