import { getPayload } from "payload";
import config from "@payload-config";
import { notFound } from "next/navigation";
import { BranchView } from "@/components/branch/BranchView";

export const dynamicParams = true;
export const revalidate = 3600;

export async function generateStaticParams(): Promise<Array<{ branch: string }>> {
  try {
    const payload = await getPayload({ config });
    const res = await payload.find({
      collection: "nodes",
      where: { type: { equals: "branch" }, status: { equals: "published" } },
      pagination: false,
      depth: 0,
      select: { slug: true },
      overrideAccess: false,
    });
    return (res.docs ?? []).map((doc) => ({ branch: String(doc.slug) }));
  } catch {
    return [];
  }
}

export default async function BranchPage({ params }: { params: Promise<{ branch: string }> }) {
  const { branch } = await params;
  const payload = await getPayload({ config });
  const r = await payload.find({
    collection: "nodes",
    where: { slug: { equals: branch }, type: { equals: "branch" }, status: { equals: "published" } },
    limit: 1,
    depth: 0,
    select: { id: true, title: true, slug: true },
    overrideAccess: false,
  } as never);
  const node = r.docs?.[0] as { id: string | number; title: string } | undefined;
  if (!node) return notFound();

  const yearsRes = await payload.find({
    collection: "nodes",
    where: { parent: { equals: node.id }, type: { equals: "year" }, status: { equals: "published" } },
    pagination: false,
    depth: 0,
    sort: "orderIndex",
    select: { id: true, title: true, slug: true },
    overrideAccess: false,
  } as never);
  const years = (yearsRes.docs ?? []) as unknown as Array<{ slug: string; title: string }>;

  return (
    <BranchView
      branchSlug={branch}
      branchTitle={String(node.title)}
      years={years}
    />
  );
}
