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
    <main id="main-content" className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <nav className="mb-4 text-sm text-muted-foreground"><Link href={`/${branch}`} className="hover:underline">{String(b.title)}</Link> / <span className="text-foreground font-medium">{String(y.title)}</span></nav>
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{String(y.title)}</h1>
      <p className="mt-1 text-sm text-muted-foreground">Subjects</p>
      {subs.length === 0 ? <p className="mt-6 text-sm text-muted-foreground">No subjects yet.</p> : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-4">
          {subs.map((s) => (
            <Link key={s.slug} href={`/${branch}/${year}/${s.slug}`} className="group flex aspect-square flex-col justify-between rounded-2xl border bg-card p-4 sm:p-5 shadow-sm transition-colors hover:bg-accent hover:border-accent-foreground/10 active:scale-[0.98]">
              <span className="text-sm sm:text-base font-semibold leading-tight line-clamp-3">{s.title}</span>
              <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground group-hover:text-foreground">Open <span aria-hidden>→</span></span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
