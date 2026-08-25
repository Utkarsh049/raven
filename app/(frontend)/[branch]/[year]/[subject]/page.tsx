import Link from "next/link";
import { getPayload } from "payload";
import config from "@payload-config";
import { notFound } from "next/navigation";

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
    <main id="main-content" className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <nav className="mb-4 flex flex-wrap gap-1 text-sm text-muted-foreground">
        <Link href={`/${branch}`} className="hover:underline">{String(b.title)}</Link>
        <span>/</span>
        <Link href={`/${branch}/${year}`} className="hover:underline">{String(y.title)}</Link>
        <span>/</span>
        <span className="text-foreground font-medium">{String(s.title)}</span>
      </nav>
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{String(s.title)}</h1>
      <p className="mt-1 text-sm text-muted-foreground">Chapters</p>
      {withHref.length === 0 ? <p className="mt-6 text-sm text-muted-foreground">No chapters yet.</p> : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-4">
          {withHref.map((c) => (
            <Link key={c.href} href={c.href} className="group flex aspect-square flex-col justify-between rounded-2xl border bg-card p-4 sm:p-5 shadow-sm transition-colors hover:bg-accent hover:border-accent-foreground/10 active:scale-[0.98]">
              <span className="text-sm sm:text-[15px] font-semibold leading-tight line-clamp-3">{c.title}</span>
              <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground group-hover:text-foreground">Read <span aria-hidden>→</span></span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
