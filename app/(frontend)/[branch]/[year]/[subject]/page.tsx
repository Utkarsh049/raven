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
    <main id="main-content" className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href={`/${branch}`} className="hover:underline">{String(b.title)}</Link> / <Link href={`/${branch}/${year}`} className="hover:underline">{String(y.title)}</Link> / {String(s.title)}
      </nav>
      <h1 className="text-2xl font-semibold tracking-tight">{String(s.title)}</h1>
      {withHref.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">No chapters yet.</p> : (
        <ul className="mt-6 grid gap-2">
          {withHref.map((c) => (
            <li key={c.href}><Link href={c.href} className="rounded-md border px-3 py-2 text-sm hover:bg-accent flex justify-between">{c.title}<span>→</span></Link></li>
          ))}
        </ul>
      )}
    </main>
  );
}
