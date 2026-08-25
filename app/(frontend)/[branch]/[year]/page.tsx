import Link from "next/link";
import { getPayload } from "payload";
import config from "@payload-config";
import { notFound } from "next/navigation";

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
    <main id="main-content" className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <nav className="mb-4 text-sm text-muted-foreground"><Link href={`/${branch}`} className="hover:underline">{String(b.title)}</Link> / {String(y.title)}</nav>
      <h1 className="text-2xl font-semibold tracking-tight">{String(y.title)}</h1>
      {subs.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">No subjects yet.</p> : (
        <ul className="mt-6 grid gap-2">
          {subs.map((s) => (
            <li key={s.slug}><Link href={`/${branch}/${year}/${s.slug}`} className="rounded-md border px-3 py-2 text-sm hover:bg-accent flex justify-between">{s.title}<span>→</span></Link></li>
          ))}
        </ul>
      )}
    </main>
  );
}
