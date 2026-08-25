import { HomeTabs } from "@/components/home/HomeTabs";
import { getPayload } from "payload";
import config from "@payload-config";

export default async function Home() {
  let years: Array<{ slug: string; title: string; href: string; subjects: Array<{ slug: string; title: string; href: string }> }> = [];
  try {
    const payload = await getPayload({ config });
    const branchesRes = await payload.find({ collection: "nodes", where: { status: { equals: "published" }, type: { equals: "branch" } }, limit: 1, depth: 0, overrideAccess: false } as never);
    const branch = (branchesRes.docs?.[0] as unknown as { slug: string } | undefined)?.slug;
    if (branch) {
      const branchNode = branchesRes.docs[0] as { id: string | number };
      const yearsRes = await payload.find({
        collection: "nodes",
        where: { status: { equals: "published" }, type: { equals: "year" }, parent: { equals: branchNode.id } },
        limit: 20,
        depth: 0,
        sort: "orderIndex",
        overrideAccess: false,
      } as never);
      for (const y of (yearsRes.docs ?? []) as Array<{ id: string | number; slug: string; title: string }>) {
        const subjectsRes = await payload.find({
          collection: "nodes",
          where: { status: { equals: "published" }, type: { equals: "subject" }, parent: { equals: y.id } },
          limit: 20,
          depth: 0,
          sort: "orderIndex",
          overrideAccess: false,
        } as never);
        years.push({
          slug: y.slug,
          title: String(y.title),
          href: `/${branch}/${y.slug}`,
          subjects: ((subjectsRes.docs ?? []) as unknown as Array<{ slug: string; title: string }>).map((s) => ({
            slug: s.slug,
            title: String(s.title),
            href: `/${branch}/${y.slug}/${s.slug}`,
          })),
        });
      }
    }
  } catch {}

  // Fallback when DB not reachable during build/cold start
  if (!years.length) {
    years = [
      {
        slug: "year-1",
        title: "Year 1",
        href: "/computer-science/year-1",
        subjects: [{ slug: "python-programming", title: "Python Programming", href: "/computer-science/year-1/python-programming" }],
      },
      {
        slug: "year-2",
        title: "Year 2",
        href: "/computer-science/year-2",
        subjects: [{ slug: "java-programming", title: "Java Programming", href: "/computer-science/year-2/java-programming" }],
      },
    ];
  }

  return <HomeTabs years={years} />;
}
